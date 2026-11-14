# 05 布局原理：提议与回应

## 本章目标

- 掌握 SwiftUI 布局的三步协商：提议、回应、摆放
- 知道每种常见视图“想要多大”
- 彻底理解 `frame` 的各种形态，以及它为什么不是“设置尺寸”
- 会用 `fixedSize`、`layoutPriority` 调整空间分配
- 分清 `offset`、`position` 这类“不影响布局”的修饰符

SwiftUI 没有约束（constraint），没有 CSS 盒模型，也不需要你手算坐标。它只有一条规则，这条规则递归地应用在整棵视图树上。理解了它，所有布局行为都能推导出来。

## 三步协商

布局发生在**父视图**和**子视图**之间，每一对父子都走同样的三步：

```text
① 父视图 → 子视图：  “我提议你用这么大的空间。”     （提议尺寸）
② 子视图 → 父视图：  “我决定用这么大。”             （回应尺寸）
③ 父视图：           “好，那我把你放在这里。”        （摆放位置）
```

这里面有一条容易被忽略却至关重要的规定：

::: danger 子视图的尺寸由子视图自己决定
父视图只能**提议**，不能**强制**。子视图回应多大，就是多大，父视图必须接受。
:::

这条规定和大多数 UI 框架相反，在那些框架里通常是父视图决定子视图的大小。记住它，后面很多“奇怪”的行为就都不奇怪了。

### 跟着一个例子走一遍

```swift
struct LayoutWalkthrough: View {
    var body: some View {
        Text("你好")
            .padding(10)
            .background(.yellow)
    }
}
```

假设这个视图被放在一块 390 × 800 的屏幕区域里。视图树从外到里是：`背景 { 内边距 { 文字 } }`。

```text
屏幕      → 背景视图：   提议 390 × 800
背景视图  → 内边距视图： 提议 390 × 800     （背景自己不占空间，原样转交）
内边距视图 → 文字：      提议 370 × 780     （四边各减去 10）
文字      → 内边距视图： 我要 36 × 20       （文字只要刚好够显示的大小）
内边距视图 → 背景视图：  我要 56 × 40       （四边各加回 10）
背景视图  → 屏幕：       我要 56 × 40       （和它包着的内容一样大）
屏幕：    把这个 56 × 40 的视图摆在中央
```

提议从上往下传，回应从下往上传。黄色背景最终是 56 × 40，因为背景视图的尺寸等于它包着的内容的尺寸。

注意最后一步：根视图只有 56 × 40，屏幕把它摆在了**中央**。SwiftUI 里，当子视图比提议的空间小时，默认居中摆放。

## 视图的“性格”：它们各自想要多大

面对同一个提议，不同的视图回应不同。可以把视图按“性格”分成三类：

| 性格 | 行为 | 代表 |
| --- | --- | --- |
| **贴合内容** | 只要内容需要的大小，给多了也不要 | `Text`、`Image`（未加 `resizable`）、`Button`、`Label`、`Toggle` |
| **来者不拒** | 提议多大就用多大 | `Color`、`Rectangle` 等形状、`Spacer`、`Divider`（在一个方向上）、`ScrollView`、`GeometryReader` |
| **看孩子** | 尺寸由子视图决定 | `VStack`、`HStack`、`ZStack`、加了 `padding`/`background` 的视图 |

用一个实验来验证：

```swift
struct PersonalityDemo: View {
    var body: some View {
        VStack(spacing: 12) {
            Text("贴合内容")
                .border(.red)

            Color.blue
                .border(.red)

            Rectangle()
                .fill(.green)
                .frame(height: 40)
                .border(.red)
        }
        .padding()
    }
}
```

`Text` 的红框紧贴文字。`Color.blue` 占满了所有剩余空间。`Rectangle` 加了 `.frame(height: 40)`，高度固定为 40，宽度仍然来者不拒，占满整行。

### Text 的性格再细一点

`Text` 值得多说两句，因为它最常用。面对一个提议宽度：

- 如果一行放得下，它回应“内容实际宽度 × 一行高度”
- 如果一行放不下，它**折行**，回应“不超过提议宽度 × 多行高度”
- 如果折行后高度也超出提议，或者设置了 `lineLimit`，它**截断**并显示省略号

关键点：`Text` 回应的宽度**永远不会超过提议宽度**（它宁可截断）。

### Image 的性格

```swift
struct ImagePersonality: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "photo")              // 贴合内容：符号的固有大小
                .border(.red)

            Image(systemName: "photo")
                .resizable()                        // 变成来者不拒，会被拉伸变形
                .frame(width: 120, height: 60)
                .border(.red)

            Image(systemName: "photo")
                .resizable()
                .scaledToFit()                      // 保持比例，在提议范围内尽量大
                .frame(width: 120, height: 60)
                .border(.red)
        }
    }
}
```

默认的 `Image` 是固定大小，完全无视提议。加了 `.resizable()` 后变成来者不拒。`.scaledToFit()`（等价于 `.aspectRatio(contentMode: .fit)`）在此基础上保持宽高比。

## frame：不是设置尺寸

`.frame(width: 100, height: 100)` 读起来像是“把这个视图的尺寸设为 100 × 100”。但根据上面的铁律，没人能强制设置子视图的尺寸。那 `frame` 到底做了什么？

**`frame` 创建了一个新的、尺寸确定的容器视图，把原视图放进去。** 它做两件事：

1. 向里面的子视图**提议**这个尺寸
2. 自己向外面的父视图**回应**这个尺寸，不管子视图实际多大

然后把子视图按对齐方式（默认居中）摆在自己里面。

```swift
struct FrameDemo: View {
    var body: some View {
        VStack(spacing: 20) {
            Text("短")
                .border(.red)                    // 文字的实际大小
                .frame(width: 200, height: 60)
                .border(.blue)                   // frame 容器的大小

            Text("短")
                .frame(width: 200, height: 60, alignment: .bottomTrailing)
                .border(.blue)

            Text("这是一段很长很长很长很长很长很长的文字")
                .frame(width: 100, height: 30)
                .border(.blue)
        }
    }
}
```

- 第一个：蓝框 200 × 60，红框紧贴“短”字并居中。`Text` 被提议了 200 × 60，但它只要了自己需要的大小。**`frame` 没有改变 `Text` 的尺寸，只是给它套了个 200 × 60 的盒子。**
- 第二个：`alignment` 参数决定子视图在盒子里的位置。
- 第三个：盒子只有 100 × 30，`Text` 被提议这个尺寸，放不下，于是截断。

::: info 想一想
`Image(systemName: "star").frame(width: 100, height: 100)` 之后，星星会变大吗？
:::

不会。没有 `.resizable()` 的 `Image` 无视提议，仍然是原来的大小，只是被放在一个 100 × 100 的透明盒子中央。想让它变大，得先让它“愿意听提议”：`.resizable().scaledToFit().frame(width: 100, height: 100)`。

### 只指定一个方向

`.frame(width: 100)` 只约束宽度，高度方向原样转交提议、原样转交回应。

### 弹性 frame：min、ideal、max

`frame` 的另一种形态接受最小、理想、最大值：

```swift
struct FlexibleFrameDemo: View {
    var body: some View {
        VStack(spacing: 12) {
            Text("撑满整行，文字居左")
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.yellow)

            Text("至少 44 高")
                .frame(minHeight: 44)
                .background(.orange)

            Text("宽度在 100 到 300 之间")
                .frame(minWidth: 100, maxWidth: 300)
                .background(.mint)
        }
        .padding()
    }
}
```

弹性 `frame` 的规则是：把收到的提议**夹在 min 和 max 之间**，作为自己的尺寸。

- `maxWidth: .infinity` 是最常用的写法，意思是“最大宽度不设上限”，于是提议多宽它就多宽。效果是**让一个贴合内容的视图变成来者不拒**。
- `minHeight: 44` 保证至少 44 高，内容更高时跟着内容走。

::: tip 惯用法
`.frame(maxWidth: .infinity, alignment: .leading)` 是“撑满宽度并左对齐”的标准写法。记住 `alignment` 参数要一起写，否则内容会在撑满的宽度里居中。
:::

`idealWidth` / `idealHeight` 是“理想尺寸”：当父视图的提议是“未指定”时（下面马上讲），视图就用理想尺寸。

## 提议不只是数字：nil、0、infinity

提议尺寸的宽和高各自可以是四种情况：

| 提议值 | 含义 | 视图的回应 |
| --- | --- | --- |
| 具体数值 | “你有这么多空间” | 按各自的性格回应 |
| `0` | “你最小能多小？” | 回应最小尺寸 |
| `.infinity` | “你最大能多大？” | 回应最大尺寸 |
| `nil`（未指定） | “你自己想多大？” | 回应**理想尺寸**（ideal size） |

容器视图（如 `HStack`）在给孩子分配空间之前，会先用 0 和 infinity 探测每个孩子的弹性范围，再决定怎么分。

“未指定”提议在日常开发中最常以两种方式出现：

### fixedSize：请用你的理想尺寸

`.fixedSize()` 的作用是：**无视父视图的提议，改为向子视图提议 `nil`**，于是子视图用它的理想尺寸。

```swift
struct FixedSizeDemo: View {
    var body: some View {
        VStack(spacing: 20) {
            Text("这段文字在窄容器里会被截断")
                .frame(width: 120)
                .border(.red)

            Text("这段文字拒绝被截断，宁可超出容器")
                .fixedSize()
                .frame(width: 120)
                .border(.red)

            Text("水平方向接受提议并折行，垂直方向用理想高度，保证不被截断")
                .fixedSize(horizontal: false, vertical: true)
                .frame(width: 160)
                .border(.red)
        }
    }
}
```

`Text` 的理想宽度是“不折行时的完整宽度”，所以第二个例子里文字冲出了 120 宽的红框。

`.fixedSize(horizontal: false, vertical: true)` 是一个非常实用的写法：宽度听父视图的，高度按内容需要来。当你发现多行文字在某个容器里被莫名其妙截断时，通常它就是解药。

### ScrollView：滚动方向上提议 nil

`ScrollView` 在它的滚动方向上给内容提议 `nil`（“你想多高就多高”），在另一个方向上提议自己的宽度。这就是为什么 `ScrollView` 里的内容可以无限长。也是为什么在垂直 `ScrollView` 里放一个 `Color.blue`，它的高度不会撑满，而是只有很小的默认高度：来者不拒的视图在被问“你自己想多大”时，只能给出一个保守的默认值。

## 空间不够时谁让步：layoutPriority

当 `HStack` 里的孩子加起来超过可用宽度时，`HStack` 怎么分？它的算法大致是：

1. 先减去所有间距
2. 把孩子按**弹性从小到大**排序（弹性 = 最大尺寸 − 最小尺寸）
3. 从最不灵活的孩子开始，每次把“剩余空间 ÷ 剩余孩子数”提议给它，记下它的回应，从剩余空间里扣除
4. 最灵活的孩子最后分，拿到剩下的全部

所以固定大小的图标先拿到它要的，`Spacer` 这种来者不拒的最后拿剩下的。

如果两个孩子都是 `Text`，弹性差不多，就各分一半。这常常不是你想要的：

```swift
struct PriorityDemo: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Text("这是一个比较长的商品名称标题")
                Text("¥1,299.00")
            }
            .lineLimit(1)
            .frame(width: 240)
            .border(.gray)

            HStack {
                Text("这是一个比较长的商品名称标题")
                Text("¥1,299.00")
                    .layoutPriority(1)
            }
            .lineLimit(1)
            .frame(width: 240)
            .border(.gray)
        }
    }
}
```

第一行里两段文字都被截断了。第二行给价格加了 `.layoutPriority(1)`，价格完整显示，标题被截断。

`layoutPriority` 默认是 0。容器会**先满足优先级高的孩子**：给低优先级的孩子只预留它们的最小尺寸，把其余空间先提议给高优先级的孩子，剩下的再分给低优先级的。

## 不影响布局的位置修饰符

有几个修饰符改变视图**画在哪里**，但不改变它**在布局中占的位置**。

```swift
struct OffsetDemo: View {
    var body: some View {
        HStack(spacing: 0) {
            Text("甲").padding().background(.red)
            Text("乙").padding().background(.green)
                .offset(x: 20, y: 20)
            Text("丙").padding().background(.blue)
        }
    }
}
```

“乙”画到了右下方 20 点的位置，盖住了“丙”的一角，但“丙”没有被挤走。在布局眼里，“乙”还在原来的位置。

| 修饰符 | 作用 | 影响布局吗 |
| --- | --- | --- |
| `.offset(x:y:)` | 平移绘制位置 | 否 |
| `.scaleEffect()` | 缩放绘制 | 否 |
| `.rotationEffect()` | 旋转绘制 | 否 |
| `.position(x:y:)` | 把视图中心放到父坐标系的指定点 | 特殊：它会让自己变成来者不拒，占满父视图提议的空间 |
| `.padding()` | 增加留白 | **是** |
| `.frame()` | 套一个盒子 | **是** |

`offset`、`scaleEffect`、`rotationEffect` 是“渲染变换”，非常适合做动画，因为它们不会引起周围视图重新布局。

## aspectRatio：按比例回应

```swift
struct AspectRatioDemo: View {
    var body: some View {
        VStack(spacing: 12) {
            Color.teal
                .aspectRatio(16 / 9, contentMode: .fit)

            Color.orange
                .aspectRatio(1, contentMode: .fit)
                .frame(height: 80)
        }
        .padding()
    }
}
```

`.aspectRatio(16/9, contentMode: .fit)` 在提议的空间内，找到满足 16:9 的最大尺寸，然后提议给子视图。`.fill` 则是找到能盖住提议空间的最小尺寸（会超出，通常要配合 `.clipped()`）。

## 调试布局

布局不符合预期时，最快的办法是**让尺寸可见**：

```swift
struct DebugDemo: View {
    var body: some View {
        HStack {
            Text("左").border(.red)
            Spacer().border(.green)
            Text("右").border(.blue)
        }
        .border(.black)
    }
}
```

`.border(.red)` 画出每个视图的实际边界。在修饰符链的不同位置加 `.border`，可以看到“到这一层为止视图有多大”。配合“从里往外一层层读”的方法，大部分布局问题都能定位。

## 常见误区

**误区一：“`.frame(width: 100)` 让视图变成 100 宽。”** 它套了一个 100 宽的盒子并向里面提议 100。里面的视图听不听是它自己的事。

**误区二：“父视图决定子视图的大小。”** 父视图只提议。`Text` 不会因为父视图大就变大，`Image` 不加 `resizable` 就完全不理会提议。

**误区三：“`Color.red` 在 `ScrollView` 里消失了。”** 没有消失，它被问“你想多高”时只能给出很小的默认值。给它一个明确的 `.frame(height:)`。

**误区四：“`.offset` 可以用来调整布局。”** `offset` 只改变绘制位置，周围的视图不会给它让地方，也不会填补它留下的空位。

## 小结

- 布局是递归的三步：父提议尺寸，子回应尺寸，父摆放位置。子视图的尺寸由自己决定。
- 视图有三种性格：贴合内容、来者不拒、看孩子。
- `frame` 是一个尺寸确定的盒子，向内提议、向外回应，并按 `alignment` 摆放内容。
- `maxWidth: .infinity` 让视图撑满；`fixedSize` 让视图用理想尺寸；`layoutPriority` 决定空间紧张时谁优先。
- `offset`、`scaleEffect`、`rotationEffect` 只影响绘制，不影响布局。

## 练习

1. 不运行代码，预测下面每个视图的最终尺寸（假设可用空间 300 × 300），然后用 `.border` 验证：
   - `Text("Hi").frame(width: 100).padding(20)`
   - `Color.red.padding(20).frame(width: 100, height: 100)`
   - `Color.red.frame(width: 100, height: 100).padding(20)`
2. 做一个“全宽按钮”：文字居中，背景色撑满整行，高度 50。想清楚 `.frame(maxWidth: .infinity)` 应该放在 `.background()` 的前面还是后面，为什么。
3. `HStack` 里放一个头像（40 × 40 的圆）、一段可能很长的用户名、一个“关注”按钮。要求用户名过长时截断，头像和按钮永远完整显示。
4. 解释：为什么 `Text("很长的文字…").frame(width: 50).fixedSize()` 和 `Text("很长的文字…").fixedSize().frame(width: 50)` 的结果不同？

## 官方文档

- [Layout fundamentals（布局基础总览）](https://developer.apple.com/documentation/swiftui/layout-fundamentals)
- [Layout adjustments（布局调整总览）](https://developer.apple.com/documentation/swiftui/layout-adjustments)
- [`frame(width:height:alignment:)`](https://developer.apple.com/documentation/swiftui/view/frame(width:height:alignment:))
- [`frame(minWidth:idealWidth:maxWidth:minHeight:idealHeight:maxHeight:alignment:)`](https://developer.apple.com/documentation/swiftui/view/frame(minwidth:idealwidth:maxwidth:minheight:idealheight:maxheight:alignment:))
- [`fixedSize(horizontal:vertical:)`](https://developer.apple.com/documentation/swiftui/view/fixedsize(horizontal:vertical:))
- [`layoutPriority(_:)`](https://developer.apple.com/documentation/swiftui/view/layoutpriority(_:))
- [`ProposedViewSize`](https://developer.apple.com/documentation/swiftui/proposedviewsize)
- [`aspectRatio(_:contentMode:)`](https://developer.apple.com/documentation/swiftui/view/aspectratio(_:contentmode:))
- [`offset(x:y:)`](https://developer.apple.com/documentation/swiftui/view/offset(x:y:))
- [WWDC19：Building Custom Views with SwiftUI（布局流程的官方讲解）](https://developer.apple.com/videos/play/wwdc2019/237/)
- [WWDC22：Compose custom layouts with SwiftUI](https://developer.apple.com/videos/play/wwdc2022/10056/)
