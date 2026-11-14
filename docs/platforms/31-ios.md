# 31 iOS 与 iPadOS 专题

## 本章目标

- 了解 iOS 的交互惯例，知道哪些事情系统已经替你做了
- 掌握 iPhone 特有的界面配置：状态栏、方向、系统手势
- 理解 iPad 与 iPhone 的差别：多窗口、指针、键盘、菜单栏
- 用 `UIViewRepresentable` 和 `UIViewControllerRepresentable` 桥接 UIKit
- 把 SwiftUI 视图嵌入已有的 UIKit 应用
- 处理应用生命周期：启动、后台任务、URL、推送
- 了解 27.1 为可折叠设备新增的 API

前面三十章的内容，绝大部分在 iOS 和 macOS 上通用。这一章和下一章讲各自平台特有的部分，第 33 章再把它们合起来。

## iOS 的界面惯例

每个平台都有自己的一套“规矩”，用户已经习惯了它们。SwiftUI 的标准组件自动遵循这些规矩，这是它最大的价值之一。你需要知道这些规矩是什么，才能不去无意中破坏它们。

| 惯例 | SwiftUI 的对应 | 说明 |
| --- | --- | --- |
| 触摸目标至少 44 × 44 点 | `Button`、`Toggle` 等默认满足 | 自定义控件要自己保证（第 24 章） |
| 从左边缘向右滑返回上一页 | `NavigationStack` 自带 | 隐藏返回按钮或自定义导航栏可能破坏它 |
| 向下滑关闭 sheet | `.sheet` 自带 | 用 `interactiveDismissDisabled` 控制 |
| 大标题随滚动收缩 | `.navigationTitle` 自带 | |
| 点击状态栏回到顶部 | `ScrollView`、`List` 自带 | 一个页面有多个滚动视图时会失效 |
| 下拉刷新 | `.refreshable` | |
| 长按出现上下文菜单 | `.contextMenu` | |
| 动态字体 | 语义字体自动支持 | 第 14 章 |
| 深色模式 | 语义颜色自动支持 | 第 22 章 |
| 内容延伸到屏幕边缘，栏浮在上面 | 26 系列的 Liquid Glass | 第 23 章 |
| 主要操作放在拇指够得到的地方 | 26 系列搜索框默认在底部；`.bottomBar` | |

一条总的原则：**先用标准组件做出来，确认哪里不满足需求，再去定制那一处。** 一上来就自己画导航栏、自己实现返回手势，等于放弃了系统多年打磨的细节。

## iPhone 的界面配置

### 状态栏与系统覆盖层

```swift ios
struct ImmersiveReader: View {
    @State private var isImmersive = false

    var body: some View {
        ScrollView {
            Text(String(repeating: "这是一段用来阅读的长文字。", count: 80))
                .padding()
        }
        .onTapGesture {
            withAnimation { isImmersive.toggle() }
        }
        .statusBarHidden(isImmersive)                               // 隐藏状态栏
        .persistentSystemOverlays(isImmersive ? .hidden : .automatic)  // 淡化 Home 指示条
        .toolbarVisibility(isImmersive ? .hidden : .automatic, for: .navigationBar, .tabBar)
    }
}
```

| 修饰符 | 作用 |
| --- | --- |
| `.statusBarHidden(_:)` | 隐藏状态栏 |
| `.persistentSystemOverlays(_:)` | 控制 Home 指示条等系统覆盖层的可见性 |
| `.defersSystemGestures(on:)` | 让屏幕边缘的系统手势需要滑两次才触发。游戏和绘图应用用它防止误触 |
| `.preferredColorScheme(_:)` | 强制浅色或深色 |
| `.toolbarColorScheme(_:for:)` | 指定导航栏、标签栏的配色方案，间接影响状态栏文字的颜色 |

### 屏幕方向

应用支持哪些方向在 target 的 **General › Deployment Info** 里勾选（对应 Info.plist 的 `UISupportedInterfaceOrientations`）。SwiftUI 没有“只让这一个页面横屏”的修饰符。

SwiftUI 的做法是**不关心方向本身，只关心可用空间**。方向变化会反映为尺寸类别和容器尺寸的变化，第 8 章讲的自适应工具（`ViewThatFits`、`horizontalSizeClass`、`.adaptive` 网格）会自动响应。

```swift
struct OrientationAware: View {
    @Environment(\.verticalSizeClass) private var verticalSizeClass

    var body: some View {
        let layout = verticalSizeClass == .compact
            ? AnyLayout(HStackLayout(spacing: 20))        // 横屏：左右排
            : AnyLayout(VStackLayout(spacing: 20))        // 竖屏：上下排

        layout {
            RoundedRectangle(cornerRadius: 20).fill(.blue.gradient)
            VStack(alignment: .leading) {
                Text("标题").font(.title.bold())
                Text("横屏时文字在右边，竖屏时文字在下面。")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
    }
}
```

iPhone 横屏时垂直方向是紧凑的（`verticalSizeClass == .compact`），这是判断“高度很有限”的标准方式。

### 安全区域的各个部分

第 6、8 章讲了安全区域。iPhone 上它由这些部分组成：

```text
┌─────────────────────────┐
│   灵动岛 / 刘海 / 状态栏   │  ← 顶部安全区域
├─────────────────────────┤
│                         │
│        安全区域          │
│                         │
├─────────────────────────┤
│       Home 指示条        │  ← 底部安全区域
└─────────────────────────┘
横屏时左右两侧也有安全区域（刘海和圆角）
键盘弹出时，键盘区域计入底部安全区域
```

默认的布局已经正确处理了这些。需要记住的只有：背景用 `.ignoresSafeArea()` 延伸到边缘，内容留在安全区域内，底部固定的栏用 `safeAreaInset` 或 `safeAreaBar`。

## iPad：更大的屏幕，更多的输入方式

iPad 不是“大号的 iPhone”。它有自己的特点，这些特点让它更接近 Mac。

### 窗口

iPad 上的应用运行在**窗口**里。从 iPadOS 26 起，窗口可以自由调整大小、任意摆放、层叠，和 Mac 很像。这意味着：

- 你的应用的可用尺寸可以是**任意**的，从很窄的一条到全屏，而且随时在变。
- 水平尺寸类别会在 `.regular` 和 `.compact` 之间切换。
- 同一个应用可以同时开多个窗口（`WindowGroup` 的多个实例，第 2 章）。

所以 iPad 应用必须是真正自适应的。在设计界面时，**永远不要假设“这是 iPad，所以宽度够”**。把窗口拖到最窄，你的界面应该表现得和 iPhone 上一样。`NavigationSplitView` 和 `.sidebarAdaptable` 的 `TabView`（第 19 章）已经自动处理了这种变化。

打开一个新窗口：

```swift
struct OpenWindowButton: View {
    @Environment(\.openWindow) private var openWindow
    @Environment(\.supportsMultipleWindows) private var supportsMultipleWindows

    var body: some View {
        if supportsMultipleWindows {
            Button("在新窗口中打开", systemImage: "macwindow.badge.plus") {
                openWindow(id: "detail")
            }
        }
    }
}
```

`supportsMultipleWindows` 在 iPhone 上是 `false`，在 iPad 和 Mac 上是 `true`。窗口相关的 API 在下一章讲 macOS 时详细展开，它们在 iPad 上同样适用。

### 指针与键盘

iPad 可以连接触控板、鼠标和键盘。第 24 章讲的 `.onHover`、`.hoverEffect` 在这时生效。键盘快捷键也是：

```swift
struct KeyboardShortcutsDemo: View {
    @State private var log = "按 ⌘N、⌘S 或 ⌘⇧D 试试"

    var body: some View {
        VStack(spacing: 16) {
            Text(log)

            Button("新建") { log = "新建" }
                .keyboardShortcut("n", modifiers: .command)

            Button("保存") { log = "保存" }
                .keyboardShortcut("s")                                // modifiers 默认就是 .command

            Button("复制一份") { log = "复制一份" }
                .keyboardShortcut("d", modifiers: [.command, .shift])
        }
        .padding()
    }
}
```

在接了键盘的 iPad 上，按住 <kbd>⌘</kbd> 键会显示当前可用的快捷键列表。给主要操作加上快捷键几乎没有成本，对键盘用户却是很大的便利。

### 菜单栏

从 iPadOS 26 起，iPad 有了和 Mac 一样的菜单栏（从屏幕顶部下滑，或把指针移到顶部时出现）。它的内容来自场景上的 `.commands` 修饰符，和 macOS 用的是同一套 API：

```swift nocheck
@main
struct NotesApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .commands {
            CommandMenu("笔记") {
                Button("新建笔记") { }
                    .keyboardShortcut("n")
                Button("归档") { }
                    .keyboardShortcut("e", modifiers: [.command, .shift])
            }
        }
    }
}
```

`commands` 的完整用法在下一章讲。这里要知道的是：**为 Mac 写的菜单命令，在 iPad 上自动可用。**

### 拖放

iPad 上应用之间的拖放很常见（从照片拖一张图到备忘录）。第 25 章的 `draggable` 和 `dropDestination` 就是为此设计的。

## 桥接 UIKit

SwiftUI 覆盖了绝大部分界面需求，但总有一些它没有的东西：某个第三方 SDK 提供的是 `UIView`、某个系统功能只有 UIKit 的 API、你有一个现成的复杂自定义视图。这时需要把 UIKit 的视图“包”进 SwiftUI。

### UIViewRepresentable

```swift ios
import UIKit

struct ActivityIndicator: UIViewRepresentable {
    var isAnimating: Bool
    var style: UIActivityIndicatorView.Style = .large

    // 创建：只调用一次
    func makeUIView(context: Context) -> UIActivityIndicatorView {
        let view = UIActivityIndicatorView(style: style)
        view.hidesWhenStopped = false
        return view
    }

    // 更新：每当 SwiftUI 的状态变化时调用
    func updateUIView(_ uiView: UIActivityIndicatorView, context: Context) {
        if isAnimating {
            uiView.startAnimating()
        } else {
            uiView.stopAnimating()
        }
    }
}

struct ActivityIndicatorDemo: View {
    @State private var isAnimating = true

    var body: some View {
        VStack(spacing: 20) {
            ActivityIndicator(isAnimating: isAnimating)
            Toggle("转动", isOn: $isAnimating).fixedSize()
        }
    }
}
```

协议有两个必须实现的方法，它们对应着两个世界的衔接：

| 方法 | 调用时机 | 职责 |
| --- | --- | --- |
| `makeUIView(context:)` | 视图第一次出现时，只调用**一次** | 创建并做一次性配置 |
| `updateUIView(_:context:)` | 之后每次 SwiftUI 状态变化时 | 把 SwiftUI 这边的最新状态同步到 UIKit 视图上 |

理解它的关键是这个对应关系：**SwiftUI 是声明式的，UIKit 是命令式的。`updateUIView` 就是把“现在的状态是什么”翻译成“应该对这个视图做什么操作”的地方。** 这正是第 1 章里我们说命令式 UI 需要手动同步的那部分工作，现在集中在了这一个方法里。

::: warning updateUIView 会被频繁调用
任何相关的状态变化都会触发它。所以里面应该只做“把状态同步到视图”这件事，并且尽量先比较再设置，避免无谓的操作。不要在里面创建子视图或执行昂贵的工作。
:::

### Coordinator：把 UIKit 的事件传回 SwiftUI

UIKit 的视图通过委托（delegate）和目标-动作（target-action）回调事件，它们需要一个**对象**来接收。结构体 `UIViewRepresentable` 自己不行，所以有了协调器（Coordinator）：

```swift ios
struct SearchField: UIViewRepresentable {
    @Binding var text: String
    var placeholder = ""
    var onSearch: (String) -> Void = { _ in }

    func makeUIView(context: Context) -> UISearchBar {
        let searchBar = UISearchBar()
        searchBar.placeholder = placeholder
        searchBar.searchBarStyle = .minimal
        searchBar.delegate = context.coordinator          // 协调器作为委托
        return searchBar
    }

    func updateUIView(_ uiView: UISearchBar, context: Context) {
        if uiView.text != text {                          // 先比较，避免循环更新
            uiView.text = text
        }
        context.coordinator.parent = self                 // 让协调器拿到最新的闭包和绑定
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    final class Coordinator: NSObject, UISearchBarDelegate {
        var parent: SearchField

        init(parent: SearchField) {
            self.parent = parent
        }

        func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
            parent.text = searchText                      // UIKit → SwiftUI
        }

        func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
            parent.onSearch(searchBar.text ?? "")
            searchBar.resignFirstResponder()
        }
    }
}

struct SearchFieldDemo: View {
    @State private var query = ""
    @State private var submitted = ""

    var body: some View {
        VStack(alignment: .leading) {
            SearchField(text: $query, placeholder: "搜索") { submitted = $0 }
            Text("正在输入：\(query)")
            Text("已提交：\(submitted)")
        }
        .padding()
    }
}
```

数据的两个方向：

```text
SwiftUI 状态 ──── updateUIView ────▶ UIKit 视图
SwiftUI 状态 ◀─── Coordinator ───── UIKit 视图的委托回调
```

- `makeCoordinator()` 创建协调器。它在 `makeUIView` 之前被调用，生命周期和视图一样长。
- 协调器是一个类，可以遵循 UIKit 的委托协议。
- `updateUIView` 里的 `if uiView.text != text` 很重要。没有这个判断，会出现“SwiftUI 更新 UIKit → UIKit 触发委托 → 委托更新 SwiftUI → SwiftUI 再更新 UIKit”的循环。

（这个例子是为了演示协调器。实际项目里搜索功能请用 `.searchable`。）

### 尺寸与清理

```swift ios
struct FixedSizeUIKitView: UIViewRepresentable {
    func makeUIView(context: Context) -> UILabel {
        let label = UILabel()
        label.text = "来自 UIKit 的标签"
        label.setContentHuggingPriority(.required, for: .horizontal)    // 让 SwiftUI 知道它想贴合内容
        return label
    }

    func updateUIView(_ uiView: UILabel, context: Context) {}

    // 可选：自己回答“我要多大”
    func sizeThatFits(_ proposal: ProposedViewSize, uiView: UILabel, context: Context) -> CGSize? {
        uiView.sizeThatFits(CGSize(width: proposal.width ?? .infinity, height: proposal.height ?? .infinity))
    }

    // 可选：视图被移除时清理资源
    static func dismantleUIView(_ uiView: UILabel, coordinator: ()) {
        // 停止计时器、移除观察者等
    }
}
```

- 被桥接的视图默认会**占满提议的空间**（来者不拒）。通过 UIKit 的内容吸附优先级，或者实现 `sizeThatFits`，可以让它贴合内容。
- `dismantleUIView` 是静态方法，在视图被销毁时调用。

`context` 参数里还有 `context.environment`（SwiftUI 的环境值，可以读取配色方案、语言等）和 `context.transaction`（当前的动画事务）。

### UIViewControllerRepresentable

桥接整个视图控制器，用法完全对应：

```swift ios
import SafariServices

struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}

struct SafariDemo: View {
    @State private var isPresented = false

    var body: some View {
        Button("在应用内打开网页") { isPresented = true }
            .sheet(isPresented: $isPresented) {
                SafariView(url: URL(string: "https://developer.apple.com")!)
                    .ignoresSafeArea()
            }
    }
}
```

系统提供的很多现成界面是视图控制器：`SFSafariViewController`（应用内浏览器）、`MFMailComposeViewController`（写邮件）、`UIDocumentPickerViewController`、`VNDocumentCameraViewController`（文档扫描）等。在桥接之前先确认 SwiftUI 有没有原生的替代：`ShareLink`、`PhotosPicker`、`fileImporter`、`WebView`、`Map` 都已经有了（第 25 章）。

## 在 UIKit 应用里使用 SwiftUI

反过来的方向同样重要。很多团队有一个庞大的 UIKit 应用，不可能一次重写。正确的迁移方式是**逐步**的：新界面用 SwiftUI 写，嵌入现有的 UIKit 结构里。

### UIHostingController

`UIHostingController` 是一个包着 SwiftUI 视图的视图控制器，可以用在任何需要视图控制器的地方：

```swift ios
import UIKit

struct ProfileScreen2: View {
    let name: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.crop.circle.fill").font(.system(size: 80))
            Text(name).font(.title)
        }
    }
}

final class LegacyListViewController: UIViewController {
    func showProfile() {
        let hosting = UIHostingController(rootView: ProfileScreen2(name: "小明"))
        hosting.title = "个人资料"
        navigationController?.pushViewController(hosting, animated: true)   // 像普通的视图控制器一样使用
    }
}
```

SwiftUI 视图需要的数据通过初始化参数传入。要让它随数据变化更新，传一个 `@Observable` 模型对象进去（第 10 章），UIKit 这边修改模型，SwiftUI 视图自动刷新。

### 在列表单元格里用 SwiftUI

`UIHostingConfiguration` 让 `UICollectionView` 和 `UITableView` 的单元格内容可以直接用 SwiftUI 写：

```swift ios
import UIKit

final class MessageCell: UICollectionViewListCell {
    func configure(title: String, isUnread: Bool) {
        contentConfiguration = UIHostingConfiguration {
            HStack {
                Circle()
                    .fill(isUnread ? .blue : .clear)
                    .frame(width: 8, height: 8)
                Text(title)
                Spacer()
            }
        }
    }
}
```

这是迁移的一个很好的切入点：列表的结构和性能优化保留在 UIKit 里，每个单元格的界面用 SwiftUI 重写。

### UIKit 也能观察 @Observable

从 iOS 26 起（并可向后部署到 iOS 18），UIKit 的 `updateProperties()`、`layoutSubviews()` 等方法会自动追踪其中读取的 `@Observable` 属性，属性变化时自动重新调用。这意味着同一个 `@Observable` 模型可以同时驱动 SwiftUI 视图和 UIKit 视图，混合应用里的数据层可以完全统一。

## 应用生命周期与系统事件

### 需要 AppDelegate 的时候

SwiftUI 的 `App` 协议覆盖了大部分生命周期需求。少数功能仍然需要应用委托（注册推送通知、某些第三方 SDK 的初始化）。用 `@UIApplicationDelegateAdaptor` 接入：

```swift ios nocheck
import UIKit

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        application.registerForRemoteNotifications()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // 把 deviceToken 发给你的服务器
    }
}

@main
struct MyApp: App {
    @UIApplicationDelegateAdaptor private var appDelegate: AppDelegate

    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
```

如果让 `AppDelegate` 遵循 `Observable`，它会被自动放进环境，视图里可以用 `@Environment(AppDelegate.self)` 取到。

### 前后台切换

第 2 章讲过 `scenePhase`。典型用法：

```swift
struct LifecycleAware: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var lastSaved = Date.now

    var body: some View {
        Text("上次保存：\(lastSaved.formatted(date: .omitted, time: .standard))")
            .onChange(of: scenePhase) { _, newPhase in
                switch newPhase {
                case .background:
                    lastSaved = .now              // 进入后台：保存数据
                case .active:
                    break                         // 回到前台：刷新内容
                case .inactive:
                    break
                @unknown default:
                    break
                }
            }
    }
}
```

应用进入后台后只有很短的时间可以执行代码，随后会被挂起，并且可能在不通知的情况下被终止。所以**进入后台就是保存数据的时机**。

### 后台任务

想让系统在后台定期唤醒应用（刷新数据、处理推送），在场景上声明后台任务：

```swift nocheck
@main
struct NewsApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
            .backgroundTask(.appRefresh("com.example.news.refresh")) {
                await refreshHeadlines()          // 系统在合适的时机唤醒应用并执行
            }
    }
}
```

除了声明处理逻辑，还需要：在 Info.plist 的 `BGTaskSchedulerPermittedIdentifiers` 里登记标识符，开启 Background Modes 能力，并用 `BGTaskScheduler` 提交请求。系统根据用户的使用习惯和电量决定何时真正执行，不保证时间。

### 响应 URL 与接力

```swift
struct DeepLinkHandling: View {
    @State private var message = "等待链接"

    var body: some View {
        Text(message)
            .onOpenURL { url in
                // 自定义 URL scheme（myapp://…）或通用链接（https://…）打开应用时调用
                message = "打开了：\(url.absoluteString)"
            }
            .onContinueUserActivity("com.example.viewArticle") { activity in
                // 接力（Handoff）、聚焦搜索结果等
                message = "继续活动：\(activity.title ?? "")"
            }
    }
}
```

把 URL 解析成路由，赋给第 19 章的导航路径，就实现了深层链接。

### 权限

访问相机、麦克风、位置、通讯录、照片库（读取全部）等，都需要用户授权，并且**必须**在 Info.plist 里提供说明文字（`NSCameraUsageDescription` 等），否则应用会在请求权限时直接崩溃。

几条原则：

- **在需要的那一刻才请求**，不要一启动就弹一串授权框。用户在理解“为什么需要”的时候更愿意同意。
- **优先用不需要权限的方案**：`PhotosPicker` 不需要相册权限，`PasteButton` 不触发粘贴提示，`ShareLink` 不需要通讯录权限。
- **被拒绝后要能正常工作**，并在合适的地方引导用户去设置里开启。

## 为可折叠设备做准备 <Badge type="tip" text="iOS 27.1+" />

官方的 SwiftUI 更新记录在 2026 年 9 月加入了一组针对可折叠 iPhone（文档中称为 iPhone Duo）的 API。它们解决折叠设备带来的两个新问题：屏幕中间有一条折痕，以及设备可以处于半开的状态。

**保留区域**：界面上被硬件占据或分割的区域（摄像头开孔、折痕）。可以通过 `GeometryProxy` 查询它们的位置，让重要内容避开：

```swift ios
@available(iOS 27.1, *)
struct HingeAwareLayout: View {
    @State private var divisionRects: [CGRect] = []

    var body: some View {
        Color.clear
            .onGeometryChange(for: [CGRect].self) { proxy in
                proxy.reservedRegions(kind: .division).map(\.frame)
            } action: { rects in
                divisionRects = rects
            }
            .overlay {
                Text(divisionRects.isEmpty ? "屏幕上没有分割区域" : "检测到 \(divisionRects.count) 处分割")
            }
    }
}
```

**铰链状态**：用 `.onHingeChange` 得知设备的开合角度和状态（合上、半开、完全打开），据此调整界面。例如半开立在桌上时，把视频放在上半屏、控制按钮放在下半屏。

```swift ios
@available(iOS 27.1, *)
struct HingeObserver: View {
    @State private var description = "未知"

    var body: some View {
        Text("铰链：\(description)")
            .onHingeChange { _, newContext in
                if let hinge = newContext.hinge {
                    description = "\(Int(hinge.angle.degrees))°"
                } else {
                    description = "此设备没有铰链"
                }
            }
    }
}
```

对大多数应用来说，更省事的做法是使用第 8 章介绍的 `ArrangementView`：你声明主要内容和次要内容，系统会根据设备的折叠状态自动决定是并排、上下分布还是叠放，并自动避开折痕。直接读取保留区域和铰链状态，是为需要完全自定义布局的应用准备的。

这是一组很新的 API。用到时请以章末的官方文档为准。

## iOS 上其他的 SwiftUI 界面

SwiftUI 不只用于应用的主界面。iOS 上这些地方的界面也是（而且只能）用 SwiftUI 写的：

| 场景 | 框架 | 特点 |
| --- | --- | --- |
| 主屏幕、锁屏、待机模式的小组件 | WidgetKit | 界面是某个时间点的静态快照；26 系列支持玻璃质感的着色模式 |
| 灵动岛和锁屏的实时活动 | ActivityKit | 显示正在进行的事情：外卖、比赛、计时 |
| 控制中心的控件 | WidgetKit 的 `ControlWidget` | 一个按钮或开关 |
| App Clip | 普通的 SwiftUI 应用，体积受限 | 不用安装就能使用的轻量版本 |
| Apple Watch 应用 | watchOS 的 SwiftUI | |

这些场景对视图有限制（不能随意交互、不能用任意的动画），但布局、文字、图像、形状的知识完全通用。

## 常见误区

**误区一：“自己画导航栏更灵活。”** 你会失去侧滑返回、大标题收缩、滚动边缘效果、无障碍支持和未来系统设计更新的自动适配。用 `toolbar` 定制系统的导航栏。

**误区二：“iPad 版就是把 iPhone 版拉宽。”** iPad 有窗口、指针、键盘、菜单栏。用 `NavigationSplitView`、键盘快捷键、`commands`、悬停效果，让它成为一个真正的 iPad 应用。

**误区三：“判断 `UIDevice.current.userInterfaceIdiom == .pad` 来决定布局。”** iPad 上的窗口可以很窄。根据尺寸类别和可用空间决定布局。

**误区四：“`updateUIView` 里重新创建子视图。”** 它会被频繁调用。创建放在 `makeUIView`，`updateUIView` 只同步状态。

**误区五：“UIKit 的委托回调直接写在 `UIViewRepresentable` 结构体里。”** 结构体不能作为委托。用 `Coordinator`。

**误区六：“有 UIKit 的旧应用就没法用 SwiftUI。”** `UIHostingController` 和 `UIHostingConfiguration` 让你可以一个界面一个界面地迁移。

**误区七：“一启动就请求所有权限。”** 在用户触发相关功能时再请求。

## 小结

- 标准组件自动遵循 iOS 的交互惯例。先用标准组件，再定制不满足需求的部分。
- iPhone 的界面配置：`statusBarHidden`、`persistentSystemOverlays`、`defersSystemGestures`。方向变化通过尺寸类别体现，SwiftUI 关心的是可用空间。
- iPad 的应用运行在可以任意调整大小的窗口里，要真正自适应；支持指针、键盘快捷键，iPadOS 26 起有菜单栏。
- `UIViewRepresentable` 的 `make` 创建一次，`update` 同步状态，`Coordinator` 接收 UIKit 的委托回调。
- `UIHostingController` 和 `UIHostingConfiguration` 把 SwiftUI 嵌入 UIKit，支持逐步迁移。
- `@UIApplicationDelegateAdaptor` 接入应用委托；`scenePhase` 感知前后台；`.backgroundTask` 声明后台任务；`.onOpenURL` 处理链接。
- 27.1 为可折叠设备增加了保留区域和铰链状态的 API，多数应用用 `ArrangementView` 即可。

## 练习

1. 用 `UIViewRepresentable` 包装 `UIProgressView`，提供 `progress` 和 `tint` 两个参数。在 SwiftUI 里用滑块控制它。
2. 包装 `UIPageControl`（页码圆点）：绑定当前页码，用户点击圆点时能把新页码传回 SwiftUI。配合第 18 章的分页滚动做一个完整的轮播。
3. 给一个页面的三个主要按钮加上键盘快捷键，并用 `.onHover` 给它们加上悬停高亮。在 iPad 模拟器里连接硬件键盘测试。
4. 实现一个简单的深层链接：`myapp://item/42` 打开应用并直接导航到第 42 项的详情页。（需要在 target 的 Info › URL Types 里登记 scheme。）
5. 新建一个 UIKit 模板的项目，在其中用 `UIHostingController` 推入一个 SwiftUI 写的设置页面，并通过一个 `@Observable` 模型让两边共享一个开关的状态。

## 官方文档

- [`UIViewRepresentable`](https://developer.apple.com/documentation/swiftui/uiviewrepresentable)
- [`UIViewControllerRepresentable`](https://developer.apple.com/documentation/swiftui/uiviewcontrollerrepresentable)
- [`UIHostingController`](https://developer.apple.com/documentation/swiftui/uihostingcontroller)
- [`UIHostingConfiguration`](https://developer.apple.com/documentation/swiftui/uihostingconfiguration)
- [UIKit integration（专题总览）](https://developer.apple.com/documentation/swiftui/uikit-integration)
- [`UIApplicationDelegateAdaptor`](https://developer.apple.com/documentation/swiftui/uiapplicationdelegateadaptor)
- [`backgroundTask(_:action:)`](https://developer.apple.com/documentation/swiftui/scene/backgroundtask(_:action:))
- [`onOpenURL(perform:)`](https://developer.apple.com/documentation/swiftui/view/onopenurl(perform:))
- [`keyboardShortcut(_:modifiers:)`](https://developer.apple.com/documentation/swiftui/view/keyboardshortcut(_:modifiers:))
- [`statusBarHidden(_:)`](https://developer.apple.com/documentation/swiftui/view/statusbarhidden(_:))
- [`persistentSystemOverlays(_:)`](https://developer.apple.com/documentation/swiftui/view/persistentsystemoverlays(_:))
- [`ReservedRegion`](https://developer.apple.com/documentation/swiftui/reservedregion)
- [`DeviceHinge`](https://developer.apple.com/documentation/swiftui/devicehinge)
- [SwiftUI 更新记录（September 2026：Arrangement views、Reserved regions、Hinge）](https://developer.apple.com/documentation/updates/swiftui)
- [Human Interface Guidelines：Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios)
- [Human Interface Guidelines：Designing for iPadOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados)
- [WWDC25：Elevate the design of your iPad app](https://developer.apple.com/videos/play/wwdc2025/208/)
