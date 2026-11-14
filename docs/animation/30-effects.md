# 30 特效：滚动、符号、着色器

## 本章目标

- 用 `scrollTransition` 和 `visualEffect` 做随滚动变化的效果
- 掌握 SF Symbols 的动画效果
- 让 `MeshGradient` 流动起来
- 了解 Metal 着色器在 SwiftUI 里的三种用法
- 用 `TextRenderer` 做逐字的文字动画
- 知道哪些动画便宜、哪些昂贵，写出流畅的动效

这一章是动画部分的最后一章，讲的是“锦上添花”的东西。它们用好了能让应用显得精致，用多了则会喧宾夺主。每一节都会说明它适合用在哪里。

## 不经过状态的效果：visualEffect

先介绍一个贯穿本章的工具。

第 18 章讲过，把滚动偏移量存进 `@State` 来驱动界面，会让视图每一帧都重新计算。很多视觉效果其实只需要改变**绘制**（位移、缩放、透明度、模糊），不需要改变布局，也不需要通知任何其他视图。

`.visualEffect` 就是为此设计的。它给你当前视图的几何信息，让你据此应用一组“只影响绘制”的效果，整个过程**不经过状态，不触发 `body` 重算**：

```swift
struct VisualEffectBasics: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                ForEach(0..<20, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(hue: Double(index) / 20, saturation: 0.6, brightness: 0.9))
                        .frame(height: 100)
                        .visualEffect { content, proxy in
                            let frame = proxy.frame(in: .scrollView)
                            let distance = min(max(-frame.minY, 0), 100)       // 滚出顶部了多少
                            return content
                                .scaleEffect(1 - distance / 500)
                                .opacity(1 - distance / 150)
                                .blur(radius: distance / 20)
                        }
                }
            }
            .padding()
        }
    }
}
```

`proxy.frame(in: .scrollView)` 是这个视图在滚动视图坐标系里的位置。`minY` 为负表示它的顶部已经滚出了可见区域。据此让滚出去的卡片缩小、变淡、变模糊。

闭包里能用的修饰符是有限的一组“视觉效果”：`offset`、`scaleEffect`、`rotationEffect`、`rotation3DEffect`、`opacity`、`blur`、`brightness`、`contrast`、`saturation`、`hueRotation`、`grayscale`，以及下面要讲的着色器效果。不能用会影响布局的修饰符（`frame`、`padding`），这正是它高效的原因。

::: info 闭包是 @Sendable 的
`visualEffect` 的闭包可能在后台线程执行，所以它被标记为 `@Sendable`。这意味着闭包里**不能直接读取视图的 `@State` 或模型对象**。需要用到外部的值时，先在 `body` 里把它拷贝到一个局部常量里，再让闭包捕获这个常量：

```swift nocheck
var body: some View {
    let strength = self.strength          // 先拷贝成局部的值
    content.visualEffect { view, proxy in
        view.offset(y: proxy.frame(in: .global).minY * strength)
    }
}
```
:::

## 滚动转场：scrollTransition

“卡片滚进屏幕时淡入并放大，滚出时淡出并缩小”这种效果非常常见，有一个专门的修饰符：

```swift
struct ScrollTransitionDemo: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                ForEach(0..<20, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Color(hue: Double(index) / 20, saturation: 0.7, brightness: 0.9).gradient)
                        .frame(height: 140)
                        .scrollTransition { content, phase in
                            content
                                .opacity(phase.isIdentity ? 1 : 0.2)
                                .scaleEffect(phase.isIdentity ? 1 : 0.8)
                                .rotation3DEffect(.degrees(phase.value * -25), axis: (x: 1, y: 0, z: 0))
                        }
                }
            }
            .padding()
        }
    }
}
```

`phase` 是 `ScrollTransitionPhase`，描述视图相对于可见区域的位置：

| 阶段 | 含义 | `phase.value` |
| --- | --- | --- |
| `.topLeading` | 正在从顶部（或行首）进入或离开 | −1 |
| `.identity` | 完全在可见区域内 | 0 |
| `.bottomTrailing` | 正在从底部（或行尾）进入或离开 | 1 |

`phase.value` 在 −1 到 1 之间连续变化，可以用它做上下不对称的效果（上例的 3D 翻转）。

配置参数控制过渡的方式：

```swift nocheck
.scrollTransition(.interactive) { ... }            // 默认：跟随滚动位置连续变化
.scrollTransition(.animated(.bouncy)) { ... }      // 进入可见区域时播放一段动画
.scrollTransition(.interactive.threshold(.visible(0.6))) { ... }   // 可见 60% 才算“完全进入”
.scrollTransition(topLeading: .interactive, bottomTrailing: .identity) { ... }  // 只在顶部边缘生效
```

### 横向轮播

```swift
struct CarouselDemo: View {
    var body: some View {
        ScrollView(.horizontal) {
            LazyHStack(spacing: 16) {
                ForEach(0..<8, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 24)
                        .fill(Color(hue: Double(index) / 8, saturation: 0.6, brightness: 0.9).gradient)
                        .overlay { Text("\(index + 1)").font(.system(size: 60, weight: .bold)).foregroundStyle(.white) }
                        .containerRelativeFrame(.horizontal, count: 5, span: 3, spacing: 16)
                        .frame(height: 260)
                        .scrollTransition(axis: .horizontal) { content, phase in
                            content
                                .scaleEffect(y: phase.isIdentity ? 1 : 0.85)
                                .opacity(phase.isIdentity ? 1 : 0.6)
                                .offset(y: phase.isIdentity ? 0 : 20)
                        }
                }
            }
            .scrollTargetLayout()
        }
        .contentMargins(.horizontal, 60, for: .scrollContent)
        .scrollTargetBehavior(.viewAligned)
        .scrollIndicators(.hidden)
    }
}
```

把第 18 章的吸附滚动和滚动转场组合起来，就是一个中间大、两边小的卡片轮播。

### 视差

视差是指背景比前景移动得慢，产生纵深感。用 `visualEffect` 让图片在自己的框里反向移动一点：

```swift
struct ParallaxDemo: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 24) {
                ForEach(0..<10, id: \.self) { index in
                    LinearGradient(
                        colors: [Color(hue: Double(index) / 10, saturation: 0.8, brightness: 0.9), .black],
                        startPoint: .top, endPoint: .bottom
                    )
                    .frame(height: 320)                             // 比容器高，留出移动的余量
                    .overlay { Image(systemName: "mountain.2.fill").font(.system(size: 120)).foregroundStyle(.white.opacity(0.5)) }
                    .visualEffect { content, proxy in
                        let frame = proxy.frame(in: .scrollView)
                        return content.offset(y: -frame.minY * 0.15)   // 以 15% 的速度反向移动
                    }
                    .frame(height: 200)                             // 可见窗口
                    .clipShape(.rect(cornerRadius: 20))
                }
            }
            .padding()
        }
    }
}
```

内容高 320，窗口高 200 并裁剪。滚动时内容在窗口里缓慢地反向滑动。

## SF Symbols 的动画

第 14 章介绍了 SF Symbols 的静态用法。符号还内置了一套专门设计的动画，用 `.symbolEffect` 触发。

### 三种触发方式

```swift
struct SymbolEffectTypes: View {
    @State private var isActive = true
    @State private var tapCount = 0
    @State private var isVisible = true

    var body: some View {
        VStack(spacing: 30) {
            // 一、持续型：isActive 为 true 时一直播放
            Image(systemName: "wifi")
                .symbolEffect(.variableColor.iterative, isActive: isActive)

            // 二、离散型：value 每变化一次，播放一次
            Image(systemName: "bell.fill")
                .symbolEffect(.bounce, value: tapCount)

            // 三、转场型：视图出现和消失时播放
            if isVisible {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                    .transition(.symbolEffect(.appear))
            }

            HStack {
                Toggle("持续", isOn: $isActive).fixedSize()
                Button("触发") { tapCount += 1 }
                Button("显隐") { withAnimation { isVisible.toggle() } }
            }
            .buttonStyle(.bordered)
        }
        .font(.system(size: 50))
        .frame(height: 320)
    }
}
```

| 触发方式 | 写法 | 行为 |
| --- | --- | --- |
| 持续 | `.symbolEffect(效果, isActive: Bool)` | 条件为真时循环播放 |
| 离散 | `.symbolEffect(效果, value: 值)` | 值每变化一次播放一次 |
| 转场 | `.transition(.symbolEffect(效果))` | 视图插入、移除时播放 |
| 内容替换 | `.contentTransition(.symbolEffect(.replace))` | 符号换成另一个时播放 |

### 效果一览

```swift
struct SymbolEffectGallery: View {
    @State private var trigger = 0

    var body: some View {
        VStack(spacing: 20) {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 90))], spacing: 20) {
                item("bounce") { $0.symbolEffect(.bounce, value: trigger) }
                item("pulse") { $0.symbolEffect(.pulse) }
                item("variableColor") { $0.symbolEffect(.variableColor.iterative.reversing) }
                item("scale") { $0.symbolEffect(.scale.up, isActive: trigger.isMultiple(of: 2)) }
                item("wiggle") { $0.symbolEffect(.wiggle, value: trigger) }
                item("rotate") { $0.symbolEffect(.rotate, value: trigger) }
                item("breathe") { $0.symbolEffect(.breathe) }
            }

            Button("触发离散效果") { trigger += 1 }
        }
        .padding()
    }

    private func item(_ name: String, effect: (Image) -> some View) -> some View {
        VStack(spacing: 6) {
            effect(Image(systemName: "speaker.wave.3.fill"))
                .font(.system(size: 36))
                .frame(height: 50)
            Text(name).font(.caption2).foregroundStyle(.secondary)
        }
    }
}
```

| 效果 | 表现 | 典型用途 | 最低版本 |
| --- | --- | --- | --- |
| `.bounce` | 弹跳一下 | 操作成功的反馈、吸引注意 | iOS 17 |
| `.pulse` | 透明度脉动 | 表示“进行中” | iOS 17 |
| `.variableColor` | 各层依次点亮 | 信号强度、加载、播放中 | iOS 17 |
| `.scale` | 放大或缩小并保持 | 按下、悬停、选中 | iOS 17 |
| `.appear` / `.disappear` | 出现、消失 | 配合转场或 `isActive` | iOS 17 |
| `.replace` | 一个符号变成另一个 | 播放/暂停切换 | iOS 17 |
| `.wiggle` | 摇晃 | 提示可操作、提醒 | iOS 18 |
| `.rotate` | 旋转 | 刷新、处理中 | iOS 18 |
| `.breathe` | 缓慢地缩放呼吸 | 待机状态、录音中 | iOS 18 |
| `.drawOn` / `.drawOff` | 像手写一样画出、擦除 | 完成、签名类的表现 | iOS 26 |

每种效果有自己的变体，用点语法链式指定：

```swift nocheck
.symbolEffect(.bounce.up.byLayer, value: count)              // 向上弹，各图层依次
.symbolEffect(.variableColor.cumulative.reversing)           // 累积点亮，然后反向
.symbolEffect(.wiggle.left, value: count)                    // 向左摇
.symbolEffect(.rotate.clockwise.byLayer)                     // 顺时针，按图层
.symbolEffect(.replace.downUp)                               // 旧的向下消失，新的向上出现
```

`.byLayer` 让符号的各个图层分别运动，`.wholeSymbol` 让整个符号一起运动。不是所有符号都分了图层，在 SF Symbols 应用里可以预览每个符号对每种效果的支持情况。

### 控制播放

```swift
struct SymbolEffectOptionsDemo: View {
    @State private var count = 0

    var body: some View {
        HStack(spacing: 40) {
            Image(systemName: "arrow.down.circle")
                .symbolEffect(.bounce, options: .repeat(3), value: count)

            Image(systemName: "antenna.radiowaves.left.and.right")
                .symbolEffect(.variableColor, options: .speed(2))

            Image(systemName: "heart.fill")
                .symbolEffect(.pulse, options: .repeat(.continuous))
                .foregroundStyle(.red)
        }
        .font(.system(size: 44))
        .onTapGesture { count += 1 }
    }
}
```

- `.repeat(3)`：重复三次。`.repeat(.continuous)`：持续循环。`.nonRepeating`：只播一次。
- `.speed(2)`：两倍速。

### 符号替换

```swift
struct SymbolReplaceDemo: View {
    @State private var isMuted = false
    @State private var isFavorite = false

    var body: some View {
        HStack(spacing: 50) {
            Button {
                isMuted.toggle()
            } label: {
                Image(systemName: isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                    .contentTransition(.symbolEffect(.replace))
            }

            Button {
                isFavorite.toggle()
            } label: {
                Image(systemName: isFavorite ? "star.fill" : "star")
                    .foregroundStyle(isFavorite ? .yellow : .secondary)
                    .contentTransition(.symbolEffect(.replace.downUp))
                    .symbolEffect(.bounce, value: isFavorite)
            }
        }
        .font(.system(size: 44))
        .buttonStyle(.plain)
    }
}
```

对于成对的符号（比如带斜杠和不带斜杠的版本），系统会使用“魔法替换”：斜杠被画上去或擦掉，而不是整个符号淡入淡出。

::: tip 符号动画是成本最低的精致感
符号效果由系统实现，性能好，自动遵循“减弱动态效果”的设置，而且风格与系统一致。在按钮、工具栏、状态指示里用上合适的符号动画，是让应用显得讲究的最省力的办法。原则是**效果要有含义**：`bounce` 表示“发生了”，`pulse` 表示“进行中”，`wiggle` 表示“看这里”。不要给每个图标都加上持续的动画。
:::

## 流动的网格渐变

第 22 章介绍了 `MeshGradient`。让它的控制点随时间移动，就得到一种很柔和的流动背景：

```swift
struct FlowingMesh: View {
    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30)) { context in
            let t = context.date.timeIntervalSinceReferenceDate

            MeshGradient(
                width: 3, height: 3,
                points: [
                    [0, 0], [0.5, 0], [1, 0],
                    [0, 0.5 + 0.1 * Float(sin(t * 0.7))],
                    [0.5 + 0.2 * Float(cos(t * 0.5)), 0.5 + 0.2 * Float(sin(t * 0.6))],
                    [1, 0.5 + 0.1 * Float(cos(t * 0.8))],
                    [0, 1], [0.5, 1], [1, 1],
                ],
                colors: [
                    .indigo, .purple, .pink,
                    .blue, .mint, .orange,
                    .teal, .cyan, .yellow,
                ]
            )
        }
        .frame(height: 300)
        .clipShape(.rect(cornerRadius: 28))
        .padding()
    }
}
```

四个角和四条边的中点里，只让中间一行的三个点移动：左右边上的点上下浮动，中心点画一个椭圆。角上的点保持不动，否则渐变的边缘会露出空白。

`.animation(minimumInterval: 1/30)` 把帧率限制在 30 帧。这种缓慢的背景变化不需要 60 帧甚至 120 帧，限制帧率能省不少电。

`MeshGradient` 的 `points` 和 `colors` 也支持普通的 SwiftUI 动画：把两组不同的控制点放进状态，用 `withAnimation` 切换即可。

## Metal 着色器

着色器（shader）是运行在显卡上的小程序，对**每一个像素**执行一次。它能实现普通修饰符做不到的效果：波纹、扭曲、溶解、发光、噪点、像素化。

SwiftUI 提供了三个修饰符来使用着色器，对应三种能力：

| 修饰符 | 着色器拿到什么 | 着色器返回什么 | 能做的事 |
| --- | --- | --- | --- |
| `.colorEffect` | 像素的位置和**当前颜色** | 新的颜色 | 调色、条纹、渐变叠加、噪点 |
| `.distortionEffect` | 像素的位置 | **另一个位置**：这个像素应该从哪里取色 | 波浪、扭曲、放大镜 |
| `.layerEffect` | 像素的位置和**整个图层** | 新的颜色（可以读取图层上任意位置的颜色） | 模糊、像素化、波纹、色散 |

### 写一个着色器

着色器用 Metal 着色语言（MSL）编写，它是 C++ 的一个变种。在项目里新建一个 **Metal File**（比如 `Shaders.metal`）：

```c
#include <metal_stdlib>
#include <SwiftUI/SwiftUI_Metal.h>
using namespace metal;

// colorEffect：让颜色随位置和时间变化，产生扫过的光泽
[[ stitchable ]] half4 shimmer(float2 position, half4 color, float2 size, float time) {
    float diagonal = (position.x + position.y) / (size.x + size.y);
    float band = smoothstep(0.0, 0.15, 0.15 - abs(diagonal - fract(time * 0.5)));
    return color + half4(band * 0.5) * color.a;
}

// distortionEffect：让每一行像素左右错位，产生波浪
[[ stitchable ]] float2 wave(float2 position, float time, float amplitude) {
    float offset = sin(position.y / 20.0 + time * 4.0) * amplitude;
    return float2(position.x + offset, position.y);
}

// layerEffect：把相邻的像素合并成大块，产生像素化
[[ stitchable ]] half4 pixellate(float2 position, SwiftUI::Layer layer, float blockSize) {
    float2 block = floor(position / blockSize) * blockSize + blockSize / 2.0;
    return layer.sample(block);
}
```

函数签名的规则：

- 必须标 `[[ stitchable ]]`。
- 前面的参数是固定的，由效果的类型决定（见上表）。
- 后面可以加任意多个自定义参数，由 Swift 这边传入。

### 在 SwiftUI 里使用

```swift
struct ShaderDemo: View {
    @State private var blockSize = 1.0
    private let start = Date.now

    var body: some View {
        TimelineView(.animation) { context in
            let time = Float(context.date.timeIntervalSince(start))

            VStack(spacing: 30) {
                Text("SwiftUI")
                    .font(.system(size: 60, weight: .black))
                    .foregroundStyle(.blue)
                    .visualEffect { content, proxy in
                        content.colorEffect(
                            ShaderLibrary.shimmer(.float2(proxy.size), .float(time))
                        )
                    }

                Image(systemName: "flag.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(.red)
                    .distortionEffect(
                        ShaderLibrary.wave(.float(time), .float(8)),
                        maxSampleOffset: CGSize(width: 8, height: 0)
                    )

                Image(systemName: "photo.artframe")
                    .font(.system(size: 80))
                    .foregroundStyle(.green.gradient)
                    .layerEffect(
                        ShaderLibrary.pixellate(.float(blockSize)),
                        maxSampleOffset: .zero
                    )
            }
        }
        .safeAreaInset(edge: .bottom) {
            Slider(value: $blockSize, in: 1...20).padding()
        }
    }
}
```

- `ShaderLibrary.函数名(参数…)` 引用你在 `.metal` 文件里写的函数。SwiftUI 在运行时按名字查找。
- 参数用 `.float(_)`、`.float2(_)`、`.color(_)`、`.image(_)` 等包装。**固定参数（位置、颜色、图层）不用传**，SwiftUI 自动提供。
- `maxSampleOffset` 告诉 SwiftUI 着色器最多会从多远的地方取样，系统据此预留额外的渲染区域。
- 需要视图尺寸时，用 `visualEffect` 取得 `proxy.size` 再传给着色器。
- 配合 `TimelineView` 传入时间，着色器就动起来了。

::: warning 这段 Swift 代码需要配套的 .metal 文件
`ShaderLibrary.shimmer` 是按名字动态查找的，所以即使没有对应的 Metal 函数，Swift 代码也能通过编译，只是运行时没有效果。把上面的 Metal 代码加进项目后才能看到结果。
:::

着色器是一个很深的领域。入门的建议是：先从 `colorEffect` 开始，因为它最简单；多看别人写的着色器并修改参数；注意着色器对每个像素都执行，里面的循环和复杂计算要克制。着色器效果不适用于 UIKit / AppKit 桥接进来的视图。

## 逐字的文字动画：TextRenderer

`TextRenderer` 让你接管 `Text` 的绘制过程。你会拿到排好版的文字（按行、按文字片段、按字形组织），可以对每一个字单独做变换：

```swift
nonisolated struct WaveTextRenderer: TextRenderer {
    var time: Double
    var amplitude: Double = 6

    var animatableData: Double {
        get { time }
        set { time = newValue }
    }

    func draw(layout: Text.Layout, in context: inout GraphicsContext) {
        var index = 0
        for line in layout {
            for run in line {
                for glyph in run {
                    var copy = context
                    let offset = sin(time * 4 + Double(index) * 0.5) * amplitude
                    copy.translateBy(x: 0, y: offset)
                    copy.draw(glyph)
                    index += 1
                }
            }
        }
    }
}

struct WaveTextDemo: View {
    private let start = Date.now

    var body: some View {
        TimelineView(.animation) { context in
            Text("每个字都在跳舞")
                .font(.largeTitle.bold())
                .foregroundStyle(.purple)
                .textRenderer(WaveTextRenderer(time: context.date.timeIntervalSince(start)))
        }
        .padding(.vertical, 20)
    }
}
```

`Text.Layout` 的结构是三层嵌套：`Line`（行）→ `Run`（样式相同的一段文字）→ `RunSlice`（单个字形）。`draw(layout:in:)` 里的 `context` 就是第 22 章的 `GraphicsContext`，所有的绘图能力都能用：位移、旋转、缩放、透明度、模糊、着色器滤镜。

下面是一个更实用的例子：文字逐字淡入，可以用作转场。

```swift
nonisolated struct RevealTextRenderer: TextRenderer {
    var progress: Double

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func draw(layout: Text.Layout, in context: inout GraphicsContext) {
        let glyphs = layout.flatMap { line in line.flatMap { run in Array(run) } }
        let count = Double(max(glyphs.count, 1))

        for (index, glyph) in glyphs.enumerated() {
            // 每个字有自己的起始时刻，前后两个字的动画有重叠
            let start = Double(index) / count * 0.7
            let local = min(max((progress - start) / 0.3, 0), 1)

            var copy = context
            copy.opacity = local
            copy.translateBy(x: 0, y: (1 - local) * 12)
            copy.addFilter(.blur(radius: (1 - local) * 4))
            copy.draw(glyph)
        }
    }
}

struct RevealTextDemo: View {
    @State private var progress = 0.0

    var body: some View {
        VStack(spacing: 30) {
            Text("文字像墨水一样渐渐显现出来")
                .font(.title2.weight(.semibold))
                .textRenderer(RevealTextRenderer(progress: progress))

            Button("重播") {
                progress = 0
                withAnimation(.easeOut(duration: 1.6)) { progress = 1 }
            }
        }
        .padding()
        .onAppear {
            withAnimation(.easeOut(duration: 1.6)) { progress = 1 }
        }
    }
}
```

`TextRenderer` 继承了 `Animatable`（上一章），所以实现 `animatableData` 之后，`progress` 可以用普通的 `withAnimation` 来驱动，每一帧都会重新调用 `draw`。

两个渲染器都标了 `nonisolated`，原因和第 22 章的 `Shape` 一样：绘制可能发生在后台线程。

## 让动画流畅

精致的动效如果掉帧，还不如没有。下面是一些经验。

### 便宜的和昂贵的

| 成本 | 属性 | 原因 |
| --- | --- | --- |
| 低 | `offset`、`scaleEffect`、`rotationEffect`、`opacity` | 只是对已经渲染好的图层做变换，不需要重新布局，也不需要重新绘制内容 |
| 中 | `frame`、`padding`、栈的间距 | 触发布局重新计算，可能影响周围的视图 |
| 中 | 颜色、渐变、`cornerRadius`、`trim` | 需要重新绘制内容 |
| 高 | 大面积的 `blur`、`shadow`、材质 | 每帧都要做昂贵的图像处理 |
| 高 | `Animatable` 的视图和形状 | 每帧都执行你的代码 |
| 高 | 着色器的 `layerEffect` | 每帧对每个像素执行，并且要先把视图渲染成纹理 |

实践建议：

- **移动一个东西，优先用 `offset` 而不是改 `padding` 或 `frame`。** 效果相同时前者便宜得多。
- **避免对大面积的模糊和阴影做动画。** 需要阴影随状态变化时，改变它的**透明度**（`.shadow(color: .black.opacity(x), ...)`）比改变半径便宜。
- **复杂的静态内容上做变换动画时，可以加 `.drawingGroup()`**，把内容先渲染成一张位图，之后的变换只作用于这张图。
- **用 `visualEffect` 和 `scrollTransition`，不要用状态驱动滚动效果。**

### geometryGroup：修正子视图的动画

有时父视图的尺寸在做动画，而子视图是在动画过程中才出现的。子视图会直接出现在**最终位置**，而不是跟着父视图一起运动，看起来像“飞”进来的。`.geometryGroup()` 可以修正这一点：

```swift
struct GeometryGroupDemo: View {
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("标题").font(.headline)
            if isExpanded {
                Text("展开后才出现的详情内容。")
                    .transition(.opacity)
            }
        }
        .padding()
        .frame(maxWidth: isExpanded ? .infinity : 160, alignment: .leading)
        .background(.blue.opacity(0.15), in: .rect(cornerRadius: 16))
        .geometryGroup()                 // 让里面的内容把父视图的几何变化当作一个整体
        .padding()
        .onTapGesture {
            withAnimation(.smooth(duration: 0.6)) { isExpanded.toggle() }
        }
    }
}
```

它的作用是把父视图的位置和尺寸“固化”成一个整体再传给子视图，子视图看到的是一个连续变化的父容器。遇到“新出现的子视图位置不对”的动画问题时，试试在父视图上加它。

### 测量，不要猜

- 在**真机**上测试。模拟器的性能不代表真实设备。
- 用 Instruments 的 SwiftUI 模板查看哪些视图在频繁更新（第 35 章）。
- 打开模拟器的 **Debug › Slow Animations** 检查动画的细节。
- 测试时开启“减弱动态效果”和“低电量模式”，确认应用的表现仍然合理。

### 再说一次“减弱动态效果”

本章的效果大多属于装饰性动画，正是敏感用户最需要关掉的那一类：

| 效果 | 开启“减弱动态效果”时 |
| --- | --- |
| 符号效果 | 系统自动处理 |
| 视差、滚动时的缩放与 3D 翻转 | 关闭，或只保留透明度变化 |
| 持续流动的背景 | 停在一帧上 |
| 着色器的波纹、扭曲 | 关闭 |
| 逐字动画 | 改为整体淡入 |

```swift
struct MotionAwareBackground: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion)) { context in
            let t = reduceMotion ? 0 : context.date.timeIntervalSinceReferenceDate
            LinearGradient(
                colors: [.blue, .purple],
                startPoint: UnitPoint(x: 0.5 + 0.5 * cos(t * 0.3), y: 0),
                endPoint: UnitPoint(x: 0.5 - 0.5 * cos(t * 0.3), y: 1)
            )
        }
        .frame(height: 160)
        .clipShape(.rect(cornerRadius: 20))
        .padding()
    }
}
```

`TimelineView` 的 `paused:` 参数直接停掉时间表，画面静止在一帧上，也不再消耗资源。

## 动画部分的总结

五章动画讲完了。回顾整个体系：

```text
                        ┌── 身份不变，属性变化 ──▶ 动画（第 26、27 章）
状态变化 ──▶ 界面变化 ──┤
                        └── 视图插入、移除 ────▶ 转场（第 28 章）

多个阶段 ───────────────▶ PhaseAnimator        （第 29 章）
多条时间线 ─────────────▶ KeyframeAnimator     （第 29 章）
随时间持续更新 ─────────▶ TimelineView         （第 29 章）
自定义属性的插值 ───────▶ Animatable           （第 29 章）
随滚动变化 ─────────────▶ scrollTransition、visualEffect  （本章）
符号、渐变、像素、文字 ──▶ 本章的各种特效
```

贯穿其中的思想只有一条：**动画是状态变化在时间上的展开。** 你描述每个状态下界面的样子，SwiftUI 负责中间的过程。绝大多数动画只需要一个 `withAnimation`。更复杂的工具是为了处理“两个状态之间的插值”表达不了的情况。

好的动效有三个特点：**有目的**（说明了什么东西去了哪里、发生了什么）、**快**（不让用户等）、**一致**（整个应用是同一种“性格”）。

## 常见误区

**误区一：“用滚动偏移的 `@State` 驱动视差和缩放。”** 每帧重算 `body`。用 `visualEffect` 或 `scrollTransition`。

**误区二：“`visualEffect` 的闭包里读 `@State`。”** 闭包是 `@Sendable` 的。先把值拷贝到局部常量。

**误区三：“每个图标都加持续的符号动画。”** 到处都在动等于没有重点，还很分散注意力。效果要有含义，持续型的只用于表示“正在进行”。

**误区四：“着色器没效果。”** 检查：`.metal` 文件是否加入了 target；函数是否标了 `[[ stitchable ]]`；函数名是否和 `ShaderLibrary.名字` 一致；参数的数量和类型是否匹配；`maxSampleOffset` 是否足够。

**误区五：“流动背景用 60 帧全速跑。”** 缓慢的变化用 `minimumInterval` 限制帧率，并在减弱动态效果时暂停。

**误区六：“模拟器上很流畅就没问题。”** 在真机上、尤其是旧设备上测试。

## 小结

- `visualEffect` 根据几何信息应用只影响绘制的效果，不经过状态，不触发 `body` 重算。
- `scrollTransition` 让视图在滚入滚出可见区域时变化，`phase.value` 提供连续的进度。
- 符号效果有持续、离散、转场、内容替换四种触发方式，是成本最低的精致动效。
- `MeshGradient` 配合 `TimelineView` 可以做流动的背景。
- Metal 着色器通过 `colorEffect`、`distortionEffect`、`layerEffect` 接入，分别用于改颜色、移位置、读取整个图层。
- `TextRenderer` 接管文字绘制，实现逐字动画。
- 变换和透明度的动画最便宜；大面积模糊、逐帧执行的代码最昂贵。装饰性动效要尊重“减弱动态效果”。

## 练习

1. 做一个个人主页的头部：顶部一张大图，向上滚动时图片以较慢的速度移动（视差）并逐渐模糊；向下过度拖拽时图片放大。全部用 `visualEffect` 实现，不使用任何状态。
2. 做一个横向的专辑封面轮播：居中的封面最大，两侧的封面缩小、变暗并沿 Y 轴向内旋转。用 `scrollTransition` 和 `phase.value` 实现。
3. 做一个下载按钮的图标动画：点击后图标从“向下箭头”替换成“进度圆圈”（持续的 `variableColor`），完成后替换成“对勾”并 `bounce` 一次。
4. 写一个 `colorEffect` 着色器：把视图变成黑白，并提供一个 0 到 1 的参数控制黑白的程度。用滑块调节。
5. 用 `TextRenderer` 实现“打字机”效果：文字按 `progress` 逐字出现，当前正在出现的那个字稍微放大。

## 官方文档

- [`visualEffect(_:)`](https://developer.apple.com/documentation/swiftui/view/visualeffect(_:))
- [`VisualEffect`](https://developer.apple.com/documentation/swiftui/visualeffect)
- [`scrollTransition(_:axis:transition:)`](https://developer.apple.com/documentation/swiftui/view/scrolltransition(_:axis:transition:))
- [`ScrollTransitionPhase`](https://developer.apple.com/documentation/swiftui/scrolltransitionphase)
- [`symbolEffect(_:options:value:)`](https://developer.apple.com/documentation/swiftui/view/symboleffect(_:options:value:))
- [`symbolEffect(_:options:isActive:)`](https://developer.apple.com/documentation/swiftui/view/symboleffect(_:options:isactive:))
- [Symbols 框架（全部符号效果）](https://developer.apple.com/documentation/symbols)
- [`MeshGradient`](https://developer.apple.com/documentation/swiftui/meshgradient)
- [`Shader`](https://developer.apple.com/documentation/swiftui/shader)
- [`ShaderLibrary`](https://developer.apple.com/documentation/swiftui/shaderlibrary)
- [`colorEffect(_:isEnabled:)`](https://developer.apple.com/documentation/swiftui/view/coloreffect(_:isenabled:))
- [`distortionEffect(_:maxSampleOffset:isEnabled:)`](https://developer.apple.com/documentation/swiftui/view/distortioneffect(_:maxsampleoffset:isenabled:))
- [`layerEffect(_:maxSampleOffset:isEnabled:)`](https://developer.apple.com/documentation/swiftui/view/layereffect(_:maxsampleoffset:isenabled:))
- [`TextRenderer`](https://developer.apple.com/documentation/swiftui/textrenderer)
- [`geometryGroup()`](https://developer.apple.com/documentation/swiftui/view/geometrygroup())
- [Creating visual effects with SwiftUI（官方示例项目）](https://developer.apple.com/documentation/swiftui/creating-visual-effects-with-swiftui)
- [WWDC24：Create custom visual effects with SwiftUI](https://developer.apple.com/videos/play/wwdc2024/10151/)
- [WWDC23：Animate symbols in your app](https://developer.apple.com/videos/play/wwdc2023/10258/)
