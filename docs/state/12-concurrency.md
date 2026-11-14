# 12 Swift 6 并发与 SwiftUI

## 本章目标

- 理解 UI 代码为什么必须在主线程上运行，以及 Swift 6 如何在编译期保证这一点
- 弄清“默认主 actor 隔离”和“易用并发”这两项设置的含义
- 熟练使用 `.task`、`.task(id:)` 和 `Task { }` 启动异步工作
- 掌握取消：什么时候会被取消、怎么配合取消
- 知道怎么把耗时工作移出主线程（`@concurrent`、`nonisolated`、`actor`）
- 读得懂常见的并发编译错误并知道如何修复
- 了解 Swift 6.4 在并发方面的新语法

你学 Swift 时应该已经接触过 `async/await`、`Task`、`actor`、`Sendable`。这一章不重复语言基础，只讲它们和 SwiftUI 相遇的地方。

## 一条铁律：UI 只能在主线程上碰

所有 UI 框架都有这条规定：界面的读写必须发生在主线程上。原因很朴素：如果两个线程同时修改视图树，结果不可预测。

在过去，这条规定靠开发者自觉遵守，写错了就是偶发的崩溃或界面错乱。Swift 的做法是把它变成**编译器能检查的规则**。工具是 `@MainActor`：

- 标了 `@MainActor` 的代码，只能在主 actor（也就是主线程）上运行
- 从其他地方调用它，必须用 `await` 切换过来
- 违反规则，编译不通过

SwiftUI 的 `View` 协议整体标了 `@MainActor`：

```swift nocheck
@MainActor @preconcurrency
public protocol View { ... }
```

所以你写的每个视图、它的 `body`、它的所有方法和属性，都自动在主 actor 上。在视图里读写 `@State`，天然就是安全的。

## 两项让并发变简单的设置

导读里让你确认过两项构建设置。现在解释它们。

### Default Actor Isolation = MainActor <Badge type="tip" text="Swift 6.2+" />

这项设置（SE-0466）的意思是：**这个模块里的所有代码，除非另有说明，都隔离在主 actor 上。**

不开这项设置时，只有视图在主 actor 上，你自己写的模型类、工具函数默认是“不隔离”的。于是视图和模型一交互，编译器就开始报各种并发错误，你得到处手写 `@MainActor`。

开了之后，你的模型类也默认在主 actor 上，和视图待在同一个“房间”里，互相调用不需要 `await`，也不会有数据竞争。对一个 App 来说这是合理的默认值：绝大部分代码本来就是在响应用户操作、更新界面。

```swift
@Observable
class ScoreBoard {                 // 默认隔离在 MainActor，不用写 @MainActor
    var score = 0

    func add(_ points: Int) {      // 也在 MainActor 上
        score += points
    }
}

struct ScoreBoardView: View {
    @State private var board = ScoreBoard()

    var body: some View {
        Button("得分 \(board.score)") {
            board.add(10)          // 同在主 actor，直接调用，不需要 await
        }
    }
}
```

::: warning 如果你的项目没有开这项设置
用 Xcode 26 之前创建的项目，或者 Swift Package，默认是不隔离的。那样的话，上面的 `ScoreBoard` 需要手动标注 `@MainActor`：

```swift nocheck
@MainActor
@Observable
class ScoreBoard { ... }
```

本教程的代码都按“已开启”来写。在 Swift Package 里开启它的方法是在 target 的 `swiftSettings` 里加 `.defaultIsolation(MainActor.self)`。
:::

### Approachable Concurrency = Yes <Badge type="tip" text="Swift 6.2+" />

这项设置打开了一组编译器特性，其中对日常影响最大的是这一条（SE-0461）：

**没有标注隔离的 `async` 函数，在调用者所在的 actor 上运行。**

在旧行为下，一个普通的 `async` 函数总是跳到后台线程池去执行。这听起来合理，实际上是大量并发错误的来源：你从主 actor 调一个 `async` 函数，把一个模型对象传进去，编译器就报错“不能把非 `Sendable` 的值发送到别的隔离域”。

新行为下，`async` 函数留在调用者的 actor 上。从主 actor 调用，它就在主 actor 上跑。`await` 只表示“这里可能挂起”，不表示“这里会换线程”。

那真正需要后台执行的耗时工作怎么办？明确地说出来，用 `@concurrent`。后面会讲。

可以把这两项设置合起来理解成一句话：

::: tip 默认单线程，按需并发
**你的代码默认全部在主线程上运行。只有你明确要求的那部分，才会跑到后台。** 先写出正确的程序，再把确实慢的部分挪出去。
:::

## 在视图里启动异步工作

`body` 是同步的，不能直接 `await`。SwiftUI 提供了几个入口。

### .task：跟随视图生命周期

```swift
struct QuoteView: View {
    @State private var quote = "加载中…"

    var body: some View {
        Text(quote)
            .padding()
            .task {
                quote = await fetchQuote()
            }
    }

    private func fetchQuote() async -> String {
        try? await Task.sleep(for: .seconds(1))      // 模拟网络请求
        return "千里之行，始于足下。"
    }
}
```

`.task` 做了三件事：

1. 视图**出现**时启动一个异步任务
2. 闭包在主 actor 上运行，所以可以直接给 `@State` 赋值
3. 视图**消失**时自动**取消**这个任务

第 3 点很重要。如果用户在数据还没加载完时就离开了页面，任务会被取消，不会白白继续执行，也不会在视图消失后去修改它的状态。

### .task(id:)：值变了就重新来

```swift
struct UserProfileView: View {
    @State private var userID = 1
    @State private var name = ""

    var body: some View {
        VStack(spacing: 12) {
            Text(name.isEmpty ? "加载中…" : name)
                .font(.title2)

            Stepper("用户 ID：\(userID)", value: $userID, in: 1...99)
        }
        .padding()
        .task(id: userID) {
            name = ""
            name = await loadName(for: userID)
        }
    }

    private func loadName(for id: Int) async -> String {
        try? await Task.sleep(for: .milliseconds(600))
        return Task.isCancelled ? "" : "用户 #\(id)"
    }
}
```

`.task(id:)` 在 `id` 变化时**取消旧任务、启动新任务**。快速点击 Stepper，只有最后一个 ID 对应的请求会完成并显示。这是“根据某个状态加载数据”的标准写法，替代了 `onAppear` + `onChange` + 手动管理 `Task` 的组合。

搜索框的“防抖”也可以用它：

```swift
struct DebouncedSearch: View {
    @State private var query = ""
    @State private var results: [String] = []

    var body: some View {
        List(results, id: \.self) { Text($0) }
            .searchable(text: $query)
            .task(id: query) {
                do {
                    try await Task.sleep(for: .milliseconds(300))    // 停止输入 300 毫秒后才搜索
                    results = query.isEmpty ? [] : (1...5).map { "\(query) 的结果 \($0)" }
                } catch {
                    // 被取消：用户还在继续输入，什么都不做
                }
            }
    }
}
```

每输入一个字，上一个任务被取消（`Task.sleep` 抛出取消错误），新任务重新计时。

### Task { }：在事件回调里启动

按钮的动作闭包是同步的。要在里面做异步的事，创建一个 `Task`：

```swift
struct SaveButton: View {
    @State private var isSaving = false
    @State private var status = ""

    var body: some View {
        VStack(spacing: 12) {
            Button(isSaving ? "保存中…" : "保存") {
                Task {
                    isSaving = true
                    defer { isSaving = false }
                    status = await save()
                }
            }
            .disabled(isSaving)

            Text(status).foregroundStyle(.secondary)
        }
        .padding()
    }

    private func save() async -> String {
        try? await Task.sleep(for: .seconds(1))
        return "已保存"
    }
}
```

`Task { }` 会继承当前的 actor。这里它是在主 actor 上创建的，所以闭包体也在主 actor 上运行，可以直接改状态。

::: warning Task { } 不会自动取消
`.task` 修饰符创建的任务跟随视图生命周期。按钮里的 `Task { }` 是“放出去就不管了”，视图消失后它仍会继续执行。大多数时候（比如保存操作）这正是你想要的。如果需要能取消，把 `Task` 存进 `@State`，在适当的时候调用 `.cancel()`。
:::

### .refreshable：下拉刷新

```swift
struct RefreshableList: View {
    @State private var items = ["初始内容"]

    var body: some View {
        List(items, id: \.self) { Text($0) }
            .refreshable {
                try? await Task.sleep(for: .seconds(1))
                items.insert("刷新于 \(Date.now.formatted(date: .omitted, time: .standard))", at: 0)
            }
    }
}
```

`.refreshable` 的闭包是 `async` 的。刷新指示器会一直显示到闭包返回，所以只要在里面 `await` 你的加载函数就行。

### 消费异步序列

`.task` 里可以用 `for await` 持续接收值，视图消失时循环自动结束：

```swift
struct TickerView: View {
    @State private var seconds = 0

    var body: some View {
        Text("已运行 \(seconds) 秒")
            .monospacedDigit()
            .task {
                for await _ in ticks(every: .seconds(1)) {
                    seconds += 1
                }
            }
    }

    private func ticks(every interval: Duration) -> AsyncStream<Void> {
        AsyncStream { continuation in
            let task = Task {
                while !Task.isCancelled {
                    try? await Task.sleep(for: interval)
                    continuation.yield()
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
```

通知、定位更新、WebSocket 消息、文件变化，这些“会持续产生值”的来源都适合包装成异步序列，在 `.task` 里消费。

## 取消是协作式的

Swift 的任务取消不是强行终止。它只是把任务标记为“已取消”，任务里的代码需要**自己检查并配合**。

```swift
func processAll(_ items: [Int]) async throws -> [Int] {
    var results: [Int] = []
    for item in items {
        try Task.checkCancellation()          // 已取消就抛出 CancellationError
        results.append(item * 2)
        await Task.yield()
    }
    return results
}
```

| 写法 | 行为 |
| --- | --- |
| `try Task.checkCancellation()` | 已取消则抛出 `CancellationError` |
| `Task.isCancelled` | 返回布尔值，自己决定怎么处理 |
| `try await Task.sleep(for:)` | 等待期间被取消会抛出错误 |
| `URLSession` 的 `async` 方法 | 被取消时抛出 `URLError(.cancelled)` |

系统的异步 API 大多已经配合取消了。你要注意的是自己写的长循环和多步骤操作：在步骤之间检查一下。

## 把耗时工作移出主线程

默认全在主线程，那解析一个大 JSON、处理一张图片这种耗时操作会不会卡界面？会。所以要把它们明确地移出去。

### @concurrent：这个函数到后台去跑

```swift
struct Thumbnail: Sendable {
    let pixels: [UInt8]
}

@concurrent
func makeThumbnail(from data: Data) async -> Thumbnail {
    // 这里在后台线程池上运行，不占用主线程
    let pixels = data.prefix(1024).map { $0 }
    return Thumbnail(pixels: pixels)
}

struct ThumbnailView: View {
    @State private var thumbnail: Thumbnail?

    var body: some View {
        Text(thumbnail == nil ? "处理中…" : "完成，\(thumbnail!.pixels.count) 字节")
            .task {
                let data = Data(repeating: 7, count: 4096)
                thumbnail = await makeThumbnail(from: data)   // 主 actor → 后台 → 回到主 actor
            }
    }
}
```

`@concurrent` <Badge type="tip" text="Swift 6.2+" /> 标在 `async` 函数上，表示“这个函数在并发线程池上运行”。调用处 `await` 一下，执行权去了后台，结果回来后自动回到主 actor 继续。

跨越 actor 边界传递的值（参数和返回值）必须是 `Sendable` 的，也就是可以安全地在线程间传递。`Data` 是，值类型且成员都是 `Sendable` 的结构体也是。

### nonisolated：这个类型不属于任何 actor

有些类型就是纯数据或纯计算，和 UI 无关。在默认主 actor 的项目里，可以用 `nonisolated` 把它们“解放”出来：

```swift
nonisolated struct Matrix: Sendable {
    var values: [[Double]]

    func transposed() -> Matrix {
        guard let first = values.first else { return self }
        return Matrix(values: first.indices.map { column in values.map { $0[column] } })
    }
}

nonisolated enum Parser {
    static func parse(_ text: String) -> [String] {
        text.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
    }
}
```

`nonisolated` 的类型可以在任何线程上使用。第 8 章的 `LayoutValueKey` 就是因为这个原因加了 `nonisolated`。

### actor：保护后台的可变状态

如果后台工作需要维护自己的可变状态（比如一个缓存），用 `actor`：

```swift
actor ImageCache {
    private var storage: [URL: Data] = [:]

    func data(for url: URL) async throws -> Data {
        if let cached = storage[url] { return cached }
        let (data, _) = try await URLSession.shared.data(from: url)
        storage[url] = data
        return data
    }
}
```

`actor` 保证同一时刻只有一个任务在访问它的状态。从外面访问它的方法和属性都要 `await`。

### 完整的分层

把这些组合起来，一个典型 App 的并发结构是这样的：

```text
┌─────────────────────── MainActor（主线程）────────────────────────┐
│  View  ──▶  @Observable 模型  ──▶  调用 await service.load()      │
└────────────────────────────┬─────────────────────────────────────┘
                             │ await（跨越边界，只传 Sendable 的值）
┌────────────────────────────▼─────────────────────────────────────┐
│  后台：@concurrent 函数 / actor / nonisolated 类型                 │
│  网络请求、解析、图像处理、数据库读写                               │
└──────────────────────────────────────────────────────────────────┘
```

```swift
nonisolated struct Article: Sendable, Identifiable, Decodable {
    let id: Int
    let title: String
}

nonisolated struct ArticleService: Sendable {
    @concurrent
    func fetchArticles() async throws -> [Article] {
        try await Task.sleep(for: .milliseconds(500))
        let json = #"[{"id":1,"title":"第一篇"},{"id":2,"title":"第二篇"}]"#
        return try JSONDecoder().decode([Article].self, from: Data(json.utf8))   // 解析在后台
    }
}

@Observable
class ArticleListModel {
    var articles: [Article] = []
    var errorMessage: String?
    private let service = ArticleService()

    func reload() async {
        do {
            articles = try await service.fetchArticles()     // 回到主 actor 后赋值
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct ArticleListView: View {
    @State private var model = ArticleListModel()

    var body: some View {
        List(model.articles) { article in
            Text(article.title)
        }
        .task { await model.reload() }
        .refreshable { await model.reload() }
    }
}
```

视图和模型在主 actor 上，写起来和单线程代码一样。只有 `ArticleService.fetchArticles` 明确跑在后台，它和主 actor 之间只传递 `Sendable` 的 `[Article]`。

## 常见的编译错误和修法

Swift 6 语言模式会把潜在的数据竞争报成错误。下面是写 SwiftUI 时最常遇到的几种。

### “Main actor-isolated … cannot be used in nonisolated context”

你在一个不隔离的上下文里用了主 actor 上的东西。常见于遵循某些系统协议（`Layout`、`PreferenceKey` 的 `reduce`、`Shape.path(in:)` 等要求是 `nonisolated` 的）。

修法：被用到的那个类型如果是纯数据，标成 `nonisolated`；如果确实是 UI 状态，重新想想为什么要在非主线程用它。

### “Sending 'x' risks causing data races”

你把一个非 `Sendable` 的值传到了另一个隔离域。典型场景是把模型对象（类）传给一个 `@concurrent` 函数。

修法：不要传整个对象，只传需要的数据（值类型）：

```swift nocheck
// 不好：把模型对象传到后台
let result = await process(model)

// 好：取出需要的值再传
let input = model.rawText            // String 是 Sendable
let result = await process(input)
model.output = result
```

### “Capture of 'self' with non-sendable type in a `@Sendable` closure”

一个会在其他线程执行的闭包捕获了非 `Sendable` 的东西。常见于旧的回调式 API（完成回调、通知中心、定时器）。

修法：优先换用该 API 的 `async` 版本。实在没有，在回调里用 `Task { @MainActor in ... }` 回到主 actor。

### “Call to main actor-isolated … in a synchronous nonisolated context”

在非隔离的同步代码里调用了主 actor 的方法。

修法：让调用方也变成 `@MainActor`，或者把调用方改成 `async` 并 `await` 这个调用。

::: tip 处理并发错误的总原则
不要用 `@unchecked Sendable`、`nonisolated(unsafe)` 这类“闭嘴”工具去消除错误。它们是在告诉编译器“相信我”，而编译器报错恰恰是因为它发现了不能相信的地方。正确的方向几乎总是这三个之一：**让它留在主 actor 上**；**只传值类型的数据**；**把共享的可变状态放进 actor**。
:::

## Swift 6.4 的新语法 <Badge type="warning" text="Swift 6.4" />

Swift 6.4 在并发方面有两个对日常很有用的改进。

### defer 里可以 await 了（SE-0493）

`defer` 用来保证“无论函数怎么退出，这段清理代码都会执行”。在 Swift 6.3 及之前，`defer` 里不能写 `await`，异步的清理工作很难写对。Swift 6.4 取消了这个限制：

```swift
actor Connection {
    func open() async {}
    func send(_ text: String) async throws {}
    func close() async {}
}

func upload(_ lines: [String], over connection: Connection) async throws {
    await connection.open()
    defer {
        await connection.close()      // Swift 6.4：defer 里可以 await
    }

    for line in lines {
        try await connection.send(line)
    }
}
```

不管是正常结束、中途抛错还是被取消，`close()` 都会被等待执行完毕。

用 Swift 6.3 编译时，同样的逻辑得这样写：

```swift
func uploadCompat(_ lines: [String], over connection: Connection) async throws {
    await connection.open()
    do {
        for line in lines {
            try await connection.send(line)
        }
    } catch {
        await connection.close()
        throw error
    }
    await connection.close()
}
```

### 取消防护罩（SE-0504）

任务被取消后，其中的 `await` 调用大多会立刻抛出取消错误。但清理工作恰恰需要在取消之后还能完整执行。`withTaskCancellationShield` 让一段代码**暂时不受取消影响**：

```swift
func uploadSafely(_ lines: [String], over connection: Connection) async throws {
    await connection.open()
    defer {
        await withTaskCancellationShield {
            await connection.close()   // 即使任务已被取消，这里也会完整执行
        }
    }

    for line in lines {
        try Task.checkCancellation()
        try await connection.send(line)
    }
}
```

这两个特性配合起来，让“异步资源的可靠清理”终于有了简洁的标准写法。

其他 6.4 的语言变化（`weak let`、`anyAppleOS` 可用性、`@diagnose` 等）与界面开发关系较远，集中放在[附录 A](/appendix/swift-6-4)。

## 常见误区

**误区一：“`await` 表示切换到后台线程。”** `await` 只表示“这里可能挂起”。在易用并发的设置下，普通 `async` 函数就在调用者的 actor 上运行。要去后台，必须明确用 `@concurrent` 或调用一个 actor。

**误区二：“在 `.onAppear` 里写 `Task { await load() }`。”** 用 `.task { await load() }`。它在视图消失时会自动取消，`onAppear` + `Task` 不会。

**误区三：“耗时操作放进 `Task { }` 就不卡界面了。”** 主 actor 上创建的 `Task` 仍然在主 actor 上运行。如果里面是同步的重计算，照样卡。需要把那段计算放进 `@concurrent` 函数。

**误区四：“取消了任务，代码就停了。”** 取消是协作式的。没有检查取消的代码会一直跑到结束。

**误区五：“到处加 `@MainActor` 或 `DispatchQueue.main.async` 来修错误。”** 在默认主 actor 的项目里，这些通常是多余的。`DispatchQueue` 是旧时代的工具，Swift 并发里不需要它。

## 小结

- `View` 整体隔离在主 actor 上，Swift 6 在编译期保证 UI 只在主线程被访问。
- “默认主 actor 隔离”让你的全部代码默认在主线程；“易用并发”让 `async` 函数留在调用者的 actor 上。合起来就是：默认单线程，按需并发。
- `.task` 跟随视图生命周期并自动取消；`.task(id:)` 在值变化时重启；`Task { }` 用于事件回调。
- 取消是协作式的，长任务要主动检查。
- 耗时工作用 `@concurrent` 函数移到后台，纯数据类型标 `nonisolated`，后台可变状态放进 `actor`，跨边界只传 `Sendable` 的值。
- Swift 6.4 允许在 `defer` 里 `await`，并提供了取消防护罩。

## 练习

1. 写一个天气卡片：`.task` 里加载（用 `Task.sleep` 模拟），加载中显示 `ProgressView`，成功显示温度，失败显示重试按钮。用枚举表示三种状态。
2. 在上面的基础上加一个城市选择器，用 `.task(id:)` 实现切换城市时自动取消旧请求、发起新请求。
3. 写一个 `@concurrent` 函数，统计一个长字符串里每个字符出现的次数，在视图里调用并显示出现最多的 5 个字符。确认参数和返回值都是 `Sendable` 的。
4. 下面的代码在 Swift 6 模式、默认主 actor 隔离下会报什么错？怎么改？

```swift nocheck
@Observable class Store { var items: [String] = [] }

@concurrent func sort(_ store: Store) async {
    store.items.sort()
}
```

## 官方文档

- [`task(priority:_:)`](https://developer.apple.com/documentation/swiftui/view/task(priority:_:))
- [`task(id:priority:_:)`](https://developer.apple.com/documentation/swiftui/view/task(id:priority:_:))
- [`refreshable(action:)`](https://developer.apple.com/documentation/swiftui/view/refreshable(action:))
- [Concurrency（Swift 并发总览）](https://developer.apple.com/documentation/swift/concurrency)
- [`MainActor`](https://developer.apple.com/documentation/swift/mainactor)
- [`Task`](https://developer.apple.com/documentation/swift/task)
- [`Sendable`](https://developer.apple.com/documentation/swift/sendable)
- [Adopting strict concurrency in Swift 6 apps](https://developer.apple.com/documentation/swift/adoptingswift6)
- [The Swift Programming Language：Concurrency](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/)
- [Swift 6.2 发布说明（默认隔离与易用并发）](https://www.swift.org/blog/swift-6.2-released/)
- [Swift 6.4 发布说明（defer 中的 await、取消防护罩）](https://www.swift.org/blog/swift-6.4-released/)
- [WWDC25：Embracing Swift concurrency](https://developer.apple.com/videos/play/wwdc2025/268/)
- [WWDC25：Explore concurrency in SwiftUI](https://developer.apple.com/videos/play/wwdc2025/266/)
