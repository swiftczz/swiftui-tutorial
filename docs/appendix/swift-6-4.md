# 附录 A：Swift 6.3 / 6.4 语法变化

这篇附录集中整理教程正文里提到的版本差异，回答三个问题：

1. Swift 6.3 和 6.4 各自带来了什么？
2. 哪些变化会影响你写 SwiftUI 代码？
3. 同一件事，用 6.3 和 6.4 分别怎么写？

本页的代码示例都在 Swift 6.4.2（Xcode 27.2）上编译验证过。各特性所属的版本以 swift.org 的发布说明为准，文末有链接。

## 版本与工具链的对应关系

| Swift | 发布时间 | 随附的 Xcode | 同期的系统 SDK |
| --- | --- | --- | --- |
| 6.2 | 2025 年 9 月 | Xcode 26 | iOS 26、macOS 26 |
| 6.3 | 2026 年 3 月 | Xcode 26.4 | iOS 26.4、macOS 26.4 |
| 6.4 | 2026 年 9 月 | Xcode 27 | iOS 27、macOS 27 |

查看自己的版本：在终端运行 `swift --version`，或者在 Xcode 的 **Xcode › About Xcode** 里查看。

要分清三个容易混淆的概念：

| 概念 | 是什么 | 在哪里设置 |
| --- | --- | --- |
| **编译器版本** | 你用的 Swift 编译器是哪一版。由 Xcode 的版本决定 | 安装哪个 Xcode |
| **语言模式** | 编译器按哪一版语言的规则检查代码。Swift 6 模式开启完整的数据竞争检查 | Build Settings › Swift Language Version |
| **部署版本** | 应用最低能运行在哪个系统上 | General › Minimum Deployments |

用 Swift 6.4 的编译器，可以选择 Swift 5 或 Swift 6 语言模式，可以部署到 iOS 17。它们是三个独立的维度。本教程使用：6.4 编译器、Swift 6 语言模式。

## 影响 SwiftUI 写法的变化

先列出和界面开发直接相关的。它们大多不是语言本身的变化，而是 **Xcode 27 的 SDK** 带来的，只要用 Xcode 27 编译就生效，与部署版本无关。

### @State 成为宏 <Badge type="warning" text="Xcode 27" />

详见[第 9 章](/state/09-state-binding#xcode-27-state-从属性包装器变成了宏)。

| | Xcode 26（Swift 6.3） | Xcode 27（Swift 6.4） |
| --- | --- | --- |
| 实现方式 | 属性包装器 | 宏 |
| 写法 | `@State private var x = 0` | 相同 |
| 默认值求值 | 视图结构体每次初始化都求值 | 只在视图身份首次建立时求值一次 |

实际影响集中在把类的实例放进 `@State` 的写法上：

```swift
@Observable
class Store {
    var items: [String] = []
    init() { /* 可能有比较昂贵的初始化 */ }
}

struct StoreScreen: View {
    // Xcode 27：Store() 只执行一次，放心这样写
    // Xcode 26：父视图每次更新都会多创建一个马上被丢弃的 Store
    @State private var store = Store()

    var body: some View {
        Text("\(store.items.count) 项")
    }
}
```

用 Xcode 26 编译，并且模型的初始化有副作用或很昂贵时的写法：

```swift
struct StoreScreenCompat: View {
    @State private var store: Store?

    var body: some View {
        Group {
            if let store {
                Text("\(store.items.count) 项")
            } else {
                ProgressView()
            }
        }
        .task {
            if store == nil { store = Store() }
        }
    }
}
```

### ContentBuilder 统一了构建器 <Badge type="warning" text="Xcode 27" />

详见[第 3 章](/foundations/03-view-identity)和[第 21 章](/components/21-toolbar-search)。

| 用途 | Xcode 26 | Xcode 27 |
| --- | --- | --- |
| 视图 | `@ViewBuilder` | `@ViewBuilder` 或 `@ContentBuilder` |
| 工具栏内容 | `@ToolbarContentBuilder` | `@ToolbarContentBuilder` 或 `@ContentBuilder` |
| 菜单命令 | `@CommandsBuilder` | `@CommandsBuilder` 或 `@ContentBuilder` |
| 标签页内容 | `@TabContentBuilder` | `@TabContentBuilder` 或 `@ContentBuilder` |

```swift
struct BuilderDemo: View {
    var body: some View {
        NavigationStack {
            Text("内容").toolbar { items }
        }
    }

    // Xcode 27：统一用 @ContentBuilder
    // Xcode 26：这里必须写 @ToolbarContentBuilder
    @ContentBuilder
    private var items: some ToolbarContent {
        ToolbarItem { Button("添加", systemImage: "plus") {} }
        ToolbarItem { Button("编辑", systemImage: "pencil") {} }
    }
}
```

旧的构建器名字都还能用。需要同时支持两个 Xcode 版本的代码，继续用旧名字。

同一次改动还把多个子视图的打包类型从 `TupleView<(A, B)>` 换成了基于参数包的 `TupleContent<Pack{A, B}>`。这只会出现在调试输出里，不影响你写代码。

### 数据驱动的 alert 与 confirmationDialog <Badge type="warning" text="Xcode 27" />

详见[第 20 章](/components/20-presentation#数据驱动的-alert)。

```swift
struct ItemToDelete: Identifiable {
    let id = UUID()
    var name: String
}

struct AlertComparison: View {
    @State private var target: ItemToDelete?
    @State private var isConfirming = false

    var body: some View {
        Button("删除") {
            target = ItemToDelete(name: "报告.pdf")
        }
        // Xcode 27：一个可选值就够了
        .alert("删除文件", item: $target) { item in
            Button("删除 \(item.name)", role: .destructive) {}
        }
    }
}

struct AlertComparisonOld: View {
    @State private var target: ItemToDelete?
    @State private var isConfirming = false

    var body: some View {
        Button("删除") {
            target = ItemToDelete(name: "报告.pdf")
            isConfirming = true
        }
        // Xcode 26：需要一个布尔值加一个数据值
        .alert("删除文件", isPresented: $isConfirming, presenting: target) { item in
            Button("删除 \(item.name)", role: .destructive) {}
        }
    }
}
```

显示错误也有了 `alert(error:)` 形式，直接绑定一个可选的错误值。

### anyAppleOS 可用性 <Badge type="warning" text="Swift 6.4" />

详见[第 33 章](/platforms/33-multiplatform#swift-6-4-anyappleos)。

```swift
// Swift 6.3：每个平台都要写
@available(iOS 27, macOS 27, watchOS 27, tvOS 27, visionOS 27, *)
func newerFeatureOld() {}

// Swift 6.4
@available(anyAppleOS 27, *)
func newerFeature() {}

func callNewerFeature() {
    if #available(anyAppleOS 27, *) {
        newerFeature()
    }
}
```

只适用于各平台版本号统一之后的版本（26 及以后）。

### @Observable 的两处变化

**相等的值不再触发更新。** 用 Xcode 27 的工具链编译时，`@Observable` 宏生成的 setter 会先比较新旧值：属性类型遵循 `Equatable` 且值没有变化时，不发出通知。详见[第 10 章](/state/10-observation)。

**更精细的观察 API**（SE-0506）。`withContinuousObservation(options:apply:)` 可以持续观察，并选择在属性变化之前、之后或对象销毁时收到事件。需要 27 系列的系统。它面向框架作者，写界面时用不到。

### 并发：defer 里的 await 与取消防护罩 <Badge type="warning" text="Swift 6.4" />

详见[第 12 章](/state/12-concurrency#swift-6-4-的新语法)。

```swift
actor Database {
    func begin() async {}
    func write(_ value: String) async throws {}
    func rollback() async {}
    func close() async {}
}

// Swift 6.4：defer 里可以 await（SE-0493），并且可以用取消防护罩保证清理完成（SE-0504）
func save(_ values: [String], to database: Database) async throws {
    await database.begin()
    defer {
        await withTaskCancellationShield {
            await database.close()
        }
    }

    for value in values {
        try await database.write(value)
    }
}

// Swift 6.3：需要在每条退出路径上手动清理
func saveCompat(_ values: [String], to database: Database) async throws {
    await database.begin()
    do {
        for value in values {
            try await database.write(value)
        }
    } catch {
        await database.close()
        throw error
    }
    await database.close()
}
```

## Swift 6.4 的其他语言变化

下面这些与界面开发的关系较远，了解即可。

### 可选的 some 和 any 不再需要括号（SE-0521）

```swift
protocol Shape2D {
    var area: Double { get }
}

struct Square: Shape2D {
    var side: Double
    var area: Double { side * side }
}

// Swift 6.4：直接写 some Shape2D? 和 any Shape2D?
func makeShape(side: Double) -> some Shape2D? {
    side > 0 ? Square(side: side) : nil
}

func describe(_ shape: any Shape2D?) -> String {
    shape.map { "面积 \($0.area)" } ?? "没有形状"
}

// Swift 6.3 及更早：必须加括号
func makeShapeOld(side: Double) -> (some Shape2D)? {
    side > 0 ? Square(side: side) : nil
}

func describeOld(_ shape: (any Shape2D)?) -> String {
    shape.map { "面积 \($0.area)" } ?? "没有形状"
}
```

在 SwiftUI 里，这让 `some View?` 这样的返回类型可以直接写出来。

### @diagnose：在源码里控制警告（SE-0522）

```swift
@available(*, deprecated, message: "请使用 newAPI()")
func oldAPI() {}

func newAPI() {}

// 这个函数里使用已弃用的 API 不再产生警告
@diagnose(DeprecatedDeclaration, as: ignored)
func migrationShim() {
    oldAPI()
}

// 把某一类警告提升为错误的写法是：@diagnose(DeprecatedDeclaration, as: error)
```

第二个参数可以是 `ignored`（忽略）、`warning`（警告）、`error`（错误）。第一个参数是诊断组的名字，就是编译器警告末尾方括号里的那个词，例如 `[#DeprecatedDeclaration]`。

用途：在一小段确实需要调用弃用 API 的过渡代码上静音警告，而不必对整个模块关闭这类警告。

### 不可拷贝类型的进展

Swift 6.4 继续完善所有权系统。这些主要用于性能敏感的底层代码：

| 特性 | 提案 | 作用 |
| --- | --- | --- |
| `Iterable` 协议 | SE-0516 | 让 `for-in` 可以遍历 `Span`、`InlineArray` 这类类型，遍历时借用元素而不拷贝 |
| `borrow` 和 `mutate` 访问器 | SE-0507 | 通过属性读取或修改 `Span`、`InlineArray`，不产生拷贝 |
| `Ref`、`MutableRef` | SE-0519 | 可以存储起来的借用引用 |
| `UniqueBox` | SE-0517 | 独占所有权的堆分配，没有引用计数 |
| `UniqueArray` | SE-0527 | 可以存放不可拷贝元素的动态数组，没有写时复制 |
| 不可拷贝类型的 `Optional` 改进 | SE-0532 | 不消耗值就能查看或修改可选值里的内容 |
| `withTemporaryAllocation` | SE-0524 | 自动初始化和清理的临时缓冲区 |
| `RawSpan` 的安全加载 | SE-0525 | 取代标记为不安全的加载和存储函数 |

```swift
struct Token: ~Copyable {
    var id: Int
}

func ownershipDemo() -> Int {
    // 固定长度、存在栈上的数组（InlineArray 是 6.2 引入的）
    let fixed: InlineArray<4, Int> = [1, 2, 3, 4]

    // Swift 6.4：可以直接用 for-in 遍历
    var sum = 0
    for value in fixed {
        sum += value
    }

    // Swift 6.4：存放不可拷贝元素的数组
    var tokens = UniqueArray<Token>()
    tokens.append(Token(id: 1))
    tokens.append(Token(id: 2))

    return sum + tokens.count
}
```

写 SwiftUI 应用的界面层时几乎用不到这些。它们的价值在图像处理、音频、解析器这类需要避免内存分配和拷贝的代码里。

### 其他

- **Swift Build 成为 Swift Package Manager 的默认构建系统。** 命令行和 Xcode 用上了同一套构建引擎。
- **Swift Testing 与 XCTest 互操作**（ST-0021）：两种测试框架的断言可以混用，便于逐步迁移。
- **Span 与 C++20 的 `std::span` 桥接**；Swift 与 Java 的互操作支持了异步和回调。
- **嵌入式 Swift** 支持了 `any` 类型和抛出任意 `Error`。
- **`weak let`**：不可变的弱引用。一个类如果只是因为有 `weak var` 才无法成为 `Sendable`，现在可以改用 `weak let`。

```swift
final class TreeNode: Sendable {
    let value: Int
    weak let parent: TreeNode?        // 不可变的弱引用，类因此可以是 Sendable

    init(value: Int, parent: TreeNode?) {
        self.value = value
        self.parent = parent
    }
}
```

## Swift 6.3 带来了什么

6.3 的重点在互操作和构建工具，对日常写界面的影响很小。

### 模块选择器 ::

两个模块导出了同名的东西时，用 `模块名::名字` 指明要哪一个：

```swift
struct Text2 {}                              // 假设你自己的模块里也有一个容易冲突的名字

let largest = Swift::max(3, 7)               // 明确使用标准库的 max
let label = SwiftUI::Text("来自 SwiftUI")     // 明确使用 SwiftUI 的 Text
```

在 SwiftUI 项目里，偶尔会遇到自己的类型和框架的类型重名（比如自己定义了 `Label`、`Section`、`Table`、`Tab`）。以前只能写 `SwiftUI.Text`，但当模块里恰好有和模块同名的类型时这种写法会有歧义。`::` 没有这个问题。

Xcode 27 的 SDK 接口文件里已经全面使用这种写法，你在“跳转到定义”时会看到 `SwiftUICore::View` 这样的名字。

### @c：把 Swift 函数导出给 C

```swift
@c
func addNumbers(_ a: Int32, _ b: Int32) -> Int32 {
    a + b
}

@c(MyLibrary_version)
func libraryVersion() -> Int32 {
    3
}
```

`@c` 让一个 Swift 函数可以被 C 代码调用，并出现在生成的头文件里。括号里可以指定 C 这边的名字。它是以前非正式的 `@_cdecl` 的正式替代。Swift 6.4 又增加了 `@c @implementation` 的组合，用 Swift 实现一个已经在 C 头文件里声明的函数。

### 给库作者的性能控制

- `@specialize`：为泛型函数预先生成针对常用具体类型的专用版本。
- `@inline(always)`：保证在直接调用处内联。
- `@export(implementation)`：把函数的实现暴露给使用这个库的代码，让它们可以进一步优化。

Xcode 27 的 SwiftUI 接口里大量使用了 `@export(implementation)` 和 `@inline(always)`，这是它们被设计出来的用途。

### 其他

- Swift Build 在 Swift Package Manager 里可以预览使用（6.4 成为默认）。
- 第一个官方的 Android Swift SDK。
- Swift Testing：可以记录警告级别的问题、取消测试、附加图片。

## 回顾：Swift 6.2 打下的基础

教程里的并发模型来自 Swift 6.2（Xcode 26）。如果你学 Swift 时用的教材比较早，下面这些可能是新的：

| 特性 | 提案 | 教程里的位置 |
| --- | --- | --- |
| 默认主 actor 隔离（Default Actor Isolation） | SE-0466 | 第 12 章 |
| 未标注的 `async` 函数在调用者的 actor 上运行 | SE-0461 | 第 12 章 |
| `@concurrent`：明确在后台线程池上运行 | SE-0461 | 第 12 章 |
| 隔离的协议遵循（isolated conformances） | SE-0470 | 第 8、22 章里的 `nonisolated` 说明 |
| `Observations`：把可观察对象的变化变成异步序列 | SE-0475 | 第 10 章 |
| `InlineArray`、`Span` | SE-0453、SE-0447 | 本附录 |

## 对照表：同一件事的两种写法

| 要做的事 | Swift 6.3 / Xcode 26.4 | Swift 6.4 / Xcode 27 |
| --- | --- | --- |
| 在 `@State` 里放模型对象 | 初始化昂贵时用可选值加 `.task` | 直接 `@State private var m = Model()` |
| 工具栏内容的计算属性 | `@ToolbarContentBuilder` | `@ContentBuilder` 也可以 |
| 菜单命令的计算属性 | `@CommandsBuilder` | `@ContentBuilder` 也可以 |
| 由数据驱动的 alert | `alert(_:isPresented:presenting:actions:)` | `alert(_:item:actions:)` |
| 显示一个错误 | `alert(isPresented:error:actions:)` | `alert(error:actions:)` |
| 标注“27 及以上所有平台” | `@available(iOS 27, macOS 27, …, *)` | `@available(anyAppleOS 27, *)` |
| 异步的清理代码 | 在每条退出路径上手动 `await` | `defer { await … }` |
| 被取消后仍要完成的清理 | 没有标准写法 | `withTaskCancellationShield { }` |
| 可选的不透明类型 | `(some View)?` | `some View?` |
| 局部静音一类警告 | 没有（只能整个模块设置） | `@diagnose(组名, as: ignored)` |
| 遍历 `InlineArray`、`Span` | 用下标循环 | `for x in array` |
| 用 XCTest 的老项目引入 Swift Testing | 两套框架各用各的 | 断言可以混用 |
| 让旧界面保持 26 之前的外观 | Info.plist 的 `UIDesignRequiresCompatibility` | 已失效 |

## 从 Xcode 26 升级到 Xcode 27 的检查清单

- [ ] **`@State` 的行为变化。** 检查有没有代码依赖“默认值在每次视图初始化时都求值”。这种依赖很少见，通常是 bug。原来为了避免重复创建而写的“可选值加 `.task`”可以简化。
- [ ] **Liquid Glass 的兼容开关失效。** 如果 Info.plist 里有 `UIDesignRequiresCompatibility`，它不再起作用。界面一定是新外观，需要完成适配（[第 23 章](/components/23-liquid-glass)）。
- [ ] **弃用警告。** `Text` 的 `+` 拼接（26 起弃用）改成字符串插值。
- [ ] **可用性标注。** 针对 26 及以后的 `@available` 可以简化成 `anyAppleOS`。
- [ ] **新的可选 API。** 评估是否采用：`reorderable`、`swipeActionsContainer`、工具栏的可见性优先级和 `ToolbarOverflowMenu`（后者仅 iOS）、新的 `Document` 协议、`AsyncImage` 的缓存配置。
- [ ] **Swift Package。** Swift Build 成为默认构建系统，检查 CI 脚本和自定义的构建插件。
- [ ] **重新跑一遍测试和主要流程**，尤其是界面外观。

## 官方来源

- [Swift 6.4 Released（swift.org）](https://www.swift.org/blog/swift-6.4-released/)
- [Swift 6.3 Released（swift.org）](https://www.swift.org/blog/swift-6.3-released/)
- [Swift 6.2 Released（swift.org）](https://www.swift.org/blog/swift-6.2-released/)
- [What's New in Swift（Apple）](https://developer.apple.com/swift/whats-new/)
- [Swift Evolution 提案列表（可按版本筛选）](https://www.swift.org/swift-evolution/)
- [SwiftUI 更新记录（Apple）](https://developer.apple.com/documentation/updates/swiftui)
- [`State()` 宏](https://developer.apple.com/documentation/swiftui/state())
- [`ContentBuilder`](https://developer.apple.com/documentation/swiftui/contentbuilder)
- [`UIDesignRequiresCompatibility`](https://developer.apple.com/documentation/bundleresources/information-property-list/uidesignrequirescompatibility)
- [Adopting strict concurrency in Swift 6 apps](https://developer.apple.com/documentation/swift/adoptingswift6)
- [The Swift Programming Language（官方语言手册）](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/)
- [Xcode Release Notes](https://developer.apple.com/documentation/xcode-release-notes)
