# 20 模态呈现：sheet、alert 与 popover

## 本章目标

- 用 `sheet` 呈现模态页面，掌握布尔驱动和数据驱动两种方式
- 配置 sheet 的高度档位、背景、关闭行为
- 用 `alert` 和 `confirmationDialog` 进行提示与确认
- 用 `popover`、`fullScreenCover`、`inspector` 处理其他呈现需求
- 掌握“编辑副本，确认后写回”的模态编辑模式
- 知道各种呈现方式在 iOS 与 macOS 上的差异

导航（上一章）是“去往另一个地方”，模态呈现是“暂时打断当前的事，处理一件相关的事，然后回来”。

## 呈现也是状态

所有的呈现修饰符遵循同一个模式：**绑定一个状态，状态满足条件时呈现，不满足时关闭。**

```text
状态：isPresented = false   →   界面：没有 sheet
状态：isPresented = true    →   界面：显示 sheet
用户下滑关闭 sheet           →   状态：SwiftUI 自动把 isPresented 设回 false
```

没有 `present()` 和 `dismiss()` 这样的方法调用，只有状态。这和第 9 章的原则完全一致。

## sheet

### 布尔驱动

```swift
struct SheetBasics: View {
    @State private var isShowingSettings = false

    var body: some View {
        Button("打开设置") {
            isShowingSettings = true
        }
        .sheet(isPresented: $isShowingSettings) {
            SettingsSheet()
        }
    }
}

struct SettingsSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Toggle("通知", isOn: .constant(true))
            }
            .navigationTitle("设置")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") { dismiss() }
                }
            }
        }
    }
}
```

sheet 的内容是一个**独立的视图层级**。几个要点：

- 它想要导航栏和标题，就得自己包一个 `NavigationStack`。
- 它通过环境里的 `dismiss` 关闭自己（第 11 章），不需要知道是谁打开了它。
- 外层通过 `.environment(_:)` 注入的自定义可观察对象，sheet 的内容里通常可以继承到；但稳妥起见，sheet 需要的依赖最好在 sheet 的内容视图上明确注入。

### 数据驱动

要显示“某一条数据的详情”时，用 `sheet(item:)`。它绑定一个可选值：非 `nil` 时呈现，并把值传给内容闭包。

```swift
struct Photo: Identifiable {
    let id = UUID()
    var title: String
    var color: Color
}

struct ItemSheetDemo: View {
    let photos = [
        Photo(title: "日出", color: .orange),
        Photo(title: "森林", color: .green),
        Photo(title: "大海", color: .blue),
    ]
    @State private var selectedPhoto: Photo?

    var body: some View {
        HStack(spacing: 12) {
            ForEach(photos) { photo in
                Button {
                    selectedPhoto = photo
                } label: {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(photo.color.gradient)
                        .frame(width: 80, height: 80)
                }
                .buttonStyle(.plain)
            }
        }
        .sheet(item: $selectedPhoto) { photo in
            VStack(spacing: 16) {
                RoundedRectangle(cornerRadius: 20)
                    .fill(photo.color.gradient)
                    .frame(height: 240)
                Text(photo.title).font(.title)
            }
            .padding()
        }
    }
}
```

::: tip 优先用 item 形式
初学者常这样写：一个 `@State var isPresented` 加一个 `@State var selectedPhoto`，点击时先设置 `selectedPhoto` 再把 `isPresented` 设为 `true`。这是两个需要保持同步的状态，容易出现“sheet 弹出来了但数据是空的”这种问题。

`sheet(item:)` 只用**一个**状态同时表达“是否显示”和“显示什么”，不可能不同步。这正是第 9 章“单一数据源”的应用。`item` 的类型需要遵循 `Identifiable`；`item` 换成另一个 id 不同的值时，sheet 会关闭再重新打开。
:::

### 高度档位

iOS 上 sheet 默认占满大半个屏幕。`presentationDetents` 指定它可以停留的高度：

```swift
struct DetentsDemo: View {
    @State private var isPresented = false
    @State private var detent = PresentationDetent.medium

    var body: some View {
        Button("显示半屏面板") { isPresented = true }
            .sheet(isPresented: $isPresented) {
                List(0..<30, id: \.self) { Text("选项 \($0)") }
                    .presentationDetents([.height(160), .medium, .large], selection: $detent)
                    .presentationDragIndicator(.visible)
                    .presentationBackgroundInteraction(.enabled(upThrough: .medium))
                    .presentationContentInteraction(.scrolls)
            }
    }
}
```

| 档位 | 高度 |
| --- | --- |
| `.medium` | 大约半屏 |
| `.large` | 全高（默认） |
| `.height(200)` | 固定点数 |
| `.fraction(0.3)` | 屏幕高度的比例 |
| 自定义 | 实现 `CustomPresentationDetent` |

这些修饰符加在 **sheet 的内容**上，不是加在 `.sheet` 外面：

| 修饰符 | 作用 |
| --- | --- |
| `.presentationDetents(_:selection:)` | 可停留的高度；可选地绑定当前档位 |
| `.presentationDragIndicator(_:)` | 顶部的小横条 |
| `.presentationBackgroundInteraction(_:)` | sheet 后面的内容是否还能交互。地图类应用的底部面板靠它 |
| `.presentationContentInteraction(_:)` | 向上拖动时优先滚动内容（`.scrolls`）还是优先展开面板（`.resizes`） |
| `.presentationCornerRadius(_:)` | 圆角 |
| `.presentationBackground(_:)` | 背景，可以是材质如 `.thinMaterial` |
| `.interactiveDismissDisabled(_:)` | 禁止下滑关闭 |
| `.presentationSizing(_:)` | 尺寸策略：`.form`、`.page`、`.fitted`。主要影响 iPad 和 Mac |

### 防止误关闭

表单填到一半被不小心滑掉是很糟的体验。有未保存的修改时禁用下滑关闭：

```swift
struct ProtectedSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var isConfirmingDiscard = false

    private var hasChanges: Bool { !text.isEmpty }

    var body: some View {
        NavigationStack {
            Form {
                TextField("写点什么", text: $text, axis: .vertical)
                    .lineLimit(4...)
            }
            .navigationTitle("新建笔记")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        if hasChanges { isConfirmingDiscard = true } else { dismiss() }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { dismiss() }
                        .disabled(!hasChanges)
                }
            }
            .confirmationDialog("放弃这条笔记？", isPresented: $isConfirmingDiscard) {
                Button("放弃更改", role: .destructive) { dismiss() }
                Button("继续编辑", role: .cancel) {}
            }
        }
        .interactiveDismissDisabled(hasChanges)
    }
}
```

### 关闭时的回调

```swift
struct OnDismissDemo: View {
    @State private var isPresented = false
    @State private var log = ""

    var body: some View {
        VStack {
            Button("打开") { isPresented = true }
            Text(log)
        }
        .sheet(isPresented: $isPresented, onDismiss: {
            log = "sheet 关闭于 \(Date.now.formatted(date: .omitted, time: .standard))"
        }) {
            Text("向下滑动关闭").padding(40)
        }
    }
}
```

### 平台差异

| | iOS | iPadOS | macOS |
| --- | --- | --- | --- |
| 外观 | 从底部滑出的卡片 | 屏幕中央的卡片（或从底部滑出，取决于宽度） | 依附在窗口上的面板 |
| 关闭方式 | 下滑、按钮 | 点击外部、下滑、按钮 | 只能通过按钮或 <kbd>Esc</kbd> |
| 高度档位 | 支持 | 紧凑宽度下支持 | 不适用 |
| 尺寸 | 系统决定 | 可用 `presentationSizing` | 由内容的 `frame` 决定 |

macOS 上 sheet **不能下滑关闭**，所以一定要提供关闭按钮。并且 macOS 的 sheet 尺寸跟随内容，记得给内容一个合适的 `.frame(minWidth:minHeight:)`。

## fullScreenCover（iOS）

完全盖住屏幕的呈现，不能下滑关闭。适合登录流程、拍照、沉浸式阅读：

```swift ios
struct FullScreenDemo: View {
    @State private var isPresented = false

    var body: some View {
        Button("进入全屏") { isPresented = true }
            .fullScreenCover(isPresented: $isPresented) {
                FullScreenContent()
            }
    }
}

struct FullScreenContent: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()
            Text("沉浸式内容").foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            Button("关闭", systemImage: "xmark.circle.fill") { dismiss() }
                .labelStyle(.iconOnly)
                .font(.title)
                .tint(.white)
                .padding()
        }
    }
}
```

`fullScreenCover` 在 macOS 上不可用。多平台代码里用 `#if os(iOS)` 区分，macOS 上通常改用 `sheet` 或新窗口。

## alert：警告框

```swift
struct AlertBasics: View {
    @State private var isShowingAlert = false
    @State private var isShowingDeleteAlert = false
    @State private var result = ""

    var body: some View {
        VStack(spacing: 16) {
            Button("简单提示") { isShowingAlert = true }
            Button("删除确认", role: .destructive) { isShowingDeleteAlert = true }
            Text(result)
        }
        .alert("保存成功", isPresented: $isShowingAlert) {
            // 不写任何按钮时，系统自动提供一个“好”
        }
        .alert("删除这张照片？", isPresented: $isShowingDeleteAlert) {
            Button("删除", role: .destructive) { result = "已删除" }
            Button("取消", role: .cancel) { result = "已取消" }
        } message: {
            Text("此操作无法撤销。")
        }
    }
}
```

- 标题是第一个参数。`message:` 闭包提供补充说明。
- `actions` 闭包里放 `Button`。角色决定样式和位置：`.cancel` 的按钮会被放在系统规定的位置并加粗，`.destructive` 显示为红色。
- 任何按钮被点击后，alert 都会自动关闭。
- alert 里的按钮不能自定义外观。

### 带输入框的 alert

```swift
struct AlertWithTextField: View {
    @State private var isRenaming = false
    @State private var name = "未命名"
    @State private var draft = ""

    var body: some View {
        Button("重命名：\(name)") {
            draft = name
            isRenaming = true
        }
        .alert("重命名", isPresented: $isRenaming) {
            TextField("名称", text: $draft)
            Button("确定") { name = draft }
                .disabled(draft.isEmpty)
            Button("取消", role: .cancel) {}
        }
    }
}
```

### 数据驱动的 alert

和 sheet 一样，alert 也应该尽量用一个可选值同时表达“是否显示”和“显示什么”。

经典写法是 `presenting:` 参数，配合一个布尔值：

```swift
struct FileItem: Identifiable {
    let id = UUID()
    var name: String
}

struct AlertPresenting: View {
    @State private var fileToDelete: FileItem?
    @State private var isConfirming = false
    let files = [FileItem(name: "报告.pdf"), FileItem(name: "照片.jpg")]

    var body: some View {
        List(files) { file in
            Button(file.name) {
                fileToDelete = file
                isConfirming = true
            }
        }
        .alert("删除文件", isPresented: $isConfirming, presenting: fileToDelete) { file in
            Button("删除 \(file.name)", role: .destructive) {}
            Button("取消", role: .cancel) {}
        } message: { file in
            Text("“\(file.name)”将被永久删除。")
        }
    }
}
```

用 Xcode 27 编译时，有了更简洁的 `item:` 形式 <Badge type="warning" text="Xcode 27 SDK" />，只需要一个可选值，和 `sheet(item:)` 的用法统一了：

```swift
struct AlertItem: View {
    @State private var fileToDelete: FileItem?
    let files = [FileItem(name: "报告.pdf"), FileItem(name: "照片.jpg")]

    var body: some View {
        List(files) { file in
            Button(file.name) { fileToDelete = file }
        }
        .alert("删除文件", item: $fileToDelete) { file in
            Button("删除 \(file.name)", role: .destructive) {}
            Button("取消", role: .cancel) {}
        } message: { file in
            Text("“\(file.name)”将被永久删除。")
        }
    }
}
```

`confirmationDialog` 也有对应的 `item:` 形式。

### 显示错误

把一个可选的错误绑定给 alert，错误非空时自动弹出 <Badge type="warning" text="Xcode 27 SDK" />：

```swift
enum UploadError: LocalizedError {
    case tooLarge
    case offline

    var errorDescription: String? {
        switch self {
        case .tooLarge: "文件太大"
        case .offline: "网络不可用"
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .tooLarge: "请选择小于 10 MB 的文件。"
        case .offline: "请检查网络连接后重试。"
        }
    }
}

struct ErrorAlertDemo: View {
    @State private var error: UploadError?

    var body: some View {
        VStack(spacing: 12) {
            Button("模拟文件过大") { error = .tooLarge }
            Button("模拟断网") { error = .offline }
        }
        .alert(error: $error) { _ in
            Button("好") {}
        } message: { error in
            Text(error.recoverySuggestion ?? "")
        }
    }
}
```

错误类型遵循 `LocalizedError` 时，alert 的标题自动取 `errorDescription`。

::: details 用 Xcode 26 及更早版本时的写法
旧 SDK 里显示错误需要一个布尔值加一个错误值：

```swift nocheck
.alert(isPresented: $isShowingError, error: error) { _ in
    Button("好") {}
} message: { error in
    Text(error.recoverySuggestion ?? "")
}
```

并且要自己维护 `isShowingError` 与 `error` 的同步。
:::

## confirmationDialog：操作确认

当用户要做一个需要确认或需要从几个选项里选择的操作时使用：

```swift
struct ConfirmationDemo: View {
    @State private var isPresented = false
    @State private var choice = ""

    var body: some View {
        VStack(spacing: 12) {
            Button("分享照片") { isPresented = true }
            Text(choice)
        }
        .confirmationDialog("选择分享方式", isPresented: $isPresented, titleVisibility: .visible) {
            Button("保存到相册") { choice = "保存到相册" }
            Button("拷贝链接") { choice = "拷贝链接" }
            Button("删除照片", role: .destructive) { choice = "删除" }
            Button("取消", role: .cancel) {}
        } message: {
            Text("照片将以原始画质分享。")
        }
    }
}
```

| | iPhone | iPad | Mac |
| --- | --- | --- | --- |
| 外观 | 从底部滑出的操作列表 | 锚定在触发按钮旁的气泡 | 类似 alert 的对话框 |

`alert` 和 `confirmationDialog` 怎么选：

- **alert**：告知用户一件重要的事，或者需要用户在一两个选项间做决定。它会打断用户，所以要克制使用。
- **confirmationDialog**：用户主动发起了一个操作，需要确认或从多个相关选项里选择。尤其是破坏性操作的二次确认。

::: warning 修饰符加在哪
`confirmationDialog` 在 iPad 上会显示成气泡，箭头指向**被修饰的视图**。所以应该把它加在触发它的那个按钮上，而不是加在整个页面的根视图上，否则气泡会出现在奇怪的位置。
:::

## popover：气泡

锚定在某个视图旁边的浮动面板：

```swift
struct PopoverDemo: View {
    @State private var isPresented = false
    @State private var fontSize = 16.0

    var body: some View {
        VStack(spacing: 20) {
            Text("示例文字").font(.system(size: fontSize))

            Button("调整字号", systemImage: "textformat.size") {
                isPresented = true
            }
            .popover(isPresented: $isPresented, arrowEdge: .top) {
                VStack(alignment: .leading) {
                    Text("字号 \(Int(fontSize))").font(.headline)
                    Slider(value: $fontSize, in: 12...40)
                }
                .padding()
                .frame(width: 260)
                .presentationCompactAdaptation(.popover)
            }
        }
    }
}
```

- 在 iPad 和 Mac 上，popover 是带箭头的气泡，点击外部关闭。
- 在 iPhone 上，popover 默认**变成 sheet**（因为屏幕太窄）。加上 `.presentationCompactAdaptation(.popover)` 可以强制它在 iPhone 上也显示为气泡。
- popover 的大小由内容决定，通常要给内容指定 `frame`。

## inspector：检查器

检查器是显示“当前选中内容的属性”的侧边面板，是 Mac 和 iPad 上专业应用的常见元素：

```swift
struct InspectorDemo: View {
    @State private var isInspectorShown = true
    @State private var opacity = 1.0
    @State private var cornerRadius = 20.0

    var body: some View {
        NavigationStack {
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(.teal.opacity(opacity))
                .padding(40)
                .navigationTitle("画布")
                .toolbar {
                    Button("检查器", systemImage: "sidebar.trailing") {
                        isInspectorShown.toggle()
                    }
                }
                .inspector(isPresented: $isInspectorShown) {
                    Form {
                        LabeledContent("不透明度") { Slider(value: $opacity) }
                        LabeledContent("圆角") { Slider(value: $cornerRadius, in: 0...80) }
                    }
                    .inspectorColumnWidth(min: 200, ideal: 260, max: 360)
                }
        }
    }
}
```

| 环境 | 表现 |
| --- | --- |
| Mac、iPad 常规宽度 | 内容右侧的一栏，和主内容并排 |
| iPhone、iPad 紧凑宽度 | 自动变成一个 sheet |

这又是一个“声明用途，系统决定形态”的例子。

## 模态编辑的标准模式

用 sheet 编辑一条数据时，有一个重要的设计问题：用户改到一半点了“取消”，修改应该被丢弃。如果 sheet 里的输入框直接绑定到原始数据，改动会立刻生效，取消就无从谈起。

标准做法是：**sheet 里编辑一份副本（草稿），用户确认时才把草稿写回。**

```swift
struct Person: Identifiable, Equatable {
    let id = UUID()
    var name: String
    var email: String
}

struct PersonEditor: View {
    @Environment(\.dismiss) private var dismiss
    @State private var draft: Person
    let onSave: (Person) -> Void

    init(person: Person, onSave: @escaping (Person) -> Void) {
        self.draft = person                    // 用传入的数据初始化草稿
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            Form {
                TextField("姓名", text: $draft.name)
                TextField("邮箱", text: $draft.email)
            }
            .navigationTitle("编辑联系人")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }                    // 草稿被丢弃
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        onSave(draft)                              // 把草稿交回去
                        dismiss()
                    }
                    .disabled(draft.name.isEmpty)
                }
            }
        }
    }
}

struct PeopleList: View {
    @State private var people = [
        Person(name: "陈一", email: "chen@example.com"),
        Person(name: "林二", email: "lin@example.com"),
    ]
    @State private var editing: Person?

    var body: some View {
        List(people) { person in
            Button {
                editing = person
            } label: {
                VStack(alignment: .leading) {
                    Text(person.name)
                    Text(person.email).font(.caption).foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)
        }
        .sheet(item: $editing) { person in
            PersonEditor(person: person) { updated in
                if let index = people.firstIndex(where: { $0.id == updated.id }) {
                    people[index] = updated
                }
            }
        }
    }
}
```

这个模式里的几个设计：

- `PersonEditor` 用 `@State` 持有草稿，并用传入的 `person` 初始化它。这是第 9 章说的“`@State` 的初始值只用一次”的**正当用法**：我们就是想要一份独立的副本。
- 结果通过闭包 `onSave` 向上传递（第 11 章数据流全景里的“闭包回调”）。
- 因为 `Person` 是值类型，赋值就是复制，草稿和原始数据天然独立。如果模型是类，需要手动创建副本，或者使用 SwiftData 的独立上下文。

## 多个呈现的注意事项

**同一个视图上不要挂多个同类型的呈现修饰符。** 例如在同一个视图上加两个 `.sheet`，只有一个会生效。解决办法是用一个枚举表示“当前呈现的是哪一个”：

```swift
struct MultipleSheets: View {
    enum ActiveSheet: Identifiable {
        case settings
        case profile
        case detail(Int)

        var id: String {
            switch self {
            case .settings: "settings"
            case .profile: "profile"
            case .detail(let number): "detail-\(number)"
            }
        }
    }

    @State private var activeSheet: ActiveSheet?

    var body: some View {
        VStack(spacing: 12) {
            Button("设置") { activeSheet = .settings }
            Button("个人资料") { activeSheet = .profile }
            Button("详情 7") { activeSheet = .detail(7) }
        }
        .sheet(item: $activeSheet) { sheet in
            switch sheet {
            case .settings: Text("设置页").padding(40)
            case .profile: Text("个人资料页").padding(40)
            case .detail(let number): Text("详情 \(number)").padding(40)
            }
        }
    }
}
```

一个枚举状态同时保证了“同一时刻最多显示一个 sheet”，非法状态无法表示。

**同一时刻只能有一个模态呈现在最上层。** sheet 里可以再弹出 sheet（层层叠加），但不能在一个 sheet 还没关闭时，从它下面的视图再弹出另一个。

## 常见误区

**误区一：“用两个状态控制 sheet：一个布尔值加一个选中项。”** 用 `sheet(item:)`，一个可选值就够了。

**误区二：“sheet 里没有导航栏。”** sheet 是独立的层级，需要自己包 `NavigationStack`。

**误区三：“`presentationDetents` 加在 `.sheet` 修饰符的外面。”** 它要加在 sheet 的**内容**上。

**误区四：“macOS 上 sheet 关不掉。”** macOS 的 sheet 不能下滑关闭，必须提供按钮。

**误区五：“sheet 里直接绑定原始数据，取消时再想办法恢复。”** 编辑草稿，确认后写回。

**误区六：“在同一个视图上加了两个 `.sheet`，第二个不出来。”** 用枚举合并成一个，或者把它们分别加在不同的视图上。

## 小结

- 所有呈现都由状态驱动：`isPresented` 布尔值，或 `item` 可选值。优先用 `item`，一个状态同时表达“是否显示”和“显示什么”。
- `sheet` 的内容是独立层级，自带 `NavigationStack`，通过环境的 `dismiss` 关闭。`presentationDetents` 等修饰符加在内容上。
- `alert` 用于重要提示，`confirmationDialog` 用于操作确认；按钮角色决定样式与位置。Xcode 27 的 SDK 提供了 `item:` 和 `error:` 形式。
- `popover` 在窄屏上自动变成 sheet；`inspector` 在窄屏上也是如此；`fullScreenCover` 仅 iOS。
- 模态编辑用草稿副本，确认时通过闭包写回。
- 多个 sheet 用一个枚举状态统一管理。

## 练习

1. 做一个照片墙：点击任意照片用 `sheet(item:)` 显示大图，sheet 有 `.medium` 和 `.large` 两个档位。
2. 给第 17 章练习里的待办清单加上“新建”和“编辑”功能：都用同一个 sheet 表单，采用草稿模式；有未保存修改时禁止下滑关闭，点取消时用 `confirmationDialog` 确认。
3. 做一个删除确认流程：列表项左滑删除时先弹出 `confirmationDialog`（或 Xcode 27 的 `alert(_:item:)`），显示要删除的条目名称，确认后才真正删除。
4. 做一个文字编辑器的格式面板：在 iPad 和 Mac 上是 `inspector`，观察它在 iPhone 上自动变成了什么。

## 官方文档

- [Modal presentations（专题总览）](https://developer.apple.com/documentation/swiftui/modal-presentations)
- [`sheet(isPresented:onDismiss:content:)`](https://developer.apple.com/documentation/swiftui/view/sheet(ispresented:ondismiss:content:))
- [`sheet(item:onDismiss:content:)`](https://developer.apple.com/documentation/swiftui/view/sheet(item:ondismiss:content:))
- [`presentationDetents(_:)`](https://developer.apple.com/documentation/swiftui/view/presentationdetents(_:))
- [`PresentationDetent`](https://developer.apple.com/documentation/swiftui/presentationdetent)
- [`interactiveDismissDisabled(_:)`](https://developer.apple.com/documentation/swiftui/view/interactivedismissdisabled(_:))
- [`fullScreenCover(isPresented:onDismiss:content:)`](https://developer.apple.com/documentation/swiftui/view/fullscreencover(ispresented:ondismiss:content:))
- [`alert(_:isPresented:actions:message:)`](https://developer.apple.com/documentation/swiftui/view/alert(_:ispresented:actions:message:))
- [`alert(_:item:actions:)`](https://developer.apple.com/documentation/swiftui/view/alert(_:item:actions:))
- [`confirmationDialog(_:isPresented:titleVisibility:actions:message:)`](https://developer.apple.com/documentation/swiftui/view/confirmationdialog(_:ispresented:titlevisibility:actions:message:))
- [`popover(isPresented:attachmentAnchor:arrowEdge:content:)`](https://developer.apple.com/documentation/swiftui/view/popover(ispresented:attachmentanchor:arrowedge:content:))
- [`inspector(isPresented:content:)`](https://developer.apple.com/documentation/swiftui/view/inspector(ispresented:content:))
- [`DismissAction`](https://developer.apple.com/documentation/swiftui/dismissaction)
- [Human Interface Guidelines：Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
- [Human Interface Guidelines：Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
