#!/usr/bin/env node
// 校验 docs/ 中引用的官方文档链接是否存在。
// developer.apple.com/documentation 页面由 JS 渲染，直接请求总是 200，
// 所以改查它背后的 JSON 数据接口：/tutorials/data/documentation/<path>.json
// 其他域名的链接做普通的 GET 检查。

import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const docs = path.join(root, 'docs')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.')) return []
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : []
  })
}

const links = new Map()
for (const file of walk(docs)) {
  const text = fs.readFileSync(file, 'utf8')
  // Apple 文档的网址里常带一层括号，例如 …/view/padding(_:_:)
  for (const m of text.matchAll(/\]\((https?:\/\/(?:[^()\s]|\([^()\s]*\))+)\)/g)) {
    const url = m[1]
    if (!links.has(url)) links.set(url, [])
    links.get(url).push(path.relative(root, file))
  }
}

function probeUrl(url) {
  const u = new URL(url)
  if (u.hostname === 'developer.apple.com' && u.pathname.startsWith('/documentation/')) {
    return `https://developer.apple.com/tutorials/data${u.pathname.replace(/\/$/, '').toLowerCase()}.json`
  }
  return url.split('#')[0]
}

async function check(url) {
  const target = probeUrl(url)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // WWDC 讲座页面：编号不存在时会被重定向到别处，所以不跟随重定向
      const isVideo = target.startsWith('https://developer.apple.com/videos/play/')
      const res = await fetch(target, {
        redirect: isVideo ? 'manual' : 'follow',
        headers: { 'user-agent': 'Mozilla/5.0 (link-checker)' },
        signal: AbortSignal.timeout(20000),
      })
      if (res.ok) return { ok: true }
      if (isVideo && res.status >= 300 && res.status < 400) return { ok: false, status: res.status }
      if (res.status === 404 || res.status === 410) return { ok: false, status: res.status }
      if (attempt === 2) return { ok: false, status: res.status }
    } catch (e) {
      if (attempt === 2) return { ok: false, status: String(e.cause?.code ?? e.name) }
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
}

const queue = [...links.keys()]
let bad = 0
async function worker() {
  while (queue.length) {
    const url = queue.shift()
    const r = await check(url)
    if (!r.ok) {
      bad++
      console.log(`BAD  [${r.status}] ${url}\n       ${[...new Set(links.get(url))].join(', ')}`)
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker))
console.log(`\n共 ${links.size} 个外部链接，失效 ${bad}`)
process.exit(bad ? 1 : 0)
