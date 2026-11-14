# 10 Observation：@Observable 模型

## 本章目标

- 知道什么时候该把数据从 `@State` 搬进模型类
- 用 `@Observable` 定义模型，理解“按属性追踪依赖”的机制
- 掌握模型在视图间传递的三种方式：属性、`@Bindable`、环境
- 会处理模型的嵌套、集合与计算属性
- 读得懂旧代码里的 `ObservableObject`、`@StateObject`、`@ObservedObject`
- 了解在视图之外观察模型变化的办法

## 为什么需要模型类

上一章的 `@State` 加结构体，能应付视图内部的局部状态。但随着应用变大，会遇到几个 `@State` 不好解决的问题：

- **数据要跨很多层视图共享。** 用户信息在十几个页面里都要用，一层层传绑定太繁琐。
- **数据有自己的行为。** “添加一条待办”“从网络加载”“校验并保存”，这些逻辑应该和数据放在一起，而不是散落在各个视图的按钮闭包里。
- **数据的生命周期比某个视图长。** 视图消失了，数据还得在。
- **需要被测试。** 逻辑写在视图里很难单独测试。

解决办法是把数据和逻辑放进一个**类**里，这个类叫模型（model）。用类而不是结构体，是因为我们需要**引用语义**：多个视图持有同一个对象的引用，一处修改，处处可见。

但这带来一个问题。结构体改一个字段，整个值就变了，`@State` 很容易察觉。类的对象引用不变，里面的属性变了，SwiftUI 怎么知道？答案是 Observation 框架。

## @Observable

```swift
import Observation

@Observable
class Counter {
    var count = 0
    var step = 1

    func increment() {
        count += step
    }
}

struct CounterScreen: View {
    @State private var counter = Counter()

    var body: some View {
        VStack(spacing: 16) {
            Text("\(counter.count)")
                .font(.largeTitle)
            Button("加 \(counter.step)") {
                counter.increment()
            }
        }
        .padding()
    }
}
```

给类加上 `@Observable` 宏，它的存储属性就变成了“可观察的”。视图里读了哪个属性，那个属性变化时视图就会更新。

几个要点：

- `@Observable` 是 Swift 标准库 Observation 模块里的宏，不是 SwiftUI 专属的。`import SwiftUI` 会自动带上它。需要 iOS 17 / macOS 14 及以上。
- 模型用 `@State` 持有。这里 `@State` 的作用是**让这个对象的生命周期和视图身份绑定**，不让它随着视图结构体的重建而丢失。上一章讲过，用 Xcode 27 编译时，`Counter()` 只会执行一次。
- 调用 `counter.increment()` 修改属性，不需要任何额外的通知代码。

### 它是怎么知道的

`@Observable` 宏把每个存储属性改写成了带“登记”和“通知”的版本。可以这样理解：

```text
读 counter.count  →  登记：“当前正在计算的这个 body 用到了 count”
写 counter.count  →  通知：“所有登记过 count 的 body，你们需要重新计算”
```

SwiftUI 在调用每个视图的 `body` 之前开始记录，`body` 执行期间读到的所有可观察属性都被记下来，`body` 结束后这份清单就是该视图的依赖。

这个机制有一个非常重要的性质：**依赖是按属性追踪的，而且只追踪 `body` 里实际读到的属性。**

```swift
@Observable
class Player {
    var name = "玩家一"
    var score = 0
    var lastLogin = Date.now
}

struct NameLabel: View {
    let player: Player

    var body: some View {
        let _ = print("NameLabel 重新计算")
        Text(player.name)                    // 只读了 name
    }
}

struct ScoreLabel2: View {
    let player: Player

    var body: some View {
        let _ = print("ScoreLabel 重新计算")
        Text("得分 \(player.score)")          // 只读了 score
    }
}

struct PlayerScreen: View {
    @State private var player = Player()

    var body: some View {
        VStack(spacing: 12) {
            NameLabel(player: player)
            ScoreLabel2(player: player)
            Button("加分") { player.score += 10 }
            Button("改名") { player.name = "新名字" }
        }
        .padding()
    }
}
```

运行并观察控制台：点“加分”只打印“ScoreLabel 重新计算”，点“改名”只打印“NameLabel 重新计算”。`PlayerScreen` 自己的 `body` 没有读任何属性，所以两次都不重新计算。

::: tip 这带来的设计启示
视图拆得越细，每个视图读的属性越少，状态变化时需要重新计算的范围就越小。**不需要你做任何优化，把视图拆小就自动获得了精确更新。**
:::

::: info 写入相同的值会触发更新吗
用 Xcode 27 的工具链编译时，`@Observable` 宏生成的 setter 会先比较：如果属性类型是 `Equatable` 且新值等于旧值，就不发通知。所以反复执行 `player.name = "同一个名字"` 不会引起视图重新计算。早期版本的工具链没有这个比较，每次赋值都会通知。
:::

## 在视图之间传递模型

模型创建出来之后，子视图怎么拿到它？有三种方式，对应三种需求。

### 方式一：普通属性，用于读取和调用方法

上面的 `NameLabel` 已经演示了：模型是引用类型，直接作为普通属性传递即可。**不需要任何属性包装器。**

```swift nocheck
struct NameLabel: View {
    let player: Player        // 就是一个普通的 let
    ...
}
```

子视图可以读它的属性（自动登记依赖），也可以调用它的方法或直接改它的属性（`player.score += 1`）。因为 `player` 是引用，`let` 只是说“这个引用不变”，不妨碍修改对象内部。

### 方式二：@Bindable，用于需要绑定的场合

`TextField`、`Toggle` 这些控件需要 `Binding`。对 `@State` 我们用 `$` 获取，对一个普通的模型属性怎么办？用 `@Bindable`：

```swift
@Observable
class ProfileModel {
    var nickname = ""
    var isPublic = true
    var bio = ""
}

struct ProfileForm: View {
    @Bindable var profile: ProfileModel

    var body: some View {
        Form {
            TextField("昵称", text: $profile.nickname)
            Toggle("公开资料", isOn: $profile.isPublic)
            TextField("简介", text: $profile.bio, axis: .vertical)
                .lineLimit(3...6)
        }
    }
}

struct ProfileScreen: View {
    @State private var profile = ProfileModel()

    var body: some View {
        VStack {
            ProfileForm(profile: profile)
            Text("预览：\(profile.nickname)\(profile.isPublic ? "（公开）" : "（私密）")")
                .padding()
        }
    }
}
```

`@Bindable` 只做一件事：让你能对一个可观察对象使用 `$` 语法。它不拥有对象，不影响生命周期。

如果只在某一处临时需要绑定，可以在 `body` 里就地创建：

```swift
struct InlineBindable: View {
    let profile: ProfileModel

    var body: some View {
        @Bindable var profile = profile
        Toggle("公开资料", isOn: $profile.isPublic)
    }
}
```

顺便说明：持有模型的那个视图里，`@State private var profile = ProfileModel()` 本身就支持 `$profile.nickname`，不需要再加 `@Bindable`。

### 方式三：环境，用于跨层共享

当模型需要被很深层的视图用到时，一层层传参数很累。把它放进环境，任何后代视图都可以直接取：

```swift
@Observable
class AppSettings {
    var accentHue = 0.6
    var fontScale = 1.0
}

struct ThemedText: View {
    @Environment(AppSettings.self) private var settings

    var body: some View {
        Text("主题色文字")
            .font(.system(size: 17 * settings.fontScale))
            .foregroundStyle(Color(hue: settings.accentHue, saturation: 0.8, brightness: 0.8))
    }
}

struct SettingsPanel: View {
    @Environment(AppSettings.self) private var settings

    var body: some View {
        @Bindable var settings = settings
        VStack {
            Slider(value: $settings.accentHue)
            Slider(value: $settings.fontScale, in: 0.8...2)
        }
    }
}

struct EnvironmentRoot: View {
    @State private var settings = AppSettings()

    var body: some View {
        VStack(spacing: 20) {
            ThemedText()            // 中间不需要传任何参数
            SettingsPanel()
        }
        .padding()
        .environment(settings)      // 注入：这棵子树里都能取到
    }
}
```

- `.environment(settings)` 把对象注入环境
- `@Environment(AppSettings.self)` 按**类型**取出
- 取出来的对象要绑定时，同样用 `@Bindable var settings = settings` 就地包装

::: danger 忘记注入会崩溃
`@Environment(AppSettings.self)` 如果在环境里找不到这个类型的对象，运行时会直接崩溃。预览里也要记得注入：

```swift nocheck
#Preview {
    ThemedText()
        .environment(AppSettings())
}
```

如果某个对象可能不存在，声明成可选类型：`@Environment(AppSettings.self) private var settings: AppSettings?`，找不到时得到 `nil`。
:::

### 该用哪种

| 需求 | 用法 |
| --- | --- |
| 创建并拥有模型 | `@State private var model = Model()` |
| 子视图读属性、调方法 | `let model: Model` |
| 子视图需要 `$model.x` 绑定 | `@Bindable var model: Model` |
| 很多层后代都要用 | `.environment(model)` + `@Environment(Model.self)` |

整个应用共享的模型通常在 `App` 里创建并注入：

```swift nocheck
@main
struct MyApp: App {
    @State private var settings = AppSettings()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(settings)
        }
    }
}
```

第 2 章提到 `App` 是放全局状态的地方，就是这个意思。

## 模型的细节

### 计算属性自动可观察

```swift
@Observable
class ShoppingCart {
    var items: [CartItem] = []

    var total: Double {
        items.reduce(0) { $0 + $1.price * Double($1.quantity) }
    }

    var isEmpty: Bool { items.isEmpty }
}

struct CartItem: Identifiable {
    let id = UUID()
    var name: String
    var price: Double
    var quantity = 1
}
```

视图读 `cart.total` 时，`total` 内部读了 `items`，所以依赖被记在 `items` 上。`items` 一变，读过 `total` 的视图就更新。计算属性不需要任何额外标记。

### 不想被观察的属性：@ObservationIgnored

```swift
@Observable
class DataStore {
    var records: [String] = []

    @ObservationIgnored
    private var cache: [String: Data] = [:]      // 内部缓存，变化不需要刷新界面

    @ObservationIgnored
    var onSave: (() -> Void)?
}
```

### 模型里放数组

```swift
@Observable
class TodoStore {
    var todos: [Todo] = [
        Todo(title: "读第 10 章"),
        Todo(title: "做练习"),
    ]

    func add(_ title: String) {
        todos.append(Todo(title: title))
    }

    func remove(at offsets: IndexSet) {
        todos.remove(atOffsets: offsets)
    }
}

struct Todo: Identifiable {
    let id = UUID()
    var title: String
    var isDone = false
}

struct TodoScreen: View {
    @State private var store = TodoStore()
    @State private var draft = ""

    var body: some View {
        List {
            Section {
                ForEach($store.todos) { $todo in
                    Toggle(todo.title, isOn: $todo.isDone)
                }
                .onDelete { store.remove(at: $0) }
            }

            Section {
                HStack {
                    TextField("新待办", text: $draft)
                    Button("添加") {
                        store.add(draft)
                        draft = ""
                    }
                    .disabled(draft.isEmpty)
                }
            }
        }
    }
}
```

这里 `Todo` 是结构体。修改任意一个 `todo.isDone`，等于修改了 `store.todos` 这个数组属性，所有读过 `todos` 的视图都会更新。

### 结构体元素还是类元素

如果列表很长，而且每一行会被频繁地单独修改，可以把元素也做成 `@Observable` 类：

```swift
@Observable
class Task2: Identifiable {
    let id = UUID()
    var title: String
    var isDone = false

    init(title: String) { self.title = title }
}

@Observable
class TaskStore {
    var tasks: [Task2] = (1...100).map { Task2(title: "任务 \($0)") }
}

struct TaskRow: View {
    @Bindable var task: Task2

    var body: some View {
        Toggle(task.title, isOn: $task.isDone)      // 只依赖这一个 task 的属性
    }
}

struct TaskListScreen: View {
    @State private var store = TaskStore()

    var body: some View {
        List(store.tasks) { task in
            TaskRow(task: task)
        }
    }
}
```

这样勾选某一行时，数组本身没变（里面的引用没变），只有那一行的 `TaskRow` 读过 `task.isDone`，所以只有它更新。

| 元素类型 | 修改一个元素时谁更新 | 适合 |
| --- | --- | --- |
| 结构体 | 所有读过该数组的视图 | 数据量小，或需要值语义（比较、复制、撤销） |
| `@Observable` 类 | 只有读过该元素对应属性的视图 | 数据量大，单个元素频繁变化 |

两种都是合理的选择。从结构体开始，遇到性能问题再换成类。

### 模型里的异步方法

模型的方法可以是 `async` 的，典型的例子是加载数据：

```swift
@Observable
class ArticleLoader {
    enum Phase {
        case idle
        case loading
        case loaded([String])
        case failed(String)
    }

    var phase = Phase.idle

    func load() async {
        phase = .loading
        do {
            try await Task.sleep(for: .seconds(1))        // 模拟网络请求
            phase = .loaded(["第一篇", "第二篇", "第三篇"])
        } catch {
            phase = .failed("加载被取消")
        }
    }
}

struct ArticleScreen: View {
    @State private var loader = ArticleLoader()

    var body: some View {
        Group {
            switch loader.phase {
            case .idle, .loading:
                ProgressView("加载中…")
            case .loaded(let titles):
                List(titles, id: \.self) { Text($0) }
            case .failed(let message):
                ContentUnavailableView("出错了", systemImage: "exclamationmark.triangle", description: Text(message))
            }
        }
        .task {
            await loader.load()
        }
    }
}
```

这里有两个值得学的模式：

- **用枚举表示加载状态。** 不要用 `isLoading`、`error`、`data` 三个独立的属性，那样会出现“既在加载又有错误”这种不可能的组合。枚举让非法状态无法表示。
- **`.task` 修饰符**在视图出现时启动异步任务，视图消失时自动取消。第 12 章详细讲。

## 读懂旧代码：ObservableObject

`@Observable` 是 iOS 17 引入的。在它之前，SwiftUI 用基于 Combine 的 `ObservableObject` 协议。你会在大量教程和已有项目里看到它，需要能读懂：

```swift
import Combine

class LegacyCounter: ObservableObject {
    @Published var count = 0
    @Published var step = 1
}

struct LegacyCounterScreen: View {
    @StateObject private var counter = LegacyCounter()

    var body: some View {
        LegacyCounterLabel(counter: counter)
    }
}

struct LegacyCounterLabel: View {
    @ObservedObject var counter: LegacyCounter

    var body: some View {
        Button("\(counter.count)") { counter.count += counter.step }
    }
}
```

新旧对照：

| 旧（iOS 13+） | 新（iOS 17+） | 作用 |
| --- | --- | --- |
| `class M: ObservableObject` | `@Observable class M` | 定义模型 |
| `@Published var x` | `var x`（什么都不用加） | 可观察的属性 |
| `@StateObject private var m = M()` | `@State private var m = M()` | 创建并拥有 |
| `@ObservedObject var m: M` | `let m: M` 或 `@Bindable var m: M` | 接收 |
| `.environmentObject(m)` | `.environment(m)` | 注入环境 |
| `@EnvironmentObject var m: M` | `@Environment(M.self) var m` | 从环境读取 |

两者最本质的区别是**更新粒度**：

- `ObservableObject`：对象的**任何一个** `@Published` 属性变了，**所有**观察这个对象的视图都重新计算，不管它用没用到那个属性。
- `@Observable`：只有读过那个具体属性的视图才重新计算。

新代码请一律用 `@Observable`。只有在需要支持 iOS 16 及更早版本时才用 `ObservableObject`。

## 在视图之外观察变化

SwiftUI 视图自动追踪依赖。但有时你想在非视图的代码里响应模型变化，比如模型变了就自动保存。

### Observations：把变化变成异步序列 <Badge type="tip" text="iOS 26+ / macOS 26+" />

```swift
@Observable
class Document {
    var title = "未命名"
    var body = ""
}

@available(iOS 26, macOS 26, *)
func autosave(_ document: Document) async {
    let changes = Observations {
        (document.title, document.body)          // 闭包里读到的属性就是被观察的属性
    }

    for await (title, body) in changes {
        print("保存：\(title)，\(body.count) 个字")
    }
}
```

`Observations` 是 Swift 6.2 加入的。闭包里读到的属性任何一个变化，序列就产生一个新值。连续的多次修改会被合并成一次。

### withObservationTracking：一次性的回调

更底层的 API，全版本可用。它只通知**一次**，要持续观察需要在回调里重新注册：

```swift
func observeOnce(_ document: Document) {
    withObservationTracking {
        _ = document.title                       // 读一下，登记依赖
    } onChange: {
        print("title 即将变化")                   // 只触发一次
    }
}
```

SwiftUI 内部就是用这个机制实现视图依赖追踪的。

::: info Swift 6.4 的新增
Swift 6.4（SE-0506）给 Observation 增加了更精细的观察能力：`withContinuousObservation(options:apply:)` 可以持续观察，并通过选项选择在属性变化之前（`.willSet`）、之后（`.didSet`）或对象销毁时（`.deinit`）收到事件。这些 API 需要 27 系列的系统。它主要面向框架和库的作者，日常写界面用不到，详见[附录 A](/appendix/swift-6-4)。
:::

## 常见误区

**误区一：“传递 `@Observable` 对象要用 `@ObservedObject` 或 `@Binding`。”** 都不需要。普通 `let` 属性就能读、能改、能自动更新。只有需要 `$` 绑定时才加 `@Bindable`。

**误区二：“模型不用 `@State` 持有，直接 `let model = Model()` 写在视图里。”** 视图结构体每次重建都会创建一个全新的对象，之前的数据全丢。模型必须由 `@State`（或更高层的拥有者）持有。

**误区三：“所有数据都放进一个巨大的全局模型。”** 模型应该按职责拆分。局部的、临时的界面状态（比如一个弹窗是否显示）继续用视图自己的 `@State`。

**误区四：“`@Observable` 可以用在结构体上。”** 只能用于类。结构体是值类型，本来就能被 `@State` 追踪。

**误区五：“在 `body` 里读了 `model`，所以 `model` 的任何变化都会更新。”** 只有你**实际读到的属性**变化才会更新。如果读的是 `model.items.count`，那依赖的是 `items`。

## 小结

- 模型类承载需要共享、有行为、生命周期更长的数据。`@Observable` 让它的属性可观察。
- 依赖按属性追踪：视图只在它实际读过的属性变化时更新。
- 持有用 `@State`，传递用普通属性，要绑定用 `@Bindable`，跨层共享用 `.environment()` 与 `@Environment(类型.self)`。
- 计算属性自动可观察；`@ObservationIgnored` 排除不需要观察的属性。
- 用枚举建模加载状态，避免不可能的状态组合。
- 旧代码里的 `ObservableObject` 体系可以按对照表逐一映射到新写法。

## 练习

1. 把第 9 章的 `TodoListBasic` 改造成使用 `@Observable class TodoStore` 的版本，增加“清除已完成”的方法和“剩余 N 项”的计算属性。
2. 在 `PlayerScreen` 的例子里，给 `PlayerScreen.body` 加一行 `Text(player.name)`。重新运行，点“加分”时控制台打印有变化吗？点“改名”呢？解释原因。
3. 写一个 `ThemeModel`（包含强调色和是否紧凑布局），在 `App` 层注入环境，在至少三层深的子视图里读取并修改它。
4. 把一个用 `ObservableObject` + `@Published` + `@StateObject` + `@EnvironmentObject` 写的小例子（可以自己先写一个），按对照表迁移到 `@Observable`。

## 官方文档

- [`Observable()` 宏](https://developer.apple.com/documentation/observation/observable())
- [Observation 框架](https://developer.apple.com/documentation/observation)
- [Managing model data in your app](https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app)
- [Migrating from the Observable Object protocol to the Observable macro](https://developer.apple.com/documentation/swiftui/migrating-from-the-observable-object-protocol-to-the-observable-macro)
- [`Bindable`](https://developer.apple.com/documentation/swiftui/bindable)
- [`Environment`](https://developer.apple.com/documentation/swiftui/environment)
- [`environment(_:)`（注入可观察对象）](https://developer.apple.com/documentation/swiftui/view/environment(_:))
- [`ObservationIgnored()`](https://developer.apple.com/documentation/observation/observationignored())
- [`Observations`](https://developer.apple.com/documentation/observation/observations)
- [`withObservationTracking(_:onChange:)`](https://developer.apple.com/documentation/observation/withobservationtracking(_:onchange:))
- [`ObservableObject`（旧体系）](https://developer.apple.com/documentation/combine/observableobject)
- [WWDC23：Discover Observation in SwiftUI](https://developer.apple.com/videos/play/wwdc2023/10149/)
