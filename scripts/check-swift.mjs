#!/usr/bin/env node
// 提取 docs/ 下所有 ```swift 代码块，用本机 SDK 做类型检查。
//
// 围栏标记（写在 ```swift 之后，空格分隔）：
//   nocheck  跳过检查（伪代码、只展示片段、故意写错的反例）
//   ios      只在 iOS SDK 下检查
//   macos    只在 macOS SDK 下检查
//   both     必须在 iOS 与 macOS 两个 SDK 下都通过（默认：任一通过即可）
//
// 加 --platforms 参数：列出没有标 ios/macos、却只在一个平台通过的代码块，
// 用来核对正文里的平台标注。
//
// 一个代码块依次尝试：独立编译 → 包进函数 → 包进 View.body
// → 带上本文件前面出现过的声明再试一遍。
//
// 用法：node scripts/check-swift.mjs [路径过滤子串] [--verbose]

import { execFileSync, execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const docs = path.join(root, 'docs')
const cacheDir = path.join(root, '.check-cache')
fs.mkdirSync(cacheDir, { recursive: true })
const args = process.argv.slice(2)
const verbose = args.includes('--verbose')
const platformReport = args.includes('--platforms')
const filter = args.find((a) => !a.startsWith('--'))

const sdk = (name) => execFileSync('xcrun', ['--sdk', name, '--show-sdk-path']).toString().trim()
const platforms = {
  macos: { sdk: sdk('macosx'), target: 'arm64-apple-macos27.0' },
  ios: { sdk: sdk('iphonesimulator'), target: 'arm64-apple-ios27.0-simulator' },
}

const prelude = [
  'import SwiftUI',
  'import Observation',
  'import Foundation',
].join('\n')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.')) return []
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : []
  })
}

function extract(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  const blocks = []
  let cur = null
  lines.forEach((line, i) => {
    const m = line.match(/^\s*```(\S*)\s*(.*)$/)
    if (!cur && m && m[1].replace(/\{.*$/, '') === 'swift') {
      cur = { file, line: i + 1, flags: m[2].split(/\s+/).filter(Boolean), code: [] }
    } else if (cur && /^\s*```\s*$/.test(line)) {
      blocks.push({ ...cur, code: cur.code.join('\n') })
      cur = null
    } else if (cur) cur.code.push(line)
  })
  return blocks
}

function splitImports(code) {
  const imports = []
  const rest = []
  let depth = 0 // #if 嵌套层数：条件编译块里的 import 要留在原地
  for (const l of code.split('\n')) {
    if (/^\s*#if\b/.test(l)) depth++
    const hoist = depth === 0 && /^\s*import\s+\w+/.test(l)
    ;(hoist ? imports : rest).push(l)
    if (/^\s*#endif\b/.test(l)) depth = Math.max(0, depth - 1)
  }
  return { imports: imports.join('\n'), rest: rest.join('\n') }
}

function variants(block, earlier) {
  const { imports, rest } = splitImports(block.code)
  const head = `${prelude}\n${imports}\n`
  const prevImports = earlier.map((b) => splitImports(b.code).imports).join('\n')
  const prev = earlier.map((b) => splitImports(b.code).rest).join('\n')
  const fn = (body) => `@MainActor func __snippet() async throws {\n${body}\n}`
  const view = (body) => `struct __SnippetView: View {\n  var body: some View {\n${body}\n  }\n}`
  return [
    ['alone', head + rest],
    ['func', head + fn(rest)],
    ['view', head + view(rest)],
    ['ctx', head + prevImports + '\n' + prev + '\n' + rest],
    ['ctx+func', head + prevImports + '\n' + prev + '\n' + fn(rest)],
    ['ctx+view', head + prevImports + '\n' + prev + '\n' + view(rest)],
  ]
}

function typecheck(source, platform) {
  const key = createHash('sha1').update(platform + '\0' + source).digest('hex')
  const cacheFile = path.join(cacheDir, key)
  if (fs.existsSync(cacheFile)) return Promise.resolve(JSON.parse(fs.readFileSync(cacheFile, 'utf8')))
  const tmp = path.join(os.tmpdir(), `snippet-${key}.swift`)
  fs.writeFileSync(tmp, source)
  const p = platforms[platform]
  return new Promise((resolve) => {
    execFile(
      'xcrun',
      [
        'swiftc', '-typecheck', '-parse-as-library', '-swift-version', '6',
        '-default-isolation', 'MainActor',
        '-enable-upcoming-feature', 'InferIsolatedConformances',
        '-enable-upcoming-feature', 'NonisolatedNonsendingByDefault',
        '-suppress-warnings',
        '-target', p.target, '-sdk', p.sdk, tmp,
      ],
      { maxBuffer: 1 << 24 },
      (err, _out, stderr) => {
        fs.rmSync(tmp, { force: true })
        const result = { ok: !err, log: err ? stderr.replaceAll(tmp, 'snippet.swift') : '' }
        fs.writeFileSync(cacheFile, JSON.stringify(result))
        resolve(result)
      },
    )
  })
}

async function checkOn(block, earlier, platform) {
  // 只属于另一个平台的代码块不能作为这个平台的上下文
  const other = platform === 'ios' ? 'macos' : 'ios'
  earlier = earlier.filter((b) => !b.flags.includes(other))
  let firstLog = ''
  let aloneLog = ''
  for (const [name, src] of variants(block, earlier)) {
    const r = await typecheck(src, platform)
    if (r.ok) return { ok: true, how: name }
    if (name === 'alone') aloneLog = r.log
    if (!firstLog || name === 'ctx') firstLog = r.log
  }
  return { ok: false, log: firstLog, aloneLog }
}

async function check(block, earlier) {
  const want = block.flags.includes('ios') ? ['ios'] : block.flags.includes('macos') ? ['macos'] : ['macos', 'ios']
  if (platformReport && want.length === 2) {
    // 报告模式：两个平台都检查，列出只在一个平台通过的代码块
    const r = { macos: await checkOn(block, earlier, 'macos'), ios: await checkOn(block, earlier, 'ios') }
    if (r.macos.ok !== r.ios.ok) {
      const bad = r.macos.ok ? 'ios' : 'macos'
      const errs = (r[bad].aloneLog || r[bad].log).split('\n').filter((l) => /error:/.test(l) && /unavailable|only available/.test(l)).slice(0, 3).map((l) => l.replace(/^.*error: /, '')).join(' | ')
      console.log(`ONLY-${r.macos.ok ? 'macOS' : 'iOS'}  ${path.relative(root, block.file)}:${block.line}\n    ${errs}`)
    }
    return { ok: r.macos.ok || r.ios.ok, how: 'report', log: r.macos.log + r.ios.log }
  }
  const needAll = block.flags.includes('both')
  const results = {}
  for (const p of want) {
    results[p] = await checkOn(block, earlier, p)
    if (results[p].ok && !needAll) return { ok: true, how: `${p}:${results[p].how}` }
  }
  const ok = needAll && want.every((p) => results[p].ok)
  const failed = want.filter((p) => !results[p].ok)
  return ok
    ? { ok, how: want.map((p) => `${p}:${results[p].how}`).join(' ') }
    : { ok: false, log: failed.map((p) => `[${p}]\n${results[p].log}`).join('\n') }
}

const files = walk(docs).filter((f) => !filter || f.includes(filter)).sort()
const jobs = []
let skipped = 0
for (const file of files) {
  const blocks = extract(file)
  const earlier = []
  for (const b of blocks) {
    if (b.flags.includes('nocheck')) { skipped++; continue }
    jobs.push({ block: b, earlier: [...earlier] })
    // 只有顶层声明才适合作为后文的上下文
    if (/^(@\w+(\(.*\))?\s+)*(public |private |fileprivate |final |nonisolated )*(struct|class|enum|protocol|extension|actor|func|typealias)\b/m.test(b.code)) earlier.push(b)
  }
}

let failed = 0
let done = 0
const limit = Math.max(2, os.cpus().length - 2)
async function worker() {
  while (jobs.length) {
    const { block, earlier } = jobs.shift()
    const r = await check(block, earlier)
    done++
    const where = `${path.relative(root, block.file)}:${block.line}`
    if (r.ok) { if (verbose) console.log(`ok   ${where} (${r.how})`) }
    else {
      failed++
      const errs = r.log.split('\n').filter((l) => /error:|^\[/.test(l)).slice(0, 8).join('\n    ')
      console.log(`FAIL ${where}\n    ${errs}`)
    }
  }
}
await Promise.all(Array.from({ length: limit }, worker))
console.log(`\n检查 ${done} 个代码块，失败 ${failed}，跳过 ${skipped}（nocheck）`)
process.exit(failed ? 1 : 0)
