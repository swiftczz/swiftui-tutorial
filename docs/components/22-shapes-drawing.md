# 22 形状、绘制与样式

## 本章目标

- 使用内置形状，掌握填充与描边
- 理解 `ShapeStyle`：颜色、渐变、材质、层级样式其实是同一类东西
- 用 `Path` 画自定义形状
- 掌握裁剪、遮罩、阴影、模糊、混合模式
- 用 `Canvas` 高效绘制大量图形
- 理解颜色的语义与深色模式适配

## 内置形状

```swift
struct BuiltInShapes: View {
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 90))], spacing: 16) {
            Rectangle().fill(.red)
            RoundedRectangle(cornerRadius: 16).fill(.orange)
            RoundedRectangle(cornerRadius: 16, style: .continuous).fill(.yellow)
            UnevenRoundedRectangle(topLeadingRadius: 24, bottomTrailingRadius: 24).fill(.green)
            Capsule().fill(.mint)
            Circle().fill(.blue)
            Ellipse().fill(.purple)
        }
        .frame(height: 220)
        .padding()
    }
}
```

形状的性格是“来者不拒”（第 5 章）：提议多大就画多大。`Circle` 会在提议的矩形里画一个尽可能大的正圆。

形状是视图，但更多时候它们被当作**参数**传给修饰符。为此每个形状都有一个简写形式：

```swift
struct ShapeShorthand: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("背景形状")
                .padding()
                .background(.blue.opacity(0.2), in: .rect(cornerRadius: 12))

            Text("裁剪形状")
                .padding()
                .background(.orange)
                .clipShape(.capsule)

            Text("点击区域形状")
                .padding()
                .contentShape(.rect)

            Image(systemName: "person.fill")
                .padding()
                .background(.green.opacity(0.3), in: .circle)
        }
    }
}
```

| 简写 | 对应的形状 |
| --- | --- |
| `.rect` | `Rectangle()` |
| `.rect(cornerRadius: 12)` | `RoundedRectangle(cornerRadius: 12)` |
| `.rect(cornerRadii: ...)` | `UnevenRoundedRectangle(...)` |
| `.capsule` | `Capsule()` |
| `.circle` | `Circle()` |
| `.ellipse` | `Ellipse()` |
| `.containerRelative` | 跟随容器形状（见下文） |

::: tip 连续圆角
`RoundedRectangle(cornerRadius:style:)` 的 `style` 有两个值：`.circular` 是标准圆弧，`.continuous` 是苹果图标那种曲率连续变化的“超椭圆”圆角，看起来更柔和。简写 `.rect(cornerRadius:)` 默认就是 `.continuous`。
:::

### 同心圆角

嵌套的圆角矩形，内层的圆角应该比外层小，这样看起来才协调（内圆角 = 外圆角 − 内边距）。手算很麻烦，系统提供了两个工具。

`ContainerRelativeShape` 自动采用容器的形状并按内边距调整圆角。容器形状由 `.containerShape()` 设置，小组件等系统容器会自动提供：

```swift
struct ConcentricDemo: View {
    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(.blue.opacity(0.2))

            ContainerRelativeShape()
                .fill(.blue.opacity(0.5))
                .padding(12)

            ContainerRelativeShape()
                .fill(.blue)
                .padding(24)
        }
        .frame(width: 200, height: 140)
        .containerShape(.rect(cornerRadius: 36))
    }
}
```

三层圆角自动保持同心。26 系列新增的 `ConcentricRectangle` <Badge type="tip" text="iOS 26+ / macOS 26+" /> 是它的加强版，可以分别控制每个角，并且会与窗口、sheet 的圆角保持同心，是 Liquid Glass 设计中推荐的形状。

## 填充与描边

```swift
struct FillAndStroke: View {
    var body: some View {
        HStack(spacing: 20) {
            Circle()
                .fill(.teal)

            Circle()
                .stroke(.teal, lineWidth: 10)

            Circle()
                .strokeBorder(.teal, lineWidth: 10)

            Circle()
                .fill(.teal.opacity(0.2))
                .stroke(.teal, lineWidth: 3)

            Circle()
                .stroke(.teal, style: StrokeStyle(lineWidth: 4, lineCap: .round, dash: [8, 8]))
        }
        .frame(height: 70)
        .padding(20)
    }
}
```

- `.fill(_:)` 填充内部。
- `.stroke(_:lineWidth:)` 描边。线条以形状的边缘为**中心**，所以一半在形状内，一半在形状外。上面第二个圆会超出它的布局范围 5 点。
- `.strokeBorder(_:lineWidth:)` 描边，线条完全在形状**内部**。大多数情况下这才是你想要的。
- 可以连着写 `.fill().stroke()`，同时填充和描边。
- `StrokeStyle` 控制线帽（`lineCap`）、连接（`lineJoin`）、虚线（`dash`）。

### trim：只画一部分

```swift
struct TrimDemo: View {
    @State private var progress = 0.65

    var body: some View {
        VStack(spacing: 24) {
            ZStack {
                Circle()
                    .stroke(.gray.opacity(0.2), lineWidth: 14)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(.blue, style: StrokeStyle(lineWidth: 14, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text(progress, format: .percent.precision(.fractionLength(0)))
                    .font(.title.bold())
            }
            .frame(width: 140, height: 140)

            Slider(value: $progress)
        }
        .padding()
    }
}
```

`.trim(from:to:)` 只画路径的一段，参数是 0 到 1 的比例。圆形的起点在右侧（3 点钟方向），所以旋转 −90° 让它从顶部开始。这是做环形进度条的标准做法。`trim` 的参数可以做动画。

## ShapeStyle：可以用来“涂”的东西

`.fill()`、`.foregroundStyle()`、`.background()`、`.stroke()`、`.tint()` 的参数类型都是 `ShapeStyle`。颜色、渐变、材质、层级样式都遵循这个协议。理解了这一点，你就知道**凡是能放颜色的地方，都能放渐变或材质**。

```swift
struct ShapeStyles: View {
    var body: some View {
        VStack(spacing: 12) {
            Group {
                RoundedRectangle(cornerRadius: 12).fill(.blue)                       // 颜色
                RoundedRectangle(cornerRadius: 12).fill(.blue.gradient)              // 颜色自带的柔和渐变
                RoundedRectangle(cornerRadius: 12).fill(.tint)                       // 当前强调色
                RoundedRectangle(cornerRadius: 12).fill(.secondary)                  // 层级样式
                RoundedRectangle(cornerRadius: 12).fill(.regularMaterial)            // 材质
                RoundedRectangle(cornerRadius: 12).fill(.background.secondary)       // 语义背景色
            }
            .frame(height: 36)
        }
        .padding()
        .background(.orange.gradient)
    }
}
```

### 渐变

```swift
struct Gradients: View {
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 12) {
            RoundedRectangle(cornerRadius: 16)
                .fill(.linearGradient(colors: [.pink, .orange], startPoint: .topLeading, endPoint: .bottomTrailing))

            RoundedRectangle(cornerRadius: 16)
                .fill(.linearGradient(
                    stops: [.init(color: .blue, location: 0), .init(color: .cyan, location: 0.3), .init(color: .white, location: 1)],
                    startPoint: .top, endPoint: .bottom
                ))

            RoundedRectangle(cornerRadius: 16)
                .fill(.radialGradient(colors: [.yellow, .red], center: .center, startRadius: 5, endRadius: 90))

            RoundedRectangle(cornerRadius: 16)
                .fill(.angularGradient(colors: [.red, .yellow, .green, .blue, .purple, .red], center: .center, startAngle: .zero, endAngle: .degrees(360)))

            RoundedRectangle(cornerRadius: 16)
                .fill(.ellipticalGradient(colors: [.mint, .indigo]))
        }
        .frame(height: 260)
        .padding()
    }
}
```

`startPoint`、`endPoint`、`center` 的类型是 `UnitPoint`：以 0 到 1 的比例表示形状内的位置，`.topLeading` 是 (0, 0)，`.bottomTrailing` 是 (1, 1)。

`MeshGradient`（网格渐变）用一个二维网格的控制点和颜色定义非常柔和、复杂的渐变：

```swift
struct MeshGradientDemo: View {
    var body: some View {
        MeshGradient(
            width: 3, height: 3,
            points: [
                [0, 0], [0.5, 0], [1, 0],
                [0, 0.5], [0.6, 0.4], [1, 0.5],
                [0, 1], [0.5, 1], [1, 1],
            ],
            colors: [
                .indigo, .purple, .pink,
                .blue, .mint, .orange,
                .teal, .green, .yellow,
            ]
        )
        .frame(height: 220)
        .clipShape(.rect(cornerRadius: 24))
        .padding()
    }
}
```

`points` 是每个控制点的位置（0 到 1），`colors` 是对应的颜色。移动中间那个点（上例的 `[0.6, 0.4]`）就能让颜色的分布发生流动般的变化。第 30 章会让它动起来。

### 材质

材质是半透明的模糊效果，能透出后面的内容：

```swift
struct Materials: View {
    var body: some View {
        ZStack {
            LinearGradient(colors: [.red, .yellow, .green, .blue], startPoint: .leading, endPoint: .trailing)

            VStack(spacing: 8) {
                Text("ultraThin").padding(8).frame(maxWidth: .infinity).background(.ultraThinMaterial)
                Text("thin").padding(8).frame(maxWidth: .infinity).background(.thinMaterial)
                Text("regular").padding(8).frame(maxWidth: .infinity).background(.regularMaterial)
                Text("thick").padding(8).frame(maxWidth: .infinity).background(.thickMaterial)
                Text("ultraThick").padding(8).frame(maxWidth: .infinity).background(.ultraThickMaterial)
                Text("bar").padding(8).frame(maxWidth: .infinity).background(.bar)
            }
            .padding()
        }
        .frame(height: 300)
    }
}
```

放在材质上的文字，用层级样式（`.primary`、`.secondary`）时会自动获得“鲜活”（vibrancy）效果，让文字在任何背景上都清晰。这也是推荐用层级样式而不是固定灰色的原因之一。

26 系列引入的 Liquid Glass 是比材质更进一步的效果，下一章专门讲。

### 层级样式与前景样式的传递

`.foregroundStyle()` 可以同时设置多级样式，子视图里的 `.secondary`、`.tertiary` 会相应变化：

```swift
struct HierarchicalStyles: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("主标题")
            Text("副标题").foregroundStyle(.secondary)
            Text("说明").foregroundStyle(.tertiary)
        }
        .foregroundStyle(.indigo)        // 主色是靛蓝，secondary 和 tertiary 是它的浅色版本
        .padding()
    }
}
```

## 颜色

### 语义颜色

```swift
struct SemanticColors: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("primary 主要文字").foregroundStyle(.primary)
            Text("secondary 次要文字").foregroundStyle(.secondary)
            Text("强调色").foregroundStyle(.tint)
            Text("系统红").foregroundStyle(.red)
            Text("背景色上的内容")
                .padding()
                .background(.background.secondary, in: .rect(cornerRadius: 8))
        }
        .padding()
    }
}
```

系统提供的颜色（`.red`、`.blue`、`.primary` 等）都是**自适应**的：在浅色和深色模式下自动使用不同的具体色值，在“增强对比度”设置下也会调整。直接使用它们，深色模式就自动支持了。

| 用途 | 推荐 |
| --- | --- |
| 文字 | `.primary`、`.secondary`、`.tertiary` |
| 背景 | `.background`、`.background.secondary`、`.background.tertiary` |
| 强调 | `.tint`（跟随应用或系统的强调色） |
| 分隔 | `.separator` |
| 填充 | `.fill`、`.fill.secondary`（半透明的填充色） |

::: warning 不要写死黑白
`.foregroundStyle(.black)` 的文字在深色模式下会消失在黑色背景里。用 `.primary`。同理，卡片背景不要用 `.white`，用 `.background` 或 `.background.secondary`。
:::

### 自定义颜色

```swift
struct CustomColors: View {
    var body: some View {
        HStack(spacing: 12) {
            Color(red: 0.2, green: 0.6, blue: 0.9)
            Color(hue: 0.55, saturation: 0.8, brightness: 0.9)
            Color(white: 0.5)
            Color.blue.opacity(0.3)
            Color.red.mix(with: .yellow, by: 0.5)
        }
        .frame(height: 50)
        .padding()
    }
}
```

应用自己的品牌色，推荐定义在**资源目录**（Assets.xcassets）里：新建一个 Color Set，分别指定浅色和深色模式下的色值。然后用 Xcode 自动生成的符号引用：`Color(.brandPrimary)` 或直接 `.foregroundStyle(.brandPrimary)`。这样深色模式适配和设计调整都不需要改代码。

`.mix(with:by:)` <Badge type="tip" text="iOS 18+ / macOS 15+" /> 混合两种颜色。

## 自定义形状

实现 `Shape` 协议，在 `path(in:)` 里返回一条路径：

```swift
nonisolated struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}

struct TriangleDemo: View {
    var body: some View {
        HStack(spacing: 20) {
            Triangle().fill(.orange)
            Triangle().stroke(.orange, lineWidth: 4)
            Triangle().fill(.orange.gradient).frame(width: 50, height: 100)
        }
        .frame(height: 90)
        .padding()
    }
}
```

`rect` 是布局分配给这个形状的矩形。**所有坐标都应该相对于 `rect` 计算**（用 `rect.midX`、`rect.width * 0.3` 等），这样形状才能适应任意大小。

::: warning 自定义形状前面的 nonisolated
在“Default Actor Isolation = MainActor”的项目里，直接写 `struct Triangle: Shape` 会得到编译错误：

*conformance of 'Triangle' to protocol 'Shape' crosses into main actor-isolated code and can cause data races*

原因是 `Shape` 要求它的方法可以在任意线程调用（SwiftUI 可能在后台线程计算路径），而你的类型默认隔离在主 actor 上，两者矛盾。在类型前加 `nonisolated`，声明这个形状不属于任何 actor。

**自定义 `Shape`、`Layout`、`LayoutValueKey`、`Animatable` 类型，以及纯数据的模型结构体，都按这个方式处理。** 第 12 章有完整的解释。
:::

### Path 的绘制指令

```swift
nonisolated struct Wave: Shape {
    var amplitude: CGFloat = 20
    var frequency: CGFloat = 2

    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: 0, y: rect.midY))
            for x in stride(from: 0, through: rect.width, by: 2) {
                let relative = x / rect.width
                let y = rect.midY + sin(relative * frequency * 2 * .pi) * amplitude
                path.addLine(to: CGPoint(x: x, y: y))
            }
            path.addLine(to: CGPoint(x: rect.width, y: rect.maxY))
            path.addLine(to: CGPoint(x: 0, y: rect.maxY))
            path.closeSubpath()
        }
    }
}

nonisolated struct Heart: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width, h = rect.height
        return Path { path in
            path.move(to: CGPoint(x: w * 0.5, y: h * 0.9))
            path.addCurve(
                to: CGPoint(x: w * 0.5, y: h * 0.25),
                control1: CGPoint(x: -w * 0.35, y: h * 0.45),
                control2: CGPoint(x: w * 0.15, y: -h * 0.15)
            )
            path.addCurve(
                to: CGPoint(x: w * 0.5, y: h * 0.9),
                control1: CGPoint(x: w * 0.85, y: -h * 0.15),
                control2: CGPoint(x: w * 1.35, y: h * 0.45)
            )
        }
    }
}

struct PathShapesDemo: View {
    var body: some View {
        VStack(spacing: 20) {
            Wave().fill(.blue.opacity(0.5)).frame(height: 100)
            Heart().fill(.red.gradient).frame(width: 120, height: 110)
        }
        .padding()
    }
}
```

| 方法 | 作用 |
| --- | --- |
| `move(to:)` | 抬笔移动到一点，开始新的子路径 |
| `addLine(to:)` | 画直线 |
| `addQuadCurve(to:control:)` | 二次贝塞尔曲线（一个控制点） |
| `addCurve(to:control1:control2:)` | 三次贝塞尔曲线（两个控制点） |
| `addArc(center:radius:startAngle:endAngle:clockwise:)` | 圆弧 |
| `addRect`、`addRoundedRect`、`addEllipse` | 添加完整的图形 |
| `closeSubpath()` | 连回起点，闭合路径 |

::: info 关于圆弧的方向
SwiftUI 的坐标系 y 轴向下，所以 `addArc` 的 `clockwise` 参数和你在屏幕上看到的方向是**相反**的：`clockwise: false` 在屏幕上看起来是顺时针。遇到圆弧画反了，把这个参数取反即可。
:::

### 形状的组合运算

形状之间可以做集合运算：

```swift
struct ShapeOperations: View {
    var body: some View {
        HStack(spacing: 24) {
            Circle()
                .union(.rect.offset(x: 30, y: 30))
                .fill(.blue)

            Circle()
                .subtracting(.circle.offset(x: 25, y: -10))
                .fill(.yellow)

            Circle()
                .intersection(.rect.offset(x: 30))
                .fill(.green)

            Circle()
                .symmetricDifference(.circle.offset(x: 30))
                .fill(.pink)
        }
        .frame(height: 70)
        .padding(30)
    }
}
```

`union`（并集）、`subtracting`（差集，上例画出一弯月牙）、`intersection`（交集）、`symmetricDifference`（对称差）。

### 可内缩的形状

如果希望自定义形状支持 `.strokeBorder()`，需要遵循 `InsettableShape`，说明“向内缩 n 点之后是什么形状”：

```swift
nonisolated struct Diamond: InsettableShape {
    var inset: CGFloat = 0

    func path(in rect: CGRect) -> Path {
        let r = rect.insetBy(dx: inset, dy: inset)
        return Path { path in
            path.move(to: CGPoint(x: r.midX, y: r.minY))
            path.addLine(to: CGPoint(x: r.maxX, y: r.midY))
            path.addLine(to: CGPoint(x: r.midX, y: r.maxY))
            path.addLine(to: CGPoint(x: r.minX, y: r.midY))
            path.closeSubpath()
        }
    }

    func inset(by amount: CGFloat) -> Diamond {
        var copy = self
        copy.inset += amount
        return copy
    }
}

struct DiamondDemo: View {
    var body: some View {
        Diamond()
            .strokeBorder(.purple, lineWidth: 8)
            .frame(width: 100, height: 100)
    }
}
```

## 裁剪、遮罩与视觉效果

### 裁剪与遮罩

```swift
struct ClipAndMask: View {
    var body: some View {
        HStack(spacing: 20) {
            LinearGradient(colors: [.purple, .orange], startPoint: .top, endPoint: .bottom)
                .frame(width: 90, height: 90)
                .clipShape(.rect(cornerRadius: 20))

            LinearGradient(colors: [.purple, .orange], startPoint: .top, endPoint: .bottom)
                .frame(width: 90, height: 90)
                .mask {
                    Image(systemName: "star.fill")
                        .font(.system(size: 80))
                }

            LinearGradient(colors: [.purple, .orange], startPoint: .top, endPoint: .bottom)
                .frame(width: 90, height: 90)
                .mask {
                    LinearGradient(colors: [.black, .clear], startPoint: .top, endPoint: .bottom)
                }
        }
        .padding()
    }
}
```

- `.clipShape(_:)`：用一个形状裁剪，形状外的部分不显示。
- `.mask { }`：用任意视图作为遮罩。遮罩的**不透明度**决定内容的可见度：遮罩不透明的地方内容可见，透明的地方不可见，半透明的地方半可见。第三个例子用渐变遮罩做出了“渐隐”效果。

### 阴影、模糊与其他

```swift
struct VisualEffects: View {
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 24) {
            sample.shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 6)
            sample.blur(radius: 3)
            sample.opacity(0.4)
            sample.saturation(0.2)
            sample.brightness(0.3)
            sample.contrast(2)
            sample.hueRotation(.degrees(120))
            sample.grayscale(1)
            sample.colorInvert()
        }
        .padding()
    }

    private var sample: some View {
        RoundedRectangle(cornerRadius: 14)
            .fill(.linearGradient(colors: [.blue, .pink], startPoint: .topLeading, endPoint: .bottomTrailing))
            .frame(width: 80, height: 60)
    }
}
```

阴影有两种：`.shadow()` 修饰符给整个视图（按其不透明的形状）加投影；形状样式上的 `.shadow(.drop(...))` 或 `.shadow(.inner(...))` 是给这个填充本身加阴影，可以做出内阴影：

```swift
struct StyleShadow: View {
    var body: some View {
        HStack(spacing: 30) {
            Circle()
                .fill(.blue.shadow(.drop(color: .black.opacity(0.4), radius: 6, y: 4)))

            Circle()
                .fill(.blue.shadow(.inner(color: .black.opacity(0.5), radius: 6, y: 4)))
        }
        .frame(height: 80)
        .padding()
    }
}
```

### 混合模式与合成组

```swift
struct BlendDemo: View {
    var body: some View {
        HStack(spacing: 40) {
            ZStack {
                Circle().fill(.red).offset(x: -20)
                Circle().fill(.green).offset(x: 20)
                Circle().fill(.blue).offset(y: 30)
            }
            .blendMode(.screen)
            .frame(width: 80, height: 80)

            ZStack {
                Text("半透明").font(.title.bold())
                Circle().fill(.orange).frame(width: 40).offset(x: 30)
            }
            .compositingGroup()
            .opacity(0.5)
        }
        .padding(40)
        .background(.black)
    }
}
```

- `.blendMode(_:)` 决定这个视图的颜色和它下面的内容如何混合：`.multiply`（正片叠底）、`.screen`（滤色）、`.overlay`、`.difference` 等。
- `.compositingGroup()` 先把一组视图合成为一张图，再对整体应用后面的效果。不加它时，`.opacity(0.5)` 会分别作用于每个子视图，重叠的地方会透出下层；加了之后，整组作为一个整体变成半透明。

`.drawingGroup()` 更进一步：把视图内容用 Metal 离屏渲染成一张位图。当一个视图包含成百上千个形状和渐变时，它可以显著提升性能。但它有代价（占用内存、不支持某些原生控件），只在确实需要时使用。

## Canvas：即时绘制

需要画大量图形时（几百个粒子、一张图表、一个手绘板），为每个图形创建一个视图太重了。`Canvas` 提供了一块可以直接用绘图指令绘制的画布：

```swift
struct CanvasBasics: View {
    var body: some View {
        Canvas { context, size in
            // 填充一个矩形
            let rect = CGRect(origin: .zero, size: size)
            context.fill(Path(rect), with: .color(.black))

            // 画 80 个圆
            for index in 0..<80 {
                let t = Double(index) / 80
                let x = size.width * t
                let y = size.height / 2 + sin(t * .pi * 4) * size.height * 0.3
                let radius = 4 + t * 10
                let circle = Path(ellipseIn: CGRect(x: x - radius, y: y - radius, width: radius * 2, height: radius * 2))
                context.fill(circle, with: .color(Color(hue: t, saturation: 0.8, brightness: 1)))
            }

            // 画文字
            context.draw(
                Text("Canvas").font(.title.bold()).foregroundStyle(.white),
                at: CGPoint(x: size.width / 2, y: 24)
            )
        }
        .frame(height: 200)
        .clipShape(.rect(cornerRadius: 16))
        .padding()
    }
}
```

闭包接收两个参数：`context`（`GraphicsContext`，绘图上下文）和 `size`（画布尺寸）。

`GraphicsContext` 的常用操作：

| 操作 | 说明 |
| --- | --- |
| `fill(_:with:)`、`stroke(_:with:lineWidth:)` | 填充、描边一条路径 |
| `draw(_:at:)`、`draw(_:in:)` | 绘制 `Text`、`Image` 或解析过的符号 |
| `translateBy`、`rotate`、`scaleBy` | 变换坐标系 |
| `clip(to:)` | 设置裁剪区域 |
| `opacity`、`blendMode` | 设置后续绘制的不透明度、混合模式 |
| `addFilter(_:)` | 添加滤镜：模糊、阴影、颜色调整等 |
| `drawLayer { }` | 在一个独立图层里绘制，再整体合成 |

`context` 是值类型。修改它的副本不影响原来的上下文，这让“临时变换”很方便：

```swift
struct CanvasTransform: View {
    var body: some View {
        Canvas { context, size in
            let center = CGPoint(x: size.width / 2, y: size.height / 2)
            for index in 0..<12 {
                var petal = context                       // 拷贝一份上下文
                petal.translateBy(x: center.x, y: center.y)
                petal.rotate(by: .degrees(Double(index) * 30))
                let shape = Path(ellipseIn: CGRect(x: -10, y: -70, width: 20, height: 60))
                petal.fill(shape, with: .color(.pink.opacity(0.6)))
            }
        }
        .frame(width: 200, height: 200)
    }
}
```

`Canvas` 和普通视图的区别：

| | 普通视图（`Shape` 等） | `Canvas` |
| --- | --- | --- |
| 每个图形 | 一个独立的视图，有身份、可交互、可单独做动画 | 只是画上去的像素，没有身份 |
| 数量 | 几十个以内很好 | 成千上万个也没问题 |
| 辅助功能 | 每个元素可以有标签 | 整块画布是一个元素，需要手动提供 |
| 交互 | 每个元素可以加手势 | 手势加在整个画布上，自己做命中测试 |

配合 `TimelineView` 可以让 `Canvas` 每帧重绘，做粒子动画，第 29 章会讲。

## 把视图渲染成图片

`ImageRenderer` 可以把任意 SwiftUI 视图渲染成图片或 PDF，用于分享、导出：

```swift
struct ShareCard: View {
    let title: String

    var body: some View {
        VStack {
            Image(systemName: "trophy.fill").font(.system(size: 50)).foregroundStyle(.yellow)
            Text(title).font(.title2.bold())
        }
        .padding(30)
        .background(.blue.gradient, in: .rect(cornerRadius: 24))
        .foregroundStyle(.white)
    }
}

@MainActor
func renderShareCard() -> CGImage? {
    let renderer = ImageRenderer(content: ShareCard(title: "连续学习 30 天"))
    renderer.scale = 3
    return renderer.cgImage
}
```

## 常见误区

**误区一：“`.stroke()` 的边框被裁掉了一半。”** `stroke` 的线条以边缘为中心，一半在外面。用 `.strokeBorder()`。

**误区二：“圆角用 `.cornerRadius()`。”** 这个修饰符已被弃用。用 `.clipShape(.rect(cornerRadius:))`，或者在 `.background(_:in:)` 里直接指定形状。

**误区三：“先加阴影再裁剪，阴影不见了。”** 裁剪会把形状外的阴影一起切掉。先 `clipShape` 再 `shadow`，或者把阴影加在背景形状上。

**误区四：“自定义形状里写死坐标。”** 坐标要相对于传入的 `rect` 计算，形状才能适应各种尺寸。

**误区五：“颜色写死 `.black`、`.white`。”** 深色模式下会出问题。用语义颜色。

**误区六：“画一千个点就用一千个 `Circle()` 视图。”** 用 `Canvas`。

## 小结

- 内置形状有简写形式（`.rect(cornerRadius:)`、`.capsule`、`.circle`），常作为参数传给 `background`、`clipShape` 等。
- `fill` 填充，`strokeBorder` 向内描边，`trim` 只画一段。
- `ShapeStyle` 统一了颜色、渐变、材质和层级样式，能放颜色的地方都能放其他样式。
- 用语义颜色自动适配深色模式；品牌色定义在资源目录里。
- 自定义 `Shape` 实现 `path(in:)`，坐标相对于 `rect`；在默认主 actor 隔离的项目里要标 `nonisolated`。
- `clipShape` 裁剪，`mask` 按不透明度遮罩，`compositingGroup` 把一组视图作为整体处理。
- `Canvas` 用绘图指令直接绘制，适合大量图形。

## 练习

1. 画一个环形进度条组件 `RingProgress(value:lineWidth:)`：灰色底环加彩色进度弧，圆头线帽，中间显示百分比，进度弧用角度渐变。
2. 实现一个 `Star: Shape`，可以指定角的数量和内半径比例。用它做一个五星评分显示。
3. 做一张“玻璃卡片”：背景是 `MeshGradient`，上面一张用 `.ultraThinMaterial` 做背景的卡片，卡片有连续圆角、细白色描边和柔和的阴影。
4. 用 `Canvas` 画一个柱状图：给定一组数值，画出等宽的柱子，柱顶标注数值，底部画一条坐标轴线。

## 官方文档

- [Shapes（专题总览）](https://developer.apple.com/documentation/swiftui/shapes)
- [`Shape` 协议](https://developer.apple.com/documentation/swiftui/shape)
- [`Path`](https://developer.apple.com/documentation/swiftui/path)
- [`InsettableShape`](https://developer.apple.com/documentation/swiftui/insettableshape)
- [`ShapeStyle`](https://developer.apple.com/documentation/swiftui/shapestyle)
- [`Color`](https://developer.apple.com/documentation/swiftui/color)
- [`LinearGradient`](https://developer.apple.com/documentation/swiftui/lineargradient)
- [`MeshGradient`](https://developer.apple.com/documentation/swiftui/meshgradient)
- [`Material`](https://developer.apple.com/documentation/swiftui/material)
- [`ContainerRelativeShape`](https://developer.apple.com/documentation/swiftui/containerrelativeshape)
- [`ConcentricRectangle`](https://developer.apple.com/documentation/swiftui/concentricrectangle)
- [`clipShape(_:style:)`](https://developer.apple.com/documentation/swiftui/view/clipshape(_:style:))
- [`mask(alignment:_:)`](https://developer.apple.com/documentation/swiftui/view/mask(alignment:_:))
- [Drawing and graphics（专题总览）](https://developer.apple.com/documentation/swiftui/drawing-and-graphics)
- [`Canvas`](https://developer.apple.com/documentation/swiftui/canvas)
- [`GraphicsContext`](https://developer.apple.com/documentation/swiftui/graphicscontext)
- [`ImageRenderer`](https://developer.apple.com/documentation/swiftui/imagerenderer)
- [Human Interface Guidelines：Color](https://developer.apple.com/design/human-interface-guidelines/color)
