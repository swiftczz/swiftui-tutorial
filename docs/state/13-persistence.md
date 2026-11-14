# 13 持久化：AppStorage 与 SwiftData

## 本章目标

- 用 `@AppStorage` 保存用户偏好设置
- 用 `@SceneStorage` 恢复界面状态
- 用 SwiftData 定义模型、增删改查、建立关系
- 用 `@Query` 让界面自动跟随数据库变化
- 知道几种持久化方案各自适合什么数据

到目前为止，所有状态在应用退出后都会消失。这一章解决“数据怎么留下来”。

## 选哪种方案

先看全景，再逐个学。

| 方案 | 适合存什么 | 容量 | 例子 |
| --- | --- | --- | --- |
| `@AppStorage` | 少量简单的用户偏好 | 很小 | 是否开启通知、主题、上次选的排序方式 |
| `@SceneStorage` | 每个窗口的界面状态 | 很小 | 选中的标签页、滚动位置、未提交的草稿 |
| SwiftData | 结构化的业务数据，需要查询和关联 | 大 | 笔记、待办、订单、联系人 |
| 文件（`Codable` + `FileManager`） | 文档、导入导出、缓存 | 任意 | 一份 JSON 配置、用户导出的备份 |
| 钥匙串（Keychain） | 密码、令牌等敏感信息 | 很小 | 登录凭证 |

一个常见的错误是把所有东西都塞进 `@AppStorage`。它底层是 `UserDefaults`，设计目的就是存几个偏好开关，不是数据库。

## @AppStorage：用户偏好

`@AppStorage` 用起来和 `@State` 几乎一样，区别是它的值存在 `UserDefaults` 里，应用重启后还在：

```swift
struct PreferencesView: View {
    @AppStorage("username") private var username = ""
    @AppStorage("fontSize") private var fontSize = 16.0
    @AppStorage("isDarkModeForced") private var isDarkModeForced = false

    var body: some View {
        Form {
            TextField("用户名", text: $username)

            Slider(value: $fontSize, in: 12...28, step: 1) {
                Text("字号")
            }
            Text("示例文字")
                .font(.system(size: fontSize))

            Toggle("强制深色模式", isOn: $isDarkModeForced)
        }
        .preferredColorScheme(isDarkModeForced ? .dark : nil)
    }
}
```

- 字符串参数是存储用的**键**。同一个键在应用任何地方读到的都是同一个值，一处修改，所有用到它的视图都会更新。
- 等号后面是**默认值**：`UserDefaults` 里还没有这个键时使用。
- 支持的类型：`Bool`、`Int`、`Double`、`String`、`URL`、`Data`，以及它们的可选类型。

### 存枚举

原始值是 `String` 或 `Int` 的枚举可以直接存：

```swift
enum SortOrder: String, CaseIterable, Identifiable {
    case byDate = "date"
    case byName = "name"
    case bySize = "size"

    var id: Self { self }

    var title: String {
        switch self {
        case .byDate: "按日期"
        case .byName: "按名称"
        case .bySize: "按大小"
        }
    }
}

struct SortPicker: View {
    @AppStorage("sortOrder") private var sortOrder = SortOrder.byDate

    var body: some View {
        Picker("排序", selection: $sortOrder) {
            ForEach(SortOrder.allCases) { order in
                Text(order.title).tag(order)
            }
        }
        .pickerStyle(.segmented)
        .padding()
    }
}
```

::: tip 把键集中管理
键是字符串，写错了编译器不会报错，只会悄悄读到默认值。键多了以后，把它们集中定义成常量：

```swift
enum StorageKey {
    static let sortOrder = "sortOrder"
    static let fontSize = "fontSize"
}
```
:::

### 注意事项

- **不要存敏感信息。** `UserDefaults` 是明文的属性列表文件。
- **不要存大量数据。** 整个 `UserDefaults` 会在启动时被读入内存。
- 在 macOS 上，可以配合 `Settings` 场景做设置窗口（第 32 章）；`defaults` 命令行工具也能读写这些值。
- 想让多个应用或扩展共享偏好，用 App Group 的 `UserDefaults(suiteName:)`，通过 `@AppStorage("key", store: ...)` 指定。

## @SceneStorage：恢复界面状态

iOS 可能在后台终止你的应用以回收内存。用户再回来时，期望看到的是离开时的样子：同一个标签页，同一段没写完的文字。`@SceneStorage` 就是为这个设计的：

```swift
struct DraftEditor: View {
    @SceneStorage("draftText") private var draftText = ""
    @SceneStorage("selectedTab") private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab("草稿", systemImage: "square.and.pencil", value: 0) {
                TextEditor(text: $draftText)
                    .padding()
            }
            Tab("预览", systemImage: "eye", value: 1) {
                Text(draftText.isEmpty ? "还没有内容" : draftText)
                    .padding()
            }
        }
    }
}
```

它和 `@AppStorage` 的区别：

| | `@AppStorage` | `@SceneStorage` |
| --- | --- | --- |
| 作用范围 | 整个应用共享一份 | **每个场景（窗口）各一份** |
| 存储位置 | `UserDefaults` | 系统的状态恢复机制 |
| 何时清除 | 你自己删除，或卸载应用 | 用户主动关闭该窗口或从多任务里划掉应用时 |
| 用途 | 用户做出的**设置** | 界面的**临时状态** |

在 Mac 或 iPad 上开两个窗口，各自有独立的 `@SceneStorage`。这正是它存在的意义：每个窗口记住自己的状态。

## SwiftData：结构化数据

当数据有结构、有数量、需要查询排序时，用 SwiftData <Badge type="tip" text="iOS 17+ / macOS 14+" />。它是 Apple 的持久化框架，和 SwiftUI 配合得很紧密。

SwiftData 有四个核心概念：

| 概念 | 是什么 | 类比 |
| --- | --- | --- |
| `@Model` | 标记一个类是可持久化的模型 | 数据库的表结构 |
| `ModelContainer` | 管理数据库文件和模型结构 | 数据库本身 |
| `ModelContext` | 增删改查的工作区，跟踪未保存的修改 | 一次会话 / 事务 |
| `@Query` | 在视图里声明“我要这些数据”，自动跟随变化 | 一条会自动刷新的查询 |

### 第一步：定义模型

```swift
import SwiftData

@Model
class Note {
    var title: String
    var content: String
    var createdAt: Date
    var isPinned: Bool

    init(title: String, content: String = "", createdAt: Date = .now, isPinned: Bool = false) {
        self.title = title
        self.content = content
        self.createdAt = createdAt
        self.isPinned = isPinned
    }
}
```

`@Model` 宏做了两件事：让这个类可以被 SwiftData 存取；同时让它成为**可观察的**（效果等同于上一章的 `@Observable`）。所以 `Note` 的属性变化会自动更新读过它的视图，不需要再加 `@Observable`。

模型必须是类，必须有初始化器。属性可以是基本类型、`Date`、`Data`、`URL`、`UUID`、遵循 `Codable` 的类型、枚举，以及其他 `@Model` 类型。

### 第二步：配置容器

在 `App` 里用 `.modelContainer(for:)` 创建容器并注入环境：

```swift nocheck
@main
struct NotesApp: App {
    var body: some Scene {
        WindowGroup {
            NoteListView()
        }
        .modelContainer(for: Note.self)
    }
}
```

这一行创建了数据库文件，建立了 `Note` 对应的表结构，并把容器和它的主上下文放进了环境。有多个模型时传数组：`.modelContainer(for: [Note.self, Folder.self])`。

### 第三步：查询和显示

```swift
struct NoteListView: View {
    @Query(sort: \Note.createdAt, order: .reverse) private var notes: [Note]
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        NavigationStack {
            List {
                ForEach(notes) { note in
                    VStack(alignment: .leading) {
                        Text(note.title).font(.headline)
                        Text(note.createdAt, format: .dateTime.month().day().hour().minute())
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .onDelete(perform: delete)
            }
            .navigationTitle("笔记")
            .toolbar {
                Button("新建", systemImage: "plus") {
                    modelContext.insert(Note(title: "新笔记 \(notes.count + 1)"))
                }
            }
        }
    }

    private func delete(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(notes[index])
        }
    }
}
```

- `@Query` 声明一个查询，结果是一个数组。**数据库里的数据变了，这个数组自动更新，视图自动刷新。** 你不需要手动重新查询。
- `@Environment(\.modelContext)` 取得上下文，用来增删。
- `modelContext.insert(_:)` 插入，`modelContext.delete(_:)` 删除。
- 修改就是直接改属性：`note.title = "新标题"`。

::: info 需要手动保存吗
默认开启了**自动保存**：SwiftData 会在适当的时机（界面事件循环结束、应用进入后台等）把修改写入磁盘。大多数情况下不需要调用 `try modelContext.save()`。只有在需要确保数据立刻落盘时（比如马上要把数据同步出去）才手动保存。
:::

### 编辑：直接绑定模型

`@Model` 类是可观察的，所以用上一章的 `@Bindable` 就能编辑：

```swift
struct NoteEditor: View {
    @Bindable var note: Note

    var body: some View {
        Form {
            TextField("标题", text: $note.title)
            Toggle("置顶", isOn: $note.isPinned)
            TextEditor(text: $note.content)
                .frame(minHeight: 200)
        }
        .navigationTitle(note.title)
    }
}
```

在输入框里打字，直接修改的就是数据库里的对象，列表页的标题同步变化，自动保存负责落盘。没有“保存”按钮，没有“把表单数据拷回模型”的代码。

### 筛选与排序

`@Query` 支持筛选条件（谓词）和排序：

```swift
struct PinnedNotesView: View {
    @Query(
        filter: #Predicate<Note> { $0.isPinned },
        sort: [SortDescriptor(\Note.createdAt, order: .reverse)]
    )
    private var pinnedNotes: [Note]

    var body: some View {
        List(pinnedNotes) { note in
            Text(note.title)
        }
        .overlay {
            if pinnedNotes.isEmpty {
                ContentUnavailableView("没有置顶的笔记", systemImage: "pin.slash")
            }
        }
    }
}
```

`#Predicate` 是一个宏，让你用普通的 Swift 表达式写筛选条件，编译器检查类型，SwiftData 把它翻译成数据库查询。筛选在数据库层面完成，不会把所有数据读进内存再过滤。

谓词里可以用的操作有限（比较、逻辑运算、字符串的 `contains` / `localizedStandardContains`、集合的 `contains` 等）。写了不支持的表达式，编译器会报错。

### 动态查询：条件来自状态

`@Query` 的参数在声明时就确定了。如果筛选条件来自用户输入（比如搜索词），标准做法是**把列表拆成子视图，在子视图的 `init` 里构造查询**：

```swift
struct SearchableNotes: View {
    @State private var searchText = ""

    var body: some View {
        NavigationStack {
            FilteredNoteList(searchText: searchText)
                .searchable(text: $searchText)
                .navigationTitle("搜索笔记")
        }
    }
}

struct FilteredNoteList: View {
    @Query private var notes: [Note]

    init(searchText: String) {
        let predicate = #Predicate<Note> { note in
            searchText.isEmpty || note.title.localizedStandardContains(searchText)
        }
        _notes = Query(filter: predicate, sort: \Note.createdAt, order: .reverse)
    }

    var body: some View {
        List(notes) { note in
            Text(note.title)
        }
    }
}
```

`searchText` 变化时，父视图重新创建 `FilteredNoteList(searchText: 新值)`，`init` 里构造出新的查询。这里的 `_notes = Query(...)` 是直接给属性包装器本身赋值。

### 关系

模型之间可以互相引用：

```swift
@Model
class Folder {
    var name: String

    @Relationship(deleteRule: .cascade, inverse: \Page.folder)
    var pages: [Page] = []

    init(name: String) {
        self.name = name
    }
}

@Model
class Page {
    var title: String
    var folder: Folder?

    init(title: String, folder: Folder? = nil) {
        self.title = title
        self.folder = folder
    }
}
```

- `Folder.pages` 是一对多：一个文件夹有多个页面。
- `Page.folder` 是反向关系：页面属于哪个文件夹。
- `@Relationship(deleteRule: .cascade)` 指定删除规则：删除文件夹时，把里面的页面一起删除。默认规则是 `.nullify`（只把页面的 `folder` 设为 `nil`）。
- `inverse:` 告诉 SwiftData 两个属性是同一个关系的两端。设置一端，另一端自动更新。

使用时就像操作普通的对象和数组：

```swift
struct FolderDetail: View {
    @Bindable var folder: Folder
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        List {
            ForEach(folder.pages) { page in
                Text(page.title)
            }
        }
        .toolbar {
            Button("添加页面", systemImage: "plus") {
                let page = Page(title: "第 \(folder.pages.count + 1) 页", folder: folder)
                modelContext.insert(page)
            }
        }
    }
}
```

### 属性的细节控制

```swift
@Model
class Member {
    @Attribute(.unique) var email: String              // 唯一约束：相同 email 再插入会更新而不是新增
    var name: String

    @Attribute(.externalStorage) var avatar: Data?     // 大数据存到数据库之外的文件里

    @Transient var isSelected = false                  // 不持久化，只存在于内存

    init(email: String, name: String) {
        self.email = email
        self.name = name
    }
}
```

### 在预览里使用 SwiftData

预览需要一个容器。用**内存数据库**，避免污染真实数据，每次预览都是干净的：

```swift
#Preview("笔记列表") {
    let config = ModelConfiguration(isStoredInMemoryOnly: true)
    let container = try! ModelContainer(for: Note.self, configurations: config)
    container.mainContext.insert(Note(title: "示例笔记一", isPinned: true))
    container.mainContext.insert(Note(title: "示例笔记二"))

    return NoteListView()
        .modelContainer(container)
}
```

### 在后台处理大量数据

`modelContext`（主上下文）隔离在主 actor 上。导入几万条数据这种操作应该放到后台。SwiftData 提供了 `@ModelActor` 宏来创建一个拥有独立上下文的 actor：

```swift
@ModelActor
actor NoteImporter {
    func importNotes(titles: [String]) throws {
        for title in titles {
            modelContext.insert(Note(title: title))
        }
        try modelContext.save()
    }
}

struct ImportButton: View {
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        Button("导入 1000 条") {
            let container = modelContext.container
            Task {
                let importer = NoteImporter(modelContainer: container)
                try? await importer.importNotes(titles: (1...1000).map { "导入的笔记 \($0)" })
            }
        }
    }
}
```

要点：`ModelContainer` 是 `Sendable` 的，可以跨 actor 传递；`ModelContext` 和模型对象**不是**，不能传。后台保存之后，主线程上的 `@Query` 会自动收到变化并刷新。

### 模型结构变了怎么办

应用发布之后再给模型加属性、改名，就涉及**迁移**。

- **简单的变化自动处理。** 增加一个有默认值的属性、增加一个可选属性、删除属性，SwiftData 会自动做轻量迁移。
- **改名**用 `@Attribute(originalName: "旧名字")` 告诉它对应关系。
- **复杂的变化**（拆分属性、改变类型、数据需要转换）要用 `VersionedSchema` 和 `SchemaMigrationPlan` 明确定义每个版本和迁移步骤。

开发阶段模型频繁变动时，最省事的做法是直接删掉应用重装。上线前要认真对待迁移，章末的官方文档有完整说明。

### 同步到 iCloud

给 target 添加 iCloud（CloudKit）能力后，SwiftData 可以自动把数据同步到用户的 iCloud 账户，在用户的 iPhone、iPad、Mac 之间保持一致。这对多端应用很有吸引力，但 CloudKit 对模型有额外要求：所有属性必须有默认值或是可选的，不能用唯一约束，关系必须是可选的。打算做同步的话，从一开始就按这些要求设计模型。

## 用文件保存 Codable 数据

有些数据不需要数据库：一份配置、一个小型的应用状态。把它编码成 JSON 写进文件就够了：

```swift
nonisolated struct AppConfig: Codable, Sendable {
    var recentSearches: [String] = []
    var lastOpened: Date?
}

nonisolated enum ConfigStore {
    private static var fileURL: URL {
        URL.applicationSupportDirectory.appending(path: "config.json")
    }

    static func load() -> AppConfig {
        guard let data = try? Data(contentsOf: fileURL),
              let config = try? JSONDecoder().decode(AppConfig.self, from: data)
        else { return AppConfig() }
        return config
    }

    static func save(_ config: AppConfig) throws {
        try FileManager.default.createDirectory(
            at: URL.applicationSupportDirectory, withIntermediateDirectories: true
        )
        let data = try JSONEncoder().encode(config)
        try data.write(to: fileURL, options: .atomic)
    }
}
```

常用的目录：

| 目录 | 用途 |
| --- | --- |
| `URL.applicationSupportDirectory` | 应用自己的数据文件，用户看不到，会被备份 |
| `URL.documentsDirectory` | 用户的文档。iOS 上可以在“文件”App 里显示 |
| `URL.cachesDirectory` | 可以重新生成的缓存，系统可能清理 |
| `URL.temporaryDirectory` | 临时文件 |

如果应用本身就是围绕“文档”工作的（文本编辑器、绘图工具），应该用 `DocumentGroup` 场景，由系统处理打开、保存、自动保存和版本。第 32 章会介绍，包括 27 系列新增的基于 URL 的文档协议。

## 常见误区

**误区一：“业务数据存进 `@AppStorage`，把数组编码成 JSON 字符串存进去。”** `UserDefaults` 不是数据库。这样做每次修改都要整体重新编码，没有查询能力，数据量一大启动就变慢。用 SwiftData 或文件。

**误区二：“`@Query` 的结果要自己刷新。”** 不需要。上下文里的任何变化都会自动反映到 `@Query` 的结果上。

**误区三：“把 `@Model` 对象传到后台线程处理。”** 模型对象和上下文都不是 `Sendable` 的。跨线程传递的是 `ModelContainer` 或对象的 `persistentModelID`，在目标线程用自己的上下文重新取对象。

**误区四：“`@Model` 类还要加 `@Observable`。”** `@Model` 已经包含了可观察的能力。

**误区五：“把密码存在 `@AppStorage` 里。”** 敏感信息要用钥匙串。

## 小结

- `@AppStorage` 存少量用户偏好，全应用共享；`@SceneStorage` 存每个窗口的界面状态，用于状态恢复。
- SwiftData 用 `@Model` 定义模型，`.modelContainer` 配置容器，`modelContext` 增删，`@Query` 查询并自动更新。
- `@Model` 类自带可观察能力，用 `@Bindable` 直接编辑，默认自动保存。
- `#Predicate` 写筛选条件；动态条件通过在子视图 `init` 里构造 `Query` 实现。
- `@Relationship` 建立模型间的关系并指定删除规则。
- 预览用内存容器；大批量操作用 `@ModelActor` 放到后台。
- 小型配置可以直接用 `Codable` 写文件。

## 练习

1. 做一个设置页面，用 `@AppStorage` 保存：昵称、主题色（枚举）、是否显示完成的任务。重启应用后确认设置还在。
2. 用 SwiftData 做一个记账本：`Expense` 模型包含金额、类别、日期、备注。列表按日期倒序显示，支持添加、删除，顶部显示本月总支出（提示：总支出是派生值）。
3. 给记账本加上类别筛选：顶部一个 `Picker` 选择类别，下面的列表只显示该类别。用“子视图 `init` 里构造 `Query`”的方式实现。
4. 加一个 `Category` 模型，和 `Expense` 建立一对多关系。删除类别时，属于它的支出应该怎么处理？分别试试 `.cascade` 和 `.nullify`。

## 官方文档

- [`AppStorage`](https://developer.apple.com/documentation/swiftui/appstorage)
- [`SceneStorage`](https://developer.apple.com/documentation/swiftui/scenestorage)
- [Restoring your app's state with SwiftUI](https://developer.apple.com/documentation/swiftui/restoring-your-app-s-state-with-swiftui)
- [SwiftData 框架](https://developer.apple.com/documentation/swiftdata)
- [`Model()` 宏](https://developer.apple.com/documentation/swiftdata/model())
- [`Query`](https://developer.apple.com/documentation/swiftdata/query)
- [`ModelContainer`](https://developer.apple.com/documentation/swiftdata/modelcontainer)
- [`ModelContext`](https://developer.apple.com/documentation/swiftdata/modelcontext)
- [Preserving your app's model data across launches](https://developer.apple.com/documentation/swiftdata/preserving-your-apps-model-data-across-launches)
- [Filtering and sorting persistent data](https://developer.apple.com/documentation/swiftdata/filtering-and-sorting-persistent-data)
- [Defining data relationships with enumerations and model classes](https://developer.apple.com/documentation/swiftdata/defining-data-relationships-with-enumerations-and-model-classes)
- [`Predicate`](https://developer.apple.com/documentation/foundation/predicate)
- [`ModelActor`](https://developer.apple.com/documentation/swiftdata/modelactor)
- [WWDC23：Meet SwiftData](https://developer.apple.com/videos/play/wwdc2023/10187/)
- [WWDC23：Build an app with SwiftData](https://developer.apple.com/videos/play/wwdc2023/10154/)
