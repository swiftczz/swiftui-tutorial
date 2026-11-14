# 21 工具栏与搜索

## 本章目标

- 用 `toolbar` 在导航栏、底部栏、窗口工具栏里放置操作
- 理解“语义位置”（placement）以及它在各平台上的映射
- 掌握 26 系列的工具栏分组与 27 系列的溢出菜单、可见性优先级
- 用 `searchable` 添加搜索，包括搜索建议、搜索范围、搜索令牌
- 知道工具栏和搜索在 iOS 与 macOS 上的差异

## toolbar：声明这个页面有哪些操作

和 `navigationTitle` 一样，`.toolbar` 加在**页面内容**上，声明“这个页面需要这些操作”，由上层的导航容器负责把它们显示出来：

```swift
struct ToolbarBasics: View {
    @State private var count = 0

    var body: some View {
        NavigationStack {
            Text("点了 \(count) 次")
                .navigationTitle("工具栏")
                .toolbar {
                    Button("添加", systemImage: "plus") { count += 1 }
                }
        }
    }
}
```

不指定位置时，系统把它放到当前平台的默认位置：iOS 上是导航栏右侧，macOS 上是窗口工具栏。

留意按钮用了带 `systemImage` 的形式（等价于 `Label`）。工具栏里默认只显示图标，标题用于辅助功能朗读和 macOS 的悬停提示。**工具栏按钮一律提供标题和图标。**

## 语义位置

用 `ToolbarItem(placement:)` 指定位置。SwiftUI 的位置大多是**语义化**的：你说明这个按钮是什么性质，系统决定它在当前平台上该放哪。

```swift
struct SemanticPlacements: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                TextField("标题", text: .constant(""))
            }
            .navigationTitle("新建")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button("附件", systemImage: "paperclip") {}
                }
            }
        }
    }
}
```

| 位置 | 含义 | iOS | macOS |
| --- | --- | --- | --- |
| `.automatic` | 系统决定 | 导航栏尾部 | 工具栏 |
| `.primaryAction` | 页面的主要操作 | 导航栏尾部 | 工具栏尾部 |
| `.secondaryAction` | 次要操作 | 收进“更多”菜单 | 工具栏中部，可自定义 |
| `.confirmationAction` | 确认（保存、完成） | 导航栏尾部，加粗 | sheet 的右下角 |
| `.cancellationAction` | 取消 | 导航栏头部 | sheet 的右下角，确认按钮左边 |
| `.destructiveAction` | 破坏性操作 | 导航栏尾部 | sheet 的左下角 |
| `.navigation` | 导航相关 | 导航栏头部 | 工具栏头部 |
| `.principal` | 中央的主要内容 | 标题位置 | 工具栏中央 |
| `.status` | 状态信息 | 底部栏中央 | 工具栏中央 |

语义位置的价值在 sheet 里特别明显。同样是“取消”和“保存”，iOS 把它们放在导航栏的左右两端，macOS 把它们放在 sheet 底部的右下角，顺序也符合各自平台的规范。你只写一份代码。

也有明确指定物理位置的选项，用于语义位置不够用的时候：

| 位置 | 说明 | 平台 |
| --- | --- | --- |
| `.topBarLeading`、`.topBarTrailing` | 导航栏的头部、尾部 | iOS |
| `.bottomBar` | 底部工具栏 | iOS |
| `.keyboard` | 键盘上方（第 16 章） | iOS |
| `.topBarPinnedTrailing` <Badge type="tip" text="iOS 27+" /> | 固定在顶栏尾部，不会被挤进溢出菜单 | iOS |

### 多个按钮与分组

```swift
struct ToolbarGroups: View {
    var body: some View {
        NavigationStack {
            Text("内容")
                .navigationTitle("文档")
                .toolbar {
                    ToolbarItemGroup(placement: .primaryAction) {
                        Button("分享", systemImage: "square.and.arrow.up") {}
                        Button("收藏", systemImage: "star") {}
                    }

                    ToolbarItem(placement: .secondaryAction) {
                        Button("复制", systemImage: "doc.on.doc") {}
                    }
                    ToolbarItem(placement: .secondaryAction) {
                        Button("移动到…", systemImage: "folder") {}
                    }
                }
        }
    }
}
```

`ToolbarItemGroup` 把几个视图放在同一个位置。`.secondaryAction` 的项目在 iOS 上被收进一个“更多”（⋯）菜单，在 macOS 上显示在工具栏里。

### 底部栏（iOS）

```swift ios
struct BottomBarDemo: View {
    @State private var selectedCount = 3

    var body: some View {
        NavigationStack {
            List(0..<10, id: \.self) { Text("邮件 \($0)") }
                .navigationTitle("收件箱")
                .toolbar {
                    ToolbarItem(placement: .bottomBar) {
                        Button("筛选", systemImage: "line.3.horizontal.decrease.circle") {}
                    }
                    ToolbarItem(placement: .status) {
                        Text("已选 \(selectedCount) 封").font(.caption)
                    }
                    ToolbarItem(placement: .bottomBar) {
                        Button("写邮件", systemImage: "square.and.pencil") {}
                    }
                }
        }
    }
}
```

### 标题位置放自定义内容

```swift
struct PrincipalDemo: View {
    @State private var mode = 0

    var body: some View {
        NavigationStack {
            Text(mode == 0 ? "列表视图" : "网格视图")
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        Picker("视图", selection: $mode) {
                            Text("列表").tag(0)
                            Text("网格").tag(1)
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 160)
                    }
                }
                #if os(iOS)
                .navigationBarTitleDisplayMode(.inline)
                #endif
        }
    }
}
```

## 26 系列：Liquid Glass 工具栏 <Badge type="tip" text="iOS 26+ / macOS 26+" />

从 26 系列开始，工具栏项目显示在浮动的玻璃材质上。相邻的项目自动共享同一块玻璃背景，形成视觉上的分组。几个相关的新工具：

### ToolbarSpacer：控制分组

```swift
@available(iOS 26, macOS 26, *)
struct ToolbarSpacerDemo: View {
    var body: some View {
        NavigationStack {
            Text("内容")
                .navigationTitle("照片")
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Button("收藏", systemImage: "heart") {}
                    }
                    ToolbarItem(placement: .primaryAction) {
                        Button("信息", systemImage: "info.circle") {}
                    }

                    ToolbarSpacer(.fixed, placement: .primaryAction)     // 断开：前后分成两组

                    ToolbarItem(placement: .primaryAction) {
                        Button("分享", systemImage: "square.and.arrow.up") {}
                    }
                }
        }
    }
}
```

`ToolbarSpacer(.fixed)` 插入一个固定的间隔，把前后的项目分到两块玻璃上。`ToolbarSpacer(.flexible)` 则是弹性间隔，把项目推到两端。

### 让某个项目不带玻璃背景

```swift
@available(iOS 26, macOS 26, *)
struct SharedBackgroundDemo: View {
    var body: some View {
        NavigationStack {
            Text("内容")
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.title2)
                    }
                    .sharedBackgroundVisibility(.hidden)       // 头像不需要玻璃底
                }
        }
    }
}
```

### 用角色让系统选择样式

第 15 章提到的 `.confirm`、`.close` 按钮角色在工具栏里特别有用。系统会给它们标准的图标和突出样式：

```swift
@available(iOS 26, macOS 26, *)
struct RoleButtonsInToolbar: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Text("编辑内容")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(role: .close) { dismiss() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button(role: .confirm) { dismiss() }
                    }
                }
        }
    }
}
```

不需要自己指定图标和文字，系统会显示标准的“关闭”叉号和“确认”对勾，并给确认按钮加上强调色的玻璃。

## 27 系列：空间不够时怎么办 <Badge type="tip" text="iOS 27+ / macOS 27+" />

工具栏的宽度是有限的。窗口变窄、标题变长、字号变大时，项目可能放不下。27 系列提供了一组工具来声明“空间紧张时的取舍”。

### 可见性优先级

```swift
@available(iOS 27, macOS 27, *)
struct VisibilityPriorityDemo: View {
    var body: some View {
        NavigationStack {
            Text("邮件正文")
                .navigationTitle("关于下周会议安排的讨论")
                .toolbar {
                    ToolbarItem {
                        Button("回复", systemImage: "arrowshape.turn.up.left") {}
                    }
                    .visibilityPriority(.high)          // 最后才被收起

                    ToolbarItem {
                        Button("转发", systemImage: "arrowshape.turn.up.right") {}
                    }

                    ToolbarItem {
                        Button("打印", systemImage: "printer") {}
                    }
                    .visibilityPriority(.low)           // 最先被收起
                }
        }
    }
}
```

空间不足时，系统按优先级从低到高把项目移进溢出菜单。`.high` 的项目最后才会被收起。还可以用 `ToolbarItemVisibilityPriority(higherThan:)` / `(lowerThan:)` 定义相对的优先级。

### 溢出菜单

有些操作本来就该待在“更多”菜单里。用 `ToolbarOverflowMenu` 明确声明：

```swift
@available(iOS 27, macOS 27, *)
struct OverflowMenuDemo: View {
    var body: some View {
        NavigationStack {
            Text("邮件正文")
                .toolbar {
                    ToolbarItem {
                        Button("回复", systemImage: "arrowshape.turn.up.left") {}
                    }

                    ToolbarOverflowMenu {
                        Button("归档", systemImage: "archivebox") {}
                        Button("标为未读", systemImage: "envelope.badge") {}
                        Divider()
                        Button("删除", systemImage: "trash", role: .destructive) {}
                    }
                }
        }
    }
}
```

`ToolbarOverflowMenu` 里的操作直接进入溢出菜单，因空间不足被收起的项目也会出现在同一个菜单里。主工具栏只保留最关键的操作。

### 滚动时收起工具栏（iOS）

```swift ios
@available(iOS 27, *)
struct MinimizingToolbar: View {
    var body: some View {
        NavigationStack {
            List(0..<60, id: \.self) { Text("文章段落 \($0)") }
                .navigationTitle("长文阅读")
                .toolbar {
                    Button("字号", systemImage: "textformat.size") {}
                }
                .toolbarMinimizationBehavior(.onScrollDown, for: .navigationBar)
        }
    }
}
```

和上一章的 `tabBarMinimizeBehavior` 类似：向下滚动时导航栏收缩让出空间，向上滚动时恢复。适合阅读类界面。

## 其他工具栏配置

```swift
struct ToolbarConfiguration: View {
    @State private var title = "未命名文档"

    var body: some View {
        NavigationStack {
            Text("内容")
                .navigationTitle($title)                          // 可重命名的标题
                .toolbarTitleMenu {                               // 点击标题弹出的菜单
                    Button("复制", systemImage: "doc.on.doc") {}
                    Button("移动", systemImage: "folder") {}
                }
                .toolbarRole(.editor)                             // 编辑器角色：标题靠左，中间留给工具
                .toolbar {
                    Button("撤销", systemImage: "arrow.uturn.backward") {}
                }
                #if os(iOS)
                .navigationBarTitleDisplayMode(.inline)
                #endif
        }
    }
}
```

| 修饰符 | 作用 |
| --- | --- |
| `.toolbarVisibility(_:for:)` | 显示/隐藏某个栏：`.navigationBar`、`.tabBar`、`.bottomBar`、`.windowToolbar` |
| `.toolbarBackgroundVisibility(_:for:)` | 栏背景的可见性 |
| `.toolbarTitleDisplayMode(_:)` | 标题显示模式：`.large`、`.inline`、`.inlineLarge` |
| `.toolbarTitleMenu { }` | 标题上的下拉菜单 |
| `.toolbarRole(_:)` | 工具栏的整体角色：`.navigationStack`、`.browser`、`.editor` |
| `.toolbar(removing:)` | 移除系统默认的项目，如侧边栏切换按钮 |

### 用户可自定义的工具栏

macOS 和 iPadOS 允许用户自己增删、排列工具栏项目。给工具栏和每个项目一个 id 即可启用：

```swift
struct CustomizableToolbarDemo: View {
    var body: some View {
        NavigationStack {
            Text("右键点击工具栏（macOS）可以自定义")
                .toolbar(id: "main") {
                    ToolbarItem(id: "bold") {
                        Button("粗体", systemImage: "bold") {}
                    }
                    ToolbarItem(id: "italic") {
                        Button("斜体", systemImage: "italic") {}
                    }
                    ToolbarItem(id: "color", showsByDefault: false) {
                        Button("颜色", systemImage: "paintpalette") {}
                    }
                }
                .toolbarRole(.editor)
        }
    }
}
```

用户的自定义结果会自动保存。`showsByDefault: false` 的项目默认不显示，用户可以从自定义面板里拖出来。

### 抽取工具栏内容

工具栏内容多了以后，可以抽成独立的类型或属性。工具栏有自己的内容协议 `ToolbarContent`：

```swift
struct EditorToolbar: ToolbarContent {
    let onUndo: () -> Void
    let onRedo: () -> Void

    var body: some ToolbarContent {
        ToolbarItemGroup(placement: .primaryAction) {
            Button("撤销", systemImage: "arrow.uturn.backward", action: onUndo)
            Button("重做", systemImage: "arrow.uturn.forward", action: onRedo)
        }
    }
}

struct EditorScreen: View {
    var body: some View {
        NavigationStack {
            Text("编辑区")
                .toolbar {
                    EditorToolbar(onUndo: {}, onRedo: {})
                }
        }
    }
}
```

::: warning Xcode 27：统一的 ContentBuilder
第 3 章提到过：Xcode 27 的 SDK 引入了 `ContentBuilder` 作为统一的构建器。以前写一个返回工具栏内容的计算属性，要标 `@ToolbarContentBuilder`；现在可以统一写 `@ContentBuilder`，菜单命令（原来的 `@CommandsBuilder`）也一样：

```swift
struct ContentBuilderToolbar: View {
    var body: some View {
        NavigationStack {
            Text("内容").toolbar { actions }
        }
    }

    @ContentBuilder
    private var actions: some ToolbarContent {
        ToolbarItem { Button("刷新", systemImage: "arrow.clockwise") {} }
        ToolbarItem { Button("筛选", systemImage: "line.3.horizontal.decrease") {} }
    }
}
```

`@ToolbarContentBuilder` 仍然可用。用 Xcode 26 及更早版本编译时只能写 `@ToolbarContentBuilder`。
:::

## 搜索：searchable

### 基本用法

```swift
struct SearchBasics: View {
    let fruits = ["苹果", "香蕉", "樱桃", "榴莲", "火龙果", "哈密瓜", "猕猴桃", "蓝莓", "草莓", "西瓜"]
    @State private var query = ""

    private var results: [String] {
        query.isEmpty ? fruits : fruits.filter { $0.localizedStandardContains(query) }
    }

    var body: some View {
        NavigationStack {
            List(results, id: \.self) { Text($0) }
                .navigationTitle("水果")
                .searchable(text: $query, prompt: "搜索水果")
                .overlay {
                    if results.isEmpty {
                        ContentUnavailableView.search(text: query)
                    }
                }
        }
    }
}
```

`.searchable` 做的事情：在合适的位置显示一个搜索框，把用户输入写进绑定的字符串。**它不做任何过滤。** 过滤是你的事：`results` 是 `query` 的派生值（第 9 章）。

`localizedStandardContains` 是做用户搜索的推荐方法：不区分大小写、不区分音调符号，并且遵循当前语言的规则。

搜索框出现在哪里，取决于平台和 `.searchable` 所在的容器：

| 环境 | 搜索框位置 |
| --- | --- |
| iOS 的 `NavigationStack` | 26 系列起默认在屏幕底部的工具栏区域；更早的系统在导航栏标题下方 |
| iPad / Mac 的 `NavigationSplitView` | 加在哪一栏上就显示在哪一栏；加在整个 split view 上则在工具栏尾部 |
| macOS | 窗口工具栏的尾部 |

可以用 `placement:` 参数调整，例如 `.searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always))` 让 iOS 上的搜索框始终显示在导航栏下方。26 系列里，`.searchToolbarBehavior(.minimize)` 让底部的搜索框收成一个按钮。

### 搜索状态

```swift
struct SearchStateDemo: View {
    @State private var query = ""

    var body: some View {
        NavigationStack {
            SearchContent(query: query)
                .navigationTitle("搜索状态")
                .searchable(text: $query)
        }
    }
}

struct SearchContent: View {
    let query: String
    @Environment(\.isSearching) private var isSearching
    @Environment(\.dismissSearch) private var dismissSearch

    var body: some View {
        VStack(spacing: 12) {
            if isSearching {
                Text("正在搜索：\(query)")
                Button("结束搜索") { dismissSearch() }
            } else {
                Text("点击搜索框开始")
            }
        }
    }
}
```

`isSearching` 和 `dismissSearch` 是环境值，必须在被 `.searchable` 修饰的视图的**后代**里读取。所以这里把内容抽成了子视图 `SearchContent`。在加了 `.searchable` 的同一个视图里读取，得到的永远是 `false`。

### 搜索建议

```swift
struct SearchSuggestionsDemo: View {
    @State private var query = ""
    @State private var submitted = ""
    let history = ["SwiftUI 布局", "动画", "Observation"]

    var body: some View {
        NavigationStack {
            Text(submitted.isEmpty ? "还没有搜索" : "搜索了：\(submitted)")
                .navigationTitle("搜索建议")
                .searchable(text: $query)
                .searchSuggestions {
                    if query.isEmpty {
                        Section("最近搜索") {
                            ForEach(history, id: \.self) { item in
                                Label(item, systemImage: "clock")
                                    .searchCompletion(item)
                            }
                        }
                    } else {
                        ForEach(history.filter { $0.localizedStandardContains(query) }, id: \.self) { item in
                            Text(item).searchCompletion(item)
                        }
                    }
                }
                .onSubmit(of: .search) {
                    submitted = query
                }
        }
    }
}
```

- `.searchSuggestions` 提供建议列表。
- `.searchCompletion(_:)` 指定点击这条建议时把什么文字填进搜索框。
- `.onSubmit(of: .search)` 在用户按下搜索键时触发。

### 搜索范围

```swift
struct SearchScopeDemo: View {
    enum Scope: String, CaseIterable {
        case all = "全部"
        case titles = "标题"
        case content = "正文"
    }

    @State private var query = ""
    @State private var scope = Scope.all

    var body: some View {
        NavigationStack {
            Text("在「\(scope.rawValue)」中搜索「\(query)」")
                .navigationTitle("搜索范围")
                .searchable(text: $query)
                .searchScopes($scope) {
                    ForEach(Scope.allCases, id: \.self) { scope in
                        Text(scope.rawValue).tag(scope)
                    }
                }
        }
    }
}
```

搜索范围显示为搜索框下方的一组分段选项。

### 搜索令牌

令牌（token）是搜索框里的“胶囊”，表示一个结构化的筛选条件，比如邮件 App 里的“发件人：张三”：

```swift
struct SearchToken: Identifiable, Hashable {
    let id = UUID()
    var name: String
    var icon: String
}

struct SearchTokensDemo: View {
    @State private var query = ""
    @State private var tokens: [SearchToken] = []
    let suggested = [
        SearchToken(name: "已标旗", icon: "flag"),
        SearchToken(name: "有附件", icon: "paperclip"),
        SearchToken(name: "未读", icon: "envelope.badge"),
    ]

    var body: some View {
        NavigationStack {
            List {
                Text("文本：\(query)")
                Text("令牌：\(tokens.map(\.name).joined(separator: "、"))")
            }
            .navigationTitle("搜索令牌")
            .searchable(text: $query, tokens: $tokens, suggestedTokens: .constant(suggested)) { token in
                Label(token.name, systemImage: token.icon)
            }
        }
    }
}
```

### 用代码控制搜索框

```swift
struct SearchPresentation: View {
    @State private var query = ""
    @State private var isSearchPresented = false

    var body: some View {
        NavigationStack {
            Button("开始搜索") { isSearchPresented = true }
                .navigationTitle("控制搜索")
                .searchable(text: $query, isPresented: $isSearchPresented)
        }
    }
}
```

绑定 `isPresented` 就能用代码激活或结束搜索。26 系列还可以用 `.searchFocused` 把搜索框的焦点绑定到 `@FocusState`。

### 搜索与异步数据

搜索远程数据时，用第 12 章的 `.task(id:)` 做防抖和自动取消：

```swift
struct RemoteSearch: View {
    @State private var query = ""
    @State private var results: [String] = []
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            List(results, id: \.self) { Text($0) }
                .overlay {
                    if isLoading {
                        ProgressView()
                    } else if results.isEmpty && !query.isEmpty {
                        ContentUnavailableView.search(text: query)
                    }
                }
                .navigationTitle("远程搜索")
                .searchable(text: $query)
                .task(id: query) {
                    guard !query.isEmpty else {
                        results = []
                        return
                    }
                    isLoading = true
                    defer { isLoading = false }
                    do {
                        try await Task.sleep(for: .milliseconds(300))        // 防抖
                        results = (1...6).map { "「\(query)」的结果 \($0)" }    // 这里换成真实的网络请求
                    } catch {
                        // 被新的输入取消，忽略
                    }
                }
        }
    }
}
```

## 标签栏里的搜索

上一章介绍了 `Tab(role: .search)`。把 `.searchable` 加在 `TabView` 上，搜索框就和搜索标签关联起来：

```swift
struct TabSearchDemo: View {
    @State private var query = ""

    var body: some View {
        TabView {
            Tab("首页", systemImage: "house") {
                Text("首页")
            }
            Tab(role: .search) {
                NavigationStack {
                    List {
                        Text(query.isEmpty ? "输入关键词" : "搜索「\(query)」")
                    }
                    .navigationTitle("搜索")
                }
            }
        }
        .searchable(text: $query)
    }
}
```

在 26 系列的 iPhone 上，点击搜索标签时，标签栏会变形成一个搜索框。

## 常见误区

**误区一：“`.toolbar` 加在 `NavigationStack` 上。”** 和 `navigationTitle` 一样，它要加在栈里面的页面内容上。

**误区二：“工具栏按钮只给图标。”** 没有标题，VoiceOver 读不出来，macOS 上没有悬停提示，被收进菜单时也没有文字。用 `Button("标题", systemImage:)`。

**误区三：“到处用 `.topBarTrailing`。”** 优先用语义位置（`.primaryAction`、`.confirmationAction` 等），这样在 macOS 和不同上下文里才能得到正确的布局。`.topBarTrailing` 在 macOS 上根本不存在。

**误区四：“`searchable` 加上了但列表没过滤。”** 它只提供搜索框和文本绑定。过滤逻辑需要你根据文本自己计算。

**误区五：“读不到 `isSearching`。”** 它只在 `.searchable` 修饰的视图的后代里有效。

**误区六：“把十几个按钮都塞进工具栏。”** 工具栏放最常用的少数操作。其余的放进溢出菜单或 `.secondaryAction`，并用可见性优先级表达取舍。

## 小结

- `.toolbar` 在页面内容上声明操作，用 `ToolbarItem(placement:)` 指定语义位置，系统在各平台上映射到合适的地方。
- 26 系列的工具栏使用 Liquid Glass，`ToolbarSpacer` 控制分组，按钮角色让系统提供标准样式。
- 27 系列用 `visibilityPriority` 和 `ToolbarOverflowMenu` 声明空间不足时的取舍，`toolbarMinimizationBehavior` 让导航栏随滚动收起。
- Xcode 27 的 SDK 用统一的 `@ContentBuilder` 取代了各种专用构建器。
- `.searchable` 提供搜索框和文本绑定，过滤由你实现；支持建议、范围、令牌，以及用代码控制。
- 远程搜索用 `.task(id:)` 实现防抖和取消。

## 练习

1. 做一个笔记列表页：导航栏右侧有“新建”按钮（主要操作），“排序”和“全选”放进次要操作。分别在 iOS 和 macOS 预览里查看它们的位置。
2. 做一个编辑 sheet，用 `.cancellationAction` 和 `.confirmationAction` 放置取消和保存。对比 iOS 和 macOS 上按钮的位置。
3. 给第 17 章的联系人列表加搜索：支持按姓名过滤，无结果时显示空状态，搜索框为空时在建议里显示最近三次搜索记录。
4. 做一个带搜索范围的文件搜索界面：范围有“全部”“文档”“图片”，数据用假数据，切换范围和输入关键词都会更新结果。

## 官方文档

- [Toolbars（专题总览）](https://developer.apple.com/documentation/swiftui/toolbars)
- [`toolbar(content:)`](https://developer.apple.com/documentation/swiftui/view/toolbar(content:))
- [`ToolbarItem`](https://developer.apple.com/documentation/swiftui/toolbaritem)
- [`ToolbarItemPlacement`](https://developer.apple.com/documentation/swiftui/toolbaritemplacement)
- [`ToolbarItemGroup`](https://developer.apple.com/documentation/swiftui/toolbaritemgroup)
- [`ToolbarSpacer`](https://developer.apple.com/documentation/swiftui/toolbarspacer)
- [`ToolbarOverflowMenu`](https://developer.apple.com/documentation/swiftui/toolbaroverflowmenu)
- [`ToolbarItemVisibilityPriority`](https://developer.apple.com/documentation/swiftui/toolbaritemvisibilitypriority)
- [`toolbarMinimizationBehavior(_:for:)`](https://developer.apple.com/documentation/swiftui/view/toolbarminimizationbehavior(_:for:))
- [`ToolbarContent`](https://developer.apple.com/documentation/swiftui/toolbarcontent)
- [`ContentBuilder`](https://developer.apple.com/documentation/swiftui/contentbuilder)
- [Search（专题总览）](https://developer.apple.com/documentation/swiftui/search)
- [Adding a search interface to your app](https://developer.apple.com/documentation/swiftui/adding-a-search-interface-to-your-app)
- [`searchable(text:placement:prompt:)`](https://developer.apple.com/documentation/swiftui/view/searchable(text:placement:prompt:))
- [Suggesting search terms](https://developer.apple.com/documentation/swiftui/suggesting-search-terms)
- [Scoping a search operation](https://developer.apple.com/documentation/swiftui/scoping-a-search-operation)
- [Human Interface Guidelines：Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
