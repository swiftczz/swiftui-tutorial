# 06 栈、对齐与间距

## 本章目标

- 熟练使用 `HStack`、`VStack`、`ZStack` 以及 `Spacer`、`Divider`
- 理解对齐（alignment）的真正含义，会用 `alignmentGuide` 和自定义对齐
- 分清 `ZStack`、`overlay`、`background` 三者的区别
- 掌握 `padding` 和间距的默认行为
- 初步了解安全区域

## 三种栈

栈（stack）是最基础的布局容器，把子视图沿一个方向排列：

```swift
struct StackBasics: View {
    var body: some View {
        VStack(spacing: 16) {                   // 垂直：从上到下
            HStack(spacing: 8) {                // 水平：从行首到行尾
                Image(systemName: "sun.max.fill")
                    .foregroundStyle(.orange)
                Text("晴")
                Text("26°")
                    .bold()
            }

            ZStack {                            // 深度：从后到前叠放
                Circle()
                    .fill(.blue.opacity(0.2))
                    .frame(width: 80, height: 80)
                Image(systemName: "cloud.fill")
                    .font(.largeTitle)
            }
        }
    }
}
```

上一章说栈的性格是“看孩子”：栈的尺寸是刚好能包住所有孩子（加上间距）的大小。`HStack` 的宽度是孩子宽度之和加间距，高度是最高的那个孩子的高度。

::: tip 行首行尾，不是左右
SwiftUI 用 `leading`（行首）和 `trailing`（行尾），不用 left 和 right。在中文、英文环境里行首是左边，在阿拉伯语、希伯来语这类从右向左书写的语言里行首是右边。坚持用 `leading`/`trailing`，你的界面就自动支持了从右向左的语言。
:::

### spacing：间距

每个栈都有 `spacing` 参数。不写的时候，SwiftUI 使用**系统默认间距**，这个默认值会根据相邻的两个视图的类型和所在平台调整，例如文字和文字之间、文字和图片之间的默认间距可能不同。

- 想要精确控制，就明确写出来：`VStack(spacing: 12)`
- 想要紧贴，写 `spacing: 0`
- 想要跟随系统的视觉节奏，就不写

### Spacer：占满剩余空间

`Spacer` 是一个来者不拒的透明视图，在栈的主轴方向上尽可能伸展，把其他视图推开：

```swift
struct SpacerDemo: View {
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("标题")
                Spacer()                 // 把“标题”推到最左，“更多”推到最右
                Text("更多")
            }

            HStack {
                Spacer()
                Text("居右")
            }

            HStack {
                Text("一")
                Spacer()
                Text("二")
                Spacer()                 // 多个 Spacer 平分剩余空间
                Text("三")
            }

            HStack {
                Text("至少隔开 40")
                Spacer(minLength: 40)
                Text("右")
            }
        }
        .padding()
    }
}
```

`Spacer` 有一个默认的最小长度（系统间距）。`Spacer(minLength: 0)` 允许它完全收缩到 0。

::: info 想一想
`HStack { Text("左"); Spacer() }` 和 `Text("左").frame(maxWidth: .infinity, alignment: .leading)` 画出来一样。它们有什么区别，该用哪个？
:::

效果相同，后者少一层容器，表达也更直接：“这段文字撑满宽度，左对齐”。只有一个子视图需要推到一边时，优先用 `frame(maxWidth:alignment:)`。多个视图之间需要分配空间时，用 `Spacer`。

### Divider：分隔线

`Divider` 在 `VStack` 里是一条横线，在 `HStack` 里是一条竖线。它在垂直于自身的方向上来者不拒：

```swift
struct DividerDemo: View {
    var body: some View {
        VStack {
            Text("上")
            Divider()
            HStack {
                Text("左")
                Divider()
                Text("右")
            }
            .frame(height: 30)
        }
        .padding()
    }
}
```

注意 `HStack` 里的竖 `Divider` 会尽量高，所以通常要给 `HStack` 限定高度，或者加 `.fixedSize(horizontal: false, vertical: true)` 让它按内容高度来。

## 对齐：沿着哪条线排整齐

`VStack` 把孩子竖着排。如果孩子的宽度不一样，它们在水平方向上怎么对齐？这由 `alignment` 参数决定：

```swift
struct AlignmentBasics: View {
    var body: some View {
        HStack(alignment: .top, spacing: 24) {
            VStack(alignment: .leading) {
                Text("行首对齐")
                Text("短")
            }
            VStack(alignment: .center) {
                Text("居中对齐")
                Text("短")
            }
            VStack(alignment: .trailing) {
                Text("行尾对齐")
                Text("短")
            }
        }
        .padding()
    }
}
```

| 容器 | `alignment` 的类型 | 可选值 |
| --- | --- | --- |
| `VStack` | `HorizontalAlignment` | `.leading`、`.center`（默认）、`.trailing` |
| `HStack` | `VerticalAlignment` | `.top`、`.center`（默认）、`.bottom`、`.firstTextBaseline`、`.lastTextBaseline` |
| `ZStack`、`frame`、`overlay`、`background` | `Alignment`（两个方向的组合） | `.topLeading`、`.top`、`.center`、`.bottomTrailing` 等九个方位 |

规律：栈的 `alignment` 管的是**垂直于主轴**的那个方向。`VStack` 的主轴是垂直的，所以它的对齐管水平方向。

::: warning 一个高频误解
`VStack(alignment: .leading)` **不会**让 `VStack` 自己靠左，它只决定 `VStack` **内部**的孩子彼此之间怎么对齐。`VStack` 的宽度等于最宽的孩子，它自己在父视图里的位置由父视图决定（默认居中）。

想让整个 `VStack` 靠左，要对它加 `.frame(maxWidth: .infinity, alignment: .leading)`。
:::

### 文字基线对齐

`HStack` 里大小不同的文字默认按中心对齐，看起来高高低低。用 `.firstTextBaseline` 让它们“站在同一条线上”：

```swift
struct BaselineDemo: View {
    var body: some View {
        VStack(spacing: 20) {
            HStack {
                Text("¥").font(.body)
                Text("128").font(.system(size: 44, weight: .bold))
                Text("/月").font(.caption)
            }
            .border(.gray)

            HStack(alignment: .firstTextBaseline) {
                Text("¥").font(.body)
                Text("128").font(.system(size: 44, weight: .bold))
                Text("/月").font(.caption)
            }
            .border(.gray)
        }
    }
}
```

### 对齐的真正含义：对齐参考线

到目前为止你可能把对齐理解为“靠左”“靠右”。更准确的模型是：**每个视图在每个对齐方式上都有一条参考线（alignment guide），容器把所有孩子的这条线排成一条直线。**

以 `VStack(alignment: .leading)` 为例：每个孩子都有一条 `.leading` 参考线，默认位于自己的最左边（x = 0）。`VStack` 把所有孩子的 `.leading` 线对齐，于是它们左边缘齐平。

`.alignmentGuide` 修饰符可以**移动某个孩子的参考线**：

```swift
struct AlignmentGuideDemo: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("第一行")
            Text("第二行，向右缩进")
                .alignmentGuide(.leading) { dimensions in
                    dimensions[.leading] - 24
                }
            Text("第三行")
        }
        .padding()
        .border(.gray)
    }
}
```

闭包接收这个视图的尺寸信息 `dimensions`，返回新的参考线位置（在视图自己的坐标系里）。`dimensions[.leading]` 是默认位置（0），减去 24 表示把参考线挪到视图左边缘**左侧** 24 点处。容器要把这条线和别人的线对齐，结果就是这个视图整体**向右**移了 24 点。

这个方向一开始容易绕：**参考线往左挪，视图就往右走。** 想象你抓着视图上的一根“把手”把它挂到墙上的一条线上，把手装得越靠左，视图挂上去就越靠右。

### 自定义对齐：跨容器对齐

内置对齐只能让同一个栈里的孩子对齐。有时需要让不同栈里的视图对齐，这时可以定义自己的对齐方式：

```swift
extension VerticalAlignment {
    private enum TitleCenter: AlignmentID {
        static func defaultValue(in context: ViewDimensions) -> CGFloat {
            context[VerticalAlignment.center]
        }
    }
    static let titleCenter = VerticalAlignment(TitleCenter.self)
}

struct CustomAlignmentDemo: View {
    var body: some View {
        HStack(alignment: .titleCenter, spacing: 16) {
            Image(systemName: "bell.badge.fill")
                .font(.title)
                .foregroundStyle(.red)

            VStack(alignment: .leading, spacing: 4) {
                Text("新消息")
                    .font(.headline)
                    .alignmentGuide(.titleCenter) { $0[VerticalAlignment.center] }
                Text("你有三条未读通知，其中一条来自系统。")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }
}
```

这里图标不是和整个文字块的中心对齐，而是和**标题那一行**的中心对齐。做法是：

1. 定义一个新的对齐 `.titleCenter`
2. 外层 `HStack` 按 `.titleCenter` 对齐
3. 在标题上用 `.alignmentGuide(.titleCenter)` 声明“这条线在我的垂直中心”

内层 `VStack` 会把这条线的位置向上报告给外层 `HStack`。图标没有显式设置，用默认值（自己的中心）。

## ZStack、overlay 与 background

三者都能把视图叠在一起，但它们的**尺寸由谁决定**不同，这是选择的关键。

```swift
struct LayeringComparison: View {
    var body: some View {
        VStack(spacing: 30) {
            // ZStack：尺寸取所有孩子中最大的
            ZStack {
                Text("ZStack")
                Circle()
                    .stroke(.red)
                    .frame(width: 100, height: 100)
            }
            .border(.gray)

            // overlay：尺寸只由主视图决定，覆盖层被提议主视图的尺寸
            Text("overlay")
                .overlay {
                    Circle().stroke(.red)
                }
                .border(.gray)

            // background：同上，只是画在后面
            Text("background")
                .padding()
                .background {
                    RoundedRectangle(cornerRadius: 8).fill(.yellow)
                }
                .border(.gray)
        }
    }
}
```

| | 尺寸由谁决定 | 适用场景 |
| --- | --- | --- |
| `ZStack` | 所有孩子共同决定（取最大的包围盒） | 几个地位平等的视图叠放 |
| `.overlay` | 只由主视图决定，覆盖层被提议主视图的尺寸 | 给一个视图加角标、边框、蒙层 |
| `.background` | 只由主视图决定，背景被提议主视图的尺寸 | 给一个视图加背景 |

第二个例子里，圆形只有文字那么大，因为覆盖层被提议的尺寸是 `Text` 的尺寸。这正是 `overlay` 和 `background` 的价值：**装饰跟着内容走，不反过来影响内容的布局**。

::: tip 选择原则
有明确的“主角”和“装饰”时，用 `overlay`/`background`。主角决定尺寸，装饰适应主角。只有当几个视图真的需要共同决定容器大小时才用 `ZStack`。
:::

`overlay` 和 `background` 也有 `alignment` 参数，用来做角标很方便：

```swift
struct BadgeDemo: View {
    var body: some View {
        Image(systemName: "envelope.fill")
            .font(.system(size: 40))
            .overlay(alignment: .topTrailing) {
                Text("3")
                    .font(.caption2.bold())
                    .foregroundStyle(.white)
                    .padding(5)
                    .background(.red, in: .circle)
                    .alignmentGuide(.top) { $0[VerticalAlignment.center] }
                    .alignmentGuide(.trailing) { $0[HorizontalAlignment.center] }
            }
    }
}
```

两个 `alignmentGuide` 把角标的参考线从自己的右上角移到了中心，于是角标的**中心**落在图标的右上角上，恰好骑在边缘。这是对齐参考线的又一个实际用途。

### zIndex：调整前后顺序

`ZStack` 里后写的在前面。`.zIndex()` 可以打破这个顺序，数值大的在前：

```swift
struct ZIndexDemo: View {
    var body: some View {
        ZStack {
            Rectangle().fill(.red).frame(width: 80, height: 80)
                .zIndex(1)                                   // 本来在最后面，现在在最前面
            Rectangle().fill(.blue).frame(width: 80, height: 80)
                .offset(x: 20, y: 20)
        }
    }
}
```

## padding 详解

```swift
struct PaddingDemo: View {
    var body: some View {
        VStack(spacing: 12) {
            Text("默认：四边系统间距").padding().border(.gray)
            Text("四边 20").padding(20).border(.gray)
            Text("只有水平 30").padding(.horizontal, 30).border(.gray)
            Text("上 4 下 16").padding(.top, 4).padding(.bottom, 16).border(.gray)
            Text("指定四边")
                .padding(EdgeInsets(top: 2, leading: 24, bottom: 2, trailing: 8))
                .border(.gray)
        }
    }
}
```

- `.padding()` 不带参数时用系统默认值（各平台不同，iOS 上通常是 16）。
- 第一个参数是边的集合：`.top`、`.bottom`、`.leading`、`.trailing`、`.horizontal`、`.vertical`、`.all`，也可以写成数组 `[.top, .leading]`。
- 负值的 `padding` 是合法的，会让视图向外扩张、和邻居重叠。偶尔有用，但要清楚自己在做什么。

## 安全区域初识

屏幕上有些区域不适合放内容：刘海、灵动岛、底部的 Home 指示条、圆角、Mac 窗口的标题栏。SwiftUI 把排除了这些区域之后剩下的部分叫**安全区域**（safe area）。默认情况下，你的内容被布局在安全区域之内。

```swift
struct SafeAreaDemo: View {
    var body: some View {
        ZStack {
            Color.indigo
                .ignoresSafeArea()          // 背景色延伸到屏幕边缘

            Text("内容仍在安全区域内")
                .foregroundStyle(.white)
        }
    }
}
```

通常的做法是：**背景延伸到边缘，内容留在安全区域内**。上面的写法可以简化，因为 `.background()` 用颜色或材质这类样式时，默认就会延伸进安全区域：

```swift
struct SafeAreaSimpler: View {
    var body: some View {
        Text("内容仍在安全区域内")
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.indigo)            // 自动延伸到屏幕边缘
    }
}
```

安全区域的更多用法（`safeAreaInset`、`safeAreaPadding`、键盘避让）在第 8 章继续讲。

## 综合示例：一行设置项

把本章内容用在一个常见的界面元素上：

```swift
struct SettingRow: View {
    let icon: String
    let color: Color
    let title: String
    var detail: String? = nil

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 30, height: 30)
                .background(color, in: .rect(cornerRadius: 7))

            Text(title)

            Spacer(minLength: 8)

            if let detail {
                Text(detail)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 16)
    }
}

struct SettingRowDemo: View {
    var body: some View {
        VStack(spacing: 0) {
            SettingRow(icon: "wifi", color: .blue, title: "无线局域网", detail: "Home-5G")
            Divider().padding(.leading, 58)
            SettingRow(icon: "bell.badge.fill", color: .red, title: "通知")
            Divider().padding(.leading, 58)
            SettingRow(icon: "moon.fill", color: .indigo, title: "专注模式", detail: "勿扰")
        }
        .background(.background.secondary, in: .rect(cornerRadius: 12))
        .padding()
    }
}
```

读这段代码时留意几个决定：图标用 `.frame` 固定成 30 × 30 的方块再加背景；`Spacer(minLength: 8)` 保证标题和详情之间至少有 8 点；分隔线用 `.padding(.leading, 58)` 缩进到与文字对齐（16 + 30 + 12）。

## 常见误区

**误区一：“`VStack(alignment: .leading)` 会让 `VStack` 靠左。”** 它只管孩子之间的对齐。`VStack` 自己的位置由它的父视图决定。

**误区二：“什么都用 `ZStack` 叠。”** 加背景和角标用 `background`/`overlay`，这样装饰的尺寸跟随内容，不会意外撑大布局。

**误区三：“间距不对，加几个 `Spacer().frame(height: 10)`。”** 用栈的 `spacing` 参数或 `padding`。`Spacer` 是用来分配**剩余**空间的。

**误区四：“用 left 和 right。”** SwiftUI 的方向是 `leading`/`trailing`，会自动适配从右向左的语言。

## 小结

- `HStack`/`VStack`/`ZStack` 沿水平、垂直、深度方向排列，尺寸由孩子决定。
- `Spacer` 分配剩余空间，`Divider` 画分隔线。
- 对齐的本质是把所有孩子的同名参考线排成一条直线。`alignmentGuide` 移动参考线，自定义 `AlignmentID` 可以跨容器对齐。
- `overlay`/`background` 的尺寸只由主视图决定，`ZStack` 的尺寸由所有孩子共同决定。
- 背景延伸到屏幕边缘，内容留在安全区域内。

## 练习

1. 做一个聊天气泡：对方的消息靠左、灰色背景，自己的消息靠右、蓝色背景。气泡最大宽度不超过屏幕的 75%（提示：`Spacer(minLength:)`）。
2. 用 `HStack(alignment: .firstTextBaseline)` 做一个“大数字 + 小单位”的指标展示，例如“72 次/分”。
3. 给一个头像（圆形图片）的右下角加一个绿色的“在线”小圆点，要求圆点一半在头像内、一半在外。
4. 用自定义 `HorizontalAlignment` 实现一个表单：若干行“标签：值”，所有冒号在垂直方向上对齐，标签右对齐到冒号，值左对齐到冒号。

## 官方文档

- [`HStack`](https://developer.apple.com/documentation/swiftui/hstack)
- [`VStack`](https://developer.apple.com/documentation/swiftui/vstack)
- [`ZStack`](https://developer.apple.com/documentation/swiftui/zstack)
- [`Spacer`](https://developer.apple.com/documentation/swiftui/spacer)
- [`Divider`](https://developer.apple.com/documentation/swiftui/divider)
- [Building layouts with stack views](https://developer.apple.com/documentation/swiftui/building-layouts-with-stack-views)
- [Aligning views within a stack](https://developer.apple.com/documentation/swiftui/aligning-views-within-a-stack)
- [Aligning views across stacks](https://developer.apple.com/documentation/swiftui/aligning-views-across-stacks)
- [`alignmentGuide(_:computeValue:)`](https://developer.apple.com/documentation/swiftui/view/alignmentguide(_:computevalue:))
- [`AlignmentID` 协议](https://developer.apple.com/documentation/swiftui/alignmentid)
- [`overlay(alignment:content:)`](https://developer.apple.com/documentation/swiftui/view/overlay(alignment:content:))
- [`background(alignment:content:)`](https://developer.apple.com/documentation/swiftui/view/background(alignment:content:))
- [`ignoresSafeArea(_:edges:)`](https://developer.apple.com/documentation/swiftui/view/ignoressafearea(_:edges:))
- [Adding a background to your view](https://developer.apple.com/documentation/swiftui/adding-a-background-to-your-view)
