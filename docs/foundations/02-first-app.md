# 02 第一个 App：App、Scene、View

## 本章目标

- 读懂 Xcode 模板生成的每一行代码
- 理解 App、Scene、View 三层结构各自负责什么
- 知道同一个 `WindowGroup` 在 iOS 和 macOS 上的表现有何不同
- 会用 `scenePhase` 感知 App 的前后台切换
- 熟练使用 `#Preview`

## 模板里有什么

按[导读](/guide/roadmap#准备环境)新建一个 Multiplatform App 项目，取名 `Hello`。Xcode 会生成两个 Swift 文件。

`HelloApp.swift`：

```swift nocheck
import SwiftUI

@main
struct HelloApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

`ContentView.swift`：

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Hello, world!")
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
```

一共不到三十行，但 SwiftUI 的三层结构都在这里了：

```text
App（应用）          HelloApp        —— 整个程序的入口，只有一个
 └─ Scene（场景）    WindowGroup     —— 一块由系统管理的界面区域，比如一个窗口
     └─ View（视图） ContentView     —— 场景里显示的内容
         └─ View     VStack、Image、Text ……
```

这三层的写法惊人地一致：都是一个结构体，都遵循一个协议，都有一个叫 `body` 的计算属性。区别只在 `body` 的返回类型：`App` 的 `body` 返回 `some Scene`，`View` 的 `body` 返回 `some View`。学会了一层，另外两层就都会了。

## App：程序的入口

```swift nocheck
@main
struct HelloApp: App {
    var body: some Scene { ... }
}
```

**`@main`** 是 Swift 的语言特性，标记程序的入口点。你学 Swift 时可能写过带 `static func main()` 的类型，`App` 协议已经提供了这个 `main()` 的默认实现，它会启动应用、建立事件循环、创建你声明的场景。一个 target 里只能有一个 `@main`。

**`App` 协议**只有一个必须实现的要求：`body`。它描述“这个应用由哪些场景组成”。

`App` 结构体在整个应用生命周期里只存在一个，所以它是放**全局状态**的好地方，例如整个应用共享的数据模型。第 10 章会用到这一点。

## Scene：系统管理的界面容器

场景这个概念对新手来说最陌生。可以这样理解：**视图是你画的内容，场景是系统为这些内容提供的“画框”**，画框怎么出现、怎么关闭、能不能有多个，由系统按照各平台的规矩来管理。

SwiftUI 内置了几种场景：

| 场景 | 用途 | 平台 |
| --- | --- | --- |
| `WindowGroup` | 应用的主界面。可以有多个实例 | 全平台 |
| `Window` | 一个唯一的窗口，例如“关于”窗口 | macOS、iPadOS、visionOS |
| `DocumentGroup` | 基于文档的应用（打开、保存文件） | iOS、macOS |
| `Settings` | 设置窗口，自动挂到“设置…”菜单项 | macOS |
| `MenuBarExtra` | 系统菜单栏右侧的图标及其菜单 | macOS |
| `UtilityWindow` | 浮动的工具面板 | macOS |

现在只需要认识 `WindowGroup`，其余的在第 32 章讲 macOS 时再展开。

### 同一个 WindowGroup，不同的表现

`WindowGroup` 是 SwiftUI“多端统一”思想的第一个例子。你只声明了“我有一组窗口，内容是 `ContentView`”，各个平台按自己的方式去实现它：

| 平台 | `WindowGroup` 的表现 |
| --- | --- |
| iPhone | 一个全屏界面 |
| iPad | 一个窗口；用户可以再开出多个窗口并排或层叠 |
| Mac | 一个标准窗口；<kbd>⌘N</kbd> 可以再开新窗口，自动出现在“窗口”菜单里，支持标签页合并 |

名字里的 **Group** 正是这个意思：它不是“一个窗口”，而是“一类可以有多个实例的窗口”。每个实例都有自己独立的一份视图状态。在 Mac 上运行模板项目，按几次 <kbd>⌘N</kbd> 试试。

::: info 想一想
如果 `ContentView` 里有一个 `@State private var count = 0` 的计数器，在 Mac 上开两个窗口，在第一个窗口里点“加一”，第二个窗口的数字会变吗？
:::

不会。每个窗口实例有一份独立的 `ContentView` 状态。如果想让两个窗口共享数据，数据就得放在比窗口更高的层级，也就是 `App` 里。这是“状态应该放在哪一层”这个问题的第一次出现，它会在后面反复出现。

### 一个应用可以有多个场景

`App.body` 里可以声明多个场景。下面这个例子在 Mac 上会多出一个设置窗口，在 iOS 上则只有主界面：

```swift nocheck
@main
struct HelloApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }

        #if os(macOS)
        Settings {
            Text("这里是设置")
                .padding(40)
        }
        #endif
    }
}
```

`#if os(macOS)` 是条件编译：这段代码只在编译 macOS 版本时存在。因为 `Settings` 场景在 iOS 上根本不存在，所以这里必须用条件编译。第 33 章会系统地讲什么时候该用它、什么时候不该用。

## View：界面的内容

```swift
struct GreetingView: View {
    var body: some View {
        VStack {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Hello, world!")
        }
        .padding()
    }
}
```

逐行读：

- `struct GreetingView: View`：视图是遵循 `View` 协议的**结构体**。上一章说过，它是轻量的描述。
- `var body: some View`：`View` 协议唯一的要求。`some View` 是不透明类型（opaque type），意思是“我返回某个确定的、遵循 `View` 的类型，具体是什么让编译器去推断”。下一章解释为什么需要它。
- `VStack { ... }`：一个容器视图，把里面的子视图竖着排列。花括号是一个尾随闭包。
- `Image(systemName: "globe")`：显示一个 SF Symbols 系统图标。
- `.imageScale(.large)`、`.foregroundStyle(.tint)`、`.padding()`：这些“点方法”叫**修饰符**（modifier）。每个修饰符返回一个包了一层的新视图。第 4 章专门讲。
- `Text("Hello, world!")`：显示文字。

### 组合：用小视图拼大视图

SwiftUI 构建界面的方式只有一种：**组合**。你写的 `GreetingView` 和系统提供的 `Text` 地位完全相同，可以放在任何能放视图的地方：

```swift
struct WelcomeScreen: View {
    var body: some View {
        VStack(spacing: 24) {
            GreetingView()
            GreetingView()
            Text("两个问候")
                .font(.caption)
        }
    }
}
```

视图可以接收参数，就是普通的结构体属性：

```swift
struct Greeting: View {
    let name: String
    var symbol = "hand.wave"

    var body: some View {
        Label("你好，\(name)", systemImage: symbol)
            .font(.title2)
    }
}

struct GreetingList: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Greeting(name: "小明")
            Greeting(name: "小红", symbol: "star")
        }
        .padding()
    }
}
```

`Greeting(name: "小明")` 用的是结构体自动生成的成员初始化器，你不需要写 `init`。这就是 SwiftUI 里“自定义组件”的全部：一个带属性的结构体。

::: tip 什么时候拆出一个新视图
只要一段界面有了一个说得出口的名字（“头像行”“价格标签”“空状态提示”），就可以拆成一个独立的 `View`。拆分几乎没有运行时成本，而且还有一个重要的性能好处：SwiftUI 以视图为单位追踪依赖，视图拆得细，状态变化时需要重新计算的范围就小。第 35 章会细讲。
:::

## 感知应用状态：scenePhase

应用会在前台、后台之间切换。SwiftUI 把这个状态放在**环境**里，用 `@Environment` 读取：

```swift
struct PhaseDemo: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var log: [String] = []

    var body: some View {
        List(log, id: \.self) { line in
            Text(line)
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            log.append("\(oldPhase) → \(newPhase)")
        }
    }
}
```

`scenePhase` 有三个值：

| 值 | 含义 |
| --- | --- |
| `.active` | 场景在前台，可以交互 |
| `.inactive` | 场景可见但不能交互，例如 iOS 上拉出了多任务切换器 |
| `.background` | 场景不可见。适合在这里保存数据 |

这里出现了两个新东西，先混个脸熟：

- `@Environment(\.scenePhase)`：从环境里读一个值。环境是沿视图树向下传递的一组共享数据，第 11 章详细讲。
- `.onChange(of:)`：当某个值变化时执行一段代码。这是放**副作用**的正确位置之一，上一章说过副作用不能放在 `body` 的计算过程里。

在 `App` 里读 `scenePhase` 得到的是所有场景的汇总状态，在 `View` 里读到的是该视图所在场景的状态。

## 预览：#Preview

`#Preview` 是一个宏，它不影响应用本身，只告诉 Xcode“画布上请显示这个”。

```swift
#Preview("基础") {
    Greeting(name: "预览")
}

#Preview("大字号", traits: .sizeThatFitsLayout) {
    Greeting(name: "预览")
        .dynamicTypeSize(.accessibility2)
        .padding()
}
```

常用技巧：

- 给预览起名字，画布上方会出现对应的标签页。
- `traits:` 可以指定预览的呈现方式，例如 `.sizeThatFitsLayout` 让画布只显示视图本身的大小，`.landscapeLeft` 横屏显示。
- 在预览里可以直接套修饰符模拟各种环境：`.preferredColorScheme(.dark)` 深色模式、`.environment(\.locale, Locale(identifier: "en"))` 英文环境、`.dynamicTypeSize(...)` 大字号。
- 多平台项目里，画布底部可以切换运行目标，在 iPhone、iPad、Mac 之间切换查看同一个视图。

如果预览里需要可以交互的状态，用 `@Previewable`：

```swift
#Preview("可交互") {
    @Previewable @State var isOn = false

    Toggle("开关", isOn: $isOn)
        .padding()
}
```

`@Previewable` <Badge type="tip" text="iOS 18+ / macOS 15+ 的 SDK" /> 让你在预览闭包里直接声明 `@State`，不必为了预览专门写一个包装视图。

## 项目里的其他东西

| 文件 | 作用 |
| --- | --- |
| `Assets.xcassets` | 资源目录：图片、颜色、App 图标。里面的 `AccentColor` 决定全局强调色，也就是 `.tint` 的默认值 |
| `Hello.entitlements` | 权限声明。macOS 的 App Sandbox 开关在这里 |
| Target › Info | 应用的元信息：名称、版本、权限说明文字等 |
| Target › General › Supported Destinations | 这个 target 支持哪些平台 |

## 常见误区

**误区一：“`WindowGroup` 就是一个窗口。”** 它是一类窗口的模板。在 Mac 和 iPad 上用户可以开出多个实例，每个实例状态独立。

**误区二：“`body` 是一个方法，我可以调用它。”** 你从不调用 `body`，SwiftUI 在它认为需要的时候调用。你的职责只是保证它根据当前状态返回正确的描述。

**误区三：“要自定义组件得继承某个基类。”** SwiftUI 里没有继承。一切都是结构体加协议，复用靠组合。

## 小结

- SwiftUI 应用是三层结构：`App` 包含 `Scene`，`Scene` 包含 `View`。三层都是“结构体 + 协议 + `body`”。
- `@main` 标记入口，`App` 协议提供启动逻辑。
- 场景是系统管理的界面容器。`WindowGroup` 在不同平台有不同表现，这是多端统一的基础。
- 视图通过组合构建，自定义视图就是带属性的结构体。
- `scenePhase` 反映前后台状态，`.onChange` 是放副作用的地方。
- `#Preview` 是最重要的学习与开发工具。

## 练习

1. 写一个 `ProfileCard` 视图，接收 `name` 和 `title` 两个字符串，上下排列显示。在 `ContentView` 里放三个不同内容的 `ProfileCard`。
2. 为 `ProfileCard` 写三个 `#Preview`：默认、深色模式、超大字号。观察哪里的布局出了问题（先别修，记下来）。
3. 在 Mac 上运行，开三个窗口，观察“窗口”菜单的变化。然后把 `WindowGroup` 改成 `Window("主窗口", id: "main")`，再试一次 <kbd>⌘N</kbd>，有什么不同？

## 官方文档

- [`App` 协议](https://developer.apple.com/documentation/swiftui/app)
- [`Scene` 协议](https://developer.apple.com/documentation/swiftui/scene)
- [`WindowGroup`](https://developer.apple.com/documentation/swiftui/windowgroup)
- [`Window`](https://developer.apple.com/documentation/swiftui/window)
- [`Settings`](https://developer.apple.com/documentation/swiftui/settings)
- [`ScenePhase`](https://developer.apple.com/documentation/swiftui/scenephase)
- [App organization（应用结构总览）](https://developer.apple.com/documentation/swiftui/app-organization)
- [Scenes（场景总览）](https://developer.apple.com/documentation/swiftui/scenes)
- [`Previewable()` 宏](https://developer.apple.com/documentation/swiftui/previewable())
- [Previews in Xcode](https://developer.apple.com/documentation/swiftui/previews-in-xcode)
