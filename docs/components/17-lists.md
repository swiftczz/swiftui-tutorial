# 17 列表与集合

## 本章目标

- 掌握 `List` 的静态、动态与分组用法
- 实现选择、删除、移动、滑动操作、下拉刷新
- 定制行的外观：分隔线、背景、内边距
- 用 `DisclosureGroup`、`OutlineGroup` 展示层级数据
- 用 `Table` 展示多列数据（macOS 与 iPad）
- 了解 27 系列新增的通用拖拽排序与滑动操作
- 知道 `List` 的样式在各平台上的差异

## List 与 LazyVStack 的区别

第 7 章用 `ScrollView` + `LazyVStack` 做过可滚动的列表。`List` 也是懒加载的可滚动容器，区别在于它是一个**有主见的**高级组件，自带一整套平台惯例：

| | `List` | `ScrollView` + `LazyVStack` |
| --- | --- | --- |
| 行的外观 | 系统风格：分隔线、内边距、选中高亮 | 完全由你决定 |
| 选择、编辑、滑动操作、拖拽排序 | 内置 | 需要自己实现（27 系列起有通用 API） |
| 分组样式 | 多种系统样式 | 自己画 |
| 行复用与性能 | 底层复用单元格，超长列表表现更好 | 创建过的视图会保留 |
| 自由度 | 较低 | 很高 |

需要“系统设置”“邮件”那种标准列表体验时用 `List`。需要完全自定义的卡片流、瀑布流时用 `LazyVStack` / `LazyVGrid`。

## List 基础

### 三种写法

```swift
struct Contact: Identifiable, Hashable {
    let id = UUID()
    var name: String
    var isFavorite = false
}

struct ListBasics: View {
    let contacts = [
        Contact(name: "陈一", isFavorite: true),
        Contact(name: "林二"),
        Contact(name: "王三"),
    ]

    var body: some View {
        List {
            // 静态行
            Text("静态的第一行")
            Label("静态的第二行", systemImage: "star")

            // 动态行
            ForEach(contacts) { contact in
                Text(contact.name)
            }

            // 可以混合
            Text("共 \(contacts.count) 位联系人")
                .foregroundStyle(.secondary)
        }
    }
}
```

只有动态数据时可以简写成 `List(contacts) { contact in ... }`。

`List` 里的每个**顶层视图**是一行。一行里放多个视图，要用 `HStack` 之类的容器包起来。

### 分组

```swift
struct SectionedList: View {
    let favorites = ["陈一", "周五"]
    let others = ["林二", "王三", "赵四"]

    var body: some View {
        List {
            Section("收藏") {
                ForEach(favorites, id: \.self) { Text($0) }
            }

            Section {
                ForEach(others, id: \.self) { Text($0) }
            } header: {
                Text("其他联系人")
            } footer: {
                Text("共 \(others.count) 位")
            }

            Section("可折叠的分组", isExpanded: .constant(true)) {
                Text("内容")
            }
        }
    }
}
```

### 列表样式

```swift
struct ListStyleDemo: View {
    var body: some View {
        List {
            Section("第一组") { Text("甲"); Text("乙") }
            Section("第二组") { Text("丙"); Text("丁") }
        }
        .listStyle(.inset)
    }
}
```

| 样式 | 外观 | 平台 |
| --- | --- | --- |
| `.automatic` | 平台默认 | 全平台 |
| `.plain` | 通栏的行，分组头吸顶 | 全平台 |
| `.inset` | 行左右缩进 | iOS、macOS |
| `.grouped` | 分组之间有间隔，灰色背景 | iOS |
| `.insetGrouped` | 圆角卡片式分组。iOS 设置 App 的样子 | iOS |
| `.sidebar` | 侧边栏样式，分组可折叠 | iOS、macOS |
| `.bordered` | 带边框，可选交替行背景 | macOS |

`.automatic` 的实际效果取决于上下文：iOS 上普通页面里是 `.insetGrouped`，`NavigationSplitView` 的侧边栏里是 `.sidebar`；macOS 上普通内容区是 `.inset`，侧边栏里是 `.sidebar`。大多数时候保持默认就是对的。

## 选择

`List` 的 `selection` 参数绑定选中项的 **id**：

```swift
struct SelectionDemo: View {
    let contacts = (1...8).map { Contact(name: "联系人 \($0)") }

    @State private var single: Contact.ID?
    @State private var multiple = Set<Contact.ID>()

    var body: some View {
        VStack {
            List(contacts, selection: $single) { contact in
                Text(contact.name)
            }
            Text(single == nil ? "未选择" : "选中了一项")

            List(contacts, selection: $multiple) { contact in
                Text(contact.name)
            }
            Text("选中了 \(multiple.count) 项")
        }
    }
}
```

- 绑定 `ID?`（可选值）是**单选**。
- 绑定 `Set<ID>`（集合）是**多选**。

平台行为不同：

- **macOS**：直接点击选中，<kbd>⌘</kbd> 点击加选，<kbd>⇧</kbd> 点击范围选择，方向键移动。
- **iOS**：单选可以直接点。多选需要进入**编辑模式**，这时每行左边出现选择圆圈。

### 编辑模式（iOS）

```swift ios
struct EditModeDemo: View {
    @State private var items = (1...6).map { "条目 \($0)" }
    @State private var selection = Set<String>()

    var body: some View {
        NavigationStack {
            List(items, id: \.self, selection: $selection) { item in
                Text(item)
            }
            .navigationTitle("已选 \(selection.count) 项")
            .toolbar {
                EditButton()
            }
        }
    }
}
```

`EditButton` 是系统提供的“编辑 / 完成”切换按钮，它修改环境里的 `editMode`。你也可以用 `@Environment(\.editMode)` 自己读写。编辑模式是 iOS 的概念，macOS 上没有。

## 删除与移动

```swift
struct EditableList: View {
    @State private var fruits = ["苹果", "香蕉", "樱桃", "榴莲", "火龙果"]

    var body: some View {
        NavigationStack {
            List {
                ForEach(fruits, id: \.self) { fruit in
                    Text(fruit)
                }
                .onDelete { offsets in
                    fruits.remove(atOffsets: offsets)
                }
                .onMove { source, destination in
                    fruits.move(fromOffsets: source, toOffset: destination)
                }
            }
            .navigationTitle("水果")
            #if os(iOS)
            .toolbar { EditButton() }
            #endif
        }
    }
}
```

`.onDelete` 和 `.onMove` 是 **`ForEach`** 的修饰符，不是 `List` 的。它们给出的是下标集合，配合 `Array` 的 `remove(atOffsets:)` 和 `move(fromOffsets:toOffset:)` 使用。

- `.onDelete`：iOS 上左滑出现“删除”，编辑模式下出现红色删除圆圈；macOS 上选中后按 <kbd>Delete</kbd> 键。
- `.onMove`：iOS 上长按拖动，或编辑模式下拖右侧的把手；macOS 上直接拖动。

把 `Binding` 交给 `List`，可以让它自动处理删除和移动：

```swift
struct AutoEditableList: View {
    @State private var fruits = ["苹果", "香蕉", "樱桃"]

    var body: some View {
        List($fruits, id: \.self, editActions: [.delete, .move]) { $fruit in
            TextField("名称", text: $fruit)
        }
    }
}
```

## 滑动操作

`.swipeActions` 自定义左滑、右滑出现的按钮：

```swift
struct Mail: Identifiable {
    let id = UUID()
    var subject: String
    var isRead = false
    var isFlagged = false
}

struct SwipeActionsDemo: View {
    @State private var mails = [
        Mail(subject: "本周例会纪要"),
        Mail(subject: "你的订单已发货", isRead: true),
        Mail(subject: "账单提醒"),
    ]

    var body: some View {
        List {
            ForEach($mails) { $mail in
                HStack {
                    Circle()
                        .fill(mail.isRead ? .clear : .blue)
                        .frame(width: 8, height: 8)
                    Text(mail.subject)
                    Spacer()
                    if mail.isFlagged {
                        Image(systemName: "flag.fill").foregroundStyle(.orange)
                    }
                }
                .swipeActions(edge: .trailing) {
                    Button("删除", systemImage: "trash", role: .destructive) {
                        mails.removeAll { $0.id == mail.id }
                    }
                    Button("旗标", systemImage: "flag") {
                        mail.isFlagged.toggle()
                    }
                    .tint(.orange)
                }
                .swipeActions(edge: .leading, allowsFullSwipe: true) {
                    Button(mail.isRead ? "未读" : "已读", systemImage: mail.isRead ? "envelope.badge" : "envelope.open") {
                        mail.isRead.toggle()
                    }
                    .tint(.blue)
                }
            }
        }
    }
}
```

- `edge:` 指定从哪边滑出。同一行可以两边各定义一组。
- 第一个按钮是“完全滑动”时触发的操作。`allowsFullSwipe: false` 禁用完全滑动。
- 自定义了 `.swipeActions(edge: .trailing)` 后，`.onDelete` 提供的默认删除按钮就不再出现，需要自己加。

### 在 List 之外使用滑动操作 <Badge type="tip" text="iOS 27+ / macOS 27+" />

以前 `swipeActions` 只在 `List` 里有效。27 系列把它推广到了任意容器：给容器加上 `.swipeActionsContainer()`，里面的视图就可以用 `swipeActions`。

```swift
@available(iOS 27, macOS 27, *)
struct SwipeInScrollView: View {
    @State private var cards = (1...6).map { "卡片 \($0)" }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                ForEach(cards, id: \.self) { card in
                    Text(card)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(.background.secondary, in: .rect(cornerRadius: 12))
                        .swipeActions {
                            Button("删除", systemImage: "trash", role: .destructive) {
                                cards.removeAll { $0 == card }
                            }
                        }
                }
            }
            .padding()
        }
        .swipeActionsContainer()
    }
}
```

这让自定义卡片流也能有和系统列表一致的滑动体验。

## 拖拽排序：reorderable <Badge type="tip" text="iOS 27+ / macOS 27+" />

`.onMove` 只能用在 `List` 里。27 系列新增了通用的排序 API，可以用在 `List`、栈、网格和自定义布局里，写法统一：

```swift
struct Landmark: Identifiable, Hashable {
    let id = UUID()
    var name: String
}

@available(iOS 27, macOS 27, *)
struct ReorderableGrid: View {
    @State private var landmarks = ["长城", "西湖", "黄山", "漓江", "故宫", "兵马俑"].map { Landmark(name: $0) }

    var body: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 12) {
                ForEach(landmarks) { landmark in
                    Text(landmark.name)
                        .frame(maxWidth: .infinity, minHeight: 60)
                        .background(.teal.opacity(0.2), in: .rect(cornerRadius: 10))
                }
                .reorderable()
            }
            .padding()
        }
        .reorderContainer(for: Landmark.self) { difference in
            apply(difference)
        }
    }

    private func apply(_ difference: ReorderDifference<Landmark.ID, ReorderableSingleCollectionIdentifier>) {
        let moving = difference.sources.compactMap { id in landmarks.first { $0.id == id } }
        landmarks.removeAll { difference.sources.contains($0.id) }

        switch difference.destination.position {
        case .before(let targetID):
            let index = landmarks.firstIndex { $0.id == targetID } ?? landmarks.endIndex
            landmarks.insert(contentsOf: moving, at: index)
        case .end:
            landmarks.append(contentsOf: moving)
        @unknown default:
            landmarks.append(contentsOf: moving)
        }
    }
}
```

两个部分配合：

- `.reorderable()` 加在 `ForEach` 上，声明“这些视图可以被拖动排序”。
- `.reorderContainer(for:move:)` 加在容器上，声明排序发生的范围，并在用户放下时收到一个 `ReorderDifference`。

`ReorderDifference` 描述了这次移动：`sources` 是被移动项的 id（按用户选择的顺序），`destination.position` 是目的地，要么是“某一项之前”（`.before(id)`），要么是“末尾”（`.end`）。你负责把这个变化应用到数据上。

用 id 而不是下标来描述移动，是因为 id 是稳定的（第 3 章），在有筛选、分组的情况下也不会错位。需要在多个集合之间拖动时（比如看板的多个列），用带 `in:` 参数的重载并为每个集合指定标识。

## 下拉刷新与空状态

```swift
struct RefreshAndEmpty: View {
    @State private var items: [String] = []

    var body: some View {
        List(items, id: \.self) { Text($0) }
            .refreshable {
                try? await Task.sleep(for: .seconds(1))
                items = (1...5).map { "刷新得到的条目 \($0)" }
            }
            .overlay {
                if items.isEmpty {
                    ContentUnavailableView {
                        Label("没有内容", systemImage: "tray")
                    } description: {
                        Text("下拉刷新试试")
                    } actions: {
                        Button("加载示例") {
                            items = ["示例一", "示例二"]
                        }
                    }
                }
            }
    }
}
```

`ContentUnavailableView` 是系统提供的空状态视图，样式与系统 App 一致。搜索无结果有专门的预设：`ContentUnavailableView.search(text: query)`。

## 定制行的外观

```swift
struct RowCustomization: View {
    var body: some View {
        List {
            Text("默认的行")

            Text("隐藏分隔线")
                .listRowSeparator(.hidden)

            Text("彩色分隔线")
                .listRowSeparatorTint(.red)

            Text("自定义背景")
                .listRowBackground(Color.yellow.opacity(0.3))

            Text("自定义内边距")
                .listRowInsets(EdgeInsets(top: 20, leading: 40, bottom: 20, trailing: 0))

            Text("带角标")
                .badge(12)

            Text("带文字角标")
                .badge("新")
        }
        .listRowSpacing(6)
        .scrollContentBackground(.hidden)
        .background(.blue.opacity(0.08))
    }
}
```

| 修饰符 | 作用 | 加在哪 |
| --- | --- | --- |
| `.listRowSeparator(_:)` | 显示/隐藏分隔线 | 行 |
| `.listRowSeparatorTint(_:)` | 分隔线颜色 | 行 |
| `.listRowBackground(_:)` | 行背景 | 行 |
| `.listRowInsets(_:)` | 行内边距 | 行 |
| `.badge(_:)` | 行尾角标 | 行 |
| `.listRowSpacing(_:)` | 行间距 | `List` |
| `.listSectionSpacing(_:)` | 分组间距（iOS） | `List` |
| `.scrollContentBackground(.hidden)` | 隐藏列表默认背景 | `List` |
| `.alternatingRowBackgrounds()` | 交替行背景（macOS） | `List` |

行的修饰符要加在**行的最外层视图**上。

### 让整行可点击

行里放 `Button` 或 `NavigationLink`，整行都会响应点击并带有系统的高亮效果：

```swift
struct TappableRows: View {
    @State private var last = ""

    var body: some View {
        List {
            Button {
                last = "按钮行"
            } label: {
                HStack {
                    Text("点击整行")
                    Spacer()
                    Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                }
                .contentShape(.rect)
            }
            .buttonStyle(.plain)

            Text("最后点击：\(last)")
        }
    }
}
```

`.contentShape(.rect)` 让 `Spacer` 所在的空白区域也能响应点击。

## 层级数据

### DisclosureGroup：可展开的分组

```swift
struct DisclosureDemo: View {
    @State private var isExpanded = true

    var body: some View {
        List {
            DisclosureGroup("高级设置", isExpanded: $isExpanded) {
                Toggle("开发者模式", isOn: .constant(false))
                Toggle("详细日志", isOn: .constant(true))

                DisclosureGroup("网络") {
                    Text("代理")
                    Text("DNS")
                }
            }

            DisclosureGroup {
                Text("版本 1.0")
            } label: {
                Label("关于", systemImage: "info.circle")
            }
        }
    }
}
```

`DisclosureGroup` 可以用在任何地方，不限于 `List`。

### 树形列表

数据本身是树形结构时，`List` 可以直接展示：

```swift
struct FileNode: Identifiable {
    let id = UUID()
    var name: String
    var children: [FileNode]? = nil

    var icon: String { children == nil ? "doc" : "folder" }
}

struct OutlineDemo: View {
    let root = [
        FileNode(name: "文档", children: [
            FileNode(name: "简历.pdf"),
            FileNode(name: "项目", children: [
                FileNode(name: "方案.key"),
                FileNode(name: "预算.numbers"),
            ]),
        ]),
        FileNode(name: "下载", children: []),
        FileNode(name: "备忘.txt"),
    ]

    var body: some View {
        List(root, children: \.children) { node in
            Label(node.name, systemImage: node.icon)
        }
    }
}
```

`children:` 是一个指向子节点数组的键路径。子节点为 `nil` 表示叶子节点（不可展开），空数组表示可展开但没有内容。

需要更多控制时用 `OutlineGroup`，它可以放在 `List` 的某个 `Section` 里。

## Table：多列表格

`Table` 用于展示多列数据，支持列排序、列宽调整、多选。它主要是为 **macOS** 和 **iPad** 设计的。

```swift
nonisolated struct Employee: Identifiable, Sendable {
    let id = UUID()
    var name: String
    var department: String
    var salary: Int
}

struct TableDemo: View {
    @State private var employees = [
        Employee(name: "陈一", department: "研发", salary: 32000),
        Employee(name: "林二", department: "设计", salary: 28000),
        Employee(name: "王三", department: "研发", salary: 41000),
        Employee(name: "赵四", department: "市场", salary: 25000),
    ]
    @State private var sortOrder = [KeyPathComparator(\Employee.name)]
    @State private var selection = Set<Employee.ID>()

    var body: some View {
        Table(employees, selection: $selection, sortOrder: $sortOrder) {
            TableColumn("姓名", value: \.name)

            TableColumn("部门", value: \.department)
                .width(min: 60, ideal: 80)

            TableColumn("薪资", value: \.salary) { employee in
                Text(employee.salary, format: .currency(code: "CNY").precision(.fractionLength(0)))
                    .monospacedDigit()
            }
            .alignment(.trailing)
        }
        .onChange(of: sortOrder) { _, newOrder in
            employees.sort(using: newOrder)
        }
        .contextMenu(forSelectionType: Employee.ID.self) { ids in
            Button("删除 \(ids.count) 项", role: .destructive) {
                employees.removeAll { ids.contains($0.id) }
            }
        } primaryAction: { ids in
            print("双击了 \(ids.count) 项")
        }
    }
}
```

要点：

- `TableColumn("标题", value: \.keyPath)` 最简形式：直接显示该属性，并且这一列自动可排序。
- 带闭包的形式可以自定义单元格内容。
- `sortOrder` 绑定当前的排序规则。点击列头时它会变化，你在 `onChange` 里对数据重新排序。
- `contextMenu(forSelectionType:)` 提供右键菜单，`primaryAction` 是双击（macOS）或点按（iOS）的动作。

::: warning 为什么 Employee 要写成 nonisolated … Sendable
`KeyPathComparator(\Employee.name)` 要求键路径是 `Sendable` 的。在默认主 actor 隔离的项目里，`Employee` 默认隔离在主 actor 上，指向它属性的键路径就不是 `Sendable`，编译器会报 *type 'KeyPath<Employee, String>' does not conform to the 'Sendable' protocol*。

`Employee` 只是一份纯数据，和界面无关。把它声明为 `nonisolated` 并遵循 `Sendable`，问题就消失了。**纯数据的模型结构体都建议这样声明**，第 12 章讲过原因。
:::

::: warning Table 在紧凑宽度下的表现
在 iPhone 上，以及 iPad 的窄分屏下，`Table` **只显示第一列**，不显示列头。所以多平台应用里要让第一列在窄屏下承载足够的信息，常见做法是在第一列的闭包里根据 `horizontalSizeClass` 显示一个包含多项信息的紧凑布局。
:::

## 索引与大数据量

长列表的两个辅助功能：

```swift
struct IndexedList: View {
    let groups: [(letter: String, names: [String])] = [
        ("A", ["安然", "艾米"]), ("B", ["白露", "毕方"]), ("C", ["陈一", "楚天"]),
    ]

    var body: some View {
        List {
            ForEach(groups, id: \.letter) { group in
                Section(group.letter) {
                    ForEach(group.names, id: \.self) { Text($0) }
                }
                .sectionIndexLabelIfAvailable(group.letter)
            }
        }
    }
}

extension View {
    @ViewBuilder
    func sectionIndexLabelIfAvailable(_ label: String) -> some View {
        if #available(iOS 26, macOS 26, *) {
            self.sectionIndexLabel(label)
        } else {
            self
        }
    }
}
```

`.sectionIndexLabel` <Badge type="tip" text="iOS 26+" /> 给分组指定索引标签，iOS 上列表右侧会出现可以快速跳转的字母索引条。

关于性能，记住几点：

- `List` 是懒加载的，但它需要知道所有行的 **id** 才能计算布局。所以 id 的获取要快，`ForEach` 的数据不要在 `body` 里做昂贵的转换。
- 行视图保持轻量。把复杂的行拆成独立的 `View` 结构体，利用第 10 章讲的精确更新。
- 第 35 章会进一步讨论列表性能。

## 常见误区

**误区一：“`.onDelete` 加在 `List` 上。”** 它是 `ForEach` 的修饰符。`List(data) { }` 的简写形式用不了它，需要改成 `List { ForEach(data) { }.onDelete { } }`。

**误区二：“`selection` 绑定元素本身。”** 绑定的是元素的 **id** 类型（`ID?` 或 `Set<ID>`）。

**误区三：“iOS 上多选没反应。”** 多选需要进入编辑模式。加一个 `EditButton()`。

**误区四：“`listRowBackground` 加在了行里面的某个子视图上。”** 行级修饰符必须加在行的最外层。

**误区五：“在 `List` 里再套一个垂直 `ScrollView`。”** `List` 自己就是滚动容器。嵌套同方向的滚动视图会导致手势冲突和高度计算问题。

**误区六：“iPhone 上用 `Table` 展示多列。”** 窄屏只显示第一列。iPhone 上用 `List` 加自定义行。

## 小结

- `List` 是带平台惯例的懒加载列表：系统行样式、选择、编辑、滑动操作都内置。
- `selection` 绑定 id：可选值为单选，集合为多选；iOS 多选需要编辑模式。
- `onDelete`、`onMove` 加在 `ForEach` 上；`swipeActions` 自定义滑动按钮；`refreshable` 提供下拉刷新。
- 27 系列的 `reorderable` + `reorderContainer` 和 `swipeActionsContainer` 让任意容器都能排序和滑动操作。
- `listRow…` 系列修饰符定制行的外观；`ContentUnavailableView` 显示空状态。
- `DisclosureGroup` 与 `List(children:)` 展示层级数据；`Table` 展示多列数据，窄屏下只显示第一列。

## 练习

1. 做一个待办清单：可以添加、勾选完成（完成的显示删除线并变灰）、左滑删除、右滑标记重要、拖动排序。未完成和已完成分成两个 `Section`。
2. 给上面的清单加空状态：没有任何待办时显示 `ContentUnavailableView`，带一个“添加第一条”的按钮。
3. 做一个文件浏览器：用树形 `List` 展示嵌套的文件夹结构，文件夹和文件用不同图标，支持单选，选中项的名字显示在列表下方。
4. （macOS 或 iPad）用 `Table` 展示一组商品（名称、类别、价格、库存），支持按任意列排序和多选删除。然后在 iPhone 预览里查看，改造第一列让它在窄屏下也能显示价格。

## 官方文档

- [`List`](https://developer.apple.com/documentation/swiftui/list)
- [Lists（专题总览）](https://developer.apple.com/documentation/swiftui/lists)
- [`ListStyle`](https://developer.apple.com/documentation/swiftui/liststyle)
- [Displaying data in lists](https://developer.apple.com/documentation/swiftui/displaying-data-in-lists)
- [`swipeActions(edge:allowsFullSwipe:content:)`](https://developer.apple.com/documentation/swiftui/view/swipeactions(edge:allowsfullswipe:content:))
- [`swipeActionsContainer()`](https://developer.apple.com/documentation/swiftui/view/swipeactionscontainer())
- [`reorderContainer(for:isEnabled:move:)`](https://developer.apple.com/documentation/swiftui/view/reordercontainer(for:isenabled:move:))
- [`ReorderDifference`](https://developer.apple.com/documentation/swiftui/reorderdifference)
- [`EditButton`](https://developer.apple.com/documentation/swiftui/editbutton)
- [`ContentUnavailableView`](https://developer.apple.com/documentation/swiftui/contentunavailableview)
- [`DisclosureGroup`](https://developer.apple.com/documentation/swiftui/disclosuregroup)
- [`OutlineGroup`](https://developer.apple.com/documentation/swiftui/outlinegroup)
- [`Table`](https://developer.apple.com/documentation/swiftui/table)
- [Tables（专题总览）](https://developer.apple.com/documentation/swiftui/tables)
- [`TableColumn`](https://developer.apple.com/documentation/swiftui/tablecolumn)
- [Human Interface Guidelines：Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
