# 08 自适应布局与自定义 Layout

## 本章目标

- 用 `ViewThatFits` 让界面在空间不足时自动换一种排法
- 知道什么时候该用 `GeometryReader`，以及更好的替代品
- 掌握安全区域的完整工具集
- 用 `AnyLayout` 在不同布局之间平滑切换
- 实现 `Layout` 协议，写出自己的布局容器
- 了解尺寸类别（size class）与 27 系列新增的 `ArrangementView`

前三章讲的是“给定空间，内容怎么排”。这一章讲“空间会变，内容怎么跟着变”。屏幕会旋转，iPad 会分屏，Mac 窗口会被拖成任意大小，用户会把字号调到最大。**自适应不是锦上添花，而是 SwiftUI 布局的默认要求。**

## 自适应的三个层次

处理“空间会变”有三种策略，应该按顺序考虑：

1. **让布局自己伸缩。** 用 `Spacer`、`frame(maxWidth:)`、`.adaptive` 网格这些弹性工具，让同一个布局在不同尺寸下都成立。前三章的内容大多属于这一层。
2. **提供备选方案。** 空间实在不够时换一种排法，例如从横排变成竖排。用 `ViewThatFits`、`AnyLayout`。
3. **读取尺寸再计算。** 前两种都不够时才直接读取几何信息。用 `containerRelativeFrame`、`onGeometryChange`、`GeometryReader`。

越靠前的策略越“声明式”，也越不容易出错。

## ViewThatFits：放得下哪个用哪个

`ViewThatFits` <Badge type="tip" text="iOS 16+ / macOS 13+" /> 接收多个候选视图，按顺序测量，选择**第一个能在当前空间里完整放下的**。

```swift
struct AdaptiveButtons: View {
    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 12) {                 // 首选：横排
                buttons
            }
            VStack(spacing: 12) {                 // 备选：竖排
                buttons
            }
        }
        .padding()
    }

    @ViewBuilder
    private var buttons: some View {
        Button("保存并继续编辑") {}
            .buttonStyle(.borderedProminent)
        Button("放弃所有更改") {}
            .buttonStyle(.bordered)
    }
}
```

在宽屏上两个按钮横排，在窄屏或大字号下自动变成竖排。在预览里把动态字体调到最大试试。

它的工作原理是：向每个候选提议 `nil`（问它的理想尺寸），看理想尺寸是否不超过可用空间。`in:` 参数指定只检查哪个方向，默认两个方向都检查。

另一个常见用法是给文字提供由长到短的备选：

```swift
struct AdaptiveLabel: View {
    var body: some View {
        ViewThatFits {
            Text("2026 年 11 月 14 日 星期六")
            Text("2026/11/14 周六")
            Text("11/14")
        }
        .lineLimit(1)
    }
}
```

::: warning 注意
`ViewThatFits` 是“选一个”，被淘汰的候选不会显示。切换候选时视图身份会变化（它们是不同的视图），内部状态不保留。如果希望横竖切换时保留状态并带动画，用下面的 `AnyLayout`。
:::

## AnyLayout：同一组视图换一种排法

`HStack` 和 `VStack` 是两个不同的视图类型，用 `if` 在它们之间切换，里面的子视图身份会全部改变。SwiftUI 为每种栈都提供了对应的**布局类型**：`HStackLayout`、`VStackLayout`、`ZStackLayout`、`GridLayout`。它们可以被包装成 `AnyLayout`，在保持子视图身份的前提下切换排法：

```swift
struct LayoutSwitcher: View {
    @State private var isVertical = false

    var body: some View {
        let layout = isVertical
            ? AnyLayout(VStackLayout(spacing: 12))
            : AnyLayout(HStackLayout(spacing: 12))

        VStack(spacing: 30) {
            layout {
                ForEach(0..<3, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 12)
                        .fill([Color.red, .green, .blue][index].gradient)
                        .frame(width: 70, height: 70)
                }
            }
            .animation(.snappy, value: isVertical)

            Toggle("竖排", isOn: $isVertical)
                .fixedSize()
        }
        .padding()
    }
}
```

三个方块会平滑地从横排滑动到竖排。因为它们的身份没变，SwiftUI 知道“这还是那三个方块，只是位置变了”，所以能为位置变化做动画。这是第 3 章“视图身份”在布局上的应用。

## 尺寸类别：粗粒度的宽窄判断

系统把可用空间粗略地分成“紧凑”（compact）和“常规”（regular）两档，分别针对水平和垂直方向，通过环境值提供：

```swift
struct SizeClassDemo: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        let layout = horizontalSizeClass == .compact
            ? AnyLayout(VStackLayout(spacing: 16))
            : AnyLayout(HStackLayout(spacing: 16))

        layout {
            Color.orange.frame(minHeight: 100)
            Color.purple.frame(minHeight: 100)
        }
        .padding()
    }
}
```

| 场景 | 水平 | 垂直 |
| --- | --- | --- |
| iPhone 竖屏 | compact | regular |
| iPhone 横屏（大部分机型） | compact | compact |
| iPad 全屏 | regular | regular |
| iPad 分屏的窄侧 / 台前调度的窄窗口 | compact | regular |
| Mac | regular | regular |

尺寸类别适合做**结构性**的决定，比如“用侧边栏还是标签栏”。它只有两档，不适合做精细的布局计算。`NavigationSplitView`、`TabView` 等系统容器内部就是根据它来自适应的，所以很多时候你不需要亲自读取。

## 相对于容器的尺寸：containerRelativeFrame

“让这个视图的宽度是屏幕的三分之一”是很常见的需求。`containerRelativeFrame` <Badge type="tip" text="iOS 17+ / macOS 14+" /> 就是为此设计的：

```swift
struct ContainerRelativeDemo: View {
    var body: some View {
        ScrollView(.horizontal) {
            LazyHStack(spacing: 12) {
                ForEach(0..<10, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(hue: Double(index) / 10, saturation: 0.6, brightness: 0.9))
                        .containerRelativeFrame(.horizontal, count: 3, span: 1, spacing: 12)
                        .frame(height: 120)
                }
            }
        }
        .contentMargins(.horizontal, 16)
    }
}
```

`count: 3, span: 1, spacing: 12` 的意思是：把容器宽度分成 3 份（扣除间距），这个视图占 1 份。于是屏幕上正好显示 3 张卡片。

这里的“容器”指的是最近的 `ScrollView`、`NavigationStack` 的一栏、窗口等，而不是直接的父视图。它还有两种形式：

```swift
struct ContainerRelativeForms: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Color.blue
                    .containerRelativeFrame(.vertical) { length, _ in
                        length * 0.4                       // 高度是容器的 40%
                    }

                Color.green
                    .frame(height: 60)
                    .containerRelativeFrame(.horizontal)   // 宽度等于容器宽度
            }
        }
    }
}
```

## 读取几何信息

### onGeometryChange：推荐的方式

`onGeometryChange` <Badge type="tip" text="向后兼容到 iOS 16 / macOS 13" /> 在不干扰布局的前提下，把视图的尺寸或位置读出来，存进状态：

```swift
struct GeometryChangeDemo: View {
    @State private var width: CGFloat = 0

    var body: some View {
        VStack(spacing: 12) {
            Text("这段文字的容器宽度是 \(width, format: .number.precision(.fractionLength(0))) 点")
                .frame(maxWidth: .infinity)
                .padding()
                .background(.yellow.opacity(0.3))
                .onGeometryChange(for: CGFloat.self) { proxy in
                    proxy.size.width
                } action: { newValue in
                    width = newValue
                }
        }
        .padding()
    }
}
```

它有两个闭包：第一个从 `GeometryProxy` 里提取你关心的值，第二个在这个值变化时被调用。只有提取出来的值真的变了才会触发，所以只取你需要的东西（例如只取宽度，不要取整个 `frame`），可以避免不必要的更新。

### GeometryReader：老办法，有副作用

`GeometryReader` 是一个容器视图，把自己被提议的尺寸通过 `GeometryProxy` 交给内容：

```swift
struct GeometryReaderDemo: View {
    var body: some View {
        GeometryReader { proxy in
            HStack(spacing: 0) {
                Color.red.frame(width: proxy.size.width * 0.3)
                Color.blue
            }
        }
        .frame(height: 60)
    }
}
```

它有两个需要警惕的特点：

1. **它来者不拒。** `GeometryReader` 会占满父视图提议的全部空间，常常意外撑大布局。
2. **它不像栈那样对齐子视图。** 内容被放在左上角，而不是居中。

所以经验法则是：**能用 `containerRelativeFrame`、`onGeometryChange`、`Layout` 解决的，就不用 `GeometryReader`。** 如果一定要用，把它放在 `.background` 或 `.overlay` 里，这样它的尺寸跟随主视图，不影响布局：

```swift
struct GeometryInBackground: View {
    var body: some View {
        Text("测量我")
            .padding()
            .background {
                GeometryReader { proxy in
                    Color.yellow
                        .overlay(alignment: .bottomTrailing) {
                            Text("\(Int(proxy.size.width))×\(Int(proxy.size.height))")
                                .font(.caption2)
                        }
                }
            }
    }
}
```

### 坐标空间

`GeometryProxy` 的 `frame(in:)` 可以查询视图在不同坐标系里的位置：

```swift
struct CoordinateSpaceDemo: View {
    @State private var position: CGPoint = .zero

    var body: some View {
        VStack {
            Text("x: \(Int(position.x)), y: \(Int(position.y))")

            Color.orange
                .frame(width: 80, height: 80)
                .onGeometryChange(for: CGPoint.self) { proxy in
                    proxy.frame(in: .named("board")).origin
                } action: { newValue in
                    position = newValue
                }
                .padding(40)
        }
        .coordinateSpace(.named("board"))
        .border(.gray)
    }
}
```

| 坐标空间 | 含义 |
| --- | --- |
| `.local` | 视图自己的坐标系，原点在自己左上角 |
| `.global` | 整个窗口或屏幕的坐标系 |
| `.named("名字")` | 某个祖先视图用 `.coordinateSpace(.named("名字"))` 定义的坐标系 |
| `.scrollView` | 最近的滚动视图的坐标系 |

命名坐标空间在做拖拽、自定义滚动效果时很有用。

## 安全区域的完整工具集

第 6 章介绍了 `ignoresSafeArea`。这里把相关工具补全。

### safeAreaInset：放一个不遮挡内容的悬浮条

想在屏幕底部固定一个按钮栏，同时希望滚动内容不被它挡住。用 `overlay` 会遮挡，用 `VStack` 会让滚动内容不能延伸到栏的下方。`safeAreaInset` 两者兼顾：它把视图放在边缘，并**相应缩小内容的安全区域**。

```swift
struct SafeAreaInsetDemo: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(0..<40, id: \.self) { index in
                    Text("第 \(index) 行")
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(.quaternary, in: .rect(cornerRadius: 8))
                }
            }
            .padding(.horizontal)
        }
        .safeAreaInset(edge: .bottom) {
            Button("加入购物车") {}
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
                .padding()
                .background(.bar)
        }
    }
}
```

滚动到最底部时，最后一行完整地显示在按钮栏上方；滚动过程中，内容又能从半透明的按钮栏下面透出来。

iOS 26 / macOS 26 新增了 `safeAreaBar`，用法与 `safeAreaInset` 相同，但会与滚动视图的边缘模糊效果配合，是 Liquid Glass 设计下放置自定义栏的首选，第 23 章会讲。

### safeAreaPadding：扩大安全区域

`safeAreaPadding` <Badge type="tip" text="iOS 17+ / macOS 14+" /> 和 `padding` 的区别在于：`padding` 把内容整体缩进去，`safeAreaPadding` 则是扩大安全区域，内容仍然可以通过 `ignoresSafeArea` 或滚动延伸到这个区域里。对横向滚动的卡片特别有用：

```swift
struct SafeAreaPaddingDemo: View {
    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 12) {
                ForEach(0..<10, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 12)
                        .fill(.teal)
                        .frame(width: 140, height: 90)
                }
            }
        }
        .safeAreaPadding(.horizontal, 20)     // 首尾留 20，滚动时卡片仍可划到屏幕边缘
    }
}
```

### 键盘也是安全区域

iOS 上键盘弹出时，SwiftUI 把键盘占据的区域算作安全区域的一部分，所以内容会自动上移避让。如果某个视图不想避让键盘：

```swift
struct KeyboardSafeArea: View {
    @State private var text = ""

    var body: some View {
        VStack {
            Spacer()
            TextField("输入点什么", text: $text)
                .textFieldStyle(.roundedBorder)
                .padding()
        }
        .background {
            Image(systemName: "mountain.2.fill")
                .resizable()
                .scaledToFit()
                .foregroundStyle(.quaternary)
                .ignoresSafeArea(.keyboard)     // 背景图不随键盘移动
        }
    }
}
```

`ignoresSafeArea` 的第一个参数是区域类型：`.container`（刘海、指示条等）、`.keyboard`、`.all`。

## Layout 协议：写自己的布局

当内置容器都不合适时，可以实现 `Layout` 协议 <Badge type="tip" text="iOS 16+ / macOS 13+" />。这是把第 5 章的“提议—回应—摆放”直接交到你手里。

协议有两个必须实现的方法，正好对应三步协商中的第 ② 步和第 ③ 步：

```swift nocheck
protocol Layout {
    // ② 父视图提议了 proposal，我该回应多大？
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout Cache) -> CGSize

    // ③ 父视图给了我 bounds 这块区域，我把每个孩子放在哪？
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout Cache)
}
```

在这两个方法里，你对孩子做的事情也是同一套协商：调用 `subview.sizeThatFits(proposal)` 向孩子提议并得到回应，调用 `subview.place(at:proposal:)` 摆放孩子。

### 实战：流式布局

SwiftUI 没有内置“一行放不下就自动换行”的流式布局（常用于标签云）。我们来写一个：

```swift
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        let rows = arrange(subviews: subviews, maxWidth: maxWidth)
        let width = rows.map(\.width).max() ?? 0
        let height = rows.map(\.height).reduce(0, +) + spacing * CGFloat(max(rows.count - 1, 0))
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let rows = arrange(subviews: subviews, maxWidth: bounds.width)
        var y = bounds.minY
        for row in rows {
            var x = bounds.minX
            for index in row.indices {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(
                    at: CGPoint(x: x, y: y + (row.height - size.height) / 2),
                    proposal: ProposedViewSize(size)
                )
                x += size.width + spacing
            }
            y += row.height + spacing
        }
    }

    private struct Row {
        var indices: [Int] = []
        var width: CGFloat = 0
        var height: CGFloat = 0
    }

    private func arrange(subviews: Subviews, maxWidth: CGFloat) -> [Row] {
        var rows: [Row] = []
        var current = Row()
        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            let needed = current.indices.isEmpty ? size.width : current.width + spacing + size.width
            if needed > maxWidth, !current.indices.isEmpty {
                rows.append(current)
                current = Row()
            }
            current.width = current.indices.isEmpty ? size.width : current.width + spacing + size.width
            current.height = max(current.height, size.height)
            current.indices.append(index)
        }
        if !current.indices.isEmpty { rows.append(current) }
        return rows
    }
}
```

逐段解释：

- `arrange` 是核心算法：依次问每个孩子的理想尺寸（`.unspecified` 就是提议 `nil`），当前行放不下就换行。
- `sizeThatFits` 回答“我要多大”：宽度是最宽的一行，高度是所有行高之和加行间距。
- `placeSubviews` 真正摆放：逐行逐个调用 `place(at:proposal:)`，同一行内垂直居中。
- `cache: inout ()` 表示不使用缓存。布局计算昂贵时可以实现 `makeCache` 把中间结果存起来，避免两个方法各算一遍。

用法和内置容器一模一样：

```swift
struct TagCloud: View {
    let tags = ["SwiftUI", "布局", "动画", "状态管理", "Observation", "Liquid Glass",
                "macOS", "iOS", "多端统一", "并发", "SwiftData", "无障碍"]

    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(tags, id: \.self) { tag in
                Text(tag)
                    .font(.callout)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.blue.opacity(0.12), in: .capsule)
            }
        }
        .padding()
    }
}
```

把预览的宽度调窄调宽，标签会自动重新分行。

::: tip 自定义 Layout 的额外好处
`Layout` 可以包装进 `AnyLayout`，所以你的自定义布局也能和 `HStackLayout` 等平滑切换并带动画。另外，`Layout` 是在布局阶段一次完成计算的，不像 `GeometryReader` + 状态那样需要“先渲染一次、读到尺寸、再渲染一次”。
:::

### 向布局传递参数：LayoutValueKey

有时孩子需要告诉布局一些信息，比如“我在环形布局里占多大角度”。用 `LayoutValueKey`：

```swift
struct RadialLayout: Layout {
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        proposal.replacingUnspecifiedDimensions(by: CGSize(width: 200, height: 200))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let radius = min(bounds.width, bounds.height) / 2 * 0.75
        let center = CGPoint(x: bounds.midX, y: bounds.midY)
        for (index, subview) in subviews.enumerated() {
            let angle = Angle.degrees(Double(index) / Double(subviews.count) * 360 - 90).radians
            let scale = subview[RadiusScale.self]
            let point = CGPoint(
                x: center.x + cos(angle) * radius * scale,
                y: center.y + sin(angle) * radius * scale
            )
            subview.place(at: point, anchor: .center, proposal: .unspecified)
        }
    }
}

nonisolated struct RadiusScale: LayoutValueKey {
    static let defaultValue: CGFloat = 1
}

struct RadialDemo: View {
    var body: some View {
        RadialLayout {
            ForEach(0..<8, id: \.self) { index in
                Image(systemName: "\(index + 1).circle.fill")
                    .font(.title)
                    .layoutValue(key: RadiusScale.self, value: index.isMultiple(of: 2) ? 1 : 0.6)
            }
        }
        .frame(width: 240, height: 240)
    }
}
```

::: warning 为什么 RadiusScale 前面有 nonisolated
`Layout` 的方法不在主 actor 上运行（布局计算可能发生在别的线程）。而在“Default Actor Isolation = MainActor”的项目里，你定义的类型默认都隔离在主 actor 上，于是 `RadiusScale` 对 `LayoutValueKey` 的遵循也变成了“只能在主 actor 上使用”，布局方法里就用不了它，编译器会报 *main actor-isolated conformance … cannot be used in nonisolated context*。

在类型前面加 `nonisolated`，声明“这个类型不属于任何 actor”，问题就解决了。这是 Swift 6.2 之后写 SwiftUI 时会遇到的典型并发报错，第 12 章会系统讲解。
:::

## ArrangementView：主次内容的自适应排布 <Badge type="tip" text="iOS 27.1+ / macOS 27.1+" />

27 系列在 2026 年 9 月新增了 `ArrangementView`，用来排布“主要内容”和“次要内容”两块区域。它会根据环境自动决定是并排、上下还是叠放，尤其是为可折叠设备（中间有铰链）和大小变化很大的窗口准备的。

```swift
@available(iOS 27.1, macOS 27.1, *)
struct ArrangementDemo: View {
    var body: some View {
        ArrangementView {
            Color.blue.opacity(0.3)
                .overlay { Text("主要内容：视频画面") }
        } secondary: {
            List(0..<20, id: \.self) { index in
                Text("评论 \(index)")
            }
            .splitArrangementLayoutRatio(0.35)       // 次要内容占 35%
        }
        .arrangementViewStyle(.split)
    }
}
```

| 样式 | 行为 |
| --- | --- |
| `.automatic` | 由系统根据环境选择 |
| `.split` | 主次内容沿某个轴并排。可用 `.split.axes(.horizontal)` 限制方向 |
| `.overlay` | 主要内容叠在次要内容上方，空间够时可过渡到并排 |

子视图可以通过环境值 `splitArrangementAxis` 得知自己当前是横向还是纵向并排。你也可以实现 `ArrangementViewStyle` 协议定义自己的排布方式。

这是一个很新的 API，用到它时请查看章末的官方文档了解完整细节。它体现的思路和本章一致：**你声明内容之间的关系（谁主谁次），具体怎么排交给系统根据环境决定。**

## 常见误区

**误区一：“自适应就是判断设备型号。”** 永远不要判断设备型号。同一台 iPad 在全屏、分屏、台前调度下可用空间完全不同。应该根据**可用空间**（尺寸类别、`ViewThatFits`、弹性布局）来适配。

**误区二：“需要尺寸就用 `GeometryReader`。”** 它会占满空间并改变对齐。优先考虑 `containerRelativeFrame`、`onGeometryChange`、`Layout`。

**误区三：“`ViewThatFits` 切换时可以有动画。”** 它是在不同视图之间选择，切换等于替换。要平滑过渡用 `AnyLayout`。

**误区四：“底部悬浮栏用 `ZStack` 或 `overlay` 叠上去。”** 这样滚动内容的最后几行会被永久遮挡。用 `safeAreaInset` 或 `safeAreaBar`。

## 小结

- 自适应分三层：弹性布局 → 备选方案 → 读取尺寸。优先用靠前的。
- `ViewThatFits` 选择第一个放得下的候选；`AnyLayout` 在保持视图身份的前提下切换布局。
- 尺寸类别用于结构性决定，`containerRelativeFrame` 用于相对容器的尺寸。
- 读取几何信息首选 `onGeometryChange`；`GeometryReader` 放在 `background`/`overlay` 里用。
- `safeAreaInset` 放置不遮挡内容的边栏，`safeAreaPadding` 扩大安全区域。
- `Layout` 协议让你亲手实现“提议—回应—摆放”，写出任意布局。

## 练习

1. 做一个个人资料头部：宽屏时头像在左、文字在右，窄屏时头像在上、文字在下。分别用 `ViewThatFits` 和 `AnyLayout` + 尺寸类别实现，比较两者的差异。
2. 给 `FlowLayout` 增加一个 `alignment: HorizontalAlignment` 参数，支持每行居左、居中、居右。
3. 写一个 `EqualWidthHStack: Layout`：把所有孩子排成一行，每个孩子的宽度都等于其中最宽的那个。（提示：先遍历一遍求最大理想宽度。）
4. 做一个底部固定输入栏的聊天界面：消息列表可滚动，输入栏用 `safeAreaInset` 固定在底部，键盘弹出时输入栏跟随上移。

## 官方文档

- [`ViewThatFits`](https://developer.apple.com/documentation/swiftui/viewthatfits)
- [`AnyLayout`](https://developer.apple.com/documentation/swiftui/anylayout)
- [`Layout` 协议](https://developer.apple.com/documentation/swiftui/layout)
- [Composing custom layouts with SwiftUI（官方示例项目）](https://developer.apple.com/documentation/swiftui/composing_custom_layouts_with_swiftui)
- [`LayoutValueKey`](https://developer.apple.com/documentation/swiftui/layoutvaluekey)
- [`containerRelativeFrame(_:alignment:)`](https://developer.apple.com/documentation/swiftui/view/containerrelativeframe(_:alignment:))
- [`onGeometryChange(for:of:action:)`](https://developer.apple.com/documentation/swiftui/view/ongeometrychange(for:of:action:))
- [`GeometryReader`](https://developer.apple.com/documentation/swiftui/geometryreader)
- [`CoordinateSpaceProtocol`](https://developer.apple.com/documentation/swiftui/coordinatespaceprotocol)
- [`safeAreaInset(edge:alignment:spacing:content:)`](https://developer.apple.com/documentation/swiftui/view/safeareainset(edge:alignment:spacing:content:))
- [`safeAreaPadding(_:_:)`](https://developer.apple.com/documentation/swiftui/view/safeareapadding(_:_:))
- [`UserInterfaceSizeClass`](https://developer.apple.com/documentation/swiftui/userinterfacesizeclass)
- [`ArrangementView`](https://developer.apple.com/documentation/swiftui/arrangementview)
- [WWDC22：Compose custom layouts with SwiftUI](https://developer.apple.com/videos/play/wwdc2022/10056/)
