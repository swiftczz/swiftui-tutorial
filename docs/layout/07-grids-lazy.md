# 07 网格、懒加载与滚动容器

## 本章目标

- 用 `Grid` 做行列对齐的表格式布局
- 用 `LazyVGrid` / `LazyHGrid` 做可滚动的网格，掌握 `GridItem` 的三种尺寸模式
- 理解“懒加载”是什么、什么时候该用 `LazyVStack`
- 掌握 `ScrollView` 的基本用法
- 知道 `ForEach` 在布局中扮演的角色

## 先说 ForEach

第 3 章用 `ForEach` 讲过视图身份。这里再明确一下它的定位：**`ForEach` 自己不是布局容器**。它只是把一组数据变成一组视图，这组视图怎么排列，完全取决于外面套的是什么。

```swift
struct ForEachRole: View {
    let colors: [Color] = [.red, .orange, .yellow, .green, .blue]

    var body: some View {
        VStack(spacing: 20) {
            HStack {                                   // 放在 HStack 里就横着排
                ForEach(colors, id: \.self) { color in
                    Circle().fill(color).frame(width: 30, height: 30)
                }
            }

            VStack(spacing: 4) {                       // 放在 VStack 里就竖着排
                ForEach(0..<3) { index in
                    Text("第 \(index + 1) 行")
                }
            }
        }
    }
}
```

`ForEach` 有三种常用形式：

| 形式 | 何时使用 |
| --- | --- |
| `ForEach(items) { item in }` | 元素遵循 `Identifiable`。首选 |
| `ForEach(items, id: \.someKey) { item in }` | 元素不遵循 `Identifiable`，用某个稳定唯一的属性做 id |
| `ForEach(0..<5) { i in }` | **固定不变**的整数范围 |

::: warning 整数范围必须是常量
`ForEach(0..<count)` 这种写法，SwiftUI 只在第一次读取范围，之后 `count` 变了它不会更新。范围会变化时，写成 `ForEach(0..<count, id: \.self)`，或者更好的做法是遍历真正的数据集合。
:::

## Grid：行列对齐的表格

`Grid` <Badge type="tip" text="iOS 16+ / macOS 13+" /> 用来做“每一列的宽度要对齐”的布局。它会先测量所有单元格，然后让同一列的单元格等宽、同一行的单元格等高。

```swift
struct GridBasics: View {
    var body: some View {
        Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 10) {
            GridRow {
                Text("项目").bold()
                Text("数量").bold()
                Text("金额").bold()
            }
            Divider()
            GridRow {
                Text("拿铁咖啡")
                Text("2")
                Text("¥64.00")
            }
            GridRow {
                Text("可颂")
                Text("1")
                Text("¥18.00")
            }
            GridRow {
                Text("合计")
                    .gridCellColumns(2)              // 横跨两列
                Text("¥82.00").bold()
            }
        }
        .padding()
    }
}
```

要点：

- 每个 `GridRow` 是一行，里面每个视图占一列。
- 不放在 `GridRow` 里的视图（比如上面的 `Divider`）会独占一整行，横跨所有列。
- `.gridCellColumns(n)` 让一个单元格横跨 n 列。
- `Grid` 会**一次性创建和测量所有单元格**，所以适合内容量不大的场合。

### 单元格对齐

对齐可以在三个层级设置，越具体的优先级越高：

```swift
struct GridAlignment: View {
    var body: some View {
        Grid(alignment: .leading, horizontalSpacing: 20, verticalSpacing: 8) {
            GridRow {
                Text("商品")
                Text("单价")
                    .gridColumnAlignment(.trailing)     // 整列右对齐
            }
            .bold()

            GridRow {
                Text("机械键盘")
                Text("¥599.00")
            }
            GridRow {
                Text("鼠标")
                Text("¥89.00")
            }
            GridRow(alignment: .top) {                   // 这一行顶部对齐
                Text("超长名称的显示器支架\n（含理线槽）")
                Text("¥1,299.00")
            }
        }
        .padding()
    }
}
```

| 层级 | 写法 |
| --- | --- |
| 整个网格 | `Grid(alignment:)` |
| 某一行的垂直对齐 | `GridRow(alignment:)` |
| 某一列的水平对齐 | 在该列任意一个单元格上加 `.gridColumnAlignment()` |
| 某一个单元格 | `.gridCellAnchor()` |

数字列右对齐是表格的基本功，`.gridColumnAlignment(.trailing)` 写一次，整列都生效。

### 占位与不参与测量

```swift
struct GridExtras: View {
    var body: some View {
        Grid {
            GridRow {
                Color.clear
                    .gridCellUnsizedAxes([.horizontal, .vertical])   // 空单元格，不撑大行列
                Text("周一")
                Text("周二")
            }
            GridRow {
                Text("上午")
                Image(systemName: "checkmark")
                Image(systemName: "xmark")
            }
        }
    }
}
```

`Color.clear` 是来者不拒的，如果不处理，它会把这一列撑到很宽。`.gridCellUnsizedAxes` 告诉 `Grid`：“计算列宽行高时不要问我的意见。”

## LazyVGrid 与 LazyHGrid：可滚动的网格

当内容很多、需要滚动时，用懒加载网格。`LazyVGrid` 垂直方向增长，你定义**列**；`LazyHGrid` 水平方向增长，你定义**行**。

列的定义是一个 `GridItem` 数组，每个 `GridItem` 描述一列怎么确定宽度。有三种模式：

```swift
struct GridItemModes: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("fixed：固定宽度").font(.headline)
                LazyVGrid(columns: [GridItem(.fixed(60)), GridItem(.fixed(100)), GridItem(.fixed(60))]) {
                    cells(6)
                }

                Text("flexible：平分剩余空间").font(.headline)
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3)) {
                    cells(6)
                }

                Text("adaptive：每格至少 70，能放几列放几列").font(.headline)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 70))]) {
                    cells(9)
                }
            }
            .padding()
        }
    }

    private func cells(_ count: Int) -> some View {
        ForEach(0..<count, id: \.self) { index in
            Text("\(index + 1)")
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(.blue.opacity(0.2), in: .rect(cornerRadius: 6))
        }
    }
}
```

| 模式 | 含义 | 典型用途 |
| --- | --- | --- |
| `.fixed(60)` | 这一列固定 60 宽 | 列宽已知 |
| `.flexible(minimum:maximum:)` | 这一列在范围内伸缩，和其他弹性列平分空间 | 固定列数，如“每行 3 个” |
| `.adaptive(minimum:maximum:)` | **一个** `GridItem` 生成**多列**，每列至少 `minimum` 宽，尽可能多放 | 列数随容器宽度变化 |

::: tip adaptive 是多端统一的利器
`[GridItem(.adaptive(minimum: 150))]` 这一行代码，在 iPhone 竖屏上是 2 列，在 iPad 上是 5 列，在 Mac 上随窗口宽度实时变化。你不需要判断设备类型，只需要表达“每个格子至少要 150 宽才好看”。这是 SwiftUI 自适应布局的典型思路：**描述约束，而不是描述结果**。
:::

### 一个照片墙

```swift
struct PhotoWall: View {
    private let columns = [GridItem(.adaptive(minimum: 100), spacing: 2)]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 2) {
                ForEach(0..<200, id: \.self) { index in
                    Color(hue: Double(index % 20) / 20, saturation: 0.6, brightness: 0.9)
                        .aspectRatio(1, contentMode: .fit)
                        .overlay {
                            Text("\(index)")
                                .font(.caption)
                                .foregroundStyle(.white)
                        }
                }
            }
        }
    }
}
```

这里有两个 `spacing`：`GridItem(spacing:)` 是列与列之间的水平间距，`LazyVGrid(spacing:)` 是行与行之间的垂直间距。

`.aspectRatio(1, contentMode: .fit)` 让每个格子保持正方形：宽度由列决定，高度跟着宽度走。

### Grid 与 LazyVGrid 怎么选

| | `Grid` | `LazyVGrid` |
| --- | --- | --- |
| 创建时机 | 全部立即创建 | 滚动到才创建 |
| 列宽 | 根据内容自动计算，各列可以不同 | 由 `GridItem` 预先指定 |
| 跨列 | 支持 `gridCellColumns` | 不支持 |
| 适合 | 内容少、需要按内容对齐的表格 | 内容多、格子大小规整的集合 |

## 懒加载：只创建看得见的

“懒”（lazy）的意思是：**视图只在即将显示到屏幕上时才被创建**。

```swift
struct LazyComparison: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(0..<10_000, id: \.self) { index in
                    RowWithLog(index: index)
                }
            }
            .padding()
        }
    }
}

struct RowWithLog: View {
    let index: Int

    var body: some View {
        Text("第 \(index) 行")
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(.quaternary, in: .rect(cornerRadius: 8))
            .onAppear { print("创建了第 \(index) 行") }
    }
}
```

运行并观察控制台：一开始只打印了屏幕上能看到的十几行，往下滚动才陆续打印更多。把 `LazyVStack` 换成 `VStack` 再试，一万行会在启动时全部创建，界面明显卡顿。

### 懒加载的代价

既然懒加载这么好，为什么不让 `VStack` 默认就是懒的？因为它有代价：

- **无法预知总尺寸。** 没创建的视图不知道有多高，所以滚动条的长度是估算的，滚动过程中可能跳动。
- **布局行为不同。** `VStack` 的宽度是最宽的孩子的宽度；`LazyVStack` 没法知道所有孩子的宽度，所以它在水平方向上**来者不拒，直接占满提议的宽度**。
- **状态会丢失。** 滚出屏幕很远的视图可能被销毁，它的 `@State` 会重置。重要的状态要放在数据模型里，不要放在行视图的 `@State` 里。

::: tip 选择原则
- 内容少（几十个以内）、不滚动或很短：用 `VStack` / `HStack`
- 内容多或数量不确定，放在 `ScrollView` 里：用 `LazyVStack` / `LazyHStack`
- 需要系统风格的行（分隔线、滑动删除、选中状态）：用 `List`（第 17 章），它本身就是懒加载的
:::

### 固定表头：pinnedViews

懒加载栈和网格支持分组，分组的头部和尾部可以在滚动时吸附在边缘：

```swift
struct PinnedHeaderDemo: View {
    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0, pinnedViews: [.sectionHeaders]) {
                ForEach(["A", "B", "C", "D"], id: \.self) { letter in
                    Section {
                        ForEach(1...8, id: \.self) { number in
                            Text("\(letter)\(number)")
                                .padding(.horizontal)
                                .padding(.vertical, 10)
                        }
                    } header: {
                        Text(letter)
                            .font(.headline)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)
                            .padding(.vertical, 6)
                            .background(.bar)
                    }
                }
            }
        }
    }
}
```

`Section` 是一个通用的分组视图，在 `List`、`Form`、`Picker`、懒加载容器里都能用，各自有不同的表现。

## ScrollView 基础

`ScrollView` 让内容可以超出可见区域并滚动。回忆第 5 章：它在滚动方向上向内容提议 `nil`，让内容用理想尺寸。

```swift
struct ScrollBasics: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("横向滚动").font(.headline).padding(.horizontal)

            ScrollView(.horizontal) {
                HStack(spacing: 12) {
                    ForEach(0..<12, id: \.self) { index in
                        RoundedRectangle(cornerRadius: 12)
                            .fill(.teal.gradient)
                            .frame(width: 120, height: 80)
                            .overlay { Text("卡片 \(index)").foregroundStyle(.white) }
                    }
                }
                .padding(.horizontal)
            }
            .scrollIndicators(.hidden)

            Text("纵向滚动").font(.headline).padding(.horizontal)

            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(0..<30, id: \.self) { index in
                        Text("内容行 \(index)")
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
            }
        }
    }
}
```

要点：

- `ScrollView` 默认垂直滚动。`ScrollView(.horizontal)` 水平滚动，`ScrollView([.horizontal, .vertical])` 双向滚动。
- `.scrollIndicators(.hidden)` 隐藏滚动条。
- 垂直 `ScrollView` 里的内容宽度取决于内容自己。上面的 `VStack` 加了 `.frame(maxWidth: .infinity, alignment: .leading)`，否则它只有最宽的文字那么宽，并且在 `ScrollView` 里居中。
- 横向滚动的内容边距要加在**内容**上（`.padding(.horizontal)` 加在 `HStack` 上），不要加在 `ScrollView` 上。加在 `ScrollView` 上会让滚动区域本身缩进，卡片滚到边缘时被切掉。

::: info 想一想
把一个垂直的 `ScrollView` 放进一个 `VStack`，上面再放一个标题。`ScrollView` 会占多高？
:::

`ScrollView` 的性格是来者不拒，所以它占满 `VStack` 分给它的所有剩余高度，这正是我们想要的。但如果把两个垂直 `ScrollView` 上下放在同一个 `VStack` 里，它们会平分高度。

`ScrollView` 还有很多能力：滚动到指定位置、分页吸附、滚动联动的动效、内容边距。这些放在第 18 章专门讲。

## 综合示例：自适应的卡片网格

```swift
struct Product: Identifiable {
    let id = UUID()
    let name: String
    let price: Double
    let hue: Double
}

struct ProductGrid: View {
    private let products = (1...24).map { index in
        Product(name: "商品 \(index)", price: Double(index) * 19.9, hue: Double(index) / 24)
    }
    private let columns = [GridItem(.adaptive(minimum: 150, maximum: 220), spacing: 16)]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(products) { product in
                    VStack(alignment: .leading, spacing: 8) {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color(hue: product.hue, saturation: 0.5, brightness: 0.9).gradient)
                            .aspectRatio(4 / 3, contentMode: .fit)

                        Text(product.name)
                            .font(.headline)
                            .lineLimit(1)

                        Text(product.price, format: .currency(code: "CNY"))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(10)
                    .background(.background.secondary, in: .rect(cornerRadius: 14))
                }
            }
            .padding()
        }
    }
}
```

在预览里切换 iPhone、iPad、Mac，或者在 Mac 上拖动窗口宽度，观察列数如何自动变化。整段代码没有一处判断设备或屏幕宽度。

## 常见误区

**误区一：“`ForEach` 会把东西竖着排。”** `ForEach` 不排版。它在 `VStack` 里是竖的，在 `HStack` 里是横的，在 `List` 里每个元素是一行。

**误区二：“`LazyVStack` 比 `VStack` 高级，都用它。”** 懒加载有代价：尺寸估算、状态可能丢失、布局行为不同。内容少时 `VStack` 更可预测也更快。

**误区三：“`LazyVGrid` 的 `GridItem(.adaptive)` 要写多个。”** 一个 `.adaptive` 的 `GridItem` 就会生成多列。写多个会得到奇怪的结果。

**误区四：“把 `.padding()` 加在横向 `ScrollView` 上。”** 这会让内容在滚动区域边缘被切断。边距加在里面的内容上，或者用第 18 章讲的 `contentMargins`。

## 小结

- `ForEach` 只负责把数据变成视图，排列方式由外层容器决定。
- `Grid` 按内容自动对齐行列，一次性创建所有单元格，适合小型表格。
- `LazyVGrid`/`LazyHGrid` 用 `GridItem` 定义列或行，`.adaptive` 模式能随宽度自动改变列数。
- 懒加载容器只创建即将可见的视图，适合大量内容，但有尺寸估算和状态丢失的代价。
- `ScrollView` 在滚动方向上让内容自由伸展，自己则占满可用空间。

## 练习

1. 用 `Grid` 做一个 4 × 4 的计算器键盘，其中“0”键横跨两列。
2. 做一个日历月视图：7 列固定，标题行显示“日一二三四五六”，下面显示 1–31。用 `LazyVGrid` 和 7 个 `.flexible()` 的 `GridItem`。
3. 把 `PhotoWall` 改成横向滚动、3 行的 `LazyHGrid`。
4. 在 `LazyComparison` 的 `RowWithLog` 里加一个 `@State private var isLiked = false` 和一个切换它的按钮。点亮几行，向下滚动很远再滚回来，观察状态是否还在。思考：这个状态应该放在哪里？

## 官方文档

- [`Grid`](https://developer.apple.com/documentation/swiftui/grid)
- [`GridRow`](https://developer.apple.com/documentation/swiftui/gridrow)
- [`LazyVGrid`](https://developer.apple.com/documentation/swiftui/lazyvgrid)
- [`LazyHGrid`](https://developer.apple.com/documentation/swiftui/lazyhgrid)
- [`GridItem`](https://developer.apple.com/documentation/swiftui/griditem)
- [`LazyVStack`](https://developer.apple.com/documentation/swiftui/lazyvstack)
- [`LazyHStack`](https://developer.apple.com/documentation/swiftui/lazyhstack)
- [`ScrollView`](https://developer.apple.com/documentation/swiftui/scrollview)
- [`Section`](https://developer.apple.com/documentation/swiftui/section)
- [`ForEach`](https://developer.apple.com/documentation/swiftui/foreach)
- [Creating performant scrollable stacks](https://developer.apple.com/documentation/swiftui/creating-performant-scrollable-stacks)
- [Picking container views for your content](https://developer.apple.com/documentation/swiftui/picking-container-views-for-your-content)
- [`PinnedScrollableViews`](https://developer.apple.com/documentation/swiftui/pinnedscrollableviews)
