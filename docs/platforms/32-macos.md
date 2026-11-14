# 32 macOS 专题

## 本章目标

- 理解 Mac 应用和 iOS 应用在交互上的根本差别
- 掌握 macOS 的各种场景：多窗口、单例窗口、设置、菜单栏图标、工具面板
- 配置窗口：尺寸、位置、标题栏、工具栏样式
- 用 `commands` 定制菜单栏，用 `FocusedValue` 把菜单和当前窗口连起来
- 处理键盘操作与焦点
- 构建基于文档的应用，包括 27 系列的新文档协议
- 桥接 AppKit

SwiftUI 的代码大部分可以直接在 Mac 上运行。但“能运行”和“像一个 Mac 应用”之间有距离。这一章讲的就是那段距离。

## Mac 是一个不同的环境

先建立直觉。Mac 和 iPhone 的差别不在屏幕大小，而在**输入方式**和**使用方式**：

| | iPhone | Mac |
| --- | --- | --- |
| 指点设备 | 手指：粗、会遮挡、只有按下一种状态 | 指针：精确到像素、有悬停、有右键 |
| 键盘 | 屏幕键盘，输入时才出现 | 始终存在，是一等输入方式 |
| 窗口 | 一个应用占满屏幕 | 多个应用、多个窗口同时可见，大小任意 |
| 操作入口 | 屏幕上的按钮、手势 | **菜单栏**、工具栏、快捷键、右键菜单 |
| 信息密度 | 低，一次做一件事 | 高，同时看很多东西 |
| 文件 | 大多隐藏在应用内部 | 用户直接管理文件，拖来拖去 |

由此得出 Mac 应用的几条基本要求：

1. **每个功能都应该能在菜单栏里找到**，常用的要有快捷键。Mac 用户遇到不会的操作，第一反应是去翻菜单。
2. **窗口可以任意调整大小**，布局必须能适应。
3. **支持多窗口**。用户期望能同时打开两个文档对照着看。
4. **键盘可以完成主要操作**：方向键移动选择，回车确认，<kbd>Esc</kbd> 取消，<kbd>Delete</kbd> 删除，<kbd>Tab</kbd> 切换焦点。
5. **悬停有反馈，右键有菜单。**
6. **控件更小、更紧凑。** SwiftUI 的语义字体和标准控件在 Mac 上自动使用更小的尺寸（第 14、15 章）。

好消息是，SwiftUI 的标准组件已经处理了其中的大部分。你要做的主要是：补上菜单命令、配置好窗口、不要用 iOS 的习惯去覆盖 Mac 的默认行为。

## 场景：Mac 应用的骨架

第 2 章介绍过场景的概念。iOS 应用通常只需要一个 `WindowGroup`，Mac 应用则会用到好几种。

```swift macos
struct MacSceneOverview: App {
    var body: some Scene {
        // 主窗口：可以开多个
        WindowGroup("文档", id: "main") {
            Text("主界面").frame(minWidth: 500, minHeight: 300)
        }

        // 单例窗口：全应用只有一个
        Window("活动监视", id: "activity") {
            Text("这里显示后台任务").padding(40)
        }
        .defaultSize(width: 360, height: 240)

        // 工具面板：浮在主窗口上方的小窗口
        UtilityWindow("检查器", id: "inspector") {
            Text("属性").padding()
        }

        // 设置窗口：自动出现在应用菜单的“设置…”里，快捷键 ⌘,
        Settings {
            Text("设置内容").padding(40)
        }

        // 菜单栏右侧的图标
        MenuBarExtra("我的应用", systemImage: "star.fill") {
            Button("显示主窗口") {}
            Divider()
            Button("退出") { NSApplication.shared.terminate(nil) }
        }
    }
}
```

（真实的应用里这个结构体要标 `@main`。）

| 场景 | 实例数量 | 自动获得的行为 |
| --- | --- | --- |
| `WindowGroup` | 多个 | “文件 › 新建窗口”（<kbd>⌘N</kbd>）；出现在“窗口”菜单；支持标签页 |
| `Window` | 一个 | 出现在“窗口”菜单里，可以用快捷键打开；关闭后再打开还是同一个 |
| `UtilityWindow` | 一个 | 浮动面板样式；应用失去焦点时隐藏；出现在“显示”菜单 |
| `Settings` | 一个 | “应用名 › 设置…”（<kbd>⌘,</kbd>） |
| `MenuBarExtra` | 一个 | 系统菜单栏右侧的常驻图标 |
| `DocumentGroup` | 每个文档一个 | 完整的“新建、打开、保存、另存为、最近使用”菜单和文件处理 |

如果应用里**只有** `Window` 而没有 `WindowGroup`，关闭这个唯一的窗口时应用会自动退出。这适合计算器这类单窗口工具。

### 用代码打开和关闭窗口

```swift macos
struct WindowControls: View {
    @Environment(\.openWindow) private var openWindow
    @Environment(\.dismissWindow) private var dismissWindow
    @Environment(\.openSettings) private var openSettings

    var body: some View {
        VStack(spacing: 12) {
            Button("打开活动监视窗口") { openWindow(id: "activity") }
            Button("关闭活动监视窗口") { dismissWindow(id: "activity") }
            Button("打开设置") { openSettings() }
            SettingsLink { Text("或者用 SettingsLink") }
        }
        .padding()
    }
}
```

这些都是第 11 章讲的“环境里的动作”。

### 为数据打开窗口

很常见的需求：双击列表里的一项，在新窗口里打开它。`WindowGroup` 可以声明“我是用来展示某种类型的值的”：

```swift macos
nonisolated struct NoteID: Hashable, Codable, Sendable {
    var rawValue: UUID
}

struct DataWindowApp: App {
    var body: some Scene {
        WindowGroup {
            NoteBrowser()
        }

        WindowGroup("笔记", for: NoteID.self) { $noteID in
            if let noteID {
                Text("正在显示笔记 \(noteID.rawValue.uuidString.prefix(8))")
                    .frame(minWidth: 400, minHeight: 300)
            }
        }
    }
}

struct NoteBrowser: View {
    @Environment(\.openWindow) private var openWindow
    let notes = (0..<5).map { _ in NoteID(rawValue: UUID()) }

    var body: some View {
        List(notes, id: \.self) { note in
            Button("在新窗口中打开 \(note.rawValue.uuidString.prefix(8))") {
                openWindow(value: note)
            }
        }
    }
}
```

`openWindow(value:)` 找到处理这种类型的 `WindowGroup` 并打开一个窗口。几个细节：

- **同一个值只对应一个窗口。** 对已经打开的值再次调用，会把那个窗口带到前面，而不是再开一个。
- 值的类型要遵循 `Hashable` 和 `Codable`。系统用它来做状态恢复：应用重启后，这些窗口会带着各自的值重新打开。
- 所以应该传**标识符**，而不是整个模型对象。窗口内容用标识符去查数据。

## 配置窗口

```swift macos
struct WindowConfiguration: App {
    var body: some Scene {
        WindowGroup {
            Text("主窗口")
                .frame(minWidth: 600, idealWidth: 900, minHeight: 400, idealHeight: 600)
        }
        .defaultSize(width: 900, height: 600)             // 第一次打开时的大小
        .defaultPosition(.center)                         // 第一次打开时的位置
        .windowResizability(.contentMinSize)              // 不能小于内容的最小尺寸
        .windowToolbarStyle(.unified)                     // 工具栏与标题栏合并

        Window("关于", id: "about") {
            VStack {
                Image(systemName: "app.gift.fill").font(.system(size: 60))
                Text("版本 1.0")
            }
            .padding(40)
        }
        .windowResizability(.contentSize)                 // 窗口大小固定为内容大小，不可调整
        .windowStyle(.hiddenTitleBar)                     // 隐藏标题栏
        .restorationBehavior(.disabled)                   // 重启后不自动恢复这个窗口
    }
}
```

| 修饰符 | 作用 |
| --- | --- |
| `.defaultSize(width:height:)` | 首次打开的尺寸。之后系统会记住用户调整后的大小 |
| `.defaultPosition(_:)` | 首次打开的位置：`.center`、`.topLeading` 等 |
| `.windowResizability(_:)` | `.contentSize`：窗口尺寸完全由内容决定。`.contentMinSize`：内容的最小尺寸是窗口的下限，可以拉大 |
| `.windowStyle(_:)` | `.titleBar`（默认）、`.hiddenTitleBar`、`.plain`（无任何装饰） |
| `.windowToolbarStyle(_:)` | `.unified`（标题和工具栏在一行）、`.unifiedCompact`（更矮）、`.expanded`（标题在工具栏上方） |
| `.restorationBehavior(_:)` | 重启后是否恢复这个窗口 |
| `.defaultLaunchBehavior(_:)` | 应用启动时是否自动打开这个窗口 |
| `.windowLevel(_:)` | 窗口层级，例如 `.floating` 始终浮在普通窗口之上 |
| `.windowBackgroundDragBehavior(.enabled)` | 允许拖动窗口背景来移动窗口 |

**窗口的最小尺寸由内容决定。** 给根视图加 `.frame(minWidth:minHeight:)`，再配合 `.windowResizability(.contentMinSize)`，用户就无法把窗口缩得比这更小。这比处理“窗口太小导致布局崩坏”要简单得多。

视图层面还有几个相关的修饰符：

```swift macos
struct WindowContent: View {
    var body: some View {
        Text("内容")
            .frame(minWidth: 400, minHeight: 300)
            .navigationTitle("窗口标题")                                   // 显示在标题栏
            .navigationSubtitle("12 个项目")                               // 标题下方的小字
            .containerBackground(.thinMaterial, for: .window)             // 半透明的窗口背景
            .toolbar(removing: .title)                                    // 移除标题栏里的标题文字
    }
}
```

## 菜单栏：commands

菜单栏是 Mac 应用的功能目录。SwiftUI 已经为你提供了标准菜单（应用、文件、编辑、显示、窗口、帮助）里的大部分项目。你要做的是加入自己应用的命令。

菜单用 `.commands` 修饰符加在场景上：

```swift macos
struct CommandsApp: App {
    var body: some Scene {
        WindowGroup {
            Text("内容").frame(minWidth: 400, minHeight: 300)
        }
        .commands {
            // 新增一个顶级菜单，位于“显示”和“窗口”之间
            CommandMenu("笔记") {
                Button("新建笔记") {}
                    .keyboardShortcut("n", modifiers: [.command, .shift])

                Button("复制笔记") {}
                    .keyboardShortcut("d")

                Divider()

                Menu("导出为") {
                    Button("PDF…") {}
                    Button("Markdown…") {}
                }

                Toggle("固定在顶部", isOn: .constant(false))
            }

            // 在已有菜单的指定位置插入
            CommandGroup(after: .newItem) {
                Button("从模板新建…") {}
            }

            // 替换已有菜单里的一组项目
            CommandGroup(replacing: .help) {
                Button("在线帮助") {}
            }

            // 系统预置的成组命令
            SidebarCommands()             // “显示 › 显示/隐藏边栏”
            ToolbarCommands()             // “显示 › 自定工具栏…”
            InspectorCommands()           // “显示 › 显示/隐藏检查器”
            TextEditingCommands()         // 查找、拼写等
        }
    }
}
```

- `CommandMenu` 创建一个新的顶级菜单。
- `CommandGroup(before:/after:/replacing:)` 在标准菜单的某个位置插入或替换。位置用 `CommandGroupPlacement` 指定：`.newItem`、`.saveItem`、`.undoRedo`、`.pasteboard`、`.sidebar`、`.toolbar`、`.windowSize`、`.help`、`.appSettings` 等。
- 菜单里放的是普通的 `Button`、`Toggle`、`Picker`、`Menu`、`Divider`。和第 15 章的 `Menu` 一样，它们会自动变成菜单项的样子。
- `.keyboardShortcut` 给菜单项加快捷键，会显示在菜单项的右侧。

`commands` 的内容可以抽成独立的类型，遵循 `Commands` 协议：

```swift macos
struct NoteCommands: Commands {
    var body: some Commands {
        CommandMenu("笔记") {
            Button("新建笔记") {}
                .keyboardShortcut("n", modifiers: [.command, .shift])
        }
    }
}
```

### 菜单怎么知道该操作哪个窗口

这是 Mac 开发中一个关键的问题。菜单栏是**全局**的，属于整个应用；而“复制这条笔记”这个操作应该作用于**当前活动窗口**里选中的那条笔记。菜单在 `App` 层，数据在某个窗口的视图里，怎么连起来？

答案是 **`FocusedValue`**：让当前获得焦点的窗口或视图，向上“发布”一些值，菜单命令读取这些值。

```swift macos
// 1. 定义一个焦点值的键
extension FocusedValues {
    @Entry var selectedNoteTitle: Binding<String>?
}

// 2. 窗口内容发布这个值
struct NoteEditorWindow: View {
    @State private var title = "未命名笔记"

    var body: some View {
        TextField("标题", text: $title)
            .textFieldStyle(.roundedBorder)
            .padding()
            .frame(minWidth: 320, minHeight: 120)
            .focusedSceneValue(\.selectedNoteTitle, $title)     // 当这个窗口是活动窗口时，发布绑定
    }
}

// 3. 菜单命令读取这个值
struct NoteTitleCommands: Commands {
    @FocusedValue(\.selectedNoteTitle) private var title

    var body: some Commands {
        CommandMenu("笔记") {
            Button("标题转为大写") {
                title?.wrappedValue = title?.wrappedValue.uppercased() ?? ""
            }
            .keyboardShortcut("u", modifiers: [.command, .shift])
            .disabled(title == nil)                             // 没有活动的笔记窗口时禁用
        }
    }
}

struct FocusedValueApp: App {
    var body: some Scene {
        WindowGroup {
            NoteEditorWindow()
        }
        .commands {
            NoteTitleCommands()
        }
    }
}
```

流程：

```text
窗口 A（活动）── focusedSceneValue ──▶  焦点值：title = A 的标题绑定
窗口 B（后台）── focusedSceneValue ──▶  （不生效，因为不是活动窗口）
                                              │
菜单命令 @FocusedValue ◀──────────────────────┘   读到的是窗口 A 的绑定

用户切换到窗口 B  →  焦点值自动变成 B 的绑定  →  菜单命令自动作用于 B
没有任何窗口     →  焦点值为 nil            →  菜单项自动禁用
```

两个发布修饰符的区别：

| 修饰符 | 什么时候生效 |
| --- | --- |
| `.focusedSceneValue(_:_:)` | 这个视图所在的**窗口**是活动窗口时。最常用 |
| `.focusedValue(_:_:)` | 这个**视图**（或它的后代）拥有键盘焦点时。用于窗口内有多个可聚焦区域的情况 |

可以发布值、绑定，也可以直接发布一个 `@Observable` 模型对象（`.focusedSceneValue(model)`，在命令里用 `@FocusedValue(Model.self)` 读取）。发布整个模型通常最方便：菜单命令可以调用模型的任何方法。

::: tip iPad 上同样有效
`commands` 和 `FocusedValue` 在 iPadOS 上用的是同一套 API。从 iPadOS 26 起 iPad 也有菜单栏，为 Mac 写的命令会直接出现在那里。接了硬件键盘时，快捷键也生效。
:::

## 设置窗口

Mac 应用的设置放在独立的窗口里，从“应用名 › 设置…”打开。`Settings` 场景处理了这一切。典型的写法是 `TabView` 加 `Form`，数据存在 `@AppStorage`（第 13 章）：

```swift macos
struct GeneralSettings: View {
    @AppStorage("launchAtLogin") private var launchAtLogin = false
    @AppStorage("fontSize") private var fontSize = 14.0
    @AppStorage("theme") private var theme = "system"

    var body: some View {
        Form {
            Toggle("登录时启动", isOn: $launchAtLogin)

            Picker("外观", selection: $theme) {
                Text("跟随系统").tag("system")
                Text("浅色").tag("light")
                Text("深色").tag("dark")
            }
            .pickerStyle(.inline)

            LabeledContent("字号") {
                HStack {
                    Slider(value: $fontSize, in: 10...24, step: 1)
                    Text("\(Int(fontSize)) 点").monospacedDigit().frame(width: 50, alignment: .trailing)
                }
            }
        }
        .formStyle(.grouped)
    }
}

struct SettingsView: View {
    var body: some View {
        TabView {
            Tab("通用", systemImage: "gear") {
                GeneralSettings()
            }
            Tab("高级", systemImage: "gearshape.2") {
                Form {
                    Toggle("启用实验性功能", isOn: .constant(false))
                }
                .formStyle(.grouped)
            }
        }
        .frame(width: 460, height: 300)
    }
}

struct SettingsApp: App {
    var body: some Scene {
        WindowGroup { Text("主窗口").frame(minWidth: 300, minHeight: 200) }
        Settings { SettingsView() }
    }
}
```

`Settings` 里的 `TabView` 会自动显示为设置窗口特有的工具栏式页签。

## 菜单栏图标应用

`MenuBarExtra` 在系统菜单栏右侧放一个图标。它有两种样式：

```swift macos
struct MenuBarApp: App {
    @State private var isRunning = false
    @State private var volume = 0.5

    var body: some Scene {
        // 样式一：普通菜单（默认）
        MenuBarExtra("计时器", systemImage: isRunning ? "timer.circle.fill" : "timer") {
            Button(isRunning ? "暂停" : "开始") { isRunning.toggle() }
                .keyboardShortcut("s")
            Divider()
            Button("退出") { NSApplication.shared.terminate(nil) }
                .keyboardShortcut("q")
        }

        // 样式二：弹出一个自定义的窗口
        MenuBarExtra("音量", systemImage: "speaker.wave.2") {
            VStack(alignment: .leading, spacing: 12) {
                Text("输出音量").font(.headline)
                Slider(value: $volume)
                Divider()
                Button("声音设置…") {}
            }
            .padding()
            .frame(width: 260)
        }
        .menuBarExtraStyle(.window)
    }
}
```

- `.menu` 样式（默认）：内容是一个菜单，只能放按钮、开关、分隔线等菜单项。
- `.window` 样式：内容是一个弹出的小窗口，可以放任意视图。

只有菜单栏图标、没有主窗口和程序坞图标的应用（常驻后台的小工具），在 Info.plist 里把 `LSUIElement`（Application is agent）设为 `YES`。

`MenuBarExtra(isInserted:)` 可以绑定一个布尔值，让用户在设置里选择是否显示菜单栏图标。

## 键盘与焦点

Mac 用户期望用键盘操作。标准组件（`List`、`Table`、`TextField`、`Button`）已经支持方向键、<kbd>Tab</kbd>、回车等。自定义的视图需要你自己接入。

### 让视图可以获得焦点并响应按键

```swift
struct KeyboardGrid: View {
    @State private var selection = 0
    @FocusState private var isFocused: Bool
    private let columns = 4
    private let count = 12

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.fixed(60)), count: columns), spacing: 8) {
            ForEach(0..<count, id: \.self) { index in
                RoundedRectangle(cornerRadius: 10)
                    .fill(index == selection ? Color.accentColor : .gray.opacity(0.2))
                    .frame(height: 60)
                    .overlay { Text("\(index + 1)") }
                    .onTapGesture { selection = index }
            }
        }
        .padding()
        .focusable()                                         // 这个区域可以获得键盘焦点
        .focused($isFocused)
        .focusEffectDisabled()                               // 不显示默认的焦点环（我们自己画了选中状态）
        .onKeyPress(.leftArrow) { move(-1) }
        .onKeyPress(.rightArrow) { move(1) }
        .onKeyPress(.upArrow) { move(-columns) }
        .onKeyPress(.downArrow) { move(columns) }
        .onKeyPress(.return) {
            print("打开第 \(selection + 1) 项")
            return .handled
        }
        .onAppear { isFocused = true }
    }

    private func move(_ delta: Int) -> KeyPress.Result {
        let next = selection + delta
        guard (0..<count).contains(next) else { return .ignored }
        selection = next
        return .handled
    }
}
```

- `.focusable()` 让视图可以成为键盘焦点。用户可以用 <kbd>Tab</kbd> 键切换到它。
- `.onKeyPress(_:action:)` 在视图有焦点时响应按键。返回 `.handled` 表示已处理，`.ignored` 表示交给上层继续处理。
- 也可以匹配一组按键或字符：`.onKeyPress(keys: [.space, .return])`、`.onKeyPress(characters: .alphanumerics)`。
- `KeyPress` 值里有 `modifiers`（修饰键）和 `phase`（按下、重复、松开）。

这段代码在 iOS 上也能编译运行（接了硬件键盘时生效）。

### 语义化的键盘命令

有些按键有约定俗成的含义。SwiftUI 提供了语义化的修饰符，比直接监听按键更合适：

```swift macos
struct SemanticCommands: View {
    @State private var items = ["甲", "乙", "丙", "丁"]
    @State private var selection: String?

    var body: some View {
        List(items, id: \.self, selection: $selection) { Text($0) }
            .onDeleteCommand {                                // Delete 键，或“编辑 › 删除”
                if let selection { items.removeAll { $0 == selection } }
            }
            .onExitCommand {                                  // Esc 键
                selection = nil
            }
            .onMoveCommand { direction in                     // 方向键（在未被其他控件处理时）
                print("移动：\(direction)")
            }
    }
}
```

### 默认按钮与取消按钮

对话框里，回车触发默认操作、<kbd>Esc</kbd> 触发取消，是 Mac 的基本惯例：

```swift
struct DialogButtons: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        HStack {
            Button("取消", role: .cancel) { dismiss() }
                .keyboardShortcut(.cancelAction)             // Esc
            Button("确定") { dismiss() }
                .keyboardShortcut(.defaultAction)            // 回车；按钮会显示为突出样式
        }
        .padding()
    }
}
```

## Mac 特有的界面元素

### 提示文字

指针悬停片刻后出现的小提示。工具栏里只有图标的按钮尤其需要它：

```swift
struct HelpDemo: View {
    var body: some View {
        Button("同步", systemImage: "arrow.triangle.2.circlepath") {}
            .labelStyle(.iconOnly)
            .help("立即与服务器同步（⌘R）")
    }
}
```

### 可拖动的分栏

```swift macos
struct SplitViewDemo: View {
    var body: some View {
        HSplitView {
            List(0..<10, id: \.self) { Text("来源 \($0)") }
                .frame(minWidth: 140, idealWidth: 180, maxWidth: 300)

            VSplitView {
                Text("编辑区").frame(maxWidth: .infinity, maxHeight: .infinity)
                Text("控制台").frame(maxWidth: .infinity, minHeight: 60, maxHeight: 200)
            }
        }
        .frame(minWidth: 500, minHeight: 300)
    }
}
```

`HSplitView` 和 `VSplitView` 提供用户可以拖动的分隔条。大多数“侧边栏 + 内容”的布局应该用 `NavigationSplitView`（它有系统的侧边栏样式和折叠行为）；`HSplitView` 用于需要自由分割的工作区，比如代码编辑器的编辑区和控制台。

### 指针样式

```swift macos
struct PointerStyleDemo: View {
    var body: some View {
        HStack(spacing: 0) {
            Color.blue.opacity(0.2)
            Rectangle()
                .fill(.gray)
                .frame(width: 4)
                .pointerStyle(.columnResize)        // 悬停时指针变成左右调整的箭头
            Color.green.opacity(0.2)
        }
        .frame(width: 300, height: 120)
    }
}
```

### 列表的双击与右键

第 17 章讲过 `contextMenu(forSelectionType:menu:primaryAction:)`。在 Mac 上，`primaryAction` 对应**双击**，`menu` 对应**右键**。这是 Mac 上列表和表格的标准交互：单击选中，双击打开，右键出菜单。

### 与访达互通

Mac 用户习惯在应用和访达之间拖文件：

```swift
struct FinderDropDemo: View {
    @State private var files: [URL] = []
    @State private var isTargeted = false

    var body: some View {
        VStack {
            if files.isEmpty {
                Text("把文件从访达拖到这里").foregroundStyle(.secondary)
            } else {
                List(files, id: \.self) { url in
                    Label(url.lastPathComponent, systemImage: "doc")
                        .draggable(url)                      // 也可以再拖出去
                }
            }
        }
        .frame(minWidth: 300, minHeight: 200)
        .background(isTargeted ? Color.accentColor.opacity(0.15) : .clear)
        .dropDestination(for: URL.self) { urls, _ in
            files.append(contentsOf: urls)
            return true
        } isTargeted: { isTargeted = $0 }
    }
}
```

`URL` 是 `Transferable` 的（第 25 章），所以文件的拖入拖出只需要这几行。

## 基于文档的应用

文本编辑器、绘图工具、表格软件，这类应用的核心是“文档”：用户新建、打开、编辑、保存一个个文件。Mac 对文档型应用有一整套约定：“文件”菜单、最近使用的文档、自动保存、标题栏上的文档图标、版本浏览、未保存时的提示。

`DocumentGroup` 场景提供了这一切。你只需要描述**文档的内容怎么读、怎么写**。

### 经典方式：FileDocument

```swift
import UniformTypeIdentifiers

nonisolated struct PlainTextDocument: FileDocument {
    static let readableContentTypes: [UTType] = [.plainText]

    var text: String

    init(text: String = "") {
        self.text = text
    }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents else {
            throw CocoaError(.fileReadCorruptFile)
        }
        text = String(decoding: data, as: UTF8.self)
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: Data(text.utf8))
    }
}

struct TextDocumentEditor: View {
    @Binding var document: PlainTextDocument

    var body: some View {
        TextEditor(text: $document.text)
            .font(.body.monospaced())
            .frame(minWidth: 400, minHeight: 300)
    }
}

struct TextEditorApp: App {
    var body: some Scene {
        DocumentGroup(newDocument: PlainTextDocument()) { file in
            TextDocumentEditor(document: file.$document)
        }
    }
}
```

- `FileDocument` 是值类型的文档。读：`init(configuration:)`；写：`fileWrapper(configuration:)`。
- `DocumentGroup` 给每个打开的文档一个窗口，把文档的**绑定**交给你的视图。
- 修改 `document.text`，系统就知道文档有了改动，会自动保存、在标题栏显示“已编辑”。

还需要在 target 的 **Info › Document Types** 里登记应用能打开的文件类型。同一段代码在 iOS 上会显示系统的文档浏览器。

`FileDocument` 的局限是：整个文档要一次性读进内存，读写在主线程上同步进行。对几 KB 的文本没问题，对几百 MB 的视频工程就不行了。

### 27 系列的新方式：Document 协议 <Badge type="tip" text="iOS 27+ / macOS 27+" />

27 系列引入了一组新的文档协议，解决上面的局限：

| 协议 | 作用 |
| --- | --- |
| `ReadableDocument` | 只读的文档（查看器） |
| `WritableDocument` | 可写的文档 |
| `Document` | 两者的组合，可读可写 |
| `DocumentReader` / `DocumentWriter` | 自定义读写逻辑，可以直接访问文件 URL，在后台执行并报告进度 |
| `FileWrapperDocumentReader` / `FileWrapperDocumentWriter` | 现成的、基于文件包装器的读写器，适合简单的情况 |

新协议的设计思路是把文档的生命周期拆成几步：

```text
打开：  文件 ──(后台) reader 读取──▶ 快照 ──(主线程) apply──▶ 文档对象的属性
保存：  文档对象 ──(主线程) snapshot──▶ 快照 ──(后台) writer 写入──▶ 文件
```

读写文件的重活在**后台**进行，主线程只负责在“快照”和文档对象之间做转换。文档对象是一个 `@Observable` 的**类**（引用类型），视图直接观察它的属性。

下面是官方文档给出的最小可读写文档，稍作整理：

```swift
import UniformTypeIdentifiers

@available(iOS 27, macOS 27, *)
@Observable
final class MarkdownDocument: Document {
    static let readableContentTypes = [UTType.plainText]

    var text = ""

    // 读：返回一个读取器。它在后台把文件内容读成一个快照（这里是 String）
    func reader(configuration: sending ReadConfiguration) -> sending FileWrapperDocumentReader<String> {
        FileWrapperDocumentReader(configuration) { fileWrapper in
            guard let data = fileWrapper.regularFileContents else {
                throw CocoaError(.fileReadCorruptFile)
            }
            return String(decoding: data, as: UTF8.self)
        }
    }

    // 读：在主线程上把快照应用到文档的属性
    @MainActor
    func apply(snapshot: sending String, previous: sending String?) async throws {
        text = snapshot
    }

    // 写：在主线程上取得当前内容的快照
    @MainActor
    func snapshot(contentType: UTType) async throws -> sending String {
        text
    }

    // 写：返回一个写入器。它在后台把快照写进文件
    func writer(configuration: sending WriteConfiguration) -> sending FileWrapperDocumentWriter<String> {
        FileWrapperDocumentWriter(configuration) { snapshot, _ in
            FileWrapper(regularFileWithContents: Data(snapshot.utf8))
        }
    }
}

@available(iOS 27, macOS 27, *)
struct MarkdownEditor: View {
    @Bindable var document: MarkdownDocument
    @Environment(\.undoManager) private var undoManager

    var body: some View {
        TextEditor(text: $document.text)
            .frame(minWidth: 400, minHeight: 300)
            .onChange(of: document.text) { oldValue, _ in
                // 登记撤销操作。系统靠它得知文档有未保存的修改，并触发自动保存
                undoManager?.registerUndo(withTarget: document) { document in
                    document.text = oldValue
                }
            }
    }
}

@available(iOS 27, macOS 27, *)
struct MarkdownApp: App {
    var body: some Scene {
        DocumentGroup { document in
            MarkdownEditor(document: document)
        } makeDocument: { _, _ in
            MarkdownDocument()
        }
    }
}
```

几个要点：

- 函数签名里的 `sending` 是 Swift 6 的关键字，表示这个值会被“送”到另一个隔离域（这里是在主线程和后台之间传递），编译器据此检查并发安全（第 12 章）。
- **必须登记撤销操作。** 官方文档特别强调：没有登记撤销操作，SwiftUI 不会触发自动保存。每一个用户可见的修改都应该通过环境里的 `undoManager` 登记。
- 需要直接访问文件 URL 时（用 Core Graphics、AVFoundation、PDFKit 等基于 URL 的框架处理大文件），自己实现 `DocumentReader` 和 `DocumentWriter`，它们的读写方法是 `@concurrent` 的，可以报告进度。
- `URLDocumentConfiguration` 提供文档的文件 URL 和最后修改时间。
- 只读的查看器只需遵循 `ReadableDocument`，并在 Info.plist 里把文档类型的角色设为 Viewer。

怎么选：

| 情况 | 用什么 |
| --- | --- |
| 需要支持 27 之前的系统 | `FileDocument`（值类型）或 `ReferenceFileDocument`（引用类型） |
| 只支持 27 及以后，文档较小 | `Document` 加 `FileWrapperDocumentReader` / `Writer` |
| 只支持 27 及以后，文档很大或需要直接访问 URL | `Document` 加自定义的 `DocumentReader` / `Writer` |

## 桥接 AppKit

和上一章的 UIKit 桥接完全对应，把名字里的 `UI` 换成 `NS`：

| UIKit（iOS） | AppKit（macOS） |
| --- | --- |
| `UIViewRepresentable` | `NSViewRepresentable` |
| `UIViewControllerRepresentable` | `NSViewControllerRepresentable` |
| `UIHostingController` | `NSHostingController` / `NSHostingView` |
| `@UIApplicationDelegateAdaptor` | `@NSApplicationDelegateAdaptor` |
| `makeUIView` / `updateUIView` | `makeNSView` / `updateNSView` |

```swift macos
import AppKit

struct ColorWellView: NSViewRepresentable {
    @Binding var color: Color

    func makeNSView(context: Context) -> NSColorWell {
        let well = NSColorWell(style: .expanded)
        well.target = context.coordinator
        well.action = #selector(Coordinator.colorChanged(_:))
        return well
    }

    func updateNSView(_ nsView: NSColorWell, context: Context) {
        nsView.color = NSColor(color)
        context.coordinator.parent = self
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    final class Coordinator: NSObject {
        var parent: ColorWellView

        init(parent: ColorWellView) {
            self.parent = parent
        }

        @objc func colorChanged(_ sender: NSColorWell) {
            parent.color = Color(nsColor: sender.color)
        }
    }
}

struct ColorWellDemo: View {
    @State private var color = Color.blue

    var body: some View {
        HStack {
            ColorWellView(color: $color).frame(width: 60, height: 30)
            RoundedRectangle(cornerRadius: 8).fill(color).frame(width: 100, height: 30)
        }
        .padding()
    }
}
```

模式和上一章的 `SearchField` 一模一样：`make` 创建，`update` 同步，`Coordinator` 接收回调。AppKit 的控件用目标-动作（target-action）机制，所以协调器里的方法要标 `@objc`。

需要应用委托的场合（比如处理“重新打开应用”“应用即将退出”）：

```swift macos nocheck
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true        // 关闭最后一个窗口时退出应用
    }
}

@main
struct MyMacApp: App {
    @NSApplicationDelegateAdaptor private var appDelegate: AppDelegate

    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
```

## 沙盒与权限

通过 Mac App Store 发布的应用必须开启 **App Sandbox**。沙盒里的应用默认不能访问用户的文件、网络、摄像头等。需要什么就在 target 的 **Signing & Capabilities › App Sandbox** 里勾选什么：

| 常用的权限 | 用途 |
| --- | --- |
| Outgoing Connections (Client) | 访问网络。**不勾选的话 `URLSession` 和 `AsyncImage` 都会失败**，这是 Mac 新手最常遇到的问题 |
| User Selected File（Read 或 Read/Write） | 读写用户通过打开/保存面板选择的文件。`fileImporter`、`fileExporter`、`DocumentGroup` 需要它 |
| Downloads / Pictures / Music / Movies Folder | 直接访问这些特定文件夹 |
| Camera、Audio Input、Location 等 | 对应的硬件 |

用户通过 `fileImporter` 或拖放给你的文件 URL 是带“安全作用域”的，使用时要调用 `startAccessingSecurityScopedResource()`（第 25 章）。想在应用重启后继续访问，需要把 URL 保存为安全作用域书签（security-scoped bookmark）。

## 让 iOS 应用在 Mac 上运行的三种方式

| 方式 | 是什么 | 界面 | 适合 |
| --- | --- | --- | --- |
| **原生 macOS**（SwiftUI + AppKit） | 一个真正的 Mac 应用 | 完全的 Mac 外观和行为 | 认真对待 Mac 平台的应用。**本教程采用的方式** |
| **Mac Catalyst** | 用 UIKit 的 iPad 应用编译成 Mac 应用 | 可以选择“缩放的 iPad 界面”或“为 Mac 优化” | 已有大量 UIKit 代码的 iPad 应用 |
| **Designed for iPad** | iPad 应用原封不动地在 Apple 芯片的 Mac 上运行 | 就是 iPad 的界面 | 零成本上架，但体验不是 Mac 的 |

用 SwiftUI 写的多平台项目（导读里建的那种）属于第一种：同一份 SwiftUI 代码，在 Mac 上用 AppKit 渲染，得到原生的 Mac 控件和行为。这也是下一章的主题。

## 常见误区

**误区一：“Mac 版只要能编译运行就行。”** 没有菜单命令、没有快捷键、窗口尺寸不合理、只有 iOS 风格的大按钮，用户一眼就能看出这不是一个 Mac 应用。

**误区二：“网络请求在 Mac 上不工作。”** 检查 App Sandbox 的 Outgoing Connections 是否勾选。

**误区三：“菜单命令里直接操作某个视图的状态。”** 菜单是全局的。用 `FocusedValue` 让活动窗口发布它的状态或模型。

**误区四：“把 iOS 的 `sheet` 当成 Mac 的主要呈现方式。”** Mac 上更常见的是新窗口、检查器、popover。sheet 用于需要用户必须处理完才能继续的对话。

**误区五：“窗口缩小后界面崩了。”** 给根视图设 `minWidth` / `minHeight`，并使用 `.windowResizability(.contentMinSize)`。

**误区六：“只有一个 `WindowGroup`，所有东西都塞进去。”** 设置用 `Settings`，辅助窗口用 `Window`，工具面板用 `UtilityWindow`。它们各有系统提供的标准行为。

**误区七：“用新的 `Document` 协议，但修改后没有自动保存。”** 需要通过 `undoManager` 登记撤销操作。

## 小结

- Mac 的核心差别在于精确的指针、常驻的键盘、多窗口和菜单栏。每个功能都应该能在菜单里找到并有快捷键。
- 场景类型：`WindowGroup`（多实例）、`Window`（单例）、`UtilityWindow`（工具面板）、`Settings`（设置）、`MenuBarExtra`（菜单栏图标）、`DocumentGroup`（文档）。
- `openWindow(id:)` 和 `openWindow(value:)` 打开窗口；`defaultSize`、`windowResizability`、`windowStyle`、`windowToolbarStyle` 配置窗口。
- `.commands` 用 `CommandMenu` 和 `CommandGroup` 定制菜单栏；`FocusedValue` 把全局的菜单和活动窗口的数据连起来。
- `.focusable()`、`.onKeyPress`、`.onDeleteCommand`、`.keyboardShortcut(.defaultAction)` 提供键盘操作。
- `DocumentGroup` 提供完整的文档基础设施。`FileDocument` 适合小文档；27 系列的 `Document` 协议在后台读写，适合大文件，并要求登记撤销操作。
- `NSViewRepresentable` 桥接 AppKit，模式与 UIKit 桥接相同。
- App Sandbox 需要明确勾选网络、文件等权限。

## 练习

1. 做一个 Mac 笔记应用的骨架：主窗口用 `NavigationSplitView`（侧边栏是笔记列表，详情是编辑器）；一个 `Settings` 场景，包含“通用”和“编辑器”两个页签；窗口最小尺寸 700 × 450。
2. 给上面的应用加一个“笔记”菜单：新建（<kbd>⌘N</kbd>）、复制（<kbd>⌘D</kbd>）、删除（<kbd>⌘⌫</kbd>）。用 `FocusedValue` 发布当前窗口的模型，让命令作用于活动窗口；没有选中笔记时，“复制”和“删除”禁用。
3. 实现“在新窗口中打开笔记”：双击侧边栏的笔记，用 `openWindow(value:)` 在独立窗口里打开它。验证对同一条笔记双击两次不会开出两个窗口。
4. 做一个菜单栏小工具：菜单栏上显示一个图标，点击弹出一个窗口样式的面板，里面是一个番茄钟（开始、暂停、重置，显示剩余时间）。图标在计时进行中和空闲时不同。
5. 用 `DocumentGroup` 和 `FileDocument` 做一个 JSON 查看/编辑器：能打开 `.json` 文件，用等宽字体显示并编辑，保存时校验是否为合法的 JSON。如果你的部署目标是 27，再用新的 `Document` 协议实现一遍，比较两者。

## 官方文档

- [Scenes（场景总览）](https://developer.apple.com/documentation/swiftui/scenes)
- [Windows（窗口总览）](https://developer.apple.com/documentation/swiftui/windows)
- [`WindowGroup`](https://developer.apple.com/documentation/swiftui/windowgroup)
- [`Window`](https://developer.apple.com/documentation/swiftui/window)
- [`UtilityWindow`](https://developer.apple.com/documentation/swiftui/utilitywindow)
- [`Settings`](https://developer.apple.com/documentation/swiftui/settings)
- [`MenuBarExtra`](https://developer.apple.com/documentation/swiftui/menubarextra)
- [`OpenWindowAction`](https://developer.apple.com/documentation/swiftui/openwindowaction)
- [Customizing window styles and state-restoration behavior in macOS](https://developer.apple.com/documentation/swiftui/customizing-window-styles-and-state-restoration-behavior-in-macos)
- [Menus and commands（菜单与命令总览）](https://developer.apple.com/documentation/swiftui/menus-and-commands)
- [`Commands` 协议](https://developer.apple.com/documentation/swiftui/commands)
- [`CommandMenu`](https://developer.apple.com/documentation/swiftui/commandmenu)
- [`CommandGroup`](https://developer.apple.com/documentation/swiftui/commandgroup)
- [`FocusedValue`](https://developer.apple.com/documentation/swiftui/focusedvalue)
- [`onKeyPress(_:action:)`](https://developer.apple.com/documentation/swiftui/view/onkeypress(_:action:))
- [Documents（文档总览）](https://developer.apple.com/documentation/swiftui/documents)
- [`DocumentGroup`](https://developer.apple.com/documentation/swiftui/documentgroup)
- [`FileDocument`](https://developer.apple.com/documentation/swiftui/filedocument)
- [`Document`（27 系列）](https://developer.apple.com/documentation/swiftui/document)
- [`ReadableDocument`](https://developer.apple.com/documentation/swiftui/readabledocument)
- [`WritableDocument`](https://developer.apple.com/documentation/swiftui/writabledocument)
- [`NSViewRepresentable`](https://developer.apple.com/documentation/swiftui/nsviewrepresentable)
- [AppKit integration（专题总览）](https://developer.apple.com/documentation/swiftui/appkit-integration)
- [Human Interface Guidelines：Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos)
- [Human Interface Guidelines：The menu bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar)
- [WWDC24：Tailor macOS windows with SwiftUI](https://developer.apple.com/videos/play/wwdc2024/10148/)
