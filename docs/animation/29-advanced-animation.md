# 29 多阶段、关键帧与自定义动画

## 本章目标

- 用 `PhaseAnimator` 做按顺序经过多个状态的动画
- 用 `KeyframeAnimator` 做多个属性各自有独立时间线的复杂动画
- 用 `TimelineView` 做随时间持续更新的界面，配合 `Canvas` 做粒子效果
- 理解 `Animatable` 协议：让你自己的属性可以被插值
- 用 26 系列的 `@Animatable` 宏简化自定义动画
- 了解 `CustomAnimation`：自己定义插值算法

前三章的动画都是“从状态 A 到状态 B”。这一章处理更复杂的情况：经过多个阶段、多条时间线、持续不断，以及让 SwiftUI 学会插值它原本不认识的东西。

## 先看全景

| 工具 | 解决什么问题 | 状态模型 |
| --- | --- | --- |
| `withAnimation` / `.animation` | 两个状态之间的过渡 | A → B |
| `PhaseAnimator` | 依次经过若干个离散阶段 | A → B → C → A … |
| `KeyframeAnimator` | 多个属性各自沿着时间线变化 | 每个属性一条独立的轨道 |
| `TimelineView` | 界面是“当前时间”的函数 | 每一帧重新计算 |
| `Animatable` | 让自定义的值可以被插值 | 配合以上任何一种 |

选择的原则：**用能解决问题的最简单的工具。** 大多数界面动画只需要第一行。

## PhaseAnimator：多阶段动画

第 26 章练习里的“点赞后放大再缩回”，用完成回调可以做，但很啰嗦。它的本质是一个三阶段的序列：正常 → 放大 → 正常。`PhaseAnimator` 就是为这种情况设计的。

### 触发式

```swift
struct LikeButton: View {
    @State private var isLiked = false
    @State private var trigger = 0

    var body: some View {
        Button {
            isLiked.toggle()
            if isLiked { trigger += 1 }
        } label: {
            Image(systemName: isLiked ? "heart.fill" : "heart")
                .font(.system(size: 50))
                .foregroundStyle(isLiked ? .red : .secondary)
                .phaseAnimator([1.0, 1.4, 0.9, 1.0], trigger: trigger) { content, scale in
                    content.scaleEffect(scale)
                } animation: { scale in
                    scale == 1.4 ? .easeOut(duration: 0.12) : .spring(duration: 0.25, bounce: 0.5)
                }
        }
        .buttonStyle(.plain)
    }
}
```

读法：

- 第一个参数是**阶段的序列**，可以是任何 `Equatable` 值的集合。这里直接用缩放比例 `[1.0, 1.4, 0.9, 1.0]`。
- `trigger:` 每次变化时，从头到尾走一遍这个序列，然后停在第一个阶段。
- `content` 闭包：给定当前阶段，视图应该是什么样。
- `animation` 闭包：进入某个阶段时用什么动画。可以省略。

SwiftUI 依次把阶段值设为序列里的每一项，每次都用对应的动画过渡，一个阶段的动画结束后自动进入下一个。

### 用枚举表示阶段

阶段涉及多个属性时，用枚举更清晰：

```swift
struct NotificationBell: View {
    enum Phase: CaseIterable {
        case idle, tiltLeft, tiltRight, settle

        var rotation: Double {
            switch self {
            case .idle, .settle: 0
            case .tiltLeft: -20
            case .tiltRight: 20
            }
        }

        var scale: Double {
            self == .idle ? 1 : 1.15
        }
    }

    @State private var count = 0

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "bell.fill")
                .font(.system(size: 50))
                .foregroundStyle(.orange)
                .phaseAnimator(Phase.allCases, trigger: count) { content, phase in
                    content
                        .rotationEffect(.degrees(phase.rotation), anchor: .top)
                        .scaleEffect(phase.scale)
                } animation: { phase in
                    switch phase {
                    case .idle: .smooth(duration: 0.2)
                    case .tiltLeft, .tiltRight: .easeInOut(duration: 0.12)
                    case .settle: .spring(duration: 0.3, bounce: 0.6)
                    }
                }

            Button("新通知 \(count)") { count += 1 }
        }
    }
}
```

把每个阶段的属性值写成枚举的计算属性，`content` 闭包就只是把它们应用上去。

### 循环式

不提供 `trigger` 时，`PhaseAnimator` **无限循环**：

```swift
struct BreathingDot: View {
    var body: some View {
        Circle()
            .fill(.green)
            .frame(width: 20, height: 20)
            .phaseAnimator([false, true]) { content, isExpanded in
                content
                    .scaleEffect(isExpanded ? 1.6 : 1)
                    .opacity(isExpanded ? 0.4 : 1)
            } animation: { _ in
                .easeInOut(duration: 1)
            }
    }
}
```

这比第 27 章的 `repeatForever` 更可靠：视图消失时循环自动停止，也不需要在 `onAppear` 里手动启动。

`PhaseAnimator` 也有容器视图的形式，适合需要根据阶段显示不同内容的情况：

```swift
struct LoadingMessages: View {
    let messages = ["正在连接…", "正在同步数据…", "马上就好…"]

    var body: some View {
        PhaseAnimator(messages) { message in
            Text(message)
                .font(.headline)
                .id(message)
                .transition(.push(from: .bottom))
        } animation: { _ in
            .smooth(duration: 0.4).delay(1.2)
        }
        .frame(height: 30)
        .clipped()
    }
}
```

### 它的局限

`PhaseAnimator` 的所有属性**一起**从一个阶段走到下一个阶段，共用同一个动画。如果你想要“位移用 0.5 秒，同时旋转在前 0.2 秒完成，缩放在 0.3 秒时才开始”，这种各走各的时间线，它做不到。这时需要关键帧。

## KeyframeAnimator：关键帧动画

关键帧动画的思路是：为每个要动画的属性单独定义一条**轨道**（track），轨道上有若干**关键帧**，每个关键帧规定“在某个时刻，这个属性应该是这个值”。

### 完整的例子

```swift
struct BounceValues {
    var scale = 1.0
    var verticalStretch = 1.0
    var offsetY = 0.0
    var rotation = Angle.zero
}

struct BouncingIcon: View {
    @State private var trigger = 0

    var body: some View {
        VStack(spacing: 40) {
            Image(systemName: "basketball.fill")
                .font(.system(size: 70))
                .foregroundStyle(.orange)
                .keyframeAnimator(initialValue: BounceValues(), trigger: trigger) { content, value in
                    content
                        .rotationEffect(value.rotation)
                        .scaleEffect(value.scale)
                        .scaleEffect(y: value.verticalStretch, anchor: .bottom)
                        .offset(y: value.offsetY)
                } keyframes: { _ in
                    KeyframeTrack(\.verticalStretch) {
                        CubicKeyframe(0.7, duration: 0.15)          // 下蹲
                        CubicKeyframe(1.25, duration: 0.25)         // 拉长起跳
                        CubicKeyframe(1.0, duration: 0.3)           // 空中恢复
                        CubicKeyframe(0.8, duration: 0.1)           // 落地压扁
                        SpringKeyframe(1.0, duration: 0.4, spring: .bouncy)
                    }

                    KeyframeTrack(\.offsetY) {
                        LinearKeyframe(0, duration: 0.15)           // 下蹲时不动
                        CubicKeyframe(-120, duration: 0.3)          // 上升
                        CubicKeyframe(0, duration: 0.3)             // 下落
                    }

                    KeyframeTrack(\.rotation) {
                        LinearKeyframe(.zero, duration: 0.15)
                        CubicKeyframe(.degrees(360), duration: 0.6) // 空中转一圈
                    }
                }

            Button("跳") { trigger += 1 }
        }
        .frame(height: 320)
    }
}
```

结构：

1. **定义一个结构体**，把所有要动画的属性放进去（`BounceValues`）。
2. `initialValue:` 给出初始值。
3. `content` 闭包：给定当前的值，视图是什么样。
4. `keyframes` 闭包：为每个属性定义一条 `KeyframeTrack`，用键路径指明是哪个属性。

每条轨道独立计时。`verticalStretch` 轨道总长 1.2 秒，`offsetY` 是 0.75 秒，`rotation` 是 0.75 秒。整个动画的时长是最长那条轨道的时长。短的轨道走完后保持在最后一个值。

### 四种关键帧

| 类型 | 到达这个关键帧的方式 |
| --- | --- |
| `LinearKeyframe(值, duration:)` | 匀速直线过去 |
| `CubicKeyframe(值, duration:)` | 平滑的曲线，前后关键帧之间自动连成流畅的轨迹 |
| `SpringKeyframe(值, duration:, spring:)` | 弹簧 |
| `MoveKeyframe(值)` | 瞬间跳到这个值，没有过渡 |

- 需要在一个值上**停留**一段时间，就再放一个值相同的关键帧（上例 `offsetY` 的第一帧）。
- `CubicKeyframe` 是最常用的，它让连续的几个关键帧连成一条平滑的曲线，不会在每个关键帧处顿一下。
- 轨道的最后一帧用 `SpringKeyframe` 可以让动画以自然的回弹结束。

### 循环的关键帧动画

不给 `trigger`，改用 `repeating: true`：

```swift
struct FloatingValues {
    var offsetY = 0.0
    var rotation = Angle.zero
}

struct FloatingCloud: View {
    var body: some View {
        Image(systemName: "cloud.fill")
            .font(.system(size: 60))
            .foregroundStyle(.cyan)
            .keyframeAnimator(initialValue: FloatingValues(), repeating: true) { content, value in
                content
                    .offset(y: value.offsetY)
                    .rotationEffect(value.rotation)
            } keyframes: { _ in
                KeyframeTrack(\.offsetY) {
                    CubicKeyframe(-12, duration: 1.5)
                    CubicKeyframe(0, duration: 1.5)
                }
                KeyframeTrack(\.rotation) {
                    CubicKeyframe(.degrees(3), duration: 1)
                    CubicKeyframe(.degrees(-3), duration: 1)
                    CubicKeyframe(.zero, duration: 1)
                }
            }
    }
}
```

### PhaseAnimator 还是 KeyframeAnimator

| | `PhaseAnimator` | `KeyframeAnimator` |
| --- | --- | --- |
| 思路 | 经过一系列**状态** | 每个属性沿**时间线**变化 |
| 各属性的节奏 | 一起变 | 各自独立 |
| 阶段间的动画 | 弹簧或缓动，能保持速度 | 由关键帧类型决定 |
| 适合 | 状态切换、简单的序列、循环 | 精心编排的、有“表演感”的动画 |
| 写起来 | 简单 | 需要更多设计 |

先试 `PhaseAnimator`。它做不出想要的效果时再用 `KeyframeAnimator`。

::: warning 关键帧动画不适合交互
关键帧动画是一段预先编排好的表演，一旦开始就按时间线走，被打断时不像弹簧那样能平滑转向。所以它适合“触发一次，播放完整”的效果（庆祝动画、引导提示、图标的趣味反馈），不适合跟随手势或频繁改变目标的场合。
:::

## TimelineView：界面是时间的函数

有些界面本身就依赖于“现在几点”：时钟、倒计时、不断流动的背景。它们不是“状态变了才更新”，而是**时间在走就要更新**。

`TimelineView` 按照一个时间表反复重新计算它的内容：

```swift
struct ClockFace: View {
    var body: some View {
        TimelineView(.animation) { context in
            let date = context.date
            let calendar = Calendar.current
            let seconds = Double(calendar.component(.second, from: date))
                + Double(calendar.component(.nanosecond, from: date)) / 1_000_000_000
            let minutes = Double(calendar.component(.minute, from: date)) + seconds / 60
            let hours = Double(calendar.component(.hour, from: date) % 12) + minutes / 60

            ZStack {
                Circle().stroke(.secondary, lineWidth: 2)

                ForEach(0..<12, id: \.self) { tick in
                    Rectangle()
                        .fill(.secondary)
                        .frame(width: 2, height: 8)
                        .offset(y: -84)
                        .rotationEffect(.degrees(Double(tick) * 30))
                }

                hand(length: 50, width: 5, color: .primary).rotationEffect(.degrees(hours * 30))
                hand(length: 72, width: 3, color: .primary).rotationEffect(.degrees(minutes * 6))
                hand(length: 80, width: 1.5, color: .red).rotationEffect(.degrees(seconds * 6))

                Circle().fill(.red).frame(width: 8, height: 8)
            }
            .frame(width: 190, height: 190)
        }
    }

    private func hand(length: CGFloat, width: CGFloat, color: Color) -> some View {
        Capsule()
            .fill(color)
            .frame(width: width, height: length)
            .offset(y: -length / 2)
    }
}
```

`context.date` 是当前这一帧的时间。整个表盘是这个时间的纯函数。没有 `@State`，没有定时器。

时间表决定更新的频率：

| 时间表 | 更新时机 |
| --- | --- |
| `.animation` | 每一帧（跟随屏幕刷新率）。用于流畅的动画 |
| `.animation(minimumInterval: 1/30)` | 限制最高帧率 |
| `.animation(paused: isPaused)` | 可以暂停 |
| `.periodic(from:by:)` | 固定间隔，比如每秒一次 |
| `.everyMinute` | 每分钟整点。适合只显示到分钟的时钟 |
| `.explicit([dates])` | 在指定的时刻更新 |

::: tip 选择合适的时间表
`.animation` 每秒执行 60 次甚至 120 次闭包。只显示到秒的时钟用 `.periodic(from: .now, by: 1)`，只显示到分钟的用 `.everyMinute`。不要用高频的时间表做低频的事，那是在白白消耗电量。
:::

### 配合 Canvas：粒子效果

`TimelineView(.animation)` 加 `Canvas` 是做粒子系统、波形、流体这类效果的标准组合。`Canvas` 能高效地画大量图形（第 22 章），`TimelineView` 让它每帧重绘。

```swift
struct SnowfallView: View {
    private struct Flake {
        let x: Double
        let speed: Double
        let size: Double
        let phase: Double
        let drift: Double
    }

    private let flakes: [Flake] = (0..<120).map { _ in
        Flake(
            x: .random(in: 0...1),
            speed: .random(in: 0.04...0.12),
            size: .random(in: 2...6),
            phase: .random(in: 0...1),
            drift: .random(in: 10...40)
        )
    }

    var body: some View {
        TimelineView(.animation) { context in
            let time = context.date.timeIntervalSinceReferenceDate

            Canvas { graphics, size in
                for flake in flakes {
                    let progress = (time * flake.speed + flake.phase).truncatingRemainder(dividingBy: 1)
                    let y = progress * (size.height + 20) - 10
                    let x = flake.x * size.width + sin(time * 1.5 + flake.phase * 10) * flake.drift
                    let rect = CGRect(x: x, y: y, width: flake.size, height: flake.size)
                    graphics.opacity = 0.4 + flake.size / 10
                    graphics.fill(Path(ellipseIn: rect), with: .color(.white))
                }
            }
        }
        .background(.linearGradient(colors: [.indigo, .black], startPoint: .top, endPoint: .bottom))
        .frame(height: 300)
        .clipShape(.rect(cornerRadius: 20))
    }
}
```

这里的技巧是：**每片雪花的位置完全由当前时间和它的固定参数算出来**，不保存任何随时间变化的状态。`progress` 是时间乘以速度再取小数部分，于是每片雪花不断从上到下循环。

这种“位置是时间的函数”的写法没有累积误差，暂停后恢复也不会错乱，是粒子动画的推荐做法。

## Animatable：教会 SwiftUI 插值新东西

第 26 章说过：自己写的 `Shape` 里的自定义属性不会自动动画。现在来解决它。

### 问题

```swift
nonisolated struct PieSliceNoAnimation: Shape {
    var progress: Double

    func path(in rect: CGRect) -> Path {
        Path { path in
            let center = CGPoint(x: rect.midX, y: rect.midY)
            path.move(to: center)
            path.addArc(
                center: center,
                radius: min(rect.width, rect.height) / 2,
                startAngle: .degrees(-90),
                endAngle: .degrees(-90 + 360 * progress),
                clockwise: false
            )
            path.closeSubpath()
        }
    }
}
```

把 `progress` 从 0.2 改成 0.8 并包上 `withAnimation`，扇形会**瞬间**跳过去。

原因：SwiftUI 的动画系统不知道 `progress` 是一个可以插值的属性。它看到的只是“旧的形状”和“新的形状”，两条不同的路径，不知道怎么在它们之间过渡。

### 解决：animatableData

`Animatable` 协议只有一个要求：一个叫 `animatableData` 的属性。它告诉 SwiftUI：“**这就是我身上需要被插值的数据。**”

```swift
nonisolated struct PieSlice: Shape {
    var progress: Double

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func path(in rect: CGRect) -> Path {
        Path { path in
            let center = CGPoint(x: rect.midX, y: rect.midY)
            path.move(to: center)
            path.addArc(
                center: center,
                radius: min(rect.width, rect.height) / 2,
                startAngle: .degrees(-90),
                endAngle: .degrees(-90 + 360 * progress),
                clockwise: false
            )
            path.closeSubpath()
        }
    }
}

struct PieDemo: View {
    @State private var progress = 0.25

    var body: some View {
        VStack(spacing: 24) {
            PieSlice(progress: progress)
                .fill(.orange.gradient)
                .frame(width: 160, height: 160)

            Button("随机") {
                withAnimation(.spring(duration: 0.8, bounce: 0.3)) {
                    progress = .random(in: 0.05...1)
                }
            }
        }
    }
}
```

`Shape` 协议本身已经继承了 `Animatable`，所以只需要补上 `animatableData`。

工作过程：动画开始时，SwiftUI 读取旧值和新值的 `animatableData`（比如 0.25 和 0.8）。动画的每一帧，它算出一个中间值（0.31、0.38……），通过 `set` 写回 `progress`，然后调用 `path(in:)` 重新生成路径。**每一帧都会重新画一次形状。**

这和第 26 章说的“`body` 只调用一次，插值发生在渲染层”形成对比。`Animatable` 是那个例外：它让你的代码参与到每一帧的计算里。能力更强，成本也更高。

### 多个属性：AnimatablePair

`animatableData` 的类型必须遵循 `VectorArithmetic`（可以做加减和数乘的类型）。`Double`、`CGFloat`、`CGPoint`、`CGSize` 等都符合。要同时动画两个属性，用 `AnimatablePair` 把它们打包：

```swift
nonisolated struct WaveShape: Shape {
    var amplitude: Double
    var phase: Double

    var animatableData: AnimatablePair<Double, Double> {
        get { AnimatablePair(amplitude, phase) }
        set {
            amplitude = newValue.first
            phase = newValue.second
        }
    }

    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: 0, y: rect.midY))
            for x in stride(from: 0, through: rect.width, by: 2) {
                let angle = x / rect.width * 4 * .pi + phase
                path.addLine(to: CGPoint(x: x, y: rect.midY + sin(angle) * amplitude))
            }
        }
    }
}
```

三个属性就要嵌套：`AnimatablePair<Double, AnimatablePair<Double, Double>>`。四个、五个会变得非常难写。所以有了下面的宏。

## @Animatable 宏 <Badge type="tip" text="iOS 26+ / macOS 26+ 的 SDK" />

26 系列的 SDK 提供了 `@Animatable` 宏，自动生成 `animatableData`：

```swift
@Animatable
nonisolated struct WaveShape2: Shape {
    var amplitude: Double
    var phase: Double
    var frequency: Double

    @AnimatableIgnored
    var segments = 100

    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: 0, y: rect.midY))
            for index in 0...segments {
                let x = rect.width * Double(index) / Double(segments)
                let angle = x / rect.width * frequency * 2 * .pi + phase
                path.addLine(to: CGPoint(x: x, y: rect.midY + sin(angle) * amplitude))
            }
        }
    }
}

struct WaveDemo: View {
    @State private var isExcited = false

    var body: some View {
        WaveShape2(amplitude: isExcited ? 40 : 10, phase: isExcited ? .pi * 2 : 0, frequency: isExcited ? 4 : 2)
            .stroke(.blue, lineWidth: 3)
            .frame(height: 120)
            .contentShape(.rect)
            .onTapGesture {
                withAnimation(.easeInOut(duration: 1)) { isExcited.toggle() }
            }
            .padding()
    }
}
```

- `@Animatable` 把这个类型里所有可动画的存储属性自动打包成 `animatableData`。
- `@AnimatableIgnored` 标记不参与动画的属性。不能插值的属性（`Int`、`Bool`、枚举等）**必须**标上它，否则编译报错。

::: tip Swift 6.3 / 6.4 都可用
`@Animatable` 宏随 Xcode 26 的 SDK 提供，可以向后部署到更早的系统。用 Swift 6.3（Xcode 26.4）和 Swift 6.4（Xcode 27）都能使用。新代码建议一律用宏，不再手写 `animatableData`。
:::

### 让视图和修饰符可动画

`Animatable` 不只能用于 `Shape`。**视图**和**视图修饰符**也可以遵循它。这解决了第 26 章末尾提到的问题：怎样在动画过程中拿到中间值。

经典例子是“滚动的数字”：

```swift
@Animatable
struct CountingText: View {
    var value: Double

    @AnimatableIgnored
    var format: FloatingPointFormatStyle<Double> = .number.precision(.fractionLength(0))

    var body: some View {
        Text(value, format: format)
            .monospacedDigit()
    }
}

struct CountingDemo: View {
    @State private var total = 0.0

    var body: some View {
        VStack(spacing: 24) {
            CountingText(value: total)
                .font(.system(size: 54, weight: .bold, design: .rounded))

            Button("随机金额") {
                withAnimation(.easeOut(duration: 1.2)) {
                    total = .random(in: 0...99999)
                }
            }
        }
    }
}
```

`total` 瞬间变成新值，但 `CountingText` 遵循了 `Animatable`，SwiftUI 会在动画期间**每一帧**用插值出来的 `value` 重新调用它的 `body`。于是你看到数字从旧值一路滚到新值。

对比第 28 章的 `.contentTransition(.numericText())`：那是数字位的翻动效果，这里是数值本身的连续变化。两者视觉不同，各有适用场合。

修饰符版本，可以套在任何视图上：

```swift
@Animatable
struct ShakeEffect: ViewModifier {
    var progress: Double

    @AnimatableIgnored
    var amplitude: CGFloat = 10

    @AnimatableIgnored
    var shakes = 3

    func body(content: Content) -> some View {
        content.offset(x: sin(progress * .pi * 2 * Double(shakes)) * amplitude)
    }
}

struct ShakeDemo: View {
    @State private var attempts = 0.0

    var body: some View {
        VStack(spacing: 24) {
            Text("密码错误")
                .padding()
                .background(.red.opacity(0.15), in: .rect(cornerRadius: 10))
                .modifier(ShakeEffect(progress: attempts))

            Button("再试一次") {
                withAnimation(.linear(duration: 0.4)) { attempts += 1 }
            }
        }
    }
}
```

`progress` 从 0 动画到 1 的过程中，`sin` 函数让视图左右摆动三个来回，并且在整数处恰好回到 0。这是“摇晃”效果最干净的实现：不依赖重复动画，结束时一定回到原位。

::: warning 成本提醒
遵循 `Animatable` 的视图在动画期间**每帧**都会重新计算 `body`。保持这类视图非常轻量：只包含真正需要逐帧变化的部分，不要把一整个复杂的页面做成 `Animatable`。
:::

## CustomAnimation：自定义插值算法

前面讲的都是“对什么做插值”。`CustomAnimation` 协议让你定义“**怎么**插值”，也就是自己写一个时间曲线。

```swift
nonisolated struct SteppedAnimation: CustomAnimation {
    var duration: TimeInterval
    var steps: Int

    func animate<V: VectorArithmetic>(value: V, time: TimeInterval, context: inout AnimationContext<V>) -> V? {
        guard time < duration else { return nil }               // 返回 nil 表示动画结束
        let progress = time / duration
        let stepped = (progress * Double(steps)).rounded(.down) / Double(steps)
        return value.scaled(by: stepped)
    }
}

extension Animation {
    static func stepped(duration: TimeInterval = 1, steps: Int = 6) -> Animation {
        Animation(SteppedAnimation(duration: duration, steps: steps))
    }
}

struct SteppedDemo: View {
    @State private var isMoved = false

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "figure.walk")
                .font(.largeTitle)
                .offset(x: isMoved ? 110 : -110)
                .animation(.stepped(duration: 1.2, steps: 8), value: isMoved)

            Button("走") { isMoved.toggle() }
        }
    }
}
```

`animate(value:time:context:)` 是核心方法：

- `value` 是这次动画要走过的**总变化量**（终值减初值），是一个向量。
- `time` 是动画开始后经过的时间。
- 返回值是“此刻已经走过了多少”。返回 `value` 本身表示到达终点，返回 `nil` 表示动画结束。

这个例子实现了“步进”动画：不是平滑移动，而是分 8 步跳过去，像老式的逐帧动画。

`CustomAnimation` 是很少用到的高级工具。内置的缓动和弹簧已经覆盖了绝大多数需求。知道它存在即可：当你需要一种内置动画给不了的节奏时，可以回来查它。

## 综合示例：下载按钮

把本章的工具组合起来，做一个有三个状态的下载按钮：待下载 → 下载中（环形进度）→ 完成（对勾弹出）。

```swift
struct DownloadButton: View {
    enum DownloadState: Equatable {
        case idle
        case downloading(Double)
        case finished
    }

    @State private var state = DownloadState.idle
    @State private var celebrate = 0

    private var progress: Double {
        switch state {
        case .idle: 0
        case .downloading(let value): value
        case .finished: 1
        }
    }

    var body: some View {
        Button(action: start) {
            ZStack {
                Circle()
                    .stroke(.gray.opacity(0.25), lineWidth: 6)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(.blue, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 0.2), value: progress)

                Group {
                    switch state {
                    case .idle:
                        Image(systemName: "arrow.down")
                            .transition(.scale.combined(with: .opacity))
                    case .downloading(let value):
                        Text(value, format: .percent.precision(.fractionLength(0)))
                            .font(.caption.monospacedDigit())
                            .contentTransition(.numericText(value: value))
                            .transition(.opacity)
                    case .finished:
                        Image(systemName: "checkmark")
                            .foregroundStyle(.green)
                            .transition(.scale.combined(with: .opacity))
                            .phaseAnimator([1.0, 1.5, 1.0], trigger: celebrate) { content, scale in
                                content.scaleEffect(scale)
                            } animation: { _ in
                                .spring(duration: 0.3, bounce: 0.6)
                            }
                    }
                }
                .font(.title2.weight(.semibold))
            }
            .frame(width: 80, height: 80)
            .contentShape(.circle)
        }
        .buttonStyle(.plain)
        .disabled(state != .idle && state != .finished)
        .sensoryFeedback(.success, trigger: celebrate)
    }

    private func start() {
        if state == .finished {
            withAnimation(.snappy) { state = .idle }
            return
        }
        Task {
            for step in 0...20 {
                withAnimation(.snappy) { state = .downloading(Double(step) / 20) }
                try? await Task.sleep(for: .milliseconds(120))
            }
            withAnimation(.bouncy) { state = .finished }
            celebrate += 1
        }
    }
}
```

这个例子里用到的东西：

- **状态用枚举建模**（第 10 章），三个状态互斥，`progress` 是派生值。
- 进度环用 `trim` 加隐式动画（第 22、26 章）。
- 三种中心内容之间用转场切换（第 28 章）。
- 百分比用 `.contentTransition(.numericText)`（第 28 章）。
- 完成时的对勾用 `phaseAnimator` 做一次弹跳（本章）。
- 完成时触发触感反馈（第 24 章）。
- 下载过程用 `Task` 模拟（第 12 章）。

## 常见误区

**误区一：“多步动画就用一串带 `delay` 的 `withAnimation`。”** 时间是写死的，被打断时会乱。用 `PhaseAnimator` 或 `KeyframeAnimator`。

**误区二：“用 `Timer` 加 `@State` 驱动动画。”** 用 `TimelineView`。它和屏幕刷新同步，视图不可见时自动停止。

**误区三：“自定义 `Shape` 的参数变了但没有动画。”** 需要 `animatableData`，或者加 `@Animatable` 宏。

**误区四：“`@Animatable` 报错说某个属性不符合 `VectorArithmetic`。”** 不能插值的属性要标 `@AnimatableIgnored`。

**误区五：“用 `TimelineView(.animation)` 做每秒更新一次的东西。”** 选频率匹配的时间表，省电。

**误区六：“把整个页面做成 `Animatable` 来拿中间值。”** `Animatable` 视图每帧重算 `body`。只把需要逐帧变化的最小部分抽出来。

**误区七：“关键帧动画用来跟随手势。”** 关键帧是预先编排的表演，不适合交互。交互用弹簧。

## 小结

- `PhaseAnimator` 让视图依次经过一系列阶段，可以由触发器启动，也可以无限循环。
- `KeyframeAnimator` 为每个属性定义独立的轨道和关键帧，适合精心编排的复杂动画。
- `TimelineView` 让界面成为时间的函数；配合 `Canvas` 做粒子效果时，让位置由时间直接算出。
- `Animatable` 通过 `animatableData` 告诉 SwiftUI 哪些数据需要插值，让自定义形状、视图、修饰符参与逐帧动画。
- `@Animatable` 宏自动生成 `animatableData`，不可插值的属性标 `@AnimatableIgnored`。
- `CustomAnimation` 用于定义全新的插值算法，很少需要。

## 练习

1. 用 `PhaseAnimator` 做一个“正在输入”指示器：三个圆点依次变大变亮，无限循环。
2. 用 `KeyframeAnimator` 做一个“加入购物车”的反馈：商品图标先缩小一下，然后沿一条弧线飞向右上角同时缩小并淡出。位移的 x 和 y 用不同的轨道，让轨迹成为抛物线。
3. 用 `TimelineView` 和 `Canvas` 做一个音频波形可视化：20 根竖条，每根的高度按不同频率的正弦函数随时间变化。
4. 写一个 `@Animatable` 的 `RoundedPolygon` 形状：属性有边数（不参与动画）、圆角半径和旋转角度（参与动画）。
5. 写一个 `@Animatable` 的进度环视图，中心显示百分比数字。要求进度变化时，环和数字都连续地变化。

## 官方文档

- [`PhaseAnimator`](https://developer.apple.com/documentation/swiftui/phaseanimator)
- [`phaseAnimator(_:trigger:content:animation:)`](https://developer.apple.com/documentation/swiftui/view/phaseanimator(_:trigger:content:animation:))
- [`KeyframeAnimator`](https://developer.apple.com/documentation/swiftui/keyframeanimator)
- [`keyframeAnimator(initialValue:trigger:content:keyframes:)`](https://developer.apple.com/documentation/swiftui/view/keyframeanimator(initialvalue:trigger:content:keyframes:))
- [`KeyframeTrack`](https://developer.apple.com/documentation/swiftui/keyframetrack)
- [Controlling the timing and movements of your animations](https://developer.apple.com/documentation/swiftui/controlling-the-timing-and-movements-of-your-animations)
- [`TimelineView`](https://developer.apple.com/documentation/swiftui/timelineview)
- [`Animatable` 协议](https://developer.apple.com/documentation/swiftui/animatable)
- [`Animatable()` 宏](https://developer.apple.com/documentation/swiftui/animatable())
- [`AnimatablePair`](https://developer.apple.com/documentation/swiftui/animatablepair)
- [`VectorArithmetic`](https://developer.apple.com/documentation/swiftui/vectorarithmetic)
- [`CustomAnimation`](https://developer.apple.com/documentation/swiftui/customanimation)
- [WWDC23：Wind your way through advanced animations in SwiftUI](https://developer.apple.com/videos/play/wwdc2023/10157/)
- [WWDC23：Explore SwiftUI animation](https://developer.apple.com/videos/play/wwdc2023/10156/)
