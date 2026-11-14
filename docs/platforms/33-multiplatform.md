# 33 多端统一：一套代码多个平台

## 本章目标

- 建立正确的预期：多端统一是“共享大部分，适配小部分”
- 知道 SwiftUI 已经自动适配了什么
- 掌握适配的四个层次，并知道优先用哪一层
- 用条件编译和可用性检查处理平台差异与版本差异，把它们收拢到少数几个地方
- 组织一个多平台项目的代码结构
- 为不同平台设计各自合适的导航、输入和密度
- 了解 Swift 6.4 的 `anyAppleOS` 可用性写法

这一章是前面所有内容的汇合点。你会发现，之前每一章里反复出现的那句“你描述用途，系统决定外观”，正是多端统一的基础。

## 先把预期摆正

关于跨平台，有两种说法：

- **“一次编写，到处运行”**：同一份界面原封不动地出现在所有平台上。
- **“一次学习，到处应用”**：用同一套工具和思路，为每个平台做出**适合它**的界面。

SwiftUI 属于后者，这是 Apple 在 2019 年发布它时就明确说过的。原因在上一章开头讲了：iPhone 和 Mac 的输入方式、使用场景完全不同。一个在 iPhone 上很好用的界面，原样搬到 Mac 上会显得粗大而低效；反过来则会小得没法点。

所以多端统一的目标不是“界面一模一样”，而是：

| 应该共享的 | 应该各自适配的 |
| --- | --- |
| 数据模型和业务逻辑（100%） | 应用的顶层结构（场景、导航方式） |
| 大部分视图：列表行、卡片、表单、详情内容 | 平台特有的功能（菜单栏、小组件、键盘、触感） |
| 设计语言：颜色、图标、文案 | 信息密度和控件尺寸 |
| 状态管理和数据流 | 输入方式（触摸、指针、键盘） |

实践中，一个设计良好的 SwiftUI 多平台应用，**八到九成的代码是共享的**。剩下的一两成才是这一章要讲的东西。

## SwiftUI 已经替你做了什么

回顾前面的章节。下面这些代码，你只写了一份，它们在每个平台上自动呈现为合适的样子：

| 你写的 | iOS 上 | macOS 上 | 章节 |
| --- | --- | --- | --- |
| `WindowGroup` | 全屏界面 | 可多开的窗口，自带窗口菜单 | 2 |
| `.font(.body)` | 17 点 | 13 点 | 14 |
| `Button("确定") {}` | 强调色文字 | 带边框的按钮 | 15 |
| `Toggle` | 滑动开关 | 复选框 | 15 |
| `Picker`（在表单里） | 行尾显示当前值，点击弹出菜单 | 弹出按钮 | 15 |
| `Form` | 分组的圆角列表 | 标签右对齐的两列 | 16 |
| `List` | 圆角分组，滑动操作 | 紧凑的行，方向键导航 | 17 |
| `.swipeActions` | 左滑、右滑 | 触控板双指滑动；同时出现在右键菜单里 | 17 |
| `NavigationSplitView` | 折叠成导航栈 | 多栏并排，可拖动侧边栏 | 19 |
| `TabView` + `.sidebarAdaptable` | 底部标签栏 | 侧边栏 | 19 |
| `.sheet` | 底部滑出的卡片，可下滑关闭 | 依附在窗口上的面板 | 20 |
| `.confirmationDialog` | 底部的操作列表 | 对话框 | 20 |
| `.popover` | 变成 sheet | 带箭头的气泡 | 20 |
| `ToolbarItem(placement: .confirmationAction)` | 导航栏尾部 | sheet 的右下角 | 21 |
| `.searchable` | 底部或导航栏下方的搜索框 | 工具栏尾部的搜索框 | 21 |
| `.contextMenu` | 长按 | 右键 | 15 |
| `.keyboardShortcut` | 接键盘时生效 | 生效，并显示在菜单里 | 31、32 |
| `.onHover` | 不触发 | 触发 | 24 |
| `Label` | 根据上下文显示图标、文字或两者 | 同左 | 14 |
| 语义颜色、SF Symbols、动态字体 | 自动适配 | 自动适配 | 14、22 |

这张表就是多端统一的第一原则：

::: tip 第一原则：用语义化的标准组件，不要覆盖它们的默认行为
你每强制指定一次样式（`.pickerStyle(.wheel)`、`.toggleStyle(.switch)`、`.listStyle(.insetGrouped)`），每自己画一个本可以用标准组件的控件，就放弃了一处自动适配。**默认值就是“在当前平台上最合适的样子”。**
:::

## 适配的四个层次

当默认行为不够时，有四种适配手段。它们的“侵入程度”依次递增，应该**从上往下**考虑，能在上一层解决的就不要用下一层。

```text
第一层  自动适配          标准组件 + 语义化 API            ← 尽量停在这里
第二层  响应环境          尺寸类别、可用空间、动态字体        ← 界面形态的差异
第三层  条件编译          #if os(...)                      ← API 在某个平台不存在时
第四层  分文件 / 分 target 平台专属的视图和场景               ← 整块界面完全不同时
```

### 第一层：自动适配

就是上面那张表。不再重复。

### 第二层：响应环境

iPad 分屏时和 iPhone 一样窄，Mac 窗口可以拉得比 iPad 还宽。**“空间够不够”和“这是什么设备”是两个问题**，而界面布局取决于前者。

第 8 章讲的工具都属于这一层：

```swift
struct AdaptiveDashboard: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.dynamicTypeSize) private var typeSize

    private var useCompactLayout: Bool {
        sizeClass == .compact || typeSize.isAccessibilitySize
    }

    var body: some View {
        let layout = useCompactLayout
            ? AnyLayout(VStackLayout(spacing: 16))
            : AnyLayout(HStackLayout(alignment: .top, spacing: 16))

        ScrollView {
            layout {
                StatCard(title: "今日步数", value: "8,204", symbol: "figure.walk")
                StatCard(title: "活动热量", value: "412", symbol: "flame.fill")
                StatCard(title: "睡眠", value: "7.5 小时", symbol: "bed.double.fill")
            }
            .padding()
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let symbol: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(title, systemImage: symbol)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.title.bold())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background.secondary, in: .rect(cornerRadius: 16))
    }
}
```

这段代码没有出现 iPhone、iPad、Mac 中的任何一个词。它只说：空间紧凑或者字号很大时竖排，否则横排。于是：

- iPhone 竖屏：竖排
- iPad 全屏、Mac 宽窗口：横排
- iPad 分屏的窄侧、Mac 窗口拖窄：竖排
- 任何设备上开了超大字号：竖排

这一层的工具汇总：

| 工具 | 回答的问题 |
| --- | --- |
| `horizontalSizeClass` / `verticalSizeClass` | 空间是宽裕还是紧凑 |
| `ViewThatFits` | 这个布局放得下吗，放不下换哪个 |
| `GridItem(.adaptive(minimum:))` | 这个宽度能放几列 |
| `containerRelativeFrame` | 占容器的几分之几 |
| `dynamicTypeSize` | 用户的字号有多大 |
| `ArrangementView`（27.1） | 主次内容怎么排 |

### 第三层：条件编译

有些 API **在某个平台上根本不存在**，写出来就编译不过。前面几章已经遇到过不少：

| 只在 iOS 上有 | 只在 macOS 上有 |
| --- | --- |
| `.navigationBarTitleDisplayMode` | `Settings`、`MenuBarExtra`、`UtilityWindow` 场景 |
| `.keyboardType`、`.textInputAutocapitalization` | `.windowStyle`、`.windowToolbarStyle` |
| `.fullScreenCover` | `HSplitView`、`VSplitView` |
| `EditButton`、`editMode` | `.pointerStyle` |
| `.statusBarHidden` | `Toggle` 的 `.checkbox` 样式、`Picker` 的 `.radioGroup` 样式 |
| `ToolbarItemPlacement.topBarLeading`、`.bottomBar`、`.keyboard` | `NSViewRepresentable` |
| `.navigationTransition(.zoom)` | `.onExitCommand`、`.onDeleteCommand` |
| `UIViewRepresentable` | `.alternatingRowBackgrounds` |

这时必须用条件编译：

```swift
struct PlatformSpecificForm: View {
    @State private var email = ""

    var body: some View {
        Form {
            TextField("电子邮箱", text: $email)
                .textContentType(.emailAddress)
                .autocorrectionDisabled()
                #if os(iOS)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                #endif
        }
        #if os(macOS)
        .formStyle(.grouped)
        .frame(minWidth: 360)
        #endif
    }
}
```

`#if os(...)` 在**编译期**生效：不满足条件的代码根本不参与编译。可用的条件：

| 条件 | 含义 |
| --- | --- |
| `os(iOS)` | iOS 和 iPadOS（两者是同一个编译目标），也包括 Mac Catalyst |
| `os(macOS)` | 原生 macOS |
| `os(watchOS)`、`os(tvOS)`、`os(visionOS)` | 对应平台 |
| `targetEnvironment(macCatalyst)` | Mac Catalyst |
| `targetEnvironment(simulator)` | 模拟器 |
| `canImport(UIKit)` / `canImport(AppKit)` | 某个框架是否可用 |
| `!os(macOS)`、`os(iOS) \|\| os(visionOS)` | 可以用 `!`、`&&`、`\|\|` 组合 |

注意：`os(iOS)` 对 iPhone 和 iPad 都成立。区分这两者不是编译期的事，而是运行时的空间问题，属于第二层。

#### 把条件编译收拢起来

`#if` 散落在各个视图里，代码会很快变得难读。**把平台差异封装进少数几个扩展，让其余的代码保持干净。**

**做法一：包装成自己的修饰符。** 在不支持的平台上，它什么都不做。

```swift
extension View {
    /// 行内（小）标题。仅 iOS 有效，其他平台不做任何事。
    func inlineNavigationTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }

    /// 邮箱输入的键盘配置。
    func emailInput() -> some View {
        self
            .textContentType(.emailAddress)
            .autocorrectionDisabled()
            #if os(iOS)
            .keyboardType(.emailAddress)
            .textInputAutocapitalization(.never)
            #endif
    }

    /// 全屏呈现。macOS 上没有全屏覆盖，退化为 sheet。
    func fullScreenCoverCompat<Content: View>(
        isPresented: Binding<Bool>,
        @ViewBuilder content: @escaping () -> Content
    ) -> some View {
        #if os(iOS)
        fullScreenCover(isPresented: isPresented, content: content)
        #else
        sheet(isPresented: isPresented, content: content)
        #endif
    }
}

struct CleanCallSite: View {
    @State private var email = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("电子邮箱", text: $email).emailInput()
            }
            .navigationTitle("登录")
            .inlineNavigationTitle()
        }
    }
}
```

调用处没有任何 `#if`。平台差异被关在了这一个文件里，以后要改也只改这里。

**做法二：为平台类型起别名。**

```swift
#if canImport(UIKit)
import UIKit
typealias PlatformImage = UIImage
typealias PlatformColor = UIColor
#elseif canImport(AppKit)
import AppKit
typealias PlatformImage = NSImage
typealias PlatformColor = NSColor
#endif

extension Image {
    /// 从平台原生的图片对象创建 SwiftUI 图片。
    init(platformImage: PlatformImage) {
        #if canImport(UIKit)
        self.init(uiImage: platformImage)
        #else
        self.init(nsImage: platformImage)
        #endif
    }
}
```

**做法三：把差异表达成常量。**

```swift
enum Platform {
    #if os(macOS)
    static let isMac = true
    static let cardPadding: CGFloat = 12
    static let cornerRadius: CGFloat = 8
    static let minRowHeight: CGFloat = 24
    #else
    static let isMac = false
    static let cardPadding: CGFloat = 16
    static let cornerRadius: CGFloat = 14
    static let minRowHeight: CGFloat = 44
    #endif
}

struct DensityAwareCard: View {
    var body: some View {
        Text("内边距和圆角随平台变化")
            .padding(Platform.cardPadding)
            .background(.blue.opacity(0.15), in: .rect(cornerRadius: Platform.cornerRadius))
    }
}
```

视图里读常量，没有任何条件判断。这种“设计参数表”（design tokens）的做法让平台间的密度差异集中在一处管理。

::: warning #if 的一个限制
`#if` 包住修饰符链时，它必须位于**一条完整的修饰符链的中间或末尾**，像上面的例子那样。不能用它包住半个表达式。如果写着写着编译器报出奇怪的错误，把那段逻辑抽成一个扩展方法通常就解决了。
:::

### 第四层：分文件

当某一块界面在两个平台上**完全不同**时，用 `#if` 把两套代码塞在同一个文件里只会让两边都难读。这时应该分成两个文件，各自只属于一个平台。

在 Xcode 里选中文件，在右侧的 **File Inspector › Target Membership** 里，可以指定这个文件只参与某些平台的编译。或者把整个文件用 `#if os(macOS)` … `#endif` 包起来。

最典型的需要分开的东西：

- **应用的入口和场景结构。** Mac 有 `Settings`、`MenuBarExtra`、`commands`；iOS 没有。
- **设置界面的承载方式。** Mac 是独立的 `Settings` 窗口；iOS 是一个标签页或一个 sheet。但里面的**表单内容**是共享的。
- **平台特有的功能。** 菜单栏小工具、触感反馈密集的交互、键盘驱动的工作流。

## 组织多平台项目

### 项目设置

按导读的方式创建 Multiplatform App，得到的是**一个 target，多个目标平台**。在 target 的 **General › Supported Destinations** 里可以增删平台（iPhone、iPad、Mac、Apple Vision）。

注意 Mac 那一项要选 **Mac**（原生 macOS，用 AppKit 渲染），而不是 **Mac (Designed for iPad)** 或 **Mac Catalyst**。

一个 target 的好处是：所有文件默认在所有平台间共享，资源、本地化、设置都只有一份。只有少数文件需要限定平台。

### 目录结构

一种经过实践检验的组织方式：

```text
MyApp/
├── App/
│   ├── MyApp.swift                 入口：@main，场景声明（内部用 #if 区分平台）
│   └── AppCommands.swift           菜单命令（macOS、iPadOS）
│
├── Models/                          ← 100% 共享，不 import SwiftUI
│   ├── Note.swift
│   └── NoteStore.swift
│
├── Features/                        ← 绝大部分共享
│   ├── NoteList/
│   │   ├── NoteListView.swift
│   │   └── NoteRow.swift
│   ├── NoteEditor/
│   │   └── NoteEditorView.swift
│   └── Settings/
│       ├── SettingsForm.swift      共享：设置的表单内容
│       ├── SettingsScene+macOS.swift   仅 macOS：Settings 场景的页签外壳
│       └── SettingsSheet+iOS.swift     仅 iOS：把表单放进 sheet
│
├── Shared/
│   ├── Platform.swift              设计参数：间距、圆角
│   ├── View+Platform.swift         封装了 #if 的修饰符
│   └── Components/                 通用的小组件
│
└── Resources/
    ├── Assets.xcassets             颜色、图片、图标（可为各平台提供不同的变体）
    └── Localizable.xcstrings       本地化字符串
```

原则：

- **模型层不依赖 SwiftUI。** 它是纯 Swift，天然跨平台，也最容易测试。
- **按功能分目录，不按平台分。** 一个功能的共享代码和平台专属代码放在一起，容易看出全貌。
- **平台专属的文件用后缀标明**（`+macOS`、`+iOS`），一眼就能认出来。
- **`#if` 集中在少数几个文件里**：入口、`Platform.swift`、`View+Platform.swift`。

### 资源的平台变体

资源目录（Assets.xcassets）里的图片和颜色，可以在属性面板的 **Devices** 里勾选不同的设备类型，为 iPhone、iPad、Mac 提供不同的版本。应用图标本身就需要各平台的版本。代码里引用的是同一个名字，系统自动选择。

## 各层怎么适配

### 应用入口

```swift nocheck
@main
struct NotesApp: App {
    @State private var store = NoteStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
        }
        #if os(macOS)
        .defaultSize(width: 1000, height: 650)
        .windowToolbarStyle(.unified)
        #endif
        .commands {
            NoteCommands()                    // macOS 的菜单栏；iPadOS 26 起的菜单栏
        }

        #if os(macOS)
        Settings {
            SettingsScene()
                .environment(store)
        }

        MenuBarExtra("快速笔记", systemImage: "note.text.badge.plus") {
            QuickNoteMenu()
                .environment(store)
        }
        #endif
    }
}
```

模型在 `App` 层创建一次，通过环境注入到所有场景。Mac 多出来的场景用 `#if` 包住。

### 导航结构

**不要为 iPhone 和 iPad/Mac 分别写导航。** 第 19 章的两个自适应容器已经解决了这个问题：

```swift
struct RootScaffold: View {
    @State private var selectedFolder: String? = "全部"
    @State private var selectedNote: Int?

    var body: some View {
        NavigationSplitView {
            List(["全部", "工作", "生活"], id: \.self, selection: $selectedFolder) { folder in
                Label(folder, systemImage: "folder")
            }
            .navigationTitle("文件夹")
            #if os(macOS)
            .navigationSplitViewColumnWidth(min: 160, ideal: 200, max: 280)
            #endif
        } content: {
            List(0..<12, id: \.self, selection: $selectedNote) { index in
                Text("\(selectedFolder ?? "") 里的笔记 \(index + 1)")
            }
            .navigationTitle(selectedFolder ?? "笔记")
        } detail: {
            if let selectedNote {
                Text("笔记 \(selectedNote + 1) 的内容")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ContentUnavailableView("选择一条笔记", systemImage: "note.text")
            }
        }
    }
}
```

这一份代码：在 iPhone 上是三层逐级推入的导航栈；在 iPad 横屏上是三栏；在 Mac 上是三栏并且侧边栏可以拖动宽度。

两种结构怎么选（第 19 章末尾讲过）：

| 应用的信息结构 | 推荐的骨架 |
| --- | --- |
| 一个大的内容集合，按层级浏览（邮件、笔记、文件） | `NavigationSplitView` |
| 几个并列的功能区（首页、搜索、收藏、我的） | `TabView` + `.sidebarAdaptable` |

### 设置：共享内容，不同的外壳

设置是“内容共享、承载方式不同”的典型：

```swift
/// 共享：设置的表单内容。在两个平台上都能用。
struct AppearanceSettingsForm: View {
    @AppStorage("fontSize") private var fontSize = 16.0
    @AppStorage("showPreview") private var showPreview = true

    var body: some View {
        Form {
            Section("编辑器") {
                LabeledContent("字号") {
                    Stepper("\(Int(fontSize)) 点", value: $fontSize, in: 12...28)
                }
                Toggle("显示预览行", isOn: $showPreview)
            }
        }
        .formStyle(.grouped)
    }
}
```

```swift macos
/// 仅 macOS：放进 Settings 场景，用页签组织。
struct SettingsSceneContent: View {
    var body: some View {
        TabView {
            Tab("外观", systemImage: "paintbrush") {
                AppearanceSettingsForm()
            }
            Tab("同步", systemImage: "arrow.triangle.2.circlepath") {
                Text("同步设置").padding()
            }
        }
        .frame(width: 480, height: 320)
    }
}
```

```swift ios
/// 仅 iOS：放进一个带导航栏的 sheet。
struct SettingsSheetContent: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            AppearanceSettingsForm()
                .navigationTitle("设置")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("完成") { dismiss() }
                    }
                }
        }
    }
}
```

`AppearanceSettingsForm` 写一次。两个平台各有一个十几行的“外壳”，把它放进符合平台惯例的容器里。

### 操作入口：同一个动作，多个入口

Mac 用户从菜单栏和快捷键找功能，iPhone 用户从屏幕上的按钮找。同一个操作应该在各个平台上都有合适的入口。把**动作**定义在模型里，然后从多个地方调用它：

```swift
@Observable
class DocumentModel {
    var items: [String] = ["第一项"]
    var selection: String?

    func addItem() {
        items.append("第 \(items.count + 1) 项")
    }

    func deleteSelection() {
        guard let selection else { return }
        items.removeAll { $0 == selection }
        self.selection = nil
    }

    var canDelete: Bool { selection != nil }
}

struct DocumentScreen: View {
    @State private var model = DocumentModel()

    var body: some View {
        NavigationStack {
            List(model.items, id: \.self, selection: $model.selection) { item in
                Text(item)
                    .contextMenu {                                        // 入口三：长按或右键
                        Button("删除", systemImage: "trash", role: .destructive) {
                            model.selection = item
                            model.deleteSelection()
                        }
                    }
            }
            .navigationTitle("文档")
            .toolbar {                                                    // 入口一：工具栏
                ToolbarItem(placement: .primaryAction) {
                    Button("添加", systemImage: "plus", action: model.addItem)
                        .keyboardShortcut("n")                           // 入口二：快捷键
                }
                ToolbarItem(placement: .secondaryAction) {
                    Button("删除", systemImage: "trash", role: .destructive, action: model.deleteSelection)
                        .disabled(!model.canDelete)
                }
            }
            #if os(macOS)
            .onDeleteCommand(perform: model.deleteSelection)              // 入口四：Delete 键（macOS）
            #endif
            .focusedSceneValue(model)                                     // 入口五：菜单栏通过它拿到模型
        }
    }
}

struct DocumentCommands: Commands {
    @FocusedValue(DocumentModel.self) private var model

    var body: some Commands {
        CommandGroup(after: .newItem) {
            Button("添加一项") { model?.addItem() }
                .keyboardShortcut("n", modifiers: [.command, .shift])
                .disabled(model == nil)
        }
    }
}
```

`addItem` 和 `deleteSelection` 各只实现了一次，却有五个入口。每个平台的用户都能在他们习惯的地方找到这个功能。

| 入口 | iPhone | iPad | Mac |
| --- | --- | --- | --- |
| 工具栏按钮 | 主要 | 主要 | 常用 |
| 上下文菜单 | 长按 | 长按、右键 | 右键 |
| 滑动操作 | 常用 | 常用 | 可用（触控板） |
| 键盘快捷键 | 少 | 接键盘时 | **必备** |
| 菜单栏 | 无 | iPadOS 26 起 | **必备** |
| 拖放 | 应用内 | 应用间 | 应用间、与访达 |

### 密度与尺寸

Mac 上的界面应该更紧凑。大部分事情系统已经做了（字体更小、控件更小、列表行更矮）。你需要注意的是**自己写的数值**：

- **不要写死行高和按钮高度。** `.frame(height: 44)` 在 iOS 上是合适的触摸目标，在 Mac 上显得笨重。用 `.controlSize()` 和内容决定的尺寸，或者用上面的 `Platform` 常量。
- **用 `.padding()` 的默认值**，它在各平台上不同。
- **用 `@ScaledMetric`** 让自定义的尺寸跟随字号设置（第 14 章）。
- **限制阅读宽度。** Mac 窗口可以很宽，一行文字拉到 1500 点宽没法读：

```swift
struct ReadableContent: View {
    var body: some View {
        ScrollView {
            Text(String(repeating: "在宽窗口里，正文的每一行不应该无限延伸。", count: 30))
                .frame(maxWidth: 680, alignment: .leading)        // 限制最大行宽
                .frame(maxWidth: .infinity)                       // 在可用空间里居中
                .padding()
        }
    }
}
```

- **窗口的最小尺寸。** Mac 上给根视图设 `.frame(minWidth:minHeight:)`，避免窗口被缩到布局无法成立的大小。这个修饰符在 iOS 上不会造成问题，但通常放在 `#if os(macOS)` 里更稳妥。

### 交互方式

| | 触摸（iPhone、iPad） | 指针（Mac、iPad 接触控板） |
| --- | --- | --- |
| 目标大小 | 至少 44 点 | 可以更小 |
| 悬停 | 没有 | 有：用 `.onHover`、`.help()` |
| 精确选择文字 | 困难 | 容易：`.textSelection(.enabled)` |
| 次级操作 | 长按、滑动 | 右键、悬停时出现的按钮 |
| 多选 | 进入编辑模式 | <kbd>⌘</kbd> 点击、<kbd>⇧</kbd> 点击 |
| 滚动 | 手指直接拖 | 滚轮、触控板 |

写共享视图时的好习惯：**加上那些“在不支持的平台上无害”的增强。** `.onHover`、`.help()`、`.keyboardShortcut()`、`.contextMenu`、`.textSelection(.enabled)` 在 iPhone 上要么不触发、要么以另一种方式呈现，加了没有任何坏处，却让 Mac 和 iPad 的体验完整很多。

## 版本差异：可用性检查

平台差异之外，还有**系统版本**的差异。本教程里标了“26+”“27+”的 API，在更早的系统上不存在。

### 运行时检查

```swift
struct VersionAwareButton: View {
    var body: some View {
        if #available(iOS 26, macOS 26, *) {
            Button("玻璃按钮") {}
                .buttonStyle(.glass)
        } else {
            Button("玻璃按钮") {}
                .buttonStyle(.bordered)
        }
    }
}
```

`#available` 在**运行时**检查系统版本。它和 `#if os` 不同：两个分支的代码都会被编译进去，运行时选择一个执行。

同样，把它封装起来，不要散落各处（第 23 章的 `adaptiveGlass()` 就是这样做的）：

```swift
extension View {
    @ViewBuilder
    func glassButtonStyleIfAvailable() -> some View {
        if #available(iOS 26, macOS 26, *) {
            self.buttonStyle(.glass)
        } else {
            self.buttonStyle(.bordered)
        }
    }

    @ViewBuilder
    func softScrollEdges() -> some View {
        if #available(iOS 26, macOS 26, *) {
            self.scrollEdgeEffectStyle(.soft, for: .all)
        } else {
            self
        }
    }
}
```

### 标注声明

用到新 API 的整个类型或函数，用 `@available` 标注它需要的最低版本：

```swift
@available(iOS 26, macOS 26, *)
struct GlassToolbar: View {
    var body: some View {
        HStack {
            Button("后退", systemImage: "chevron.left") {}
            Button("前进", systemImage: "chevron.right") {}
        }
        .buttonStyle(.glass)
    }
}
```

调用它的地方必须也在同样的可用性保护之下，否则编译器会报错。这是一个很好的安全网：**你不可能不小心在旧系统上调用新 API。**

### Swift 6.4：anyAppleOS <Badge type="warning" text="Swift 6.4" />

Apple 的各个操作系统从 26 开始统一了版本号：iOS 26、macOS 26、watchOS 26、tvOS 26、visionOS 26 是同一批发布的。于是可用性标注里经常要把同一个数字重复写好几遍。

Swift 6.4 引入了 `anyAppleOS`，一次写完：

```swift
// Swift 6.3 及更早：每个平台写一遍
@available(iOS 27, macOS 27, watchOS 27, tvOS 27, visionOS 27, *)
struct NewFeatureOld: View {
    var body: some View { Text("新功能") }
}

// Swift 6.4：一次写完
@available(anyAppleOS 27, *)
struct NewFeatureNew: View {
    var body: some View { Text("新功能") }
}

struct AnyAppleOSCheck: View {
    var body: some View {
        if #available(anyAppleOS 27, *) {
            NewFeatureNew()
        } else {
            Text("需要 27 或更高版本的系统")
        }
    }
}
```

`anyAppleOS 27` 的意思是“任何 Apple 操作系统的 27 及以上版本”。Xcode 27 的 SDK 自己也已经用这种写法标注新 API。

它只适用于版本号统一之后（26 及以后）。要表达“iOS 18 且 macOS 15”这种版本号不同的条件，仍然要分开写。用 Swift 6.3 编译的项目不能使用这个写法。

### 部署版本的选择

最低部署版本定得越低，能覆盖的用户越多，但需要写的兼容代码也越多。几个参考点：

| 最低版本 | 你能直接使用的 |
| --- | --- |
| iOS 17 / macOS 14 | `@Observable`、SwiftData、新的滚动 API、`PhaseAnimator`、`KeyframeAnimator`、弹簧的新参数 |
| iOS 18 / macOS 15 | `Tab` 类型、`.sidebarAdaptable`、缩放转场、`MeshGradient`、`onScrollGeometryChange`、`TextRenderer`、容器值 |
| iOS 26 / macOS 26 | Liquid Glass、`WebView`、富文本 `TextEditor`、`ToolbarSpacer`、`Observations`、滚动边缘效果 |
| iOS 27 / macOS 27 | `reorderable`、`swipeActionsContainer`、`ToolbarOverflowMenu`、新的 `Document` 协议 |

学习和做个人项目时，直接把最低版本设为最新的系统，可以专心学新 API。面向大众发布的应用，通常支持当前和上一个大版本。

记住第 9 章说的：有些变化跟着**编译器**走而不是系统版本，比如 `@State` 宏、`@Entry` 宏、`@Animatable` 宏、`ContentBuilder`、`alert(_:item:)`。用 Xcode 27 编译就能用，与部署版本无关。

## 其他 Apple 平台

本教程聚焦 iOS 和 macOS。SwiftUI 也是其他平台的主要（有的是唯一的）界面框架。你学到的东西大部分直接适用：

| 平台 | 特点 | 与 iOS 的主要差别 |
| --- | --- | --- |
| **iPadOS** | 大屏、多窗口、指针、键盘、菜单栏 | 第 31 章已讲。它在界面形态上更接近 Mac |
| **watchOS** | 很小的屏幕，短暂的交互，数码表冠 | 界面极简；`NavigationStack` 和垂直 `TabView` 为主；`.digitalCrownRotation`；复杂功能（表盘上的小组件） |
| **tvOS** | 远距离观看，遥控器操作 | 完全由**焦点**驱动（没有触摸）；大字号；`.focusable`、`.focusSection` 很重要 |
| **visionOS** | 空间计算，眼睛和手势输入 | 窗口浮在空间中；`.glassBackgroundEffect`；立体窗口（volume）和沉浸空间；`RealityView` 显示 3D 内容 |

把一个 iOS/macOS 的 SwiftUI 应用带到这些平台，通常是：共享模型层和小的视图组件，为新平台重新设计顶层结构和主要界面。这也是“一次学习，到处应用”的含义。

## 多端开发的工作流

### 预览

`#Preview` 是多端开发最高效的工具。画布底部可以切换运行目标，同一个视图在 iPhone、iPad、Mac 上的样子可以来回对比。

为关键视图准备一组覆盖各种情况的预览：

```swift
#Preview("默认") {
    AdaptiveDashboard()
}

#Preview("特大字号") {
    AdaptiveDashboard()
        .dynamicTypeSize(.accessibility2)
}

#Preview("深色") {
    AdaptiveDashboard()
        .preferredColorScheme(.dark)
}

#Preview("紧凑宽度") {
    AdaptiveDashboard()
        .environment(\.horizontalSizeClass, .compact)
        .frame(width: 320)
}

#Preview("从右向左") {
    AdaptiveDashboard()
        .environment(\.layoutDirection, .rightToLeft)
}
```

### 检查清单

每完成一个功能，在每个目标平台上过一遍：

**通用**
- [ ] 浅色和深色模式都正常
- [ ] 最大的动态字号下布局不崩
- [ ] VoiceOver 能读出所有元素（第 36 章）
- [ ] 开启“减弱动态效果”后没有大幅度的运动

**iPhone**
- [ ] 最小的机型上内容不被截断
- [ ] 横屏可用（如果支持横屏）
- [ ] 键盘弹出时输入框可见
- [ ] 主要操作单手够得着

**iPad**
- [ ] 把窗口调到最窄和最宽都正常
- [ ] 接上键盘：<kbd>Tab</kbd> 能切换焦点，主要操作有快捷键
- [ ] 指针悬停有反馈
- [ ] 菜单栏里有应用的命令

**Mac**
- [ ] 窗口缩到最小尺寸时布局成立
- [ ] 每个功能在菜单栏里都能找到
- [ ] 常用操作有快捷键，回车和 <kbd>Esc</kbd> 在对话框里有效
- [ ] 右键有上下文菜单
- [ ] 可以开多个窗口，各自状态独立
- [ ] 设置在 `Settings` 窗口里
- [ ] 沙盒权限配置正确（网络、文件）

## 常见误区

**误区一：“多端统一就是所有平台长得一样。”** 目标是每个平台上都像原生应用。共享的是代码和逻辑，不是像素。

**误区二：“到处写 `if UIDevice.current.userInterfaceIdiom == .pad`。”** 这是 UIKit 时代的习惯，而且这个 API 在 macOS 上不存在。用尺寸类别和可用空间。

**误区三：“`#if os(iOS)` 可以区分 iPhone 和 iPad。”** 不能，它们是同一个编译目标。区分它们要看运行时的环境。

**误区四：“`#if` 和 `#available` 是一回事。”** `#if os` 是编译期按平台裁剪代码；`#available` 是运行时按系统版本选择分支。

**误区五：“为了跨平台，全部控件都自己画，保证一致。”** 这样在每个平台上都不像原生应用，还丢掉了辅助功能和未来系统更新的适配。

**误区六：“先把 iOS 版做完，最后再‘移植’到 Mac。”** 到那时很多结构性的决定（导航、状态的位置、操作的入口）已经定型，改起来代价很大。从第一天就在两个平台上同时运行和预览。

**误区七：“条件编译写在每个视图里。”** 收拢到少数几个扩展和常量里。

## 小结

- 多端统一是“一次学习，到处应用”：共享模型、逻辑和大部分视图，为每个平台适配结构、输入和密度。
- 第一原则：使用语义化的标准组件并保留默认行为，它们会自动适配平台。
- 适配分四层，按顺序考虑：自动适配 → 响应环境（尺寸类别、可用空间）→ 条件编译（`#if os`）→ 分文件。
- 条件编译和可用性检查要封装进扩展方法、类型别名和常量，让调用处保持干净。
- 项目按功能组织，模型层不依赖 SwiftUI，平台专属文件用后缀标明。
- 导航用 `NavigationSplitView` 或 `.sidebarAdaptable` 的 `TabView` 一份代码适配所有宽度；设置等界面“共享内容，不同外壳”；同一个动作提供多个入口。
- `#if os` 是编译期的平台选择，`#available` 是运行时的版本选择。Swift 6.4 的 `anyAppleOS` 简化了统一版本号之后的可用性标注。

## 练习

1. 把你之前做过的任意一个 iOS 练习（比如第 17 章的待办清单）在 Mac 上运行。列出所有“看起来不像 Mac 应用”的地方，然后逐一修正：窗口尺寸、菜单命令、快捷键、右键菜单、设置窗口。
2. 写一个 `View+Platform.swift`，封装至少五个带条件编译的修饰符（例如行内标题、键盘类型、全屏呈现、列表样式、窗口最小尺寸），并把项目里散落的 `#if` 全部替换成对它们的调用。
3. 做一个设置功能：一个共享的 `SettingsForm`，在 macOS 上放进 `Settings` 场景，在 iOS 上放进从工具栏按钮打开的 sheet。
4. 给应用的三个核心操作分别提供：工具栏按钮、上下文菜单项、键盘快捷键、菜单栏命令。确保四个入口调用的是模型里的同一个方法，并且在不可用时四处同时禁用。
5. 用 `anyAppleOS`（Swift 6.4）改写项目里所有针对 26 及以后版本的 `@available` 和 `#available`。

## 官方文档

- [Configuring a multiplatform app](https://developer.apple.com/documentation/xcode/configuring-a-multiplatform-app-target)
- [Food Truck: Building a SwiftUI multiplatform app（官方示例项目）](https://developer.apple.com/documentation/swiftui/food_truck_building_a_swiftui_multiplatform_app)
- [Backyard Birds: Building an app with SwiftData and widgets（官方示例项目）](https://developer.apple.com/documentation/swiftui/backyard-birds-sample)
- [Destination Video（官方多平台示例）](https://developer.apple.com/documentation/visionos/destination-video)
- [`UserInterfaceSizeClass`](https://developer.apple.com/documentation/swiftui/userinterfacesizeclass)
- [Running code on a specific platform or OS version](https://developer.apple.com/documentation/xcode/running-code-on-a-specific-version)
- [The Swift Programming Language：Conditional Compilation Block](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/statements/#Conditional-Compilation-Block)
- [The Swift Programming Language：Checking API Availability](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/#Checking-API-Availability)
- [What's new in Swift（anyAppleOS 可用性）](https://developer.apple.com/swift/whats-new/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Human Interface Guidelines：Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [WWDC22：Bring multiple windows to your SwiftUI app](https://developer.apple.com/videos/play/wwdc2022/10061/)
- [WWDC22：Use Xcode to develop a multiplatform app](https://developer.apple.com/videos/play/wwdc2022/110371/)
