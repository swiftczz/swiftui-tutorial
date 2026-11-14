# 附录 B：API 可用性速查

这张表汇总了教程里出现的主要 API 的最低系统版本，方便你在确定部署版本时查阅。

表中的版本号是用脚本直接从 Apple 开发者文档的数据接口读取的，生成于 2026 年 11 月，对应 Xcode 27.2 的 SDK。每个 API 的名字都链接到它的官方文档页面，以那里的信息为准。

## 怎么读这张表

- **iOS** 一列同时适用于 iPadOS。
- **“—”** 表示这个 API 在该平台上不可用。多平台代码里使用它时需要 `#if os(...)`（[第 33 章](/platforms/33-multiplatform)）。
- 版本号是 API **被引入**的版本。有些 API 的行为在后来的版本里有增强，以文档为准。
- 版本号看起来很低的宏（`@State` 宏、`@Entry`、`@Animatable`）是**跟着编译器走**的：它们需要较新的 Xcode，但可以部署到很早的系统。见本页末尾的说明。
- “章节”一列是教程里讲解这个 API 的章节。

## 按主题查询

### 状态与数据流

| API | iOS | macOS | 章节 |
| --- | --- | --- | --- |
| [`@State（宏）`](https://developer.apple.com/documentation/swiftui/state()) | 13 | 10.15 | 9 |
| [`@Binding`](https://developer.apple.com/documentation/swiftui/binding) | 13 | 10.15 | 9 |
| [`@Observable`](https://developer.apple.com/documentation/observation/observable()) | 17 | 14 | 10 |
| [`@Bindable`](https://developer.apple.com/documentation/swiftui/bindable) | 17 | 14 | 10 |
| [`@Environment`](https://developer.apple.com/documentation/swiftui/environment) | 13 | 10.15 | 11 |
| [`@Entry`](https://developer.apple.com/documentation/swiftui/entry()) | 13 | 10.15 | 11 |
| [`Observations`](https://developer.apple.com/documentation/observation/observations) | 26 | 26 | 10 |
| [`@AppStorage`](https://developer.apple.com/documentation/swiftui/appstorage) | 14 | 11 | 13 |
| [`@SceneStorage`](https://developer.apple.com/documentation/swiftui/scenestorage) | 14 | 11 | 13 |
| [`@Model（SwiftData）`](https://developer.apple.com/documentation/swiftdata/model()) | 17 | 14 | 13 |
| [`@Query`](https://developer.apple.com/documentation/swiftdata/query) | 17 | 14 | 13 |
| [`@Previewable`](https://developer.apple.com/documentation/swiftui/previewable()) | 17 | 14 | 2 |
| [`ContainerValues`](https://developer.apple.com/documentation/swiftui/containervalues) | 18 | 15 | 11 |
| [`ForEach(subviews:)`](https://developer.apple.com/documentation/swiftui/foreach/init(subviews:content:)) | 18 | 15 | 11 |

### 布局

| API | iOS | macOS | 章节 |
| --- | --- | --- | --- |
| [`Grid`](https://developer.apple.com/documentation/swiftui/grid) | 16 | 13 | 7 |
| [`ViewThatFits`](https://developer.apple.com/documentation/swiftui/viewthatfits) | 16 | 13 | 8 |
| [`Layout 协议`](https://developer.apple.com/documentation/swiftui/layout) | 16 | 13 | 8 |
| [`AnyLayout`](https://developer.apple.com/documentation/swiftui/anylayout) | 16 | 13 | 8 |
| [`containerRelativeFrame`](https://developer.apple.com/documentation/swiftui/view/containerrelativeframe(_:alignment:)) | 17 | 14 | 8 |
| [`onGeometryChange`](https://developer.apple.com/documentation/swiftui/view/ongeometrychange(for:of:action:)) | 16 | 13 | 8 |
| [`safeAreaPadding`](https://developer.apple.com/documentation/swiftui/view/safeareapadding(_:_:)) | 17 | 14 | 8 |
| [`safeAreaBar`](https://developer.apple.com/documentation/swiftui/view/safeareabar(edge:alignment:spacing:content:)) | 26 | 26 | 23 |
| [`ArrangementView`](https://developer.apple.com/documentation/swiftui/arrangementview) | 27.1 | 27.1 | 8 |

### 文本、图像与控件

| API | iOS | macOS | 章节 |
| --- | --- | --- | --- |
| [`AsyncImage`](https://developer.apple.com/documentation/swiftui/asyncimage) | 15 | 12 | 14 |
| [`AsyncImage(request:)`](https://developer.apple.com/documentation/swiftui/asyncimage/init(request:scale:)) | 27 | 27 | 14 |
| [`asyncImageURLSession`](https://developer.apple.com/documentation/swiftui/view/asyncimageurlsession(_:)) | 27 | 27 | 14 |
| [`labelIconToTitleSpacing`](https://developer.apple.com/documentation/swiftui/view/labelicontotitlespacing(_:)) | 26 | 26 | 14 |
| [`Gauge`](https://developer.apple.com/documentation/swiftui/gauge) | 16 | 13 | 15 |
| [`ContentUnavailableView`](https://developer.apple.com/documentation/swiftui/contentunavailableview) | 17 | 14 | 17 |
| [`buttonSizing`](https://developer.apple.com/documentation/swiftui/view/buttonsizing(_:)) | 26 | 26 | 15 |
| [`GlassButtonStyle（.glass）`](https://developer.apple.com/documentation/swiftui/glassbuttonstyle) | 26 | 26 | 15 |
| [`TabsPickerStyle（.tabs）`](https://developer.apple.com/documentation/swiftui/tabspickerstyle) | 27 | 27 | 15 |
| [`TextEditor 富文本（AttributedString）`](https://developer.apple.com/documentation/swiftui/texteditor/init(text:selection:)) | 26 | 26 | 16 |
| [`BorderedTextFieldStyle（.bordered）`](https://developer.apple.com/documentation/swiftui/borderedtextfieldstyle) | 27 | 27 | 16 |
| [`MeshGradient`](https://developer.apple.com/documentation/swiftui/meshgradient) | 18 | 15 | 22 |
| [`ConcentricRectangle`](https://developer.apple.com/documentation/swiftui/concentricrectangle) | 26 | 26 | 22 |
| [`Color.mix`](https://developer.apple.com/documentation/swiftui/color/mix(with:by:in:)) | 18 | 15 | 22 |

### 列表与滚动

| API | iOS | macOS | 章节 |
| --- | --- | --- | --- |
| [`Table`](https://developer.apple.com/documentation/swiftui/table) | 16 | 12 | 17 |
| [`swipeActions`](https://developer.apple.com/documentation/swiftui/view/swipeactions(edge:allowsfullswipe:content:)) | 15 | 12 | 17 |
| [`swipeActionsContainer`](https://developer.apple.com/documentation/swiftui/view/swipeactionscontainer()) | 27 | 27 | 17 |
| [`reorderable`](https://developer.apple.com/documentation/swiftui/dynamicviewcontent/reorderable()) | 27 | 27 | 17 |
| [`reorderContainer`](https://developer.apple.com/documentation/swiftui/view/reordercontainer(for:isenabled:move:)) | 27 | 27 | 17 |
| [`sectionIndexLabel`](https://developer.apple.com/documentation/swiftui/view/sectionindexlabel(_:)) | 26 | 26 | 17 |
| [`scrollPosition(id:)`](https://developer.apple.com/documentation/swiftui/view/scrollposition(id:anchor:)) | 17 | 14 | 18 |
| [`ScrollPosition 类型`](https://developer.apple.com/documentation/swiftui/scrollposition) | 18 | 15 | 18 |
| [`scrollTargetBehavior`](https://developer.apple.com/documentation/swiftui/view/scrolltargetbehavior(_:)) | 17 | 14 | 18 |
| [`contentMargins`](https://developer.apple.com/documentation/swiftui/view/contentmargins(_:_:for:)) | 17 | 14 | 18 |
| [`onScrollGeometryChange`](https://developer.apple.com/documentation/swiftui/view/onscrollgeometrychange(for:of:action:)) | 18 | 15 | 18 |
| [`onScrollPhaseChange`](https://developer.apple.com/documentation/swiftui/view/onscrollphasechange(_:)) | 18 | 15 | 18 |
| [`onScrollVisibilityChange`](https://developer.apple.com/documentation/swiftui/view/onscrollvisibilitychange(threshold:_:)) | 18 | 15 | 18 |
| [`scrollEdgeEffectStyle`](https://developer.apple.com/documentation/swiftui/view/scrolledgeeffectstyle(_:for:)) | 26 | 26 | 18 |
| [`scrollTransition`](https://developer.apple.com/documentation/swiftui/view/scrolltransition(_:axis:transition:)) | 17 | 14 | 30 |

### 导航、呈现与工具栏

| API | iOS | macOS | 章节 |
| --- | --- | --- | --- |
| [`NavigationStack`](https://developer.apple.com/documentation/swiftui/navigationstack) | 16 | 13 | 19 |
| [`NavigationSplitView`](https://developer.apple.com/documentation/swiftui/navigationsplitview) | 16 | 13 | 19 |
| [`Tab`](https://developer.apple.com/documentation/swiftui/tab) | 18 | 15 | 19 |
| [`TabRole.prominent`](https://developer.apple.com/documentation/swiftui/tabrole/prominent) | 27 | 27 | 19 |
| [`navigationSubtitle`](https://developer.apple.com/documentation/swiftui/view/navigationsubtitle(_:)) | 26 | 13 | 19 |
| [`TabSection`](https://developer.apple.com/documentation/swiftui/tabsection) | 18 | 15 | 19 |
| [`tabBarMinimizeBehavior`](https://developer.apple.com/documentation/swiftui/view/tabbarminimizebehavior(_:)) | 26 | 26 | 19 |
| [`tabViewBottomAccessory`](https://developer.apple.com/documentation/swiftui/view/tabviewbottomaccessory(content:)) | 26 | — | 19 |
| [`presentationDetents`](https://developer.apple.com/documentation/swiftui/view/presentationdetents(_:)) | 16 | 13 | 20 |
| [`inspector`](https://developer.apple.com/documentation/swiftui/view/inspector(ispresented:content:)) | 17 | 14 | 20 |
| [`presentationSizing`](https://developer.apple.com/documentation/swiftui/view/presentationsizing(_:)) | 18 | 15 | 20 |
| [`navigationTransition`](https://developer.apple.com/documentation/swiftui/view/navigationtransition(_:)) | 18 | 15 | 28 |
| [`CrossFadeNavigationTransition`](https://developer.apple.com/documentation/swiftui/crossfadenavigationtransition) | 27 | — | 28 |
| [`ToolbarSpacer`](https://developer.apple.com/documentation/swiftui/toolbarspacer) | 26 | 26 | 21 |
| [`ToolbarOverflowMenu`](https://developer.apple.com/documentation/swiftui/toolbaroverflowmenu) | 27 | — | 21 |
| [`visibilityPriority`](https://developer.apple.com/documentation/swiftui/toolbarcontent/visibilitypriority(_:)) | 27 | 26.1 | 21 |
| [`toolbarMinimizationBehavior`](https://developer.apple.com/documentation/swiftui/view/toolbarminimizationbehavior(_:for:)) | 27 | 27 | 21 |
| [`searchable`](https://developer.apple.com/documentation/swiftui/view/searchable(text:placement:prompt:)) | 16 | 13 | 21 |
| [`ButtonRole.confirm`](https://developer.apple.com/documentation/swiftui/buttonrole/confirm) | 26 | 26 | 21 |

### Liquid Glass

| API | iOS | macOS | 章节 |
| --- | --- | --- | --- |
| [`glassEffect`](https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:)) | 26 | 26 | 23 |
| [`GlassEffectContainer`](https://developer.apple.com/documentation/swiftui/glasseffectcontainer) | 26 | 26 | 23 |
| [`glassEffectID`](https://developer.apple.com/documentation/swiftui/view/glasseffectid(_:in:)) | 26 | 26 | 23 |
| [`glassEffectUnion`](https://developer.apple.com/documentation/swiftui/view/glasseffectunion(id:namespace:)) | 26 | 26 | 23 |
| [`backgroundExtensionEffect`](https://developer.apple.com/documentation/swiftui/view/backgroundextensioneffect()) | 26 | 26 | 23 |

### 手势与系统能力

| API | iOS | macOS | 章节 |
| --- | --- | --- | --- |
| [`contentShape`](https://developer.apple.com/documentation/swiftui/view/contentshape(_:eofill:)) | 13 | 10.15 | 24 |
| [`MagnifyGesture`](https://developer.apple.com/documentation/swiftui/magnifygesture) | 17 | 14 | 24 |
| [`RotateGesture`](https://developer.apple.com/documentation/swiftui/rotategesture) | 17 | 14 | 24 |
| [`GestureInputKinds`](https://developer.apple.com/documentation/swiftui/gestureinputkinds) | 27 | 27 | 24 |
| [`sensoryFeedback`](https://developer.apple.com/documentation/swiftui/view/sensoryfeedback(_:trigger:)) | 17 | 14 | 24 |
| [`pointerStyle`](https://developer.apple.com/documentation/swiftui/view/pointerstyle(_:)) | — | 15 | 24 |
| [`ShareLink`](https://developer.apple.com/documentation/swiftui/sharelink) | 16 | 13 | 25 |
| [`dragContainer`](https://developer.apple.com/documentation/swiftui/view/dragcontainer(for:in:_:)) | 27 | 26 | 25 |
| [`copyable`](https://developer.apple.com/documentation/swiftui/view/copyable(_:)) | 27 | 13 | 25 |
| [`Transferable`](https://developer.apple.com/documentation/coretransferable/transferable) | 16 | 13 | 25 |
| [`PhotosPicker`](https://developer.apple.com/documentation/photosui/photospicker) | 16 | 13 | 25 |
| [`WebView`](https://developer.apple.com/documentation/webkit/webview-swift.struct) | 26 | 26 | 25 |
| [`Chart`](https://developer.apple.com/documentation/charts/chart) | 16 | 13 | 25 |

### 动画

| API | iOS | macOS | 章节 |
| --- | --- | --- | --- |
| [`withAnimation 完成回调`](https://developer.apple.com/documentation/swiftui/withanimation(_:completioncriteria:_:completion:)) | 17 | 14 | 26 |
| [`animation(_:body:)`](https://developer.apple.com/documentation/swiftui/view/animation(_:body:)) | 17 | 14 | 26 |
| [`spring(duration:bounce:)`](https://developer.apple.com/documentation/swiftui/animation/spring(duration:bounce:blendduration:)) | 13 | 10.15 | 27 |
| [`Transition 协议`](https://developer.apple.com/documentation/swiftui/transition) | 17 | 14 | 28 |
| [`contentTransition`](https://developer.apple.com/documentation/swiftui/view/contenttransition(_:)) | 16 | 13 | 28 |
| [`matchedGeometryEffect`](https://developer.apple.com/documentation/swiftui/view/matchedgeometryeffect(id:in:properties:anchor:issource:)) | 14 | 11 | 28 |
| [`PhaseAnimator`](https://developer.apple.com/documentation/swiftui/phaseanimator) | 17 | 14 | 29 |
| [`KeyframeAnimator`](https://developer.apple.com/documentation/swiftui/keyframeanimator) | 17 | 14 | 29 |
| [`TimelineView`](https://developer.apple.com/documentation/swiftui/timelineview) | 15 | 12 | 29 |
| [`@Animatable（宏）`](https://developer.apple.com/documentation/swiftui/animatable()) | 13 | 10.15 | 29 |
| [`CustomAnimation`](https://developer.apple.com/documentation/swiftui/customanimation) | 17 | 14 | 29 |
| [`visualEffect`](https://developer.apple.com/documentation/swiftui/view/visualeffect(_:)) | 17 | 14 | 30 |
| [`symbolEffect`](https://developer.apple.com/documentation/swiftui/view/symboleffect(_:options:value:)) | 17 | 14 | 30 |
| [`Shader / colorEffect`](https://developer.apple.com/documentation/swiftui/view/coloreffect(_:isenabled:)) | 17 | 14 | 30 |
| [`textRenderer`](https://developer.apple.com/documentation/swiftui/view/textrenderer(_:)) | 18 | 15 | 30 |
| [`geometryGroup`](https://developer.apple.com/documentation/swiftui/view/geometrygroup()) | 17 | 14 | 30 |

### 平台

| API | iOS | macOS | 章节 |
| --- | --- | --- | --- |
| [`MenuBarExtra`](https://developer.apple.com/documentation/swiftui/menubarextra) | — | 13 | 32 |
| [`UtilityWindow`](https://developer.apple.com/documentation/swiftui/utilitywindow) | — | 15 | 32 |
| [`Window`](https://developer.apple.com/documentation/swiftui/window) | — | 13 | 32 |
| [`openWindow`](https://developer.apple.com/documentation/swiftui/openwindowaction) | 16 | 13 | 32 |
| [`onKeyPress`](https://developer.apple.com/documentation/swiftui/view/onkeypress(_:action:)) | 17 | 14 | 32 |
| [`FocusedValue`](https://developer.apple.com/documentation/swiftui/focusedvalue) | 14 | 11 | 32 |
| [`Document 协议`](https://developer.apple.com/documentation/swiftui/document) | 27 | 27 | 32 |
| [`ReadableDocument`](https://developer.apple.com/documentation/swiftui/readabledocument) | 27 | 27 | 32 |
| [`ReservedRegion`](https://developer.apple.com/documentation/swiftui/reservedregion) | 27.1 | 27.1 | 31 |
| [`onHingeChange`](https://developer.apple.com/documentation/swiftui/view/onhingechange(isenabled:_:)) | 27.1 | 27.1 | 31 |
| [`UIHostingConfiguration`](https://developer.apple.com/documentation/swiftui/uihostingconfiguration) | 16 | — | 31 |

## 只在一个平台上存在的 API

写多平台代码时最容易在这些地方遇到编译错误。左边一列的 API 在 macOS 上不可用，右边一列的在 iOS 上不可用。表中每一项都在 Xcode 27.2 上用两个平台的 SDK 分别编译验证过。

| 仅 iOS / iPadOS | 仅 macOS |
| --- | --- |
| `.navigationBarTitleDisplayMode` | `Window`、`Settings`、`MenuBarExtra`、`UtilityWindow` 场景 |
| `.fullScreenCover` | `.windowStyle`、`.windowToolbarStyle` |
| `.keyboardType`、`.textInputAutocapitalization` | `HSplitView`、`VSplitView` |
| `EditButton`、`editMode` 环境值 | `.pointerStyle` |
| `.statusBarHidden` | `.alternatingRowBackgrounds` |
| `.listRowSpacing`、`.listSectionSpacing` | `Toggle` 的 `.checkbox` 样式 |
| `ToolbarItemPlacement` 的 `.topBarLeading`、`.topBarTrailing`、`.bottomBar`、`.topBarPinnedTrailing` | `Picker` 的 `.radioGroup` 样式 |
| `ToolbarOverflowMenu` | `.onExitCommand`、`.onDeleteCommand`、`.onMoveCommand` |
| `.navigationTransition(.zoom)`、`.crossFade` | `NSViewRepresentable`、`NSHostingView` |
| `.tabViewBottomAccessory` | `@NSApplicationDelegateAdaptor` |
| `.tabBarMinimizeBehavior(.onScrollDown)` | `TextField` 的 `.squareBorder` 样式 |
| `Picker` 的 `.wheel`、`.navigationLink` 样式 | `DatePicker` 的 `.field`、`.stepperField` 样式 |
| `MultiDatePicker` | `.menuBarExtraStyle` |
| `.hoverEffect` | |
| `UIViewRepresentable`、`UIHostingController`、`UIHostingConfiguration` | |
| `@UIApplicationDelegateAdaptor` | |

## 跟着编译器走的特性

下面这些不取决于应用运行在哪个系统上，而取决于你**用哪个版本的 Xcode 编译**。只要编译器够新，部署到旧系统也能用。

| 特性 | 需要的 Xcode | 说明 | 章节 |
| --- | --- | --- | --- |
| `#Preview` 宏 | 15 | 取代 `PreviewProvider` | 2 |
| `@Entry` 宏 | 16 | 简化环境值、焦点值、容器值的定义 | 11 |
| `@Previewable` 宏 | 16 | 在预览里直接声明 `@State`。预览需要 iOS 17 / macOS 14 | 2 |
| Swift 6 语言模式 | 16 | 完整的数据竞争检查 | 12 |
| 默认主 actor 隔离、`@concurrent` | 26 | Swift 6.2 | 12 |
| `@Animatable` 宏 | 26 | 自动生成 `animatableData` | 29 |
| 模块选择器 `::`、`@c` | 26.4 | Swift 6.3 | 附录 A |
| `@State` 宏 | 27 | 默认值只在首次建立时求值 | 9 |
| `ContentBuilder` | 27 | 统一的构建器 | 3、21 |
| `alert(_:item:actions:)`、`alert(error:actions:)` | 27 | 数据驱动的 alert | 20 |
| `anyAppleOS` 可用性 | 27 | Swift 6.4 | 33 |
| `defer` 里的 `await`、`withTaskCancellationShield` | 27 | Swift 6.4 | 12 |
| `some P?` 不加括号、`@diagnose` | 27 | Swift 6.4 | 附录 A |

## 按部署版本看能用什么

| 最低部署版本 | 新增的主要能力 |
| --- | --- |
| **iOS 16 / macOS 13** | `NavigationStack`、`NavigationSplitView`、`Grid`、`Layout` 协议、`ViewThatFits`、`Table`（iOS）、`ShareLink`、`Transferable`、`PhotosPicker`、Swift Charts、sheet 的高度档位 |
| **iOS 17 / macOS 14** | `@Observable`、SwiftData、`scrollPosition`、`scrollTargetBehavior`、`containerRelativeFrame`、`PhaseAnimator`、`KeyframeAnimator`、`Transition` 协议、`symbolEffect`、着色器、`visualEffect`、`scrollTransition`、`ContentUnavailableView`、`inspector`、`sensoryFeedback`、`onKeyPress` |
| **iOS 18 / macOS 15** | `Tab` 与 `.sidebarAdaptable`、缩放转场、`MeshGradient`、`ScrollPosition`、`onScrollGeometryChange`、`textRenderer`、容器值与 `ForEach(subviews:)`、`presentationSizing`、`UtilityWindow`、`pointerStyle` |
| **iOS 26 / macOS 26** | Liquid Glass 全套、`WebView`、富文本 `TextEditor`、`ToolbarSpacer`、`safeAreaBar`、滚动边缘效果、`Observations`、`Chart3D`、按钮的 `.confirm` / `.close` 角色、`ConcentricRectangle`、符号的绘制效果 |
| **iOS 27 / macOS 27** | `reorderable`、`swipeActionsContainer`、新的 `Document` 协议、`AsyncImage` 的请求与缓存配置、手势的输入来源、工具栏的可见性优先级、`.tabs` 选择器样式、`TabRole.prominent` |
| **iOS 27.1 / macOS 27.1** | `ArrangementView`、保留区域、铰链状态 |

## 自己核对版本的方法

教程不可能覆盖所有 API，系统也会继续更新。三种查版本的办法：

1. **看文档页面。** 每个 API 的官方文档页面右侧（或标题下方）列出了各平台的最低版本。
2. **在 Xcode 里按住 <kbd>⌥ Option</kbd> 点击一个符号**，弹出的快速帮助里有 Availability 一栏。
3. **让编译器告诉你。** 把部署版本设成你要支持的最低版本，用到更新的 API 时编译器会直接报错并提示需要的版本。这是最可靠的办法，也是不会漏掉的办法。

## 官方来源

- [SwiftUI 更新记录（按发布时间列出新增 API）](https://developer.apple.com/documentation/updates/swiftui)
- [SwiftUI 框架文档](https://developer.apple.com/documentation/swiftui)
- [iOS & iPadOS Release Notes](https://developer.apple.com/documentation/ios-ipados-release-notes)
- [macOS Release Notes](https://developer.apple.com/documentation/macos-release-notes)
- [Xcode Release Notes](https://developer.apple.com/documentation/xcode-release-notes)
- [Running code on a specific platform or OS version](https://developer.apple.com/documentation/xcode/running-code-on-a-specific-version)
