# 18 ScrollView 深入

## 本章目标

- 用 `ScrollPosition` 读取和控制滚动位置
- 实现分页与吸附滚动
- 用 `contentMargins` 正确处理滚动内容的边距
- 监听滚动：几何变化、滚动阶段、可见性
- 理解滚动内容的裁剪与溢出
- 了解 26 系列的滚动边缘效果

第 7 章学了 `ScrollView` 的基础。这一章讲它的全部能力。这些 API 大多是 iOS 17 / macOS 14 及之后加入的，它们让 SwiftUI 的滚动视图从“只能滚”变成了一个可以精确控制的组件。

## 滚动位置也是状态

“滚动到某个位置”是一个命令式的动作。按 SwiftUI 的思路，它应该被表达成状态：**滚动位置是一个值，读它知道滚到了哪，改它就滚过去。**

### 按 id 定位

```swift
struct ScrollPositionByID: View {
    @State private var scrolledID: Int?

    var body: some View {
        VStack {
            HStack {
                Button("到顶部") { withAnimation { scrolledID = 0 } }
                Button("到第 50 项") { withAnimation { scrolledID = 50 } }
                Button("到底部") { withAnimation { scrolledID = 99 } }
            }
            .buttonStyle(.bordered)

            Text("当前最靠上的是第 \(scrolledID ?? 0) 项")
                .font(.caption)

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(0..<100, id: \.self) { index in
                        Text("第 \(index) 项")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(.quaternary, in: .rect(cornerRadius: 8))
                    }
                }
                .scrollTargetLayout()
                .padding(.horizontal)
            }
            .scrollPosition(id: $scrolledID)
        }
    }
}
```

三个要素缺一不可：

1. `.scrollPosition(id:)` 加在 `ScrollView` 上，绑定一个可选的 id。
2. `.scrollTargetLayout()` 加在**直接包含各个子项的容器**上（这里是 `LazyVStack`），告诉 SwiftUI“这个容器的每个孩子都是一个滚动目标”。
3. 子项要有 id（`ForEach` 提供）。

绑定是双向的：用户手动滚动时，`scrolledID` 自动更新为最靠近顶部的项；你给 `scrolledID` 赋值，视图就滚到那一项。包在 `withAnimation` 里就是带动画地滚过去。

### ScrollPosition 类型 <Badge type="tip" text="iOS 18+ / macOS 15+" />

`ScrollPosition` 是一个更通用的类型，除了按 id，还能按边缘、按偏移量定位：

```swift
struct ScrollPositionValue: View {
    @State private var position = ScrollPosition(edge: .top)

    var body: some View {
        VStack {
            HStack {
                Button("顶部") { withAnimation { position.scrollTo(edge: .top) } }
                Button("底部") { withAnimation { position.scrollTo(edge: .bottom) } }
                Button("y = 600") { withAnimation { position.scrollTo(y: 600) } }
                Button("第 30 项") { withAnimation { position.scrollTo(id: 30, anchor: .center) } }
            }
            .buttonStyle(.bordered)

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(0..<60, id: \.self) { index in
                        Text("第 \(index) 项")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(.quaternary, in: .rect(cornerRadius: 8))
                    }
                }
                .scrollTargetLayout()
                .padding(.horizontal)
            }
            .scrollPosition($position)
        }
    }
}
```

`anchor:` 指定目标项停在可见区域的什么位置：`.top` 贴顶，`.center` 居中，`.bottom` 贴底。

### 默认从哪里开始

聊天界面希望一打开就在最底部：

```swift
struct ChatLikeScroll: View {
    @State private var messages = (1...30).map { "消息 \($0)" }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 8) {
                ForEach(messages, id: \.self) { message in
                    Text(message)
                        .padding(10)
                        .background(.blue.opacity(0.15), in: .rect(cornerRadius: 10))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
        }
        .defaultScrollAnchor(.bottom)
        .safeAreaInset(edge: .bottom) {
            Button("发一条新消息") {
                messages.append("消息 \(messages.count + 1)")
            }
            .buttonStyle(.borderedProminent)
            .padding()
        }
    }
}
```

`.defaultScrollAnchor(.bottom)` 让滚动视图初始位置在底部，并且内容增长时保持贴底。

::: details 旧办法：ScrollViewReader
在 `scrollPosition` 出现之前（iOS 14–16），滚动到指定位置要用 `ScrollViewReader`：

```swift
struct LegacyScrollTo: View {
    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                ForEach(0..<50, id: \.self) { index in
                    Text("第 \(index) 行").id(index)
                }
            }
            .overlay(alignment: .bottomTrailing) {
                Button("到第 40 行") {
                    withAnimation { proxy.scrollTo(40, anchor: .top) }
                }
                .padding()
            }
        }
    }
}
```

它是命令式的（调用 `proxy.scrollTo`），并且不能读出当前位置。新代码用 `scrollPosition`。`ScrollViewReader` 目前仍可用于 `List`。
:::

## 分页与吸附

`scrollTargetBehavior` 控制滚动停下来时落在哪里。

### 整页翻动

```swift
struct PagingScroll: View {
    let colors: [Color] = [.red, .orange, .green, .blue, .purple]

    var body: some View {
        ScrollView(.horizontal) {
            LazyHStack(spacing: 0) {
                ForEach(colors.indices, id: \.self) { index in
                    colors[index]
                        .overlay { Text("第 \(index + 1) 页").font(.largeTitle).foregroundStyle(.white) }
                        .containerRelativeFrame(.horizontal)
                }
            }
        }
        .scrollTargetBehavior(.paging)
        .scrollIndicators(.hidden)
        .frame(height: 220)
    }
}
```

`.paging` 每次滚动一个**滚动视图的宽度**。配合 `.containerRelativeFrame(.horizontal)` 让每页恰好和滚动视图一样宽（第 8 章）。

### 对齐到子项

```swift
struct SnappingCards: View {
    @State private var currentID: Int?

    var body: some View {
        VStack {
            ScrollView(.horizontal) {
                LazyHStack(spacing: 16) {
                    ForEach(0..<10, id: \.self) { index in
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color(hue: Double(index) / 10, saturation: 0.6, brightness: 0.9).gradient)
                            .overlay { Text("\(index)").font(.largeTitle.bold()).foregroundStyle(.white) }
                            .containerRelativeFrame(.horizontal, count: 5, span: 4, spacing: 16)
                            .frame(height: 200)
                    }
                }
                .scrollTargetLayout()
            }
            .contentMargins(.horizontal, 24, for: .scrollContent)
            .scrollTargetBehavior(.viewAligned)
            .scrollPosition(id: $currentID)
            .scrollIndicators(.hidden)

            Text("当前卡片：\(currentID ?? 0)")
        }
    }
}
```

`.viewAligned` 让滚动停下时，某个子项的边缘正好对齐到滚动视图的边缘。它需要 `.scrollTargetLayout()` 来知道哪些是可对齐的目标。

这个例子里每张卡片占容器宽度的 4/5，所以总能露出下一张卡片的一部分，暗示用户可以继续滑动。`.viewAligned(limitBehavior: .always)` 可以限制每次只滚动一个。

需要完全自定义的吸附逻辑（比如按固定间隔吸附），可以实现 `ScrollTargetBehavior` 协议。

## 内容边距：contentMargins

第 7 章提过一个坑：给横向 `ScrollView` 加 `.padding()`，内容会在边缘被切断。正确的工具是 `contentMargins`：

```swift
struct ContentMarginsDemo: View {
    var body: some View {
        VStack(spacing: 24) {
            Text("padding 加在 ScrollView 上：滚动时内容在边缘被切断").font(.caption)
            ScrollView(.horizontal) {
                cards
            }
            .padding(.horizontal, 24)

            Text("contentMargins：首尾留白，滚动时内容可以划到屏幕边缘").font(.caption)
            ScrollView(.horizontal) {
                cards
            }
            .contentMargins(.horizontal, 24, for: .scrollContent)
        }
    }

    private var cards: some View {
        HStack(spacing: 12) {
            ForEach(0..<10, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 12).fill(.teal).frame(width: 120, height: 70)
            }
        }
    }
}
```

`for:` 参数指定边距作用于什么：

| 值 | 作用对象 |
| --- | --- |
| `.scrollContent` | 只影响内容 |
| `.scrollIndicators` | 只影响滚动条 |
| `.automatic` | 两者都影响 |

`contentMargins` 也对 `List`、`Form`、`TextEditor` 有效，可以用来调整它们内容的边距。

## 监听滚动

### 滚动几何：onScrollGeometryChange <Badge type="tip" text="iOS 18+ / macOS 15+" />

读取滚动偏移、内容尺寸、可见区域等：

```swift
struct ScrollOffsetHeader: View {
    @State private var offsetY: CGFloat = 0

    private var headerOpacity: Double {
        min(max(offsetY / 80, 0), 1)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                Text("大标题")
                    .font(.largeTitle.bold())
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .opacity(1 - headerOpacity)

                ForEach(0..<40, id: \.self) { index in
                    Text("内容行 \(index)")
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                    Divider()
                }
            }
        }
        .onScrollGeometryChange(for: CGFloat.self) { geometry in
            geometry.contentOffset.y + geometry.contentInsets.top
        } action: { _, newValue in
            offsetY = newValue
        }
        .overlay(alignment: .top) {
            Text("大标题")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(.bar)
                .opacity(headerOpacity)
        }
    }
}
```

和第 8 章的 `onGeometryChange` 是同一个设计：第一个闭包从 `ScrollGeometry` 里提取你关心的值，第二个闭包在值变化时调用。

`ScrollGeometry` 提供的信息：

| 属性 | 含义 |
| --- | --- |
| `contentOffset` | 当前滚动偏移 |
| `contentSize` | 内容的总尺寸 |
| `contentInsets` | 内容的内边距（包括安全区域） |
| `containerSize` | 滚动视图自身的尺寸 |
| `visibleRect` | 当前可见的内容区域 |

::: warning 只提取需要的值
滚动时偏移量每一帧都在变。如果把原始偏移量存进状态，视图每一帧都要重新计算。尽量在第一个闭包里就把它转换成变化不那么频繁的值。例如只关心“是否滚过了 80 点”，就返回一个 `Bool`：

```swift nocheck
.onScrollGeometryChange(for: Bool.self) { geometry in
    geometry.contentOffset.y > 80
} action: { _, isScrolled in
    showCompactTitle = isScrolled       // 只在跨过阈值时触发一次
}
```
:::

### 滚动阶段：onScrollPhaseChange <Badge type="tip" text="iOS 18+ / macOS 15+" />

知道用户是正在拖动、还是松手后在减速、还是完全静止：

```swift
struct ScrollPhaseDemo: View {
    @State private var phaseText = "静止"
    @State private var isScrolling = false

    var body: some View {
        ScrollView {
            LazyVStack {
                ForEach(0..<50, id: \.self) { Text("行 \($0)").padding(8) }
            }
            .frame(maxWidth: .infinity)
        }
        .onScrollPhaseChange { _, newPhase in
            isScrolling = newPhase.isScrolling
            switch newPhase {
            case .idle: phaseText = "静止"
            case .tracking: phaseText = "手指按住"
            case .interacting: phaseText = "正在拖动"
            case .decelerating: phaseText = "减速中"
            case .animating: phaseText = "程序触发的动画滚动"
            @unknown default: phaseText = "未知"
            }
        }
        .overlay(alignment: .bottomTrailing) {
            Text(phaseText)
                .padding(8)
                .background(.thinMaterial, in: .capsule)
                .padding()
                .opacity(isScrolling ? 1 : 0.4)
        }
    }
}
```

典型用途：滚动时隐藏悬浮按钮，停下后再显示；滚动结束后才加载高清图片。

### 可见性：onScrollVisibilityChange <Badge type="tip" text="iOS 18+ / macOS 15+" />

某个视图是否滚进了可见区域：

```swift
struct VisibilityDemo: View {
    @State private var isVideoVisible = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(0..<8, id: \.self) { Text("上方内容 \($0)").padding() }

                RoundedRectangle(cornerRadius: 12)
                    .fill(isVideoVisible ? .green : .gray)
                    .frame(height: 200)
                    .overlay { Text(isVideoVisible ? "播放中" : "已暂停").foregroundStyle(.white) }
                    .onScrollVisibilityChange(threshold: 0.6) { visible in
                        isVideoVisible = visible
                    }
                    .padding(.horizontal)

                ForEach(0..<8, id: \.self) { Text("下方内容 \($0)").padding() }
            }
        }
    }
}
```

`threshold: 0.6` 表示视图有 60% 以上可见时才算“可见”。适合做视频的自动播放与暂停、曝光统计。

## 裁剪与溢出

`ScrollView` 默认会裁剪超出自身范围的内容。有时这不是你想要的，比如卡片的阴影被切掉了：

```swift
struct ScrollClipDemo: View {
    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 16) {
                ForEach(0..<8, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 16)
                        .fill(.white)
                        .frame(width: 140, height: 90)
                        .shadow(color: .black.opacity(0.25), radius: 10, y: 6)
                }
            }
            .padding(.vertical, 4)
        }
        .contentMargins(.horizontal, 20, for: .scrollContent)
        .scrollClipDisabled()
        .padding(.vertical, 30)
        .background(.gray.opacity(0.15))
    }
}
```

`.scrollClipDisabled()` 关闭裁剪，阴影就能完整显示。

## 其他行为配置

```swift
struct ScrollBehaviors: View {
    var body: some View {
        ScrollView {
            Text("内容很短，不足以滚动")
                .padding()
        }
        .scrollBounceBehavior(.basedOnSize)      // 内容不够长时不回弹
        .scrollIndicators(.visible)              // 始终显示滚动条
        .scrollDisabled(false)                   // 是否禁用滚动
        .frame(height: 200)
        .border(.gray)
    }
}
```

| 修饰符 | 作用 |
| --- | --- |
| `.scrollIndicators(_:)` | 滚动条：`.automatic`、`.visible`、`.hidden`、`.never` |
| `.scrollBounceBehavior(_:)` | 回弹：`.always`、`.basedOnSize`（内容不足一屏时不回弹） |
| `.scrollDisabled(_:)` | 禁用滚动 |
| `.scrollDismissesKeyboard(_:)` | 滚动时收起键盘（第 16 章） |
| `.scrollIndicatorsFlash(trigger:)` | 某个值变化时闪一下滚动条，提示内容可滚动 |

## 滚动边缘效果 <Badge type="tip" text="iOS 26+ / macOS 26+" />

在 Liquid Glass 设计下，工具栏和标签栏是浮在内容上方的半透明玻璃。为了让栏上的文字清晰可读，滚动视图会在靠近这些栏的边缘自动加一层渐隐或模糊，这叫**滚动边缘效果**。

```swift
@available(iOS 26, macOS 26, *)
struct EdgeEffectDemo: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(0..<40, id: \.self) { index in
                        Color(hue: Double(index) / 40, saturation: 0.5, brightness: 0.9)
                            .frame(height: 60)
                    }
                }
            }
            .scrollEdgeEffectStyle(.hard, for: .top)       // 顶部用硬边缘
            .navigationTitle("边缘效果")
        }
    }
}
```

- `.scrollEdgeEffectStyle(.soft, for:)`：柔和的渐隐。iOS 的默认。
- `.scrollEdgeEffectStyle(.hard, for:)`：有明确分界的效果。macOS 上更常见，适合内容密集的界面。
- `.scrollEdgeEffectHidden(true, for:)`：关闭某个边缘的效果。

第 8 章提到的 `safeAreaBar` 放置的自定义栏也会参与这个效果。第 23 章讲 Liquid Glass 时会把这些串起来。

## 滚动驱动的视觉效果

让子项在滚进滚出时产生缩放、淡入、视差等效果，用 `.scrollTransition`。这是一个动画话题，第 30 章详细讲，这里先看一眼：

```swift
struct ScrollTransitionPeek: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(0..<20, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(hue: Double(index) / 20, saturation: 0.6, brightness: 0.9))
                        .frame(height: 120)
                        .scrollTransition { content, phase in
                            content
                                .opacity(phase.isIdentity ? 1 : 0.3)
                                .scaleEffect(phase.isIdentity ? 1 : 0.85)
                        }
                }
            }
            .padding()
        }
    }
}
```

## 常见误区

**误区一：“`scrollPosition(id:)` 不工作。”** 检查是否在子项的直接容器上加了 `.scrollTargetLayout()`。

**误区二：“把滚动偏移量直接存进 `@State` 驱动界面。”** 每一帧都触发视图更新。在 `onScrollGeometryChange` 的第一个闭包里就转换成变化不频繁的值，或者用 `scrollTransition`、`visualEffect` 这类不经过状态的方式。

**误区三：“给 `ScrollView` 加 `padding` 做内容边距。”** 会让内容在边缘被切。用 `contentMargins`。

**误区四：“`.paging` 的页宽不对。”** `.paging` 按滚动视图自身的尺寸翻页。每一页要用 `containerRelativeFrame` 设成和滚动视图一样大，并且页间距设为 0。

**误区五：“用 `GeometryReader` 加偏好来读滚动偏移。”** 这是 iOS 18 之前的老办法，写起来繁琐且有性能问题。能用 `onScrollGeometryChange` 就用它。

## 小结

- 滚动位置是状态：`scrollPosition` 可读可写，配合 `scrollTargetLayout` 使用；`defaultScrollAnchor` 设定初始位置。
- `scrollTargetBehavior(.paging)` 整页翻动，`.viewAligned` 对齐到子项。
- `contentMargins` 给滚动内容加边距而不裁剪内容。
- `onScrollGeometryChange` 读几何信息，`onScrollPhaseChange` 读滚动阶段，`onScrollVisibilityChange` 读可见性。
- `scrollClipDisabled` 允许内容（如阴影）溢出。
- 26 系列的滚动边缘效果让浮动的玻璃栏下方的内容自动渐隐。

## 练习

1. 做一个横向的图片轮播：整页翻动，底部有一排圆点指示当前页，点击圆点可以跳转到对应页。
2. 做一个“回到顶部”按钮：滚动超过 300 点后从右下角出现，点击后带动画回到顶部。
3. 做一个带吸附效果的日期选择条：横向排列 30 天，每次滚动停下时都有一天正好居中，居中的那天高亮显示。
4. 做一个带视差效果的头部：顶部一张大图，向下滚动时图片以一半的速度移动，向上过度拖拽时图片放大。（提示：`onScrollGeometryChange` 读偏移，或者学完第 30 章后用 `visualEffect`。）

## 官方文档

- [`ScrollView`](https://developer.apple.com/documentation/swiftui/scrollview)
- [Scroll views（专题总览）](https://developer.apple.com/documentation/swiftui/scroll-views)
- [`ScrollPosition`](https://developer.apple.com/documentation/swiftui/scrollposition)
- [`scrollPosition(_:anchor:)`](https://developer.apple.com/documentation/swiftui/view/scrollposition(_:anchor:))
- [`scrollTargetLayout(isEnabled:)`](https://developer.apple.com/documentation/swiftui/view/scrolltargetlayout(isenabled:))
- [`scrollTargetBehavior(_:)`](https://developer.apple.com/documentation/swiftui/view/scrolltargetbehavior(_:))
- [`ScrollTargetBehavior` 协议](https://developer.apple.com/documentation/swiftui/scrolltargetbehavior)
- [`contentMargins(_:_:for:)`](https://developer.apple.com/documentation/swiftui/view/contentmargins(_:_:for:))
- [`onScrollGeometryChange(for:of:action:)`](https://developer.apple.com/documentation/swiftui/view/onscrollgeometrychange(for:of:action:))
- [`ScrollGeometry`](https://developer.apple.com/documentation/swiftui/scrollgeometry)
- [`onScrollPhaseChange(_:)`](https://developer.apple.com/documentation/swiftui/view/onscrollphasechange(_:))
- [`onScrollVisibilityChange(threshold:_:)`](https://developer.apple.com/documentation/swiftui/view/onscrollvisibilitychange(threshold:_:))
- [`defaultScrollAnchor(_:)`](https://developer.apple.com/documentation/swiftui/view/defaultscrollanchor(_:))
- [`scrollEdgeEffectStyle(_:for:)`](https://developer.apple.com/documentation/swiftui/view/scrolledgeeffectstyle(_:for:))
- [`ScrollViewReader`](https://developer.apple.com/documentation/swiftui/scrollviewreader)
- [WWDC23：Beyond scroll views](https://developer.apple.com/videos/play/wwdc2023/10159/)
