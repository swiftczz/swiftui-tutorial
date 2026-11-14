# 26 动画原理：状态变化的插值

## 本章目标

- 理解 SwiftUI 动画的本质：两个状态之间的插值
- 掌握触发动画的两种方式：`withAnimation` 和 `.animation(_:value:)`
- 知道什么能动、什么不能动，以及为什么
- 理解事务（Transaction）：动画是怎么沿视图树传播的
- 能精确控制动画的作用范围
- 会在动画结束时执行代码
- 尊重用户的“减弱动态效果”设置

动画部分一共五章。这一章讲原理，后面四章分别讲时间曲线、转场、高级动画和特效。原理是最重要的，它决定了你遇到“动画不生效”时能不能自己找出原因。

## 动画不是“播放”出来的

在很多框架里，动画是一条命令：“把这个视图在 0.3 秒内移动到那里。”SwiftUI 里没有这样的命令。

回到第 1 章的公式 `UI = f(State)`。状态从 A 变成 B，界面就从 `f(A)` 变成 `f(B)`。默认情况下这个变化是瞬间完成的。**动画只是给这个变化加上一段时间**：在这段时间里，SwiftUI 自动计算出 `f(A)` 和 `f(B)` 之间的一系列中间画面。

```text
没有动画：    f(A) ─────────────────────────────▶ f(B)        瞬间切换

有动画：      f(A) ──▶ · ──▶ · ──▶ · ──▶ · ──▶ f(B)        SwiftUI 补出中间帧
                     ╰───── 插值（interpolation）─────╯
```

所以在 SwiftUI 里做动画，你只需要做两件事：

1. 描述两个状态下界面各是什么样（这是你一直在做的事）
2. 告诉 SwiftUI“这次状态变化请带上动画”

你**不需要**描述中间过程。这带来一个非常重要的性质：**动画永远可以被打断**。动画进行到一半时状态又变了，SwiftUI 就从当前的中间位置出发，朝新的目标继续插值。不存在“动画没播完，下一个动画没法开始”的问题。

## 第一个动画

```swift
struct FirstAnimation: View {
    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 30) {
            RoundedRectangle(cornerRadius: isExpanded ? 40 : 12)
                .fill(isExpanded ? .orange : .blue)
                .frame(width: isExpanded ? 240 : 100, height: isExpanded ? 160 : 100)
                .rotationEffect(.degrees(isExpanded ? 10 : 0))

            Button("切换") {
                withAnimation {
                    isExpanded.toggle()
                }
            }
        }
    }
}
```

把 `withAnimation { }` 去掉再运行一次，对比差别。

`body` 里没有一行动画代码。圆角、颜色、宽高、旋转角度都只是 `isExpanded` 的函数。`withAnimation` 说的是：“这个闭包里引起的所有状态变化，请用动画过渡。”于是四个属性同时平滑地变化。

## 触发动画的两种方式

### 显式动画：withAnimation

```swift
struct ExplicitAnimation: View {
    @State private var offset: CGFloat = 0
    @State private var count = 0

    var body: some View {
        VStack(spacing: 24) {
            Circle()
                .fill(.pink)
                .frame(width: 60, height: 60)
                .offset(x: offset)

            Text("点击次数：\(count)")

            HStack {
                Button("带动画移动") {
                    withAnimation(.spring(duration: 0.5, bounce: 0.4)) {
                        offset = offset == 0 ? 100 : 0
                    }
                    count += 1                    // 这一行在闭包外面，不带动画
                }

                Button("不带动画移动") {
                    offset = offset == 0 ? 100 : 0
                }
            }
        }
    }
}
```

`withAnimation` 是**从状态变化的源头**指定动画：这次修改带动画，那次修改不带。它影响的是“这次状态变化所导致的**所有**界面变化”，不管那些视图在哪里。

括号里可以指定动画的类型（下一章详细讲）。不写时用默认动画，这是一个平滑的弹簧。

### 隐式动画：.animation(_:value:)

```swift
struct ImplicitAnimation: View {
    @State private var isOn = false

    var body: some View {
        VStack(spacing: 24) {
            Circle()
                .fill(isOn ? .green : .gray)
                .frame(width: 60, height: 60)
                .scaleEffect(isOn ? 1.5 : 1)
                .animation(.bouncy, value: isOn)

            Toggle("开关", isOn: $isOn)
                .fixedSize()
        }
    }
}
```

`.animation(_:value:)` 是**从视图这一侧**指定动画。它说的是：“只要 `value` 变了，不管是谁、在哪里改的，这个视图（以及它里面的东西）的变化都要带上这个动画。”

这里 `Toggle` 直接通过绑定修改了 `isOn`，没有任何 `withAnimation`，圆仍然会动。

`value` 参数是必需的：它指明“监视哪个值的变化”。

::: warning 不要用不带 value 的版本
旧代码里有 `.animation(.default)` 这种不带 `value` 的写法。它会给这个视图的**任何**变化都加上动画，包括屏幕旋转、键盘弹出引起的布局变化，常常导致意料之外的动画。这个版本已被弃用，永远使用带 `value` 的形式。
:::

### 该用哪个

| | 显式 `withAnimation` | 隐式 `.animation(_:value:)` |
| --- | --- | --- |
| 在哪里指定 | 修改状态的地方 | 视图上 |
| 影响范围 | 这次状态变化引起的所有界面变化 | 这个视图子树里，由该值变化引起的变化 |
| 适合 | 用户操作触发的变化（点击、手势结束） | 视图“自带”的动画效果，不管状态被谁修改 |
| 典型场景 | 按钮动作里展开/收起一个面板 | 一个进度条，值一变就平滑过渡 |

一个实用的经验：**可复用的组件用隐式动画，页面级的交互用显式动画。** 组件不知道外面的人会怎么改它的数据，所以自己声明“我的这个值变化时要有动画”。页面知道此刻发生了什么操作，所以在操作处指定动画。

### 第三种：给绑定加动画

通过绑定修改状态的控件（`Toggle`、`Slider`、`Picker`），可以给绑定本身附加动画：

```swift
struct BindingAnimation: View {
    @State private var showDetail = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Toggle("显示详情", isOn: $showDetail.animation(.snappy))

            if showDetail {
                Text("这里是详情内容，开关切换时带动画出现。")
                    .padding()
                    .background(.yellow.opacity(0.3), in: .rect(cornerRadius: 8))
            }
        }
        .padding()
    }
}
```

`$showDetail.animation(.snappy)` 的意思是：通过这个绑定做的修改，都等同于包在 `withAnimation(.snappy)` 里。

## 什么能动，什么不能动

SwiftUI 只能对**可以插值**的东西做动画。一个数值从 100 变到 200，中间值很明确。一段文字从“你好”变成“再见”，中间是什么？没有合理的定义。

### 能自动动的

凡是最终归结为**数值**的属性，都能动：

| 类别 | 例子 |
| --- | --- |
| 位置与尺寸 | `frame`、`padding`、`offset`、`position`、栈的 `spacing`、对齐 |
| 变换 | `scaleEffect`、`rotationEffect`、`rotation3DEffect` |
| 外观 | `opacity`、颜色、渐变、`blur`、`shadow`、`brightness`、`saturation` |
| 形状 | `cornerRadius`、`trim`、`lineWidth`、自定义形状的可动画属性 |
| 布局结果 | 视图因为兄弟节点的增删、尺寸变化而移动 |

最后一项值得强调。**布局变化也是动画。** 你没有直接改某个视图的位置，但它旁边的视图变大了，把它挤开了。SwiftUI 知道这个视图的位置从哪变到了哪，会为它做动画：

```swift
struct LayoutAnimation: View {
    @State private var items = ["一", "二", "三"]

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                ForEach(items, id: \.self) { item in
                    Text(item)
                        .frame(width: 50, height: 50)
                        .background(.blue.opacity(0.2), in: .rect(cornerRadius: 10))
                }
            }

            HStack {
                Button("添加") {
                    withAnimation { items.append("\(items.count + 1)") }
                }
                Button("打乱") {
                    withAnimation { items.shuffle() }
                }
                Button("移除") {
                    withAnimation { if !items.isEmpty { items.removeLast() } }
                }
            }
        }
    }
}
```

点“打乱”，方块们各自滑到新位置。能做到这一点，是因为 `ForEach` 给了每个方块稳定的身份（第 3 章），SwiftUI 知道“这个‘二’以前在第二个位置，现在在第一个位置”。

### 不能自动动的

| 情况 | 现象 | 解决办法 |
| --- | --- | --- |
| `Text` 的内容变了 | 文字瞬间切换 | `.contentTransition(.numericText())` 等（第 28 章） |
| `Image` 换了一张图 | 瞬间切换 | `.contentTransition`、转场，或符号替换效果（第 30 章） |
| 视图出现或消失（`if`） | 默认淡入淡出 | 这是**转场**，用 `.transition()` 定制（第 28 章） |
| `if/else` 切换到另一个视图 | 旧的淡出、新的淡入 | 转场，或 `matchedGeometryEffect`（第 28 章） |
| 字体的种类变了 | 瞬间切换 | 字号可以动，字体家族不行 |
| 自己写的 `Shape` 里的自定义属性 | 瞬间切换 | 实现 `animatableData`（第 29 章） |

### 关键：身份必须保持

第 3、4 章反复强调过的那条法则，在这里显出它的全部分量：

::: danger 只有同一个视图才能在两个状态之间做动画
动画是**同一个视图**的属性从旧值到新值的插值。如果状态变化导致视图的身份变了（旧视图被移除，新视图被插入），就不存在“从旧值到新值”，SwiftUI 只能做转场：让旧的消失、新的出现。
:::

```swift
struct IdentityAndAnimation: View {
    @State private var isActive = false

    var body: some View {
        VStack(spacing: 30) {
            // 写法一：if/else，两个不同的视图。颜色只能淡入淡出，尺寸不会平滑变化
            if isActive {
                Circle().fill(.green).frame(width: 100, height: 100)
            } else {
                Circle().fill(.gray).frame(width: 60, height: 60)
            }

            // 写法二：同一个视图，属性不同。颜色和尺寸都平滑过渡
            Circle()
                .fill(isActive ? .green : .gray)
                .frame(width: isActive ? 100 : 60, height: isActive ? 100 : 60)

            Button("切换") {
                withAnimation(.easeInOut(duration: 0.6)) { isActive.toggle() }
            }
        }
        .frame(height: 320)
    }
}
```

运行并仔细看：上面的圆是一个渐渐消失、另一个渐渐出现；下面的圆是同一个圆在长大并变色。

遇到“动画不生效”或“动画是淡入淡出而不是平滑变化”，第一件事就是检查：**状态变化前后，这是不是同一个视图？** 有没有 `if/else`？有没有变化的 `.id()`？`ForEach` 的 id 稳定吗？

## 事务：动画是怎么传下去的

`withAnimation` 是在按钮的闭包里调用的，而被动画的视图可能在视图树的任何地方。动画信息是怎么到达它们那里的？

答案是**事务**（transaction）。每次状态变化引发视图更新时，SwiftUI 都会创建一个 `Transaction` 值，随着这次更新沿视图树向下传递。事务里带着“这次更新用什么动画”的信息。

```text
withAnimation(.spring) { state = newValue }
        │
        ▼
创建事务 { animation: .spring }
        │
        ▼   沿视图树向下传递
   ┌────┴─────────────────────────────┐
   │ 视图 A（依赖 state）              │ ← 读到事务里的 .spring，用它做插值
   │   └─ 视图 B .animation(.linear, value: state)
   │                                   │ ← 把事务里的动画改写成 .linear
   │         └─ 视图 C                 │ ← 读到 .linear
   └───────────────────────────────────┘
```

这个模型解释了很多现象：

- `withAnimation` 创建一个带动画的事务。没有 `withAnimation` 时，事务里的动画是空的，变化瞬间完成。
- `.animation(_:value:)` 修饰符在事务经过它时，**改写**事务里的动画。所以它的效果覆盖了外面的 `withAnimation`。
- 事务向下传递，所以 `.animation` 影响它所修饰的视图**里面**的所有东西。

### 修饰符的位置决定作用范围

`.animation(_:value:)` 影响的是写在它**前面**（也就是它包裹的里层）的修饰符：

```swift
struct AnimationScope: View {
    @State private var isOn = false

    var body: some View {
        VStack(spacing: 30) {
            Text("缩放带动画，颜色不带")
                .padding()
                .scaleEffect(isOn ? 1.3 : 1)
                .animation(.bouncy, value: isOn)                  // 只管它前面的 scaleEffect
                .background(isOn ? .orange : .gray.opacity(0.3))  // 写在后面，不受影响，瞬间变色
                .clipShape(.capsule)

            Text("两个都带，但动画不同")
                .padding()
                .scaleEffect(isOn ? 1.3 : 1)
                .animation(.bouncy, value: isOn)
                .background(isOn ? .orange : .gray.opacity(0.3))
                .animation(.easeInOut(duration: 1), value: isOn)  // 管它和上一个 animation 之间的部分
                .clipShape(.capsule)

            Button("切换") { isOn.toggle() }
        }
    }
}
```

第二个例子里，缩放用弹跳动画，背景色用缓慢的渐变。每个 `.animation` 只影响它和上一个 `.animation` 之间的修饰符。

### 范围更精确的写法

上面这种“靠位置划范围”的写法容易看错。有一个更明确的形式，把要动画的修饰符写进闭包里：

```swift
struct ScopedAnimation: View {
    @State private var isOn = false

    var body: some View {
        VStack(spacing: 30) {
            Text("只有缩放和透明度带动画")
                .padding()
                .background(isOn ? .orange : .gray.opacity(0.3), in: .capsule)
                .animation(.bouncy) { content in
                    content
                        .scaleEffect(isOn ? 1.3 : 1)
                        .opacity(isOn ? 1 : 0.6)
                }

            Button("切换") { isOn.toggle() }
        }
    }
}
```

`.animation(_:body:)` 只给闭包里的修饰符加动画，范围一目了然，也不会意外影响到子视图。写可复用组件时推荐这种形式。

### 关掉动画

有时需要让某个视图**不参与**外面的动画：

```swift
struct DisableAnimation: View {
    @State private var value = 0.0

    var body: some View {
        VStack(spacing: 24) {
            RoundedRectangle(cornerRadius: 10)
                .fill(.blue)
                .frame(width: 60 + value * 200, height: 40)

            Text(value, format: .percent.precision(.fractionLength(0)))
                .font(.title2.monospacedDigit())
                .animation(nil, value: value)                 // 数字不参与动画，立即更新

            Button("随机") {
                withAnimation(.easeInOut(duration: 1)) {
                    value = .random(in: 0...1)
                }
            }
        }
    }
}
```

`.animation(nil, value:)` 把事务里的动画清空。

更通用的工具是 `.transaction` 修饰符和 `withTransaction`，可以直接读写事务：

```swift
struct TransactionDemo: View {
    @State private var isOn = false

    var body: some View {
        VStack(spacing: 24) {
            Circle()
                .fill(.purple)
                .frame(width: 60, height: 60)
                .offset(x: isOn ? 80 : -80)
                .transaction { transaction in
                    transaction.animation = transaction.animation?.speed(0.3)    // 把经过的动画放慢
                }

            HStack {
                Button("带动画") {
                    withAnimation { isOn.toggle() }
                }

                Button("强制不带动画") {
                    var transaction = Transaction()
                    transaction.disablesAnimations = true
                    withTransaction(transaction) {
                        isOn.toggle()
                    }
                }
            }
        }
    }
}
```

`transaction.disablesAnimations = true` 会让这次更新里所有的隐式动画（`.animation(_:value:)`）都不生效。当你需要“这一次不要任何动画”（比如恢复初始状态）时很有用。

## 动画结束时做事

`withAnimation` 可以带一个完成回调：

```swift
struct CompletionDemo: View {
    @State private var isFlying = false
    @State private var status = "准备"

    var body: some View {
        VStack(spacing: 30) {
            Image(systemName: "paperplane.fill")
                .font(.largeTitle)
                .foregroundStyle(.blue)
                .offset(x: isFlying ? 120 : -120)

            Text(status)

            Button("发送") {
                status = "发送中…"
                withAnimation(.easeInOut(duration: 1)) {
                    isFlying = true
                } completion: {
                    status = "已送达"
                    withAnimation(.easeInOut(duration: 0.4)) {
                        isFlying = false
                    }
                }
            }
        }
    }
}
```

完成回调常用来串联动画：第一段结束后开始第二段。

对弹簧动画，“结束”有两种定义。`completionCriteria` 参数可以选择：

- `.logicallyComplete`（默认）：动画“看起来”结束了。弹簧在视觉上已经停稳，但数学上还有极其微小的残余运动。
- `.removed`：动画彻底结束，被系统移除。比上一种晚一些。

串联动画用默认值即可。

::: tip 复杂的多步动画不要用回调串
如果一个动画有三四个以上的步骤，用完成回调一层层嵌套会很难读。下一章的 `delay` 和第 29 章的 `PhaseAnimator`、`KeyframeAnimator` 是更合适的工具。
:::

## 动画与值的更新时机

一个常被忽略的事实：**动画期间，状态值已经是最终值了。**

```swift
struct ValueDuringAnimation: View {
    @State private var width: CGFloat = 100

    var body: some View {
        VStack(spacing: 20) {
            Rectangle()
                .fill(.teal)
                .frame(width: width, height: 40)

            Text("状态里的 width = \(Int(width))")

            Button("变宽") {
                withAnimation(.linear(duration: 2)) {
                    width = width == 100 ? 300 : 100
                }
            }
        }
    }
}
```

点击后，文字**立刻**显示 300，而矩形花了两秒才长到 300。

状态是瞬间跳变的。动画是 SwiftUI 在**渲染层面**对视觉属性做的插值，你的状态和 `body` 并不知道中间值。`body` 只被调用了一次（用新状态），而不是每帧一次。这也是 SwiftUI 动画高效的原因。

如果你需要在动画过程中拿到中间值（比如让一个数字跟着滚动），需要用到 `Animatable`，第 29 章讲。

## 尊重“减弱动态效果”

有些用户对屏幕上的运动敏感，会在系统设置里开启“减弱动态效果”。应用应该尊重这个设置：

```swift
struct ReduceMotionDemo: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isShown = false

    var body: some View {
        VStack(spacing: 24) {
            if isShown {
                Text("新消息")
                    .padding()
                    .background(.blue, in: .capsule)
                    .foregroundStyle(.white)
                    .transition(reduceMotion ? .opacity : .move(edge: .top).combined(with: .opacity))
            }

            Button("切换") {
                withAnimation(reduceMotion ? .easeInOut(duration: 0.2) : .bouncy) {
                    isShown.toggle()
                }
            }
        }
        .frame(height: 160)
    }
}
```

原则：

- 开启减弱动态效果时，把**大幅度的位移、缩放、旋转、弹跳、视差**替换成简单的淡入淡出，或者干脆不要动画。
- 颜色和透明度的渐变通常可以保留。
- 系统组件（导航转场、sheet 等）已经自动处理了，你只需要处理自己写的动画。

可以封装成一个小工具，全应用通用：

```swift
extension Animation {
    /// 开启“减弱动态效果”时退化为一个短促的淡入淡出。
    func respecting(reduceMotion: Bool) -> Animation {
        reduceMotion ? .easeInOut(duration: 0.2) : self
    }
}
```

## 排查“动画不生效”

把这一章的内容整理成一份检查清单：

1. **状态变化被动画包住了吗？** 用了 `withAnimation`，或者视图上有 `.animation(_:value:)`，或者绑定带了 `.animation()`？
2. **`.animation` 的 `value` 对吗？** 它监视的值真的变了吗？
3. **视图身份保持住了吗？** 有没有 `if/else`、变化的 `.id()`、不稳定的 `ForEach` id？
4. **这个属性能插值吗？** 文字内容、图片内容不能自动动。
5. **`.animation` 的位置对吗？** 它只影响写在它前面的修饰符。
6. **动画被谁关掉了吗？** 上层有没有 `.animation(nil, value:)` 或 `disablesAnimations`？
7. **是不是其实在动，只是太快或变化太小？** 临时改成 `.linear(duration: 3)` 看看。

第 7 条是很好用的调试技巧。模拟器的 **Debug › Slow Animations** 菜单也能把所有动画放慢。

## 常见误区

**误区一：“动画是一段要播放的过程。”** 动画是两个状态之间的插值。你描述状态，SwiftUI 补出过程。

**误区二：“用 `if/else` 切换两种外观，再加 `withAnimation`。”** `if/else` 产生两个不同的视图，只能淡入淡出。用同一个视图加参数化的修饰符。

**误区三：“`.animation(.default)` 不带 value 更省事。”** 它会给所有变化加动画，包括你不想要的。永远带上 `value`。

**误区四：“动画过程中状态值是渐变的。”** 状态瞬间变为最终值，只有渲染在插值。

**误区五：“`.animation` 加在最外层就能管住所有东西。”** 它管的是它前面的修饰符和里面的子视图。写在它后面的修饰符不受影响。

**误区六：“所有变化都应该有动画。”** 动画要有目的：引导注意力、说明因果关系、提供反馈。无意义的动画只会拖慢用户。

## 小结

- SwiftUI 动画是状态变化时对视觉属性的自动插值。你描述两个状态，框架生成中间帧，所以动画天然可以被打断。
- `withAnimation` 从状态变化的源头指定动画；`.animation(_:value:)` 从视图一侧指定动画；`$binding.animation()` 给绑定附加动画。
- 能插值的数值属性（位置、尺寸、变换、颜色、透明度）和布局变化都能动；内容替换和视图增删属于转场。
- **只有身份不变的视图才能在两个状态间做动画。**
- 动画信息通过事务沿视图树向下传播。`.animation` 修饰符改写经过的事务，只影响它前面的修饰符；`.animation(_:body:)` 能精确限定范围。
- 状态瞬间变为终值，插值只发生在渲染层。
- 检查 `accessibilityReduceMotion`，为敏感用户提供更平静的替代方案。

## 练习

1. 做一个“点赞”按钮：点击后心形图标从空心变实心、变红、放大再回到原大小。先只用一个 `withAnimation` 实现变色，再想办法实现“放大再缩回”（提示：完成回调，或者等学完第 29 章用 `PhaseAnimator`）。
2. 做一个可展开的卡片：收起时只显示标题，展开时显示标题和三行详情。要求卡片高度平滑变化，下面的其他内容被平滑地推开。
3. 写一个进度条组件 `ProgressBar(value:)`。无论外部怎么修改 `value`（带不带 `withAnimation`），进度条都要平滑过渡。它应该用显式动画还是隐式动画？
4. 下面的代码点击后颜色是瞬间变化的。找出原因，给出两种修复方法：

```swift nocheck
Circle()
    .frame(width: 80, height: 80)
    .scaleEffect(isOn ? 1.2 : 1)
    .animation(.spring, value: isOn)
    .foregroundStyle(isOn ? .red : .blue)
```

## 官方文档

- [Animations（专题总览）](https://developer.apple.com/documentation/swiftui/animations)
- [`withAnimation(_:_:)`](https://developer.apple.com/documentation/swiftui/withanimation(_:_:))
- [`withAnimation(_:completionCriteria:_:completion:)`](https://developer.apple.com/documentation/swiftui/withanimation(_:completioncriteria:_:completion:))
- [`animation(_:value:)`](https://developer.apple.com/documentation/swiftui/view/animation(_:value:))
- [`animation(_:body:)`](https://developer.apple.com/documentation/swiftui/view/animation(_:body:))
- [`Animation`](https://developer.apple.com/documentation/swiftui/animation)
- [`Transaction`](https://developer.apple.com/documentation/swiftui/transaction)
- [`withTransaction(_:_:)`](https://developer.apple.com/documentation/swiftui/withtransaction(_:_:))
- [`transaction(_:)`](https://developer.apple.com/documentation/swiftui/view/transaction(_:))
- [Unifying your app's animations](https://developer.apple.com/documentation/swiftui/unifying-your-app-s-animations)
- [`accessibilityReduceMotion`](https://developer.apple.com/documentation/swiftui/environmentvalues/accessibilityreducemotion)
- [WWDC23：Explore SwiftUI animation](https://developer.apple.com/videos/play/wwdc2023/10156/)
- [Human Interface Guidelines：Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
