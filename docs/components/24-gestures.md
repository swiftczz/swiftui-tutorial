# 24 手势

## 本章目标

- 掌握五种基础手势：点击、长按、拖拽、缩放、旋转
- 理解手势的三个阶段，分清 `@GestureState` 和 `@State` 的用途
- 会组合手势：同时、依次、互斥
- 处理手势之间的优先级和冲突
- 控制视图的点击区域
- 了解指针（鼠标、触控板）相关的交互：悬停、指针样式
- 给交互加上触感反馈

## 先说一句：能用控件就别用手势

SwiftUI 的手势 API 很好用，以至于容易被滥用。在动手之前先问一句：**这个交互是不是已经有现成的控件了？**

| 想做的事 | 应该用 |
| --- | --- |
| 点一下执行操作 | `Button`（第 15 章） |
| 点一下跳转页面 | `NavigationLink` |
| 开关 | `Toggle` |
| 长按弹出菜单 | `.contextMenu` |
| 列表行左滑操作 | `.swipeActions` |
| 拖动排序 | `.onMove`、`.reorderable()` |
| 下拉刷新 | `.refreshable` |
| 拖放数据 | `.draggable` / `.dropDestination`（第 25 章） |

控件自带按下反馈、辅助功能、键盘操作和平台适配，手势一样都没有。手势用于那些**没有现成控件**的交互：拖动一张卡片、捏合缩放一张图片、在画布上画画。

## 点击

```swift
struct TapGestures: View {
    @State private var message = "试试点击"
    @State private var location = CGPoint.zero

    var body: some View {
        VStack(spacing: 20) {
            Text(message)

            RoundedRectangle(cornerRadius: 16)
                .fill(.blue.opacity(0.2))
                .frame(height: 80)
                .overlay { Text("单击 / 双击") }
                .onTapGesture(count: 2) { message = "双击" }
                .onTapGesture { message = "单击" }

            RoundedRectangle(cornerRadius: 16)
                .fill(.green.opacity(0.2))
                .frame(height: 120)
                .overlay {
                    Circle().fill(.green).frame(width: 16, height: 16).position(location)
                }
                .onTapGesture { point in
                    location = point
                    message = "点在 (\(Int(point.x)), \(Int(point.y)))"
                }
        }
        .padding()
    }
}
```

- `onTapGesture(count:)` 指定点击次数。同时需要单击和双击时，**双击写在前面**，这样系统会先等一下看是不是双击。
- 闭包带一个 `CGPoint` 参数的版本可以拿到点击位置，坐标默认在视图自己的坐标系里。

## 长按

```swift
struct LongPressDemo: View {
    @State private var isPressing = false
    @State private var isCompleted = false

    var body: some View {
        Circle()
            .fill(isCompleted ? .green : .blue)
            .frame(width: 100, height: 100)
            .scaleEffect(isPressing ? 1.3 : 1)
            .animation(.easeInOut(duration: 0.3), value: isPressing)
            .onLongPressGesture(minimumDuration: 1) {
                isCompleted.toggle()                 // 按满 1 秒后触发
            } onPressingChanged: { pressing in
                isPressing = pressing                // 按下和松开时都会调用
            }
    }
}
```

`onPressingChanged` 让你在长按**过程中**给出反馈，比如让视图逐渐变大，暗示“继续按住”。

## 手势的一般形式

上面的 `onTapGesture`、`onLongPressGesture` 是便捷写法。完整的形式是：创建一个手势值，配置它的回调，再用 `.gesture()` 附加到视图上。

```swift
struct GestureAnatomy: View {
    @State private var offset = CGSize.zero

    var body: some View {
        let drag = DragGesture()
            .onChanged { value in
                offset = value.translation            // 手指移动的过程中持续调用
            }
            .onEnded { _ in
                withAnimation(.spring) {
                    offset = .zero                    // 松手时调用
                }
            }

        return Circle()
            .fill(.orange)
            .frame(width: 80, height: 80)
            .offset(offset)
            .gesture(drag)
    }
}
```

每个手势有三个回调：

| 回调 | 调用时机 | 典型用途 |
| --- | --- | --- |
| `.updating($state) { value, state, transaction in }` | 手势进行中，值变化时 | 更新**临时**状态，手势结束后自动复位 |
| `.onChanged { value in }` | 手势进行中，值变化时 | 更新普通状态 |
| `.onEnded { value in }` | 手势成功结束时 | 提交最终结果 |

## @GestureState：手势期间的临时状态

上面的例子里，松手后要自己把 `offset` 归零。`@GestureState` 把这件事自动化了：**它只在手势进行期间有值，手势一结束就自动回到初始值。**

```swift
struct GestureStateDemo: View {
    @GestureState private var dragOffset = CGSize.zero

    var body: some View {
        Circle()
            .fill(.purple)
            .frame(width: 80, height: 80)
            .offset(dragOffset)
            .animation(.spring, value: dragOffset == .zero)
            .gesture(
                DragGesture()
                    .updating($dragOffset) { value, state, _ in
                        state = value.translation
                    }
            )
    }
}
```

`.updating` 的闭包有三个参数：手势当前的值、要更新的状态（`inout`）、当前的事务（可以用来指定动画）。

`@GestureState` 还有一个重要的优点：**手势被系统打断时也会复位**。来电、弹出通知、切换应用都可能中断一个进行中的手势。这时 `onEnded` **不会**被调用，如果你用 `@State` 并且在 `onEnded` 里做清理，视图就会卡在半途中的状态。`@GestureState` 没有这个问题。

### 常见的组合：临时偏移加累计位置

拖动之后希望视图留在新位置，需要两个状态配合：

```swift
struct PersistentDrag: View {
    @State private var position = CGSize.zero            // 已经确定的位置
    @GestureState private var dragOffset = CGSize.zero   // 正在进行的拖动

    var body: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(.teal)
            .frame(width: 100, height: 100)
            .offset(x: position.width + dragOffset.width, y: position.height + dragOffset.height)
            .gesture(
                DragGesture()
                    .updating($dragOffset) { value, state, _ in
                        state = value.translation
                    }
                    .onEnded { value in
                        position.width += value.translation.width
                        position.height += value.translation.height
                    }
            )
    }
}
```

显示位置 = 已确定的位置 + 当前拖动的偏移。拖动中只改 `dragOffset`；松手时把偏移累加进 `position`，同时 `dragOffset` 自动归零。两者之和在松手的瞬间保持不变，所以视图不会跳动。

## 拖拽手势

`DragGesture` 的值提供了丰富的信息：

```swift
struct DragInfo: View {
    @State private var info = "拖动下面的区域"

    var body: some View {
        VStack {
            Text(info)
                .font(.caption.monospaced())
                .frame(height: 80)

            RoundedRectangle(cornerRadius: 16)
                .fill(.gray.opacity(0.2))
                .frame(height: 200)
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            info = """
                            起点 (\(Int(value.startLocation.x)), \(Int(value.startLocation.y)))
                            当前 (\(Int(value.location.x)), \(Int(value.location.y)))
                            位移 (\(Int(value.translation.width)), \(Int(value.translation.height)))
                            速度 (\(Int(value.velocity.width)), \(Int(value.velocity.height)))
                            """
                        }
                )
        }
        .padding()
    }
}
```

| 属性 | 含义 |
| --- | --- |
| `startLocation` | 手指按下的位置 |
| `location` | 手指当前位置 |
| `translation` | 从起点到当前的位移 |
| `velocity` | 当前速度（点/秒） |
| `predictedEndLocation`、`predictedEndTranslation` | 如果现在松手，按惯性会停在哪 |

`minimumDistance` 是手指移动多远才算开始拖动，默认 10 点。设为 0 可以在手指按下的瞬间就响应。

### 实战：可以划走的卡片

```swift
struct SwipeCard: View {
    @State private var offset = CGSize.zero
    @State private var isGone = false

    private var rotation: Angle { .degrees(Double(offset.width) / 20) }
    private var likeOpacity: Double { min(max(Double(offset.width) / 100, 0), 1) }
    private var nopeOpacity: Double { min(max(Double(-offset.width) / 100, 0), 1) }

    var body: some View {
        VStack(spacing: 30) {
            if !isGone {
                RoundedRectangle(cornerRadius: 24)
                    .fill(.indigo.gradient)
                    .frame(width: 240, height: 320)
                    .overlay(alignment: .topLeading) {
                        Text("喜欢").font(.title.bold()).foregroundStyle(.green).padding().opacity(likeOpacity)
                    }
                    .overlay(alignment: .topTrailing) {
                        Text("跳过").font(.title.bold()).foregroundStyle(.red).padding().opacity(nopeOpacity)
                    }
                    .rotationEffect(rotation)
                    .offset(offset)
                    .gesture(
                        DragGesture()
                            .onChanged { offset = $0.translation }
                            .onEnded { value in
                                let predicted = value.predictedEndTranslation.width
                                if abs(predicted) > 250 {
                                    withAnimation(.easeOut(duration: 0.3)) {
                                        offset.width = predicted > 0 ? 600 : -600      // 飞出屏幕
                                    } completion: {
                                        isGone = true
                                    }
                                } else {
                                    withAnimation(.spring(duration: 0.4, bounce: 0.3)) {
                                        offset = .zero                                 // 弹回原位
                                    }
                                }
                            }
                    )
            }

            Button("重置") {
                offset = .zero
                isGone = false
            }
        }
    }
}
```

这个例子里的几个要点：

- **旋转角度和提示文字的透明度都是 `offset` 的派生值**，用计算属性。没有额外的状态。
- 用 `predictedEndTranslation` 而不是 `translation` 来判断是否划走。这样用户快速轻扫一下也能划走，手感更自然。
- 松手后的动画用弹簧（第 27 章会讲为什么手势结束后弹簧最合适）。

## 缩放与旋转

```swift
struct MagnifyRotateDemo: View {
    @State private var scale = 1.0
    @State private var angle = Angle.zero
    @GestureState private var gestureScale = 1.0
    @GestureState private var gestureAngle = Angle.zero

    var body: some View {
        Image(systemName: "photo.artframe")
            .font(.system(size: 120))
            .foregroundStyle(.pink.gradient)
            .scaleEffect(scale * gestureScale)
            .rotationEffect(angle + gestureAngle)
            .gesture(
                MagnifyGesture()
                    .updating($gestureScale) { value, state, _ in
                        state = value.magnification
                    }
                    .onEnded { value in
                        scale = min(max(scale * value.magnification, 0.5), 4)
                    }
                    .simultaneously(with:
                        RotateGesture()
                            .updating($gestureAngle) { value, state, _ in
                                state = value.rotation
                            }
                            .onEnded { value in
                                angle += value.rotation
                            }
                    )
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
```

- `MagnifyGesture` 的 `magnification` 是相对于手势开始时的缩放倍数，从 1 开始。
- `RotateGesture` 的 `rotation` 是相对于手势开始时旋转的角度。
- 两者都是双指手势。在模拟器里按住 <kbd>⌥ Option</kbd> 拖动可以模拟双指。在 Mac 上用触控板的双指捏合和旋转。

模式和上面的“临时偏移加累计位置”完全一样，只是加法换成了乘法（缩放）。

## 组合手势

三种组合方式：

| 组合 | 写法 | 含义 |
| --- | --- | --- |
| 同时 | `a.simultaneously(with: b)` | 两个手势同时识别 |
| 依次 | `a.sequenced(before: b)` | a 成功之后才开始识别 b |
| 互斥 | `a.exclusively(before: b)` | 只识别一个，a 优先 |

上面的缩放加旋转是“同时”。下面是“依次”的典型例子：**长按之后才能拖动**，就像在主屏幕上移动图标。

```swift
struct LongPressThenDrag: View {
    enum DragState {
        case inactive
        case pressing
        case dragging(translation: CGSize)

        var translation: CGSize {
            if case .dragging(let translation) = self { translation } else { .zero }
        }

        var isActive: Bool {
            if case .inactive = self { false } else { true }
        }
    }

    @GestureState private var dragState = DragState.inactive
    @State private var position = CGSize.zero

    var body: some View {
        let gesture = LongPressGesture(minimumDuration: 0.4)
            .sequenced(before: DragGesture())
            .updating($dragState) { value, state, _ in
                switch value {
                case .first(true):
                    state = .pressing                                           // 长按识别中
                case .second(true, let drag):
                    state = .dragging(translation: drag?.translation ?? .zero)  // 长按成功，进入拖动
                default:
                    state = .inactive
                }
            }
            .onEnded { value in
                guard case .second(true, let drag?) = value else { return }
                position.width += drag.translation.width
                position.height += drag.translation.height
            }

        return RoundedRectangle(cornerRadius: 18)
            .fill(dragState.isActive ? .orange : .blue)
            .frame(width: 90, height: 90)
            .scaleEffect(dragState.isActive ? 1.15 : 1)
            .shadow(radius: dragState.isActive ? 12 : 0)
            .offset(x: position.width + dragState.translation.width,
                    y: position.height + dragState.translation.height)
            .animation(.snappy, value: dragState.isActive)
            .gesture(gesture)
    }
}
```

组合手势的值是一个枚举：`.first(...)` 表示第一个手势正在进行，`.second(..., ...)` 表示第一个已完成、第二个正在进行。用枚举 `DragState` 把手势的各个阶段表示成状态，界面的缩放、颜色、阴影都从这个状态派生出来。

## 优先级与冲突

当父视图和子视图都有手势，或者同一个视图有多个手势时，谁先响应？

默认规则：**子视图的手势优先于父视图的手势。**

```swift
struct GesturePriority: View {
    @State private var log = "点击内层方块"

    var body: some View {
        VStack(spacing: 20) {
            Text(log)

            HStack(spacing: 20) {
                NestedBox(title: "默认", mode: .normal, log: $log)
                NestedBox(title: "高优先级", mode: .highPriority, log: $log)
                NestedBox(title: "同时", mode: .simultaneous, log: $log)
            }
        }
        .padding()
    }
}

struct NestedBox: View {
    enum Mode { case normal, highPriority, simultaneous }

    let title: String
    let mode: Mode
    @Binding var log: String

    var body: some View {
        let outerTap = TapGesture().onEnded { log += "，外层也响应了" }

        RoundedRectangle(cornerRadius: 12)
            .fill(.blue.opacity(0.15))
            .frame(width: 100, height: 100)
            .overlay {
                RoundedRectangle(cornerRadius: 8)
                    .fill(.blue)
                    .frame(width: 50, height: 50)
                    .onTapGesture { log = "\(title)：内层响应" }
            }
            .overlay(alignment: .bottom) { Text(title).font(.caption2) }
            .gesture(outerTap, isEnabled: mode == .normal)
            .highPriorityGesture(outerTap, isEnabled: mode == .highPriority)
            .simultaneousGesture(outerTap, isEnabled: mode == .simultaneous)
    }
}
```

点击每个盒子中央的深色方块，观察上方的文字：“默认”只有内层响应；“高优先级”只有外层响应（文字会在上一次的内容后面追加）；“同时”两者都响应。

| 修饰符 | 行为 |
| --- | --- |
| `.gesture(_:)` | 普通优先级。子视图的手势优先 |
| `.highPriorityGesture(_:)` | 这个手势优先于子视图的手势 |
| `.simultaneousGesture(_:)` | 这个手势和子视图的手势同时识别 |

### 与 ScrollView 的冲突

在 `ScrollView` 里的视图上加 `DragGesture`，会和滚动抢手势。常用的处理方式：

- **拖拽方向与滚动方向垂直**时（比如竖向列表里的横向滑动），通常能自动协调。可以增大 `minimumDistance` 让滚动先判断。
- **需要长按后才拖动**的，用上面的 `LongPressGesture.sequenced(before: DragGesture())`，这样普通的滑动仍然是滚动。
- 手势进行中临时禁用滚动：`.scrollDisabled(isDragging)`。

### 临时禁用手势

`.gesture(_:isEnabled:)` 可以根据条件启用或禁用手势，而不改变视图结构：

```swift
struct ConditionalGesture: View {
    @State private var isLocked = false
    @State private var offset = CGSize.zero

    var body: some View {
        VStack(spacing: 20) {
            Circle()
                .fill(isLocked ? .gray : .green)
                .frame(width: 70, height: 70)
                .offset(offset)
                .gesture(
                    DragGesture().onChanged { offset = $0.translation },
                    isEnabled: !isLocked
                )

            Toggle("锁定", isOn: $isLocked).fixedSize()
        }
    }
}
```

## 点击区域

### contentShape：定义可点击的形状

默认情况下，视图只有**画出来的部分**能响应点击。一个 `HStack` 里文字和图标之间的空白是点不到的。

```swift
struct ContentShapeDemo: View {
    @State private var count = 0

    var body: some View {
        VStack(spacing: 16) {
            Text("点了 \(count) 次")

            HStack {
                Text("没有 contentShape")
                Spacer()
                Image(systemName: "chevron.right")
            }
            .padding()
            .border(.gray)
            .onTapGesture { count += 1 }           // 中间的空白点不到

            HStack {
                Text("有 contentShape")
                Spacer()
                Image(systemName: "chevron.right")
            }
            .padding()
            .border(.gray)
            .contentShape(.rect)                   // 整个矩形都可点
            .onTapGesture { count += 1 }
        }
        .padding()
    }
}
```

`.contentShape(_:)` 指定“这个视图的哪块区域算作它的内容”，用于命中测试。它也可以用来**扩大**点击区域（小图标配一个更大的点击范围）或者定义**非矩形**的点击区域（圆形按钮只有圆内可点）。

::: tip 最小点击尺寸
Apple 的人机界面指南建议，iOS 上可点击元素的尺寸至少为 44 × 44 点。图标本身可以很小，但要用 `.frame(minWidth: 44, minHeight: 44)` 和 `.contentShape(.rect)` 保证点击区域足够大。
:::

### allowsHitTesting：让视图“透明”

```swift
struct HitTestingDemo: View {
    @State private var count = 0

    var body: some View {
        ZStack {
            Button("下层的按钮：\(count)") { count += 1 }
                .buttonStyle(.borderedProminent)

            Text("我是覆盖在上面的水印")
                .font(.title3.bold())
                .foregroundStyle(.red.opacity(0.4))
                .rotationEffect(.degrees(-15))
                .allowsHitTesting(false)           // 点击穿透到下层
        }
        .padding(40)
    }
}
```

`.allowsHitTesting(false)` 让一个视图及其子视图不参与命中测试，点击会“穿过”它落到下面的视图上。用于装饰性的覆盖层。

## 指针交互（Mac、iPad 接触控板）

鼠标和触控板带来了触屏没有的状态：**悬停**。

```swift
struct HoverDemo: View {
    @State private var isHovering = false
    @State private var location = CGPoint.zero

    var body: some View {
        VStack(spacing: 20) {
            Text("把指针移上来")
                .padding()
                .background(isHovering ? .blue : .gray.opacity(0.2), in: .rect(cornerRadius: 10))
                .foregroundStyle(isHovering ? .white : .primary)
                .onHover { hovering in
                    isHovering = hovering
                }
                .animation(.easeOut(duration: 0.15), value: isHovering)

            RoundedRectangle(cornerRadius: 12)
                .fill(.gray.opacity(0.15))
                .frame(height: 120)
                .overlay {
                    Circle().fill(.orange).frame(width: 20, height: 20).position(location)
                }
                .onContinuousHover { phase in
                    if case .active(let point) = phase {
                        location = point
                    }
                }
        }
        .padding()
    }
}
```

- `.onHover` 在指针进入和离开时调用。
- `.onContinuousHover` 持续报告指针位置。
- macOS 上可以用 `.pointerStyle(_:)` 改变指针的形状（比如在可拖动的分隔条上显示调整大小的箭头）。
- iPadOS 上 `.hoverEffect(_:)` 让视图在指针悬停时高亮或抬起。

在 iPhone 上这些回调不会被触发，写了也没有副作用。所以多平台代码里可以放心地加悬停效果。

右键点击不需要专门的手势：`.contextMenu`（第 15 章）在 Mac 上响应右键，在 iOS 上响应长按。

## 指定输入来源 <Badge type="tip" text="iOS 27+ / macOS 27+" />

27 系列让你可以指定一个手势只响应某些输入方式。各个手势的初始化器都增加了 `inputKinds` 参数：

```swift
@available(iOS 27, macOS 27, *)
struct InputKindsDemo: View {
    @State private var points: [CGPoint] = []

    var body: some View {
        Canvas { context, _ in
            var path = Path()
            path.addLines(points)
            context.stroke(path, with: .color(.blue), lineWidth: 3)
        }
        .background(.gray.opacity(0.1))
        .gesture(
            DragGesture(minimumDistance: 0, inputKinds: .pencil)      // 只响应 Apple Pencil
                .onChanged { points.append($0.location) }
        )
    }
}
```

| 输入类型 | 含义 |
| --- | --- |
| `.directTouch` | 手指直接触摸屏幕 |
| `.indirectTouch` | 间接触摸，如触控板上的手势 |
| `.pencil` | Apple Pencil |
| `.pointer` | 鼠标或触控板的指针点击 |
| `.all` | 全部（默认） |

这让“笔用来画，手指用来滚动”这种绘图应用里的经典交互变得很简单。

## 触感反馈

好的手势交互伴随着恰当的触感。`.sensoryFeedback` 在某个值变化时触发反馈：

```swift
struct HapticDemo: View {
    @State private var count = 0
    @State private var isOn = false
    @State private var didFail = false

    var body: some View {
        VStack(spacing: 16) {
            Button("加一：\(count)") { count += 1 }
                .sensoryFeedback(.increase, trigger: count)

            Toggle("开关", isOn: $isOn)
                .fixedSize()
                .sensoryFeedback(.selection, trigger: isOn)

            Button("模拟失败") { didFail.toggle() }
                .sensoryFeedback(.error, trigger: didFail)

            Button("按条件决定") { count += 1 }
                .sensoryFeedback(trigger: count) { oldValue, newValue in
                    newValue.isMultiple(of: 5) ? .success : nil
                }
        }
        .padding()
    }
}
```

这又是声明式的写法：你不是“播放一个震动”，而是声明“当这个值变化时应该有这种反馈”。

常用的反馈类型：`.success`、`.warning`、`.error`、`.selection`、`.increase`、`.decrease`、`.impact(weight:intensity:)`、`.start`、`.stop`、`.alignment`、`.levelChange`。

在没有触感引擎的设备上（iPad、大部分 Mac）它不起作用，也不会报错。触感要克制：只在有意义的时刻使用，不要每次点击都震。

## 常见误区

**误区一：“用 `onTapGesture` 做按钮。”** 用 `Button`。它有按下状态、辅助功能和键盘支持。

**误区二：“拖动状态用 `@State`，在 `onEnded` 里归零。”** 手势被系统打断时 `onEnded` 不会调用，视图会卡住。临时状态用 `@GestureState`。

**误区三：“`HStack` 中间的空白点不到。”** 加 `.contentShape(.rect)`。

**误区四：“手势加在了错误的层级上。”** 回忆第 4 章：修饰符的顺序决定了手势作用于哪个范围。`.padding()` 之前加的手势不包含内边距区域，之后加的才包含。

**误区五：“在 `onChanged` 里做昂贵的计算。”** 它每一帧都可能被调用。只在里面更新简单的状态。

**误区六：“先 `.offset` 再加手势，结果点击位置对不上。”** `offset` 只移动绘制位置。手势加在 `offset` 之后，响应区域就跟着视图走；加在之前，响应区域留在原位。通常应该把手势加在 `offset` **之后**。

## 小结

- 有现成控件的交互不要用手势实现。
- 五种基础手势：`TapGesture`、`LongPressGesture`、`DragGesture`、`MagnifyGesture`、`RotateGesture`。
- 手势有 `updating`、`onChanged`、`onEnded` 三个回调。`@GestureState` 用于手势期间的临时状态，会自动复位，被打断时也是。
- “临时值加累计值”是处理拖动、缩放、旋转的通用模式。
- 手势可以同时、依次、互斥地组合；`highPriorityGesture` 和 `simultaneousGesture` 调整父子视图之间的优先级。
- `contentShape` 定义点击区域，`allowsHitTesting(false)` 让点击穿透。
- `onHover` 处理指针悬停；27 系列的 `inputKinds` 可以限定输入来源；`sensoryFeedback` 提供触感反馈。

## 练习

1. 做一个可以拖动的悬浮球：松手后自动吸附到屏幕左边缘或右边缘（看离哪边近），带弹簧动画。
2. 做一个图片查看器：支持捏合缩放（限制在 1 到 5 倍）、放大后可以拖动平移、双击在 1 倍和 2.5 倍之间切换。
3. 做一个底部抽屉：有“收起”“半开”“全开”三个档位，可以上下拖动，松手后根据位置和速度吸附到最近的档位。
4. 做一个滑动解锁条：把滑块从左拖到最右才算解锁，中途松手会弹回。解锁成功时触发 `.success` 触感。

## 官方文档

- [Gestures（专题总览）](https://developer.apple.com/documentation/swiftui/gestures)
- [Adding interactivity with gestures](https://developer.apple.com/documentation/swiftui/adding-interactivity-with-gestures)
- [Composing SwiftUI gestures](https://developer.apple.com/documentation/swiftui/composing-swiftui-gestures)
- [`Gesture` 协议](https://developer.apple.com/documentation/swiftui/gesture)
- [`GestureState`](https://developer.apple.com/documentation/swiftui/gesturestate)
- [`TapGesture`](https://developer.apple.com/documentation/swiftui/tapgesture)
- [`LongPressGesture`](https://developer.apple.com/documentation/swiftui/longpressgesture)
- [`DragGesture`](https://developer.apple.com/documentation/swiftui/draggesture)
- [`MagnifyGesture`](https://developer.apple.com/documentation/swiftui/magnifygesture)
- [`RotateGesture`](https://developer.apple.com/documentation/swiftui/rotategesture)
- [`GestureInputKinds`](https://developer.apple.com/documentation/swiftui/gestureinputkinds)
- [`contentShape(_:eoFill:)`](https://developer.apple.com/documentation/swiftui/view/contentshape(_:eofill:))
- [`onHover(perform:)`](https://developer.apple.com/documentation/swiftui/view/onhover(perform:))
- [`sensoryFeedback(_:trigger:)`](https://developer.apple.com/documentation/swiftui/view/sensoryfeedback(_:trigger:))
- [`SensoryFeedback`](https://developer.apple.com/documentation/swiftui/sensoryfeedback)
- [Human Interface Guidelines：Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)
