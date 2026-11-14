# 19 导航：Stack、Split 与 Tab

## 本章目标

- 用 `NavigationStack` 实现逐层深入的导航，掌握数据驱动的写法
- 用路径（path）实现程序化导航、深层链接、返回根页面
- 用 `NavigationSplitView` 实现多栏布局，理解它如何自适应
- 用 `TabView` 和 `Tab` 组织顶层结构，包括可变为侧边栏的自适应标签
- 把三者组合成完整的应用骨架
- 了解 26、27 系列在标签栏上的新能力

导航是应用的骨架。SwiftUI 提供三种导航容器，对应三种信息结构：

| 容器 | 结构 | 例子 |
| --- | --- | --- |
| `NavigationStack` | 一层层深入，可以返回 | 设置 → 通用 → 关于本机 |
| `NavigationSplitView` | 并排的两栏或三栏，左边选、右边看 | 邮件：邮箱列表 ｜ 邮件列表 ｜ 邮件内容 |
| `TabView` | 几个并列的顶层区域 | 时钟：世界时钟、闹钟、秒表、计时器 |

## NavigationStack

### 最简单的形式

```swift
struct SimpleNavigation: View {
    var body: some View {
        NavigationStack {
            List {
                NavigationLink("关于") {
                    Text("这是关于页面")
                        .navigationTitle("关于")
                }
                NavigationLink {
                    Text("这是帮助页面")
                } label: {
                    Label("帮助", systemImage: "questionmark.circle")
                }
            }
            .navigationTitle("设置")
        }
    }
}
```

- `NavigationStack` 是容器，管理一个页面的栈。
- `NavigationLink` 是一个按钮，点击后把目标页面推入栈顶。
- `.navigationTitle` 写在**页面内容上**，不是写在 `NavigationStack` 上。回忆第 11 章：这是通过偏好向上传递给导航容器的。每个页面声明自己的标题。

这种“把目标视图直接写在链接里”的形式适合简单的静态页面。它有两个局限：无法用代码控制导航；目标视图在链接创建时就被构造出来。

### 数据驱动的导航

推荐的写法是把“去哪里”表达成**数据**：链接只携带一个值，由 `navigationDestination` 统一决定这个值对应什么页面。

```swift
struct Recipe: Identifiable, Hashable {
    let id = UUID()
    var name: String
    var minutes: Int
}

struct RecipeList: View {
    let recipes = [
        Recipe(name: "番茄炒蛋", minutes: 10),
        Recipe(name: "红烧肉", minutes: 90),
        Recipe(name: "清蒸鲈鱼", minutes: 25),
    ]

    var body: some View {
        NavigationStack {
            List(recipes) { recipe in
                NavigationLink(recipe.name, value: recipe)       // 只携带一个值
            }
            .navigationTitle("菜谱")
            .navigationDestination(for: Recipe.self) { recipe in  // 这种类型的值 → 这个页面
                RecipeDetail(recipe: recipe)
            }
        }
    }
}

struct RecipeDetail: View {
    let recipe: Recipe

    var body: some View {
        VStack(spacing: 12) {
            Text(recipe.name).font(.largeTitle)
            Text("需要 \(recipe.minutes) 分钟").foregroundStyle(.secondary)
        }
        .navigationTitle(recipe.name)
    }
}
```

`NavigationLink(value:)` 和 `.navigationDestination(for:)` 通过**值的类型**配对。点击链接时，SwiftUI 找到处理 `Recipe` 类型的 `navigationDestination`，用它构造页面。

好处：

- 目标页面是**懒创建**的，点击时才构造。
- 链接和目标解耦。同一个 `Recipe` 链接可以出现在很多地方，目标只定义一次。
- 导航状态可以表示成一个数组，于是可以用代码操作它。这就是下面要讲的路径。

::: warning navigationDestination 放在哪
`.navigationDestination` 要放在 `NavigationStack` **内部**的视图上，并且不能放在“懒加载”的容器里面（比如 `List` 或 `LazyVStack` 的行上），否则那一行没被创建时目标就找不到。通常把它加在栈的根视图上。可以为不同类型各写一个。
:::

### 路径：用代码控制导航

`NavigationStack` 可以绑定一个数组，这个数组**就是**当前的导航栈：

```swift
struct PathNavigation: View {
    @State private var path: [Int] = []

    var body: some View {
        NavigationStack(path: $path) {
            VStack(spacing: 16) {
                Button("进入第 1 层") { path.append(1) }
                Button("直接跳到第 3 层") { path = [1, 2, 3] }
            }
            .navigationTitle("根页面")
            .navigationDestination(for: Int.self) { level in
                VStack(spacing: 16) {
                    Text("第 \(level) 层").font(.largeTitle)
                    Text("当前路径：\(path.map(String.init).joined(separator: " → "))")
                        .font(.caption)

                    Button("再深入一层") { path.append(level + 1) }
                    Button("返回上一层") { path.removeLast() }
                    Button("回到根页面") { path.removeAll() }
                }
                .navigationTitle("第 \(level) 层")
            }
        }
    }
}
```

这是声明式思想在导航上的体现。**导航栈是状态，界面是它的函数：**

| 想做的事 | 对状态的操作 |
| --- | --- |
| 推入一个页面 | `path.append(value)` |
| 返回上一页 | `path.removeLast()` |
| 回到根页面 | `path.removeAll()` |
| 直接跳到深层页面 | `path = [a, b, c]` |
| 知道当前在第几层 | `path.count` |

用户点返回按钮或侧滑返回时，`path` 也会自动更新。

### 多种类型的路径：NavigationPath

上面的 `path` 是 `[Int]`，栈里只能有一种类型。实际应用里栈上会有不同类型的页面（菜谱 → 作者 → 作者的另一个菜谱）。用 `NavigationPath`，它是一个可以装任意 `Hashable` 值的类型擦除容器：

```swift
struct Author: Hashable {
    var name: String
}

struct MixedPathNavigation: View {
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            List {
                NavigationLink("菜谱：番茄炒蛋", value: Recipe(name: "番茄炒蛋", minutes: 10))
                NavigationLink("作者：老王", value: Author(name: "老王"))
                Button("用代码跳转：作者 → 菜谱") {
                    path.append(Author(name: "小李"))
                    path.append(Recipe(name: "小李的拿手菜", minutes: 30))
                }
            }
            .navigationTitle("首页")
            .navigationDestination(for: Recipe.self) { recipe in
                Text(recipe.name).navigationTitle("菜谱")
            }
            .navigationDestination(for: Author.self) { author in
                List {
                    NavigationLink("他的菜谱", value: Recipe(name: "\(author.name)的招牌菜", minutes: 45))
                }
                .navigationTitle(author.name)
            }
        }
    }
}
```

另一种常见做法是定义一个枚举，把所有可能的目的地列出来，路径就是这个枚举的数组。它比 `NavigationPath` 更类型安全，路径的内容也一目了然：

```swift
enum Route: Hashable {
    case recipe(Recipe)
    case author(Author)
    case settings
}

struct EnumRouteNavigation: View {
    @State private var path: [Route] = []

    var body: some View {
        NavigationStack(path: $path) {
            List {
                NavigationLink("设置", value: Route.settings)
                NavigationLink("作者", value: Route.author(Author(name: "老王")))
            }
            .navigationTitle("首页")
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .recipe(let recipe): RecipeDetail(recipe: recipe)
                case .author(let author): Text(author.name).navigationTitle("作者")
                case .settings: Text("设置页").navigationTitle("设置")
                }
            }
        }
    }
}
```

### 把路径放进模型：路由器

当深层的子视图也需要触发导航时（比如详情页里点“查看作者”），把路径放进一个可观察对象，通过环境共享：

```swift
@Observable
class Router {
    var path: [Route] = []

    func show(_ route: Route) { path.append(route) }
    func back() { if !path.isEmpty { path.removeLast() } }
    func popToRoot() { path.removeAll() }
}

struct RouterRoot: View {
    @State private var router = Router()

    var body: some View {
        NavigationStack(path: $router.path) {
            RouterHome()
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .recipe(let recipe): RecipeDetail(recipe: recipe)
                    case .author(let author): Text(author.name)
                    case .settings: RouterSettings()
                    }
                }
        }
        .environment(router)
    }
}

struct RouterHome: View {
    @Environment(Router.self) private var router

    var body: some View {
        Button("打开设置") { router.show(.settings) }
            .navigationTitle("首页")
    }
}

struct RouterSettings: View {
    @Environment(Router.self) private var router

    var body: some View {
        Button("回到首页") { router.popToRoot() }
            .navigationTitle("设置")
    }
}
```

这个模式让深层链接（deep link）变得很简单：收到一个 URL，把它解析成一组 `Route`，赋给 `router.path` 即可。

```swift nocheck
.onOpenURL { url in
    if let routes = parse(url) {
        router.path = routes
    }
}
```

路径如果是 `Codable` 的，还可以存进 `@SceneStorage`，实现“重启后回到上次的页面”。

### 标题与导航栏

```swift
struct TitleOptions: View {
    var body: some View {
        NavigationStack {
            List(0..<20, id: \.self) { Text("行 \($0)") }
                .navigationTitle("收件箱")
                #if os(iOS)
                .navigationBarTitleDisplayMode(.large)
                #endif
        }
    }
}
```

| 修饰符 | 作用 | 平台 |
| --- | --- | --- |
| `.navigationTitle(_:)` | 页面标题。macOS 上显示为窗口标题 | 全平台 |
| `.navigationSubtitle(_:)` | 副标题 | macOS 13+、iOS 26+ |
| `.navigationBarTitleDisplayMode(_:)` | `.large` 大标题、`.inline` 小标题、`.automatic` | iOS |
| `.navigationBarBackButtonHidden()` | 隐藏返回按钮 | 全平台 |
| `.toolbarVisibility(.hidden, for: .navigationBar)` | 隐藏整个导航栏 | iOS |
| `.navigationDocument(_:)` | 把标题关联到一个文档，标题栏可拖拽、可分享 | 全平台 |

`.navigationTitle($title)` 传入一个 `Binding<String>` 时，标题变成可编辑的（点击标题出现重命名）。

工具栏按钮（导航栏右上角的那些）在第 21 章讲。

## NavigationSplitView

多栏布局适合“列表 + 详情”结构，是 iPad 和 Mac 应用的典型形态。

### 两栏

```swift
struct TwoColumnSplit: View {
    let recipes = [
        Recipe(name: "番茄炒蛋", minutes: 10),
        Recipe(name: "红烧肉", minutes: 90),
        Recipe(name: "清蒸鲈鱼", minutes: 25),
    ]
    @State private var selection: Recipe?

    var body: some View {
        NavigationSplitView {
            List(recipes, selection: $selection) { recipe in
                NavigationLink(recipe.name, value: recipe)
            }
            .navigationTitle("菜谱")
        } detail: {
            if let selection {
                RecipeDetail(recipe: selection)
            } else {
                ContentUnavailableView("选择一个菜谱", systemImage: "fork.knife")
            }
        }
    }
}
```

工作方式：**侧边栏的 `List` 绑定一个选择状态，详情栏根据这个状态显示内容。** 两栏之间没有直接的“导航”关系，它们通过共享的状态 `selection` 联系在一起。这是状态提升（第 9 章）的又一次应用。

### 三栏

```swift
struct Mailbox: Identifiable, Hashable {
    let id = UUID()
    var name: String
    var messages: [String]
}

struct ThreeColumnSplit: View {
    let mailboxes = [
        Mailbox(name: "收件箱", messages: ["会议通知", "周报", "发票"]),
        Mailbox(name: "已发送", messages: ["回复：会议通知"]),
        Mailbox(name: "草稿", messages: []),
    ]
    @State private var selectedMailbox: Mailbox?
    @State private var selectedMessage: String?

    var body: some View {
        NavigationSplitView {
            List(mailboxes, selection: $selectedMailbox) { mailbox in
                NavigationLink(value: mailbox) {
                    Label(mailbox.name, systemImage: "tray")
                        .badge(mailbox.messages.count)
                }
            }
            .navigationTitle("邮箱")
        } content: {
            if let selectedMailbox {
                List(selectedMailbox.messages, id: \.self, selection: $selectedMessage) { message in
                    NavigationLink(message, value: message)
                }
                .navigationTitle(selectedMailbox.name)
            } else {
                Text("选择一个邮箱")
            }
        } detail: {
            if let selectedMessage {
                Text(selectedMessage).font(.title)
            } else {
                Text("选择一封邮件")
            }
        }
        .onChange(of: selectedMailbox) { selectedMessage = nil }
    }
}
```

### 自适应：它在不同设备上的表现

`NavigationSplitView` 最有价值的地方在于**同一段代码自动适应各种宽度**：

| 环境 | 表现 |
| --- | --- |
| Mac | 多栏并排，侧边栏可以拖动调整宽度、可以折叠 |
| iPad 横屏 | 多栏并排 |
| iPad 竖屏 | 详情栏全屏，侧边栏作为浮层滑出 |
| iPhone / iPad 窄分屏 | **折叠成一个导航栈**：先显示侧边栏列表，点击一项后推入下一栏 |

在紧凑宽度下，它的行为和 `NavigationStack` 一模一样。你写一份代码，在 iPhone 上是逐层推入，在 iPad 和 Mac 上是多栏并排。在预览里切换设备，或者在 Mac 上把窗口拖窄，都能看到这个变化。

### 控制栏的显示

```swift
struct SplitVisibility: View {
    @State private var visibility = NavigationSplitViewVisibility.all
    @State private var preferredColumn = NavigationSplitViewColumn.detail

    var body: some View {
        NavigationSplitView(columnVisibility: $visibility, preferredCompactColumn: $preferredColumn) {
            List(0..<5, id: \.self) { Text("侧边栏 \($0)") }
                .navigationSplitViewColumnWidth(min: 180, ideal: 220, max: 300)
        } detail: {
            VStack(spacing: 12) {
                Text("详情")
                Button("只显示详情") { visibility = .detailOnly }
                Button("显示全部") { visibility = .all }
            }
        }
        .navigationSplitViewStyle(.balanced)
    }
}
```

- `columnVisibility`：控制显示哪些栏。`.all`、`.doubleColumn`、`.detailOnly`、`.automatic`。
- `preferredCompactColumn`：折叠成单栏时优先显示哪一栏。默认显示侧边栏；设成 `.detail` 可以让 iPhone 上一打开就是详情。
- `.navigationSplitViewColumnWidth`：设置某一栏的宽度范围。
- `.navigationSplitViewStyle`：`.balanced`（显示侧边栏时详情栏缩窄）或 `.prominentDetail`（详情栏保持大小，侧边栏浮在上面）。

### 详情栏里再放一个栈

详情栏里经常还需要继续深入。在 `detail` 里放一个 `NavigationStack`：

```swift
struct SplitWithStack: View {
    @State private var selection: Int? = 0
    @State private var path: [String] = []

    var body: some View {
        NavigationSplitView {
            List(0..<5, id: \.self, selection: $selection) { index in
                Text("分类 \(index)")
            }
        } detail: {
            NavigationStack(path: $path) {
                List(0..<8, id: \.self) { item in
                    NavigationLink("分类 \(selection ?? 0) 的条目 \(item)", value: "条目 \(item)")
                }
                .navigationTitle("分类 \(selection ?? 0)")
                .navigationDestination(for: String.self) { Text($0) }
            }
        }
        .onChange(of: selection) { path.removeAll() }      // 切换分类时回到根页面
    }
}
```

## TabView

### 用 Tab 声明标签页

```swift
struct BasicTabs: View {
    var body: some View {
        TabView {
            Tab("首页", systemImage: "house") {
                Text("首页内容")
            }

            Tab("消息", systemImage: "bubble.left.and.bubble.right") {
                Text("消息内容")
            }
            .badge(3)

            Tab("我的", systemImage: "person") {
                Text("个人中心")
            }
        }
    }
}
```

`Tab` 把标题、图标、内容写在一起。`.badge()` 给标签加角标。

::: details 旧写法：tabItem
`Tab` 类型是 iOS 18 / macOS 15 引入的。更早的代码用 `.tabItem` 修饰符：

```swift
struct LegacyTabs: View {
    var body: some View {
        TabView {
            Text("首页内容")
                .tabItem { Label("首页", systemImage: "house") }
            Text("我的")
                .tabItem { Label("我的", systemImage: "person") }
        }
    }
}
```

两种写法现在都能用。新代码用 `Tab`，它支持分组、角色、自适应侧边栏等新能力。
:::

### 用代码切换标签

```swift
struct SelectableTabs: View {
    enum AppTab: Hashable {
        case home, search, profile
    }

    @State private var selection = AppTab.home

    var body: some View {
        TabView(selection: $selection) {
            Tab("首页", systemImage: "house", value: AppTab.home) {
                Button("去个人中心") { selection = .profile }
            }

            Tab("搜索", systemImage: "magnifyingglass", value: AppTab.search) {
                Text("搜索")
            }

            Tab("我的", systemImage: "person", value: AppTab.profile) {
                Text("个人中心")
            }
        }
    }
}
```

每个 `Tab` 带一个 `value`，`TabView` 绑定 `selection`。当前标签是状态，改状态就切换标签。

### 每个标签有自己的导航栈

标准的应用结构是“标签页在外，导航栈在内”：

```swift
struct TabsWithStacks: View {
    var body: some View {
        TabView {
            Tab("浏览", systemImage: "square.grid.2x2") {
                NavigationStack {
                    List(0..<10, id: \.self) { index in
                        NavigationLink("条目 \(index)", value: index)
                    }
                    .navigationTitle("浏览")
                    .navigationDestination(for: Int.self) { Text("详情 \($0)") }
                }
            }

            Tab("设置", systemImage: "gear") {
                NavigationStack {
                    Form { Toggle("通知", isOn: .constant(true)) }
                        .navigationTitle("设置")
                }
            }
        }
    }
}
```

每个标签各有一个独立的 `NavigationStack`。切换标签时，每个栈保留自己的位置。**不要反过来把 `TabView` 放进 `NavigationStack` 里**，那样推入新页面时标签栏会被盖住，而且各标签无法有独立的导航历史。

### 搜索标签与突出标签

```swift
struct RoleTabs: View {
    var body: some View {
        TabView {
            Tab("首页", systemImage: "house") { Text("首页") }
            Tab("收藏", systemImage: "heart") { Text("收藏") }

            Tab(role: .search) {
                NavigationStack {
                    Text("搜索页面")
                        .navigationTitle("搜索")
                }
            }
        }
    }
}
```

`Tab(role: .search)` 声明一个搜索标签。系统会给它标准的放大镜图标，并在 26 系列的 Liquid Glass 设计下把它放在标签栏尾部一个独立的位置。

27 系列新增了 `.prominent` 角色 <Badge type="tip" text="iOS 27+ / macOS 27+" />，把一个标签放到标签栏尾部独立、突出的位置，适合“新建”“扫码”这类主要操作入口。

### 自适应：标签栏变侧边栏

iPad 屏幕大，底部一排标签不够用。`.sidebarAdaptable` 样式让同一个 `TabView` 在 iPhone 上是标签栏，在 iPad 上可以在顶部标签栏和侧边栏之间切换，在 Mac 上是侧边栏：

```swift
struct AdaptableTabs: View {
    var body: some View {
        TabView {
            Tab("首页", systemImage: "house") { Text("首页") }
            Tab("探索", systemImage: "safari") { Text("探索") }

            TabSection("资料库") {
                Tab("歌曲", systemImage: "music.note") { Text("歌曲") }
                Tab("专辑", systemImage: "square.stack") { Text("专辑") }
                Tab("艺人", systemImage: "music.mic") { Text("艺人") }
            }

            TabSection("播放列表") {
                Tab("最近添加", systemImage: "clock") { Text("最近添加") }
                Tab("我的最爱", systemImage: "star") { Text("我的最爱") }
            }
        }
        .tabViewStyle(.sidebarAdaptable)
    }
}
```

`TabSection` 把标签分组。在侧边栏形态下它们显示为可折叠的分组；在标签栏形态下，分组里的标签会被收起，只显示顶层的几个。

这是多端统一的一个范例：**你声明应用有哪些区域以及它们的层级，系统在每种设备上选择最合适的呈现方式。**

| `tabViewStyle` | 表现 |
| --- | --- |
| `.automatic` | 平台默认 |
| `.tabBarOnly` | 只用标签栏，不变成侧边栏 |
| `.sidebarAdaptable` | iPhone 标签栏；iPad 可切换；Mac 侧边栏 |
| `.page` | 左右滑动翻页，带页码圆点（iOS） |
| `.grouped` | macOS 上居中的分段标签 |

### 26 系列：会收起的标签栏与底部附件 <Badge type="tip" text="iOS 26+" />

Liquid Glass 设计下，iPhone 的标签栏是浮在内容上的玻璃胶囊。两个相关的新 API：

```swift ios
@available(iOS 26, *)
struct ModernTabBar: View {
    var body: some View {
        TabView {
            Tab("资料库", systemImage: "music.note.list") {
                NavigationStack {
                    List(0..<50, id: \.self) { Text("歌曲 \($0)") }
                        .navigationTitle("资料库")
                }
            }
            Tab("广播", systemImage: "dot.radiowaves.left.and.right") {
                Text("广播")
            }
            Tab(role: .search) {
                Text("搜索")
            }
        }
        .tabBarMinimizeBehavior(.onScrollDown)        // 向下滚动时标签栏收成一个小圆点
        .tabViewBottomAccessory {                     // 标签栏上方的附件，例如迷你播放器
            HStack {
                Image(systemName: "play.fill")
                Text("正在播放：晴天")
                Spacer()
                Image(systemName: "forward.fill")
            }
            .padding(.horizontal)
        }
    }
}
```

- `.tabBarMinimizeBehavior(.onScrollDown)`：用户向下滚动内容时，标签栏自动收缩，让出更多空间；向上滚动时恢复。
- `.tabViewBottomAccessory`：在标签栏上方放一个始终可见的附件视图。标签栏收缩时，附件会移到标签栏旁边。音乐 App 的迷你播放器就是这样做的。

## 组合成应用骨架

把三种容器按信息结构组合。两种最常见的骨架：

**内容型应用（多个并列的功能区）**：

```text
TabView（.sidebarAdaptable）
 ├─ Tab：NavigationStack → 列表 → 详情
 ├─ Tab：NavigationStack → 列表 → 详情
 └─ Tab：NavigationStack → 设置
```

**文档/数据管理型应用（一个大集合，分类浏览）**：

```text
NavigationSplitView
 ├─ sidebar：分类列表（绑定 selection）
 ├─ content：该分类下的条目列表（绑定 selection）
 └─ detail：NavigationStack → 条目详情 → 更深的页面
```

两种骨架都能自动适应从 iPhone 到 Mac 的各种宽度。第 33 章讲多端统一时会回到这个话题，第 37 章的综合项目会完整实现第二种。

## 常见误区

**误区一：“`.navigationTitle` 加在 `NavigationStack` 上。”** 它要加在栈**里面**的页面内容上。加在外面没有效果。

**误区二：“`NavigationStack` 套 `NavigationStack`。”** 推入的页面里不要再包一层 `NavigationStack`，否则会出现两个导航栏。一个栈里的所有页面共享同一个 `NavigationStack`。

**误区三：“把 `TabView` 放在 `NavigationStack` 里面。”** 应该反过来：`TabView` 在外，每个 `Tab` 里各放一个 `NavigationStack`。

**误区四：“`navigationDestination` 写在 `List` 的行上。”** 行是懒加载的，没显示出来的行上的修饰符不生效。写在栈的根视图上。

**误区五：“`NavigationLink(value:)` 点了没反应。”** 检查三件事：外面有没有 `NavigationStack`；有没有对应类型的 `navigationDestination(for:)`；值的类型是否完全匹配（`Recipe` 和 `Recipe?` 是不同的类型）。

**误区六：“iPad 和 iPhone 分别写两套导航。”** `NavigationSplitView` 和 `.sidebarAdaptable` 的 `TabView` 都会自动适应。先试试它们的默认行为。

## 小结

- `NavigationStack` 管理页面栈。用 `NavigationLink(value:)` 加 `navigationDestination(for:)` 实现数据驱动的导航。
- 绑定 `path` 后，导航栈就是状态：追加是推入，移除是返回，赋值是跳转。可以放进路由器对象里共享。
- `NavigationSplitView` 通过共享的选择状态联系各栏，在窄屏下自动折叠成导航栈。
- `TabView` 用 `Tab` 声明标签页，`selection` 控制当前标签；每个标签里放自己的 `NavigationStack`。
- `.sidebarAdaptable` 让标签栏在大屏上变成侧边栏，`TabSection` 提供分组。
- 26 系列支持滚动时收起标签栏和底部附件；27 系列新增突出标签角色。

## 练习

1. 做一个三层的导航：分类列表 → 该分类的商品列表 → 商品详情。用枚举 `Route` 和 `[Route]` 路径实现。在商品详情页放一个“回到首页”的按钮。
2. 给上面的应用加深层链接：实现一个函数，把字符串 `"category/2/product/5"` 解析成路径并跳转。
3. 把它改造成 `NavigationSplitView` 的三栏版本。在 iPhone 和 iPad 预览里比较它和 `NavigationStack` 版本的表现。
4. 做一个有四个标签的应用骨架，其中一个是搜索标签。每个标签有独立的导航栈。实现“重复点击当前标签时回到该标签的根页面”。（提示：自定义 `selection` 的 `Binding`，在 set 里判断新旧值是否相同。）

## 官方文档

- [Navigation（专题总览）](https://developer.apple.com/documentation/swiftui/navigation)
- [`NavigationStack`](https://developer.apple.com/documentation/swiftui/navigationstack)
- [`NavigationLink`](https://developer.apple.com/documentation/swiftui/navigationlink)
- [`navigationDestination(for:destination:)`](https://developer.apple.com/documentation/swiftui/view/navigationdestination(for:destination:))
- [`NavigationPath`](https://developer.apple.com/documentation/swiftui/navigationpath)
- [`NavigationSplitView`](https://developer.apple.com/documentation/swiftui/navigationsplitview)
- [Migrating to new navigation types](https://developer.apple.com/documentation/swiftui/migrating-to-new-navigation-types)
- [Bringing robust navigation structure to your SwiftUI app](https://developer.apple.com/documentation/swiftui/bringing-robust-navigation-structure-to-your-swiftui-app)
- [`TabView`](https://developer.apple.com/documentation/swiftui/tabview)
- [`Tab`](https://developer.apple.com/documentation/swiftui/tab)
- [`TabSection`](https://developer.apple.com/documentation/swiftui/tabsection)
- [`TabRole`](https://developer.apple.com/documentation/swiftui/tabrole)
- [Enhancing your app's content with tab navigation](https://developer.apple.com/documentation/swiftui/enhancing-your-app-content-with-tab-navigation)
- [`tabBarMinimizeBehavior(_:)`](https://developer.apple.com/documentation/swiftui/view/tabbarminimizebehavior(_:))
- [`tabViewBottomAccessory(content:)`](https://developer.apple.com/documentation/swiftui/view/tabviewbottomaccessory(content:))
- [WWDC22：The SwiftUI cookbook for navigation](https://developer.apple.com/videos/play/wwdc2022/10054/)
- [WWDC24：Elevate your tab and sidebar experience in iPadOS](https://developer.apple.com/videos/play/wwdc2024/10147/)
