# 34 架构：视图拆分与状态归属

## 本章目标

- 知道什么时候、怎么把一个大视图拆成小视图
- 掌握一套判断“这个状态该放在哪”的方法
- 把应用分成模型、服务、视图三层，知道每层的职责
- 用环境和协议做依赖注入，让代码可预览、可测试
- 为模型层写单元测试
- 认识常见的架构“名词”，知道它们各自解决什么问题，避免过度设计

前面的章节为了一次讲清一件事，示例都很小，数据直接写在视图里。真实的应用有几十个页面、网络请求、数据库和多人协作。这一章讲怎么把前面学到的东西组织成一个能长期维护的项目。

## SwiftUI 已经是一种架构

很多从其他平台过来的开发者，第一件事是问“SwiftUI 应该用什么架构：MVC、MVVM、MVP、VIPER、TCA？”

这些架构模式大多诞生于命令式 UI 的时代，它们要解决的核心问题是：**视图和数据之间的同步代码应该放在哪。** 回忆第 1 章，命令式 UI 里你得手动把数据“搬”到界面上，再手动把用户的输入“搬”回数据。这些搬运代码放在视图控制器里就是 MVC，抽到一个中间对象里就是 MVVM 或 MVP。

SwiftUI 把这个问题本身消除了。`UI = f(State)`：没有搬运代码，界面自动从状态算出来。所以 SwiftUI 的视图本身已经扮演了传统架构里“视图 + 绑定层”的角色：

```text
传统 MVVM：   Model  ⇄  ViewModel（手写的绑定和转换）  ⇄  View
SwiftUI：     Model  ⇄  View（body 就是绑定，自动的）
```

这不是说 SwiftUI 应用不需要设计。它需要回答的问题换成了另外几个：

1. 视图怎么拆？
2. 状态归谁？
3. 逻辑放哪？
4. 依赖怎么传？

把这四个问题回答好，就是一个好的 SwiftUI 架构。至于给它起什么名字并不重要。

## 一、视图怎么拆

### 为什么要拆

第 1 章说过，创建视图几乎没有成本。拆分视图有四个好处：

- **可读。** 一个 300 行的 `body` 没人看得懂。
- **可复用。** 拆出来的部件可以用在别处。
- **可预览。** 小视图可以单独预览各种状态。
- **更快。** 这一点最容易被忽略，下面细说。

### 拆成子视图，还是拆成计算属性

把一个大 `body` 变小，有两种做法，它们**不等价**：

```swift
@Observable
class FeedModel {
    var title = "动态"
    var unreadCount = 3
    var posts = ["帖子一", "帖子二", "帖子三"]
}

// 做法 A：拆成计算属性（或 @ViewBuilder 函数）
struct FeedScreenA: View {
    @State private var model = FeedModel()

    var body: some View {
        VStack {
            header
            postList
        }
    }

    private var header: some View {
        HStack {
            Text(model.title).font(.title)
            Spacer()
            Text("\(model.unreadCount) 条未读")
        }
    }

    private var postList: some View {
        ForEach(model.posts, id: \.self) { Text($0) }
    }
}

// 做法 B：拆成独立的 View 结构体
struct FeedScreenB: View {
    @State private var model = FeedModel()

    var body: some View {
        VStack {
            FeedHeader(model: model)
            FeedPostList(posts: model.posts)
        }
    }
}

struct FeedHeader: View {
    let model: FeedModel

    var body: some View {
        HStack {
            Text(model.title).font(.title)
            Spacer()
            Text("\(model.unreadCount) 条未读")
        }
    }
}

struct FeedPostList: View {
    let posts: [String]

    var body: some View {
        ForEach(posts, id: \.self) { Text($0) }
    }
}
```

区别在于**依赖追踪的边界**。回忆第 10 章：SwiftUI 以**视图**为单位记录“这个 `body` 读了哪些属性”。

- **做法 A**：`header` 和 `postList` 只是 `FeedScreenA.body` 的一部分。整个页面是**一个**视图。`unreadCount` 变了，整个 `body`（包括帖子列表）重新计算。
- **做法 B**：三个独立的视图，各有各的依赖。`unreadCount` 变了，只有 `FeedHeader.body` 重新计算。`FeedScreenB` 自己的 `body` 读了 `model.posts`，所以帖子变化时它和 `FeedPostList` 才更新。

| | 计算属性 / 函数 | 独立的 `View` 结构体 |
| --- | --- | --- |
| 作用 | 只是整理代码 | 建立新的更新边界 |
| 依赖追踪 | 和所在的视图是一体的 | 独立追踪 |
| 能有自己的 `@State` | 不能 | 能 |
| 能单独预览 | 不能 | 能 |
| 适合 | 很小的、和父视图强相关的片段 | 有独立含义的部件，或内容会频繁更新的部分 |

**默认拆成独立的 `View` 结构体。** 计算属性只用于把一个不大的 `body` 整理得更易读。

### 拆到多细

几个实用的信号，出现任何一个就该拆：

- 这段界面有一个**说得出的名字**（“用户头像行”“价格标签”“空状态”）。
- `body` 超过一屏。
- 嵌套超过四五层。
- 这部分依赖的状态**变化频繁**，而周围的部分不常变。
- 你想给它单独写一个预览。
- 它在第二个地方出现了。

### 子视图只拿它需要的

```swift
struct User: Identifiable {
    let id = UUID()
    var name: String
    var avatarSymbol: String
    var bio: String
    var followerCount: Int
}

// 不够好：只用到名字和头像，却要了整个 User
struct AvatarRowLoose: View {
    let user: User

    var body: some View {
        Label(user.name, systemImage: user.avatarSymbol)
    }
}

// 更好：只接收真正用到的数据
struct AvatarRow: View {
    let name: String
    let symbol: String

    var body: some View {
        Label(name, systemImage: symbol)
    }
}
```

第二种写法的好处：

- **复用性更强。** 它不依赖 `User` 类型，任何有名字和图标的东西都能用。
- **预览更容易。** `AvatarRow(name: "测试", symbol: "person")`，不需要造一个完整的 `User`。
- **更新更精确。** SwiftUI 在重新创建子视图时会比较它的属性。`user.followerCount` 变了，`AvatarRow` 的两个属性没变，它的 `body` 就不会重新计算。

这是一条值得养成的习惯：**视图的初始化参数就是它的“接口”，接口越窄越好。** 对于行、卡片、徽章这类叶子视图尤其如此。页面级的视图接收模型对象则是合理的。

## 二、状态归谁

第 9 章给过“状态提升到最近的共同祖先”的方法。这里把它扩展成完整的判断流程。面对一份数据，依次问：

```text
这份数据能从别的数据算出来吗？
├─ 能 → 不是状态。用计算属性。
│
└─ 不能 → 它需要在应用重启后保留吗？
          ├─ 需要 → 是用户的偏好设置吗？
          │         ├─ 是 → @AppStorage
          │         └─ 否 → 是界面状态（选中项、草稿）吗？
          │                  ├─ 是 → @SceneStorage
          │                  └─ 否 → 持久化的模型（SwiftData、文件）
          │
          └─ 不需要 → 只有一个视图（及其子视图）用到它吗？
                      ├─ 是 → 是简单的值吗？
                      │        ├─ 是 → 这个视图的 @State
                      │        └─ 否，有逻辑 → 这个视图用 @State 持有的 @Observable 模型
                      │
                      └─ 否，多处要用 → 这些地方有共同的近祖先吗？
                                        ├─ 有，且层级不深 → 祖先的 @State，向下传值或绑定
                                        └─ 层级很深或遍布全应用 → @Observable 模型 + 环境
```

把状态分成三类来理解会更清晰：

| 类别 | 例子 | 放在哪 | 生命周期 |
| --- | --- | --- | --- |
| **界面状态** | sheet 是否显示、输入框的草稿、当前标签页、是否展开、滚动位置 | 视图的 `@State` | 和视图一样长 |
| **功能状态** | 一个页面的加载状态、搜索结果、筛选条件、表单模型 | 页面用 `@State` 持有的 `@Observable` 模型 | 和页面一样长 |
| **应用状态** | 当前登录的用户、购物车、全局设置、数据库 | `App` 层创建的 `@Observable` 模型，经环境注入 | 和应用一样长 |

常见的错误是把所有东西都放进最高层。一个弹窗是否显示，是那个视图自己的事，放进全局模型只会让全局模型膨胀，并让无关的视图跟着更新。**状态放得尽量低，低到刚好能覆盖所有用到它的地方。**

## 三、逻辑放哪：三层结构

把应用分成三层，每层只做自己的事：

```text
┌──────────────────────────────────────────────────────────────┐
│  视图层  View                                                 │
│  描述界面；持有界面状态；把用户操作转成对模型的方法调用          │
│  import SwiftUI                                               │
└───────────────────────────┬──────────────────────────────────┘
                            │ 读属性、调方法
┌───────────────────────────▼──────────────────────────────────┐
│  模型层  @Observable 类 + 值类型的数据                         │
│  应用的状态和业务规则；不知道界面长什么样                       │
│  import Observation（不 import SwiftUI）                      │
└───────────────────────────┬──────────────────────────────────┘
                            │ await
┌───────────────────────────▼──────────────────────────────────┐
│  服务层  网络、数据库、文件、系统能力                           │
│  和外部世界打交道；通常是 nonisolated 的类型或 actor            │
└──────────────────────────────────────────────────────────────┘
```

依赖方向只能**向下**：视图知道模型，模型知道服务；反过来不行。

### 一个完整的例子

用一个“文章列表”功能把三层走一遍。

**数据**：纯值类型。

```swift
nonisolated struct Article: Identifiable, Hashable, Sendable, Codable {
    let id: Int
    var title: String
    var summary: String
    var isBookmarked = false
}
```

**服务层**：定义一个协议，描述“能做什么”；再给出真实的实现。

```swift
nonisolated protocol ArticleService: Sendable {
    func fetchArticles() async throws -> [Article]
    func setBookmark(_ isBookmarked: Bool, for id: Int) async throws
}

nonisolated struct RemoteArticleService: ArticleService {
    let baseURL: URL

    @concurrent
    func fetchArticles() async throws -> [Article] {
        let (data, _) = try await URLSession.shared.data(from: baseURL.appending(path: "articles"))
        return try JSONDecoder().decode([Article].self, from: data)
    }

    @concurrent
    func setBookmark(_ isBookmarked: Bool, for id: Int) async throws {
        var request = URLRequest(url: baseURL.appending(path: "articles/\(id)/bookmark"))
        request.httpMethod = isBookmarked ? "PUT" : "DELETE"
        _ = try await URLSession.shared.data(for: request)
    }
}
```

服务是 `nonisolated` 和 `Sendable` 的，方法标了 `@concurrent`：网络请求和解析在后台进行（第 12 章）。

**模型层**：持有状态，实现业务规则。

```swift
@Observable
class ArticleListModel {
    enum LoadState: Equatable {
        case idle
        case loading
        case loaded
        case failed(String)
    }

    private(set) var articles: [Article] = []
    private(set) var loadState = LoadState.idle
    var searchText = ""
    var showsBookmarkedOnly = false

    private let service: any ArticleService

    init(service: any ArticleService) {
        self.service = service
    }

    // 派生值：视图直接读它
    var visibleArticles: [Article] {
        articles.filter { article in
            (!showsBookmarkedOnly || article.isBookmarked)
                && (searchText.isEmpty || article.title.localizedStandardContains(searchText))
        }
    }

    var bookmarkCount: Int {
        articles.count(where: \.isBookmarked)
    }

    // 动作：视图调用它
    func load() async {
        guard loadState != .loading else { return }
        loadState = .loading
        do {
            articles = try await service.fetchArticles()
            loadState = .loaded
        } catch is CancellationError {
            loadState = .idle
        } catch {
            loadState = .failed(error.localizedDescription)
        }
    }

    func toggleBookmark(_ article: Article) async {
        guard let index = articles.firstIndex(where: { $0.id == article.id }) else { return }
        let newValue = !articles[index].isBookmarked
        articles[index].isBookmarked = newValue                  // 先乐观地更新界面
        do {
            try await service.setBookmark(newValue, for: article.id)
        } catch {
            if let index = articles.firstIndex(where: { $0.id == article.id }) {
                articles[index].isBookmarked = !newValue         // 失败了再改回去
            }
        }
    }
}
```

注意这个模型的几个特点：

- **`private(set)`**：`articles` 和 `loadState` 外部只能读，不能写。只有模型自己的方法能修改它们。这让“状态只能通过明确的动作改变”成为编译器保证的事实。
- **派生值是计算属性**：`visibleArticles`、`bookmarkCount`。视图不需要知道筛选规则。
- **加载状态是枚举**：不可能出现“既在加载又已失败”。
- **它不 import SwiftUI。** 里面没有 `Color`、`View`、`Binding`。它描述的是“应用知道什么、能做什么”，不是“界面长什么样”。
- **依赖通过初始化器传入**，并且是协议类型。这是可测试的关键。

**视图层**：描述界面，把操作转给模型。

```swift
struct ArticleListScreen: View {
    @State private var model: ArticleListModel

    init(service: any ArticleService) {
        _model = State(initialValue: ArticleListModel(service: service))
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("文章")
                .searchable(text: $model.searchText)
                .toolbar {
                    Toggle("只看收藏", systemImage: "bookmark", isOn: $model.showsBookmarkedOnly)
                }
                .task { await model.load() }
                .refreshable { await model.load() }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.loadState {
        case .idle, .loading where model.articles.isEmpty:
            ProgressView()
        case .failed(let message) where model.articles.isEmpty:
            ContentUnavailableView {
                Label("加载失败", systemImage: "wifi.exclamationmark")
            } description: {
                Text(message)
            } actions: {
                Button("重试") { Task { await model.load() } }
            }
        default:
            List(model.visibleArticles) { article in
                ArticleRow(
                    title: article.title,
                    summary: article.summary,
                    isBookmarked: article.isBookmarked
                ) {
                    Task { await model.toggleBookmark(article) }
                }
            }
            .overlay {
                if model.visibleArticles.isEmpty {
                    ContentUnavailableView.search(text: model.searchText)
                }
            }
        }
    }
}

struct ArticleRow: View {
    let title: String
    let summary: String
    let isBookmarked: Bool
    let onToggleBookmark: () -> Void

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(summary).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
            }
            Spacer()
            Button(isBookmarked ? "取消收藏" : "收藏", systemImage: isBookmarked ? "bookmark.fill" : "bookmark", action: onToggleBookmark)
                .labelStyle(.iconOnly)
                .buttonStyle(.borderless)
                .contentTransition(.symbolEffect(.replace))
        }
    }
}
```

视图里**没有业务逻辑**：没有筛选规则，没有网络代码，没有错误处理的细节。它只做三件事：读模型的属性来决定显示什么；把控件绑定到模型的属性；把用户的操作转成对模型方法的调用。

`ArticleRow` 是一个“哑”视图：它只接收值和一个闭包，不知道模型的存在。这类叶子视图最容易复用和预览。

### 这算是 MVVM 吗

`ArticleListModel` 持有一个页面的状态和逻辑，这和很多人说的“ViewModel”是同一个东西。叫它什么都可以。值得注意的只有两点：

- **不是每个视图都需要一个这样的对象。** 只有当一个页面有不平凡的状态和逻辑时才需要。一个只是显示几行文字、有一个开关的视图，用 `@State` 就够了。为每个视图机械地配一个 ViewModel，是 SwiftUI 项目里最常见的过度设计。
- **它不应该只是把模型的属性原样转发一遍。** 如果一个 ViewModel 的每个属性都是 `var title: String { model.title }`，它没有提供任何价值，直接用模型就好。

Apple 自己的示例项目和文档里通常把这类对象直接叫作“模型”（model）或“数据模型”，本教程也沿用这个叫法。

## 四、依赖怎么传

模型需要服务，页面需要模型。把这些依赖从创建它们的地方交到使用它们的地方，叫**依赖注入**。SwiftUI 有两条天然的通道。

### 通过初始化器

上面的例子就是这样：`ArticleListScreen(service:)`、`ArticleListModel(service:)`。优点是依赖关系一目了然，缺点是层级深时要一层层传。

### 通过环境

把服务放进环境，任何层级的视图都能取到：

```swift
extension EnvironmentValues {
    @Entry var articleService: any ArticleService = RemoteArticleService(
        baseURL: URL(string: "https://api.example.com")!
    )
}

struct ArticleTab: View {
    @Environment(\.articleService) private var service

    var body: some View {
        ArticleListScreen(service: service)
    }
}
```

`@Entry` 的默认值就是生产环境用的真实服务。测试和预览时覆盖它：

```swift
nonisolated struct PreviewArticleService: ArticleService {
    var articles: [Article] = [
        Article(id: 1, title: "SwiftUI 布局原理", summary: "父视图提议，子视图回应。", isBookmarked: true),
        Article(id: 2, title: "动画的本质", summary: "两个状态之间的插值。"),
        Article(id: 3, title: "多端统一", summary: "一次学习，到处应用。"),
    ]
    var shouldFail = false
    var delay: Duration = .milliseconds(300)

    func fetchArticles() async throws -> [Article] {
        try await Task.sleep(for: delay)
        if shouldFail { throw URLError(.notConnectedToInternet) }
        return articles
    }

    func setBookmark(_ isBookmarked: Bool, for id: Int) async throws {}
}

#Preview("正常") {
    ArticleListScreen(service: PreviewArticleService())
}

#Preview("加载失败") {
    ArticleListScreen(service: PreviewArticleService(shouldFail: true))
}

#Preview("空列表") {
    ArticleListScreen(service: PreviewArticleService(articles: []))
}

#Preview("加载很慢") {
    ArticleListScreen(service: PreviewArticleService(delay: .seconds(5)))
}
```

这就是把服务定义成协议的回报：**不需要网络，不需要服务器，四种状态的界面都能在预览里直接看到。** 加载失败和空列表这类平时很难触发的状态，在这里只是换一个参数。

::: tip 预览驱动开发
把“每个页面至少有正常、空、错误、加载中四个预览”当作习惯。它迫使你把视图和真实的数据源解耦，这正是好架构的特征；同时它也是最快的开发方式，改一行代码立刻看到所有状态下的结果。
:::

### 应用级的模型

全应用共享的状态（当前用户、设置、数据库）在 `App` 里创建，注入环境（第 10 章）：

```swift nocheck
@main
struct ReaderApp: App {
    @State private var session = SessionModel()
    @State private var settings = SettingsModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
                .environment(settings)
        }
    }
}
```

## 导航也是状态

第 19 章讲过把导航路径放进 `@Observable` 的路由器。在架构层面，它的意义是：**“当前在哪个页面”是应用状态的一部分**，和其他状态一样可以被读取、修改、保存和测试。

```swift
enum AppRoute: Hashable {
    case article(Int)
    case author(String)
    case settings
}

@Observable
class AppRouter {
    var path: [AppRoute] = []
    var presentedSheet: SheetRoute?

    enum SheetRoute: Identifiable {
        case compose
        case profile(String)

        var id: String {
            switch self {
            case .compose: "compose"
            case .profile(let name): "profile-\(name)"
            }
        }
    }

    func open(_ route: AppRoute) { path.append(route) }
    func popToRoot() { path.removeAll() }

    func handle(_ url: URL) {
        // 把深层链接解析成路由。例如 myapp://article/42
        guard url.host() == "article", let id = Int(url.lastPathComponent) else { return }
        path = [.article(id)]
    }
}
```

路由器是一个普通的模型，可以像测试其他模型一样测试它：给一个 URL，检查 `path` 是否正确。

## 错误处理

异步操作会失败。把“怎么向用户展示错误”也当成状态来管理。两种常见的层次：

**页面级的错误**（加载失败，整页没内容可显示）：用上面的 `LoadState.failed`，在内容区显示错误和重试按钮。

**操作级的错误**（保存失败、删除失败，页面本身还在）：用一个可选的错误属性驱动 alert。

```swift
enum SaveError: LocalizedError {
    case offline
    case quotaExceeded

    var errorDescription: String? {
        switch self {
        case .offline: "无法连接到服务器"
        case .quotaExceeded: "存储空间已满"
        }
    }
}

@Observable
class EditorModel {
    var text = ""
    var saveError: SaveError?
    private(set) var isSaving = false

    func save() async {
        isSaving = true
        defer { isSaving = false }
        do {
            try await Task.sleep(for: .milliseconds(400))
            if text.count > 100 { throw SaveError.quotaExceeded }
        } catch let error as SaveError {
            saveError = error
        } catch {
            saveError = .offline
        }
    }
}

struct EditorScreen: View {
    @State private var model = EditorModel()

    var body: some View {
        VStack {
            TextEditor(text: $model.text)
                .border(.gray.opacity(0.3))
            Button(model.isSaving ? "保存中…" : "保存") {
                Task { await model.save() }
            }
            .disabled(model.isSaving)
        }
        .padding()
        .alert(error: $model.saveError) {
            Button("好") {}
        }
    }
}
```

错误是模型的一个属性。视图只负责把它呈现出来。

## 测试

三层结构的回报在测试时最明显：**模型层不依赖 SwiftUI，不依赖真实的网络，可以直接做单元测试。**

用 Swift Testing 框架（Xcode 16 起内置）：

```swift nocheck
import Testing
@testable import Reader

@MainActor
struct ArticleListModelTests {
    let sample = [
        Article(id: 1, title: "SwiftUI 布局", summary: "", isBookmarked: true),
        Article(id: 2, title: "动画原理", summary: ""),
        Article(id: 3, title: "SwiftUI 动画", summary: ""),
    ]

    @Test func loadingPopulatesArticles() async {
        let model = ArticleListModel(service: PreviewArticleService(articles: sample, delay: .zero))

        await model.load()

        #expect(model.loadState == .loaded)
        #expect(model.articles.count == 3)
    }

    @Test func failureSetsFailedState() async {
        let model = ArticleListModel(service: PreviewArticleService(shouldFail: true, delay: .zero))

        await model.load()

        guard case .failed = model.loadState else {
            Issue.record("应该进入失败状态")
            return
        }
        #expect(model.articles.isEmpty)
    }

    @Test(arguments: [
        ("SwiftUI", false, 2),
        ("动画", false, 2),
        ("", true, 1),
        ("SwiftUI", true, 1),
        ("不存在", false, 0),
    ])
    func filtering(searchText: String, bookmarkedOnly: Bool, expectedCount: Int) async {
        let model = ArticleListModel(service: PreviewArticleService(articles: sample, delay: .zero))
        await model.load()

        model.searchText = searchText
        model.showsBookmarkedOnly = bookmarkedOnly

        #expect(model.visibleArticles.count == expectedCount)
    }
}
```

- `@Test` 标记一个测试函数，`#expect` 检查一个条件。
- `@Test(arguments:)` 用一组参数把同一个测试跑多遍，适合测试筛选、校验这类规则。
- 测试类型标了 `@MainActor`，因为被测的模型隔离在主 actor 上。
- 用的是和预览**同一个**假服务。写一次，两处受益。

应该测什么：

| 值得测 | 不值得测 |
| --- | --- |
| 模型的业务规则：筛选、排序、校验、计算 | SwiftUI 的布局结果 |
| 状态转换：加载 → 成功 / 失败 | 系统组件的行为 |
| 边界情况：空数据、重复操作、取消 | 只是转发调用的代码 |
| 数据的编解码、迁移 | 颜色、间距这类视觉细节 |
| 路由解析 | |

视图层本身主要靠**预览**和少量的**界面测试**（XCUITest，自动化地操作真实的应用）来保证。因为视图里没有逻辑，需要测的东西也就很少。这是把逻辑移出视图的另一个理由。

::: info Swift 6.4 的测试改进
Swift 6.4 让 Swift Testing 和旧的 XCTest 可以互操作：在 Swift Testing 的测试里可以用 `XCTAssert`，在 XCTest 里也可以用 `#expect`。老项目可以逐个测试地迁移，不必一次性重写。
:::

## 项目的组织

### 按功能分，不按类型分

```text
不推荐（按类型）                  推荐（按功能）
├── Models/                      ├── Features/
│   ├── Article.swift            │   ├── Articles/
│   ├── User.swift               │   │   ├── Article.swift
│   └── Comment.swift            │   │   ├── ArticleListModel.swift
├── ViewModels/                  │   │   ├── ArticleListScreen.swift
│   ├── ArticleListModel.swift   │   │   ├── ArticleRow.swift
│   └── ProfileModel.swift       │   │   └── ArticleService.swift
├── Views/                       │   ├── Profile/
│   ├── ArticleListScreen.swift  │   │   └── …
│   ├── ArticleRow.swift         │   └── Settings/
│   └── ProfileScreen.swift      │       └── …
└── Services/                    ├── Shared/
    └── ArticleService.swift     │   ├── Components/
                                 │   └── Extensions/
                                 └── App/
```

改一个功能时，相关的文件都在一个目录里。删除一个功能时，删掉一个目录即可。按类型分的结构里，一个功能的文件散落在四个目录。

### 用 Swift Package 做模块化

应用变大以后，可以把功能或通用代码拆成本地的 Swift Package：

- **编译更快。** 没改动的模块不需要重新编译。预览也只编译当前模块。
- **边界清晰。** 一个模块只能用另一个模块里标了 `public` 的东西。“模型层不依赖界面层”可以由编译器强制执行。
- **可以单独测试和预览。**

一种常见的划分：`Models`（数据类型，不依赖任何界面框架）、`Services`、`DesignSystem`（颜色、通用组件、样式）、以及每个大功能一个包。

在 Swift Package 里别忘了：默认主 actor 隔离不会自动开启，需要在 `Package.swift` 的 target 里加 `swiftSettings: [.defaultIsolation(MainActor.self)]`（第 12 章），或者手动标注 `@MainActor`。

小项目不需要模块化。当编译时间开始影响效率，或者团队成员开始互相踩到对方的代码时，再考虑它。

## 认识几个架构名词

你会在社区里遇到这些说法。了解它们指什么，但不必急着采用。

| 名词 | 核心思想 | 适合 |
| --- | --- | --- |
| **MV**（Model-View） | 视图直接使用 `@Observable` 模型，没有额外的中间层。Apple 示例项目的风格 | 中小型应用。本章介绍的做法接近它 |
| **MVVM** | 每个页面配一个 ViewModel，持有该页面的状态和逻辑 | 页面逻辑复杂，需要大量单元测试 |
| **单向数据流**（TCA、Redux 风格） | 全应用的状态在一个 store 里；所有变化通过“动作”触发，由“reducer”这个纯函数处理 | 大型团队，需要严格的可预测性、完整的可测试性、时间旅行调试 |
| **Clean Architecture / VIPER** | 更多的分层：实体、用例、仓库、展示器、路由 | 非常大的、多团队的项目 |

这些方法不是互斥的，也没有唯一正确的答案。选择的依据是**项目的规模和团队的需要**，而不是哪个听起来更“专业”。

一条经验：**从最简单的结构开始，在感到痛的地方引入更多的结构。** 视图太大了就拆；逻辑在视图里测不了就移进模型；模型之间的协作变得混乱了再考虑更严格的数据流。在问题出现之前就引入的抽象，多半解决的是你没有的问题。

## 要避免的做法

**一、巨大的视图。** 一个文件几百行的 `body`。拆。

**二、视图里写业务逻辑。** 按钮的闭包里有二十行的网络请求、解析和错误处理。移进模型的方法。

**三、一个“上帝模型”装下所有状态。** 全应用只有一个 `AppState`，里面有几十个属性。按功能拆成多个模型。

**四、把模型的数据复制成 `@State`。** 违反单一数据源。视图直接读模型，需要临时编辑时才复制成草稿（第 20 章）。

**五、把可算出来的值存成状态。** `isValid`、`total`、`filteredItems` 都应该是计算属性。

**六、模型持有视图的东西。** 模型里出现 `Color`、`Image`、`Binding`、`NavigationPath` 以外的 SwiftUI 类型。模型说“状态是错误”，视图决定“错误显示成红色”。

**七、用单例到处取依赖。** `NetworkManager.shared` 写在模型的方法体里，这个模型就无法用假数据测试和预览。依赖从外面传进来。

**八、每个视图一个 ViewModel，哪怕它只有一个开关。** 简单的视图用 `@State`。

**九、为了“架构”而加的协议和层。** 只有一个实现、也不需要替换的东西，不需要协议。

**十、在 `init` 里做事。** 视图的 `init` 会被反复调用。副作用和昂贵的工作放进 `.task`。

## 小结

- SwiftUI 的视图已经承担了“绑定层”的职责。架构要回答的是：视图怎么拆、状态归谁、逻辑放哪、依赖怎么传。
- 视图默认拆成独立的 `View` 结构体，它建立了独立的更新边界；子视图只接收它需要的数据。
- 状态分三类：界面状态归视图的 `@State`，功能状态归页面持有的模型，应用状态归 `App` 层创建并经环境注入的模型。放得尽量低。
- 三层结构：视图描述界面并转发操作；模型持有状态和业务规则，不依赖 SwiftUI；服务与外部世界打交道，在后台运行。
- 把服务定义成协议，通过初始化器或环境注入，预览和测试时换成假的实现。
- 模型层用 Swift Testing 做单元测试；视图层靠预览和少量界面测试。
- 项目按功能组织；变大后用 Swift Package 模块化。
- 从简单开始，在感到痛的地方再加结构。

## 练习

1. 找一个你之前写的、所有东西都在一个视图里的练习。按本章的方法重构：先拆出子视图，再把逻辑移进一个 `@Observable` 模型，最后把数据来源抽成一个协议并提供假实现。
2. 为重构后的模型写至少五个 Swift Testing 测试，覆盖正常流程、失败、空数据和一个边界情况。
3. 为重构后的页面写四个预览：正常、空、错误、加载中。
4. 做一个状态归属的练习：一个购物应用有“商品列表页”“商品详情页”“购物车页”“结算页”。列出下面每份数据应该放在哪、用什么持有：搜索框的文字、当前选中的商品、购物车里的商品、详情页图片轮播的当前页、用户的收货地址、“加入购物车”按钮的加载状态、结算页的优惠码输入。
5. 把一个功能（比如文章列表）拆成一个本地的 Swift Package，只把页面的入口视图标为 `public`。体会模块边界对代码组织的影响。

## 官方文档

- [Managing model data in your app](https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app)
- [Managing user interface state](https://developer.apple.com/documentation/swiftui/managing-user-interface-state)
- [Model data（数据流总览）](https://developer.apple.com/documentation/swiftui/model-data)
- [Declaring a custom view](https://developer.apple.com/documentation/swiftui/declaring-a-custom-view)
- [Exploring the structure of a SwiftUI app](https://developer.apple.com/tutorials/swiftui-concepts/exploring-the-structure-of-a-swiftui-app)
- [Swift Testing](https://developer.apple.com/documentation/testing)
- [Defining test functions](https://developer.apple.com/documentation/testing/definingtests)
- [Organizing your code with local packages](https://developer.apple.com/documentation/xcode/organizing-your-code-with-local-packages)
- [Previews in Xcode](https://developer.apple.com/documentation/swiftui/previews-in-xcode)
- [Food Truck: Building a SwiftUI multiplatform app（可以参考的项目结构）](https://developer.apple.com/documentation/swiftui/food-truck-building-a-swiftui-multiplatform-app)
- [WWDC20：Data Essentials in SwiftUI](https://developer.apple.com/videos/play/wwdc2020/10040/)
- [WWDC24：Meet Swift Testing](https://developer.apple.com/videos/play/wwdc2024/10179/)
