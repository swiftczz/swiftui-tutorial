# 14 文本、图像与符号

## 本章目标

- 掌握 `Text` 的字体、样式、格式化与富文本
- 理解动态字体（Dynamic Type）并写出能适应字号变化的界面
- 掌握 `Image` 的缩放、裁剪与渲染模式
- 用好 SF Symbols：变体、渲染模式、可变值
- 用 `Label` 组合图标与文字
- 用 `AsyncImage` 加载网络图片

从这一章开始进入组件部分。前三部分的模型（布局、身份、数据流）会在每个组件身上重现，你会发现学新组件越来越快。

## Text

### 字体

SwiftUI 推荐使用**语义字体**，而不是写死字号：

```swift
struct FontStyles: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("largeTitle 大标题").font(.largeTitle)
            Text("title 标题").font(.title)
            Text("title2 二级标题").font(.title2)
            Text("title3 三级标题").font(.title3)
            Text("headline 强调").font(.headline)
            Text("body 正文（默认）").font(.body)
            Text("callout 标注").font(.callout)
            Text("subheadline 副标题").font(.subheadline)
            Text("footnote 脚注").font(.footnote)
            Text("caption 说明").font(.caption)
            Text("caption2 小说明").font(.caption2)
        }
        .padding()
    }
}
```

语义字体有两个好处：

1. **自动适配动态字体。** 用户在系统设置里调大字号，所有语义字体跟着放大。
2. **自动适配平台。** 同一个 `.body`，在 iOS 上是 17 点，在 macOS 上是 13 点，因为两个平台的阅读距离和交互方式不同。写一份代码，在两个平台上都符合各自的惯例。

需要调整时，在语义字体的基础上修改：

```swift
struct FontModifiers: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("加粗的标题").font(.title2.bold())
            Text("指定字重").font(.body.weight(.medium))
            Text("圆体").font(.system(.title3, design: .rounded))
            Text("等宽 Monospaced").font(.system(.body, design: .monospaced))
            Text("衬线 Serif Design").font(.system(.title3, design: .serif))
            Text("1234567890").font(.title3.monospacedDigit())
            Text("斜体 Italic").italic()
            Text("固定 20 点，不随系统缩放").font(.system(size: 20))
        }
        .padding()
    }
}
```

::: tip 数字要等宽
显示会变化的数字（计时器、金额、进度百分比）时加 `.monospacedDigit()`。默认字体里“1”比“8”窄，数字变化时整行文字会左右抖动。等宽数字让每个数字占相同宽度。
:::

### 动态字体

用户可以在系统设置里把文字调到非常大。你的界面应该能适应。在预览里测试：

```swift
struct DynamicTypeDemo: View {
    var body: some View {
        HStack {
            Image(systemName: "bell.fill")
            Text("这是一条会随字号变化的通知标题")
            Spacer()
            Text("刚刚").foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview("默认字号") { DynamicTypeDemo() }
#Preview("特大字号") { DynamicTypeDemo().dynamicTypeSize(.accessibility3) }
```

特大字号下横排布局很可能挤不下。应对办法：

```swift
struct AdaptiveRow: View {
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4))
            : AnyLayout(HStackLayout())

        layout {
            Label("通知标题", systemImage: "bell.fill")
            if !typeSize.isAccessibilitySize { Spacer() }
            Text("刚刚").foregroundStyle(.secondary)
        }
        .padding()
    }
}
```

其他工具：

- `.dynamicTypeSize(...DynamicTypeSize.xxxLarge)` 限制一个视图的最大字号档位。只在确实放不下时用，比如标签栏。
- `@ScaledMetric` 让一个数值跟随字号缩放，用于图标尺寸、间距：

```swift
struct ScaledIcon: View {
    @ScaledMetric(relativeTo: .body) private var iconSize = 24

    var body: some View {
        HStack {
            Image(systemName: "star.fill")
                .resizable()
                .frame(width: iconSize, height: iconSize)
            Text("图标和文字一起缩放")
        }
    }
}
```

### 文字样式

```swift
struct TextStyling: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("主要内容").foregroundStyle(.primary)
            Text("次要内容").foregroundStyle(.secondary)
            Text("第三级内容").foregroundStyle(.tertiary)
            Text("渐变文字")
                .font(.title.bold())
                .foregroundStyle(.linearGradient(colors: [.pink, .orange], startPoint: .leading, endPoint: .trailing))
            Text("下划线").underline()
            Text("删除线").strikethrough(color: .red)
            Text("字 间 距").kerning(4)
            Text("UPPERCASE 小型大写").textCase(.uppercase).font(.caption)
        }
        .padding()
    }
}
```

`.primary`、`.secondary`、`.tertiary`、`.quaternary` 是**层级样式**。它们不是固定的颜色，而是“当前前景色的不同强度”，会自动适配深色模式和背景材质。表达信息层次时优先用它们，而不是手选灰色。

### 多行、截断与对齐

```swift
struct MultilineText: View {
    let long = "SwiftUI 是一个用声明式语法构建用户界面的框架。你描述界面在各种状态下应该是什么样子，框架负责在状态变化时更新界面。"

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(long)
                .lineLimit(2)

            Text(long)
                .lineLimit(2, reservesSpace: true)       // 不足两行也占两行高度
                .truncationMode(.middle)

            Text(long)
                .lineLimit(1...3)                        // 最少 1 行，最多 3 行

            Text(long)
                .multilineTextAlignment(.center)
                .lineSpacing(6)

            Text("自动缩小以适应宽度的一行文字，最多缩到一半")
                .lineLimit(1)
                .minimumScaleFactor(0.5)
        }
        .padding()
    }
}
```

::: warning 两种“对齐”别混淆
`.multilineTextAlignment(.center)` 控制的是**多行文字内部**每一行相对彼此怎么对齐。它不会移动 `Text` 视图本身。要让整个 `Text` 在容器里居左，用 `.frame(maxWidth: .infinity, alignment: .leading)`。单行文字加 `multilineTextAlignment` 看不出任何效果。
:::

### 格式化显示

不要自己拼字符串来显示日期、数字、货币。`Text` 可以直接接收值和格式，自动处理本地化：

```swift
struct FormattedText: View {
    let date = Date.now
    let price = 1234.5
    let ratio = 0.8567
    let distance = Measurement(value: 5.2, unit: UnitLength.kilometers)

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(date, format: .dateTime.year().month().day())
            Text(date, format: .dateTime.hour().minute())
            Text(date, style: .relative)                      // “3 分钟前”，自动更新
            Text(date, style: .timer)                         // 计时器，自动走动
            Text(price, format: .currency(code: "CNY"))
            Text(price, format: .number.precision(.fractionLength(2)))
            Text(ratio, format: .percent.precision(.fractionLength(1)))
            Text(distance, format: .measurement(width: .abbreviated))
            Text(["苹果", "香蕉", "樱桃"], format: .list(type: .and))
            Text("共 \(42) 项，合计 \(price, format: .currency(code: "CNY"))")
        }
        .padding()
    }
}
```

把预览的语言区域换成英文（`.environment(\.locale, Locale(identifier: "en_US"))`），所有日期、数字、货币格式自动变成英文习惯。

`Text(date, style: .relative)` 和 `.timer` 会**自己更新**，你不需要定时器。

### 拼接不同样式的文字

在一段文字里混合多种样式，用字符串插值嵌入带样式的 `Text`：

```swift
struct InlineStyles: View {
    var body: some View {
        Text("已售 \(Text("1,208").bold().foregroundStyle(.red)) 件，\(Text("限时优惠").underline())")
            .padding()
    }
}
```

::: warning 弃用提示
旧代码里常见用 `+` 拼接 `Text`：`Text("A").bold() + Text("B")`。这个运算符从 iOS 26 / macOS 26 起被标记为弃用，官方建议改用上面的字符串插值写法。
:::

### Markdown 与 AttributedString

`Text` 的字符串字面量支持一部分 Markdown 语法：

```swift
struct MarkdownText: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("支持 **粗体**、*斜体*、~~删除线~~、`代码` 和 [链接](https://developer.apple.com)")
            Text(verbatim: "用 verbatim 可以原样显示 **星号**")
        }
        .padding()
    }
}
```

只支持行内样式（粗体、斜体、链接、代码），不支持标题、列表、表格。并且只对**字面量**生效：`Text(someStringVariable)` 不会解析 Markdown。

更复杂的富文本用 `AttributedString`：

```swift
struct AttributedText: View {
    var message: AttributedString {
        var text = AttributedString("订单已发货，预计明天送达")
        if let range = text.range(of: "已发货") {
            text[range].foregroundColor = .green
            text[range].font = .body.bold()
        }
        if let range = text.range(of: "明天") {
            text[range].backgroundColor = .yellow.opacity(0.4)
            text[range].underlineStyle = .single
        }
        return text
    }

    var body: some View {
        Text(message).padding()
    }
}
```

把运行时得到的 Markdown 字符串转成富文本：`try? AttributedString(markdown: someString)`。

### 可选择的文字

默认情况下 `Text` 不能被选中复制。加上 `.textSelection(.enabled)`：

```swift
struct SelectableText: View {
    var body: some View {
        Text("订单号：SO-2026-1114-0042")
            .textSelection(.enabled)
            .padding()
    }
}
```

iOS 上长按可以拷贝整段，macOS 上可以用鼠标拖选任意部分。这是一个环境型修饰符，加在容器上对里面所有文字生效。

## Image

### 图片来源

```swift
struct ImageSources: View {
    var body: some View {
        HStack(spacing: 20) {
            Image(systemName: "photo")            // SF Symbols 系统符号
            Image(systemName: "photo.fill")
                .foregroundStyle(.blue)
        }
        .font(.largeTitle)
    }
}
```

| 写法 | 来源 |
| --- | --- |
| `Image("avatar")` | 资源目录（Assets.xcassets）里名为 avatar 的图片 |
| `Image(.avatar)` | 同上，使用 Xcode 自动生成的类型安全符号。**推荐**，写错名字编译不过 |
| `Image(systemName: "star")` | SF Symbols |
| `Image(uiImage:)` / `Image(nsImage:)` | 从 UIKit / AppKit 的图片对象创建 |
| `Image(decorative: "name")` | 纯装饰图片，辅助功能会忽略它 |

### 缩放与裁剪

第 5 章讲过：`Image` 默认是固定大小，加 `.resizable()` 才会听从布局的提议。

```swift
struct ImageScaling: View {
    var body: some View {
        VStack(spacing: 16) {
            picture
                .resizable()
                .scaledToFit()                    // 完整显示，可能留白
                .frame(width: 200, height: 100)
                .border(.gray)

            picture
                .resizable()
                .scaledToFill()                   // 填满，可能超出
                .frame(width: 200, height: 100)
                .clipped()                        // 把超出的部分裁掉
                .border(.gray)

            picture
                .resizable()
                .scaledToFill()
                .frame(width: 80, height: 80)
                .clipShape(.circle)               // 圆形头像
                .overlay { Circle().stroke(.white, lineWidth: 3) }
                .shadow(radius: 4)
        }
    }

    private var picture: Image {
        Image(systemName: "mountain.2.fill")
    }
}
```

记住这个组合，它是显示照片的标准写法：

```swift nocheck
Image(.photo)
    .resizable()
    .scaledToFill()
    .frame(width: w, height: h)
    .clipped()        // 或 .clipShape(...)
```

`scaledToFill` 之后图片会超出 `frame`，必须裁剪。忘记 `.clipped()` 是常见错误：超出的部分虽然不占布局空间，但会盖住旁边的视图，还会挡住点击。

### 渲染模式与插值

```swift
struct ImageRendering: View {
    var body: some View {
        HStack(spacing: 20) {
            Image(systemName: "heart.fill")
                .renderingMode(.template)             // 当作模板，用前景色着色
                .foregroundStyle(.pink)

            Image(systemName: "qrcode")
                .resizable()
                .interpolation(.none)                 // 放大时保持像素锐利，适合二维码和像素画
                .frame(width: 60, height: 60)
        }
        .font(.largeTitle)
    }
}
```

对资源目录里的图片，`.renderingMode(.template)` 把它当成“形状”，用 `foregroundStyle` 着色；`.original` 显示原始颜色。也可以在资源目录的属性面板里设置默认值。

## SF Symbols

SF Symbols 是系统内置的图标库，有数千个符号，和系统字体一起设计：它们随字号缩放、随字重变粗细、与文字基线对齐。在 Mac 上安装 Apple 提供的 **SF Symbols** 应用可以浏览和搜索所有符号。

### 大小跟着字体走

```swift
struct SymbolSizing: View {
    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                Image(systemName: "cloud.sun.fill").font(.body)
                Image(systemName: "cloud.sun.fill").font(.title)
                Image(systemName: "cloud.sun.fill").font(.system(size: 50))
            }
            HStack(spacing: 16) {
                Image(systemName: "cloud.sun.fill").imageScale(.small)
                Image(systemName: "cloud.sun.fill").imageScale(.medium)
                Image(systemName: "cloud.sun.fill").imageScale(.large)
            }
            .font(.title)
            HStack(spacing: 16) {
                Image(systemName: "cloud.sun.fill").fontWeight(.ultraLight)
                Image(systemName: "cloud.sun.fill").fontWeight(.regular)
                Image(systemName: "cloud.sun.fill").fontWeight(.black)
            }
            .font(.title)
        }
    }
}
```

符号的大小用 `.font()` 控制，不要用 `.resizable().frame()`。这样符号会和旁边的文字保持协调，也会跟随动态字体。

### 四种渲染模式

```swift
struct SymbolRendering: View {
    var body: some View {
        HStack(spacing: 24) {
            Image(systemName: "person.crop.circle.badge.checkmark")
                .symbolRenderingMode(.monochrome)                // 单色
            Image(systemName: "person.crop.circle.badge.checkmark")
                .symbolRenderingMode(.hierarchical)              // 层级：同一颜色的不同透明度
            Image(systemName: "person.crop.circle.badge.checkmark")
                .symbolRenderingMode(.palette)                   // 调色板：自己指定每层颜色
                .foregroundStyle(.blue, .green)
            Image(systemName: "person.crop.circle.badge.checkmark")
                .symbolRenderingMode(.multicolor)                // 多色：符号自带的固有颜色
        }
        .font(.system(size: 44))
        .foregroundStyle(.indigo)
    }
}
```

### 变体

很多符号有 `.fill`、`.circle`、`.slash` 等变体。除了直接写在名字里，还可以用修饰符统一设置：

```swift
struct SymbolVariants2: View {
    var body: some View {
        VStack(spacing: 20) {
            HStack(spacing: 20) {
                Image(systemName: "heart")
                Image(systemName: "star")
                Image(systemName: "bell")
            }

            HStack(spacing: 20) {
                Image(systemName: "heart")
                Image(systemName: "star")
                Image(systemName: "bell")
            }
            .symbolVariant(.fill)

            HStack(spacing: 20) {
                Image(systemName: "heart")
                Image(systemName: "star")
                Image(systemName: "bell")
            }
            .symbolVariant(.circle.fill)
        }
        .font(.title)
    }
}
```

`symbolVariant` 是环境型的。系统容器会利用它：iOS 的标签栏会自动把图标设为填充变体，你只需要写基础名字。

### 可变值

有些符号（音量、信号、电量）可以用一个 0 到 1 的数值表示程度：

```swift
struct VariableSymbol: View {
    @State private var level = 0.5

    var body: some View {
        VStack(spacing: 20) {
            HStack(spacing: 30) {
                Image(systemName: "speaker.wave.3.fill", variableValue: level)
                Image(systemName: "wifi", variableValue: level)
                Image(systemName: "chart.bar.fill", variableValue: level)
            }
            .font(.system(size: 40))

            Slider(value: $level)
        }
        .padding()
    }
}
```

符号还支持丰富的**动画效果**（弹跳、脉冲、替换过渡等），放在第 30 章讲。

## Label：图标加文字

`Label` 把一个图标和一段文字组合成一个语义单元：

```swift
struct LabelBasics: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("收藏", systemImage: "star")
            Label("下载", systemImage: "arrow.down.circle")
                .labelStyle(.titleOnly)
            Label("分享", systemImage: "square.and.arrow.up")
                .labelStyle(.iconOnly)
            Label {
                Text("自定义内容")
                    .font(.headline)
            } icon: {
                Circle().fill(.orange).frame(width: 14, height: 14)
            }
        }
        .padding()
    }
}
```

为什么不直接用 `HStack { Image; Text }`？因为 `Label` 表达的是**语义**：“这是一个带图标的标题”。系统容器可以根据上下文决定怎么呈现它：

- 在工具栏里，默认只显示图标，文字用作辅助功能标签和悬停提示
- 在菜单里，文字在左，图标在右（macOS）
- 在 `List` 里，图标自动对齐成一列
- 在标签栏里，图标在上文字在下

所以在按钮、菜单、工具栏、列表、标签页里，**凡是“图标 + 文字”的场合都优先用 `Label`**。

iOS 26 / macOS 26 增加了两个调整 `Label` 排版的修饰符：

```swift
@available(iOS 26, macOS 26, *)
struct LabelSpacing: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("无线局域网", systemImage: "wifi")
            Label("蓝牙", systemImage: "wave.3.right")
            Label("蜂窝网络", systemImage: "antenna.radiowaves.left.and.right")
        }
        .labelIconToTitleSpacing(12)       // 图标与标题的间距
        .labelReservedIconWidth(30)        // 为图标预留统一宽度，让标题对齐
        .padding()
    }
}
```

自定义 `Label` 的外观用 `LabelStyle`：

```swift
struct VerticalLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        VStack(spacing: 4) {
            configuration.icon.font(.title2)
            configuration.title.font(.caption)
        }
    }
}

struct VerticalLabelDemo: View {
    var body: some View {
        HStack(spacing: 30) {
            Label("首页", systemImage: "house")
            Label("搜索", systemImage: "magnifyingglass")
            Label("我的", systemImage: "person")
        }
        .labelStyle(VerticalLabelStyle())
    }
}
```

## AsyncImage：网络图片

```swift
struct RemoteImage: View {
    let url = URL(string: "https://developer.apple.com/assets/elements/icons/swiftui/swiftui-96x96_2x.png")

    var body: some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .empty:
                ProgressView()
            case .success(let image):
                image
                    .resizable()
                    .scaledToFit()
            case .failure:
                Image(systemName: "photo.badge.exclamationmark")
                    .foregroundStyle(.secondary)
            @unknown default:
                EmptyView()
            }
        }
        .frame(width: 120, height: 120)
    }
}
```

`AsyncImage` 自己管理下载和状态。`phase` 有三种情况：加载中、成功、失败。最简单的形式是 `AsyncImage(url: url)`，但它不能调整图片大小，实际使用时几乎总是用带闭包的版本。

带过渡动画的写法：

```swift
struct AnimatedRemoteImage: View {
    let url: URL?

    var body: some View {
        AsyncImage(url: url, transaction: Transaction(animation: .easeIn(duration: 0.3))) { phase in
            if let image = phase.image {
                image.resizable().scaledToFill().transition(.opacity)
            } else {
                Color.gray.opacity(0.2)
            }
        }
        .frame(width: 100, height: 100)
        .clipShape(.rect(cornerRadius: 12))
    }
}
```

### 27 系列的改进：缓存与自定义请求 <Badge type="tip" text="iOS 27+ / macOS 27+" />

早期的 `AsyncImage` 只接受 `URL`，也没有提供控制缓存的入口，列表滚动时同一张图会被重复下载，这是它长期被诟病的地方。27 系列补上了这两点：

```swift
@available(iOS 27, macOS 27, *)
struct CachedRemoteImage: View {
    let url: URL
    let token: String

    var request: URLRequest {
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.cachePolicy = .returnCacheDataElseLoad
        return request
    }

    var body: some View {
        AsyncImage(request: request) { image in
            image.resizable().scaledToFit()
        } placeholder: {
            ProgressView()
        }
    }
}
```

- `AsyncImage(request:)` 接受 `URLRequest`，可以带请求头（比如鉴权）、指定缓存策略。
- `.asyncImageURLSession(_:)` 是一个环境型修饰符，为一棵子树里所有的 `AsyncImage` 指定使用哪个 `URLSession`。配置一个带大容量 `URLCache` 的会话，在应用根部设置一次即可：

```swift
@available(iOS 27, macOS 27, *)
struct ImageSessionRoot: View {
    static let imageSession: URLSession = {
        let config = URLSessionConfiguration.default
        config.urlCache = URLCache(memoryCapacity: 50 << 20, diskCapacity: 500 << 20)
        return URLSession(configuration: config)
    }()

    var body: some View {
        Text("应用内容")
            .asyncImageURLSession(Self.imageSession)
    }
}
```

在需要支持更早系统的项目里，如果图片加载的需求比较重（大量图片、需要预加载、需要精细的缓存控制），仍然建议自己用 `URLSession` 加 `.task` 实现，或者使用成熟的第三方图片库。

## 常见误区

**误区一：“字号都写成 `.font(.system(size: 17))`。”** 写死的字号不跟随动态字体，在 macOS 上也偏大。用语义字体。

**误区二：“SF Symbols 用 `.resizable().frame()` 调大小。”** 用 `.font()` 或 `.imageScale()`。这样它才会和文字保持一致的视觉重量并支持动态字体。

**误区三：“`scaledToFill()` 之后忘了裁剪。”** 图片会溢出 frame，盖住相邻视图并拦截点击。

**误区四：“`Text(variable)` 里的 Markdown 没生效。”** 只有字符串字面量会被解析。变量要先转成 `AttributedString(markdown:)`，或者用 `Text(LocalizedStringKey(variable))`。

**误区五：“图标加文字就用 `HStack`。”** 用 `Label`。它带有语义，系统容器会据此做正确的排版和辅助功能处理。

## 小结

- `Text` 用语义字体，自动适配动态字体和平台；用层级样式表达信息主次。
- 日期、数字、货币用 `Text(value, format:)`，自动本地化。
- 富文本用字符串插值嵌入带样式的 `Text`，或用 `AttributedString`。
- `Image` 要 `.resizable()` 才会缩放；`scaledToFill` 要配合裁剪。
- SF Symbols 的大小跟字体走，有四种渲染模式、多种变体和可变值。
- `Label` 是带语义的“图标 + 文字”，系统会根据上下文自动调整呈现。
- `AsyncImage` 加载网络图片；27 系列起支持 `URLRequest` 与自定义 `URLSession`，可以控制缓存。

## 练习

1. 做一个文章卡片：标题（最多两行）、摘要（最多三行，次要颜色）、底部一行“作者 · 相对时间 · 阅读量”。阅读量用 `.number.notation(.compactName)` 格式化。
2. 给上面的卡片写三个预览：默认、`.accessibility3` 字号、英文语言环境。修复大字号下的布局问题。
3. 做一个天气图标选择器：用 `symbolRenderingMode(.multicolor)` 展示 8 个天气符号，点击某个时用 `.symbolVariant(.fill)` 高亮。
4. 用 `AttributedString` 实现搜索高亮：给定一段正文和一个关键词，把所有匹配的地方加黄色背景。

## 官方文档

- [`Text`](https://developer.apple.com/documentation/swiftui/text)
- [`Font`](https://developer.apple.com/documentation/swiftui/font)
- [Applying custom fonts to text](https://developer.apple.com/documentation/swiftui/applying-custom-fonts-to-text)
- [`DynamicTypeSize`](https://developer.apple.com/documentation/swiftui/dynamictypesize)
- [`ScaledMetric`](https://developer.apple.com/documentation/swiftui/scaledmetric)
- [`AttributedString`](https://developer.apple.com/documentation/foundation/attributedstring)
- [`Image`](https://developer.apple.com/documentation/swiftui/image)
- [Fitting images into available space](https://developer.apple.com/documentation/swiftui/fitting-images-into-available-space)
- [`Label`](https://developer.apple.com/documentation/swiftui/label)
- [`LabelStyle`](https://developer.apple.com/documentation/swiftui/labelstyle)
- [`AsyncImage`](https://developer.apple.com/documentation/swiftui/asyncimage)
- [`SymbolRenderingMode`](https://developer.apple.com/documentation/swiftui/symbolrenderingmode)
- [`SymbolVariants`](https://developer.apple.com/documentation/swiftui/symbolvariants)
- [SF Symbols（设计资源与应用下载）](https://developer.apple.com/sf-symbols/)
- [Human Interface Guidelines：Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [Human Interface Guidelines：SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)
