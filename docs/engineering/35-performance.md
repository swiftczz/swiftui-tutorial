# 35 性能与调试

## 本章目标

- 建立 SwiftUI 更新机制的完整模型：什么会触发 `body`，代价在哪里
- 学会观察：知道一个视图为什么更新、更新了多少次
- 掌握减少不必要更新的方法
- 让 `body` 本身保持廉价
- 优化长列表
- 熟悉常见的运行时警告和它们的含义
- 掌握一套调试 SwiftUI 问题的工具和方法

关于性能，先说最重要的一句话：**先测量，再优化。** SwiftUI 默认已经很快，大多数界面不需要任何优化。凭感觉做的“优化”常常让代码变复杂却没有效果。这一章先讲原理和测量，再讲手段。

## 更新是怎么发生的

把前面各章的片段拼成一幅完整的图。SwiftUI 把界面的一次更新分成几个阶段：

```text
① 某个状态变了
      │   @State 赋值、@Observable 属性修改、环境值变化、父视图传入了新的参数
      ▼
② 标记受影响的视图
      │   谁“读过”这个状态，谁就被标记为需要更新
      ▼
③ 重新计算这些视图的 body
      │   得到新的视图描述（一些轻量的结构体）
      ▼
④ 和上一次的描述比较
      │   对每个子视图：它的输入变了吗？
      │   没变 → 到此为止，不再往下
      │   变了 → 对它重复第 ③ 步
      ▼
⑤ 布局
      │   受影响的部分重新走“提议—回应—摆放”
      ▼
⑥ 渲染
          只重绘真正变化的图层
```

性能问题就出在这几个阶段里。对应地有三类原因：

| 问题 | 发生在 | 表现 |
| --- | --- | --- |
| **更新得太多**：不该更新的视图也在更新 | ②③④ | 改一个小状态，整个页面的 `body` 都在跑 |
| **更新得太慢**：单次 `body` 或布局很耗时 | ③⑤ | 每次更新都卡一下 |
| **更新得太频繁**：每秒几十上百次 | ① | 滚动、拖拽、动画时掉帧 |

### 什么会让一个视图的 body 重新计算

精确地说，只有两种情况：

**一、它依赖的动态数据变了。** 包括：它自己的 `@State`；它在 `body` 里读过的 `@Observable` 对象的属性；它读过的 `@Environment` 值；它持有的 `@Binding` 指向的值。

**二、父视图更新时，传给它的属性变了。** 父视图的 `body` 重新执行，会重新创建子视图的结构体。SwiftUI 把新旧两个结构体的**存储属性逐个比较**：全都相等，子视图的 `body` 不需要重算；有任何一个不等，就重算。

第二条是理解性能的关键。它意味着：**父视图更新并不必然导致子视图更新。** 一个子视图只要输入没变，它就是一道“防火墙”，更新到它这里就停了。

这就是上一章说“拆成独立的 `View` 结构体会更快”的原因，也是“子视图只接收它需要的数据”的原因。

## 观察：视图为什么更新了

### Self._printChanges()

在 `body` 的开头加一行，SwiftUI 会在每次重新计算这个 `body` 时打印原因：

```swift
struct ChangeTracking: View {
    @State private var count = 0
    @State private var text = ""

    var body: some View {
        let _ = Self._printChanges()

        VStack(spacing: 12) {
            Text("计数 \(count)")
            Button("加一") { count += 1 }
            TextField("输入", text: $text)
                .textFieldStyle(.roundedBorder)
        }
        .padding()
    }
}
```

控制台的输出类似：

```text
ChangeTracking: @self, @identity, _count, _text changed.    ← 第一次出现
ChangeTracking: _count changed.                             ← 点了按钮
ChangeTracking: _text changed.                              ← 输入了文字
```

| 输出 | 含义 |
| --- | --- |
| `@identity` | 视图的身份是新的（第一次出现，或身份变了） |
| `@self` | 视图结构体本身变了，也就是父视图传进来的某个属性变了 |
| `_count` | 名为 `count` 的状态变了 |
| `@dependencies`（或某个模型属性的名字） | 读过的 `@Observable` 属性变了 |

`let _ = ...` 这种写法是因为 `body` 是 `@ViewBuilder`，里面不能直接写没有返回值的语句。

名字前面的下划线说明这是个**仅供调试**的 API。它不应该出现在提交的代码里，更不能出现在发布版本里。用 `#if DEBUG` 包住，或者用完就删。

`Self._logChanges()` 做同样的事，但把信息输出到系统日志（可以在 Instruments 和“控制台”应用里看），不占用 Xcode 的控制台。

### 一个简易的更新计数器

想直观地“看见”更新，可以做一个每次 `body` 执行都换颜色的调试工具：

```swift
extension View {
    /// 调试用：每次所在的 body 重新计算，背景就换一种随机颜色。
    func debugFlashOnUpdate() -> some View {
        #if DEBUG
        background(Color(hue: .random(in: 0...1), saturation: 0.5, brightness: 1).opacity(0.4))
        #else
        self
        #endif
    }
}

struct FlashDemo: View {
    @State private var count = 0

    var body: some View {
        VStack(spacing: 12) {
            Text("父视图：\(count)").padding().debugFlashOnUpdate()
            StaticChild().padding().debugFlashOnUpdate()
            Button("加一") { count += 1 }
        }
    }
}

struct StaticChild: View {
    var body: some View {
        Text("我没有依赖任何状态").debugFlashOnUpdate()
    }
}
```

点击按钮，父视图的文字背景每次都变色，而 `StaticChild` 内部的文字不变色。注意中间那个 `StaticChild().padding().debugFlashOnUpdate()`：这个修饰符是在**父视图的 `body`** 里写的，所以它会变色；`StaticChild` 自己 `body` 里的那个不会。这个小实验清楚地显示了“更新边界”在哪里。

### Instruments

真正的性能分析要用 Instruments。在 Xcode 里选择 **Product › Profile**（<kbd>⌘I</kbd>），选 **SwiftUI** 模板。它包含几条对 SwiftUI 很有用的轨道：

| 轨道 | 告诉你什么 |
| --- | --- |
| **Update Groups** | 一段时间内 SwiftUI 做了多少更新工作 |
| **Long View Body Updates** | 哪些视图的 `body` 执行时间过长。橙色和红色的是需要关注的 |
| **Long Representable Updates** | 哪些 UIKit / AppKit 桥接视图的更新太慢 |
| **Other Long Updates** | 其他耗时的更新（布局、文本测量等） |
| **Hangs** | 主线程被阻塞、界面没有响应的时段 |
| **Time Profiler** | 这段时间 CPU 在执行哪些函数 |

Xcode 26 起的 SwiftUI 工具还提供了**因果图**（Cause & Effect Graph）：选中一次视图更新，它会画出是哪个状态的变化、经过哪些中间环节导致了这次更新。排查“这个视图为什么老在更新”时非常有用。

使用 Instruments 的要点：

- **用 Release 配置。** Profile 默认就是。Debug 版本没有优化，测出来的数字没有参考价值。
- **在真机上测，尤其是你支持的最旧的设备。** 模拟器跑在 Mac 的处理器上，性能特征完全不同。
- **先复现问题，再看数据。** 录制时做那个让你觉得卡的操作，然后在时间线上框选对应的时段。

## 减少不必要的更新

### 一、拆分视图，缩小更新范围

这是最有效也最基本的手段。看一个典型的问题：

```swift
@Observable
class TimerModel {
    var elapsed = 0.0
    var laps: [Double] = []
}

// 问题：计时器每 0.1 秒更新一次，整个列表的 body 都跟着重算
struct StopwatchBad: View {
    @State private var model = TimerModel()

    var body: some View {
        VStack {
            Text(model.elapsed, format: .number.precision(.fractionLength(1)))
                .font(.largeTitle.monospacedDigit())

            List(model.laps.indices, id: \.self) { index in
                Text("第 \(index + 1) 圈：\(model.laps[index], format: .number.precision(.fractionLength(1)))")
            }
        }
    }
}

// 改进：把频繁变化的部分隔离到自己的视图里
struct StopwatchGood: View {
    @State private var model = TimerModel()

    var body: some View {
        VStack {
            ElapsedLabel(model: model)       // 只有它读 elapsed
            LapList(laps: model.laps)        // 只依赖 laps
        }
    }
}

struct ElapsedLabel: View {
    let model: TimerModel

    var body: some View {
        Text(model.elapsed, format: .number.precision(.fractionLength(1)))
            .font(.largeTitle.monospacedDigit())
    }
}

struct LapList: View {
    let laps: [Double]

    var body: some View {
        List(laps.indices, id: \.self) { index in
            Text("第 \(index + 1) 圈：\(laps[index], format: .number.precision(.fractionLength(1)))")
        }
    }
}
```

在 `StopwatchBad` 里，`body` 读了 `model.elapsed`，所以 `elapsed` 每次变化整个 `body` 都重算，包括列表。在 `StopwatchGood` 里：

- `StopwatchGood.body` 读了 `model.laps`（为了传给 `LapList`），没读 `elapsed`。`elapsed` 变化时它不更新。
- `ElapsedLabel.body` 读了 `elapsed`，每 0.1 秒更新。但它只是一行文字。
- `LapList` 只在 `laps` 变化时更新。

**把变化频繁的状态，关进尽可能小的视图里。**

### 二、让依赖尽量窄

`@Observable` 按属性追踪依赖（第 10 章）。利用好这一点：

```swift
@Observable
class ProfileModel2 {
    var name = "小明"
    var avatar = "person.circle"
    var unreadCount = 0
    var lastSeen = Date.now
}

// 不够好：读了整个模型里的四个属性，任何一个变化都会更新
struct ProfileHeaderWide: View {
    let model: ProfileModel2

    var body: some View {
        HStack {
            Image(systemName: model.avatar)
            Text(model.name)
            Text("\(model.unreadCount)")
            Text(model.lastSeen, style: .relative)
        }
    }
}

// 更好：每个小视图只读它需要的那一个属性
struct ProfileHeaderNarrow: View {
    let model: ProfileModel2

    var body: some View {
        HStack {
            AvatarImage(model: model)
            NameText(model: model)
            UnreadBadge(model: model)
        }
    }
}

struct AvatarImage: View {
    let model: ProfileModel2
    var body: some View { Image(systemName: model.avatar) }
}

struct NameText: View {
    let model: ProfileModel2
    var body: some View { Text(model.name) }
}

struct UnreadBadge: View {
    let model: ProfileModel2
    var body: some View { Text("\(model.unreadCount)").monospacedDigit() }
}
```

不必对每个视图都这样做。对那些**包含频繁变化的属性**的视图这样处理就够了。

还要注意**在哪里读**。在父视图的 `body` 里读出值再传给子视图，父视图就依赖了这个属性：

```swift nocheck
// 父视图的 body 读了 model.unreadCount，于是父视图也依赖它
UnreadBadge(count: model.unreadCount)

// 父视图只传了对象的引用，没有读属性；只有 UnreadBadge 依赖 unreadCount
UnreadBadge(model: model)
```

这和上一章“子视图只接收它需要的数据”似乎矛盾。它们适用于不同的情况：

- **数据是值类型，或者不常变化**：传具体的值。接口更窄，更易复用和预览。
- **数据来自 `@Observable` 对象，而且变化很频繁**：传对象引用，让子视图自己读。把依赖关在子视图里。

### 三、环境值的影响范围

`@Environment(\.someKey)` 读一个环境值，这个值变化时视图会更新。对于**自定义的、频繁变化的**环境值要小心：不要把滚动偏移、动画进度这类每帧都变的东西放进环境值，所有读它的视图每帧都会更新。

用 `.environment(model)` 注入 `@Observable` 对象则没有这个问题：读取对象本身不产生依赖，只有读它的属性才产生依赖。

### 四、闭包与相等性比较

前面说 SwiftUI 会比较子视图的属性来决定是否更新。但**闭包无法比较**。如果一个子视图有闭包属性，SwiftUI 通常只能认为它“可能变了”。

大多数时候这不是问题，因为子视图的 `body` 往往很便宜。当一个带闭包的子视图确实很昂贵、又被频繁地不必要地更新时，可以让它遵循 `Equatable`，自己定义“什么算相等”：

```swift
struct ExpensiveChart: View, Equatable {
    let values: [Double]
    let onSelect: (Int) -> Void

    // 自定义相等性：只比较数据，忽略闭包
    nonisolated static func == (lhs: ExpensiveChart, rhs: ExpensiveChart) -> Bool {
        lhs.values == rhs.values
    }

    var body: some View {
        let _ = print("ExpensiveChart 重新计算")
        HStack(alignment: .bottom, spacing: 2) {
            ForEach(values.indices, id: \.self) { index in
                Rectangle()
                    .fill(.blue)
                    .frame(width: 8, height: values[index])
                    .onTapGesture { onSelect(index) }
            }
        }
    }
}

struct EquatableDemo: View {
    @State private var tick = 0
    @State private var selected = 0
    private let values: [Double] = (0..<30).map { Double(($0 * 37) % 90) + 10 }

    var body: some View {
        VStack(spacing: 16) {
            Text("无关的状态：\(tick)，选中：\(selected)")
            ExpensiveChart(values: values) { selected = $0 }
                .equatable()
            Button("改变无关的状态") { tick += 1 }
        }
    }
}
```

视图遵循 `Equatable` 后，SwiftUI 用你定义的 `==` 来判断是否需要更新。`.equatable()` 修饰符明确要求使用这个比较。这里 `tick` 变化时，`values` 没变，`ExpensiveChart` 就不会重算。

这是一个**需要时才用**的工具。自己写的 `==` 如果漏掉了某个会影响显示的属性，视图就会在该更新时不更新，产生很难发现的 bug。先用拆分视图解决，实在不行再用它。

## 让 body 本身便宜

`body` 可能在一秒钟内被调用很多次。它应该是一个快速的、纯粹的计算。

### 不要在 body 里做重活

```swift
@Observable
class CatalogModel {
    var products: [String] = (1...5000).map { "商品 \($0)" }
    var query = ""

    // 问题版本：每次 body 执行都重新过滤和排序 5000 个元素
    var filteredSlow: [String] {
        products
            .filter { query.isEmpty || $0.localizedStandardContains(query) }
            .sorted()
    }
}
```

计算属性每次被读取都会重新计算。数据量小的时候完全没问题（第 9 章推荐的正是这种写法）。数据量大、计算昂贵，而 `body` 又被频繁调用时，就需要缓存结果：只在输入变化时重新计算。

```swift
@Observable
class CatalogModelCached {
    var products: [String] = (1...5000).map { "商品 \($0)" } {
        didSet { recompute() }
    }

    var query = "" {
        didSet { recompute() }
    }

    private(set) var filtered: [String] = []

    init() { recompute() }

    private func recompute() {
        filtered = products
            .filter { query.isEmpty || $0.localizedStandardContains(query) }
            .sorted()
    }
}
```

`filtered` 变成了一个存储属性，只在 `products` 或 `query` 变化时更新。这是在“派生值用计算属性”这条原则上做的有意识的权衡：用一点点同步的复杂度，换取性能。**只在测量表明确实需要时才这样做。**

真正耗时的计算（几十毫秒以上）应该移到后台（第 12 章的 `@concurrent`），算完再把结果交回主线程。

`body` 里其他应该避免的事：

| 不要在 `body` 里 | 应该 |
| --- | --- |
| 创建 `DateFormatter`、`NumberFormatter` | 用 `Text(value, format:)`；必须用旧的格式化器时做成静态常量 |
| 解码 JSON、读文件、查数据库 | 放进 `.task`，结果存进状态 |
| 处理图片（缩放、滤镜） | 提前在后台处理好 |
| 复杂的字符串拼接、正则匹配 | 在模型里算好 |
| 排序、过滤很大的集合 | 缓存结果 |

### 视图的初始化器也要便宜

回忆第 9 章：视图结构体会被反复创建。`init` 里的工作会被重复执行很多次。视图的 `init` 应该只做属性赋值。

`@State` 的初始值也是 `init` 的一部分。用 Xcode 27 编译时，`@State` 是宏，初始值只在视图第一次出现时计算一次。用 Xcode 26 及更早版本编译时，它每次都会计算，所以 `@State private var model = HeavyModel()` 里的 `HeavyModel()` 应该是廉价的，或者改成可选值并在 `.task` 里创建。

### 保持身份稳定

第 3 章讲的身份问题也是性能问题。身份变了，SwiftUI 要销毁旧视图的全部状态和渲染资源，再从头创建新的，这比更新一个现有的视图昂贵得多。

- `ForEach` 用稳定的 id。不要用数组下标，不要用每次都重新生成的 `UUID()`。
- 不要滥用 `.id()`。它的值一变，整个子树重建。
- 能用修饰符参数表达的，不要用 `if/else`（第 4 章）。
- 避免 `AnyView`（第 3 章）。它抹掉了类型信息，SwiftUI 无法高效地比较。

## 长列表

列表是最容易出性能问题的地方。几条具体的建议。

### 用懒加载的容器

`List`、`LazyVStack`、`LazyVGrid` 只创建可见的行（第 7、17 章）。在 `ScrollView` 里用普通的 `VStack` 放几百个元素，会在一开始就全部创建。

### 让每一行是“一个”视图

```swift
struct RowData: Identifiable {
    let id: Int
    var title: String
    var isSpecial: Bool
}

struct RowCountDemo: View {
    let rows = (0..<1000).map { RowData(id: $0, title: "行 \($0)", isSpecial: $0.isMultiple(of: 7)) }

    var body: some View {
        List {
            // 不够好：每个元素产生的视图数量不确定（有的 1 个，有的 2 个）
            // SwiftUI 必须把所有元素都求值一遍，才能知道一共有多少行
            ForEach(rows) { row in
                Text(row.title)
                if row.isSpecial {
                    Text("特别提示").font(.caption)
                }
            }
        }
    }
}

struct RowCountFixed: View {
    let rows = (0..<1000).map { RowData(id: $0, title: "行 \($0)", isSpecial: $0.isMultiple(of: 7)) }

    var body: some View {
        List {
            // 更好：每个元素恒定地产生一个视图
            ForEach(rows) { row in
                VStack(alignment: .leading) {
                    Text(row.title)
                    if row.isSpecial {
                        Text("特别提示").font(.caption)
                    }
                }
            }
        }
    }
}
```

`List` 需要知道总行数和每一行的 id，才能计算滚动范围。如果 `ForEach` 的每个元素恒定地产生**一个**视图，`List` 不需要创建任何行就能知道行数等于元素数。如果每个元素产生的视图数量取决于数据（上面第一种写法里的 `if`），`List` 就不得不提前为**所有**元素构造视图来数一数。一千个元素就是一千次行内容的构造。

把行内容包进一个容器（`VStack`、`HStack`，或者一个自定义的行视图），保证“一个元素一行”。

同样的道理，不要在 `ForEach` 里直接做过滤：

```swift nocheck
// 不好：每个元素产生 0 或 1 个视图
ForEach(items) { item in
    if item.isVisible { Row(item) }
}

// 好：先过滤数据，再交给 ForEach
ForEach(visibleItems) { item in
    Row(item)
}
```

### id 要便宜且稳定

`List` 会读取所有元素的 id。所以：

- id 应该是一个存储属性，而不是每次都要计算的东西。
- 传给 `ForEach` 的集合不要在 `body` 里即时生成（`items.filter{}.sorted{}.map{}`）。在模型里算好。

### 行视图要轻

- 把行做成独立的 `View` 结构体，只接收它显示所需要的值。
- 行里的图片用合适的尺寸。把一张 4000 × 3000 的照片缩到 60 × 60 显示，每一行都要解码一张大图。提前生成缩略图。
- 行里避免嵌套的滚动视图、复杂的阴影和模糊。

### List 还是 LazyVStack

`List` 底层会复用行的平台视图，滚动几万行内存也不增长。`LazyVStack` 创建过的行会保留。数据量非常大时，`List` 的表现更稳定。

## 动画与图片

**动画**的性能在第 30 章讲过，要点是：变换和透明度最便宜；避免对大面积的模糊、阴影做动画；`Animatable` 的类型每帧都执行你的代码，要保持轻量；用 `visualEffect` 和 `scrollTransition` 代替状态驱动的滚动效果。

**图片**是内存和性能的大户：

- 显示多大就加载多大。资源目录里的图片提供合适的尺寸；网络图片让服务器返回缩略图。
- 网络图片要缓存（第 14 章：27 系列的 `AsyncImage` 支持通过 `URLSession` 配置缓存）。
- 大图的解码放在后台。
- 不可见的图片及时释放。懒加载容器会帮你处理大部分情况。

## 主线程是宝贵的

界面要保持流畅，每一帧的工作必须在大约 8 到 16 毫秒内完成（对应 120 Hz 和 60 Hz 的屏幕）。主线程上任何超过这个时间的同步操作都会导致掉帧，超过几百毫秒就是用户能明显感觉到的卡顿。

在默认主 actor 隔离的项目里，你的代码默认都在主线程上（第 12 章）。这让并发安全变得简单，但也意味着**你要有意识地把耗时的工作移出去**：

```swift
nonisolated enum Thumbnailer {
    @concurrent
    static func makeThumbnails(count: Int) async -> [Int] {
        // 模拟耗时的图像处理：在后台线程执行
        (0..<count).map { $0 * $0 }
    }
}

struct OffMainDemo: View {
    @State private var results: [Int] = []
    @State private var isWorking = false

    var body: some View {
        VStack(spacing: 12) {
            Text(isWorking ? "处理中…" : "完成 \(results.count) 项")
            Button("开始") {
                Task {
                    isWorking = true
                    results = await Thumbnailer.makeThumbnails(count: 100_000)
                    isWorking = false
                }
            }
            .disabled(isWorking)
        }
    }
}
```

Instruments 的 **Hangs** 轨道会标出主线程被阻塞的时段。Xcode 的调试栏里也可以打开 **Thread Performance Checker**，在运行时提示主线程上的卡顿。

## 内存与生命周期

### 任务要能结束

`.task` 启动的任务在视图消失时自动取消（第 12 章）。在事件回调里用 `Task { }` 启动的任务不会。如果里面是一个无限循环（`for await` 一个永不结束的序列），它会一直运行，并且一直持有它捕获的对象：

```swift
@Observable
class LiveFeedModel {
    var messages: [String] = []
    private var listenTask: Task<Void, Never>?

    func startListening() {
        listenTask?.cancel()
        listenTask = Task { [weak self] in
            for await message in Self.messageStream() {
                guard let self else { return }           // 模型已经被释放，退出循环
                self.messages.append(message)
            }
        }
    }

    func stopListening() {
        listenTask?.cancel()
        listenTask = nil
    }

    private static func messageStream() -> AsyncStream<String> {
        AsyncStream { continuation in
            let task = Task {
                var count = 0
                while !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(1))
                    count += 1
                    continuation.yield("消息 \(count)")
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
}
```

要点：

- 长时间运行的任务保存下来，在合适的时候取消。
- 任务的闭包里用 `[weak self]`。否则任务持有模型，模型又持有任务，两者都无法释放。
- 更简单的做法是：让视图用 `.task { await model.listen() }` 来驱动，视图消失时任务自动取消，不需要手动管理。

### 闭包的循环引用

视图是结构体，它的闭包捕获 `self` 不会造成循环引用。问题出在**类**上：模型对象把一个捕获了自己的闭包存成了属性，或者交给了一个被自己持有的对象。在这些地方用 `[weak self]`。

用 Xcode 的 **Memory Graph Debugger**（调试栏上的三个圆圈相连的图标）可以看到内存里有哪些对象、谁持有谁。离开一个页面后，它的模型对象应该从图里消失。如果还在，就是泄漏了。

## 常见的运行时警告

Xcode 运行时会在控制台和问题导航器里报告一些 SwiftUI 的警告（紫色的图标）。它们通常指向真实的问题。

**“Modifying state during view update, this will cause undefined behavior.”**

在 `body` 的计算过程中修改了状态。常见原因：在 `body` 里直接赋值；在计算属性的 getter 里改状态；在 `init` 里改状态。把修改移到事件回调里：`onAppear`、`onChange`、`task`、按钮的动作。

**“Publishing changes from background threads is not allowed.”**

在后台线程上修改了 `ObservableObject` 的 `@Published` 属性。这是旧体系的问题。用 `@Observable` 加默认主 actor 隔离，编译器会在编译期就阻止这种错误。

**“Update NavigationRequestObserver tried to update multiple times per frame.”** 或导航相关的重复更新警告

在一帧里多次修改了导航路径，或者 `navigationDestination` 放在了会被重复求值的位置（比如懒加载容器的行里）。把 `navigationDestination` 移到栈的根视图上。

**“ForEach … count (N) != its initial count (M). ForEach(_:content:) should only be used for constant data.”**

对会变化的范围用了 `ForEach(0..<count)`。改成 `ForEach(0..<count, id: \.self)` 或遍历真正的数据（第 7 章）。

**“the ID … occurs multiple times within the collection, this will give undefined results!”**

`ForEach` 或 `List` 的数据里有重复的 id。保证 id 唯一。

**“AttributeGraph: cycle detected through attribute …”**

视图之间出现了循环依赖：A 的布局依赖 B，B 的布局又依赖 A。通常是因为用几何信息（`GeometryReader`、偏好、`onGeometryChange`）读出尺寸再存进状态，而这个状态又影响了被测量的那个视图的尺寸。打破循环：改用 `Layout` 协议在布局阶段一次算完，或者确保测量的结果不会反过来改变被测量的对象。

**“Bound preference … tried to update multiple times per frame.”**

偏好值在一帧里反复变化。同样多半是测量和状态之间的循环。

## 调试工具箱

### 预览

最快的调试循环。配合上一章的假数据，几乎所有的界面问题都可以在预览里复现。画布左下角的按钮可以切换到**可选中模式**（Selectable），点击画布上的元素直接跳到对应的代码。

### 让布局可见

第 5 章的 `.border()` 仍然是定位布局问题最快的办法。稍微完善一点的版本：

```swift
extension View {
    /// 调试用：画出边界并在角上标注尺寸。
    func debugFrame(_ color: Color = .red) -> some View {
        #if DEBUG
        overlay {
            GeometryReader { proxy in
                Rectangle()
                    .strokeBorder(color, lineWidth: 1)
                    .overlay(alignment: .topLeading) {
                        Text("\(Int(proxy.size.width))×\(Int(proxy.size.height))")
                            .font(.system(size: 9).monospaced())
                            .foregroundStyle(.white)
                            .padding(2)
                            .background(color)
                    }
            }
        }
        #else
        self
        #endif
    }
}
```

### 在 body 里打印

```swift nocheck
var body: some View {
    let _ = print("当前状态：\(state)")
    let _ = Self._printChanges()
    ...
}
```

### 视图层级调试器

应用运行时，点击调试栏上的 **Debug View Hierarchy**（三个叠在一起的矩形）。Xcode 会把界面拆成可以旋转查看的 3D 图层。用来检查：某个视图到底在不在、被谁挡住了、实际的尺寸和位置是多少。

### 环境覆盖

应用运行时，调试栏上的 **Environment Overrides** 按钮可以实时切换深色模式、动态字体大小、各种辅助功能设置，不需要去系统设置里改。

### 断点

在 `body` 里打断点可以看当时的状态值。配合断点的 **Log Message** 动作（勾选 *Automatically continue*），可以在不修改代码的情况下打印日志。

### 放慢动画

模拟器菜单 **Debug › Slow Animations**。代码里可以临时用 `.animation(.linear(duration: 3), ...)` 或 `.speed(0.1)`。

### 排查问题的顺序

遇到“界面不对”时，按这个顺序问：

1. **数据对吗？** 打印状态。很多“界面问题”其实是数据问题。
2. **视图更新了吗？** 用 `_printChanges`。没更新说明依赖没建立：是不是没读到那个属性？是不是模型没用 `@State` 持有而被重建了？
3. **身份对吗？** 状态莫名丢失、动画不对，检查 `if/else`、`.id()`、`ForEach` 的 id。
4. **布局对吗？** 用 `.border` 从里往外一层层看。
5. **修饰符顺序对吗？**

遇到“界面卡”时：

1. **在真机上用 Release 版本确认问题存在。**
2. **用 Instruments 找出是哪种问题**：更新太多、单次太慢、还是主线程被阻塞。
3. **针对性地解决**，然后再测一次确认有效。

## 常见误区

**误区一：“SwiftUI 很慢，要到处优化。”** 默认情况下它很快。没有测量就优化，只会让代码变复杂。

**误区二：“`body` 被调用就等于重新渲染。”** `body` 只是重新生成轻量的描述。只有描述里真正变化的部分才会触发布局和渲染。

**误区三：“父视图更新，所有子视图都会更新。”** 子视图的输入没变，它的 `body` 就不会重算。

**误区四：“在模拟器的 Debug 版本上测性能。”** 没有参考价值。用真机和 Release 配置。

**误区五：“给所有视图加 `Equatable`。”** 它需要维护，写错了会导致视图不更新。先用拆分视图解决。

**误区六：“`List` 里用 `if` 控制某些行显不显示。”** 这让每个元素产生的视图数量不固定，`List` 必须提前求值所有行。先过滤数据。

**误区七：“把 `_printChanges` 留在代码里。”** 它是调试 API，用完删掉。

## 小结

- 更新流程：状态变化 → 标记依赖它的视图 → 重算 `body` → 比较新旧描述 → 布局 → 渲染。子视图的输入不变时，更新在它这里停止。
- `Self._printChanges()` 显示 `body` 重算的原因；Instruments 的 SwiftUI 模板用于真正的性能分析。测量要在真机上用 Release 配置。
- 减少更新：拆分视图，把频繁变化的状态关进小视图；让依赖尽量窄；必要时用 `Equatable`。
- 让 `body` 便宜：不做重活，昂贵的派生值缓存起来，耗时的工作移到后台；视图的 `init` 只做赋值；保持身份稳定。
- 长列表：用懒加载容器；每个元素恒定产生一个视图；先过滤数据再交给 `ForEach`；id 稳定且便宜；行视图要轻。
- 长时间运行的任务要能取消，类里的闭包注意循环引用。
- 运行时警告通常指向真实的问题，逐条认真对待。

## 练习

1. 在你之前写的一个较复杂的页面里，给每个子视图的 `body` 加上 `Self._printChanges()`。操作界面，观察哪些视图在“不该更新的时候”更新了，找出原因并修正。
2. 做一个实验：一个页面顶部有一个每 0.1 秒更新的计时数字，下面是一个 500 行的列表。先把它们写在同一个视图里，用 Instruments 的 SwiftUI 模板录制 10 秒，记下 `body` 更新的次数。然后把计时数字拆成独立的视图，再录一次，比较。
3. 写一个每行显示一张大图的列表（图片可以用程序生成的大尺寸渐变代替）。先让每行直接显示原图，观察滚动的流畅度和内存；再改成预先生成缩略图，比较差别。
4. 故意制造一个 “Modifying state during view update” 警告和一个 “AttributeGraph: cycle detected” 警告，观察它们出现的情形，然后修复。
5. 用 Memory Graph Debugger 检查你的一个应用：进入一个详情页再返回，确认详情页的模型对象已经被释放。如果没有，找出是谁持有着它。

## 官方文档

- [Understanding and improving SwiftUI performance](https://developer.apple.com/documentation/xcode/understanding-and-improving-swiftui-performance)
- [Performance analysis（SwiftUI 专题）](https://developer.apple.com/documentation/swiftui/performance-analysis)
- [Understanding hangs in your app](https://developer.apple.com/documentation/xcode/understanding-hangs-in-your-app)
- [Improving app responsiveness](https://developer.apple.com/documentation/xcode/improving-app-responsiveness)
- [Creating performant scrollable stacks](https://developer.apple.com/documentation/swiftui/creating-performant-scrollable-stacks)
- [`EquatableView`](https://developer.apple.com/documentation/swiftui/equatableview)
- [`equatable()`](https://developer.apple.com/documentation/swiftui/view/equatable())
- [Gathering information about memory use](https://developer.apple.com/documentation/xcode/gathering-information-about-memory-use)
- [Diagnosing and resolving bugs in your running app](https://developer.apple.com/documentation/xcode/diagnosing-and-resolving-bugs-in-your-running-app)
- [Instruments 使用指南](https://developer.apple.com/documentation/xcode/instruments)
- [WWDC25：Optimize SwiftUI performance with Instruments](https://developer.apple.com/videos/play/wwdc2025/306/)
- [WWDC23：Demystify SwiftUI performance](https://developer.apple.com/videos/play/wwdc2023/10160/)
- [WWDC21：Demystify SwiftUI](https://developer.apple.com/videos/play/wwdc2021/10022/)
