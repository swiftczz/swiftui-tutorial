# 04 修饰符：顺序、环境与封装

## 本章目标

- 理解修饰符的本质：包一层，返回新视图
- 能预测修饰符顺序不同带来的差异
- 区分“作用于单个视图”的修饰符和“沿视图树向下传播”的修饰符
- 会用 `ViewModifier` 和 `View` 扩展封装自己的修饰符
- 知道“条件修饰符”为什么是个陷阱

## 修饰符不是“设置属性”

如果你有其他 UI 框架的经验，很容易把 `.padding()`、`.background(.yellow)` 理解成“给这个视图设置内边距属性、设置背景色属性”。这个理解在 SwiftUI 里是错的，而且会导致一连串困惑。

上一章我们打印过类型：`Text("d").padding()` 的类型是 `ModifiedContent<Text, _PaddingLayout>`。`Text` 没有被修改，它被**包进了一个新视图**里。

**每个修饰符都返回一个新视图，新视图把原视图包在里面。** 链式调用就是一层一层往外包：

```swift nocheck
Text("你好")              // Text
    .padding()            // 包一层：内边距视图 { Text }
    .background(.yellow)  // 再包一层：背景视图 { 内边距视图 { Text } }
```

写在越后面的修饰符，包在越外层。读代码时从上往下读，就是从里往外读。

## 顺序实验

既然是包装，顺序自然重要。看这个经典的例子：

```swift
struct OrderDemo: View {
    var body: some View {
        VStack(spacing: 24) {
            Text("先 padding 后 background")
                .padding()
                .background(.yellow)

            Text("先 background 后 padding")
                .background(.yellow)
                .padding()
        }
    }
}
```

::: info 想一想
两行的黄色区域一样大吗？先猜，再看预览。
:::

不一样。第一行的黄色包住了文字和它周围的留白，第二行的黄色紧贴文字，留白在黄色外面。

用“包装”的模型来解释：

```text
第一行：背景{ 内边距{ 文字 } }
        背景视图包的是“文字 + 内边距”这个整体，所以黄色区域包含留白。

第二行：内边距{ 背景{ 文字 } }
        背景视图只包着文字，所以黄色紧贴文字；内边距加在黄色外面，是透明的。
```

一旦接受了“修饰符是包装”这个模型，下面这种写法也就不奇怪了。同一个修饰符可以用多次，每次都包一层：

```swift
struct LayeredDemo: View {
    var body: some View {
        Text("层层包裹")
            .padding()
            .background(.yellow)
            .padding()
            .background(.orange)
            .padding()
            .background(.red)
    }
}
```

得到的是三层嵌套的色块，像靶子一样。

再看一个顺序影响**交互**的例子：

```swift
struct TapAreaDemo: View {
    @State private var count = 0

    var body: some View {
        VStack(spacing: 24) {
            Text("点击区域小：\(count)")
                .onTapGesture { count += 1 }
                .padding(30)
                .border(.gray)

            Text("点击区域大：\(count)")
                .padding(30)
                .contentShape(.rect)
                .onTapGesture { count += 1 }
                .border(.gray)
        }
    }
}
```

第一个只有点在文字上才有反应，因为手势加在文字上，内边距是后包上去的。第二个把手势加在了“文字 + 内边距”这个整体上，整个方框都能点。（`.contentShape(.rect)` 用来声明“整个矩形区域都算可点击范围”，第 24 章讲手势时会解释。）

::: tip 排查思路
“背景没填满”“点击没反应”“圆角切掉了阴影”，这类问题十有八九是修饰符顺序问题。排查方法：从最里面的视图开始，一层一层往外读，问自己“到这一层为止，这个视图是什么样、多大”。
:::

## 修饰符的几种类型

SwiftUI 有几百个修饰符，但按作用方式可以分成几类。知道一个修饰符属于哪一类，你就能预测它的行为。

| 类别 | 例子 | 作用方式 |
| --- | --- | --- |
| 布局 | `padding`、`frame`、`offset`、`position` | 改变视图的尺寸或位置。对顺序非常敏感 |
| 绘制 | `background`、`overlay`、`border`、`clipShape`、`shadow`、`opacity` | 改变视图的外观，以当前这一层的范围为准 |
| 环境 | `font`、`foregroundStyle`、`tint`、`disabled`、`environment` | 设置一个值，**向下传播**给所有后代 |
| 事件 | `onTapGesture`、`onAppear`、`onChange`、`task` | 挂接行为，不改变外观 |
| 呈现 | `sheet`、`alert`、`popover`、`toolbar`、`navigationTitle` | 向上层容器声明“我需要呈现某样东西” |
| 身份与元数据 | `id`、`tag`、`accessibilityLabel` | 给视图附加信息 |

其中“环境”类和其他几类的行为差别最大，单独说一说。

## 环境修饰符：向下传播

```swift
struct EnvironmentModifierDemo: View {
    var body: some View {
        VStack(spacing: 8) {
            Text("标题")
            Text("副标题")
            HStack {
                Text("左")
                Text("右")
                    .font(.caption)
            }
        }
        .font(.title2)
        .foregroundStyle(.indigo)
    }
}
```

`.font(.title2)` 加在 `VStack` 上，但 `VStack` 自己没有文字可显示。这个修饰符做的事情是：**在环境里设置“默认字体是 title2”，这个设置对 `VStack` 里面的所有后代生效。** 所以“标题”“副标题”“左”都是 `title2`。

“右”自己又加了 `.font(.caption)`，它离得更近，所以它赢。规则是：**离视图最近的那个环境设置生效**。

```text
VStack  ← .font(.title2)      环境：font = title2
 ├─ Text("标题")               读到 title2
 ├─ Text("副标题")             读到 title2
 └─ HStack
     ├─ Text("左")             读到 title2
     └─ Text("右") ← .font(.caption)   环境被覆盖：读到 caption
```

这是一个非常有用的机制：在高层设置一次，整棵子树都遵循；个别地方需要例外，就地覆盖。`.disabled(true)` 加在一个表单容器上，里面所有控件都禁用；`.tint(.orange)` 加在根视图上，整个应用的强调色都变成橙色。

对比一下非环境修饰符：

```swift
struct NonEnvironmentDemo: View {
    var body: some View {
        VStack {
            Text("一")
            Text("二")
        }
        .padding()          // 给 VStack 整体加一圈内边距，不是给每个 Text 各加一圈
        .border(.gray)      // 给 VStack 整体画一个边框
    }
}
```

`.padding()` 和 `.border()` 只作用于 `VStack` 这一个视图整体，不会传给里面的 `Text`。

怎么知道一个修饰符是不是环境型的？一个实用的判断方法是问自己：“把它加在一个容器上，说得通吗？”给容器设置字体，意思只能是“里面的文字用这个字体”，所以是环境型。给容器加内边距，意思很明确就是容器自己的内边距，所以不是。拿不准时查文档，环境型修饰符的文档里通常会说“sets the … for text in this view”或提到 environment。

第 11 章会讲如何定义你自己的环境值。

## 封装修饰符

当同一组修饰符在好几个地方重复出现时，就该封装了。有三种方式，由简到繁。

### 方式一：View 扩展

最简单直接，适合没有自身状态的组合：

```swift
extension View {
    func cardStyle() -> some View {
        self
            .padding()
            .background(.background.secondary, in: .rect(cornerRadius: 12))
            .shadow(color: .black.opacity(0.08), radius: 6, y: 2)
    }
}

struct CardStyleDemo: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("第一张卡片").cardStyle()
            Label("第二张卡片", systemImage: "star").cardStyle()
        }
        .padding()
    }
}
```

### 方式二：ViewModifier 协议

当修饰符需要**自己的状态**或要**读取环境**时，用 `ViewModifier`。它和 `View` 很像，区别是 `body` 是一个方法，接收被修饰的内容作为参数：

```swift
struct PressableModifier: ViewModifier {
    @State private var isPressed = false
    @Environment(\.isEnabled) private var isEnabled

    func body(content: Content) -> some View {
        content
            .scaleEffect(isPressed ? 0.95 : 1)
            .opacity(isEnabled ? 1 : 0.4)
            .animation(.snappy(duration: 0.2), value: isPressed)
            .onLongPressGesture(minimumDuration: .infinity) {
            } onPressingChanged: { pressing in
                isPressed = pressing
            }
    }
}

extension View {
    func pressable() -> some View {
        modifier(PressableModifier())
    }
}

struct PressableDemo: View {
    var body: some View {
        Text("按住我")
            .padding()
            .background(.blue, in: .capsule)
            .foregroundStyle(.white)
            .pressable()
    }
}
```

`ViewModifier` 里可以用 `@State`、`@Environment` 等所有属性包装器，它和视图一样有身份和生命周期。习惯上总是再配一个 `View` 扩展方法，让调用处写 `.pressable()` 而不是 `.modifier(PressableModifier())`。

### 方式三：样式协议

对于按钮、开关、标签这类系统控件，SwiftUI 提供了专门的**样式协议**（`ButtonStyle`、`ToggleStyle`、`LabelStyle` 等）。它们比修饰符更合适，因为样式也是通过环境传播的，可以在容器上设置一次：

```swift
struct FilledButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(.tint, in: .capsule)
            .foregroundStyle(.white)
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

struct StyleDemo: View {
    var body: some View {
        VStack(spacing: 12) {
            Button("确定") {}
            Button("取消") {}
                .tint(.gray)
        }
        .buttonStyle(FilledButtonStyle())   // 一次设置，两个按钮都生效
    }
}
```

第 15 章会详细讲各种样式协议。这里只需要知道：**想改系统控件的外观，先找有没有对应的 Style 协议。**

## 陷阱：条件修饰符

很多人学到这里会想写一个这样的工具：

```swift
extension View {
    /// 看起来方便，实际是陷阱
    @ViewBuilder
    func `if`<T: View>(_ condition: Bool, transform: (Self) -> T) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }
}
```

用起来是这样：`Text("你好").if(isBold) { $0.bold() }`。

::: info 想一想
结合上一章的视图身份，这个写法有什么问题？
:::

它在内部用了 `if/else`，所以条件一变，视图的**结构身份就变了**。后果是：

- 被修饰的视图里所有 `@State` 都会重置
- 外观变化无法平滑动画，只能淡入淡出
- 输入框会失去焦点，滚动位置会丢失

正确的做法是用修饰符自身的参数来表达条件。几乎所有修饰符都有一个“等于没加”的参数值：

```swift
struct ConditionalRight: View {
    @State private var isOn = false

    var body: some View {
        VStack(spacing: 16) {
            Text("你好")
                .bold(isOn)                           // 很多修饰符直接接受 Bool
                .padding(isOn ? 20 : 0)               // 0 等于没加
                .background(isOn ? .yellow : .clear)  // 透明等于没加
                .opacity(isOn ? 1 : 0.5)
                .animation(.default, value: isOn)

            Toggle("开关", isOn: $isOn)
        }
        .padding()
    }
}
```

这样视图身份始终不变，所有变化都可以平滑过渡。

只有一种情况适合用 `if` 包修饰符：条件在视图的整个生命周期里**不会变化**，比如按操作系统版本判断是否使用新 API：

```swift
extension View {
    @ViewBuilder
    func glassIfAvailable() -> some View {
        if #available(iOS 26, macOS 26, *) {
            self.glassEffect()
        } else {
            self.background(.ultraThinMaterial, in: .capsule)
        }
    }
}
```

系统版本在应用运行期间不会变，所以这里的分支不会造成身份切换。

## 常用修饰符速览

下面列出日常最常用的一批修饰符，后续章节会分别深入。现在可以每个都在预览里试一下，建立感觉。

```swift
struct ModifierTour: View {
    var body: some View {
        VStack(spacing: 20) {
            // 尺寸与间距
            Text("frame + padding")
                .frame(width: 200, height: 44)
                .padding(.horizontal, 8)
                .border(.gray)

            // 背景与叠加
            Text("background + overlay")
                .padding()
                .background(.blue.opacity(0.15), in: .rect(cornerRadius: 8))
                .overlay(alignment: .topTrailing) {
                    Circle().fill(.red).frame(width: 10, height: 10)
                }

            // 裁剪与阴影
            Image(systemName: "photo")
                .font(.largeTitle)
                .frame(width: 80, height: 80)
                .background(.quaternary)
                .clipShape(.circle)
                .shadow(radius: 4)

            // 变换（不影响布局）
            Text("rotation + scale")
                .rotationEffect(.degrees(-5))
                .scaleEffect(1.1)

            // 文字相关（环境型）
            Text("font + foregroundStyle")
                .font(.headline)
                .foregroundStyle(.teal)
        }
        .padding()
    }
}
```

## 常见误区

**误区一：“修饰符是在设置视图的属性。”** 修饰符是把视图包进一个新视图。这个模型能解释顺序为什么重要。

**误区二：“`.font()` 加在 `VStack` 上没用，因为 `VStack` 没有文字。”** 环境型修饰符的意义就是给后代设置默认值。

**误区三：“阴影被切掉了，是 SwiftUI 的 bug。”** 多半是 `.shadow()` 写在了 `.clipShape()` 前面。裁剪把后加的阴影一起切掉了。先裁剪，再加阴影。

**误区四：“写个 `.if()` 扩展让代码更简洁。”** 它会在条件变化时改变视图身份，导致状态丢失和动画失效。用修饰符的参数表达条件。

## 小结

- 修饰符返回一个包裹原视图的新视图，链式调用是从里往外一层层包。
- 顺序决定结果：先 `padding` 后 `background`，和反过来，是两个不同的界面。
- 环境型修饰符（`font`、`foregroundStyle`、`tint`、`disabled` 等）向下传播，最近的设置生效。
- 封装修饰符：无状态用 `View` 扩展，有状态用 `ViewModifier`，系统控件用样式协议。
- 条件变化时，用修饰符参数而不是 `if` 分支，以保持视图身份。

## 练习

1. 用 `Text`、`.padding()`、`.background()`、`.clipShape(.capsule)` 做一个“标签药丸”。然后调换 `.background()` 和 `.clipShape()` 的顺序，观察并解释差异。
2. 写一个 `ViewModifier`：`Watermark(text:)`，在任意视图的右下角叠加一行半透明小字。配套写一个 `.watermark("机密")` 扩展。
3. 做一个设置页面的雏形：`VStack` 里放几个 `Toggle` 和 `Button`，在 `VStack` 上加 `.disabled(true)`，观察哪些控件受影响。然后让其中一个按钮不受影响（提示：就地覆盖环境）。
4. 找出下面代码中阴影不显示的原因并修复：

```swift nocheck
Text("卡片")
    .padding()
    .background(.white)
    .shadow(radius: 8)
    .clipShape(.rect(cornerRadius: 12))
```

## 官方文档

- [View modifiers（修饰符总览）](https://developer.apple.com/documentation/swiftui/view-modifiers)
- [`ViewModifier` 协议](https://developer.apple.com/documentation/swiftui/viewmodifier)
- [`modifier(_:)`](https://developer.apple.com/documentation/swiftui/view/modifier(_:))
- [`ModifiedContent`](https://developer.apple.com/documentation/swiftui/modifiedcontent)
- [Configuring views](https://developer.apple.com/documentation/swiftui/configuring-views)
- [Reducing view modifier maintenance](https://developer.apple.com/documentation/swiftui/reducing-view-modifier-maintenance)
- [View styles（样式协议总览）](https://developer.apple.com/documentation/swiftui/view-styles)
- [`ButtonStyle` 协议](https://developer.apple.com/documentation/swiftui/buttonstyle)
- [`padding(_:_:)`](https://developer.apple.com/documentation/swiftui/view/padding(_:_:))
- [`background(_:in:fillStyle:)`](https://developer.apple.com/documentation/swiftui/view/background(_:in:fillstyle:))
