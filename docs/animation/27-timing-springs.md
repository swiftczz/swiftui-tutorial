# 27 时间曲线与弹簧

## 本章目标

- 理解时间曲线：它决定动画的“节奏”
- 掌握缓动动画（ease）的几种类型和自定义贝塞尔曲线
- 理解弹簧动画为什么是默认值，掌握 `duration` 和 `bounce` 两个参数
- 知道弹簧在被打断时如何保持速度
- 会用 `delay`、`speed`、`repeatCount`、`repeatForever` 修饰动画
- 能为具体场景选择合适的动画

上一章讲了动画是“两个状态之间的插值”。这一章回答下一个问题：**按什么节奏插值？**

## 时间曲线是什么

一个值从 0 动画到 100，用时 1 秒。在 0.5 秒时它应该是多少？

最简单的答案是 50：匀速变化。但现实中的运动很少是匀速的。物体启动要加速，停下要减速。匀速的动画看起来机械、生硬。

**时间曲线**（timing curve）描述的就是“时间进度”和“动画进度”之间的关系：

```text
动画进度
 1 ┤                    ╭───       ┤             ╭──       ┤          ╱
   │                 ╭──╯          │          ╭──╯         │        ╱
   │              ╭──╯             │        ╱              │      ╱
   │           ╭──╯                │      ╱                │    ╱
   │       ╭───╯                   │   ╭─╯                 │  ╱
 0 ┼───────╯                       ┼───╯                   ┼╱
   └──────────────── 时间          └──────────── 时间      └──────── 时间
        easeIn（慢 → 快）            easeInOut（慢-快-慢）      linear（匀速）
```

曲线越陡，那一刻变化越快。

SwiftUI 的动画分两大类：

- **基于时间曲线的动画**：你指定时长和曲线形状。`linear`、`easeIn`、`easeOut`、`easeInOut`、自定义贝塞尔曲线。
- **弹簧动画**：模拟一个连着弹簧的物体。没有固定的曲线，运动由物理参数决定。

## 缓动动画

先用一个对比工具直观感受它们的区别：

```swift
struct TimingComparison: View {
    @State private var isMoved = false

    private let animations: [(name: String, animation: Animation)] = [
        ("linear", .linear(duration: 1)),
        ("easeIn", .easeIn(duration: 1)),
        ("easeOut", .easeOut(duration: 1)),
        ("easeInOut", .easeInOut(duration: 1)),
        ("smooth 弹簧", .smooth(duration: 1)),
        ("snappy 弹簧", .snappy(duration: 1)),
        ("bouncy 弹簧", .bouncy(duration: 1)),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            ForEach(animations, id: \.name) { item in
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name).font(.caption).foregroundStyle(.secondary)
                    Circle()
                        .fill(.blue)
                        .frame(width: 26, height: 26)
                        .offset(x: isMoved ? 220 : 0)
                        .animation(item.animation, value: isMoved)
                }
            }

            Button("开始") { isMoved.toggle() }
                .padding(.top)
        }
        .frame(width: 260, alignment: .leading)
        .padding()
    }
}
```

把这段代码跑起来，反复点“开始”，看七个小球各自的运动方式。这比任何文字描述都有效。

| 动画 | 节奏 | 感觉 | 适合 |
| --- | --- | --- | --- |
| `.linear` | 匀速 | 机械 | 持续旋转的加载指示器、进度条、颜色的缓慢循环 |
| `.easeIn` | 慢 → 快 | 加速离开 | 元素**离开**屏幕 |
| `.easeOut` | 快 → 慢 | 减速到达 | 元素**进入**屏幕 |
| `.easeInOut` | 慢 → 快 → 慢 | 平稳 | 在屏幕内从一处移到另一处 |

每个都可以指定时长：`.easeInOut(duration: 0.4)`。不指定时用默认时长（0.35 秒）。

### 自定义曲线

`timingCurve` 用三次贝塞尔曲线的两个控制点自定义节奏，和 CSS 的 `cubic-bezier` 是同一套参数：

```swift
struct CustomCurve: View {
    @State private var isMoved = false

    var body: some View {
        VStack(spacing: 24) {
            Circle()
                .fill(.orange)
                .frame(width: 40, height: 40)
                .offset(x: isMoved ? 100 : -100)
                .animation(.timingCurve(0.68, -0.55, 0.27, 1.55, duration: 0.8), value: isMoved)

            Button("切换") { isMoved.toggle() }
        }
    }
}
```

这组参数（0.68, −0.55, 0.27, 1.55）会让物体先往后退一点再冲出去，到终点时冲过头再回来。控制点的 y 值超出 0 到 1 的范围就会产生这种“过冲”效果。

## 弹簧动画

### 为什么默认是弹簧

`withAnimation { }` 不指定动画时，用的是 `.default`，它是一个平滑的弹簧。SwiftUI 把弹簧作为默认值，是因为它在**交互式界面**里有三个缓动动画不具备的优点。

**一、它保持速度。**

用手指拖着一个视图快速移动，然后松手。视图在松手的瞬间有一个速度。如果接下来的动画是 `easeInOut`，它会从速度 0 重新开始加速，你会看到一个明显的“顿挫”。弹簧会接过当前的速度，自然地减速到目标位置。

**二、它被打断时不会跳变。**

动画进行到一半，目标变了。缓动动画会用一条新的曲线从当前位置重新开始，速度发生突变。弹簧会带着当前的速度转向新目标，过程是连续的。

用下面的例子体会。快速连续地点击按钮：

```swift
struct InterruptionDemo: View {
    @State private var isRight = false

    var body: some View {
        VStack(spacing: 30) {
            VStack(alignment: .leading) {
                Text("easeInOut").font(.caption)
                Circle().fill(.red).frame(width: 36, height: 36)
                    .offset(x: isRight ? 200 : 0)
                    .animation(.easeInOut(duration: 1), value: isRight)
            }
            VStack(alignment: .leading) {
                Text("spring").font(.caption)
                Circle().fill(.green).frame(width: 36, height: 36)
                    .offset(x: isRight ? 200 : 0)
                    .animation(.spring(duration: 1), value: isRight)
            }

            Button("快速连点我") { isRight.toggle() }
        }
        .frame(width: 240, alignment: .leading)
    }
}
```

红球每次被打断都会明显地顿一下再启动；绿球则像一个有质量的物体，平滑地掉头。

**三、它的参数符合直觉。**

你不需要想“曲线是什么形状”，只需要想两件事：**大概多久**、**弹不弹**。

### 两个参数：duration 和 bounce

```swift
struct SpringParameters: View {
    @State private var isMoved = false
    @State private var duration = 0.5
    @State private var bounce = 0.3

    var body: some View {
        VStack(spacing: 24) {
            Circle()
                .fill(.purple)
                .frame(width: 50, height: 50)
                .offset(x: isMoved ? 110 : -110)
                .animation(.spring(duration: duration, bounce: bounce), value: isMoved)

            VStack(alignment: .leading) {
                Text("duration：\(duration, format: .number.precision(.fractionLength(2))) 秒")
                Slider(value: $duration, in: 0.1...2)
                Text("bounce：\(bounce, format: .number.precision(.fractionLength(2)))")
                Slider(value: $bounce, in: -0.5...0.9)
            }
            .font(.caption)

            Button("运动") { isMoved.toggle() }
        }
        .padding()
    }
}
```

拖动两个滑块，感受它们各自的作用：

| 参数 | 含义 | 取值 |
| --- | --- | --- |
| `duration` | 弹簧的“感知时长”：大致多久到达目标。不是精确的结束时间，有弹跳时实际停稳会更晚 | 通常 0.2 到 0.8 秒 |
| `bounce` | 弹性 | `0`：不弹，刚好停在目标。`0` 到 `1`：越大弹得越厉害。负值：比不弹更“迟钝”，到达得更慢 |

`bounce` 超过 0.5 就很夸张了。日常界面用 0 到 0.3 之间的值。

### 三个预设

大多数时候不需要自己调参数，用预设就够了：

| 预设 | 等价于 | 感觉 | 适合 |
| --- | --- | --- | --- |
| `.smooth` | `bounce: 0` | 平滑，无弹跳 | 绝大多数界面过渡。最通用的选择 |
| `.snappy` | 很小的弹性 | 干脆利落，略带一点回弹 | 快速响应用户操作：开关、选中、展开 |
| `.bouncy` | 明显的弹性 | 活泼 | 需要吸引注意或表达趣味的元素 |

预设也可以微调：

```swift
struct SpringPresets: View {
    @State private var isOn = false

    var body: some View {
        HStack(spacing: 30) {
            ball(.smooth, "smooth")
            ball(.snappy, "snappy")
            ball(.bouncy, "bouncy")
            ball(.bouncy(duration: 0.6, extraBounce: 0.2), "更弹")
        }
        .frame(height: 200)
        .contentShape(.rect)
        .onTapGesture { isOn.toggle() }
    }

    private func ball(_ animation: Animation, _ title: String) -> some View {
        VStack {
            Circle().fill(.teal).frame(width: 36, height: 36)
                .offset(y: isOn ? 60 : -60)
                .animation(animation, value: isOn)
            Text(title).font(.caption2)
        }
    }
}
```

`.spring` 不带参数时等同于 `.smooth`。

### 更底层的弹簧参数

弹簧还有几种基于物理量的写法。你会在旧代码和一些文章里看到它们：

```swift
struct LegacySprings: View {
    @State private var isOn = false

    var body: some View {
        VStack(spacing: 20) {
            Circle().fill(.blue).frame(width: 30)
                .offset(x: isOn ? 90 : -90)
                .animation(.spring(response: 0.5, dampingFraction: 0.6), value: isOn)

            Circle().fill(.red).frame(width: 30)
                .offset(x: isOn ? 90 : -90)
                .animation(.interpolatingSpring(stiffness: 170, damping: 12), value: isOn)

            Circle().fill(.green).frame(width: 30)
                .offset(x: isOn ? 90 : -90)
                .animation(.interpolatingSpring(duration: 0.5, bounce: 0.4), value: isOn)

            Button("切换") { isOn.toggle() }
        }
        .frame(height: 220)
    }
}
```

| 写法 | 参数 | 说明 |
| --- | --- | --- |
| `.spring(response:dampingFraction:)` | 响应时间、阻尼比 | iOS 17 之前的主要写法。`dampingFraction` 为 1 时不弹，越小越弹。大致有 `bounce = 1 − dampingFraction` |
| `.interpolatingSpring(stiffness:damping:)` | 刚度、阻尼 | 纯物理参数。从其他平台或设计工具移植动画时会用到 |
| `.interpolatingSpring(duration:bounce:)` | 时长、弹性 | 与 `.spring` 参数相同，区别见下 |

`spring` 和 `interpolatingSpring` 的区别在于**被打断时**的行为：`spring` 会把新旧动画合并成一个弹簧，速度连续；`interpolatingSpring` 会把新动画叠加在旧动画之上，多次触发的效果会累加。日常使用 `spring` 及其预设即可。

新代码请使用 `duration` 加 `bounce` 的写法，它最直观。

### 手势结束后的弹簧

第 24 章的拖拽例子里，松手后都用了弹簧。现在你知道原因了：手指松开时视图是有速度的。

SwiftUI 在**同一个属性**上从一个弹簧过渡到另一个弹簧时会自动保持速度。但从“手势直接驱动”切换到“动画驱动”时，速度需要你传进去。`DragGesture` 的值里有 `velocity`，可以用它算出初始速度：

```swift
struct VelocityHandoff: View {
    @State private var offset: CGFloat = 0

    var body: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(.indigo.gradient)
            .frame(width: 120, height: 120)
            .offset(y: offset)
            .gesture(
                DragGesture()
                    .onChanged { offset = $0.translation.height }
                    .onEnded { value in
                        // 相对速度 = 手势速度 ÷ 还要走的距离
                        let distance = -offset
                        let relativeVelocity = distance == 0 ? 0 : value.velocity.height / distance
                        withAnimation(.interpolatingSpring(duration: 0.5, bounce: 0.3, initialVelocity: relativeVelocity)) {
                            offset = 0
                        }
                    }
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
```

用力往下一甩再松手，方块会先顺着甩的方向继续冲一点，再弹回来；轻轻放手则平缓地回去。这种“接住手势速度”的细节，是让界面感觉“跟手”的关键。

`initialVelocity` 的单位是“每秒走完全程的几倍”，所以要用手势速度除以剩余距离。

## 修饰动画

`Animation` 值上有几个修饰方法，可以链式调用。

### delay：延迟

```swift
struct StaggeredAnimation: View {
    @State private var isShown = false

    var body: some View {
        VStack(spacing: 20) {
            HStack(spacing: 10) {
                ForEach(0..<6, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 8)
                        .fill(.blue)
                        .frame(width: 34, height: 60)
                        .scaleEffect(y: isShown ? 1 : 0.2, anchor: .bottom)
                        .opacity(isShown ? 1 : 0.3)
                        .animation(.bouncy.delay(Double(index) * 0.06), value: isShown)
                }
            }

            Button("切换") { isShown.toggle() }
        }
    }
}
```

每个柱子的延迟比前一个多 0.06 秒，形成依次展开的“波浪”效果。这种错开的动画（stagger）是让一组元素的出现显得有组织的常用手法。

### speed：变速

```swift nocheck
.animation(.spring.speed(2), value: x)       // 两倍速
.animation(.easeInOut.speed(0.25), value: x) // 四分之一速，调试时很好用
```

### repeatCount 与 repeatForever：重复

```swift
struct RepeatingAnimations: View {
    @State private var isPulsing = false
    @State private var isSpinning = false
    @State private var shakeTrigger = false

    var body: some View {
        HStack(spacing: 50) {
            Circle()
                .fill(.red)
                .frame(width: 40, height: 40)
                .scaleEffect(isPulsing ? 1.3 : 1)
                .opacity(isPulsing ? 0.5 : 1)
                .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isPulsing)

            Image(systemName: "arrow.triangle.2.circlepath")
                .font(.largeTitle)
                .rotationEffect(.degrees(isSpinning ? 360 : 0))
                .animation(.linear(duration: 1.5).repeatForever(autoreverses: false), value: isSpinning)

            Image(systemName: "bell.fill")
                .font(.largeTitle)
                .rotationEffect(.degrees(shakeTrigger ? 15 : 0), anchor: .top)
                .animation(.easeInOut(duration: 0.1).repeatCount(5, autoreverses: true), value: shakeTrigger)
                .onTapGesture { shakeTrigger.toggle() }
        }
        .onAppear {
            isPulsing = true
            isSpinning = true
        }
    }
}
```

- `repeatForever(autoreverses:)`：无限重复。`autoreverses: true`（默认）表示来回往复，`false` 表示每次都从头开始。
- `repeatCount(_:autoreverses:)`：重复指定次数。

注意它们的工作方式：动画仍然是“从状态 A 到状态 B”，重复只是让这段插值来回播放。所以需要一个状态变化来启动它，这里是在 `onAppear` 里把 `isPulsing` 设为 `true`。

::: warning 重复动画的两个坑
1. **`repeatCount` 配合自动反转时用奇数次。** 偶数次会在结束时回到起点，而状态值已经是终点了，于是最后会突然跳一下。
2. **`repeatForever` 很难干净地停下来。** 把状态改回去，它不一定会平滑停止。需要可控的循环动画时，第 29 章的 `PhaseAnimator` 或第 30 章的符号效果是更好的选择。
:::

## Spring 类型：把弹簧当成数学工具

`Spring` 是一个独立的值类型，代表一个弹簧模型。除了创建动画，还可以直接用它计算：

```swift
struct SpringMath: View {
    var body: some View {
        let spring = Spring(duration: 0.5, bounce: 0.3)

        VStack(alignment: .leading, spacing: 6) {
            Text("刚度 \(spring.stiffness, format: .number.precision(.fractionLength(1)))")
            Text("阻尼 \(spring.damping, format: .number.precision(.fractionLength(1)))")
            Text("停稳所需时间 \(spring.settlingDuration, format: .number.precision(.fractionLength(2))) 秒")
            Text("0.2 秒时的位置 \(spring.value(target: 1.0, time: 0.2), format: .number.precision(.fractionLength(3)))")
        }
        .font(.callout.monospacedDigit())
        .padding()
    }
}
```

`spring.value(target:time:)` 给出弹簧在某个时刻的位置。当你需要在 `Canvas`、自定义布局或手势处理中手动实现弹簧效果时，它很有用。`Animation.spring(spring)` 可以用一个 `Spring` 值创建动画。

## 怎么选动画

把这一章的内容整理成选择指南：

```text
这个动画是用户直接操作引起的吗？（点击、拖拽结束、开关）
├─ 是 → 用弹簧
│       ├─ 普通的界面变化               → .smooth（或直接用默认）
│       ├─ 需要显得快速、干脆           → .snappy
│       └─ 需要活泼、吸引注意           → .bouncy
│
└─ 否 → 它是什么性质的？
        ├─ 持续循环（加载、呼吸）        → .linear 或 .easeInOut + repeatForever
        ├─ 元素进入屏幕                  → .easeOut，或 .smooth
        ├─ 元素离开屏幕                  → .easeIn
        ├─ 颜色、透明度的渐变            → .easeInOut
        └─ 拿不准                        → .smooth
```

关于时长的经验值：

| 场景 | 时长 |
| --- | --- |
| 小元素的状态变化（按钮按下、开关、选中） | 0.15 到 0.25 秒 |
| 中等元素（卡片展开、面板滑入） | 0.3 到 0.45 秒 |
| 大范围的过渡（整页切换） | 0.4 到 0.6 秒 |
| 装饰性的循环动画 | 1 秒以上 |

几条原则：

- **越小的元素，动画越快。** 一个开关花 0.6 秒才切换过去，会让人觉得界面迟钝。
- **用户越频繁触发的动画，应该越短。** 一个每分钟要做几十次的操作，动画每多 0.1 秒都是负担。
- **整个应用使用统一的少数几种动画。** 定义几个常量，各处复用，界面才有一致的“性格”：

```swift
extension Animation {
    /// 应用内通用的界面过渡
    static let appStandard = Animation.smooth(duration: 0.35)
    /// 对用户操作的快速响应
    static let appQuick = Animation.snappy(duration: 0.2)
    /// 需要强调的元素
    static let appEmphasis = Animation.bouncy(duration: 0.5, extraBounce: 0.1)
}
```

## 常见误区

**误区一：“动画都用 `.easeInOut(duration: 0.3)`。”** 这是其他平台的习惯。在 SwiftUI 里，用户操作触发的动画优先用弹簧，它在被打断和接续手势时表现更好。

**误区二：“`bounce` 越大越生动。”** 过度的弹跳显得不专业，也会让界面看起来不稳定。日常用 0 到 0.3。

**误区三：“弹簧的 `duration` 是精确的结束时间。”** 它是感知时长。有弹性的弹簧停稳的时间会更长。需要精确的结束时刻时，用完成回调。

**误区四：“用 `repeatForever` 做一个可以随时停止的加载动画。”** 它不容易平滑停止。用 `PhaseAnimator`、`TimelineView` 或符号效果。

**误区五：“每个地方单独调一组动画参数。”** 应用里的动画应该少而统一。

## 小结

- 时间曲线决定动画的节奏。`linear` 匀速，`easeIn` 加速，`easeOut` 减速，`easeInOut` 两头慢；`timingCurve` 自定义贝塞尔曲线。
- 弹簧是 SwiftUI 的默认动画，因为它能保持速度、被打断时连续、参数直观。
- 弹簧用 `duration`（感知时长）和 `bounce`（弹性）两个参数描述，三个预设是 `.smooth`、`.snappy`、`.bouncy`。
- 手势结束后用弹簧，并通过 `initialVelocity` 把手势的速度交给动画。
- `delay` 延迟（可做错开效果），`speed` 变速，`repeatCount` 和 `repeatForever` 重复。
- 用户操作触发的变化用弹簧；循环用线性或缓动；小元素快，大元素慢；全应用统一。

## 练习

1. 用 `TimingComparison` 的结构做一个“动画实验室”：增加一个 `Picker` 选择要动画的属性（位移、缩放、旋转、透明度），观察同一条曲线作用在不同属性上的观感差异。
2. 做一个加载指示器：三个圆点依次上下跳动，无限循环。用 `delay` 错开三个点的相位。
3. 做一个“摇一摇”的错误提示：密码输错时，输入框左右快速晃动几次然后停在原位。（提示：`repeatCount` 用奇数次，或者思考一下怎样让它最终回到原位。）
4. 做一个下拉抽屉，松手时把手势的速度传给弹簧。分别体验“慢慢放下”和“用力甩出”两种手感，并和不传初始速度的版本对比。

## 官方文档

- [`Animation`](https://developer.apple.com/documentation/swiftui/animation)
- [`Spring`](https://developer.apple.com/documentation/swiftui/spring)
- [`spring(duration:bounce:blendDuration:)`](https://developer.apple.com/documentation/swiftui/animation/spring(duration:bounce:blendduration:))
- [`smooth`](https://developer.apple.com/documentation/swiftui/animation/smooth)
- [`snappy`](https://developer.apple.com/documentation/swiftui/animation/snappy)
- [`bouncy`](https://developer.apple.com/documentation/swiftui/animation/bouncy)
- [`interpolatingSpring(duration:bounce:initialVelocity:)`](https://developer.apple.com/documentation/swiftui/animation/interpolatingspring(duration:bounce:initialvelocity:))
- [`timingCurve(_:_:_:_:duration:)`](https://developer.apple.com/documentation/swiftui/animation/timingcurve(_:_:_:_:duration:))
- [`UnitCurve`](https://developer.apple.com/documentation/swiftui/unitcurve)
- [`delay(_:)`](https://developer.apple.com/documentation/swiftui/animation/delay(_:))
- [`repeatForever(autoreverses:)`](https://developer.apple.com/documentation/swiftui/animation/repeatforever(autoreverses:))
- [WWDC23：Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/)
- [WWDC18：Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/)
