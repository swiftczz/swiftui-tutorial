# 36 无障碍与本地化

## 本章目标

- 理解辅助技术是怎么“看”你的界面的
- 知道 SwiftUI 默认提供了什么，以及哪些地方需要你补充
- 掌握无障碍修饰符：标签、值、特征、动作、分组
- 适配动态字体、对比度、色彩等显示偏好
- 用 String Catalog 做本地化
- 正确处理复数、格式化和从右向左的布局
- 学会测试无障碍和本地化

这一章讲的两件事有一个共同点：**让更多的人能用你的应用。** 它们也都是越早做越省事，等界面全部写完再补，代价会大很多。

## 第一部分：无障碍

### 谁在用，怎么用

无障碍（accessibility）不只是为视障用户服务。使用辅助功能的人比想象的多：

| 辅助技术 | 使用方式 | 谁在用 |
| --- | --- | --- |
| **VoiceOver** | 屏幕阅读器。朗读手指触摸到的元素，用手势在元素间移动和操作 | 视障用户 |
| **动态字体** | 放大（或缩小）全系统的文字 | 视力下降的用户、年长的用户，以及大量普通用户 |
| **语音控制** | 用说话操作界面：“轻点 保存” | 运动障碍的用户 |
| **切换控制** | 用一两个开关依次扫描并选择界面元素 | 严重运动障碍的用户 |
| **全键盘控制** | 只用键盘操作 | 运动障碍的用户；Mac 上的键盘重度用户 |
| **增强对比度、降低透明度、减弱动态效果、不以颜色区分** | 调整显示方式 | 视力、前庭功能、色觉有差异的用户 |

把无障碍做好，受益的是所有人：更清晰的层次、更大的点击区域、更好的键盘支持、对各种字号都稳固的布局。

### 辅助技术看到的界面

VoiceOver 看不到像素。它看到的是一棵**无障碍树**：界面上每个有意义的元素是一个节点，每个节点有几项属性。

| 属性 | 回答的问题 | VoiceOver 怎么用 |
| --- | --- | --- |
| **标签**（label） | 这是什么？ | 最先朗读。“收藏” |
| **值**（value） | 它现在的状态是什么？ | 接着朗读。“已选中”“50%” |
| **特征**（traits） | 它是哪一类东西？ | 朗读类别。“按钮”“标题”“图像” |
| **提示**（hint） | 操作它会发生什么？ | 停顿后朗读。“轻点两下以添加到收藏夹” |
| **动作**（actions） | 能对它做什么？ | 激活、调整、自定义动作 |

对一个标准的 `Toggle("无线局域网", isOn: $wifi)`，VoiceOver 会读：“无线局域网，开关按钮，开。轻点两下以切换设置。”这些信息全部是 SwiftUI 自动提供的。

### SwiftUI 默认给了你什么

**用标准组件，无障碍就已经完成了大半。**

- `Button`、`Toggle`、`Slider`、`Picker`、`TextField`、`Stepper` 等控件：自动有正确的标签、值、特征和动作。
- `Text`：自动可读。
- `Label("收藏", systemImage: "star")`：标题自动成为无障碍标签，即使界面上只显示图标。这是第 14、21 章反复强调“工具栏按钮要给标题”的原因。
- `NavigationStack`、`TabView`、`List`、`.sheet`、`.alert`：自动有正确的结构、焦点管理和朗读顺序。
- 语义字体：自动支持动态字体。
- 语义颜色：自动适配增强对比度。
- SF Symbols：自带无障碍描述。

所以你要做的工作集中在三类地方：

1. **只有图片、没有文字的元素**
2. **自己画的自定义控件**
3. **视觉上是一组、但由多个视图拼成的内容**

### 给元素补上标签

```swift
struct LabelExamples: View {
    @State private var isFavorite = false

    var body: some View {
        VStack(spacing: 24) {
            // 一、只有图标的按钮：用带标题的初始化器，再隐藏标题
            Button("添加到收藏", systemImage: "star") {}
                .labelStyle(.iconOnly)

            // 二、图片按钮：明确给出标签
            Button {
                isFavorite.toggle()
            } label: {
                Image(systemName: isFavorite ? "heart.fill" : "heart")
            }
            .accessibilityLabel(isFavorite ? "取消喜欢" : "喜欢")

            // 三、有信息量的图片：描述内容
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.largeTitle)
                .accessibilityLabel("本周销售额上升趋势图")

            // 四、纯装饰的图片：对辅助技术隐藏
            Image(systemName: "sparkles")
                .accessibilityHidden(true)
        }
    }
}
```

写标签的原则：

- **说它是什么，不说它长什么样。** “喜欢”，不是“心形图标”。
- **不要包含类别。** 写“保存”，不要写“保存按钮”。“按钮”由特征提供，否则会读成“保存按钮，按钮”。
- **简短。** 用户会听很多遍。
- **会随状态变化的控件，标签或值也要跟着变。**
- 资源目录里的图片，纯装饰的用 `Image(decorative: "名字")`，辅助技术会自动忽略它。

### 值、提示、特征

```swift
struct RatingControl: View {
    @Binding var rating: Int
    let maximum = 5

    var body: some View {
        HStack(spacing: 4) {
            ForEach(1...maximum, id: \.self) { star in
                Image(systemName: star <= rating ? "star.fill" : "star")
                    .foregroundStyle(star <= rating ? .yellow : .secondary)
                    .onTapGesture { rating = star }
            }
        }
        .font(.title2)
        // 以下把五颗星合并成一个可调节的元素
        .accessibilityElement()
        .accessibilityLabel("评分")
        .accessibilityValue("\(rating) 星，共 \(maximum) 星")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: rating = min(rating + 1, maximum)
            case .decrement: rating = max(rating - 1, 0)
            @unknown default: break
            }
        }
    }
}

struct RatingDemo: View {
    @State private var rating = 3

    var body: some View {
        RatingControl(rating: $rating).padding()
    }
}
```

这是一个自定义控件的完整例子。没有无障碍修饰符时，VoiceOver 会把它当成五个互不相关的“图像”，而且无法操作（`onTapGesture` 对 VoiceOver 不可见）。加上之后：

- `.accessibilityElement()`：把这一组视图合并成**一个**无障碍元素，忽略里面的子元素。
- `.accessibilityLabel("评分")`：它是什么。
- `.accessibilityValue(...)`：当前的值。
- `.accessibilityAdjustableAction`：声明它是“可调节的”。VoiceOver 用户上下轻扫就能增减。同时自动获得“可调节”特征。

VoiceOver 读作：“评分，3 星，共 5 星，可调节。向上或向下轻扫以调整值。”

常用的特征：

```swift
struct TraitExamples: View {
    @State private var selected = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("账户设置")
                .font(.title2.bold())
                .accessibilityAddTraits(.isHeader)                    // 标题：用户可以按标题快速跳转

            HStack {
                ForEach(0..<3, id: \.self) { index in
                    Text("选项 \(index + 1)")
                        .padding(8)
                        .background(selected == index ? Color.accentColor.opacity(0.2) : .clear, in: .capsule)
                        .onTapGesture { selected = index }
                        .accessibilityAddTraits(.isButton)            // 用手势实现的点击：声明它是按钮
                        .accessibilityAddTraits(selected == index ? .isSelected : [])
                }
            }

            Text("更新于 3 分钟前")
                .accessibilityAddTraits(.updatesFrequently)           // 内容会频繁变化
        }
        .padding()
    }
}
```

| 特征 | 含义 |
| --- | --- |
| `.isButton` | 可以被激活 |
| `.isHeader` | 是一个标题。VoiceOver 的转子可以在标题之间跳转 |
| `.isSelected` | 当前被选中 |
| `.isLink` | 是一个链接 |
| `.isImage` | 是一张图片 |
| `.isToggle` | 是一个开关 |
| `.updatesFrequently` | 内容频繁更新，不要每次都朗读 |
| `.isModal` | 是模态内容，其他内容暂时不可访问 |

给页面里的各个分区标题加上 `.isHeader`，是成本最低、效果最明显的改进之一：VoiceOver 用户可以像明眼人扫视页面一样，快速在标题之间跳转。

提示（hint）用来说明不那么显而易见的操作结果：

```swift nocheck
Button("归档") { }
    .accessibilityHint("把这封邮件移到归档文件夹")
```

提示应该是补充信息。标签已经说清楚的就不需要提示。

### 分组：把零散的视图合成有意义的元素

```swift
struct ContactCard: View {
    var body: some View {
        VStack(spacing: 20) {
            // 没有分组：VoiceOver 要轻扫四次，分别读“图像”“陈一”“产品经理”“在线”
            HStack {
                Image(systemName: "person.crop.circle.fill").font(.largeTitle)
                VStack(alignment: .leading) {
                    Text("陈一").font(.headline)
                    Text("产品经理").font(.subheadline)
                }
                Spacer()
                Text("在线").foregroundStyle(.green)
            }

            // 合并：一次读完“陈一，产品经理，在线”
            HStack {
                Image(systemName: "person.crop.circle.fill").font(.largeTitle)
                    .accessibilityHidden(true)
                VStack(alignment: .leading) {
                    Text("陈一").font(.headline)
                    Text("产品经理").font(.subheadline)
                }
                Spacer()
                Text("在线").foregroundStyle(.green)
            }
            .accessibilityElement(children: .combine)

            // 完全自定义：忽略子元素，自己写一句通顺的话
            HStack {
                Image(systemName: "person.crop.circle.fill").font(.largeTitle)
                VStack(alignment: .leading) {
                    Text("陈一").font(.headline)
                    Text("产品经理").font(.subheadline)
                }
                Spacer()
                Text("在线").foregroundStyle(.green)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("陈一，产品经理，当前在线")
        }
        .padding()
    }
}
```

`.accessibilityElement(children:)` 的三种模式：

| 模式 | 行为 | 适合 |
| --- | --- | --- |
| `.combine` | 合并成一个元素，标签由子元素的标签拼接而成，子元素的动作也合并进来 | 大多数“卡片”“行” |
| `.ignore` | 合并成一个元素，忽略所有子元素，由你提供标签和值 | 需要一句更自然的描述时 |
| `.contain` | 保留子元素各自独立，但把它们标记为一组 | 让一组元素在导航时被当作一个容器 |

`List` 的行默认已经做了合并。在 `LazyVStack` 里自己拼的行，需要你来加。

### 自定义动作

一行内容上有好几个操作（收藏、分享、删除），视觉上是几个小按钮或滑动操作。对 VoiceOver 用户，更好的方式是把整行作为一个元素，把这些操作作为它的**自定义动作**：

```swift
struct MessageRow: View {
    @State private var isFlagged = false
    @State private var log = ""

    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                VStack(alignment: .leading) {
                    Text("项目周会").font(.headline)
                    Text("明天上午十点，三号会议室").font(.subheadline)
                }
                Spacer()
                if isFlagged {
                    Image(systemName: "flag.fill").foregroundStyle(.orange)
                }
            }
            .accessibilityElement(children: .combine)
            .accessibilityValue(isFlagged ? "已标旗" : "")
            .accessibilityAction(named: isFlagged ? "取消旗标" : "标旗") {
                isFlagged.toggle()
            }
            .accessibilityAction(named: "归档") {
                log = "已归档"
            }
            .accessibilityAction(named: "删除") {
                log = "已删除"
            }

            Text(log).font(.caption)
        }
        .padding()
    }
}
```

VoiceOver 用户聚焦到这一行后，上下轻扫可以在“标旗”“归档”“删除”之间选择，轻点两下执行。不需要先找到一个个小按钮。

`.swipeActions` 和 `.contextMenu` 里的操作会自动成为自定义动作，不需要重复添加。

### 用标准控件来“代言”

自定义控件的行为如果和某个标准控件相同，最省事的办法是告诉辅助技术“把我当成那个控件”：

```swift
struct CustomCheckbox: View {
    @Binding var isOn: Bool
    let title: String

    var body: some View {
        HStack {
            RoundedRectangle(cornerRadius: 4)
                .strokeBorder(.secondary, lineWidth: 2)
                .background(isOn ? Color.accentColor : .clear, in: .rect(cornerRadius: 4))
                .frame(width: 22, height: 22)
                .overlay {
                    if isOn {
                        Image(systemName: "checkmark").font(.caption.bold()).foregroundStyle(.white)
                    }
                }
            Text(title)
        }
        .contentShape(.rect)
        .onTapGesture { isOn.toggle() }
        .accessibilityRepresentation {
            Toggle(title, isOn: $isOn)          // 对辅助技术来说，它就是一个 Toggle
        }
    }
}

struct CustomCheckboxDemo: View {
    @State private var agreed = false

    var body: some View {
        CustomCheckbox(isOn: $agreed, title: "同意服务条款").padding()
    }
}
```

`.accessibilityRepresentation` 里的视图不会显示，但它的无障碍信息（标签、值、特征、动作）会被用来代表外面的自定义视图。所有细节都由系统的 `Toggle` 保证正确。

（当然，更好的做法是直接用 `Toggle` 加自定义的 `ToggleStyle`，第 15 章讲过。）

### 顺序、焦点与播报

**朗读顺序**默认按照视图在布局中的位置（从上到下，从行首到行尾）。需要调整时：

```swift nocheck
.accessibilitySortPriority(1)      // 数值大的先读
```

**把 VoiceOver 的焦点移到某个元素**，比如出现错误时聚焦到错误信息：

```swift
struct FocusOnError: View {
    @State private var email = ""
    @State private var errorMessage: String?
    @AccessibilityFocusState private var isErrorFocused: Bool

    var body: some View {
        Form {
            TextField("电子邮箱", text: $email)

            if let errorMessage {
                Label(errorMessage, systemImage: "exclamationmark.triangle")
                    .foregroundStyle(.red)
                    .accessibilityFocused($isErrorFocused)
            }

            Button("提交") {
                if email.contains("@") {
                    errorMessage = nil
                } else {
                    errorMessage = "邮箱格式不正确"
                    isErrorFocused = true           // 让 VoiceOver 立刻读出错误
                }
            }
        }
    }
}
```

`@AccessibilityFocusState` 和第 16 章的 `@FocusState` 用法相同，只是它控制的是辅助技术的焦点。

**主动播报**一条消息，比如后台操作完成时：

```swift
struct AnnouncementDemo: View {
    @State private var count = 0

    var body: some View {
        Button("刷新") {
            count += 1
            AccessibilityNotification.Announcement("已加载 \(count * 12) 条新内容").post()
        }
    }
}
```

视觉上，新内容出现用户一眼就看到了。VoiceOver 用户不知道屏幕上别处发生了变化，需要你告诉他。

### 显示偏好

用户可以在系统设置里调整显示方式。SwiftUI 通过环境值告诉你这些偏好。

#### 动态字体

第 14 章已经讲过核心内容：用语义字体，用 `@ScaledMetric` 让自定义尺寸跟随字号，在超大字号下把横排改成竖排。这里补充两点。

**不要限制字号。** `.dynamicTypeSize(...DynamicTypeSize.xxLarge)` 可以给视图设一个上限，但它等于告诉需要大字的用户“这里你看不清就算了”。只用在确实无法放大的地方（标签栏、导航栏这类系统已经处理了的位置不需要你管）。

**放不大的小元素，提供大内容查看器。** 对于工具栏里固定大小的小图标，长按时可以在屏幕中央显示一个放大的版本：

```swift ios
struct LargeContentDemo: View {
    var body: some View {
        HStack(spacing: 30) {
            Image(systemName: "house").accessibilityShowsLargeContentViewer {
                Label("首页", systemImage: "house")
            }
            Image(systemName: "gear").accessibilityShowsLargeContentViewer {
                Label("设置", systemImage: "gear")
            }
        }
        .font(.title3)
        .dynamicTypeSize(.large)
    }
}
```

系统的标签栏和工具栏已经自带这个功能。

#### 不要只用颜色传达信息

大约每十二个男性里就有一个有某种程度的色觉差异。**红色表示错误、绿色表示成功**，对他们来说可能分辨不出来。

```swift
struct StatusIndicator: View {
    @Environment(\.accessibilityDifferentiateWithoutColor) private var differentiateWithoutColor
    let isOnline: Bool

    var body: some View {
        HStack(spacing: 6) {
            if differentiateWithoutColor {
                Image(systemName: isOnline ? "checkmark.circle.fill" : "xmark.circle.fill")
            } else {
                Circle().frame(width: 10, height: 10)
            }
            Text(isOnline ? "在线" : "离线")
        }
        .foregroundStyle(isOnline ? .green : .red)
    }
}
```

更好的做法是**始终**同时用颜色和另一种线索（图标、文字、形状），不依赖用户开启设置。上例里文字“在线”/“离线”已经提供了非颜色的信息。

#### 对比度与透明度

```swift
struct ContrastAware: View {
    @Environment(\.colorSchemeContrast) private var contrast
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var body: some View {
        Text("重要提示")
            .padding()
            .background {
                if reduceTransparency {
                    Color.gray.opacity(0.3)                                   // 不透明的替代
                } else {
                    Rectangle().fill(.ultraThinMaterial)
                }
            }
            .overlay {
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(.primary.opacity(contrast == .increased ? 0.8 : 0.2))   // 增强对比度时边框更明显
            }
            .clipShape(.rect(cornerRadius: 10))
    }
}
```

| 环境值 | 用户的设置 | 你应该 |
| --- | --- | --- |
| `\.colorSchemeContrast` | 增强对比度 | 加深边框和分隔线，避免浅灰色文字 |
| `\.accessibilityReduceTransparency` | 降低透明度 | 把半透明背景换成不透明的 |
| `\.accessibilityReduceMotion` | 减弱动态效果 | 第 26、30 章 |
| `\.accessibilityDifferentiateWithoutColor` | 不以颜色区分 | 用形状、图标、文字辅助 |
| `\.accessibilityInvertColors` | 反转颜色 | 照片和视频加 `.accessibilityIgnoresInvertColors()` |
| `\.legibilityWeight` | 粗体文本 | 系统字体自动处理 |

使用系统的语义颜色、材质和 Liquid Glass 时，这些大多会自动适配。需要你处理的是自定义的颜色和效果。

文字和背景的对比度，建议至少达到 4.5:1（正文）和 3:1（大字号）。Xcode 自带的 Accessibility Inspector 里有颜色对比度计算器。

#### 点击区域

可点击元素至少 44 × 44 点（第 24 章）。这对运动不便的用户很重要，对所有人在晃动的地铁上也很重要。

### 语音控制与键盘

**语音控制**的用户通过说出元素的名字来操作：“轻点 发送”。默认使用无障碍标签作为名字。如果标签很长或不容易说，提供更短的替代：

```swift nocheck
Button("发送给所有收件人", systemImage: "paperplane") { }
    .accessibilityInputLabels(["发送", "发送邮件", "发出"])
```

**全键盘控制**依赖正确的焦点行为。使用标准控件时自动支持。自定义控件要加 `.focusable()` 并响应按键（第 32 章）。

### 测试无障碍

**一、亲自用 VoiceOver。** 这是无可替代的。

- iPhone：设置 › 辅助功能 › VoiceOver。建议把“辅助功能快捷键”设为 VoiceOver，三击侧边按钮即可开关。
- 基本手势：左右轻扫在元素间移动；轻点两下激活；三指轻扫滚动；两指轻点两下是“魔法轻点”。
- Mac：<kbd>⌘F5</kbd> 开关。用 <kbd>⌃⌥</kbd> 加方向键导航。
- **闭上眼睛**（或者开启屏幕幕帘：三指轻点三下）完成应用的一个主要流程。你会立刻发现问题。

**二、Accessibility Inspector。** Xcode › Open Developer Tool › Accessibility Inspector。它可以：指向模拟器或 Mac 应用里的任意元素，查看它的标签、值、特征；运行自动审查，列出缺少标签、对比度不足、点击区域太小等问题；实时调整字号和各种显示设置。

**三、自动化审查。** 在界面测试里调用 `try app.performAccessibilityAudit()`，它会对当前屏幕运行一组无障碍检查，发现问题则测试失败。把它加进主要页面的界面测试，可以防止无障碍问题在后续开发中悄悄出现。

**四、检查清单。**

- [ ] 每个可交互的元素都有清楚的标签
- [ ] 装饰性的图片已隐藏
- [ ] 自定义控件有正确的特征和动作
- [ ] 相关的内容已合并分组，朗读顺序合理
- [ ] 各分区有标题特征
- [ ] 最大字号下内容不截断、不重叠
- [ ] 不只依靠颜色传达信息
- [ ] 文字对比度足够
- [ ] 点击区域足够大
- [ ] 开启“减弱动态效果”后动画得体
- [ ] 只用键盘（Mac、iPad）能完成主要操作

## 第二部分：本地化

本地化（localization）是让应用适应不同语言和地区。它包括：翻译文字；按当地的习惯显示日期、数字、货币、度量单位；适应不同的文字长度和书写方向。

### SwiftUI 已经为本地化做好了准备

一个关键的事实：**`Text("你好")` 里的字符串字面量不是普通的 `String`，而是 `LocalizedStringKey`。** SwiftUI 会自动拿它去翻译表里查找对应当前语言的译文。

`Button("保存")`、`Label("设置", systemImage:)`、`Toggle("通知", isOn:)`、`.navigationTitle("首页")`、`TextField("姓名", text:)` 等接受字符串字面量的地方都是如此。

所以只要你一直在用字面量写界面文字，你的应用**已经是可本地化的**了，只差提供翻译。

### String Catalog

Xcode 用 **String Catalog**（`.xcstrings` 文件）管理翻译。

1. **File › New › File…**，选择 **String Catalog**，保持默认名字 `Localizable`。
2. 在项目设置的 **Info › Localizations** 里添加要支持的语言。
3. **编译一次项目。** Xcode 会自动扫描代码里所有可本地化的字符串，填进 String Catalog。
4. 在 String Catalog 的编辑器里，为每种语言填写译文。

之后每次编译，Xcode 都会同步：代码里新增的字符串自动出现，删掉的标记为过时。编辑器会显示每种语言的翻译进度。

**开发语言**（项目设置里的 Development Language）就是你在代码里写的那种语言。本教程用中文写界面文字，开发语言就应该设为简体中文。面向国际的项目通常用英文作为开发语言。

### 哪些字符串会被本地化

```swift
struct LocalizationBasics: View {
    let userName = "小明"
    let dynamicText = "来自服务器的文字"

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("欢迎回来")                              // 会本地化：字面量
            Text("你好，\(userName)")                     // 会本地化：键是“你好，%@”
            Text(dynamicText)                             // 不会：这是 String 变量
            Text(verbatim: "v2.4.1")                      // 明确不本地化
            Text(LocalizedStringKey(dynamicText))         // 强制把变量当作键去查找
        }
    }
}
```

| 写法 | 是否本地化 |
| --- | --- |
| `Text("字面量")` | 是 |
| `Text("带 \(插值) 的字面量")` | 是。插值变成占位符 |
| `Text(stringVariable)` | 否 |
| `Text(verbatim: "...")` | 否 |

规则是：**字面量本地化，变量不本地化。** 变量里的内容通常是用户数据或服务器返回的数据，本来就不该翻译。

### 在视图之外获取本地化字符串

模型里的错误信息、通知的内容，不是直接写在 `Text` 里的。用 `String(localized:)`：

```swift
enum ValidationError: LocalizedError {
    case emptyName
    case tooLong(limit: Int)

    var errorDescription: String? {
        switch self {
        case .emptyName:
            String(localized: "名称不能为空")
        case .tooLong(let limit):
            String(localized: "名称不能超过 \(limit) 个字符")
        }
    }
}
```

`String(localized:)` 里的字符串同样会被 Xcode 提取进 String Catalog。

需要把“一个可本地化的字符串”作为值传来传去（比如作为自定义视图的参数），用 `LocalizedStringResource`：

```swift
struct EmptyStateView: View {
    let title: LocalizedStringResource
    let message: LocalizedStringResource

    var body: some View {
        VStack(spacing: 8) {
            Text(title).font(.headline)
            Text(message).foregroundStyle(.secondary)
        }
    }
}

struct EmptyStateDemo: View {
    var body: some View {
        EmptyStateView(title: "还没有笔记", message: "点击右上角的加号创建第一条")
    }
}
```

把参数类型声明为 `LocalizedStringResource`（或 `LocalizedStringKey`），调用处传入的字面量就会被提取和翻译。如果声明成 `String`，字面量就只是普通字符串，不会被本地化。**这是自定义组件最常见的本地化遗漏。**

### 给译者留下上下文

同一个词在不同上下文里译法不同。“Book”可以是“书”，也可以是“预订”。用 `comment` 说明：

```swift nocheck
Text("Book", comment: "预订酒店房间的按钮标题，动词")
String(localized: "Book", comment: "图书分类的名称，名词")
```

注释会显示在 String Catalog 里译文的旁边。Xcode 26 起还可以用设备上的模型自动为没有注释的字符串生成上下文说明。

### 复数

“1 个文件”“2 个文件”在中文里一样，在英文里是 “1 file” 和 “2 files”，在俄语、阿拉伯语里有三到六种形式。**不要自己用 `if count == 1` 拼字符串。**

```swift
struct PluralDemo: View {
    @State private var count = 1

    var body: some View {
        VStack {
            Text("已选择 \(count) 个文件")
            Stepper("数量", value: $count, in: 0...10).fixedSize()
        }
        .padding()
    }
}
```

代码里只写这一个字符串。在 String Catalog 里，右键这个字符串，选择 **Vary by Plural**，就可以为每种语言的每种复数类别（zero、one、two、few、many、other）分别填写译文。系统根据 `count` 的实际值和当前语言的规则自动选择。

String Catalog 还支持 **Vary by Device**：为 iPhone、iPad、Mac 提供不同的文字。典型用途是“轻点”和“点击”：iPhone 上说“轻点以继续”，Mac 上说“点击以继续”。

### 格式化交给系统

日期、数字、货币、度量单位、列表的显示方式，各地差别很大。**永远不要自己拼。** 第 14 章讲的 `Text(value, format:)` 和 `.formatted()` 会按照用户的地区设置自动处理：

```swift
struct FormattingAcrossLocales: View {
    let date = Date.now
    let amount = 1234567.891
    let distance = Measurement(value: 42.195, unit: UnitLength.kilometers)
    let names = ["张三", "李四", "王五"]

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            samples.environment(\.locale, Locale(identifier: "zh_CN"))
            samples.environment(\.locale, Locale(identifier: "en_US"))
            samples.environment(\.locale, Locale(identifier: "de_DE"))
            samples.environment(\.locale, Locale(identifier: "ar_SA"))
        }
        .padding()
    }

    private var samples: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(date, format: .dateTime.year().month().day().weekday())
            Text(amount, format: .number.precision(.fractionLength(2)))
            Text(amount, format: .currency(code: "EUR"))
            Text(distance, format: .measurement(width: .abbreviated))
            Text(names, format: .list(type: .and))
        }
        .font(.callout)
    }
}
```

同一段代码在四种地区设置下的输出各不相同：日期的顺序、千位分隔符和小数点（德语是 `1.234.567,89`）、货币符号的位置、公里还是英里、列表里的“和”字，甚至数字本身的字形（阿拉伯语）。

在视图之外格式化用 `.formatted()`：`date.formatted(date: .abbreviated, time: .shortened)`、`amount.formatted(.currency(code: "CNY"))`。

### 布局要经得起翻译

译文的长度和原文差别可能很大。德语通常比英语长三成，英语通常比中文长。写布局时要假设文字会变长：

- **不要给文字写死宽度。** 让它根据内容决定大小。
- **允许折行。** 不要到处加 `.lineLimit(1)`。
- **用弹性的布局。** `ViewThatFits` 在横排放不下时换成竖排（第 8 章）。
- **按钮里的文字要留有余地。**

为动态字体做的适配，对长译文同样有效。这两件事是一起解决的。

### 从右向左的语言

阿拉伯语、希伯来语、波斯语、乌尔都语从右向左书写（RTL）。在这些语言下，整个界面应该**镜像**：返回按钮在右边，列表的箭头指向左边，进度条从右往左填充。

SwiftUI 自动完成了绝大部分镜像，前提是你遵守了一条贯穿整个教程的规则：**用 `leading` 和 `trailing`，不用 left 和 right。**

```swift
struct RTLDemo: View {
    var body: some View {
        VStack(spacing: 20) {
            row.environment(\.layoutDirection, .leftToRight)
            row.environment(\.layoutDirection, .rightToLeft)
        }
        .padding()
    }

    private var row: some View {
        HStack {
            Image(systemName: "chevron.backward")           // 用“后退”而不是“向左”
            Text("返回")
            Spacer()
            Text("下一步")
            Image(systemName: "chevron.forward")            // 用“前进”而不是“向右”
        }
        .padding()
        .background(.quaternary, in: .rect(cornerRadius: 10))
    }
}
```

自动镜像的：`HStack` 的排列顺序、`leading`/`trailing` 的对齐和内边距、`NavigationStack` 的转场方向、`List` 的布局、大部分带方向性的 SF Symbols。

需要你注意的：

- **用语义化的符号名。** `chevron.forward`、`chevron.backward`、`arrow.forward`，而不是 `chevron.right`、`arrow.left`。语义化的名字会自动镜像。
- **自己的方向性图片**要手动镜像：`.flipsForRightToLeftLayoutDirection(true)`。
- **不该镜像的东西不要镜像**：时钟、媒体播放控制（播放、快进的方向是时间方向，不是阅读方向）、电话号码、代码。
- **自己算的坐标**（`offset(x:)`、`Path`、`Canvas`）不会自动镜像。需要时读取 `@Environment(\.layoutDirection)` 自己处理。

### 其他需要本地化的东西

| 内容 | 怎么做 |
| --- | --- |
| 应用的名称、权限说明文字 | 新建一个名为 `InfoPlist` 的 String Catalog |
| 图片里的文字 | 尽量避免把文字做进图片。必须的话，在资源目录里为图片添加各语言的版本 |
| 排序 | 用 `localizedStandardCompare`，它按当地语言的规则排序 |
| 搜索 | 用 `localizedStandardContains`（第 21 章） |
| 姓名 | 用 `PersonNameComponents` 和它的格式化器，不同文化里姓和名的顺序不同 |
| 颜色与图标的含义 | 红色在一些文化里表示喜庆而非危险；某些手势图标在某些地区有冒犯的含义 |

### Swift Package 里的本地化

资源放在 Swift Package 里时，查找翻译需要指明所在的包。Xcode 26 之前写 `bundle: .module`；Xcode 26 起可以用 `#bundle` 宏，它在应用和包里都能得到正确的结果：

```swift nocheck
Text("共享组件里的文字", bundle: #bundle)
String(localized: "共享组件里的文字", bundle: #bundle)
```

### 测试本地化

**一、在预览里切换语言和方向。**

```swift
#Preview("英文") {
    LocalizationBasics()
        .environment(\.locale, Locale(identifier: "en"))
}

#Preview("阿拉伯文，从右向左") {
    RTLDemo()
        .environment(\.locale, Locale(identifier: "ar"))
        .environment(\.layoutDirection, .rightToLeft)
}
```

**二、用伪语言测试。** 在 Scheme 的 **Run › Options › App Language** 里，除了真实的语言，还有几种专门用于测试的伪语言：

| 伪语言 | 作用 |
| --- | --- |
| Double-Length Pseudolanguage | 把每个字符串重复一遍，模拟很长的译文，检查布局 |
| Right-to-Left Pseudolanguage | 保持原文但把界面镜像，检查 RTL 布局 |
| Accented Pseudolanguage | 给字母加上重音符号，检查字体和行高，同时一眼就能看出哪些文字没有被本地化 |
| Bounded String Pseudolanguage | 给字符串加上边界标记，检查有没有被截断 |

不需要任何翻译，就能发现绝大部分本地化问题。

**三、导出给译者。** **Product › Export Localizations…** 导出标准的 `.xcloc` 包，交给翻译人员或翻译服务，翻译完成后用 **Import Localizations…** 导入。

**四、检查清单。**

- [ ] 所有界面文字都是字面量或 `LocalizedStringResource`，没有遗漏
- [ ] 自定义组件的文字参数类型是 `LocalizedStringKey` 或 `LocalizedStringResource`，不是 `String`
- [ ] 没有用字符串拼接组成句子
- [ ] 复数用了 String Catalog 的复数变体
- [ ] 日期、数字、货币都用格式化 API
- [ ] 双倍长度伪语言下布局不崩
- [ ] 从右向左伪语言下界面正确镜像
- [ ] 有歧义的字符串写了注释

## 常见误区

**误区一：“无障碍是最后再加的功能。”** 结构性的问题（自定义控件、不合理的分组）到后期很难改。从一开始就用标准组件、写 `Label`、加标题特征。

**误区二：“用 `onTapGesture` 做的按钮 VoiceOver 也能点。”** 不能。它既不会被识别为按钮，也无法被激活。用 `Button`。

**误区三：“标签写成‘保存按钮’‘关闭图标’。”** 类别由特征提供。标签只说它是什么。

**误区四：“装饰性图片不处理也没关系。”** VoiceOver 会停在上面读“图像”，打断用户。隐藏它们。

**误区五：“限制最大字号，保护我的布局。”** 应该让布局适应字号，而不是反过来。

**误区六：“用字符串拼接：`"共 " + String(count) + " 项"`。”** 不同语言的语序不同，拼接的句子无法翻译。用带插值的完整字符串。

**误区七：“自定义组件的标题参数类型是 `String`。”** 传进去的字面量不会被本地化。用 `LocalizedStringKey` 或 `LocalizedStringResource`。

**误区八：“用 `.left`、`chevron.right`。”** 从右向左的语言下方向会错。用 `leading`/`trailing` 和 `forward`/`backward`。

**误区九：“只在我自己的语言和默认字号下测试。”** 用伪语言和环境覆盖，几分钟就能发现大部分问题。

## 小结

- 辅助技术通过无障碍树理解界面：每个元素有标签、值、特征、提示和动作。
- 标准组件自动提供正确的无障碍信息。需要你补充的是：纯图片的元素、自定义控件、需要合并的内容。
- `.accessibilityLabel` 说它是什么，`.accessibilityValue` 说当前状态，`.accessibilityAddTraits` 说类别，`.accessibilityElement(children:)` 分组，`.accessibilityAction` 提供操作，`.accessibilityRepresentation` 借用标准控件。
- 尊重显示偏好：动态字体、增强对比度、降低透明度、减弱动态效果、不以颜色区分。
- 亲自用 VoiceOver 测试，配合 Accessibility Inspector 和自动审查。
- `Text` 等的字符串字面量是 `LocalizedStringKey`，自动查找译文。String Catalog 管理翻译，编译时自动提取字符串。
- 视图之外用 `String(localized:)`；作为参数传递用 `LocalizedStringResource`。
- 复数用 String Catalog 的变体；日期、数字、货币用格式化 API；布局要能容纳更长的文字。
- 用 `leading`/`trailing` 和语义化的符号名，界面在从右向左的语言下自动镜像。
- 用伪语言测试本地化。

## 练习

1. 打开 VoiceOver，闭上眼睛使用你之前做的任意一个练习应用。记下所有让你困惑的地方（读不出来的元素、不知道是什么的按钮、无法操作的控件），然后逐一修复。
2. 为第 24 章练习里的“滑动解锁条”添加完整的无障碍支持：让 VoiceOver 用户不需要拖动也能完成解锁。
3. 做一个颜色选择器（八个色块排成一行，选中的有白色描边）。让它对 VoiceOver 表现为一个可调节的控件，朗读颜色的名称；同时保证不依赖颜色也能看出哪个被选中。
4. 给一个现有的小应用添加英文本地化：创建 String Catalog，翻译所有字符串，为至少一个带数量的字符串设置复数变体。然后用双倍长度伪语言运行，修复出现的布局问题。
5. 用从右向左伪语言运行你的应用，找出没有正确镜像的地方并修复。

## 官方文档

- [Accessibility fundamentals（SwiftUI 无障碍基础）](https://developer.apple.com/documentation/swiftui/accessibility-fundamentals)
- [Accessible appearance](https://developer.apple.com/documentation/swiftui/accessible-appearance)
- [Accessible controls](https://developer.apple.com/documentation/swiftui/accessible-controls)
- [Accessible descriptions](https://developer.apple.com/documentation/swiftui/accessible-descriptions)
- [Accessible navigation](https://developer.apple.com/documentation/swiftui/accessible-navigation)
- [`accessibilityLabel(_:)`](https://developer.apple.com/documentation/swiftui/view/accessibilitylabel(_:))
- [`accessibilityElement(children:)`](https://developer.apple.com/documentation/swiftui/view/accessibilityelement(children:))
- [`accessibilityRepresentation(representation:)`](https://developer.apple.com/documentation/swiftui/view/accessibilityrepresentation(representation:))
- [`AccessibilityTraits`](https://developer.apple.com/documentation/swiftui/accessibilitytraits)
- [`AccessibilityFocusState`](https://developer.apple.com/documentation/swiftui/accessibilityfocusstate)
- [Accessibility（Apple 无障碍开发总览）](https://developer.apple.com/documentation/accessibility)
- [Performing accessibility testing for your app](https://developer.apple.com/documentation/accessibility/performing-accessibility-testing-for-your-app)
- [Localization（Xcode 本地化总览）](https://developer.apple.com/documentation/xcode/localization)
- [Localizing and varying text with a string catalog](https://developer.apple.com/documentation/xcode/localizing-and-varying-text-with-a-string-catalog)
- [Preparing views for localization](https://developer.apple.com/documentation/swiftui/preparing-views-for-localization)
- [`LocalizedStringKey`](https://developer.apple.com/documentation/swiftui/localizedstringkey)
- [`LocalizedStringResource`](https://developer.apple.com/documentation/foundation/localizedstringresource)
- [Human Interface Guidelines：Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Human Interface Guidelines：Right to left](https://developer.apple.com/design/human-interface-guidelines/right-to-left)
- [WWDC23：Discover String Catalogs](https://developer.apple.com/videos/play/wwdc2023/10155/)
- [WWDC24：Catch up on accessibility in SwiftUI](https://developer.apple.com/videos/play/wwdc2024/10073/)
