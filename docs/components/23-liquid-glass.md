# 23 Liquid Glass 设计语言

## 本章目标

- 理解 Liquid Glass 是什么、它在界面里的位置
- 知道哪些东西系统已经替你做了
- 用 `glassEffect` 给自定义视图加上玻璃效果
- 用 `GlassEffectContainer` 让多块玻璃融合与变形
- 掌握与之配套的 API：玻璃按钮、背景延伸、滚动边缘效果、`safeAreaBar`
- 写出向下兼容旧系统的代码
- 知道什么时候**不该**用玻璃

本章的所有 API 都需要 <Badge type="tip" text="iOS 26+ / macOS 26+" />。

## Liquid Glass 是什么

Liquid Glass 是 Apple 在 26 系列操作系统中引入的设计语言，覆盖 iOS、iPadOS、macOS、watchOS、tvOS。它的核心是一种新材质：

- 像玻璃一样**透出并折射**后面的内容
- 反射周围内容的颜色和光线
- 对触摸和指针**实时响应**：按下去会发光、会像液体一样形变
- 多块玻璃靠近时会**融合**，分开时会**分离**

比材质（上一章的 `.regularMaterial`）更重要的是它带来的**界面结构**的变化。在这套设计里，界面明确分成两层：

```text
┌──────────────────────────────────────────┐
│  功能层：导航栏、工具栏、标签栏、侧边栏、   │  ← Liquid Glass，浮在上面
│         浮动按钮、弹出菜单                 │
├──────────────────────────────────────────┤
│  内容层：列表、文章、照片、地图……          │  ← 不用玻璃，铺满整个屏幕
└──────────────────────────────────────────┘
```

内容延伸到屏幕的每个角落，控件作为一层玻璃浮在内容之上，随内容滚动而变化。**玻璃属于功能层，不属于内容层。** 这句话是本章最重要的设计原则，后面所有“该不该用”的判断都由它而来。

## 系统已经做了什么

好消息是：**用标准组件构建的应用，用 Xcode 26 或更新版本重新编译，就自动获得了 Liquid Glass 的外观。** 你什么都不用改。

| 组件 | 26 系列下的变化 |
| --- | --- |
| `NavigationStack` 的导航栏 | 透明背景，按钮在浮动的玻璃上，相邻按钮自动成组 |
| `TabView` 的标签栏 | iPhone 上是浮动的玻璃胶囊，可以随滚动收起 |
| `NavigationSplitView` 的侧边栏 | 浮动的玻璃面板，内容可以延伸到它下面 |
| `.toolbar` 里的项目 | 自动使用玻璃背景 |
| `.sheet` | 部分高度时是带玻璃背景的浮动卡片，四周内缩 |
| `Menu`、`.popover`、`.alert` | 玻璃材质，从触发它的按钮上“生长”出来 |
| `Slider`、`Toggle`、`Picker(.segmented)` | 操作时滑块变成一滴玻璃 |
| 搜索框 | iPhone 上默认位于底部，玻璃材质 |

所以采用 Liquid Glass 的第一步不是写代码，而是**删代码**：检查你是否给导航栏、标签栏、工具栏、sheet 加过自定义背景（`.toolbarBackground(...)`、`.presentationBackground(...)` 等）。这些自定义背景会盖住系统的玻璃效果，大多数应该移除。

前面几章已经讲过的配套 API：

- 第 15 章：`.buttonStyle(.glass)`、`.glassProminent`
- 第 18 章：`.scrollEdgeEffectStyle`
- 第 19 章：`.tabBarMinimizeBehavior`、`.tabViewBottomAccessory`、`Tab(role: .search)`
- 第 21 章：`ToolbarSpacer`、`.sharedBackgroundVisibility`、按钮角色

这一章讲剩下的部分：怎么给**你自己的**视图加玻璃。

## glassEffect：给自定义视图加玻璃

```swift
@available(iOS 26, macOS 26, *)
struct GlassBasics: View {
    var body: some View {
        ZStack {
            LinearGradient(colors: [.orange, .pink, .purple], startPoint: .topLeading, endPoint: .bottomTrailing)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Text("默认：胶囊形状")
                    .padding()
                    .glassEffect()

                Text("圆角矩形")
                    .padding()
                    .glassEffect(in: .rect(cornerRadius: 16))

                Image(systemName: "heart.fill")
                    .font(.title)
                    .frame(width: 60, height: 60)
                    .glassEffect(in: .circle)
            }
        }
    }
}
```

`.glassEffect(_:in:)` 在视图**后面**放一块玻璃。两个参数都有默认值：玻璃的种类默认是 `.regular`，形状默认是胶囊。

::: warning 顺序
`.glassEffect()` 应该是外观相关修饰符里的**最后一个**。先设置好内容的 `padding`、`frame`、字体，再加玻璃。它之后不要再加 `.background` 或 `.clipShape`。
:::

### 玻璃的种类

```swift
@available(iOS 26, macOS 26, *)
struct GlassVariants: View {
    var body: some View {
        ZStack {
            Image(systemName: "mountain.2.fill")
                .resizable()
                .scaledToFill()
                .foregroundStyle(.green.gradient)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Text("regular 常规").padding().glassEffect(.regular)
                Text("clear 通透").padding().glassEffect(.clear)
                Text("带色调").padding().glassEffect(.regular.tint(.orange))
                Text("可交互").padding().glassEffect(.regular.interactive())
                Text("identity 无效果").padding().glassEffect(.identity)
            }
            .font(.headline)
        }
    }
}
```

| 种类 | 说明 |
| --- | --- |
| `.regular` | 标准玻璃。会自动调整以保证上面内容的可读性。**绝大多数情况用它** |
| `.clear` | 更通透，透出更多背景。只适合放在照片、视频这类内容丰富的背景上，并且上面的内容要足够醒目 |
| `.identity` | 没有任何效果。用于根据条件开关玻璃，而不改变视图结构（回忆第 4 章：不要用 `if` 包修饰符） |

两个修饰方法可以链式调用：

- `.tint(_:)`：给玻璃加色调。用来表示**突出**，比如主要操作。不要为了装饰而用。
- `.interactive()`：让玻璃响应触摸和指针，按下时有发光和缩放的反馈。自定义的可点击控件应该加上它。标准的 `Button` 配合 `.buttonStyle(.glass)` 已经自带这个效果。

### 玻璃上的内容

玻璃后面的内容会变化，所以玻璃上的文字和图标需要能适应。做法和上一章材质的情况一样：**用层级样式**（`.primary`、`.secondary`）或让它继承默认前景色。系统会自动在浅色、深色之间切换，并加上鲜活效果，保证可读。不要在玻璃上使用写死的颜色。

## 玻璃按钮

第 15 章提过两种玻璃按钮样式。它们是在自定义界面里使用玻璃最常见、最正确的方式：

```swift
@available(iOS 26, macOS 26, *)
struct GlassButtons: View {
    var body: some View {
        ZStack {
            Rectangle().fill(.teal.gradient).ignoresSafeArea()

            VStack(spacing: 20) {
                Button("次要操作", systemImage: "square.and.arrow.up") {}
                    .buttonStyle(.glass)

                Button("主要操作", systemImage: "checkmark") {}
                    .buttonStyle(.glassProminent)

                Button("带色调", systemImage: "trash") {}
                    .buttonStyle(.glassProminent)
                    .tint(.red)

                HStack(spacing: 16) {
                    Button("", systemImage: "backward.fill") {}
                    Button("", systemImage: "play.fill") {}
                    Button("", systemImage: "forward.fill") {}
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
                .controlSize(.large)
            }
        }
    }
}
```

- `.glass`：透明的玻璃按钮，用于次要操作。
- `.glassProminent`：带强调色的不透明感更强的玻璃，用于主要操作。

它们和其他按钮样式一样支持 `controlSize`、`buttonBorderShape`、`tint`。

## GlassEffectContainer：让玻璃彼此感知

玻璃的一个标志性行为是“融合”：两块玻璃靠近时，边缘会像水滴一样连在一起。要实现这一点，这些玻璃必须在同一个 `GlassEffectContainer` 里。

```swift
@available(iOS 26, macOS 26, *)
struct GlassContainerDemo: View {
    @State private var spacing = 40.0

    var body: some View {
        ZStack {
            Rectangle().fill(.indigo.gradient).ignoresSafeArea()

            VStack(spacing: 40) {
                GlassEffectContainer(spacing: 30) {
                    HStack(spacing: spacing) {
                        Image(systemName: "pencil")
                            .frame(width: 64, height: 64)
                            .glassEffect()
                        Image(systemName: "eraser")
                            .frame(width: 64, height: 64)
                            .glassEffect()
                        Image(systemName: "scissors")
                            .frame(width: 64, height: 64)
                            .glassEffect()
                    }
                    .font(.title2)
                }

                Slider(value: $spacing, in: 0...60)
                    .padding(.horizontal, 40)
            }
        }
    }
}
```

拖动滑块改变 `HStack` 的间距：当三个图标之间的距离小于容器的 `spacing`（30）时，它们的玻璃开始融合成一个形状。

容器的 `spacing` 参数是“融合阈值”：两块玻璃的距离小于它时开始融合。它和布局的间距是两回事。

使用容器还有两个理由：

- **性能。** 玻璃效果的渲染成本不低。容器把里面所有的玻璃合并到一次渲染里。只要同一区域有多块玻璃，就应该放进一个容器。
- **正确性。** 玻璃不能对另一块玻璃取样。两块独立的玻璃叠在一起会产生不正确的视觉效果。放进同一个容器，系统会正确处理。

### glassEffectUnion：合并成一块

有时你希望几个视图在静止状态下就共用一整块玻璃，而不是各有一块：

```swift
@available(iOS 26, macOS 26, *)
struct GlassUnionDemo: View {
    @Namespace private var namespace

    var body: some View {
        ZStack {
            Rectangle().fill(.mint.gradient).ignoresSafeArea()

            GlassEffectContainer(spacing: 20) {
                HStack(spacing: 20) {
                    ForEach(["cloud.rain", "sun.max", "moon.stars", "wind"], id: \.self) { symbol in
                        Image(systemName: symbol)
                            .frame(width: 56, height: 56)
                            .glassEffect()
                            .glassEffectUnion(id: symbol == "wind" ? "b" : "a", namespace: namespace)
                    }
                }
                .font(.title3)
            }
        }
    }
}
```

前三个图标的 union id 都是 `"a"`，它们合并成一块长条玻璃；第四个是 `"b"`，单独一块。

`@Namespace` 提供一个命名空间，用来限定这些 id 的作用范围。第 28 章讲 `matchedGeometryEffect` 时还会用到它。

### 变形过渡：glassEffectID

玻璃在出现和消失时可以从另一块玻璃里“分裂”出来，或者“融入”另一块玻璃。给每块玻璃一个身份标识：

```swift
@available(iOS 26, macOS 26, *)
struct GlassMorphDemo: View {
    @State private var isExpanded = false
    @Namespace private var namespace

    var body: some View {
        ZStack {
            Rectangle().fill(.orange.gradient).ignoresSafeArea()

            GlassEffectContainer(spacing: 30) {
                HStack(spacing: 30) {
                    if isExpanded {
                        Image(systemName: "camera")
                            .frame(width: 56, height: 56)
                            .glassEffect()
                            .glassEffectID("camera", in: namespace)

                        Image(systemName: "photo")
                            .frame(width: 56, height: 56)
                            .glassEffect()
                            .glassEffectID("photo", in: namespace)
                    }

                    Button {
                        withAnimation(.bouncy) { isExpanded.toggle() }
                    } label: {
                        Image(systemName: isExpanded ? "xmark" : "plus")
                            .frame(width: 56, height: 56)
                    }
                    .buttonStyle(.plain)
                    .glassEffect(.regular.interactive())
                    .glassEffectID("toggle", in: namespace)
                }
                .font(.title3)
            }
        }
    }
}
```

点击加号，两个新按钮从加号按钮里“流”出来；再点一次，它们又融回去。三个条件缺一不可：

1. 在同一个 `GlassEffectContainer` 里
2. 每块玻璃有 `.glassEffectID(_:in:)`
3. 状态变化包在动画里（`withAnimation`）

`.glassEffectTransition(_:)` 可以选择过渡方式：

| 过渡 | 效果 |
| --- | --- |
| `.matchedGeometry` | 默认。与附近的玻璃融合变形 |
| `.materialize` | 原地“显影”出现，不与其他玻璃融合。适合距离较远的元素 |
| `.identity` | 没有过渡 |

## 让内容延伸到玻璃下面

Liquid Glass 的设计要求内容铺满屏幕，延伸到侧边栏和工具栏的下方。两个 API 帮你做到。

### backgroundExtensionEffect

`NavigationSplitView` 的侧边栏在 26 系列里是浮在内容上的玻璃。如果详情栏顶部有一张大图，你会希望它看起来延伸到了侧边栏下面。但直接让图片伸过去，图片的重要内容会被侧边栏挡住。

`.backgroundExtensionEffect()` 的做法是：保持图片在安全区域内完整显示，然后把图片**镜像并模糊**，铺到安全区域之外。

```swift
@available(iOS 26, macOS 26, *)
struct BackgroundExtensionDemo: View {
    var body: some View {
        NavigationSplitView {
            List(0..<10, id: \.self) { Text("条目 \($0)") }
                .navigationTitle("侧边栏")
        } detail: {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    LinearGradient(colors: [.blue, .purple, .pink], startPoint: .leading, endPoint: .trailing)
                        .frame(height: 260)
                        .overlay { Image(systemName: "photo").font(.system(size: 60)).foregroundStyle(.white) }
                        .backgroundExtensionEffect()

                    Text("标题").font(.largeTitle.bold()).padding(.horizontal)
                    Text("正文内容……").padding(.horizontal)
                }
            }
            .ignoresSafeArea(edges: .top)
        }
    }
}
```

### safeAreaBar

第 8 章学过 `safeAreaInset`：在边缘放一个自定义栏，并相应调整内容的安全区域。26 系列新增的 `safeAreaBar` 用法相同，区别是它会**参与滚动边缘效果**：栏下方的滚动内容会像在系统工具栏下方一样自动渐隐。

```swift
@available(iOS 26, macOS 26, *)
struct SafeAreaBarDemo: View {
    @State private var filter = 0

    var body: some View {
        NavigationStack {
            List(0..<40, id: \.self) { Text("邮件 \($0)") }
                .navigationTitle("收件箱")
                .safeAreaBar(edge: .top) {
                    Picker("筛选", selection: $filter) {
                        Text("全部").tag(0)
                        Text("未读").tag(1)
                        Text("已标旗").tag(2)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    .padding(.bottom, 8)
                }
        }
    }
}
```

需要在工具栏下方再放一行自定义控件（筛选条、分段选择）时，用 `safeAreaBar` 而不是 `safeAreaInset`。

## 向下兼容

如果应用还要支持 26 之前的系统，玻璃相关的 API 需要做版本判断。把判断封装进一个修饰符，调用处就干净了：

```swift
extension View {
    /// 26 及以上用 Liquid Glass，更早的系统用材质代替。
    @ViewBuilder
    func adaptiveGlass(in shape: some Shape = .capsule) -> some View {
        if #available(iOS 26, macOS 26, *) {
            self.glassEffect(.regular, in: shape)
        } else {
            self.background(.regularMaterial, in: shape)
        }
    }
}

struct AdaptiveGlassButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .adaptiveGlass()
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

struct AdaptiveGlassDemo: View {
    var body: some View {
        ZStack {
            Rectangle().fill(.purple.gradient).ignoresSafeArea()
            Button("兼容旧系统的玻璃按钮") {}
                .buttonStyle(AdaptiveGlassButtonStyle())
        }
    }
}
```

这里用 `if #available` 包修饰符是安全的。第 4 章说过，条件修饰符的问题在于条件变化时视图身份会变；而系统版本在应用运行期间不会变。

::: info 关于用 Xcode 26 之后的版本编译旧界面
用 26 系列的 SDK（Xcode 26）编译后，标准组件会自动换成新外观。当时 Apple 提供了一个过渡选项：在 Info.plist 里把 `UIDesignRequiresCompatibility` 设为 `YES`，应用可以暂时保持旧外观。

**这个选项在 Xcode 27 下已经失效。** 官方文档写明：针对 iOS 27、macOS 27 及以后的 SDK 构建时，系统会忽略这个键。也就是说，用 Xcode 27 编译的应用一定是 Liquid Glass 外观，没有退路，适配是必须完成的工作。
:::

## 什么时候不该用玻璃

玻璃效果很吸引人，初学者容易滥用。回到开头的原则：**玻璃属于功能层。**

**不要这样做：**

- **给内容加玻璃。** 列表的每一行、文章的卡片、图片的背景，这些是内容，不是控件。一屏幕的玻璃卡片会让层次完全消失，也很难阅读。
- **玻璃叠玻璃。** 在玻璃面板上再放玻璃按钮。玻璃上面的控件应该用普通的填充或者不带背景的样式。
- **到处加色调。** `tint` 是用来指出“这是主要操作”的。每个按钮都带颜色，就没有哪个是主要的了。
- **为了装饰而用 `.clear`。** `.clear` 透出更多背景，可读性更差，只在背景是媒体内容时使用。
- **给系统栏加自定义背景。** 它会破坏系统的玻璃效果和滚动边缘效果。

**应该这样做：**

- 优先用标准组件，让系统处理玻璃。
- 自定义的**浮动控件**（悬浮操作按钮、媒体播放控制条、地图上的工具按钮）用 `.buttonStyle(.glass)` 或 `glassEffect`。
- 相关的玻璃控件放进一个 `GlassEffectContainer`。
- 让内容延伸到屏幕边缘，栏和控件浮在上面。
- 尊重用户的辅助功能设置。用户开启“降低透明度”或“增强对比度”时，系统会自动调整玻璃的表现。如果你自己画了半透明效果，要通过 `@Environment(\.accessibilityReduceTransparency)` 自己处理。

## 常见误区

**误区一：“适配 Liquid Glass 就是到处加 `.glassEffect()`。”** 恰恰相反。标准组件自动适配，第一步是移除自定义的栏背景。只有自定义的浮动控件才需要手动加玻璃。

**误区二：“把 `.regularMaterial` 全部替换成 `.glassEffect()`。”** 材质仍然有它的用途（内容层里的面板背景）。玻璃只用于功能层。

**误区三：“多块玻璃不用容器也行。”** 没有 `GlassEffectContainer` 就没有融合和变形，性能也更差。

**误区四：“`glassEffect` 后面再加 `clipShape` 调整形状。”** 形状通过 `in:` 参数指定，`glassEffect` 应该是最后一个外观修饰符。

**误区五：“玻璃上的文字用白色。”** 玻璃后面的内容会变。用层级样式，让系统自动保证可读性。

## 小结

- Liquid Glass 是 26 系列的设计语言：玻璃材质的控件层浮在铺满屏幕的内容层之上。
- 标准组件重新编译即可获得新外观；首先要做的是移除自定义的栏背景。
- `.glassEffect(_:in:)` 给自定义视图加玻璃，`.regular` 是默认选择，`.tint` 表示突出，`.interactive()` 响应触摸。
- `.buttonStyle(.glass)` 和 `.glassProminent` 是最常用的玻璃控件。
- `GlassEffectContainer` 让多块玻璃融合并提升性能；`glassEffectUnion` 合并形状；`glassEffectID` 实现变形过渡。
- `backgroundExtensionEffect` 让内容视觉上延伸到侧边栏下方；`safeAreaBar` 放置参与边缘效果的自定义栏。
- 玻璃用于功能层，不用于内容，不要叠加，不要滥用色调。

## 练习

1. 做一个地图风格的界面：背景用一张铺满屏幕的渐变或图片代替地图，右上角一列竖排的圆形玻璃按钮（定位、图层、指南针），放在同一个 `GlassEffectContainer` 里。
2. 做一个可展开的悬浮操作按钮：右下角一个加号，点击后向上展开三个操作按钮，带玻璃变形过渡。
3. 做一个媒体播放控制条：上一首、播放/暂停、下一首三个按钮共用一块玻璃（`glassEffectUnion`），旁边一个单独的“更多”按钮。
4. 给练习 2 的组件加上向下兼容：在 26 之前的系统上用 `.regularMaterial` 代替玻璃，展开时用普通的缩放加淡入动画。

## 官方文档

- [Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
- [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- [Landmarks: Building an app with Liquid Glass（官方示例项目）](https://developer.apple.com/documentation/swiftui/landmarks-building-an-app-with-liquid-glass)
- [`glassEffect(_:in:)`](https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:))
- [`Glass`](https://developer.apple.com/documentation/swiftui/glass)
- [`GlassEffectContainer`](https://developer.apple.com/documentation/swiftui/glasseffectcontainer)
- [`glassEffectID(_:in:)`](https://developer.apple.com/documentation/swiftui/view/glasseffectid(_:in:))
- [`glassEffectUnion(id:namespace:)`](https://developer.apple.com/documentation/swiftui/view/glasseffectunion(id:namespace:))
- [`GlassButtonStyle`](https://developer.apple.com/documentation/swiftui/glassbuttonstyle)
- [`backgroundExtensionEffect()`](https://developer.apple.com/documentation/swiftui/view/backgroundextensioneffect())
- [`safeAreaBar(edge:alignment:spacing:content:)`](https://developer.apple.com/documentation/swiftui/view/safeareabar(edge:alignment:spacing:content:))
- [`UIDesignRequiresCompatibility`（已在 27 系列 SDK 下失效的兼容开关）](https://developer.apple.com/documentation/bundleresources/information-property-list/uidesignrequirescompatibility)
- [Human Interface Guidelines：Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [WWDC25：Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
- [WWDC25：Build a SwiftUI app with the new design](https://developer.apple.com/videos/play/wwdc2025/323/)
