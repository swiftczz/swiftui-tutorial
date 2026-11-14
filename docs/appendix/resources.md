# 附录 C：官方资源索引

每章末尾已经列出了对应的官方文档。这篇附录把它们按用途重新整理，并补充一些值得收藏的入口，方便你在学完之后继续查阅。

所有链接都指向 Apple 或 Swift 项目的官方网站。

## 怎么查官方文档

几个能省不少时间的技巧：

- **在 Xcode 里直接查。** 按住 <kbd>⌥ Option</kbd> 点击代码里的任意符号，弹出快速帮助；<kbd>⌃⌘</kbd> 点击（或右键 › Jump to Definition）跳到声明；**Help › Developer Documentation**（<kbd>⇧⌘0</kbd>）打开完整的离线文档。
- **文档的网址是有规律的。** 类型在 `developer.apple.com/documentation/swiftui/类型名`，视图修饰符在 `.../swiftui/view/修饰符名(参数标签:)`。
- **先看专题页，再看具体 API。** SwiftUI 文档首页按主题分了组（布局、导航、动画等），每个专题页会把相关的类型和修饰符列在一起，比逐个搜索更容易建立全貌。
- **每年 6 月之后看一眼更新记录。** “SwiftUI updates”页面按发布时间列出了所有新增的 API，是跟上变化最快的办法。
- **示例项目值得读。** Apple 的示例项目是完整的、可运行的应用，展示了官方推荐的写法。

## 入门与教程

| 资源 | 说明 |
| --- | --- |
| [Develop in Swift Tutorials](https://developer.apple.com/tutorials/develop-in-swift) | Apple 官方的系统入门教程，从零开始做几个完整的应用 |
| [SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui) | 经典的 Landmarks 系列教程，一步步构建一个应用 |
| [Exploring SwiftUI concepts](https://developer.apple.com/tutorials/swiftui-concepts) | 概念讲解：视图、布局、状态、数据流 |
| [SwiftUI 首页](https://developer.apple.com/swiftui/) | 框架的介绍页，汇总了最新的特性和资源入口 |
| [SwiftUI Pathway](https://developer.apple.com/pathways/swiftui/) | Apple 整理的学习路径：按顺序排好的文档、视频和教程 |

## 框架文档

### SwiftUI 的专题页

| 主题 | 链接 | 对应章节 |
| --- | --- | --- |
| 框架总览 | [SwiftUI](https://developer.apple.com/documentation/swiftui) | 全部 |
| 更新记录 | [SwiftUI updates](https://developer.apple.com/documentation/updates/swiftui) | 附录 A、B |
| 应用结构 | [App organization](https://developer.apple.com/documentation/swiftui/app-organization) | 2 |
| 场景 | [Scenes](https://developer.apple.com/documentation/swiftui/scenes) | 2、32 |
| 窗口 | [Windows](https://developer.apple.com/documentation/swiftui/windows) | 32 |
| 文档型应用 | [Documents](https://developer.apple.com/documentation/swiftui/documents) | 32 |
| 导航 | [Navigation](https://developer.apple.com/documentation/swiftui/navigation) | 19 |
| 模态呈现 | [Modal presentations](https://developer.apple.com/documentation/swiftui/modal-presentations) | 20 |
| 工具栏 | [Toolbars](https://developer.apple.com/documentation/swiftui/toolbars) | 21 |
| 搜索 | [Search](https://developer.apple.com/documentation/swiftui/search) | 21 |
| 数据与状态 | [Model data](https://developer.apple.com/documentation/swiftui/model-data) | 9、10 |
| 环境值 | [Environment values](https://developer.apple.com/documentation/swiftui/environment-values) | 11 |
| 偏好 | [Preferences](https://developer.apple.com/documentation/swiftui/preferences) | 11 |
| 视图基础 | [View fundamentals](https://developer.apple.com/documentation/swiftui/view-fundamentals) | 3 |
| 视图配置 | [View configuration](https://developer.apple.com/documentation/swiftui/view-configuration) | 4 |
| 样式 | [View styles](https://developer.apple.com/documentation/swiftui/view-styles) | 4、15 |
| 布局基础 | [Layout fundamentals](https://developer.apple.com/documentation/swiftui/layout-fundamentals) | 5、6、7 |
| 布局调整 | [Layout adjustments](https://developer.apple.com/documentation/swiftui/layout-adjustments) | 5、8 |
| 自定义布局 | [Custom layout](https://developer.apple.com/documentation/swiftui/custom-layout) | 8 |
| 列表 | [Lists](https://developer.apple.com/documentation/swiftui/lists) | 17 |
| 表格 | [Tables](https://developer.apple.com/documentation/swiftui/tables) | 17 |
| 滚动视图 | [Scroll views](https://developer.apple.com/documentation/swiftui/scroll-views) | 18 |
| 文本输入与输出 | [Text input and output](https://developer.apple.com/documentation/swiftui/text-input-and-output) | 14、16 |
| 图像 | [Images](https://developer.apple.com/documentation/swiftui/images) | 14 |
| 控件 | [Controls and indicators](https://developer.apple.com/documentation/swiftui/controls-and-indicators) | 15 |
| 菜单与命令 | [Menus and commands](https://developer.apple.com/documentation/swiftui/menus-and-commands) | 15、32 |
| 形状 | [Shapes](https://developer.apple.com/documentation/swiftui/shapes) | 22 |
| 绘制 | [Drawing and graphics](https://developer.apple.com/documentation/swiftui/drawing-and-graphics) | 22、30 |
| 动画 | [Animations](https://developer.apple.com/documentation/swiftui/animations) | 26–30 |
| 手势 | [Gestures](https://developer.apple.com/documentation/swiftui/gestures) | 24 |
| 输入事件 | [Input events](https://developer.apple.com/documentation/swiftui/input-events) | 24、32 |
| 焦点 | [Focus](https://developer.apple.com/documentation/swiftui/focus) | 16、32 |
| 剪贴板 | [Clipboard](https://developer.apple.com/documentation/swiftui/clipboard) | 25 |
| 拖放 | [Drag and drop](https://developer.apple.com/documentation/swiftui/drag-and-drop) | 25 |
| 文件导入 | [`fileImporter`](https://developer.apple.com/documentation/swiftui/view/fileimporter(ispresented:allowedcontenttypes:oncompletion:)) | 25 |
| 无障碍 | [Accessibility fundamentals](https://developer.apple.com/documentation/swiftui/accessibility-fundamentals) | 36 |
| UIKit 集成 | [UIKit integration](https://developer.apple.com/documentation/swiftui/uikit-integration) | 31 |
| AppKit 集成 | [AppKit integration](https://developer.apple.com/documentation/swiftui/appkit-integration) | 32 |
| 预览 | [Previews in Xcode](https://developer.apple.com/documentation/swiftui/previews-in-xcode) | 2 |
| 性能分析 | [Performance analysis](https://developer.apple.com/documentation/swiftui/performance-analysis) | 35 |

### 相关框架

| 框架 | 链接 | 对应章节 |
| --- | --- | --- |
| Observation | [Observation](https://developer.apple.com/documentation/observation) | 10 |
| SwiftData | [SwiftData](https://developer.apple.com/documentation/swiftdata) | 13 |
| Swift 并发 | [Concurrency](https://developer.apple.com/documentation/swift/concurrency) | 12 |
| Core Transferable | [Core Transferable](https://developer.apple.com/documentation/coretransferable) | 25 |
| Swift Charts | [Swift Charts](https://developer.apple.com/documentation/charts) | 25 |
| MapKit for SwiftUI | [MapKit for SwiftUI](https://developer.apple.com/documentation/mapkit/mapkit-for-swiftui) | 25 |
| WebKit for SwiftUI | [WebKit for SwiftUI](https://developer.apple.com/documentation/webkit/webkit-for-swiftui) | 25 |
| PhotosUI | [PhotosUI](https://developer.apple.com/documentation/photosui) | 25 |
| Symbols | [Symbols](https://developer.apple.com/documentation/symbols) | 14、30 |
| WidgetKit | [WidgetKit](https://developer.apple.com/documentation/widgetkit) | 31 |
| App Intents | [App Intents](https://developer.apple.com/documentation/appintents) | 25 |
| Swift Testing | [Swift Testing](https://developer.apple.com/documentation/testing) | 34 |
| Foundation | [Foundation](https://developer.apple.com/documentation/foundation) | 14、36 |
| Accessibility | [Accessibility](https://developer.apple.com/documentation/accessibility) | 36 |

## Swift 语言

| 资源 | 说明 |
| --- | --- |
| [The Swift Programming Language](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/) | 官方语言手册。结果构建器、不透明类型、宏、并发都在这里有权威的说明 |
| [Swift.org 博客](https://www.swift.org/blog/) | 每个版本的发布说明和重要特性的介绍文章 |
| [Swift Evolution](https://www.swift.org/swift-evolution/) | 所有语言提案的列表和状态，可以按版本筛选 |
| [What's New in Swift](https://developer.apple.com/swift/whats-new/) | Apple 对每个版本新特性的概述 |
| [Swift 标准库文档](https://developer.apple.com/documentation/swift) | 标准库的 API 文档 |
| [Adopting strict concurrency in Swift 6 apps](https://developer.apple.com/documentation/swift/adoptingswift6) | 迁移到 Swift 6 语言模式的官方指南 |
| [Swift 6.2 发布说明](https://www.swift.org/blog/swift-6.2-released/) | 默认主 actor 隔离、易用并发 |
| [Swift 6.3 发布说明](https://www.swift.org/blog/swift-6.3-released/) | 模块选择器、`@c` |
| [Swift 6.4 发布说明](https://www.swift.org/blog/swift-6.4-released/) | `defer` 中的 `await`、`@diagnose`、所有权相关的新类型 |

## 设计规范

写界面不只是写代码。Apple 的人机界面指南（Human Interface Guidelines，简称 HIG）解释了每个平台的设计原则和每个组件应该怎么用。

| 主题 | 链接 |
| --- | --- |
| 总览 | [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) |
| 为 iOS 设计 | [Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios) |
| 为 iPadOS 设计 | [Designing for iPadOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados) |
| 为 macOS 设计 | [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos) |
| 布局 | [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) |
| 字体排印 | [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) |
| 颜色 | [Color](https://developer.apple.com/design/human-interface-guidelines/color) |
| 材质（含 Liquid Glass） | [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) |
| SF Symbols | [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) |
| 动效 | [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) |
| 手势 | [Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures) |
| 无障碍 | [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) |
| 从右向左 | [Right to left](https://developer.apple.com/design/human-interface-guidelines/right-to-left) |
| 菜单栏 | [The menu bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar) |
| 工具栏 | [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) |
| 设计资源下载 | [Apple Design Resources](https://developer.apple.com/design/resources/) |
| SF Symbols 应用 | [SF Symbols](https://developer.apple.com/sf-symbols/) |

## 官方示例项目

读完整的项目是提高最快的方式之一。下面几个覆盖了教程里的大部分主题：

| 项目 | 展示了什么 |
| --- | --- |
| [Landmarks: Building an app with Liquid Glass](https://developer.apple.com/documentation/swiftui/landmarks-building-an-app-with-liquid-glass) | 26 系列的新设计：Liquid Glass、背景延伸、工具栏、多平台 |
| [Food Truck: Building a SwiftUI multiplatform app](https://developer.apple.com/documentation/swiftui/food-truck-building-a-swiftui-multiplatform-app) | 多平台应用的完整结构：导航、图表、小组件、实时活动 |
| [Backyard Birds](https://developer.apple.com/documentation/swiftui/backyard-birds-sample) | SwiftData、小组件、应用内购买 |
| [Composing custom layouts with SwiftUI](https://developer.apple.com/documentation/swiftui/composing-custom-layouts-with-swiftui) | `Layout` 协议、`Grid`、`ViewThatFits`、`AnyLayout` |
| [Creating visual effects with SwiftUI](https://developer.apple.com/documentation/swiftui/creating-visual-effects-with-swiftui) | 滚动效果、着色器、`TextRenderer`、网格渐变 |
| [Bringing robust navigation structure to your SwiftUI app](https://developer.apple.com/documentation/swiftui/bringing-robust-navigation-structure-to-your-swiftui-app) | `NavigationStack`、`NavigationSplitView`、状态恢复 |
| [Enhancing your app's content with tab navigation](https://developer.apple.com/documentation/swiftui/enhancing-your-app-content-with-tab-navigation) | `Tab`、`TabSection`、自适应侧边栏 |
| [Building rich SwiftUI text experiences](https://developer.apple.com/documentation/swiftui/building-rich-swiftui-text-experiences) | 富文本 `TextEditor` 与 `AttributedString` |
| [Destination Video](https://developer.apple.com/documentation/visionos/destination-video) | 跨 iOS、macOS、tvOS、visionOS 的媒体应用 |

## WWDC 讲座

WWDC 的讲座是理解设计意图的最佳途径：工程师会解释一个 API 为什么这样设计。下面按主题列出教程引用过的讲座，建议按顺序观看。

### 原理

| 讲座 | 年份 | 内容 |
| --- | --- | --- |
| [Demystify SwiftUI](https://developer.apple.com/videos/play/wwdc2021/10022/) | 2021 | 身份、生命周期、依赖。**最重要的一场，必看** |
| [Data Essentials in SwiftUI](https://developer.apple.com/videos/play/wwdc2020/10040/) | 2020 | 数据流的设计思想 |
| [Building Custom Views with SwiftUI](https://developer.apple.com/videos/play/wwdc2019/237/) | 2019 | 布局流程的官方讲解 |
| [Demystify SwiftUI performance](https://developer.apple.com/videos/play/wwdc2023/10160/) | 2023 | 依赖、更新与性能 |
| [Demystify SwiftUI containers](https://developer.apple.com/videos/play/wwdc2024/10146/) | 2024 | 自定义容器、容器值 |

### 状态与并发

| 讲座 | 年份 | 内容 |
| --- | --- | --- |
| [Discover Observation in SwiftUI](https://developer.apple.com/videos/play/wwdc2023/10149/) | 2023 | `@Observable` |
| [Meet SwiftData](https://developer.apple.com/videos/play/wwdc2023/10187/) | 2023 | SwiftData 入门 |
| [Build an app with SwiftData](https://developer.apple.com/videos/play/wwdc2023/10154/) | 2023 | SwiftData 实战 |
| [Embracing Swift concurrency](https://developer.apple.com/videos/play/wwdc2025/268/) | 2025 | 默认主 actor 隔离与易用并发 |
| [Explore concurrency in SwiftUI](https://developer.apple.com/videos/play/wwdc2025/266/) | 2025 | SwiftUI 里的并发 |

### 布局、导航与组件

| 讲座 | 年份 | 内容 |
| --- | --- | --- |
| [Compose custom layouts with SwiftUI](https://developer.apple.com/videos/play/wwdc2022/10056/) | 2022 | `Grid`、`Layout` 协议 |
| [The SwiftUI cookbook for navigation](https://developer.apple.com/videos/play/wwdc2022/10054/) | 2022 | 数据驱动的导航 |
| [Beyond scroll views](https://developer.apple.com/videos/play/wwdc2023/10159/) | 2023 | 滚动位置、吸附、滚动转场 |
| [Elevate your tab and sidebar experience in iPadOS](https://developer.apple.com/videos/play/wwdc2024/10147/) | 2024 | `Tab` 与自适应侧边栏 |
| [Meet Transferable](https://developer.apple.com/videos/play/wwdc2022/10062/) | 2022 | 分享、拖放、拷贝的统一模型 |
| [Meet WebKit for SwiftUI](https://developer.apple.com/videos/play/wwdc2025/231/) | 2025 | `WebView` 与 `WebPage` |
| [Code-along: Cook up a rich text experience in SwiftUI with AttributedString](https://developer.apple.com/videos/play/wwdc2025/280/) | 2025 | 富文本编辑 |

### 设计与 Liquid Glass

| 讲座 | 年份 | 内容 |
| --- | --- | --- |
| [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/) | 2025 | 设计语言的原理 |
| [Build a SwiftUI app with the new design](https://developer.apple.com/videos/play/wwdc2025/323/) | 2025 | 在 SwiftUI 里采用新设计 |
| [Elevate the design of your iPad app](https://developer.apple.com/videos/play/wwdc2025/208/) | 2025 | iPad 的窗口、菜单栏、指针 |
| [Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/) | 2018 | 流畅交互的设计原则。虽然早，但讲透了为什么要用弹簧 |

### 动画

| 讲座 | 年份 | 内容 |
| --- | --- | --- |
| [Explore SwiftUI animation](https://developer.apple.com/videos/play/wwdc2023/10156/) | 2023 | 动画系统的工作原理。**动画部分必看** |
| [Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/) | 2023 | 弹簧动画 |
| [Wind your way through advanced animations in SwiftUI](https://developer.apple.com/videos/play/wwdc2023/10157/) | 2023 | `PhaseAnimator`、`KeyframeAnimator` |
| [Enhance your UI animations and transitions](https://developer.apple.com/videos/play/wwdc2024/10145/) | 2024 | 缩放转场 |
| [Create custom visual effects with SwiftUI](https://developer.apple.com/videos/play/wwdc2024/10151/) | 2024 | 滚动效果、着色器、`TextRenderer` |
| [Animate symbols in your app](https://developer.apple.com/videos/play/wwdc2023/10258/) | 2023 | 符号动画 |

### 平台与工程

| 讲座 | 年份 | 内容 |
| --- | --- | --- |
| [Bring multiple windows to your SwiftUI app](https://developer.apple.com/videos/play/wwdc2022/10061/) | 2022 | 多窗口 |
| [Tailor macOS windows with SwiftUI](https://developer.apple.com/videos/play/wwdc2024/10148/) | 2024 | Mac 窗口的配置 |
| [Use Xcode to develop a multiplatform app](https://developer.apple.com/videos/play/wwdc2022/110371/) | 2022 | 多平台项目的设置 |
| [Optimize SwiftUI performance with Instruments](https://developer.apple.com/videos/play/wwdc2025/306/) | 2025 | 新的 SwiftUI 性能工具 |
| [Meet Swift Testing](https://developer.apple.com/videos/play/wwdc2024/10179/) | 2024 | Swift Testing |
| [Catch up on accessibility in SwiftUI](https://developer.apple.com/videos/play/wwdc2024/10073/) | 2024 | SwiftUI 无障碍 |
| [Discover String Catalogs](https://developer.apple.com/videos/play/wwdc2023/10155/) | 2023 | 本地化 |

每年的 WWDC 讲座都可以在 [developer.apple.com/videos](https://developer.apple.com/videos/) 按年份和主题浏览。每年 6 月之后，优先看当年的 “What's new in SwiftUI”。

## Xcode 与工具

| 资源 | 说明 |
| --- | --- |
| [Xcode 文档](https://developer.apple.com/documentation/xcode) | Xcode 的完整使用文档 |
| [Xcode Release Notes](https://developer.apple.com/documentation/xcode-release-notes) | 每个版本的更新、已知问题和解决办法 |
| [Configuring a multiplatform app](https://developer.apple.com/documentation/xcode/configuring-a-multiplatform-app-target) | 多平台 target 的配置 |
| [Localization](https://developer.apple.com/documentation/xcode/localization) | 本地化的工具和流程 |
| [Understanding and improving SwiftUI performance](https://developer.apple.com/documentation/xcode/understanding-and-improving-swiftui-performance) | 用 Instruments 分析 SwiftUI |
| [Organizing your code with local packages](https://developer.apple.com/documentation/xcode/organizing-your-code-with-local-packages) | 用 Swift Package 做模块化 |
| [Apple Developer Forums](https://developer.apple.com/forums/) | 官方开发者论坛，Apple 的工程师会在这里回答问题 |
| [Feedback Assistant](https://feedbackassistant.apple.com) | 向 Apple 报告 bug 和提交功能建议 |

## 系统发布说明

遇到某个版本上的奇怪行为时，先查发布说明里的“已知问题”：

- [iOS & iPadOS Release Notes](https://developer.apple.com/documentation/ios-ipados-release-notes)
- [macOS Release Notes](https://developer.apple.com/documentation/macos-release-notes)
- [Xcode Release Notes](https://developer.apple.com/documentation/xcode-release-notes)

## 关于这份教程

- 正文基于 Xcode 27.2（Swift 6.4.2）、iOS 27.2 与 macOS 27.2 的 SDK 编写。
- 全部 Swift 示例代码都用上述工具链，在 Swift 6 语言模式和默认主 actor 隔离的设置下做过类型检查。标注为只适用于某个平台的代码，在对应平台的 SDK 下检查。
- 文中引用的官方文档链接都经过了有效性校验。
- API 的系统版本要求读取自 Apple 开发者文档。Swift 各版本的特性归属以 swift.org 的发布说明为准。
- SwiftUI 每年都在更新。如果你读到这里时已经有了更新的版本，以官方文档为准，并留意 [SwiftUI 更新记录](https://developer.apple.com/documentation/updates/swiftui)。
