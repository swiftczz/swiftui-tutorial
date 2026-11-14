# 25 系统能力：分享、拖放、照片、地图、图表

## 本章目标

- 理解 `Transferable`：一次定义，分享、拖放、拷贝粘贴通用
- 用 `ShareLink` 调起系统分享
- 实现拖放：`draggable` 与 `dropDestination`
- 用 `fileImporter`、`fileExporter` 读写用户文件
- 用 `PhotosPicker` 选取照片
- 认识几个与 SwiftUI 深度集成的系统框架：MapKit、Swift Charts、WebKit、AVKit

这一章是一个导览。每个主题都足够写一整本书，这里的目标是让你知道**有什么**、**最基本的用法是什么**、**去哪里查**。

## Transferable：数据怎么离开你的应用

分享、拖放、拷贝粘贴，本质上是同一件事：把应用里的一份数据交给系统或其他应用。SwiftUI 用 `Transferable` 协议统一描述“这份数据可以用哪些格式传输”。

很多系统类型已经遵循了它：`String`、`URL`、`Data`、`Image`、`AttributedString`、`Color`。自己的类型需要声明传输表示：

```swift
import UniformTypeIdentifiers

nonisolated struct Recipe2: Codable, Identifiable, Sendable, Transferable {
    var id = UUID()
    var name: String
    var steps: [String]

    static var transferRepresentation: some TransferRepresentation {
        CodableRepresentation(contentType: .recipe)          // 完整数据：应用内部或同款应用之间使用
        ProxyRepresentation(exporting: \.summary)            // 降级为纯文本：其他应用也能接收
    }

    var summary: String {
        "\(name)\n" + steps.enumerated().map { "\($0 + 1). \($1)" }.joined(separator: "\n")
    }
}

extension UTType {
    nonisolated static let recipe = UTType(exportedAs: "com.example.recipe")
}
```

- `CodableRepresentation`：把遵循 `Codable` 的类型编码成数据传输。
- `ProxyRepresentation`：用另一个已经是 `Transferable` 的类型来代表自己。这里导出为 `String`。
- `DataRepresentation`、`FileRepresentation`：自己控制二进制数据或文件的导入导出。

**顺序很重要**：写在前面的表示优先。接收方会选择它支持的第一种格式。所以把信息最完整的表示放前面，最通用的放后面。

`UTType`（统一类型标识符）描述数据的类型。自定义类型除了在代码里声明，还需要在 target 的 **Info › Exported Type Identifiers** 里登记。

这里的 `Recipe2` 标了 `nonisolated`，理由和前面几章一样：它是纯数据，而且传输可能发生在后台线程。扩展里的 `static let recipe` 也要标 `nonisolated`，否则在默认主 actor 隔离的项目里它会被隔离到主 actor，`transferRepresentation` 里就用不了它，编译器会报 *main actor-isolated static property 'recipe' can not be referenced from a nonisolated context*。

## ShareLink：系统分享

```swift
struct ShareDemo: View {
    let url = URL(string: "https://developer.apple.com/swiftui/")!
    let recipe = Recipe2(name: "番茄炒蛋", steps: ["打蛋", "切番茄", "炒"])

    var body: some View {
        VStack(spacing: 16) {
            ShareLink(item: url)

            ShareLink("分享链接", item: url, subject: Text("推荐一个网站"), message: Text("SwiftUI 官方页面"))

            ShareLink(item: recipe, preview: SharePreview(recipe.name, image: Image(systemName: "fork.knife"))) {
                Label("分享菜谱", systemImage: "square.and.arrow.up")
            }
            .buttonStyle(.borderedProminent)
        }
    }
}
```

`ShareLink` 是一个按钮，点击后弹出系统的分享面板（iOS）或分享菜单（macOS）。它接受任何 `Transferable` 的值。

- 分享 `URL`、`String` 这类系统能识别的类型时，预览会自动生成。
- 分享自定义类型时，要用 `SharePreview` 提供标题和图片。
- `subject` 和 `message` 是给邮件、信息等目标用的附加文字。

## 拖放

### 基础：draggable 与 dropDestination

```swift
struct DragDropBasics: View {
    @State private var inbox = ["买牛奶", "写周报", "订机票"]
    @State private var done: [String] = []
    @State private var isTargeted = false

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("待办").font(.headline)
                ForEach(inbox, id: \.self) { item in
                    Text(item)
                        .padding(8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.blue.opacity(0.15), in: .rect(cornerRadius: 8))
                        .draggable(item)
                }
            }
            .frame(maxWidth: .infinity)

            VStack(alignment: .leading, spacing: 8) {
                Text("已完成").font(.headline)
                ForEach(done, id: \.self) { item in
                    Text(item).strikethrough().padding(8)
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, minHeight: 160, alignment: .topLeading)
            .padding(8)
            .background(isTargeted ? .green.opacity(0.25) : .gray.opacity(0.1), in: .rect(cornerRadius: 12))
            .dropDestination(for: String.self) { items, _ in
                done.append(contentsOf: items)
                inbox.removeAll { items.contains($0) }
                return true
            } isTargeted: { targeted in
                isTargeted = targeted
            }
        }
        .padding()
    }
}
```

- `.draggable(_:)` 让视图可以被拖起来，参数是要传输的值（任何 `Transferable`）。
- `.dropDestination(for:action:isTargeted:)` 让视图可以接收放下的内容。`action` 收到放下的值和位置，返回是否接受。`isTargeted` 在有内容悬停在上方时回调，用来给出高亮反馈。

因为用的是 `Transferable`，这套拖放**跨应用也能工作**：在 iPad 分屏或 Mac 上，可以把文字从你的应用拖到备忘录，也可以从 Safari 把文字拖进你的应用。

自定义拖动时显示的预览：

```swift
struct DragPreviewDemo: View {
    var body: some View {
        Label("拖我", systemImage: "hand.draw")
            .padding()
            .background(.orange.opacity(0.2), in: .capsule)
            .draggable("被拖动的文字") {
                Text("正在拖动")
                    .padding()
                    .background(.orange, in: .capsule)
                    .foregroundStyle(.white)
            }
    }
}
```

### 列表里的拖放

`ForEach` 上的 `.dropDestination` 可以接收放到列表**某个位置**的内容：

```swift
struct ListDropDemo: View {
    @State private var items = ["第一项", "第二项", "第三项"]

    var body: some View {
        List {
            ForEach(items, id: \.self) { item in
                Text(item).draggable(item)
            }
            .dropDestination(for: String.self) { dropped, index in
                items.insert(contentsOf: dropped, at: index)
            }
        }
    }
}
```

如果只是在同一个列表内部调整顺序，用第 17 章的 `.onMove` 或 `.reorderable()` 更合适。拖放用于在不同容器、不同应用之间移动数据。

### 多项拖放与拖放配置 <Badge type="tip" text="macOS 26+ / iOS 27+" />

这组 API 先在 macOS 26 上出现，iOS 和 iPadOS 从 27 开始支持：`.dragContainer` 让一个容器支持一次拖动多个选中项；`.dragConfiguration`、`.dropConfiguration` 可以指定这次拖放是“移动”还是“拷贝”；`.onDragSessionUpdated` 可以观察拖动会话的进展（比如拖到废纸篓时删除原数据）。这些主要用于 Mac 和 iPad 上的文件管理类应用，具体用法见章末的官方文档。

## 拷贝与粘贴

```swift
struct CopyPasteDemo: View {
    @State private var text = "一段可以拷贝的文字"
    @State private var pasted = "粘贴的内容会出现在这里"

    var body: some View {
        VStack(spacing: 16) {
            Text(text)
                .textSelection(.enabled)

            Text(pasted)
                .foregroundStyle(.secondary)

            PasteButton(payloadType: String.self) { strings in
                pasted = strings.first ?? ""
            }
        }
        .padding()
    }
}
```

- `.textSelection(.enabled)`（第 14 章）让文字可以被选中拷贝，这是最简单的方式。
- `PasteButton` 是系统提供的粘贴按钮。用户点击它即表示同意，所以不会弹出“允许粘贴”的询问。在 iOS 上直接用代码读取剪贴板会触发权限提示，`PasteButton` 是推荐的做法。

macOS 和接了键盘的 iPad 上，用户期望 <kbd>⌘C</kbd> / <kbd>⌘V</kbd> 和“编辑”菜单对选中的内容生效。给可聚焦的视图加上：

```swift
struct KeyboardCopyPaste: View {
    @State private var items = ["甲", "乙", "丙"]
    @State private var selection: String?

    var body: some View {
        List(items, id: \.self, selection: $selection) { Text($0) }
            .copyable(selection.map { [$0] } ?? [])
            .pasteDestination(for: String.self) { strings in
                items.append(contentsOf: strings)
            }
    }
}
```

- `.copyable(_:)`：视图获得焦点时，“拷贝”命令拷贝这些值。
- `.cuttable(for:action:)`：支持“剪切”。
- `.pasteDestination(for:action:)`：支持“粘贴”。

这三个修饰符长期只有 macOS 可用，27 系列的 SDK 把它们扩展到了更多平台。

## 读写用户文件

### fileImporter：让用户选择文件

```swift
struct FileImportDemo: View {
    @State private var isImporting = false
    @State private var content = "还没有选择文件"

    var body: some View {
        VStack(spacing: 16) {
            Button("打开文本文件…") { isImporting = true }

            ScrollView {
                Text(content).font(.callout.monospaced())
            }
            .frame(height: 160)
        }
        .padding()
        .fileImporter(isPresented: $isImporting, allowedContentTypes: [.plainText, .json]) { result in
            switch result {
            case .success(let url):
                let accessing = url.startAccessingSecurityScopedResource()
                defer { if accessing { url.stopAccessingSecurityScopedResource() } }
                content = (try? String(contentsOf: url, encoding: .utf8)) ?? "读取失败"
            case .failure(let error):
                content = "出错：\(error.localizedDescription)"
            }
        }
    }
}
```

- `allowedContentTypes` 限定可选的文件类型。
- 加 `allowsMultipleSelection: true` 支持多选，结果变成 `[URL]`。
- 用户选中的文件在你的应用沙盒之外。访问它之前要调用 `startAccessingSecurityScopedResource()`，用完后调用 `stop...`。忘了这一步是“读取失败”最常见的原因。

### fileExporter：让用户选择保存位置

导出需要一个描述“文件内容怎么写”的文档类型：

```swift
nonisolated struct TextFile: FileDocument {
    static let readableContentTypes: [UTType] = [.plainText]
    var text = ""

    init(text: String) { self.text = text }

    init(configuration: ReadConfiguration) throws {
        let data = configuration.file.regularFileContents ?? Data()
        text = String(decoding: data, as: UTF8.self)
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: Data(text.utf8))
    }
}

struct FileExportDemo: View {
    @State private var isExporting = false
    @State private var text = "要导出的内容"
    @State private var status = ""

    var body: some View {
        VStack(spacing: 12) {
            TextEditor(text: $text).frame(height: 100).border(.gray.opacity(0.3))
            Button("导出…") { isExporting = true }
            Text(status).font(.caption)
        }
        .padding()
        .fileExporter(
            isPresented: $isExporting,
            document: TextFile(text: text),
            contentType: .plainText,
            defaultFilename: "笔记"
        ) { result in
            status = (try? result.get().lastPathComponent).map { "已保存为 \($0)" } ?? "已取消或失败"
        }
    }
}
```

`FileDocument` 也是文档型应用（`DocumentGroup`）使用的协议，第 32 章会再见到它。27 系列新增了基于 URL 的 `ReadableDocument` / `WritableDocument`，适合大文件，`fileExporter` 也支持导出它们。

`Transferable` 的类型可以更简单地导出：`.fileExporter(isPresented:item:contentTypes:defaultFilename:onCompletion:)`。

## PhotosPicker：选取照片

```swift
import PhotosUI

struct PhotoPickerDemo: View {
    @State private var selection: PhotosPickerItem?
    @State private var image: Image?

    var body: some View {
        VStack(spacing: 16) {
            Group {
                if let image {
                    image.resizable().scaledToFit()
                } else {
                    ContentUnavailableView("还没有照片", systemImage: "photo")
                }
            }
            .frame(height: 220)

            PhotosPicker(selection: $selection, matching: .images) {
                Label("选择照片", systemImage: "photo.on.rectangle")
            }
            .buttonStyle(.bordered)
        }
        .padding()
        .task(id: selection) {
            image = try? await selection?.loadTransferable(type: Image.self)
        }
    }
}
```

- `PhotosPicker` 是一个按钮，点击后显示系统的照片选择器。
- 选择器运行在**独立的进程**里，你的应用只能拿到用户选中的那几张。所以**不需要申请相册权限**。
- 拿到的是 `PhotosPickerItem`，一个轻量的引用。真正的数据要用 `loadTransferable(type:)` 异步加载。这里用 `.task(id:)`，选择变化时自动重新加载（第 12 章）。
- `matching:` 可以筛选类型：`.images`、`.videos`、`.livePhotos`、`.screenshots`，以及它们的组合。
- 多选：把 `selection` 绑定到数组 `[PhotosPickerItem]`，可以加 `maxSelectionCount:`。

需要原始数据（比如上传到服务器）时，加载为 `Data.self`。

## MapKit：地图

`import MapKit` 后，`Map` 是一个 SwiftUI 视图：

```swift
import MapKit

struct MapDemo: View {
    @State private var position = MapCameraPosition.region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 30.2460, longitude: 120.1500),
            span: MKCoordinateSpan(latitudeDelta: 0.06, longitudeDelta: 0.06)
        )
    )
    @State private var selected: String?

    private let places: [(name: String, coordinate: CLLocationCoordinate2D)] = [
        ("断桥", CLLocationCoordinate2D(latitude: 30.2590, longitude: 120.1516)),
        ("雷峰塔", CLLocationCoordinate2D(latitude: 30.2312, longitude: 120.1489)),
        ("苏堤", CLLocationCoordinate2D(latitude: 30.2420, longitude: 120.1380)),
    ]

    var body: some View {
        Map(position: $position, selection: $selected) {
            ForEach(places, id: \.name) { place in
                Marker(place.name, systemImage: "camera", coordinate: place.coordinate)
                    .tint(.orange)
                    .tag(place.name)
            }

            MapCircle(center: places[0].coordinate, radius: 400)
                .foregroundStyle(.blue.opacity(0.2))
                .stroke(.blue, lineWidth: 2)
        }
        .mapStyle(.standard(elevation: .realistic))
        .mapControls {
            MapCompass()
            MapScaleView()
        }
        .safeAreaInset(edge: .bottom) {
            Text(selected.map { "选中了：\($0)" } ?? "点击一个标记")
                .padding(10)
                .background(.thinMaterial, in: .capsule)
                .padding()
        }
    }
}
```

地图的设计和 SwiftUI 的其他部分一致：

- **相机位置是状态。** `MapCameraPosition` 可读可写。用户拖动地图时它更新，你给它赋值地图就移动过去（包在 `withAnimation` 里就是平滑飞过去）。
- **地图内容是声明式的。** `Marker`、`Annotation`（自定义视图标注）、`MapPolyline`、`MapPolygon`、`MapCircle`、`UserAnnotation` 用和视图一样的构建器语法写在闭包里，支持 `ForEach`。
- **选择是状态。** `selection` 绑定选中标记的 tag。

其他常用能力：`.mapStyle(.imagery)` 卫星图、`MKLocalSearch` 搜索地点、`MKDirections` 路线规划、`LookAroundPreview` 街景。显示用户位置需要 Core Location 的授权。

## Swift Charts：图表

`import Charts` 后，用声明式的语法描述图表：

```swift
import Charts

nonisolated struct Sale: Identifiable, Sendable {
    let id = UUID()
    let month: String
    let amount: Double
    let category: String
}

struct ChartDemo: View {
    let sales: [Sale] = [
        Sale(month: "1月", amount: 120, category: "线上"), Sale(month: "1月", amount: 80, category: "门店"),
        Sale(month: "2月", amount: 150, category: "线上"), Sale(month: "2月", amount: 70, category: "门店"),
        Sale(month: "3月", amount: 180, category: "线上"), Sale(month: "3月", amount: 95, category: "门店"),
        Sale(month: "4月", amount: 160, category: "线上"), Sale(month: "4月", amount: 110, category: "门店"),
    ]

    var body: some View {
        VStack(spacing: 24) {
            Chart(sales) { sale in
                BarMark(
                    x: .value("月份", sale.month),
                    y: .value("销售额", sale.amount)
                )
                .foregroundStyle(by: .value("渠道", sale.category))
            }
            .frame(height: 180)

            Chart(sales) { sale in
                LineMark(
                    x: .value("月份", sale.month),
                    y: .value("销售额", sale.amount)
                )
                .foregroundStyle(by: .value("渠道", sale.category))
                .symbol(by: .value("渠道", sale.category))
                .interpolationMethod(.catmullRom)
            }
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .frame(height: 180)
        }
        .padding()
    }
}
```

Swift Charts 的核心思想是**把数据映射到视觉属性**：

- **标记**（mark）决定画什么：`BarMark` 柱、`LineMark` 线、`PointMark` 点、`AreaMark` 面积、`RuleMark` 参考线、`RectangleMark` 矩形（热力图）、`SectorMark` 扇形（饼图、环图）。
- `.value("标签", 数据)` 把一个数据字段映射到 x 轴或 y 轴。标签用于辅助功能和图例。
- `.foregroundStyle(by:)`、`.symbol(by:)` 把一个字段映射到颜色或符号。图例自动生成。

多个标记可以叠加在同一个 `Chart` 里。坐标轴、图例、刻度、交互选择（`.chartXSelection(value:)`）都可以定制。图表自动支持深色模式、动态字体和 VoiceOver（包括用声音“听”出数据趋势的音频图表）。

26 系列还增加了 `Chart3D`，用于三维数据的可视化。

## WebKit：显示网页 <Badge type="tip" text="iOS 26+ / macOS 26+" />

26 系列之前，在 SwiftUI 里显示网页需要用 `UIViewRepresentable` 包装 `WKWebView`。现在 `import WebKit` 后有原生的 `WebView`：

```swift
import WebKit

@available(iOS 26, macOS 26, *)
struct SimpleWebView: View {
    var body: some View {
        WebView(url: URL(string: "https://www.swift.org"))
    }
}

@available(iOS 26, macOS 26, *)
struct BrowserView: View {
    @State private var page = WebPage()
    @State private var address = "https://developer.apple.com/swiftui/"

    var body: some View {
        NavigationStack {
            WebView(page)
                .navigationTitle(page.title)
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        TextField("网址", text: $address)
                            .textFieldStyle(.roundedBorder)
                            .frame(minWidth: 200)
                            .onSubmit { load() }
                    }
                    ToolbarItem {
                        Button("刷新", systemImage: "arrow.clockwise") { page.reload() }
                    }
                }
                .overlay(alignment: .top) {
                    if page.isLoading {
                        ProgressView(value: page.estimatedProgress)
                    }
                }
                .task { load() }
        }
    }

    private func load() {
        guard let url = URL(string: address) else { return }
        page.load(URLRequest(url: url))
    }
}
```

- `WebView(url:)` 是最简单的形式，显示一个网页。
- 需要控制和观察时，用 `WebPage`。它是一个 `@Observable` 对象：`title`、`url`、`isLoading`、`estimatedProgress` 都是可观察的属性，直接在视图里读就会自动更新（第 10 章）。
- `WebPage` 还可以执行 JavaScript（`callJavaScript`）、加载 HTML 字符串、拦截导航、处理自定义 URL scheme。

## AVKit：视频播放

```swift
import AVKit

struct VideoDemo: View {
    @State private var player = AVPlayer(
        url: URL(string: "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8")!
    )

    var body: some View {
        VideoPlayer(player: player) {
            Text("自定义覆盖层")
                .font(.caption)
                .padding(6)
                .background(.black.opacity(0.5), in: .capsule)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .padding()
        }
        .aspectRatio(16 / 9, contentMode: .fit)
        .onDisappear { player.pause() }
    }
}
```

`VideoPlayer` 显示带系统播放控件的视频。播放、暂停、跳转通过 `AVPlayer` 对象控制。

## 其他值得知道的集成

| 需求 | 用什么 | 导入 |
| --- | --- | --- |
| 快速预览文件（PDF、图片、文档） | `.quickLookPreview($url)` | `QuickLook` |
| 应用内购买与订阅界面 | `StoreView`、`SubscriptionStoreView`、`ProductView` | `StoreKit` |
| 请求用户评分 | `@Environment(\.requestReview)` | `StoreKit` |
| 通过 Apple 登录 | `SignInWithAppleButton` | `AuthenticationServices` |
| 系统翻译 | `.translationPresentation(isPresented:text:)` | `Translation` |
| 扫描文字、条码 | `DataScannerViewController`（需 UIKit 包装） | `VisionKit` |
| 3D 内容 | `Model3D`、`RealityView` | `RealityKit` |
| 设备上的语言模型 | `LanguageModelSession` | `FoundationModels` |
| 桌面小组件 | `Widget` 协议，界面完全用 SwiftUI 写 | `WidgetKit` |
| 实时活动与灵动岛 | `ActivityConfiguration` | `ActivityKit` |
| 把应用功能暴露给 Siri、快捷指令 | `AppIntent`、`AppShortcutsProvider` | `AppIntents` |

小组件、实时活动、App Intents 的界面都是用 SwiftUI 写的。你在这门教程里学到的布局、文本、图像、形状知识可以直接用上。

还有一些系统能力没有 SwiftUI 原生的封装，需要通过 UIKit 或 AppKit 的桥接来使用。桥接的方法在第 31 章（`UIViewRepresentable`）和第 32 章（`NSViewRepresentable`）讲。

## 常见误区

**误区一：“分享、拖放、拷贝各写一套数据转换。”** 让类型遵循 `Transferable`，三者共用。

**误区二：“选照片要先申请相册权限。”** `PhotosPicker` 不需要权限，它运行在独立进程里，只把用户选中的内容交给你。只有需要读取整个相册或写入相册时才需要权限。

**误区三：“`fileImporter` 返回的 URL 读不了。”** 要先调用 `startAccessingSecurityScopedResource()`。

**误区四：“用 `UIViewRepresentable` 包 `WKWebView`、`MKMapView`。”** 26 系列有原生的 `WebView`；`Map` 从 iOS 17 起就有完整的 SwiftUI API。只有在需要它们不支持的高级功能时才回到桥接。

**误区五：“图表自己用 `Path` 画。”** Swift Charts 已经处理了坐标轴、图例、动画、辅助功能。除非有非常特殊的视觉需求，否则用它。

## 小结

- `Transferable` 统一描述数据的传输格式，是分享、拖放、拷贝粘贴的共同基础。
- `ShareLink` 调起系统分享；`draggable` 和 `dropDestination` 实现拖放；`PasteButton`、`copyable`、`pasteDestination` 处理拷贝粘贴。
- `fileImporter` 和 `fileExporter` 让用户选择文件位置，访问沙盒外的文件要获取安全作用域。
- `PhotosPicker` 不需要权限，选中的内容通过 `loadTransferable` 异步加载。
- `Map`、`Chart`、`WebView`、`VideoPlayer` 都是声明式的：位置、选择、页面状态都是状态或可观察对象。

## 练习

1. 定义一个 `Bookmark` 类型（标题加 URL），让它遵循 `Transferable`：优先导出为自定义类型，降级为 `URL`。用 `ShareLink` 分享它，并在分享预览里显示标题。
2. 做一个看板：三列（待办、进行中、已完成），卡片可以在列之间拖放。拖到某一列上方时该列高亮。
3. 做一个头像选择器：圆形头像，点击后用 `PhotosPicker` 选择照片，加载期间显示 `ProgressView`，加载失败显示错误提示。
4. 用 Swift Charts 把第 13 章练习里的记账数据画成两张图：按类别的环形图（`SectorMark`）和按日期的支出折线图。

## 官方文档

- [`Transferable`](https://developer.apple.com/documentation/coretransferable/transferable)
- [Core Transferable 框架](https://developer.apple.com/documentation/coretransferable)
- [`ShareLink`](https://developer.apple.com/documentation/swiftui/sharelink)
- [Drag and drop（专题总览）](https://developer.apple.com/documentation/swiftui/drag-and-drop)
- [Clipboard（专题总览）](https://developer.apple.com/documentation/swiftui/clipboard)
- [`PasteButton`](https://developer.apple.com/documentation/swiftui/pastebutton)
- [`fileImporter(isPresented:allowedContentTypes:onCompletion:)`](https://developer.apple.com/documentation/swiftui/view/fileimporter(ispresented:allowedcontenttypes:oncompletion:))
- [`fileExporter(isPresented:document:contentType:defaultFilename:onCompletion:)`](https://developer.apple.com/documentation/swiftui/view/fileexporter(ispresented:document:contenttype:defaultfilename:oncompletion:))
- [`FileDocument`](https://developer.apple.com/documentation/swiftui/filedocument)
- [`PhotosPicker`](https://developer.apple.com/documentation/photosui/photospicker)
- [MapKit for SwiftUI](https://developer.apple.com/documentation/mapkit/mapkit-for-swiftui)
- [`Map`](https://developer.apple.com/documentation/mapkit/map)
- [Swift Charts](https://developer.apple.com/documentation/charts)
- [Creating a chart using Swift Charts](https://developer.apple.com/documentation/charts/creating-a-chart-using-swift-charts)
- [WebKit for SwiftUI](https://developer.apple.com/documentation/webkit/webkit-for-swiftui)
- [`WebPage`](https://developer.apple.com/documentation/webkit/webpage)
- [`VideoPlayer`](https://developer.apple.com/documentation/avkit/videoplayer)
- [Uniform Type Identifiers](https://developer.apple.com/documentation/uniformtypeidentifiers)
- [WWDC22：Meet Transferable](https://developer.apple.com/videos/play/wwdc2022/10062/)
- [WWDC25：Meet WebKit for SwiftUI](https://developer.apple.com/videos/play/wwdc2025/231/)
