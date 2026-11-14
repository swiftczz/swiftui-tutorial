# 09 @State 与 @Binding

## 本章目标

- 理解 `@State` 到底把数据存在了哪里，以及它的生命周期
- 知道 Xcode 27 把 `@State` 从属性包装器改成宏之后有哪些变化
- 掌握 `@Binding`：让子视图读写父视图的状态
- 建立“单一数据源”的思维：每份数据只有一个主人
- 分清什么该是状态，什么该是派生值
- 会用 `onChange` 响应状态变化

第 1 章的公式 `UI = f(State)` 里，前面几章研究的都是 `f`（怎么描述界面）。从这一章开始研究 `State`：数据放在哪、谁能改、怎么流动。

## 普通属性为什么不行

先看一段看起来合理、但编译不过的代码：

```swift nocheck
struct BrokenCounter: View {
    var count = 0

    var body: some View {
        Button("点了 \(count) 次") {
            count += 1      // 错误：Cannot assign to property: 'self' is immutable
        }
    }
}
```

两个原因让它不可能工作：

1. `body` 是一个只读计算属性，在它里面 `self` 是不可变的，结构体的属性改不了。
2. 就算能改，第 1 章讲过视图结构体是“一次性的描述”，每次更新都会重新创建。改了也会随着这个值一起被丢弃。

所以需要一种机制：**让数据活在视图结构体之外，由 SwiftUI 保管，并且在数据变化时通知 SwiftUI 更新界面。** 这就是 `@State`。

## @State：交给 SwiftUI 保管的数据

```swift
struct WorkingCounter: View {
    @State private var count = 0

    var body: some View {
        Button("点了 \(count) 次") {
            count += 1
        }
    }
}
```

加上 `@State` 之后发生了三件事：

1. **存储搬家了。** `count` 的真实存储不在 `WorkingCounter` 结构体里，而在 SwiftUI 内部，和这个视图的**身份**绑在一起（回忆第 3 章）。结构体里只留了一个“取件凭证”。
2. **读取会登记依赖。** `body` 里读了 `count`，SwiftUI 就记下“这个视图的 `body` 依赖 `count`”。
3. **写入会触发更新。** 给 `count` 赋值时，SwiftUI 把依赖它的视图标记为需要更新，然后重新调用它们的 `body`。

```text
 视图结构体（短命，反复重建）             SwiftUI 内部存储（与视图身份同寿命）
┌───────────────────────────┐          ┌──────────────────────┐
│ WorkingCounter            │          │  count: 3            │
│   count ──────────────────┼────────▶ │                      │
└───────────────────────────┘          └──────────────────────┘
```

### 三条使用规则

**规则一：声明为 `private`。** `@State` 是这个视图**私有**的数据，只应该由视图自己读写。声明成 `private` 可以防止外部通过初始化器传值进来，那样做几乎总是错的（原因见后文“初始值只用一次”）。

**规则二：一定要有初始值。** 可以在声明处给，也可以在 `init` 里给。

**规则三：只用于视图自己拥有的简单数据。** 开关是否打开、输入框里的文字、当前选中的标签页、一个表单的草稿。应用的核心业务数据通常放在模型对象里，下一章讲。

### 状态可以是任何值类型

```swift
struct Profile {
    var name = ""
    var age = 18
    var tags: [String] = []
}

struct StateTypesDemo: View {
    @State private var isOn = false
    @State private var profile = Profile()
    @State private var selection: Int? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Toggle("开关", isOn: $isOn)

            Text("\(profile.name.isEmpty ? "未命名" : profile.name)，\(profile.age) 岁，\(profile.tags.count) 个标签")

            Button("改名并长一岁") {
                profile.name = "小明"          // 修改结构体的一个字段
                profile.age += 1
            }
            Button("加一个标签") {
                profile.tags.append("标签\(profile.tags.count + 1)")   // 修改数组
            }
        }
        .padding()
    }
}
```

`@State` 里放结构体时，修改结构体的任意一个字段，都等于修改了整个结构体的值，都会触发更新。这是值类型的语义：改一部分就是得到了一个新值。

## Xcode 27：@State 从属性包装器变成了宏 <Badge type="warning" text="Swift 6.4 / Xcode 27" />

这是本教程里版本差异最重要的一处，请仔细读。

| | Xcode 26 及更早（Swift 6.3 及更早） | Xcode 27 及以后（Swift 6.4） |
| --- | --- | --- |
| `@State` 是什么 | 属性包装器 `State<Value>` | 宏 `State()` |
| 你写的代码 | `@State private var count = 0` | `@State private var count = 0`（**写法不变**） |
| 默认值何时求值 | 视图结构体**每次**初始化时都求值 | 只在视图身份**第一次**建立时求值一次 |

写法完全一样，区别在行为上。这个区别对值类型（`Int`、`String`、结构体）几乎没有影响，求值一个 `0` 没有成本。**它影响的是把类的实例放进 `@State` 的情况**，而这正是下一章的主角：

```swift
@Observable
class Library {
    var books: [String] = []
    init() { print("Library 被创建了") }
}

struct LibraryScreen: View {
    @State private var library = Library()

    var body: some View {
        Text("共 \(library.books.count) 本书")
    }
}
```

回忆一下：视图结构体会被反复创建。父视图每次更新，都会重新执行 `LibraryScreen()`。

- **用 Xcode 26 编译**：每次 `LibraryScreen()` 都会执行一次 `Library()`，控制台里“Library 被创建了”会打印很多次。SwiftUI 只保留第一次创建的那个对象，后面创建的立刻被丢弃。结果是对的，但白白创建了很多对象。如果 `Library.init` 里有昂贵的操作或副作用，这就成了问题。
- **用 Xcode 27 编译**：`Library()` 被宏包进了一个闭包，只在视图第一次出现在界面上时执行一次。控制台只打印一次。

官方文档的原话是：这个变化让属性“在它是一个类的时候，只初始化和存储一次”。

::: tip 这意味着什么
- 用 Xcode 27 编译，`@State private var model = Model()` 是安全且高效的写法，不再需要用 `.task` 延迟创建之类的变通办法。
- 这是**编译器**带来的变化，和部署版本无关：用 Xcode 27 编译、运行在 iOS 17 上，也是新行为。
- 如果你的项目还要用 Xcode 26 编译，并且模型的初始化有副作用，沿用旧办法：把状态声明为可选值，在 `.task` 里创建。
:::

::: details 好奇宏展开成了什么？
在 Xcode 里右键 `@State` 选择 **Expand Macro**。`@State private var count = 0` 大致展开成：一个保存默认值闭包的私有存储 `__count`，一个兼容旧写法的 `_count`，一个提供绑定的 `$count`，以及 `count` 本身的 `get`/`set` 访问器。所以 `_count`、`$count` 这两个旧名字依然可用，绝大多数已有代码无需改动。
:::

## 初始值只用一次

这是 `@State` 最容易踩的坑，在任何版本下都成立。

```swift
struct ScoreLabel: View {
    @State private var score: Int

    init(initialScore: Int) {
        score = initialScore
    }

    var body: some View {
        Button("分数 \(score)") { score += 1 }
    }
}

struct ScoreHost: View {
    @State private var base = 10

    var body: some View {
        VStack(spacing: 12) {
            ScoreLabel(initialScore: base)
            Button("把基数改成 100") { base = 100 }
        }
        .padding()
    }
}
```

::: info 想一想
点“把基数改成 100”之后，`ScoreLabel` 显示的分数会变成 100 吗？
:::

不会，还是 10（或者你点过之后的值）。因为 `@State` 的初始值**只在视图身份第一次建立时使用一次**。之后 `ScoreHost` 每次更新都会重新调用 `ScoreLabel(initialScore: 100)`，但这个视图的身份没变，它的状态已经存在，新传进来的初始值被忽略。

这不是 bug，而是 `@State` 的定义：它是视图**自己拥有**的数据，父视图无权在事后修改。参数名里特意写了 `initial`，就是在提醒调用者这一点。

如果你想要的其实是“父视图的值变了，子视图跟着变”，那这份数据的主人就应该是父视图，子视图要么只读地接收它，要么用下面要讲的 `@Binding`。如果确实想在基数变化时重置子视图，用第 3 章的技巧：`ScoreLabel(initialScore: base).id(base)`。

## @Binding：借用别人的状态

把一个开关单独拆成子视图：

```swift
struct FavoriteButton: View {
    @Binding var isFavorite: Bool

    var body: some View {
        Button {
            isFavorite.toggle()
        } label: {
            Image(systemName: isFavorite ? "heart.fill" : "heart")
                .foregroundStyle(isFavorite ? .red : .secondary)
        }
        .buttonStyle(.plain)
    }
}

struct ArticleRow: View {
    @State private var isFavorite = false

    var body: some View {
        HStack {
            Text(isFavorite ? "已收藏的文章" : "一篇文章")
            Spacer()
            FavoriteButton(isFavorite: $isFavorite)
        }
        .padding()
    }
}
```

`FavoriteButton` 需要**读**这个布尔值（决定画实心还是空心），也需要**写**它（点击时切换）。但这份数据的主人是 `ArticleRow`，因为 `ArticleRow` 的文字也依赖它。

`@Binding` 表达的就是这种关系：**我不拥有这份数据，我只持有一个通往它的读写通道。**

- 在子视图里用 `@Binding var isFavorite: Bool` 声明
- 在父视图里用 `$isFavorite` 把状态的绑定传下去。`$` 前缀取的是“投影值”，对 `@State` 来说就是一个 `Binding`
- 子视图里像普通变量一样读写 `isFavorite`，实际读写的是父视图的那份状态

```text
ArticleRow                         FavoriteButton
┌────────────────────────┐        ┌─────────────────────────┐
│ @State isFavorite ◀────┼────────┼── @Binding isFavorite   │
│   （数据的主人）        │  $     │   （读写通道，无存储）   │
└────────────────────────┘        └─────────────────────────┘
```

系统控件也是这样设计的。`Toggle(isOn:)`、`TextField(text:)`、`Slider(value:)`、`Picker(selection:)` 的参数都是 `Binding`：控件自己不存数据，你告诉它数据在哪，它负责读和写。

### 只读就不需要 Binding

如果子视图只需要**读**，直接传值就行，用普通的 `let` 属性：

```swift
struct FavoriteBadge: View {
    let isFavorite: Bool       // 只读，普通属性即可

    var body: some View {
        if isFavorite {
            Text("收藏").font(.caption).foregroundStyle(.red)
        }
    }
}
```

父视图的状态变了，会重新创建 `FavoriteBadge(isFavorite: 新值)`，子视图自然就更新了。**只有需要写回去的时候才用 `@Binding`。** 能用 `let` 就用 `let`，这让数据流向更清晰。

### 绑定到状态的一部分

`$` 可以继续往下“钻”，得到结构体某个字段、数组某个元素的绑定：

```swift
struct Account {
    var username = ""
    var notificationsOn = true
    var volume = 0.5
}

struct AccountEditor: View {
    @State private var account = Account()

    var body: some View {
        Form {
            TextField("用户名", text: $account.username)
            Toggle("接收通知", isOn: $account.notificationsOn)
            Slider(value: $account.volume)
            Text("当前：\(account.username)，音量 \(account.volume, format: .percent.precision(.fractionLength(0)))")
        }
    }
}
```

`$account` 是 `Binding<Account>`，`$account.username` 是 `Binding<String>`。

对集合，`ForEach` 和 `List` 可以直接遍历绑定，给每个元素一个可写的绑定：

```swift
struct TodoItem: Identifiable {
    let id = UUID()
    var title: String
    var isDone = false
}

struct TodoListBasic: View {
    @State private var items = [
        TodoItem(title: "买牛奶"),
        TodoItem(title: "写周报"),
        TodoItem(title: "跑步 5 公里"),
    ]

    var body: some View {
        List {
            ForEach($items) { $item in
                Toggle(item.title, isOn: $item.isDone)
            }
            Text("已完成 \(items.filter(\.isDone).count) / \(items.count)")
                .foregroundStyle(.secondary)
        }
    }
}
```

注意闭包参数写成 `$item`：这样在闭包里 `item` 是元素的值，`$item` 是元素的绑定。

### 自己构造 Binding

**`.constant`**：一个值固定、写入无效的绑定。主要用在预览里：

```swift
#Preview {
    FavoriteButton(isFavorite: .constant(true))
}
```

**`Binding(get:set:)`**：手动指定读和写的逻辑。当控件需要的类型和你的状态类型不一致时使用：

```swift
struct TemperatureEditor: View {
    @State private var celsius = 25.0

    var body: some View {
        let fahrenheit = Binding<Double>(
            get: { celsius * 9 / 5 + 32 },
            set: { celsius = ($0 - 32) * 5 / 9 }
        )

        Form {
            LabeledContent("摄氏") { Slider(value: $celsius, in: -20...50) }
            LabeledContent("华氏") { Slider(value: fahrenheit, in: -4...122) }
            Text("\(celsius, format: .number.precision(.fractionLength(1))) °C")
        }
    }
}
```

两个滑块操作的是同一份数据 `celsius`，拖动任何一个，另一个都会跟着动。

::: warning 少用自定义 Binding
`Binding(get:set:)` 很灵活，但它绕过了 SwiftUI 的一些优化，而且容易把业务逻辑藏进一个不起眼的闭包里。优先考虑：直接用 `$` 语法；把转换逻辑写成模型的计算属性（带 setter）；或者用 `onChange` 响应变化。
:::

## 单一数据源

把上面的内容提炼成一条原则，它是 SwiftUI 数据流的根基：

::: tip 单一数据源（Single Source of Truth）
**每一份数据，在整个应用里只有一个地方拥有它。** 其他所有用到它的地方，要么只读地接收它的值，要么持有通往它的绑定。永远不要把同一份数据复制成两份 `@State`。
:::

第 1 章说命令式 UI 的问题是“数据和界面上的副本要手动同步”。`@State` 解决了数据和界面之间的同步。但如果你把同一份数据存在两个 `@State` 里，就又亲手造出了需要同步的副本。

### 状态该放在哪：提升到共同祖先

当两个视图都需要同一份数据时，把状态放到它们**最近的共同祖先**里，然后分别传下去。这叫“状态提升”。

```swift
struct VolumeSlider: View {
    @Binding var volume: Double

    var body: some View {
        Slider(value: $volume)
    }
}

struct VolumeIndicator: View {
    let volume: Double

    var body: some View {
        Image(systemName: "speaker.wave.3.fill", variableValue: volume)
            .font(.largeTitle)
    }
}

struct VolumePanel: View {
    @State private var volume = 0.5        // 共同祖先拥有状态

    var body: some View {
        VStack(spacing: 20) {
            VolumeIndicator(volume: volume)   // 只读：传值
            VolumeSlider(volume: $volume)     // 读写：传绑定
        }
        .padding()
    }
}
```

决定状态位置的步骤：

1. 找出所有需要**读**这份数据的视图
2. 找出所有需要**写**这份数据的视图
3. 找到这些视图在视图树上最近的共同祖先，状态放在那里
4. 只读的视图用 `let` 接收值，要写的视图用 `@Binding` 接收绑定

状态放得**尽量低**（只要能覆盖所有使用者）。放得太高会让不相关的视图跟着更新，也让代码难以理解。

## 状态还是派生值

不是所有会变的东西都该用 `@State`。能从其他状态**算出来**的，就不该存：

```swift
struct CartView: View {
    @State private var quantities = [2, 1, 3]
    private let prices = [35.0, 128.0, 9.9]

    // 派生值：用计算属性，不要再建一个 @State
    private var total: Double {
        zip(quantities, prices).map { Double($0) * $1 }.reduce(0, +)
    }

    private var isEmpty: Bool { quantities.allSatisfy { $0 == 0 } }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(quantities.indices, id: \.self) { index in
                Stepper("商品 \(index + 1) × \(quantities[index])", value: $quantities[index], in: 0...9)
            }
            Divider()
            Text(isEmpty ? "购物车是空的" : "合计 \(total, format: .currency(code: "CNY"))")
                .font(.headline)
        }
        .padding()
    }
}
```

如果把 `total` 也做成 `@State`，你就得在每次数量变化时记得更新它，这又回到了手动同步的老路。

判断方法：**问自己“如果我把这个值删掉，能不能从其他数据重新算出来？”** 能，就用计算属性；不能，才是真正的状态。

## onChange：在状态变化时做事

有时状态变化需要触发一个**动作**，比如保存到磁盘、发请求、播放声音。这类副作用不能写在 `body` 的计算里，要用 `onChange`：

```swift
struct SearchBox: View {
    @State private var query = ""
    @State private var log: [String] = []

    var body: some View {
        VStack(alignment: .leading) {
            TextField("搜索", text: $query)
                .textFieldStyle(.roundedBorder)

            ForEach(log, id: \.self) { Text($0).font(.caption) }
        }
        .padding()
        .onChange(of: query) { oldValue, newValue in
            log.append("「\(oldValue)」→「\(newValue)」")
        }
    }
}
```

`onChange(of:)` 的几种形式：

```swift nocheck
.onChange(of: value) { oldValue, newValue in ... }   // 需要新旧值
.onChange(of: value) { ... }                          // 不关心具体值
.onChange(of: value, initial: true) { ... }           // 视图出现时也先执行一次
```

::: warning 不要用 onChange 同步两个状态
如果你发现自己在写“当 A 变了，就把 B 设成……”，停下来想一想：B 是不是其实是 A 的派生值？是的话就该用计算属性。`onChange` 是用来触发**副作用**的，不是用来维护数据一致性的。
:::

## 常见误区

**误区一：“`@State` 可以从外面传进来初始化，之后还会跟着变。”** 初始值只用一次。要跟着父视图变，数据就应该属于父视图。

**误区二：“子视图要显示父视图的数据，所以用 `@Binding`。”** 只读不需要绑定，普通 `let` 属性就行。`@Binding` 只在子视图需要修改数据时使用。

**误区三：“把总价、是否为空这些也存成 `@State`。”** 能算出来的值用计算属性。多一个状态就多一处可能不同步的地方。

**误区四：“在 `body` 里直接改状态。”** `body` 计算过程中修改状态会导致未定义行为（Xcode 会警告 *Modifying state during view update*）。修改状态的地方是事件回调：按钮动作、`onChange`、`onAppear`、`task`。

**误区五：“`@State` 不加 `private` 也没关系。”** 不加 `private`，它就会出现在成员初始化器里，别人就可以从外部传值，然后掉进“初始值只用一次”的坑。

## 小结

- `@State` 把数据交给 SwiftUI 保管，生命周期与视图身份一致；读取登记依赖，写入触发更新。
- Xcode 27 起 `@State` 是宏，写法不变，默认值改为只在首次建立时求值一次，对存放类实例的情况尤其重要。
- `@State` 的初始值只在身份建立时用一次，之后父视图传入的新初始值被忽略。
- `@Binding` 是通往别人状态的读写通道，用 `$` 获取；只读用 `let`。
- 单一数据源：每份数据一个主人，状态提升到最近的共同祖先。
- 能算出来的是派生值，用计算属性；副作用放在 `onChange` 等事件回调里。

## 练习

1. 做一个 RGB 调色器：三个 `Slider` 控制红、绿、蓝，上方一个色块实时显示颜色，下方显示十六进制色值。想清楚哪些是状态、哪些是派生值。
2. 把调色器的每个滑块行（标签 + 滑块 + 数值）拆成独立的 `ChannelSlider` 视图。它应该用 `@State` 还是 `@Binding`？为什么？
3. 做一个评分组件 `RatingView`：五颗星，点第几颗就是几分。先用 `@State` 实现，再改造成接收 `@Binding<Int>` 的可复用组件，并在父视图里同时显示“你打了 N 分”。
4. 解释下面代码的问题，并给出两种修复方案：

```swift nocheck
struct Greeting: View {
    @State var name: String
    var body: some View { Text("你好，\(name)") }
}
// 父视图里：Greeting(name: userName)，userName 变了但界面不更新
```

## 官方文档

- [`State`（属性包装器，Xcode 26 及更早）](https://developer.apple.com/documentation/swiftui/state)
- [`State()`（宏，Xcode 27 起）](https://developer.apple.com/documentation/swiftui/state())
- [`Binding`](https://developer.apple.com/documentation/swiftui/binding)
- [Managing user interface state](https://developer.apple.com/documentation/swiftui/managing-user-interface-state)
- [Model data（数据流总览）](https://developer.apple.com/documentation/swiftui/model-data)
- [`onChange(of:initial:_:)`](https://developer.apple.com/documentation/swiftui/view/onchange(of:initial:_:))
- [SwiftUI 更新记录（June 2026：@State 改用宏）](https://developer.apple.com/documentation/updates/swiftui)
- [WWDC20：Data Essentials in SwiftUI](https://developer.apple.com/videos/play/wwdc2020/10040/)
