# 15 按钮与控件

## 本章目标

- 掌握 `Button` 的角色、样式、尺寸与自定义
- 熟悉各种取值控件：`Toggle`、`Slider`、`Stepper`、`Picker`、`DatePicker`、`ColorPicker`
- 会用 `Menu`、`Link`、`ControlGroup` 组织操作
- 用 `ProgressView` 和 `Gauge` 展示进度与数值
- 理解“控件 = 标签 + 绑定 + 样式”这个统一的设计
- 知道同一个控件在 iOS 和 macOS 上的不同表现

## 控件的统一设计

SwiftUI 的控件有十几种，但它们的设计惊人地一致。几乎每个控件都由三部分组成：

| 部分 | 作用 | 例子 |
| --- | --- | --- |
| **标签**（label） | 说明这个控件是干什么的 | `Toggle("飞行模式", ...)` 里的文字 |
| **绑定**（binding）或**动作**（action） | 控件读写的数据，或点击时执行的代码 | `isOn: $isOn`、`action: { ... }` |
| **样式**（style） | 控件长什么样 | `.toggleStyle(.switch)` |

掌握了这个模式，遇到新控件时只需要问三个问题：它的标签怎么给？它绑定什么类型的数据？它有哪些样式？

还有一个贯穿始终的原则：**你描述的是控件的“用途”，具体长什么样由平台和上下文决定。** 同一个 `Picker`，在 iOS 的表单里是一行可点击的菜单，在 macOS 上是弹出按钮，放进工具栏又是另一个样子。

## Button

### 基本形式

```swift
struct ButtonBasics: View {
    @State private var count = 0

    var body: some View {
        VStack(spacing: 16) {
            Button("文字按钮") { count += 1 }

            Button("带图标", systemImage: "plus.circle") { count += 1 }

            Button {
                count += 1
            } label: {
                HStack {
                    Image(systemName: "bolt.fill")
                    VStack(alignment: .leading) {
                        Text("自定义标签").font(.headline)
                        Text("点了 \(count) 次").font(.caption)
                    }
                }
            }

            Button("调用方法", action: reset)
        }
    }

    private func reset() { count = 0 }
}
```

标签可以是任何视图。动作是一个闭包。

### 角色

角色（role）告诉系统这个按钮的**语义**，系统据此调整外观和位置：

```swift
struct ButtonRoles: View {
    var body: some View {
        VStack(spacing: 12) {
            Button("删除", role: .destructive) {}
            Button("取消", role: .cancel) {}
            Button("普通按钮") {}
        }
        .buttonStyle(.bordered)
    }
}
```

- `.destructive`：破坏性操作。显示为红色；在弹窗、菜单、滑动操作里会有相应的强调。
- `.cancel`：取消操作。在 `alert` 和 `confirmationDialog` 里会被放到系统规定的位置，并响应 <kbd>Esc</kbd> 键。

iOS 26 / macOS 26 还增加了 `.confirm`、`.close` 等角色，主要用在工具栏和弹窗里，让系统自动给出合适的图标和样式（第 21 章）。

### 内置样式

```swift
struct ButtonStyles: View {
    var body: some View {
        VStack(spacing: 12) {
            Button("automatic 自动") {}.buttonStyle(.automatic)
            Button("plain 朴素") {}.buttonStyle(.plain)
            Button("borderless 无边框") {}.buttonStyle(.borderless)
            Button("bordered 有边框") {}.buttonStyle(.bordered)
            Button("borderedProminent 突出") {}.buttonStyle(.borderedProminent)
        }
    }
}
```

| 样式 | 外观 | 用途 |
| --- | --- | --- |
| `.automatic` | 由上下文决定 | 默认 |
| `.plain` | 没有任何装饰，按下时有轻微反馈 | 完全自定义外观的按钮 |
| `.borderless` | 只有强调色的文字 | 行内的次要操作 |
| `.bordered` | 浅色填充背景 | 次要操作 |
| `.borderedProminent` | 强调色填充背景 | 页面上的主要操作，一个界面最多一个 |
| `.glass` <Badge type="tip" text="26+" /> | Liquid Glass 玻璃材质 | 浮在内容之上的操作 |
| `.glassProminent` <Badge type="tip" text="26+" /> | 带强调色的玻璃材质 | 浮在内容之上的主要操作 |

`.automatic` 在不同环境下的表现：iOS 的普通界面里是无边框的强调色文字；macOS 上是带边框的标准按钮；在工具栏、列表、菜单里又各有不同。

样式是环境型修饰符，加在容器上对里面所有按钮生效。

### 尺寸、形状与颜色

```swift
struct ButtonAppearance: View {
    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Button("mini") {}.controlSize(.mini)
                Button("small") {}.controlSize(.small)
                Button("regular") {}.controlSize(.regular)
                Button("large") {}.controlSize(.large)
            }

            HStack {
                Button("胶囊") {}.buttonBorderShape(.capsule)
                Button("圆角") {}.buttonBorderShape(.roundedRectangle(radius: 6))
                Button("", systemImage: "plus") {}.buttonBorderShape(.circle)
            }

            HStack {
                Button("默认色") {}
                Button("橙色") {}.tint(.orange)
                Button("绿色") {}.tint(.green)
            }

            Button("撑满宽度的主按钮") {}
                .frame(maxWidth: .infinity)
                .controlSize(.large)
        }
        .buttonStyle(.borderedProminent)
        .padding()
    }
}
```

::: info 想一想
最后一个按钮加了 `.frame(maxWidth: .infinity)`，它的蓝色背景会撑满整行吗？
:::

不会。回忆第 4、5 章：`.frame` 是在按钮**外面**套了一个撑满的盒子，按钮自己（连同它的背景）还是贴合内容的大小，只是在盒子里居中了。要让背景也撑满，得让按钮的**标签**撑满：

```swift
struct FullWidthButton: View {
    var body: some View {
        VStack(spacing: 12) {
            Button {
            } label: {
                Text("标签撑满，所有版本可用")
                    .frame(maxWidth: .infinity)
            }

            if #available(iOS 26, macOS 26, *) {
                Button("用 buttonSizing，26 及以上") {}
                    .buttonSizing(.flexible)
            }
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .padding()
    }
}
```

iOS 26 / macOS 26 新增的 `.buttonSizing(.flexible)` 直接表达“这个按钮应该撑满可用空间”，`.fitted` 则是贴合内容。

### 自定义按钮样式

实现 `ButtonStyle` 协议。`configuration` 提供三样东西：标签、是否按下、角色。

```swift
struct ScaleButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .foregroundStyle(.white)
            .background(
                configuration.role == .destructive ? Color.red : Color.accentColor,
                in: .rect(cornerRadius: 14)
            )
            .opacity(isEnabled ? 1 : 0.4)
            .scaleEffect(configuration.isPressed ? 0.94 : 1)
            .animation(.snappy(duration: 0.15), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == ScaleButtonStyle {
    static var scale: ScaleButtonStyle { ScaleButtonStyle() }
}

struct CustomStyleDemo: View {
    var body: some View {
        VStack(spacing: 12) {
            Button("确认") {}
            Button("删除", role: .destructive) {}
            Button("不可用") {}.disabled(true)
        }
        .buttonStyle(.scale)
    }
}
```

那个 `extension ButtonStyle where Self == ...` 让你可以写 `.buttonStyle(.scale)`，和内置样式的用法一致。这是定义自定义样式的惯用写法。

::: tip 什么时候用 ButtonStyle，什么时候用 onTapGesture
只要某个东西“点一下会执行操作”，就用 `Button`，再用 `.buttonStyle(.plain)` 或自定义样式改外观。不要用 `onTapGesture` 冒充按钮。`Button` 自带按下反馈、辅助功能（VoiceOver 会读出“按钮”）、键盘操作、Mac 上的悬停效果，`onTapGesture` 一样都没有。
:::

### 键盘快捷键与重复触发

```swift
struct ButtonExtras: View {
    @State private var value = 0

    var body: some View {
        VStack(spacing: 12) {
            Text("\(value)").font(.title)

            Button("保存") {}
                .keyboardShortcut("s", modifiers: .command)

            Button("默认按钮（回车触发）") {}
                .keyboardShortcut(.defaultAction)

            Button("按住连续增加", systemImage: "plus") { value += 1 }
                .buttonRepeatBehavior(.enabled)
        }
        .padding()
    }
}
```

`keyboardShortcut` 在 macOS 和接了键盘的 iPad 上生效。`.defaultAction` 对应回车键，`.cancelAction` 对应 <kbd>Esc</kbd>。

## Toggle

```swift
struct ToggleDemo: View {
    @State private var wifi = true
    @State private var bold = false
    @State private var options = [false, true, false]

    var body: some View {
        Form {
            Toggle("无线局域网", isOn: $wifi)

            Toggle("蓝牙", systemImage: "wave.3.right", isOn: $wifi)

            Toggle(isOn: $bold) {
                Label("粗体", systemImage: "bold")
            }
            .toggleStyle(.button)

            Toggle("全部通知", sources: $options, isOn: \.self)     // 聚合多个开关
        }
    }
}
```

| 样式 | 外观 | 平台 |
| --- | --- | --- |
| `.switch` | 滑动开关 | 全平台。iOS 的默认 |
| `.button` | 按下/弹起两种状态的按钮 | 全平台。适合工具栏里的格式按钮 |
| `.checkbox` | 复选框 | 仅 macOS。macOS 的默认 |

最后一个 `Toggle(sources:isOn:)` 把一组布尔值聚合成一个开关：全开时是开，全关时是关，部分开时显示“混合”状态。

自定义样式实现 `ToggleStyle`：

```swift
struct CheckmarkToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button {
            configuration.isOn.toggle()
        } label: {
            HStack {
                Image(systemName: configuration.isOn ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(configuration.isOn ? AnyShapeStyle(.tint) : AnyShapeStyle(.secondary))
                    .font(.title3)
                configuration.label
            }
        }
        .buttonStyle(.plain)
    }
}

struct CheckmarkToggleDemo: View {
    @State private var done = false

    var body: some View {
        Toggle("完成练习", isOn: $done)
            .toggleStyle(CheckmarkToggleStyle())
            .padding()
    }
}
```

## Slider 与 Stepper

```swift
struct SliderStepperDemo: View {
    @State private var brightness = 0.5
    @State private var rating = 3.0
    @State private var quantity = 1

    var body: some View {
        Form {
            Slider(value: $brightness)

            Slider(value: $rating, in: 1...5, step: 1) {
                Text("评分")
            } minimumValueLabel: {
                Text("1")
            } maximumValueLabel: {
                Text("5")
            } onEditingChanged: { isEditing in
                print(isEditing ? "开始拖动" : "松手")
            }

            Stepper("数量：\(quantity)", value: $quantity, in: 1...99)

            Stepper("自定义步进") {
                quantity += 10
            } onDecrement: {
                quantity = max(1, quantity - 10)
            }
        }
    }
}
```

- `Slider` 绑定浮点数。`in:` 指定范围（默认 0...1），`step:` 指定步长。
- `onEditingChanged` 在开始和结束拖动时调用。想在松手时才执行昂贵操作（如保存）就用它。
- `Stepper` 绑定任何可步进的数值类型，也可以完全自定义加减行为。

## Picker

`Picker` 让用户从一组选项里选一个。

```swift
enum Flavor: String, CaseIterable, Identifiable {
    case vanilla = "香草"
    case chocolate = "巧克力"
    case matcha = "抹茶"
    var id: Self { self }
}

struct PickerDemo: View {
    @State private var flavor = Flavor.vanilla

    var body: some View {
        Form {
            Picker("口味", selection: $flavor) {
                ForEach(Flavor.allCases) { flavor in
                    Text(flavor.rawValue).tag(flavor)
                }
            }

            Picker("口味", selection: $flavor) {
                ForEach(Flavor.allCases) { flavor in
                    Text(flavor.rawValue).tag(flavor)
                }
            }
            .pickerStyle(.segmented)

            Picker("口味", selection: $flavor) {
                ForEach(Flavor.allCases) { flavor in
                    Text(flavor.rawValue).tag(flavor)
                }
            }
            .pickerStyle(.inline)
        }
    }
}
```

### tag 是关键

`Picker` 靠 `.tag()` 把每个选项和一个值关联起来。用户选中某项时，`Picker` 把该项的 tag 值写进 `selection`。

::: danger tag 的类型必须和 selection 完全一致
这是 `Picker` 最常见的问题：选了没反应，或者没有任何一项显示为选中。原因几乎总是 tag 的类型和 `selection` 的类型不匹配。

- `selection` 是 `Flavor`，tag 就必须是 `Flavor`，不能是 `String`。
- `selection` 是 `Flavor?`（可选），tag 就必须是 `Flavor?`，要写 `.tag(Flavor?.some(flavor))` 或 `.tag(flavor as Flavor?)`。
- `selection` 是 `Int`，`ForEach(0..<3)` 里的 `.tag(index)` 没问题，但别写成 `.tag("\(index)")`。

用 `ForEach` 遍历 `Identifiable` 数据并且 `selection` 的类型正好是 `ID` 类型时，可以省略 `.tag`，SwiftUI 会自动用 id 当 tag。
:::

### 样式

| 样式 | 外观 | 平台 |
| --- | --- | --- |
| `.automatic` | 由上下文决定 | 全平台 |
| `.menu` | 点击弹出菜单 | 全平台 |
| `.segmented` | 分段控件 | 全平台。适合 2–5 个短选项 |
| `.inline` | 选项直接铺在列表里 | 全平台 |
| `.wheel` | 滚轮 | iOS |
| `.navigationLink` | 点击后推入一个选择页面 | iOS。适合选项很多的情况 |
| `.palette` | 一排紧凑的图标，用在菜单里 | 全平台 |
| `.radioGroup` | 单选按钮组 | macOS |
| `.tabs` <Badge type="tip" text="iOS 27+ / macOS 27+" /> | 页签样式 | 27 新增 |

选项可以带图标，用 `Label`。可以用 `Section` 分组，用 `Divider` 分隔。

## DatePicker 与 ColorPicker

```swift
struct DateColorDemo: View {
    @State private var date = Date.now
    @State private var color = Color.blue

    var body: some View {
        Form {
            DatePicker("日期和时间", selection: $date)

            DatePicker("仅日期", selection: $date, displayedComponents: .date)

            DatePicker("未来的时间", selection: $date, in: Date.now..., displayedComponents: .hourAndMinute)

            DatePicker("日历", selection: $date, displayedComponents: .date)
                .datePickerStyle(.graphical)

            ColorPicker("主题色", selection: $color)

            ColorPicker("不支持透明度", selection: $color, supportsOpacity: false)
        }
    }
}
```

`DatePicker` 的样式：`.compact`（紧凑，点击后弹出）、`.graphical`（直接显示日历）、`.wheel`（iOS 滚轮）、`.field` 和 `.stepperField`（macOS 文本框）。

`in:` 参数限制可选范围，`Date.now...` 表示只能选现在之后的时间。

多选日期用 `MultiDatePicker`（iOS）。

## Menu

`Menu` 把一组操作收进一个按钮里：

```swift
struct MenuDemo: View {
    @State private var sort = "日期"
    @State private var showHidden = false

    var body: some View {
        Menu {
            Button("新建文件夹", systemImage: "folder.badge.plus") {}
            Button("导入…", systemImage: "square.and.arrow.down") {}

            Divider()

            Picker("排序方式", selection: $sort) {
                Text("名称").tag("名称")
                Text("日期").tag("日期")
                Text("大小").tag("大小")
            }

            Toggle("显示隐藏文件", isOn: $showHidden)

            Menu("更多") {
                Button("导出为 PDF") {}
                Button("打印…") {}
            }

            Divider()

            Button("删除全部", systemImage: "trash", role: .destructive) {}
        } label: {
            Label("操作", systemImage: "ellipsis.circle")
        }
    }
}
```

菜单里可以放 `Button`、`Toggle`、`Picker`、`Divider`、`Section`，以及嵌套的 `Menu`。这些控件在菜单里会自动变成菜单项的样子：`Toggle` 变成带勾的项，`Picker` 变成一组单选项。**你没有写任何“菜单项”相关的代码**，只是把普通控件放了进去。这就是“描述用途，由上下文决定外观”的又一个例子。

带主操作的菜单：点击执行主操作，长按（iOS）或点击箭头（macOS）展开菜单。

```swift
struct MenuPrimaryAction: View {
    var body: some View {
        Menu("发送") {
            Button("稍后发送…") {}
            Button("存为草稿") {}
        } primaryAction: {
            print("立即发送")
        }
        .buttonStyle(.borderedProminent)
    }
}
```

长按或右键弹出的菜单用 `.contextMenu`：

```swift
struct ContextMenuDemo: View {
    var body: some View {
        Text("长按或右键点击我")
            .padding()
            .background(.quaternary, in: .rect(cornerRadius: 8))
            .contextMenu {
                Button("拷贝", systemImage: "doc.on.doc") {}
                Button("分享", systemImage: "square.and.arrow.up") {}
                Divider()
                Button("删除", systemImage: "trash", role: .destructive) {}
            }
    }
}
```

## Link

```swift
struct LinkDemo: View {
    var body: some View {
        VStack(spacing: 12) {
            Link("Apple 开发者网站", destination: URL(string: "https://developer.apple.com")!)

            Link(destination: URL(string: "https://www.swift.org")!) {
                Label("Swift.org", systemImage: "swift")
            }
            .buttonStyle(.bordered)
        }
    }
}
```

`Link` 是一个打开 URL 的按钮。它通过环境里的 `openURL` 动作工作（第 11 章），所以可以被上层拦截。

## ControlGroup

把相关的控件组合成一个视觉单元：

```swift
struct ControlGroupDemo: View {
    var body: some View {
        VStack(spacing: 20) {
            ControlGroup {
                Button("后退", systemImage: "chevron.left") {}
                Button("前进", systemImage: "chevron.right") {}
            }

            ControlGroup("文字格式") {
                Button("粗体", systemImage: "bold") {}
                Button("斜体", systemImage: "italic") {}
                Button("下划线", systemImage: "underline") {}
            }
            .controlGroupStyle(.navigation)
        }
        .padding()
    }
}
```

在工具栏里是一组连在一起的按钮；在菜单里，带上 `.controlGroupStyle(.compactMenu)` 或 `.palette` 会变成横排的一行图标。

## ProgressView 与 Gauge

```swift
struct ProgressDemo: View {
    @State private var progress = 0.35

    var body: some View {
        VStack(spacing: 24) {
            ProgressView()                                  // 不确定进度：转圈

            ProgressView("正在同步…")

            ProgressView(value: progress)                   // 确定进度：进度条

            ProgressView(value: progress) {
                Text("下载中")
            } currentValueLabel: {
                Text(progress, format: .percent.precision(.fractionLength(0)))
            }

            ProgressView(value: progress)
                .progressViewStyle(.circular)

            Slider(value: $progress)
        }
        .padding()
    }
}
```

`ProgressView` 表示“任务完成了多少”。`Gauge` 表示“一个数值在范围里处于什么位置”，比如温度、电量、速度：

```swift
struct GaugeDemo: View {
    @State private var temperature = 22.0

    var body: some View {
        VStack(spacing: 24) {
            Gauge(value: temperature, in: 0...40) {
                Text("温度")
            } currentValueLabel: {
                Text("\(Int(temperature))°")
            } minimumValueLabel: {
                Text("0")
            } maximumValueLabel: {
                Text("40")
            }

            HStack(spacing: 30) {
                Gauge(value: temperature, in: 0...40) {
                    Image(systemName: "thermometer.medium")
                } currentValueLabel: {
                    Text("\(Int(temperature))")
                }
                .gaugeStyle(.accessoryCircular)
                .tint(Gradient(colors: [.blue, .green, .orange, .red]))

                Gauge(value: temperature, in: 0...40) {
                    Text("°C")
                }
                .gaugeStyle(.accessoryCircularCapacity)
                .tint(.orange)
            }

            Slider(value: $temperature, in: 0...40)
        }
        .padding()
    }
}
```

## 让控件适应上下文

### 禁用

```swift
struct DisabledDemo: View {
    @State private var agreed = false
    @State private var name = ""

    var body: some View {
        Form {
            TextField("姓名", text: $name)
            Toggle("我已阅读并同意条款", isOn: $agreed)
            Button("提交") {}
                .disabled(!agreed || name.isEmpty)
        }
    }
}
```

`.disabled()` 是环境型的。条件直接从状态计算，不需要单独维护一个“按钮是否可用”的状态。

### LabeledContent

把一个标签和任意内容排成一行，在 `Form` 里自动对齐：

```swift
struct LabeledContentDemo: View {
    var body: some View {
        Form {
            LabeledContent("版本", value: "2.4.1")
            LabeledContent("存储空间") {
                Text("128 GB").foregroundStyle(.secondary)
            }
            LabeledContent("亮度") {
                Slider(value: .constant(0.6))
            }
        }
    }
}
```

### 平台差异一览

同一段控件代码在两个平台上的默认表现：

| 控件 | iOS 默认 | macOS 默认 |
| --- | --- | --- |
| `Button` | 强调色文字，无边框 | 带边框的按钮 |
| `Toggle` | 滑动开关 | 复选框 |
| `Picker`（在 `Form` 里） | 一行，点击弹出菜单 | 弹出按钮（pop-up button） |
| `DatePicker` | 紧凑样式，点击弹出日历 | 文本框加步进器 |
| `Stepper` | 加减两个按钮 | 上下两个小箭头 |
| `Slider` | 较粗的滑轨和圆形滑块 | 较细的滑轨 |
| `Form` | 分组的圆角列表 | 右对齐标签的两列布局 |

这些差异是有意为之的。每个平台的用户都习惯了本平台的控件样式。保留默认行为，你的应用在每个平台上都显得“原生”。只有在有明确设计理由时才强制指定样式。

## 常见误区

**误区一：“用 `Text` 加 `onTapGesture` 做按钮。”** 丢失了按下反馈、辅助功能、键盘支持和悬停效果。用 `Button` 加自定义样式。

**误区二：“`.frame(maxWidth: .infinity)` 加在 `Button` 上让按钮变宽。”** 这只是把按钮放进了一个宽盒子。要让标签撑满，或者用 `.buttonSizing(.flexible)`。

**误区三：“`Picker` 选不中。”** 检查 `.tag()` 的类型是否和 `selection` 完全一致，尤其注意可选类型。

**误区四：“为了跨平台一致，把所有控件都自定义成一个样子。”** 这样做的结果是在哪个平台上都不像原生应用。尊重平台默认值。

**误区五：“一个界面放好几个 `.borderedProminent` 按钮。”** 突出样式的意义在于告诉用户“这是最主要的操作”。到处都突出就等于没有突出。

## 小结

- 控件由标签、绑定（或动作）、样式三部分组成，你描述用途，平台决定外观。
- `Button` 有角色、五种基础样式加两种玻璃样式，可用 `controlSize`、`buttonBorderShape`、`tint` 调整，用 `ButtonStyle` 完全自定义。
- `Toggle`、`Slider`、`Stepper`、`Picker`、`DatePicker`、`ColorPicker` 都通过绑定读写数据。
- `Picker` 的 `tag` 类型必须与 `selection` 一致。
- `Menu` 里放普通控件，它们会自动变成菜单项；`contextMenu` 提供长按/右键菜单。
- `ProgressView` 表示任务进度，`Gauge` 表示数值在范围中的位置。

## 练习

1. 做一个“主按钮”样式 `PrimaryButtonStyle`：撑满宽度、高 50、圆角 12、按下时变暗、禁用时半透明、`role` 为破坏性时变红。
2. 做一个文本格式工具条：粗体、斜体、下划线三个 `Toggle`（`.button` 样式）放在 `ControlGroup` 里，下面一段示例文字实时反映格式。
3. 做一个闹钟设置表单：时间（`DatePicker`，只选时分）、重复（`Picker`：永不/每天/工作日/周末）、铃声音量（`Slider`）、稍后提醒（`Toggle`）。在 iOS 和 macOS 预览里分别查看。
4. 做一个 `Menu`，里面有一个 `Picker` 用于选择视图模式（列表/网格/画廊，带图标，用 `.palette` 样式），以及一个排序方式的子菜单。

## 官方文档

- [Controls and indicators（控件总览）](https://developer.apple.com/documentation/swiftui/controls-and-indicators)
- [`Button`](https://developer.apple.com/documentation/swiftui/button)
- [`ButtonStyle`](https://developer.apple.com/documentation/swiftui/buttonstyle)
- [`PrimitiveButtonStyle`](https://developer.apple.com/documentation/swiftui/primitivebuttonstyle)
- [`ButtonRole`](https://developer.apple.com/documentation/swiftui/buttonrole)
- [`Toggle`](https://developer.apple.com/documentation/swiftui/toggle)
- [`Slider`](https://developer.apple.com/documentation/swiftui/slider)
- [`Stepper`](https://developer.apple.com/documentation/swiftui/stepper)
- [`Picker`](https://developer.apple.com/documentation/swiftui/picker)
- [`PickerStyle`](https://developer.apple.com/documentation/swiftui/pickerstyle)
- [`DatePicker`](https://developer.apple.com/documentation/swiftui/datepicker)
- [`ColorPicker`](https://developer.apple.com/documentation/swiftui/colorpicker)
- [`Menu`](https://developer.apple.com/documentation/swiftui/menu)
- [`Link`](https://developer.apple.com/documentation/swiftui/link)
- [`ControlGroup`](https://developer.apple.com/documentation/swiftui/controlgroup)
- [`ProgressView`](https://developer.apple.com/documentation/swiftui/progressview)
- [`Gauge`](https://developer.apple.com/documentation/swiftui/gauge)
- [`LabeledContent`](https://developer.apple.com/documentation/swiftui/labeledcontent)
- [`controlSize(_:)`](https://developer.apple.com/documentation/swiftui/view/controlsize(_:))
- [Human Interface Guidelines：Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
