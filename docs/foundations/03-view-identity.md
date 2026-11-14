# 03 View、ViewBuilder 与视图身份

## 本章目标

- 理解 `some View` 为什么必须存在
- 知道 `body` 花括号里的“不像 Swift 的语法”是怎么回事（结果构建器）
- 掌握 SwiftUI 最核心的概念：**视图身份**（identity）
- 能解释“为什么切换了 `if` 分支，状态就丢了”
- 知道什么时候用 `.id()`、`Group`、`AnyView`

这一章是整个教程里最“底层”的一章。内容稍微抽象，但后面所有关于状态丢失、动画不生效、列表错乱的问题，根子都在这里。

## 视图的类型里藏着什么

先做一个实验。把下面的代码放进一个 macOS 命令行项目或者 Playground 里运行：

```swift
struct TypeDemo: View {
    var flag = true

    var body: some View {
        VStack {
            Text("a")
            if flag {
                Text("b")
            } else {
                Image(systemName: "xmark")
            }
            Text("d")
                .padding()
        }
    }
}

@MainActor func printBodyType() {
    print(type(of: TypeDemo().body))
}
```

用 Xcode 27 编译，打印结果是（为了好读加了换行）：

```text
VStack<
  TupleContent<Pack{
    Text,
    _ConditionalContent<Text, Image>,
    ModifiedContent<Text, _PaddingLayout>
  }>
>
```

这段输出信息量很大，值得逐条看：

- **整个视图树的结构被编码在类型里。** `VStack` 里有三个孩子，第二个孩子是“`Text` 或 `Image` 二选一”，第三个是“加了内边距的 `Text`”。这些信息在**编译期**就确定了。
- `if/else` 没有消失，它变成了一个 `_ConditionalContent<Text, Image>` 类型。
- `.padding()` 没有修改 `Text`，而是把它包进了一个 `ModifiedContent`。

::: warning Swift 6.4 / Xcode 27 的变化
用 Xcode 26 及更早版本编译，多个子视图会被打包成 `TupleView<(Text, _ConditionalContent<Text, Image>, ...)>`。Xcode 27 的 SDK 改用基于参数包（parameter pack）的 `TupleContent<Pack{...}>`。对你写代码没有影响，但如果你在调试输出或旧文章里看到 `TupleView`，要知道它们是同一个东西的新旧两种形态。
:::

### 所以需要 some View

现在你明白 `some View` 的必要性了。如果没有它，`body` 的类型你得这样写：

```swift nocheck
var body: VStack<TupleContent<Pack{Text, _ConditionalContent<Text, Image>, ModifiedContent<Text, _PaddingLayout>}>> { ... }
```

而且每加一个修饰符就要改一次。`some View` 的意思是：“返回类型是**某一个确定的**、遵循 `View` 的类型，具体是什么请编译器替我写。”

注意“某一个确定的”这几个字。`some View` 不是“任意 `View`”，它要求所有返回路径的类型一致。所以下面的代码无法编译：

```swift nocheck
func badge(isNew: Bool) -> some View {
    if isNew {
        return Text("新")            // 返回 Text
    } else {
        return Image(systemName: "checkmark")  // 返回 Image —— 类型不一致，编译错误
    }
}
```

可是上面 `body` 里的 `if/else` 明明可以一个分支是 `Text`、一个是 `Image`，为什么？因为 `body` 里的花括号不是普通的 Swift 代码块。

## 结果构建器：花括号里的小语言

`View` 协议里 `body` 的声明带有一个属性：

```swift nocheck
protocol View {
    associatedtype Body: View
    @ViewBuilder @MainActor var body: Self.Body { get }
}
```

`@ViewBuilder` 是一个**结果构建器**（result builder）。它是 Swift 的语言特性：编译器会把标了它的闭包或函数体里的每一条语句收集起来，按规则改写成对构建器静态方法的调用。

你写的：

```swift nocheck
VStack {
    Text("a")
    if flag { Text("b") } else { Image(systemName: "xmark") }
    Text("d").padding()
}
```

编译器改写成（示意）：

```swift nocheck
VStack {
    let v0 = Text("a")
    let v1 = flag
        ? ViewBuilder.buildEither(first: Text("b"))
        : ViewBuilder.buildEither(second: Image(systemName: "xmark"))
    let v2 = Text("d").padding()
    return ViewBuilder.buildBlock(v0, v1, v2)
}
```

`buildEither` 把两个不同类型的分支包装成同一个 `_ConditionalContent<Text, Image>` 类型，这就是 `if/else` 两个分支可以不同类型的原因。

`@ViewBuilder` 支持的语法是有限的：

| 你写的 | 变成的类型 | 说明 |
| --- | --- | --- |
| 多个视图并列 | `TupleContent<Pack{A, B, C}>` | 数量不限 |
| `if cond { A }` | `A?`（`Optional<A>`） | 条件不成立时什么都没有 |
| `if cond { A } else { B }` | `_ConditionalContent<A, B>` | |
| `switch` | 嵌套的 `_ConditionalContent` | |
| `if let x = opt { A(x) }` | `A?` | |
| `if #available(...) { A }` | 做了类型擦除的包装 | 用于系统版本判断 |
| `for ... in` | 不支持 | 用 `ForEach` 代替 |
| `let x = ...` 局部声明 | 允许 | 不产生视图 |

::: warning Xcode 27：ViewBuilder 的新名字 ContentBuilder
Xcode 27 的 SDK 里新增了 `ContentBuilder`，它是 `ViewBuilder` 的类型别名，并且成为了**统一的构建器**：以前工具栏用 `@ToolbarContentBuilder`、菜单命令用 `@CommandsBuilder`、Tab 用 `@TabContentBuilder`，现在这些地方都可以写 `@ContentBuilder`。

`@ViewBuilder` 依然可用，两者完全等价。本教程在视图上下文里继续写 `@ViewBuilder`（它在所有 Xcode 版本下都能用），在第 21、32 章讲工具栏和命令时会用到 `@ContentBuilder`。
:::

### 在自己的代码里用 @ViewBuilder

你可以把 `@ViewBuilder` 用在自己的函数、计算属性和闭包参数上。

**用在计算属性上**，拆分一个过长的 `body`：

```swift
struct OrderRow: View {
    let isPaid: Bool
    let amount: Double

    var body: some View {
        HStack {
            Text(amount, format: .currency(code: "CNY"))
            Spacer()
            statusBadge
        }
    }

    @ViewBuilder
    private var statusBadge: some View {
        if isPaid {
            Label("已支付", systemImage: "checkmark.circle.fill")
                .foregroundStyle(.green)
        } else {
            Text("待支付")
                .foregroundStyle(.orange)
        }
    }
}
```

没有 `@ViewBuilder`，`statusBadge` 里的 `if/else` 两个分支类型不同，无法编译。

**用在初始化参数上**，写自己的容器视图：

```swift
struct Card<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline)
            content
        }
        .padding()
        .background(.background.secondary, in: .rect(cornerRadius: 12))
    }
}

struct CardDemo: View {
    var body: some View {
        Card(title: "今日") {
            Text("步数 8,204")
            Text("距离 5.6 公里")
        }
    }
}
```

这样 `Card` 的用法就和 `VStack` 一模一样了。系统的所有容器视图都是这样写出来的。

## 视图身份：SwiftUI 怎么知道“这还是那个视图”

现在来到本章的核心。先看一个让很多初学者困惑的现象：

```swift
struct Counter: View {
    let title: String
    @State private var count = 0

    var body: some View {
        Button("\(title)：\(count)") { count += 1 }
            .buttonStyle(.bordered)
    }
}

struct IdentityPuzzle: View {
    @State private var isHighlighted = false

    var body: some View {
        VStack(spacing: 20) {
            if isHighlighted {
                Counter(title: "计数")
                    .tint(.red)
            } else {
                Counter(title: "计数")
            }

            Toggle("高亮", isOn: $isHighlighted)
        }
        .padding()
    }
}
```

运行它：点几下计数按钮让数字变成 5，然后打开“高亮”开关。

::: info 想一想
数字还是 5 吗？
:::

数字变回 0 了。再看另一种写法：

```swift
struct IdentityFixed: View {
    @State private var isHighlighted = false

    var body: some View {
        VStack(spacing: 20) {
            Counter(title: "计数")
                .tint(isHighlighted ? .red : .accentColor)

            Toggle("高亮", isOn: $isHighlighted)
        }
        .padding()
    }
}
```

这次数字保持住了。两种写法画出来的界面一样，行为却不同。要解释它，需要知道 SwiftUI 如何回答一个问题：**这一次 `body` 算出来的某个视图，和上一次 `body` 算出来的某个视图，是不是“同一个”？**

上一章说过，视图结构体每次都是新创建的，所以不能靠“是不是同一个对象”来判断。SwiftUI 靠的是**身份**（identity）。身份有两种来源。

### 结构身份：位置即身份

默认情况下，一个视图的身份由它**在视图树中的位置**决定，这叫结构身份（structural identity）。而位置信息，如前所见，被编码在类型里。

回头看第一种写法，它的类型是：

```text
_ConditionalContent<
    ModifiedContent<Counter, ...>,   ← true 分支里的 Counter
    Counter                          ← false 分支里的 Counter
>
```

对 SwiftUI 来说，“`true` 分支里的那个 `Counter`”和“`false` 分支里的那个 `Counter`”是**两个不同位置上的两个不同视图**。开关切换时，SwiftUI 的理解是：false 分支的视图**消失**了，true 分支的视图**出现**了。消失的视图，它的 `@State` 存储被销毁；新出现的视图，`@State` 从初始值开始。

第二种写法里，`Counter` 始终在同一个位置上，身份没变，只是它外面的修饰符参数从蓝色变成了红色。SwiftUI 的理解是：同一个视图，属性变了。状态当然保留。

这引出一条重要的经验法则：

::: tip 法则：能用参数表达的差异，就不要用分支表达
`if` 分支意味着“这是两个不同的视图”。如果你想表达的其实是“同一个视图，外观不同”，就把条件写进修饰符的参数里：

```swift nocheck
// 不好：两个身份，切换时状态丢失、动画是淡入淡出
if isActive { Circle().fill(.green) } else { Circle().fill(.gray) }

// 好：一个身份，切换时状态保留、颜色平滑过渡
Circle().fill(isActive ? .green : .gray)
```

这条法则同时影响状态和动画，第 26 章还会再见到它。
:::

### 显式身份：你来指定

有时位置不足以区分视图。最典型的是列表：数据会增删、排序，同一条数据的位置会变。这时需要你告诉 SwiftUI 每个视图对应哪条数据，这叫显式身份（explicit identity）。

```swift
struct Fruit: Identifiable {
    let id = UUID()
    var name: String
}

struct FruitList: View {
    @State private var fruits = [
        Fruit(name: "苹果"), Fruit(name: "香蕉"), Fruit(name: "樱桃"),
    ]

    var body: some View {
        VStack(alignment: .leading) {
            ForEach(fruits) { fruit in
                Counter(title: fruit.name)
            }
            Button("打乱顺序") { fruits.shuffle() }
        }
        .padding()
    }
}
```

`ForEach` 要求数据元素遵循 `Identifiable`（或者用 `id:` 参数指定一个键路径）。它用每个元素的 `id` 作为对应视图的身份。运行这个例子：给“苹果”点到 3，然后打乱顺序，“苹果”那一行无论跑到哪里，数字都还是 3。因为身份跟着 `fruit.id` 走，不跟着位置走。

::: danger 不要用数组下标或会变的值当 id
```swift nocheck
ForEach(fruits.indices, id: \.self) { i in ... }   // 危险
ForEach(fruits, id: \.name) { fruit in ... }       // name 可能重复或被修改时危险
```
用下标当 id，删除第一个元素后，原来的第二个元素会“继承”第一个的身份，于是状态错位、动画错乱。**id 必须稳定且唯一**：同一条数据的 id 永远不变，不同数据的 id 永远不同。
:::

### 用 .id() 手动控制身份

`.id(_:)` 修饰符可以给任何视图指定显式身份。它最常见的用途是**故意重置一个视图**：只要 id 变了，SwiftUI 就认为旧视图消失、新视图出现，所有状态归零。

```swift
struct ResetDemo: View {
    @State private var resetToken = 0

    var body: some View {
        VStack(spacing: 20) {
            Counter(title: "可重置的计数")
                .id(resetToken)

            Button("重置") { resetToken += 1 }
        }
        .padding()
    }
}
```

这是一个很实用的技巧，比如切换了当前用户之后，想让整个详情页的内部状态全部清空。

## 身份、生命周期与状态

把上面的内容整理成三句话，这是本章要你带走的模型：

1. **视图的值**（结构体）是短命的，每次 `body` 求值都重新创建。
2. **视图的身份**是长命的，从它第一次出现在视图树里开始，到它从视图树里消失为止。这段时间叫视图的**生命周期**（lifetime）。
3. **状态绑定在身份上**。`@State` 的存储在身份诞生时创建，在身份消亡时销毁。

```text
时间 ──────────────────────────────────────────────▶

身份:  ├────────────── Counter（同一个身份）──────────────┤
值:      [值1]  [值2]  [值3]     [值4]    [值5]   ……
状态:  count=0 ─────▶ 1 ─────▶ 2 ──────────────────▶ 销毁
```

`onAppear` 和 `onDisappear` 这两个修饰符大致对应身份的出现和消失：

```swift
struct LifetimeDemo: View {
    @State private var showDetail = false

    var body: some View {
        VStack {
            Toggle("显示详情", isOn: $showDetail)
            if showDetail {
                Text("详情内容")
                    .onAppear { print("详情出现") }
                    .onDisappear { print("详情消失") }
            }
        }
        .padding()
    }
}
```

## 几个与身份有关的工具视图

### Group：打包但不改变结构

`Group` 把多个视图打包成一个，本身不产生任何布局效果，也不引入新的身份层级。它的用处是给一组视图统一加修饰符：

```swift
struct GroupDemo: View {
    var body: some View {
        VStack {
            Group {
                Text("第一行")
                Text("第二行")
                Text("第三行")
            }
            .font(.headline)
            .foregroundStyle(.secondary)

            Text("正文")
        }
    }
}
```

### EmptyView：什么都没有

`EmptyView()` 不显示任何东西、不占任何空间。它主要出现在泛型代码里表示“这个位置没有内容”，日常很少直接写。

### AnyView：类型擦除，谨慎使用

`AnyView` 把任意视图包装成同一个类型 `AnyView`，抹掉了类型信息：

```swift
func makeBadge(isNew: Bool) -> AnyView {
    if isNew {
        AnyView(Text("新"))
    } else {
        AnyView(Image(systemName: "checkmark"))
    }
}
```

它能解决“类型不一致”的编译错误，但代价是 SwiftUI 失去了类型里的结构信息，无法在编译期知道里面是什么，只能在运行时比较。当里面的实际类型变了，SwiftUI 只能销毁旧的、重建新的。

**绝大多数时候你不需要 `AnyView`。** 上面的函数加一个 `@ViewBuilder` 就解决了：

```swift
@ViewBuilder
func makeBadgeBetter(isNew: Bool) -> some View {
    if isNew {
        Text("新")
    } else {
        Image(systemName: "checkmark")
    }
}
```

`AnyView` 的合理用途是真正需要把不同类型的视图存进同一个数组或字典的场合，这种场合很少。

## 常见误区

**误区一：“视图结构体被重新创建，所以状态会丢。”** 状态不在结构体里，在 SwiftUI 按身份管理的存储里。结构体重建不影响状态，身份变化才影响。

**误区二：“`if` 只是控制显示不显示。”** `if` 改变的是视图树的结构。分支切换意味着视图的出现和消失，伴随着状态的创建和销毁，以及转场动画。如果只想让视图不可见但保留身份和状态，用 `.opacity(0)`；想不可见且不占位，用参数化的方式控制它的高度，或者接受状态重置。

**误区三：“用 `AnyView` 更灵活。”** 它牺牲了 SwiftUI 的类型信息。优先用 `@ViewBuilder`、泛型和 `some View`。

**误区四：“`ForEach` 的 id 随便给一个就行。”** id 就是身份。不稳定的 id 会导致状态错位、动画闪烁、性能下降。

## 小结

- 视图树的结构被编码在 `body` 的类型里，`some View` 让你不必手写这个类型。
- `@ViewBuilder`（Xcode 27 起也叫 `@ContentBuilder`）是结果构建器，把花括号里的语句改写成构建器调用，支持 `if`、`switch`、`if let`，不支持 `for`。
- 视图身份有两种：**结构身份**（由位置决定）和**显式身份**（由 `ForEach` 的 id 或 `.id()` 指定）。
- 状态的生命周期等于身份的生命周期。身份不变，状态保留；身份变化，状态重置。
- 能用修饰符参数表达的差异，不要用 `if` 分支表达。

## 练习

1. 在 `IdentityPuzzle` 里，把 `if/else` 换成 `switch` 加一个三种取值的枚举（普通、高亮、禁用），观察状态是否保留。然后改写成“一个身份 + 参数化修饰符”的形式。
2. 写一个泛型容器 `Section2<Header: View, Content: View>`，接收两个 `@ViewBuilder` 闭包，把 header 放在上面、content 放在下面。
3. 在 `FruitList` 里把 `ForEach(fruits)` 改成 `ForEach(fruits.indices, id: \.self)`，重复“给苹果计数然后打乱”的实验。用本章的模型解释你看到的现象。
4. 解释：为什么 `.id(resetToken)` 能重置 `Counter` 的状态？如果把 `.id(resetToken)` 加在 `VStack` 上，“重置”按钮自己会受什么影响？

## 官方文档

- [`View` 协议](https://developer.apple.com/documentation/swiftui/view)
- [`ViewBuilder`](https://developer.apple.com/documentation/swiftui/viewbuilder)
- [`ContentBuilder`](https://developer.apple.com/documentation/swiftui/contentbuilder)
- [`ForEach`](https://developer.apple.com/documentation/swiftui/foreach)
- [`id(_:)`](https://developer.apple.com/documentation/swiftui/view/id(_:))
- [`Group`](https://developer.apple.com/documentation/swiftui/group)
- [`AnyView`](https://developer.apple.com/documentation/swiftui/anyview)
- [`Identifiable` 协议](https://developer.apple.com/documentation/swift/identifiable)
- [The Swift Programming Language：Opaque and Boxed Protocol Types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes/)
- [The Swift Programming Language：Result Builders](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/advancedoperators/#Result-Builders)
- [WWDC21：Demystify SwiftUI（身份、生命周期、依赖）](https://developer.apple.com/videos/play/wwdc2021/10022/)
