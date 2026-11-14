# 28 转场与共享元素

## 本章目标

- 理解转场：视图出现和消失时的动画
- 使用和组合内置转场，定义非对称转场
- 用 `Transition` 协议写自定义转场
- 用 `contentTransition` 让文字和符号的内容变化有动画
- 用 `matchedGeometryEffect` 实现“共享元素”：一个元素从一处飞到另一处
- 用 `navigationTransition` 实现导航和 sheet 的缩放转场
- 知道转场不生效的常见原因

## 动画与转场的分工

第 26 章说过：动画是**同一个视图**的属性从旧值到新值的插值。那么视图**出现**和**消失**的时候怎么办？出现之前它不存在，没有“旧值”；消失之后它也不存在，没有“新值”。

这就是**转场**（transition）要解决的问题。转场为视图定义一个“不在场”的假想状态：

```text
出现：  [假想的起始状态] ──动画──▶ [正常状态]
消失：  [正常状态] ──动画──▶ [假想的结束状态]
```

例如 `.opacity` 转场的假想状态是“完全透明”。于是出现就是从透明到不透明，消失就是从不透明到透明。`.scale` 的假想状态是“缩小到 0”。

所以两者的分工是：

| | 处理什么 | 触发条件 |
| --- | --- | --- |
| 动画 | 身份不变的视图，属性值变化 | 修饰符的参数变了 |
| 转场 | 视图的插入和移除 | `if` 条件变了、`ForEach` 的数据增删了、`.id()` 变了 |

转场本身不是动画，它只定义了“假想状态是什么样”。**转场需要动画来驱动**：没有动画，视图就瞬间出现或消失。

## 第一个转场

```swift
struct TransitionBasics: View {
    @State private var isShown = false

    var body: some View {
        VStack(spacing: 20) {
            Button("切换") {
                withAnimation(.snappy) {
                    isShown.toggle()
                }
            }

            if isShown {
                Text("你好，我出现了")
                    .padding()
                    .background(.blue, in: .rect(cornerRadius: 12))
                    .foregroundStyle(.white)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .frame(height: 160)
    }
}
```

三个要素：

1. 视图的出现和消失由状态控制（`if isShown`）
2. `.transition(_:)` 指定用什么转场
3. 状态变化带有动画（`withAnimation`）

不写 `.transition` 时，默认转场是 `.opacity`（淡入淡出）。

## 内置转场

```swift
struct BuiltInTransitions: View {
    @State private var isShown = true

    var body: some View {
        VStack(spacing: 16) {
            Button("切换全部") {
                withAnimation(.smooth(duration: 0.6)) { isShown.toggle() }
            }

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 110))], spacing: 12) {
                cell("opacity") { $0.transition(.opacity) }
                cell("scale") { $0.transition(.scale) }
                cell("scale 0.5") { $0.transition(.scale(0.5).combined(with: .opacity)) }
                cell("slide") { $0.transition(.slide) }
                cell("move 顶部") { $0.transition(.move(edge: .top)) }
                cell("push 左侧") { $0.transition(.push(from: .leading)) }
                cell("offset") { $0.transition(.offset(x: 40, y: 20).combined(with: .opacity)) }
                cell("blurReplace") { $0.transition(.blurReplace) }
            }
        }
        .padding()
    }

    private func cell(_ title: String, transition: (AnyView) -> some View) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10).stroke(.gray.opacity(0.3))
            if isShown {
                transition(AnyView(
                    Text(title)
                        .font(.caption)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(.teal.opacity(0.3), in: .rect(cornerRadius: 10))
                ))
            }
        }
        .frame(height: 60)
        .clipped()
    }
}
```

| 转场 | 假想状态 |
| --- | --- |
| `.opacity` | 完全透明 |
| `.scale`、`.scale(_:anchor:)` | 缩小到 0（或指定比例） |
| `.move(edge:)` | 移到指定边缘之外 |
| `.slide` | 从行首滑入，向行尾滑出 |
| `.push(from:)` | 从一边推入，同时向另一边推出，带淡入淡出 |
| `.offset(x:y:)` | 偏移指定距离 |
| `.blurReplace` | 模糊并缩放，适合内容替换 |
| `.symbolEffect` | 符号的出现/消失效果（第 30 章） |
| `.identity` | 没有任何效果 |

### 组合转场

`.combined(with:)` 把多个转场叠加：

```swift nocheck
.transition(.move(edge: .bottom).combined(with: .opacity))     // 一边滑入一边淡入
.transition(.scale(0.8).combined(with: .opacity))              // 一边放大一边淡入
```

位移或缩放配上淡入淡出，是最常用也最自然的组合。纯粹的 `.move` 或 `.scale` 会显得生硬。

### 非对称转场

出现和消失用不同的转场：

```swift
struct AsymmetricTransition: View {
    @State private var isShown = false

    var body: some View {
        VStack(spacing: 20) {
            Button("切换") {
                withAnimation(.smooth) { isShown.toggle() }
            }

            if isShown {
                Label("消息已发送", systemImage: "checkmark.circle.fill")
                    .padding()
                    .background(.green.opacity(0.2), in: .capsule)
                    .transition(.asymmetric(
                        insertion: .move(edge: .leading).combined(with: .opacity),
                        removal: .scale(scale: 0.5).combined(with: .opacity)
                    ))
            }
        }
        .frame(height: 140)
    }
}
```

从左边滑入，原地缩小消失。

### 给转场单独指定动画

转场默认使用触发它的那次状态变化的动画。也可以给转场本身附加动画：

```swift nocheck
.transition(.opacity.animation(.easeIn(duration: 0.2)))
```

## 转场不生效？先看这三点

转场是 SwiftUI 里最容易“写了没反应”的功能。原因几乎总是下面三个之一。

### 一、没有动画

```swift nocheck
Button("显示") { isShown = true }          // 没有 withAnimation：瞬间出现
```

转场只定义假想状态，需要动画来驱动。用 `withAnimation`，或者在**容器**上加 `.animation(_:value:)`：

```swift
struct TransitionWithImplicit: View {
    @State private var isShown = false

    var body: some View {
        VStack {
            Toggle("显示", isOn: $isShown).fixedSize()

            if isShown {
                Text("内容")
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.bouncy, value: isShown)       // 加在容器上，不是加在会消失的视图上
        .frame(height: 120)
    }
}
```

### 二、.animation 加错了地方

`.animation(_:value:)` 必须加在**插入和移除发生的那个容器上**，或者更外层。加在被插入的视图自己身上不行：视图出现之前它不存在，没法让修饰符生效；视图消失时它已经被移除了。

### 三、移除的不是你以为的那个视图

转场作用于**被插入或移除的那个视图**。如果 `if` 包着的是一个容器，转场要加在容器上：

```swift nocheck
if isShown {
    VStack {
        Text("A").transition(.slide)     // 无效：被插入/移除的是 VStack，不是 Text
        Text("B")
    }
    .transition(.slide)                  // 有效
}
```

### 另外：ZStack 里的移除顺序

在 `ZStack` 里，被移除的视图有时会瞬间消失，或者转场过程中被别的视图盖住。这是因为视图被移除后，它在 `ZStack` 里的层级顺序变得不确定。明确指定 `.zIndex()` 可以解决：

```swift
struct ZStackTransition: View {
    @State private var isShown = false

    var body: some View {
        ZStack {
            Color.gray.opacity(0.2)

            if isShown {
                Color.orange
                    .overlay { Text("覆盖层").font(.title) }
                    .transition(.move(edge: .bottom))
                    .zIndex(1)                       // 保证转场期间始终在最上面
            }
        }
        .frame(height: 200)
        .clipShape(.rect(cornerRadius: 16))
        .onTapGesture {
            withAnimation(.smooth) { isShown.toggle() }
        }
    }
}
```

## 在两个视图之间切换

`if/else` 切换时，旧视图执行移除转场，新视图执行插入转场，两者同时进行：

```swift
struct SwitchingViews: View {
    @State private var step = 0
    let titles = ["欢迎", "选择兴趣", "开启通知", "完成"]

    var body: some View {
        VStack(spacing: 30) {
            ZStack {
                Text(titles[step])
                    .font(.largeTitle.bold())
                    .id(step)                                    // id 变了 = 旧视图移除、新视图插入
                    .transition(.push(from: .trailing))
            }
            .frame(height: 80)
            .frame(maxWidth: .infinity)
            .clipped()

            HStack {
                Button("上一步") {
                    withAnimation(.smooth) { step = max(step - 1, 0) }
                }
                Button("下一步") {
                    withAnimation(.smooth) { step = min(step + 1, titles.count - 1) }
                }
            }
        }
        .padding()
    }
}
```

这里用了第 3 章的 `.id()` 技巧：`step` 变化时，`Text` 的身份变了，SwiftUI 认为旧的被移除、新的被插入，于是触发转场。`.push(from: .trailing)` 让新内容从右边推入，旧内容被推向左边。

想让“上一步”时方向相反，可以根据方向动态选择转场。

## 自定义转场

实现 `Transition` 协议。它有一个 `body` 方法，接收内容和当前的**阶段**，返回修饰后的视图：

```swift
struct RotateInTransition: Transition {
    func body(content: Content, phase: TransitionPhase) -> some View {
        content
            .rotationEffect(.degrees(phase == .willAppear ? -90 : phase == .didDisappear ? 90 : 0))
            .scaleEffect(phase.isIdentity ? 1 : 0.3)
            .opacity(phase.isIdentity ? 1 : 0)
            .blur(radius: phase.isIdentity ? 0 : 8)
    }
}

extension Transition where Self == RotateInTransition {
    static var rotateIn: RotateInTransition { RotateInTransition() }
}

struct CustomTransitionDemo: View {
    @State private var isShown = false

    var body: some View {
        VStack(spacing: 30) {
            Button("切换") {
                withAnimation(.bouncy(duration: 0.6)) { isShown.toggle() }
            }

            if isShown {
                Image(systemName: "star.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(.yellow)
                    .transition(.rotateIn)
            }
        }
        .frame(height: 220)
    }
}
```

`TransitionPhase` 有三个值：

| 阶段 | 含义 |
| --- | --- |
| `.willAppear` | 插入前的假想状态 |
| `.identity` | 正常显示的状态 |
| `.didDisappear` | 移除后的假想状态 |

`phase.isIdentity` 判断是否处于正常状态；`phase.value` 给出 −1、0、1 三个数值，方便做对称的计算。

写法和 `ViewModifier` 很像：你描述每个阶段视图是什么样，SwiftUI 在阶段之间插值。

::: details 旧写法：AnyTransition.modifier
`Transition` 协议是 iOS 17 引入的。更早的代码用两个 `ViewModifier` 分别描述“在场”和“不在场”的状态：

```swift
struct BlurModifier: ViewModifier {
    let isActive: Bool
    func body(content: Content) -> some View {
        content.blur(radius: isActive ? 12 : 0).opacity(isActive ? 0 : 1)
    }
}

extension AnyTransition {
    static var blurFade: AnyTransition {
        .modifier(active: BlurModifier(isActive: true), identity: BlurModifier(isActive: false))
    }
}
```

两种写法都能用。新代码用 `Transition` 协议。
:::

## 内容转场：contentTransition

`Text` 的文字变了、`Image` 的符号变了，视图本身没有被插入或移除（身份没变），所以不触发 `.transition`。但内容确实变了，而内容又不能插值。`contentTransition` 专门处理这种情况。

```swift
struct ContentTransitionDemo: View {
    @State private var count = 128
    @State private var isPlaying = false
    @State private var isBold = false

    var body: some View {
        VStack(spacing: 30) {
            Text("\(count)")
                .font(.system(size: 60, weight: .bold, design: .rounded))
                .monospacedDigit()
                .contentTransition(.numericText(value: Double(count)))

            HStack {
                Button("−10") { withAnimation(.snappy) { count -= 10 } }
                Button("+1") { withAnimation(.snappy) { count += 1 } }
                Button("+10") { withAnimation(.snappy) { count += 10 } }
            }
            .buttonStyle(.bordered)

            Button {
                withAnimation(.snappy) { isPlaying.toggle() }
            } label: {
                Label(isPlaying ? "暂停" : "播放", systemImage: isPlaying ? "pause.fill" : "play.fill")
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(.borderedProminent)

            Text("字重会平滑变化")
                .font(.title2)
                .fontWeight(isBold ? .black : .light)
                .contentTransition(.interpolate)
                .onTapGesture { withAnimation(.smooth(duration: 0.6)) { isBold.toggle() } }
        }
        .padding()
    }
}
```

| 内容转场 | 效果 | 用于 |
| --- | --- | --- |
| `.numericText()` | 数字像里程表一样滚动 | 计数、金额、计时 |
| `.numericText(value:)` | 同上，并根据数值变大还是变小决定滚动方向 | 同上，推荐 |
| `.numericText(countsDown:)` | 明确指定方向 | 倒计时 |
| `.interpolate` | 在两个内容之间做形状插值 | 字重、字号变化；相似符号之间 |
| `.opacity` | 交叉淡入淡出 | 通用 |
| `.symbolEffect(.replace)` | 符号替换的专门动画 | SF Symbols 切换 |
| `.identity` | 没有动画 | 关闭默认行为 |

和转场一样，它需要动画来驱动（上例都包在 `withAnimation` 里）。

`.numericText` 是提升界面质感最划算的一行代码。任何会变化的数字都值得加上它。

## matchedGeometryEffect：共享元素

有一类很有表现力的动画：一个元素从界面的一个位置“飞”到另一个位置，同时改变大小。比如点击列表里的一张缩略图，它放大成详情页的大图。

问题在于，缩略图和大图通常是**两个不同的视图**，在视图树的不同位置。按前面的规则，它们之间只能做转场。`matchedGeometryEffect` 的作用是告诉 SwiftUI：**这两个视图在概念上是同一个东西，请让它们的位置和尺寸连起来。**

### 基本用法

```swift
struct MatchedGeometryBasics: View {
    @Namespace private var namespace
    @State private var isExpanded = false

    var body: some View {
        VStack {
            if isExpanded {
                RoundedRectangle(cornerRadius: 30)
                    .fill(.blue.gradient)
                    .matchedGeometryEffect(id: "card", in: namespace)
                    .frame(width: 300, height: 380)
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .fill(.blue.gradient)
                    .matchedGeometryEffect(id: "card", in: namespace)
                    .frame(width: 80, height: 80)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                    .padding()
            }
        }
        .frame(height: 460)
        .contentShape(.rect)
        .onTapGesture {
            withAnimation(.spring(duration: 0.5, bounce: 0.25)) {
                isExpanded.toggle()
            }
        }
    }
}
```

两个 `RoundedRectangle` 在 `if/else` 的两个分支里，是两个不同的视图。但它们都标了 `.matchedGeometryEffect(id: "card", in: namespace)`。切换时，SwiftUI 让新视图**从旧视图的位置和尺寸出发**，动画到自己的位置和尺寸，看起来就像同一个方块飞过去并长大了。

三个要素：

1. `@Namespace` 声明一个命名空间
2. 两个视图用**相同的 id** 和**相同的命名空间**
3. 状态变化带动画

::: warning 修饰符的位置
`.matchedGeometryEffect` 要加在 `.frame` **之前**。它匹配的是“被它修饰的那个视图”的几何信息。如果加在 `.frame` 之后，它匹配的就是外面那个固定大小的盒子，里面的内容不会跟着缩放。
:::

### 选中指示器

`matchedGeometryEffect` 最实用的场景是“跟随选中项移动的背景”：

```swift
struct SegmentedIndicator: View {
    @Namespace private var namespace
    @State private var selection = "日"
    let options = ["日", "周", "月", "年"]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(options, id: \.self) { option in
                Text(option)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(selection == option ? .white : .primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background {
                        if selection == option {
                            Capsule()
                                .fill(.blue)
                                .matchedGeometryEffect(id: "indicator", in: namespace)
                        }
                    }
                    .contentShape(.rect)
                    .onTapGesture {
                        withAnimation(.snappy) { selection = option }
                    }
            }
        }
        .padding(4)
        .background(.gray.opacity(0.15), in: .capsule)
        .padding()
    }
}
```

蓝色胶囊只存在于选中项的背景里。选择变化时，旧的胶囊被移除，新的胶囊被插入到另一个位置，`matchedGeometryEffect` 把它们连起来，看上去就是一个胶囊滑了过去。

对比第 11 章用锚点偏好实现的下划线：效果相似，这里的代码短得多。

### 展开的卡片

一个更完整的例子：网格里的卡片点击后展开成全屏详情。

```swift
struct HeroCard: Identifiable {
    let id: Int
    let color: Color
    var title: String { "卡片 \(id + 1)" }
}

struct HeroGridDemo: View {
    @Namespace private var namespace
    @State private var selected: HeroCard?

    let cards = [Color.red, .orange, .green, .blue, .purple, .pink].enumerated().map {
        HeroCard(id: $0.offset, color: $0.element)
    }

    var body: some View {
        ZStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 12) {
                    ForEach(cards) { card in
                        if selected?.id != card.id {
                            RoundedRectangle(cornerRadius: 16)
                                .fill(card.color.gradient)
                                .matchedGeometryEffect(id: card.id, in: namespace)
                                .frame(height: 100)
                                .onTapGesture {
                                    withAnimation(.spring(duration: 0.45, bounce: 0.2)) {
                                        selected = card
                                    }
                                }
                        } else {
                            Color.clear.frame(height: 100)           // 占位，保持网格不动
                        }
                    }
                }
                .padding()
            }

            if let card = selected {
                VStack(spacing: 0) {
                    RoundedRectangle(cornerRadius: 28)
                        .fill(card.color.gradient)
                        .matchedGeometryEffect(id: card.id, in: namespace)
                        .frame(height: 300)

                    Text(card.title)
                        .font(.largeTitle.bold())
                        .padding()
                        .transition(.opacity.combined(with: .move(edge: .bottom)))

                    Spacer()
                }
                .padding()
                .background(.background)
                .zIndex(1)
                .onTapGesture {
                    withAnimation(.spring(duration: 0.45, bounce: 0.2)) {
                        selected = nil
                    }
                }
            }
        }
        .frame(height: 500)
    }
}
```

### 需要知道的细节

- **同一时刻，同一个 id 应该只有一个“源”视图在场。** 上面的例子用 `if selected?.id != card.id` 保证了卡片要么在网格里，要么在详情里。两个同 id 的视图同时在场会产生警告和奇怪的行为。如果确实需要两个都在场（一个作为位置参照），给不显示的那个设 `isSource: false`。
- **它只匹配几何信息**：位置和尺寸。颜色、圆角、内容不会自动过渡。上例里圆角从 16 跳到 28，要想平滑需要自己处理（比如用同一个圆角值，或者用转场辅助）。
- `properties:` 参数可以选择只匹配位置（`.position`）或只匹配尺寸（`.size`）。
- 它在同一个视图层级内工作。跨越 sheet、导航栈这类系统呈现时，用下面的 `navigationTransition`。

## 导航与 sheet 的缩放转场

`NavigationStack` 推入页面、`sheet` 弹出，默认是滑入的转场。系统提供了一种“从触发它的元素放大展开”的转场，就是照片 App 里点击缩略图的效果：

```swift ios
struct ZoomTransitionDemo: View {
    @Namespace private var namespace
    let colors: [Color] = [.red, .orange, .yellow, .green, .teal, .blue, .indigo, .purple]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 10) {
                    ForEach(colors.indices, id: \.self) { index in
                        NavigationLink(value: index) {
                            RoundedRectangle(cornerRadius: 14)
                                .fill(colors[index].gradient)
                                .frame(height: 100)
                                .matchedTransitionSource(id: index, in: namespace)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding()
            }
            .navigationTitle("色卡")
            .navigationDestination(for: Int.self) { index in
                colors[index]
                    .ignoresSafeArea()
                    .navigationTransition(.zoom(sourceID: index, in: namespace))
            }
        }
    }
}
```

两处配合：

- 在**源**视图（缩略图）上：`.matchedTransitionSource(id:in:)`
- 在**目标**页面上：`.navigationTransition(.zoom(sourceID:in:))`

目标页面会从源视图的位置放大展开；返回时缩回去。在 iOS 上还支持用手势交互式地缩小返回。

它对 `sheet` 和 `fullScreenCover` 同样有效，把 `.navigationTransition` 加在 sheet 的内容上即可。

::: warning 仅 iOS 与 iPadOS
`.zoom` 和下面的 `.crossFade` 在 macOS 上不可用（编译器会报 *unavailable in macOS*）。多平台代码里要用 `#if os(iOS)` 包住，macOS 上保留系统默认的转场。Mac 的窗口和面板有自己的呈现惯例，不适合这种全屏放大的效果。
:::

27 系列新增了 `.crossFade` 转场 <Badge type="tip" text="iOS 27+" />，让 sheet 以淡入的方式覆盖在内容上，不需要源视图：

```swift ios
@available(iOS 27, *)
struct CrossFadeSheet: View {
    @State private var isPresented = false

    var body: some View {
        Button("显示") { isPresented = true }
            .sheet(isPresented: $isPresented) {
                Text("以交叉淡入的方式出现")
                    .padding(60)
                    .navigationTransition(.crossFade)
            }
    }
}
```

### 三种“共享元素”工具的选择

| 工具 | 适用范围 |
| --- | --- |
| `matchedGeometryEffect` | 同一个视图层级内的两个视图之间。自由度最高，细节要自己处理 |
| `navigationTransition(.zoom)` | `NavigationStack` 的推入、`sheet`、`fullScreenCover`。系统处理一切，包括交互式返回。仅 iOS / iPadOS |
| `glassEffectID`（第 23 章） | Liquid Glass 元素之间的融合变形 |

## 列表的增删转场

`ForEach` 里的数据增删，对应视图的插入和移除，同样可以用转场：

```swift
struct ListTransitions: View {
    @State private var items = [1, 2, 3]
    @State private var next = 4

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Button("添加") {
                    withAnimation(.bouncy) {
                        items.insert(next, at: 0)
                        next += 1
                    }
                }
                Button("移除最后一个") {
                    withAnimation(.smooth) {
                        if !items.isEmpty { items.removeLast() }
                    }
                }
            }

            VStack(spacing: 8) {
                ForEach(items, id: \.self) { item in
                    Text("条目 \(item)")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.blue.opacity(0.15), in: .rect(cornerRadius: 10))
                        .transition(.asymmetric(
                            insertion: .scale(scale: 0.8, anchor: .top).combined(with: .opacity),
                            removal: .move(edge: .trailing).combined(with: .opacity)
                        ))
                }
            }

            Spacer()
        }
        .padding()
        .frame(height: 360)
    }
}
```

新条目插入时，下面的条目会平滑地被推下去（这是布局动画，第 26 章）；新条目自己执行插入转场。两种动画同时发生，各司其职。

`List` 有自己内置的行增删动画，通常不需要也不建议自定义。

## 常见误区

**误区一：“加了 `.transition` 没反应。”** 检查三点：状态变化有没有动画；`.animation` 是不是加在容器上；`.transition` 是不是加在被插入/移除的那个视图上。

**误区二：“用 `.opacity(isShown ? 1 : 0)` 代替 `if`，再加 `.transition`。”** 这样视图始终在场，没有插入和移除，`.transition` 不会生效。这种写法属于动画，直接用 `withAnimation` 即可。它和 `if` 的区别是：透明的视图仍然占位、仍然可能响应点击（需要加 `.allowsHitTesting(false)`）。

**误区三：“`matchedGeometryEffect` 写了但内容没缩放。”** 它要加在 `.frame` 之前。

**误区四：“两个同 id 的 `matchedGeometryEffect` 视图同时显示。”** 同一时刻只能有一个源。用 `if/else` 保证互斥，或设置 `isSource: false`。

**误区五：“数字变化用转场。”** 文字内容变化不触发视图的插入移除。用 `.contentTransition(.numericText())`。

**误区六：“ZStack 里的视图移除时瞬间消失。”** 给它加 `.zIndex()`。

## 小结

- 转场为视图的插入和移除定义假想的“不在场”状态，由动画驱动。
- 内置转场可以用 `.combined(with:)` 叠加，用 `.asymmetric` 分别指定插入和移除。
- 转场不生效通常是因为：没有动画、`.animation` 没加在容器上、转场没加在被移除的视图上。
- `Transition` 协议根据 `TransitionPhase` 描述各阶段的样子，实现自定义转场。
- `contentTransition` 处理身份不变但内容变化的情况，`.numericText` 让数字滚动。
- `matchedGeometryEffect` 把两个不同视图的几何信息连起来，实现共享元素动画。
- `navigationTransition(.zoom)` 配合 `matchedTransitionSource` 实现导航和 sheet 的缩放转场。

## 练习

1. 做一个顶部通知横幅：从屏幕顶部滑入并淡入，停留 2 秒后自动向上滑出。点击可以提前关闭。
2. 做一个多步骤引导页：点击“下一步”时新页面从右边推入，点击“上一步”时从左边推入。（提示：记录方向，动态选择 `.push(from:)` 的边。）
3. 写一个自定义转场 `.flip`：视图沿 Y 轴翻转出现（`rotation3DEffect`），消失时反方向翻走。
4. 做一个自定义标签栏：四个图标，选中项下方有一个小圆点指示器，切换时圆点用 `matchedGeometryEffect` 滑动过去。
5. 做一个照片网格，点击照片用 `.navigationTransition(.zoom)` 进入详情页。然后再用 `matchedGeometryEffect` 在同一页面内实现类似效果，比较两种方式的代码量和手感。

## 官方文档

- [`transition(_:)`](https://developer.apple.com/documentation/swiftui/view/transition(_:))
- [`Transition` 协议](https://developer.apple.com/documentation/swiftui/transition)
- [`TransitionPhase`](https://developer.apple.com/documentation/swiftui/transitionphase)
- [`AnyTransition`](https://developer.apple.com/documentation/swiftui/anytransition)
- [`contentTransition(_:)`](https://developer.apple.com/documentation/swiftui/view/contenttransition(_:))
- [`ContentTransition`](https://developer.apple.com/documentation/swiftui/contenttransition)
- [`matchedGeometryEffect(id:in:properties:anchor:isSource:)`](https://developer.apple.com/documentation/swiftui/view/matchedgeometryeffect(id:in:properties:anchor:issource:))
- [`Namespace`](https://developer.apple.com/documentation/swiftui/namespace)
- [`navigationTransition(_:)`](https://developer.apple.com/documentation/swiftui/view/navigationtransition(_:))
- [`matchedTransitionSource(id:in:)`](https://developer.apple.com/documentation/swiftui/view/matchedtransitionsource(id:in:))
- [`NavigationTransition`](https://developer.apple.com/documentation/swiftui/navigationtransition)
- [WWDC24：Enhance your UI animations and transitions](https://developer.apple.com/videos/play/wwdc2024/10145/)
