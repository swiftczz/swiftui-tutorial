# 11 环境与偏好：数据的上下游

## 本章目标

- 读取和覆盖系统提供的环境值
- 用 `@Entry` 定义自己的环境值
- 理解“环境里的动作”这种模式（`dismiss`、`openURL`）
- 用 `PreferenceKey` 让数据从子视图流向祖先
- 了解容器值与自定义容器
- 画出 SwiftUI 数据流的完整地图

## 环境是什么

第 4 章讲环境型修饰符时已经见过环境的效果：`.font(.title)` 加在容器上，里面的文字都变大。上一章又用 `.environment(model)` 把模型对象传给了深层的后代。现在把环境本身讲清楚。

**环境是一个沿视图树自上而下传递的键值集合。** 每个视图都能读到从根到自己这条路径上累积下来的环境。任何一层都可以修改某个键的值，修改只对它的后代生效。

```text
App                         环境：{ 配色: 浅色, 字体: 默认, 语言: 中文, … }
 └─ WindowGroup
     └─ ContentView
         └─ VStack ← .font(.title)          从这里往下：字体 = title
             ├─ Text("A")                   读到 字体 = title
             └─ HStack ← .environment(\.locale, 英文)   从这里往下：语言 = 英文
                 └─ Text("B")               读到 字体 = title，语言 = 英文
```

它解决的问题是：**有些数据很多视图都要用，但又不值得每一层都显式传递。** 比如当前是深色还是浅色模式，几乎每个视图都可能关心，总不能给每个视图都加一个 `colorScheme` 参数。

## 读取系统环境值

用 `@Environment` 加一个键路径读取：

```swift
struct EnvironmentReader: View {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.locale) private var locale
    @Environment(\.layoutDirection) private var layoutDirection
    @Environment(\.isEnabled) private var isEnabled

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("配色：\(colorScheme == .dark ? "深色" : "浅色")")
            Text("字号档位：\(String(describing: dynamicTypeSize))")
            Text("语言区域：\(locale.identifier)")
            Text("书写方向：\(layoutDirection == .leftToRight ? "从左到右" : "从右到左")")
            Text("是否可用：\(isEnabled ? "是" : "否")")
        }
        .padding()
    }
}
```

读取环境值也会登记依赖：用户在系统设置里切换到深色模式，读过 `colorScheme` 的视图会自动更新。

常用的系统环境值：

| 键 | 类型 | 含义 |
| --- | --- | --- |
| `\.colorScheme` | `ColorScheme` | 浅色 / 深色 |
| `\.dynamicTypeSize` | `DynamicTypeSize` | 用户设置的字号档位 |
| `\.locale` | `Locale` | 语言与地区 |
| `\.calendar`、`\.timeZone` | | 日历与时区 |
| `\.layoutDirection` | `LayoutDirection` | 书写方向 |
| `\.horizontalSizeClass`、`\.verticalSizeClass` | `UserInterfaceSizeClass?` | 尺寸类别（第 8 章） |
| `\.scenePhase` | `ScenePhase` | 前后台状态（第 2 章） |
| `\.isEnabled` | `Bool` | 是否被 `.disabled()` 禁用 |
| `\.isFocused` | `Bool` | 最近的可聚焦祖先是否有焦点 |
| `\.displayScale` | `CGFloat` | 屏幕倍率（2x、3x） |
| `\.pixelLength` | `CGFloat` | 一个物理像素对应多少点 |
| `\.controlSize` | `ControlSize` | 控件尺寸档位 |
| `\.redactionReasons` | `RedactionReasons` | 是否处于占位/隐私遮挡状态 |
| `\.accessibilityReduceMotion` | `Bool` | 用户是否开启了“减弱动态效果” |
| `\.accessibilityReduceTransparency` | `Bool` | 用户是否开启了“降低透明度” |
| `\.appearsActive` | `Bool` | 窗口是否处于活动状态（macOS 尤其有用） |

## 覆盖环境值

用 `.environment(_:_:)` 修饰符为一棵子树设置环境值：

```swift
struct EnvironmentOverride: View {
    var body: some View {
        VStack(spacing: 16) {
            Text(Date.now, format: .dateTime.weekday(.wide).month(.wide).day())

            Text(Date.now, format: .dateTime.weekday(.wide).month(.wide).day())
                .environment(\.locale, Locale(identifier: "en_US"))

            Text(Date.now, format: .dateTime.weekday(.wide).month(.wide).day())
                .environment(\.locale, Locale(identifier: "ja_JP"))

            HStack {
                Text("第一")
                Text("第二")
                Text("第三")
            }
            .environment(\.layoutDirection, .rightToLeft)
        }
        .padding()
    }
}
```

同一段日期格式化代码，在三种语言环境下显示出三种文字。最后的 `HStack` 在从右到左的环境里把三个文字倒着排。

这个能力在**预览**里特别有用：不用改系统设置，就能检查界面在各种环境下的表现。

很多环境值有专用的修饰符，它们是 `.environment(\.xxx, value)` 的简写：

| 专用修饰符 | 等价于设置 |
| --- | --- |
| `.font(_:)` | `\.font` |
| `.disabled(_:)` | `\.isEnabled` |
| `.controlSize(_:)` | `\.controlSize` |
| `.preferredColorScheme(_:)` | 整个呈现层级的配色（会向上影响到窗口） |
| `.dynamicTypeSize(_:)` | `\.dynamicTypeSize` |
| `.lineLimit(_:)` | `\.lineLimit` |
| `.tint(_:)` | 强调色 |

## 定义自己的环境值

用 `@Entry` 宏在 `EnvironmentValues` 的扩展里声明：

```swift
extension EnvironmentValues {
    @Entry var cardCornerRadius: CGFloat = 12
    @Entry var isCompactMode: Bool = false
}

struct InfoCard: View {
    @Environment(\.cardCornerRadius) private var cornerRadius
    @Environment(\.isCompactMode) private var isCompact

    let title: String

    var body: some View {
        Text(title)
            .padding(isCompact ? 8 : 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.blue.opacity(0.12), in: .rect(cornerRadius: cornerRadius))
    }
}

struct CustomEnvironmentDemo: View {
    var body: some View {
        VStack(spacing: 12) {
            InfoCard(title: "默认样式")

            VStack(spacing: 6) {
                InfoCard(title: "紧凑、小圆角")
                InfoCard(title: "这一组都是")
            }
            .environment(\.cardCornerRadius, 4)
            .environment(\.isCompactMode, true)
        }
        .padding()
    }
}
```

`@Entry` 后面的初始值就是这个键的**默认值**：环境里没人设置过时，读到的就是它。

习惯上再配一个语义化的修饰符，让调用处更好读：

```swift
extension View {
    func compactMode(_ enabled: Bool = true) -> some View {
        environment(\.isCompactMode, enabled)
    }
}
```

::: details 旧写法：EnvironmentKey
`@Entry` 宏随 Xcode 16 引入，可以向后部署到所有支持 SwiftUI 的系统。在它之前要手写一个键类型，你会在旧代码里看到：

```swift
private struct BadgeColorKey: EnvironmentKey {
    static let defaultValue: Color = .red
}

extension EnvironmentValues {
    var badgeColor: Color {
        get { self[BadgeColorKey.self] }
        set { self[BadgeColorKey.self] = newValue }
    }
}
```

`@Entry` 展开后就是这样的代码。两种写法完全等价，新代码用 `@Entry`。
:::

### 环境值还是环境对象

上一章用 `.environment(model)` 注入 `@Observable` 对象，这一章用 `.environment(\.key, value)` 设置值。怎么选？

| | 环境值（键路径） | 环境对象（类型） |
| --- | --- | --- |
| 写法 | `@Environment(\.cardCornerRadius)` | `@Environment(AppSettings.self)` |
| 有默认值吗 | 有，永远读得到 | 没有，没注入会崩溃（除非声明为可选） |
| 典型内容 | 样式、配置、能力开关等**值** | 有身份、有行为、会变化的**模型对象** |
| 更新粒度 | 这个键的值变了，读它的视图更新 | 对象里被读到的属性变了才更新 |

简单的配置用环境值；需要共享的可变模型用环境对象。

## 环境里的动作

环境里不只能放数据，还能放**动作**。SwiftUI 把一些“需要上层容器配合才能完成的操作”做成了环境值，取出来像函数一样调用：

```swift
struct DetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(spacing: 16) {
            Text("这是一个弹出的页面")

            Button("打开 Apple 开发者网站") {
                openURL(URL(string: "https://developer.apple.com")!)
            }

            Button("关闭") {
                dismiss()
            }
        }
        .padding(40)
    }
}

struct DismissDemo: View {
    @State private var isPresented = false

    var body: some View {
        Button("显示") { isPresented = true }
            .sheet(isPresented: $isPresented) {
                DetailSheet()
            }
    }
}
```

`dismiss` 的妙处在于：`DetailSheet` 不需要知道自己是被 sheet 弹出的、还是被导航推入的、还是在一个独立窗口里。它只说“关掉我”，由环境决定具体怎么关。这让视图可以在不同的呈现方式下复用。

常见的动作型环境值：

| 键 | 作用 |
| --- | --- |
| `\.dismiss` | 关闭当前的呈现（sheet、导航页、窗口） |
| `\.openURL` | 打开链接。可以覆盖它来拦截应用内的链接点击 |
| `\.openWindow`、`\.dismissWindow` | 打开/关闭窗口（第 32 章） |
| `\.openSettings` | 打开设置窗口（macOS） |
| `\.refresh` | 触发 `.refreshable` 定义的刷新动作 |
| `\.dismissSearch` | 结束搜索状态 |
| `\.requestReview` | 请求应用评分（StoreKit） |

你也可以把自己的动作放进环境。闭包就是值：

```swift
extension EnvironmentValues {
    @Entry var showToast: (String) -> Void = { _ in }
}

struct DeepChildButton: View {
    @Environment(\.showToast) private var showToast

    var body: some View {
        Button("保存") { showToast("已保存") }
    }
}

struct ToastHost: View {
    @State private var message: String?

    var body: some View {
        VStack {
            DeepChildButton()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .overlay(alignment: .top) {
            if let message {
                Text(message)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(.thinMaterial, in: .capsule)
                    .padding()
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.snappy, value: message)
        .environment(\.showToast) { text in
            message = text
            Task {
                try? await Task.sleep(for: .seconds(2))
                message = nil
            }
        }
    }
}
```

深层的按钮不需要知道提示是怎么显示的，也不需要一层层传回调。

## 偏好：数据向上流

环境是向下流的。有时需要反过来：**子视图把信息报告给祖先**。

最熟悉的例子其实你已经用过了：

```swift nocheck
NavigationStack {
    ContentList()
        .navigationTitle("收件箱")     // 子视图声明标题
}
```

`.navigationTitle` 写在内容视图上，但标题显示在上层的导航栏里。信息是从下往上传的。这套机制叫**偏好**（preference）。`navigationTitle`、`toolbar`、`preferredColorScheme` 内部都是用它实现的。

### 定义和使用偏好

三个步骤：定义键，子视图设置值，祖先读取值。

```swift
struct MaxWidthKey: PreferenceKey {
    static let defaultValue: CGFloat = 0

    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

struct EqualWidthLabels: View {
    @State private var labelWidth: CGFloat?
    let rows = [("姓名", "张三"), ("电子邮箱", "zhang@example.com"), ("城市", "杭州")]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(rows, id: \.0) { label, value in
                HStack {
                    Text(label)
                        .fixedSize()
                        .background {
                            GeometryReader { proxy in
                                Color.clear
                                    .preference(key: MaxWidthKey.self, value: proxy.size.width)
                            }
                        }
                        .frame(width: labelWidth, alignment: .trailing)
                    Text(value)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .onPreferenceChange(MaxWidthKey.self) { width in
            labelWidth = width
        }
        .padding()
    }
}
```

这个例子让三个标签等宽并右对齐，宽度取最宽的那个。流程是：

1. 每个标签在背景里测量自己的宽度，通过 `.preference(key:value:)` 上报
2. 三个兄弟各上报了一个值，SwiftUI 调用 `reduce` 把它们**合并**成一个：这里取最大值
3. 祖先用 `.onPreferenceChange` 收到合并后的结果，存进状态
4. 状态变化触发更新，三个标签都被设成这个宽度

`reduce` 是偏好的关键：一个祖先可能有很多后代都设置了同一个键，必须定义怎么合并。常见的合并策略有取最大值、求和、收集到数组、后者覆盖前者。

::: tip 先想想有没有更简单的办法
上面这个“等宽标签”其实用 `Grid` 一行就能解决（第 7 章）。偏好是一个强大但偏底层的工具。在用它之前，先确认 `Grid`、`Layout` 协议、对齐参考线这些更直接的工具解决不了你的问题。
:::

### 锚点偏好：向上传递位置

偏好可以携带**锚点**（anchor），祖先能把它解析成自己坐标系里的位置。这是实现“跟随选中项移动的指示器”的标准做法：

```swift
struct TabBoundsKey: PreferenceKey {
    static let defaultValue: [Int: Anchor<CGRect>] = [:]

    static func reduce(value: inout [Int: Anchor<CGRect>], nextValue: () -> [Int: Anchor<CGRect>]) {
        value.merge(nextValue()) { $1 }
    }
}

struct UnderlineTabs: View {
    @State private var selection = 0
    let titles = ["推荐", "关注的人", "热门"]

    var body: some View {
        HStack(spacing: 24) {
            ForEach(titles.indices, id: \.self) { index in
                Text(titles[index])
                    .fontWeight(selection == index ? .semibold : .regular)
                    .padding(.vertical, 8)
                    .anchorPreference(key: TabBoundsKey.self, value: .bounds) { [index: $0] }
                    .onTapGesture { selection = index }
            }
        }
        .overlayPreferenceValue(TabBoundsKey.self) { anchors in
            GeometryReader { proxy in
                if let anchor = anchors[selection] {
                    let rect = proxy[anchor]
                    Capsule()
                        .fill(.tint)
                        .frame(width: rect.width, height: 3)
                        .offset(x: rect.minX, y: rect.maxY - 3)
                }
            }
        }
        .animation(.snappy, value: selection)
        .padding()
    }
}
```

- `.anchorPreference(key:value:transform:)` 上报自己的边界作为锚点
- `.overlayPreferenceValue` 在祖先上加一个覆盖层，覆盖层的内容可以读到偏好值
- `proxy[anchor]` 把锚点解析成当前坐标系里的 `CGRect`

点击不同的标签，下划线会平滑地滑过去并改变宽度。

## 容器值与自定义容器 <Badge type="tip" text="iOS 18+ / macOS 15+" />

环境向下传给**所有后代**，偏好向上传给**所有祖先**。还有第三种范围更小的传递：**子视图只告诉它的直接容器**。这叫容器值（container value）。

第 8 章的 `LayoutValueKey` 是布局专用的版本。通用版本配合“可拆解子视图”的 API，可以写出像 `List` 那样能识别每个孩子的自定义容器：

```swift
extension ContainerValues {
    @Entry var isHighlighted: Bool = false
}

extension View {
    func highlighted(_ value: Bool = true) -> some View {
        containerValue(\.isHighlighted, value)
    }
}

struct BulletList<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(subviews: content) { subview in
                HStack(alignment: .firstTextBaseline) {
                    Image(systemName: subview.containerValues.isHighlighted ? "star.fill" : "circle.fill")
                        .font(.caption2)
                        .foregroundStyle(subview.containerValues.isHighlighted ? .yellow : .secondary)
                    subview
                }
            }
        }
    }
}

struct BulletListDemo: View {
    var body: some View {
        BulletList {
            Text("普通条目")
            Text("重点条目").highlighted()
            Text("又一个普通条目")
        }
        .padding()
    }
}
```

- `ForEach(subviews:)` 把传入的内容拆成一个个子视图，你可以逐个包装
- `.containerValue(_:_:)` 在子视图上附加一个值
- 容器通过 `subview.containerValues` 读取

这样 `BulletList` 的使用体验就和系统容器一样了：直接往里放视图，每个视图自动获得项目符号。

## 数据流全景

到这里，SwiftUI 传递数据的所有通道都见过了。把它们放到一张图上：

```text
                    ┌───────────────────────────────┐
                    │           祖先视图             │
                    │   拥有状态：@State / 模型       │
                    └───────────────────────────────┘
     向下 ↓                                         ↑ 向上
  ┌──────────────────────────┐        ┌──────────────────────────┐
  │ 初始化参数（let）          │        │ Binding（写回状态）        │
  │   显式、逐层、只读          │        │   显式、逐层               │
  │ Binding（$）              │        │ 闭包回调（onSave: {…}）    │
  │   显式、逐层、可读写        │        │   显式、逐层               │
  │ 环境值 / 环境对象           │        │ 偏好（PreferenceKey）      │
  │   隐式、整棵子树            │        │   隐式、所有祖先，需合并    │
  │                          │        │ 容器值                    │
  │                          │        │   隐式、仅直接容器         │
  └──────────────────────────┘        └──────────────────────────┘
                    ┌───────────────────────────────┐
                    │           后代视图             │
                    └───────────────────────────────┘
```

选择的原则：

1. **默认用显式的。** 参数和绑定最清晰，一眼能看出数据从哪来。
2. **跨很多层、很多视图都要用时，用环境。** 代价是依赖关系变得隐式。
3. **子视图要通知父视图发生了什么，用闭包回调或绑定。**
4. **子视图要向不确定在哪一层的祖先上报信息时，才用偏好。**

## 常见误区

**误区一：“什么都往环境里放，省得传参数。”** 环境让依赖变得不可见：看一个视图的初始化器，你看不出它需要环境里有什么。只把真正“全局性”的东西放进环境。

**误区二：“`.environment()` 加在哪都一样。”** 它只影响**被修饰视图的后代**。常见错误是把它加在了兄弟节点上，或者加在 `sheet` 的外面却期望 sheet 的内容能读到自定义环境对象。sheet 的内容是一个独立的呈现层级，需要在 sheet 的内容视图上再注入一次。

**误区三：“用偏好测量尺寸再存进状态，是标准做法。”** 这会导致“渲染 → 测量 → 改状态 → 再渲染”的两遍布局，写不好还会死循环。先考虑 `Layout`、`Grid`、`onGeometryChange`。

**误区四：“`dismiss` 只能关 sheet。”** 它关闭的是“当前的呈现”：在 sheet 里关 sheet，在导航详情页里返回上一页，在 macOS 的独立窗口里关闭窗口。

## 小结

- 环境是自上而下传递的键值集合，任何一层都可以为它的后代覆盖某个值。
- `@Environment(\.key)` 读取，`.environment(\.key, value)` 覆盖，`@Entry` 定义自己的键。
- 环境里可以放动作：`dismiss`、`openURL` 等让视图不必关心自己被如何呈现。
- 偏好让数据自下而上传递，多个来源通过 `reduce` 合并；锚点偏好可以向上传递位置。
- 容器值只在子视图和直接容器之间传递，配合 `ForEach(subviews:)` 可以写出自定义容器。
- 数据流优先用显式的参数与绑定，其次环境，最后才是偏好。

## 练习

1. 定义一个环境值 `\.priceFormat`（枚举：显示/隐藏小数），写一个 `PriceLabel` 视图读取它。在同一个页面里让上半部分显示小数、下半部分不显示。
2. 覆盖 `\.openURL`，让应用里所有的 `Link` 点击时不跳转浏览器，而是把 URL 显示在一个 `alert` 里。（提示：`OpenURLAction { url in ... return .handled }`）
3. 用偏好实现：`ScrollView` 里有若干个分区，每个分区上报自己的标题；顶部固定显示“共有 N 个分区”。
4. 扩展 `BulletList`：支持通过容器值 `.bulletSymbol("checkmark")` 为单个条目指定不同的符号。

## 官方文档

- [`Environment`](https://developer.apple.com/documentation/swiftui/environment)
- [`EnvironmentValues`（所有内置环境值的列表）](https://developer.apple.com/documentation/swiftui/environmentvalues)
- [`Entry()` 宏](https://developer.apple.com/documentation/swiftui/entry())
- [`environment(_:_:)`](https://developer.apple.com/documentation/swiftui/view/environment(_:_:))
- [Environment values（专题总览）](https://developer.apple.com/documentation/swiftui/environment-values)
- [`DismissAction`](https://developer.apple.com/documentation/swiftui/dismissaction)
- [`OpenURLAction`](https://developer.apple.com/documentation/swiftui/openurlaction)
- [`PreferenceKey`](https://developer.apple.com/documentation/swiftui/preferencekey)
- [Preferences（专题总览）](https://developer.apple.com/documentation/swiftui/preferences)
- [`anchorPreference(key:value:transform:)`](https://developer.apple.com/documentation/swiftui/view/anchorpreference(key:value:transform:))
- [`ContainerValues`](https://developer.apple.com/documentation/swiftui/containervalues)
- [`ForEach` 的 `init(subviews:content:)`](https://developer.apple.com/documentation/swiftui/foreach/init(subviews:content:))
- [WWDC24：Demystify SwiftUI containers](https://developer.apple.com/videos/play/wwdc2024/10146/)
