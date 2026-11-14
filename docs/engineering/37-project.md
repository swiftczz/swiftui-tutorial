# 37 综合实战：跨平台笔记 App

## 本章目标

- 从零开始，完整地构建一个同时运行在 iPhone、iPad 和 Mac 上的应用
- 把前面三十六章的内容放进一个真实的项目里：布局、状态、数据持久化、导航、工具栏、搜索、动画、无障碍、多端适配
- 体会一个功能从需求到代码的完整思考过程
- 得到一份可以继续扩展的项目骨架

这一章的全部代码加起来大约 700 行，分成 10 个文件。每个文件都不长，每一处设计都对应前面某一章讲过的原则，我会在旁边指出来。这份代码在 Xcode 27.2 上针对 iOS 和 macOS 整体编译通过，数据层的查询和级联删除经过了实际运行的验证。

建议的学习方式：新建一个项目，**跟着敲一遍**，每完成一个文件就运行看看。不要直接复制粘贴。

## 我们要做什么

应用叫“轻笔记”。功能：

- 笔记可以放进文件夹，也可以不属于任何文件夹
- 侧边栏：全部笔记、已置顶、各个文件夹
- 中间栏：当前范围内的笔记列表，置顶的排在前面
- 详情栏：编辑标题和正文，自动保存
- 搜索标题和正文
- 新建、删除、置顶、复制笔记；新建、删除文件夹
- 设置：编辑器字号、列表的排序方式
- Mac 上有完整的菜单命令和快捷键，设置在独立的设置窗口里

在各平台上的形态：

```text
iPhone                iPad 横屏 / Mac
┌──────────┐          ┌────────┬───────────┬──────────────────┐
│ 文件夹    │          │ 文件夹  │ 笔记列表   │ 编辑器            │
│          │   →      │        │           │                  │
│          │  点击     │        │           │                  │
└──────────┘          └────────┴───────────┴──────────────────┘
┌──────────┐
│ 笔记列表  │
│          │   →  点击
└──────────┘
┌──────────┐
│ 编辑器    │
└──────────┘
```

同一份代码，iPhone 上是三层逐级推入，iPad 和 Mac 上是三栏并排。

## 动手之前：先做设计

写代码之前先回答第 34 章的四个问题。

**数据模型是什么？** 两个实体：`Folder`（文件夹）和 `Note`（笔记），一对多的关系。数据要持久化，要按条件查询和排序，所以用 SwiftData（第 13 章）。

**状态归谁？**

| 状态 | 类别 | 放在哪 |
| --- | --- | --- |
| 所有的文件夹和笔记 | 持久化的应用数据 | SwiftData，`App` 层创建容器 |
| 侧边栏选中了什么、选中了哪条笔记、搜索词 | 一个窗口的导航状态 | `@Observable` 的 `NavigationModel`，由根视图用 `@State` 持有 |
| 字号、排序方式 | 用户偏好 | `@AppStorage` |
| “新建文件夹”弹窗是否显示、输入的名字 | 界面状态 | 侧边栏视图的 `@State` |
| 输入焦点 | 界面状态 | 编辑器视图的 `@FocusState` |

注意第二行。导航状态是**每个窗口一份**的：在 Mac 上开两个窗口，应该能各看各的笔记。所以它由 `RootView` 持有，而不是放在 `App` 层。

**逻辑放哪？** “新建笔记”“置顶”“复制”这些操作会从工具栏、右键菜单、滑动操作、菜单栏好几个地方触发。它们只实现一次，放在 `ModelContext` 的扩展里（第 33 章“同一个动作，多个入口”）。

**导航骨架用什么？** 一个大的内容集合，按层级浏览：`NavigationSplitView` 三栏（第 19 章）。

文件结构：

```text
LightNotes/
├── App.swift            入口、场景、Mac 的设置窗口
├── Models.swift         Folder、Note、SidebarItem、NoteSortOrder
├── Store.swift          NavigationModel、数据操作、查询条件、示例数据
├── Platform.swift       平台差异的封装
├── Root.swift           NavigationSplitView 骨架
├── Sidebar.swift        文件夹侧边栏
├── NoteList.swift       笔记列表和行
├── Editor.swift         编辑器
├── Settings.swift       设置（共享的表单 + iOS 的 sheet 外壳）
└── Commands.swift       菜单栏命令
```

新建项目：**Multiplatform › App**，Storage 选 **None**（我们自己写 SwiftData 的代码，更清楚）。按导读确认三项构建设置。然后删掉模板生成的 `ContentView.swift`，依次创建下面的文件。

## 第一步：数据模型

**`Models.swift`**

```swift
import Foundation
import SwiftData

@Model
final class Folder {
    var name: String
    var createdAt: Date

    @Relationship(deleteRule: .cascade, inverse: \Note.folder)
    var notes: [Note] = []

    init(name: String, createdAt: Date = .now) {
        self.name = name
        self.createdAt = createdAt
    }
}

@Model
final class Note {
    var title: String
    var content: String
    var createdAt: Date
    var modifiedAt: Date
    var isPinned: Bool
    var folder: Folder?

    init(title: String = "", content: String = "", folder: Folder? = nil, isPinned: Bool = false, date: Date = .now) {
        self.title = title
        self.content = content
        self.folder = folder
        self.isPinned = isPinned
        self.createdAt = date
        self.modifiedAt = date
    }

    /// 列表里显示的标题：没有标题时用占位文字。
    var displayTitle: String {
        title.isEmpty ? String(localized: "新笔记") : title
    }

    /// 列表里显示的摘要：正文的第一行。
    var preview: String {
        content.split(separator: "\n", omittingEmptySubsequences: true).first.map(String.init) ?? ""
    }
}

enum SidebarItem: Hashable {
    case all
    case pinned
    case folder(Folder)

    var title: String {
        switch self {
        case .all: String(localized: "全部笔记")
        case .pinned: String(localized: "已置顶")
        case .folder(let folder): folder.name
        }
    }

    var symbol: String {
        switch self {
        case .all: "tray.full"
        case .pinned: "pin"
        case .folder: "folder"
        }
    }

    /// 在这个侧边栏项目下新建笔记时，笔记应该归属的文件夹。
    var targetFolder: Folder? {
        if case .folder(let folder) = self { folder } else { nil }
    }
}

enum NoteSortOrder: String, CaseIterable, Identifiable {
    case modified
    case created
    case title

    var id: Self { self }

    var label: String {
        switch self {
        case .modified: String(localized: "修改时间")
        case .created: String(localized: "创建时间")
        case .title: String(localized: "标题")
        }
    }

    var descriptors: [SortDescriptor<Note>] {
        switch self {
        case .modified: [SortDescriptor(\Note.modifiedAt, order: .reverse)]
        case .created: [SortDescriptor(\Note.createdAt, order: .reverse)]
        case .title: [SortDescriptor(\Note.title, comparator: .localizedStandard)]
        }
    }
}
```

对照前面的章节：

- **`@Model`**（第 13 章）让类可以持久化，同时自动成为可观察的。
- **`@Relationship(deleteRule: .cascade, inverse:)`**：删除文件夹时，里面的笔记一起删除。`inverse` 指明关系的另一端是 `Note.folder`。
- **`displayTitle` 和 `preview` 是计算属性**，不是存储属性。它们能从 `title` 和 `content` 算出来，所以不该存（第 9 章“状态还是派生值”）。
- **`String(localized:)`**（第 36 章）：这些文字不在 `Text` 里，要明确请求本地化。
- **`SidebarItem` 是枚举**。侧边栏有三种不同性质的项目：两个固定的和若干个文件夹。用一个带关联值的枚举统一表示，侧边栏的选择状态就是一个 `SidebarItem?`，不可能出现“既选了全部又选了某个文件夹”的非法状态。
- **`NoteSortOrder`** 的原始值是 `String`，所以可以直接存进 `@AppStorage`（第 13 章）。它知道自己对应什么排序规则，视图不需要关心细节。`comparator: .localizedStandard` 让标题按当地语言的习惯排序。

## 第二步：导航状态与数据操作

**`Store.swift`**

```swift
import SwiftUI
import SwiftData

/// 一个窗口的导航状态：侧边栏选中了什么、选中了哪条笔记、搜索词。
@Observable
final class NavigationModel {
    var sidebarSelection: SidebarItem? = .all
    var selectedNote: Note?
    var searchText = ""
}

/// 对笔记数据的操作。集中在这里，工具栏、菜单、快捷键、上下文菜单都调用同一份实现。
extension ModelContext {
    @discardableResult
    func createNote(in folder: Folder?) -> Note {
        let note = Note(folder: folder)
        insert(note)
        return note
    }

    @discardableResult
    func createFolder(named name: String) -> Folder {
        let folder = Folder(name: name)
        insert(folder)
        return folder
    }

    func togglePin(_ note: Note) {
        note.isPinned.toggle()
        note.modifiedAt = .now
    }

    func duplicate(_ note: Note) -> Note {
        let copy = Note(title: note.title, content: note.content, folder: note.folder)
        insert(copy)
        return copy
    }
}

extension Note {
    /// 构造查询条件：属于哪个侧边栏项目，并且匹配搜索词。
    static func predicate(for item: SidebarItem, searchText: String) -> Predicate<Note> {
        switch item {
        case .all:
            return #Predicate<Note> { note in
                searchText.isEmpty
                    || note.title.localizedStandardContains(searchText)
                    || note.content.localizedStandardContains(searchText)
            }
        case .pinned:
            return #Predicate<Note> { note in
                note.isPinned && (searchText.isEmpty
                    || note.title.localizedStandardContains(searchText)
                    || note.content.localizedStandardContains(searchText))
            }
        case .folder(let folder):
            let folderID = folder.persistentModelID
            return #Predicate<Note> { note in
                note.folder?.persistentModelID == folderID && (searchText.isEmpty
                    || note.title.localizedStandardContains(searchText)
                    || note.content.localizedStandardContains(searchText))
            }
        }
    }
}

enum SampleData {
    /// 预览和首次启动时使用的示例数据。
    static func insert(into context: ModelContext) {
        let work = Folder(name: String(localized: "工作"))
        let life = Folder(name: String(localized: "生活"))
        context.insert(work)
        context.insert(life)

        let samples: [(String, String, Folder?, Bool)] = [
            ("周会纪要", "本周完成了导航重构。\n下周开始做同步功能。", work, true),
            ("产品想法", "把搜索做成全局入口。\n支持按标签筛选。", work, false),
            ("购物清单", "牛奶\n鸡蛋\n咖啡豆", life, false),
            ("读书笔记", "《设计心理学》第三章：可见性与反馈。", nil, false),
        ]
        for (offset, sample) in samples.enumerated() {
            let date = Date.now.addingTimeInterval(Double(-offset) * 3600)
            context.insert(Note(title: sample.0, content: sample.1, folder: sample.2, isPinned: sample.3, date: date))
        }
    }

    @MainActor
    static var previewContainer: ModelContainer {
        let configuration = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try! ModelContainer(for: Folder.self, Note.self, configurations: configuration)
        insert(into: container.mainContext)
        return container
    }
}
```

- **`NavigationModel`** 是一个很小的 `@Observable` 类（第 10 章），只有三个属性。把导航状态放进一个对象而不是三个零散的 `@State`，是因为菜单栏命令需要读写它，后面会用 `focusedSceneValue` 把它整个发布出去（第 32 章）。
- **数据操作写成 `ModelContext` 的扩展。** 调用处是 `modelContext.createNote(in: folder)`，读起来很自然。四个方法各只有两三行，但它们是唯一的实现，所有入口都调用它们。
- **`Note.predicate(for:searchText:)`** 把“当前范围加搜索词”翻译成 SwiftData 的查询条件。`#Predicate`（第 13 章）里的表达式会被转换成数据库查询，筛选在数据库里完成。按文件夹筛选时，比较的是 `persistentModelID`：谓词里不能直接比较两个模型对象，要先在外面取出标识符。
- **`SampleData`** 同时服务于预览和首次启动。`previewContainer` 是一个只存在于内存里的容器（第 13 章）。

## 第三步：封装平台差异

**`Platform.swift`**

```swift
import SwiftUI

enum Metrics {
    #if os(macOS)
    static let rowVerticalPadding: CGFloat = 2
    static let editorPadding: CGFloat = 20
    #else
    static let rowVerticalPadding: CGFloat = 4
    static let editorPadding: CGFloat = 16
    #endif
    static let readableWidth: CGFloat = 720
}

extension View {
    /// 行内标题。仅 iOS 有效。
    func inlineTitle() -> some View {
        #if os(iOS)
        navigationBarTitleDisplayMode(.inline)
        #else
        self
        #endif
    }

    /// macOS 窗口的最小尺寸。iOS 上不做任何事。
    func minimumWindowSize(width: CGFloat, height: CGFloat) -> some View {
        #if os(macOS)
        frame(minWidth: width, minHeight: height)
        #else
        self
        #endif
    }
}
```

这就是第 33 章说的“把条件编译收拢起来”。整个项目里与平台有关的数值都在 `Metrics` 里，只在 iOS 或只在 macOS 上有意义的修饰符包装成了 `inlineTitle()` 和 `minimumWindowSize(width:height:)`。其余的文件里只剩下少数几处绕不开的 `#if`。

## 第四步：侧边栏

**`Sidebar.swift`**

```swift
import SwiftUI
import SwiftData

struct FolderSidebar: View {
    @Binding var selection: SidebarItem?
    @Query(sort: \Folder.createdAt) private var folders: [Folder]
    @Environment(\.modelContext) private var modelContext

    @State private var isAddingFolder = false
    @State private var newFolderName = ""
    @State private var folderToDelete: Folder?

    var body: some View {
        List(selection: $selection) {
            Section {
                SidebarRow(item: .all)
                SidebarRow(item: .pinned)
            }

            Section("文件夹") {
                ForEach(folders) { folder in
                    SidebarRow(item: .folder(folder), count: folder.notes.count)
                        .contextMenu {
                            Button("删除文件夹", systemImage: "trash", role: .destructive) {
                                folderToDelete = folder
                            }
                        }
                }
            }
        }
        .navigationTitle("轻笔记")
        .toolbar {
            ToolbarItem {
                Button("新建文件夹", systemImage: "folder.badge.plus") {
                    newFolderName = ""
                    isAddingFolder = true
                }
            }
        }
        .alert("新建文件夹", isPresented: $isAddingFolder) {
            TextField("名称", text: $newFolderName)
            Button("创建") {
                let folder = modelContext.createFolder(named: newFolderName)
                selection = .folder(folder)
            }
            .disabled(newFolderName.trimmingCharacters(in: .whitespaces).isEmpty)
            Button("取消", role: .cancel) {}
        }
        .confirmationDialog(
            "删除文件夹“\(folderToDelete?.name ?? "")”？",
            isPresented: Binding(get: { folderToDelete != nil }, set: { if !$0 { folderToDelete = nil } }),
            titleVisibility: .visible
        ) {
            Button("删除文件夹和其中的笔记", role: .destructive) {
                if let folder = folderToDelete {
                    if selection == .folder(folder) { selection = .all }
                    modelContext.delete(folder)
                }
            }
        } message: {
            Text("文件夹里的 \(folderToDelete?.notes.count ?? 0) 条笔记会一起删除。")
        }
    }
}

struct SidebarRow: View {
    let item: SidebarItem
    var count: Int? = nil

    var body: some View {
        Label(item.title, systemImage: item.symbol)
            .badge(count ?? 0)
            .tag(item)
    }
}
```

- **`@Query(sort: \Folder.createdAt)`**：文件夹列表。数据库里的文件夹有任何变化，它自动更新（第 13 章）。
- **`List(selection: $selection)`** 加上每一行的 **`.tag(item)`**：选择绑定的类型是 `SidebarItem?`，每行的 tag 类型是 `SidebarItem`，两者匹配（第 15 章讲 `Picker` 时强调过 tag 类型的重要性，`List` 同理）。
- **`selection` 是 `@Binding`**：侧边栏不拥有“选中了什么”这个状态，它只是读写父视图的状态（第 9 章）。
- **`.badge(count ?? 0)`**：显示文件夹里的笔记数。数量为 0 时角标自动隐藏。
- **新建文件夹用带输入框的 `alert`**（第 20 章）。名字为空时“创建”按钮禁用，条件直接从状态计算。
- **删除文件夹用 `confirmationDialog`**：这是一个破坏性操作，而且会连带删除笔记，必须让用户确认，并在消息里说明后果。
- **`folderToDelete: Folder?`** 一个可选值同时表达“是否显示确认框”和“要删除的是哪个”（第 20 章“优先用 item 形式”）。这里用自定义的 `Binding` 把它转成对话框需要的布尔值。
- **`SidebarRow` 用了 `Label`**（第 14 章）：在侧边栏里图标会自动对齐成一列，在 Mac 上自动用侧边栏的图标样式。

## 第五步：笔记列表

**`NoteList.swift`**

```swift
import SwiftUI
import SwiftData

struct NoteList: View {
    let sidebarItem: SidebarItem
    @Binding var selection: Note?

    @Query private var notes: [Note]
    @Environment(\.modelContext) private var modelContext

    init(sidebarItem: SidebarItem, searchText: String, sortOrder: NoteSortOrder, selection: Binding<Note?>) {
        self.sidebarItem = sidebarItem
        _selection = selection
        _notes = Query(
            filter: Note.predicate(for: sidebarItem, searchText: searchText),
            sort: sortOrder.descriptors
        )
    }

    private var pinned: [Note] { notes.filter(\.isPinned) }
    private var others: [Note] { notes.filter { !$0.isPinned } }

    var body: some View {
        List(selection: $selection) {
            if !pinned.isEmpty {
                Section("置顶") { rows(pinned) }
            }
            if !others.isEmpty {
                Section(pinned.isEmpty ? "" : "笔记") { rows(others) }
            }
        }
        .animation(.snappy, value: notes.map(\.persistentModelID))
        .overlay {
            if notes.isEmpty {
                ContentUnavailableView {
                    Label("没有笔记", systemImage: "note.text")
                } description: {
                    Text("点击工具栏上的按钮新建一条。")
                } actions: {
                    Button("新建笔记", action: createNote)
                }
            }
        }
        .navigationTitle(sidebarItem.title)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("新建笔记", systemImage: "square.and.pencil", action: createNote)
            }
            ToolbarItem(placement: .status) {
                Text("\(notes.count) 条笔记")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .contentTransition(.numericText(value: Double(notes.count)))
            }
        }
    }

    private func rows(_ notes: [Note]) -> some View {
        ForEach(notes) { note in
            NoteRow(title: note.displayTitle, preview: note.preview, date: note.modifiedAt, isPinned: note.isPinned)
                .tag(note)
                .swipeActions(edge: .leading) {
                    Button(note.isPinned ? "取消置顶" : "置顶", systemImage: note.isPinned ? "pin.slash" : "pin") {
                        withAnimation { modelContext.togglePin(note) }
                    }
                    .tint(.orange)
                }
                .swipeActions(edge: .trailing) {
                    Button("删除", systemImage: "trash", role: .destructive) { delete(note) }
                }
                .contextMenu {
                    Button(note.isPinned ? "取消置顶" : "置顶", systemImage: "pin") {
                        withAnimation { modelContext.togglePin(note) }
                    }
                    Button("复制一份", systemImage: "plus.square.on.square") {
                        selection = modelContext.duplicate(note)
                    }
                    Divider()
                    Button("删除", systemImage: "trash", role: .destructive) { delete(note) }
                }
        }
    }

    private func createNote() {
        withAnimation {
            selection = modelContext.createNote(in: sidebarItem.targetFolder)
        }
    }

    private func delete(_ note: Note) {
        withAnimation {
            if selection == note { selection = nil }
            modelContext.delete(note)
        }
    }
}

/// 一行笔记。只接收它要显示的值，不知道 Note 模型的存在。
struct NoteRow: View {
    let title: String
    let preview: String
    let date: Date
    let isPinned: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 4) {
                if isPinned {
                    Image(systemName: "pin.fill")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                        .accessibilityLabel("已置顶")
                }
                Text(title)
                    .font(.headline)
                    .lineLimit(1)
            }

            HStack(spacing: 6) {
                Text(date, format: .dateTime.month().day())
                    .foregroundStyle(.secondary)
                Text(preview.isEmpty ? String(localized: "没有正文") : preview)
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
            }
            .font(.subheadline)
        }
        .padding(.vertical, Metrics.rowVerticalPadding)
        .accessibilityElement(children: .combine)
    }
}
```

这是整个应用里最核心的一个文件。

- **在 `init` 里构造 `Query`**（第 13 章“动态查询”）。筛选条件和排序规则来自父视图传入的参数。参数一变，父视图重新创建 `NoteList`，查询随之更新。
- **`pinned` 和 `others` 是派生值**。一次查询，在内存里分成两组，分别放进两个 `Section`。
- **`.animation(.snappy, value: notes.map(\.persistentModelID))`**（第 26 章）：笔记的增删、置顶导致的顺序变化都带动画。监视的是 id 的数组，所以只有列表的**构成**变化时才触发，编辑笔记的内容不会。
- **空状态**用 `ContentUnavailableView`，并提供一个直接新建的按钮（第 17 章）。
- **工具栏**（第 21 章）：新建按钮用语义位置 `.primaryAction`；笔记数量放在 `.status`。数量变化时用 `.contentTransition(.numericText)` 让数字滚动（第 28 章）。
- **每一行有三个操作入口**：滑动操作、上下文菜单，以及后面的菜单栏。它们都调用 `ModelContext` 扩展里的同一个方法。
- **删除时先清空选择**：`if selection == note { selection = nil }`。否则详情栏会继续持有一个已经被删除的对象。
- **`NoteRow` 是一个“哑”视图**（第 34 章）：它只接收四个值，不知道 `Note` 的存在。这让它可以单独预览，并且只在这四个值变化时才更新（第 35 章）。
- **无障碍**（第 36 章）：置顶的图钉图标有标签“已置顶”；整行用 `.accessibilityElement(children: .combine)` 合并成一个元素。滑动操作和上下文菜单里的操作会自动成为 VoiceOver 的自定义动作。
- **`Metrics.rowVerticalPadding`**：Mac 上的行更紧凑。

## 第六步：编辑器

**`Editor.swift`**

```swift
import SwiftUI
import SwiftData

struct NoteEditor: View {
    @Bindable var note: Note
    var onDelete: () -> Void

    @Environment(\.modelContext) private var modelContext
    @AppStorage("editorFontSize") private var fontSize = 16.0
    @FocusState private var focus: Field?

    private enum Field { case title, content }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("标题", text: $note.title, axis: .vertical)
                .font(.title.bold())
                .textFieldStyle(.plain)
                .focused($focus, equals: .title)
                .submitLabel(.next)
                .onSubmit { focus = .content }

            Text(note.modifiedAt, format: .dateTime.year().month().day().hour().minute())
                .font(.footnote)
                .foregroundStyle(.secondary)

            TextEditor(text: $note.content)
                .font(.system(size: fontSize))
                .scrollContentBackground(.hidden)
                .focused($focus, equals: .content)
        }
        .padding(Metrics.editorPadding)
        .frame(maxWidth: Metrics.readableWidth)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .navigationTitle(note.displayTitle)
        .inlineTitle()
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button(note.isPinned ? "取消置顶" : "置顶", systemImage: note.isPinned ? "pin.fill" : "pin") {
                    modelContext.togglePin(note)
                }
                .contentTransition(.symbolEffect(.replace))
                .symbolEffect(.bounce, value: note.isPinned)

                ShareLink(item: "\(note.displayTitle)\n\n\(note.content)")
            }

            ToolbarItem(placement: .secondaryAction) {
                Button("删除笔记", systemImage: "trash", role: .destructive, action: onDelete)
            }
        }
        .onChange(of: note.title) { note.modifiedAt = .now }
        .onChange(of: note.content) { note.modifiedAt = .now }
        .onAppear {
            // 新建的空笔记：直接把光标放进标题
            if note.title.isEmpty && note.content.isEmpty { focus = .title }
        }
    }
}
```

- **`@Bindable var note: Note`**（第 10、13 章）：输入框直接绑定到模型的属性。打字就是在修改数据库里的对象，SwiftData 自动保存。没有“保存”按钮。
- **`@FocusState`**（第 16 章）：标题按回车跳到正文；新建的空笔记自动把光标放进标题。
- **`@AppStorage("editorFontSize")`**：和设置页面用的是同一个键，设置里一改，这里立刻生效。
- **限制阅读宽度**（第 33 章）：`.frame(maxWidth: Metrics.readableWidth)` 再 `.frame(maxWidth: .infinity)`，在很宽的 Mac 窗口里正文不会拉得太长。
- **置顶按钮的两个动画**（第 28、30 章）：`.contentTransition(.symbolEffect(.replace))` 让图钉在空心和实心之间平滑替换；`.symbolEffect(.bounce, value:)` 在状态变化时弹一下。
- **`ShareLink`**（第 25 章）：一行代码接入系统分享。
- **删除按钮放在 `.secondaryAction`**：iOS 上它被收进“更多”菜单，Mac 上显示在工具栏里。删除的实际逻辑由父视图通过 `onDelete` 闭包提供，因为删除之后要清空选择，而选择状态属于父视图。
- **`.onChange` 里更新修改时间**：这是一个副作用，所以放在 `onChange` 里（第 9 章）。

## 第七步：设置

**`Settings.swift`**

```swift
import SwiftUI

/// 共享：设置的内容。两个平台都用它。
struct SettingsForm: View {
    @AppStorage("editorFontSize") private var fontSize = 16.0
    @AppStorage("noteSortOrder") private var sortOrder = NoteSortOrder.modified

    var body: some View {
        Form {
            Section("编辑器") {
                LabeledContent("字号") {
                    Stepper("\(Int(fontSize)) 点", value: $fontSize, in: 12...28, step: 1)
                }
                Text("示例文字 Sample Text")
                    .font(.system(size: fontSize))
                    .foregroundStyle(.secondary)
            }

            Section("笔记列表") {
                Picker("排序方式", selection: $sortOrder) {
                    ForEach(NoteSortOrder.allCases) { order in
                        Text(order.label).tag(order)
                    }
                }
            }
        }
        .formStyle(.grouped)
    }
}

#if os(iOS)
/// 仅 iOS：把设置放进一个带导航栏的 sheet。
struct SettingsSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            SettingsForm()
                .navigationTitle("设置")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("完成") { dismiss() }
                    }
                }
        }
        .presentationDetents([.medium, .large])
    }
}
#endif
```

“共享内容，不同外壳”（第 33 章）。`SettingsForm` 写一次：

- 在 **iOS** 上，`SettingsSheet` 把它放进一个带导航栏和“完成”按钮的 sheet，用 `.presentationDetents` 让它可以半屏显示（第 20 章）。
- 在 **macOS** 上，它会被直接放进 `Settings` 场景（见 `App.swift`）。

`SettingsSheet` 整个包在 `#if os(iOS)` 里：Mac 上根本不需要它。

设置项直接用 `@AppStorage`。字号下方的示例文字实时反映当前的选择，这是设置界面的一个好习惯：让用户立刻看到效果。

## 第八步：把三栏拼起来

**`Root.swift`**

```swift
import SwiftUI
import SwiftData

struct RootView: View {
    @State private var navigation = NavigationModel()
    @AppStorage("noteSortOrder") private var sortOrder = NoteSortOrder.modified
    @Environment(\.modelContext) private var modelContext
    #if os(iOS)
    @State private var isShowingSettings = false
    #endif

    var body: some View {
        @Bindable var navigation = navigation

        NavigationSplitView {
            FolderSidebar(selection: $navigation.sidebarSelection)
                #if os(macOS)
                .navigationSplitViewColumnWidth(min: 170, ideal: 200, max: 280)
                #else
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("设置", systemImage: "gear") { isShowingSettings = true }
                    }
                }
                #endif
        } content: {
            if let item = navigation.sidebarSelection {
                NoteList(
                    sidebarItem: item,
                    searchText: navigation.searchText,
                    sortOrder: sortOrder,
                    selection: $navigation.selectedNote
                )
                #if os(macOS)
                .navigationSplitViewColumnWidth(min: 220, ideal: 280, max: 400)
                #endif
            } else {
                ContentUnavailableView("选择一个文件夹", systemImage: "folder")
            }
        } detail: {
            if let note = navigation.selectedNote {
                NoteEditor(note: note) {
                    withAnimation {
                        navigation.selectedNote = nil
                        modelContext.delete(note)
                    }
                }
                .id(note.persistentModelID)            // 换一条笔记时重置编辑器的焦点等内部状态
            } else {
                ContentUnavailableView("选择一条笔记", systemImage: "note.text", description: Text("或者新建一条。"))
            }
        }
        .searchable(text: $navigation.searchText, prompt: "搜索笔记")
        .onChange(of: navigation.sidebarSelection) { navigation.selectedNote = nil }
        .focusedSceneValue(navigation)                 // 让菜单栏命令能拿到这个窗口的导航状态
        .minimumWindowSize(width: 760, height: 460)
        #if os(iOS)
        .sheet(isPresented: $isShowingSettings) { SettingsSheet() }
        #endif
    }
}
```

- **`@State private var navigation = NavigationModel()`**：每个窗口一份导航状态。用 Xcode 27 编译时，`@State` 是宏，`NavigationModel()` 只在窗口第一次出现时执行一次（第 9 章）。
- **`@Bindable var navigation = navigation`**：在 `body` 里就地创建，这样才能写 `$navigation.sidebarSelection`（第 10 章）。
- **`NavigationSplitView` 的三栏通过共享的状态联系起来**（第 19 章）：侧边栏写 `sidebarSelection`，中间栏读它并写 `selectedNote`，详情栏读 `selectedNote`。
- **`.id(note.persistentModelID)`**（第 3 章）：切换到另一条笔记时，让 `NoteEditor` 成为一个新的身份。这样它内部的 `@FocusState` 等状态会重置，“新笔记自动聚焦标题”的逻辑也会重新执行。
- **`.searchable`** 加在整个 `NavigationSplitView` 上。搜索框的位置由系统决定：Mac 上在工具栏尾部，iPhone 上在底部或导航栏下方（第 21 章）。
- **切换文件夹时清空选中的笔记**：`.onChange(of: navigation.sidebarSelection)`。
- **`.focusedSceneValue(navigation)`**（第 32 章）：当这个窗口是活动窗口时，把它的导航状态发布出去，菜单栏命令据此知道该操作哪个窗口。
- **平台差异**：Mac 上设置了各栏的宽度范围和窗口的最小尺寸；iOS 上在侧边栏的导航栏里放了一个设置按钮，点击后弹出 sheet。Mac 的设置在独立窗口里，所以不需要这个按钮。

## 第九步：菜单栏命令

**`Commands.swift`**

```swift
import SwiftUI
import SwiftData

/// 菜单栏命令。macOS 上是菜单栏，iPadOS 26 起也有菜单栏；接了键盘时快捷键生效。
struct NoteCommands: Commands {
    @FocusedValue(NavigationModel.self) private var navigation
    let container: ModelContainer

    var body: some Commands {
        CommandGroup(replacing: .newItem) {
            Button("新建笔记") {
                guard let navigation else { return }
                let folder = navigation.sidebarSelection?.targetFolder
                navigation.selectedNote = container.mainContext.createNote(in: folder)
            }
            .keyboardShortcut("n")
            .disabled(navigation == nil)
        }

        CommandMenu("笔记") {
            Button(navigation?.selectedNote?.isPinned == true ? "取消置顶" : "置顶") {
                if let note = navigation?.selectedNote {
                    container.mainContext.togglePin(note)
                }
            }
            .keyboardShortcut("p", modifiers: [.command, .shift])
            .disabled(navigation?.selectedNote == nil)

            Button("复制一份") {
                if let navigation, let note = navigation.selectedNote {
                    navigation.selectedNote = container.mainContext.duplicate(note)
                }
            }
            .keyboardShortcut("d")
            .disabled(navigation?.selectedNote == nil)

            Divider()

            Button("删除笔记", role: .destructive) {
                if let navigation, let note = navigation.selectedNote {
                    navigation.selectedNote = nil
                    container.mainContext.delete(note)
                }
            }
            .keyboardShortcut(.delete)
            .disabled(navigation?.selectedNote == nil)
        }
    }
}
```

- **`@FocusedValue(NavigationModel.self)`** 读取活动窗口发布的导航状态。没有活动窗口时它是 `nil`。
- **`CommandGroup(replacing: .newItem)`**：把系统默认的“新建窗口”替换成“新建笔记”，快捷键 <kbd>⌘N</kbd>。
- **`CommandMenu("笔记")`** 新增一个顶级菜单，包含置顶、复制、删除。
- **没有选中笔记时，相关的菜单项自动禁用。** `navigation?.selectedNote` 是可观察的，选择一变，菜单项的可用状态跟着变。
- 命令通过传入的 `container` 拿到主上下文。菜单栏不在视图树里，读不到 `@Environment(\.modelContext)`。
- 调用的仍然是 `createNote`、`togglePin`、`duplicate` 这几个方法。到这里，“置顶”这个操作已经有了**四个入口**：编辑器的工具栏按钮、列表的滑动操作、列表的上下文菜单、菜单栏命令（带快捷键）。实现只有一份。

这段代码在 iPad 上同样生效：iPadOS 26 起的菜单栏里会出现“笔记”菜单，接了键盘时 <kbd>⌘N</kbd> 可以新建笔记。

## 第十步：应用入口

**`App.swift`**

```swift
import SwiftUI
import SwiftData

@main
struct LightNotesApp: App {
    private let container: ModelContainer

    init() {
        do {
            container = try ModelContainer(for: Folder.self, Note.self)
            // 第一次启动：放入示例数据
            let isEmpty = try container.mainContext.fetchCount(FetchDescriptor<Note>()) == 0
            if isEmpty { SampleData.insert(into: container.mainContext) }
        } catch {
            fatalError("无法创建数据库：\(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(container)
        .commands {
            NoteCommands(container: container)
            SidebarCommands()
        }
        #if os(macOS)
        .defaultSize(width: 1040, height: 660)
        .windowToolbarStyle(.unified)
        #endif

        #if os(macOS)
        Settings {
            SettingsForm()
                .frame(width: 440, height: 300)
        }
        #endif
    }
}

#Preview {
    RootView()
        .modelContainer(SampleData.previewContainer)
}
```

- **容器在 `init` 里创建一次**，然后用 `.modelContainer(container)` 注入场景，并传给命令。
- **首次启动放入示例数据**：数据库里没有任何笔记时才插入。
- **`fatalError`**：数据库创建失败是无法恢复的错误。真实的应用里可以考虑更友好的处理，比如提示用户并退回到一个只存在于内存里的容器。
- **`SidebarCommands()`**：系统预置的命令，在“显示”菜单里加入“显示/隐藏边栏”。
- **Mac 专属的部分用 `#if os(macOS)` 包住**：窗口的默认尺寸、工具栏样式，以及 `Settings` 场景。`Settings` 里直接放共享的 `SettingsForm`。
- **`#Preview`** 用内存容器和示例数据。在画布底部切换设备，可以直接比较 iPhone、iPad、Mac 上的样子。

到这里应用已经完整了。运行它。

## 验收

对照第 33 章的检查清单过一遍。

**在 iPhone 上：**

- 打开是文件夹列表，点“全部笔记”进入笔记列表，点一条笔记进入编辑器。三层导航，可以侧滑返回。
- 在笔记上左滑删除，右滑置顶。长按出现上下文菜单。
- 新建笔记后光标自动在标题里，回车跳到正文。
- 侧边栏左上角的齿轮打开设置 sheet，可以拖到半屏。
- 把系统字号调到最大，列表和编辑器仍然可用。
- 切换到深色模式，颜色正常。

**在 iPad 上：**

- 横屏是三栏。把窗口拖窄，变成和 iPhone 一样的逐级导航。
- 接上键盘：<kbd>⌘N</kbd> 新建，<kbd>⌘⇧P</kbd> 置顶，<kbd>⌘D</kbd> 复制。
- 从屏幕顶部下滑，菜单栏里有“笔记”菜单。

**在 Mac 上：**

- 三栏并排，侧边栏和中间栏的宽度可以拖动，但有上下限。
- 窗口不能缩得比 760 × 460 更小。
- 菜单栏：“文件 › 新建笔记”，“笔记”菜单里有置顶、复制、删除。没有选中笔记时后三项是灰色的。
- <kbd>⌘,</kbd> 打开设置窗口。改字号，编辑器立刻变化。
- 右键点击笔记和文件夹有上下文菜单。
- 在笔记列表里用方向键上下移动选择。
- “显示 › 隐藏边栏”可用。

**数据：**

- 退出再打开，笔记都在。
- 在文件夹里新建的笔记属于那个文件夹；在“全部笔记”里新建的不属于任何文件夹。
- 删除文件夹，里面的笔记一起消失。
- 搜索同时匹配标题和正文。
- 在设置里换排序方式，列表顺序跟着变。

## 回顾：哪些原则用在了哪里

| 原则 | 出处 | 在这个项目里 |
| --- | --- | --- |
| 界面是状态的函数 | 第 1 章 | 整个应用没有一行“更新界面”的代码 |
| 视图身份决定状态的生命周期 | 第 3 章 | 编辑器的 `.id(note.persistentModelID)` |
| 用标准组件，保留默认行为 | 第 15、33 章 | `List`、`Form`、`NavigationSplitView`、`Label` 在各平台自动适配 |
| 单一数据源 | 第 9 章 | 笔记只存在于 SwiftData；导航状态只在 `NavigationModel` 里 |
| 能算出来的不存 | 第 9 章 | `displayTitle`、`preview`、`pinned`、`others` |
| 一个可选值表达“是否显示”和“显示什么” | 第 20 章 | `folderToDelete`、`selectedNote` |
| 用枚举让非法状态无法表示 | 第 10 章 | `SidebarItem` |
| 模型自带可观察能力，直接绑定 | 第 10、13 章 | `@Bindable var note` |
| 查询条件在子视图的 `init` 里构造 | 第 13 章 | `NoteList.init` |
| 导航是状态 | 第 19 章 | 三栏通过 `NavigationModel` 联系 |
| 语义化的工具栏位置 | 第 21 章 | `.primaryAction`、`.secondaryAction`、`.status`、`.confirmationAction` |
| 破坏性操作要确认 | 第 20 章 | 删除文件夹的 `confirmationDialog` |
| 动画是状态变化的插值 | 第 26 章 | 一个 `.animation(_:value:)` 覆盖了列表的所有变化 |
| 内容转场 | 第 28 章 | 数量的 `.numericText`、图钉的 `.symbolEffect(.replace)` |
| 平台差异集中封装 | 第 33 章 | `Platform.swift` |
| 共享内容，不同外壳 | 第 33 章 | `SettingsForm` |
| 同一个动作，多个入口 | 第 33 章 | `ModelContext` 扩展里的四个方法 |
| 菜单通过焦点值找到活动窗口 | 第 32 章 | `focusedSceneValue` 与 `@FocusedValue` |
| 子视图只接收它需要的数据 | 第 34 章 | `NoteRow` |
| 无障碍从标准组件开始 | 第 36 章 | 所有按钮都有标题；行合并为一个元素 |

## 接下来可以做什么

这个应用是一个起点。下面每一项都是一个不错的练习，并且都能用教程里学到的东西完成。按难度大致排序：

**基础扩展**

1. **笔记的字数统计**：在编辑器底部显示字数，用 `.contentTransition(.numericText())`。
2. **文件夹重命名**：给文件夹的上下文菜单加“重命名”，用带输入框的 `alert`。
3. **拖放整理**：把笔记拖到侧边栏的文件夹上，移动到那个文件夹（第 25 章的 `draggable` 和 `dropDestination`；需要为 `Note` 定义一个可传输的标识）。
4. **撤销**：SwiftData 支持撤销。创建容器后设置 `container.mainContext.undoManager = UndoManager()`，并在菜单里接入撤销和重做。
5. **空的搜索结果**：搜索无结果时显示 `ContentUnavailableView.search(text:)`，和“没有笔记”区分开。

**界面与动效**

6. **卡片视图**：在列表和网格之间切换（工具栏上一个 `Picker`）。网格用 `LazyVGrid` 加 `.adaptive` 列（第 7 章）。
7. **缩放转场**：在 iOS 的网格视图里，点击卡片用 `.navigationTransition(.zoom)` 展开成编辑器（第 28 章）。
8. **富文本**：把正文换成 `AttributedString`，用 26 系列的富文本 `TextEditor`，在工具栏里加粗体、斜体按钮（第 16 章）。
9. **Liquid Glass 的悬浮按钮**：在 iPhone 的笔记列表右下角放一个玻璃材质的新建按钮（第 23 章）。
10. **拖动排序**：在“手动排序”模式下，用 27 系列的 `reorderable` 拖动调整笔记顺序（第 17 章）。

**平台能力**

11. **多窗口**：在 Mac 和 iPad 上，双击笔记在新窗口里打开（第 32 章的 `WindowGroup(for:)` 和 `openWindow(value:)`）。
12. **菜单栏快速笔记**：Mac 上加一个 `MenuBarExtra`，点开就是一个输入框，回车保存成一条新笔记。
13. **导入与导出**：用 `fileExporter` 把一条笔记导出为文本文件，用 `fileImporter` 导入（第 25 章）。
14. **小组件**：做一个显示最近一条置顶笔记的桌面小组件（WidgetKit，需要把数据库放进 App Group 共享）。
15. **iCloud 同步**：打开 CloudKit 能力，让笔记在设备间同步（第 13 章提到的模型要求：属性要有默认值，关系要是可选的）。

**工程**

16. **测试**：为 `Note.predicate(for:searchText:)` 和 `ModelContext` 的四个操作写 Swift Testing 测试，使用内存容器（第 34 章）。
17. **本地化**：添加英文本地化，为“N 条笔记”设置复数变体，用伪语言测试布局（第 36 章）。
18. **无障碍审查**：闭上眼睛用 VoiceOver 完成“新建文件夹 → 新建笔记 → 置顶 → 删除”的完整流程，修复遇到的问题（第 36 章）。
19. **性能**：插入一万条笔记，用 Instruments 检查滚动和搜索的表现（第 35 章）。

## 结语

回到导读里说的那三个模型：

- **声明式渲染**：界面是状态的函数。你描述每个状态下界面的样子，框架负责变化的过程。
- **布局协商**：父视图提议，子视图决定自己的大小，父视图摆放。
- **数据流**：每份数据只有一个源头，其他地方只读或者持有绑定。

教程里所有的组件、修饰符、动画，都是这三个模型的具体应用。API 会随着系统更新不断增加和变化，这门教程里标着“27+”的内容几年后就会成为理所当然的基础，又会有新的东西出现。但这三个模型从 SwiftUI 诞生那天起就没有变过。

遇到没见过的 API，先问它属于哪个模型：它是在描述界面、参与布局，还是在传递数据？遇到不符合预期的行为，也回到模型上去找原因：状态是什么？视图的身份变了吗？父视图提议了多大？

接下来最好的学习方式是做一个你自己真正想用的应用。遇到问题时回来查对应的章节，再顺着章末的链接去读官方文档。

## 官方文档

本章用到的 API 的文档都已在前面各章列出。下面是几个值得通读的官方资源，适合在完成这个项目之后继续学习：

- [Develop in Swift Tutorials（Apple 官方的系统入门教程）](https://developer.apple.com/tutorials/develop-in-swift)
- [SwiftUI Tutorials（官方 SwiftUI 教程：Landmarks）](https://developer.apple.com/tutorials/swiftui)
- [SwiftUI 概念教程（Exploring SwiftUI concepts）](https://developer.apple.com/tutorials/swiftui-concepts)
- [Landmarks: Building an app with Liquid Glass（官方多平台示例项目）](https://developer.apple.com/documentation/swiftui/landmarks-building-an-app-with-liquid-glass)
- [Food Truck: Building a SwiftUI multiplatform app（官方多平台示例项目）](https://developer.apple.com/documentation/swiftui/food-truck-building-a-swiftui-multiplatform-app)
- [Backyard Birds（SwiftData 与小组件的官方示例项目）](https://developer.apple.com/documentation/swiftui/backyard-birds-sample)
- [SwiftData 框架](https://developer.apple.com/documentation/swiftdata)
- [`NavigationSplitView`](https://developer.apple.com/documentation/swiftui/navigationsplitview)
- [`FocusedValue`](https://developer.apple.com/documentation/swiftui/focusedvalue)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [SwiftUI 更新记录](https://developer.apple.com/documentation/updates/swiftui)
