# 导读：路线图与环境

你已经学完了 Swift，知道结构体、协议、泛型、闭包、`async/await` 是怎么回事。这门教程从这里接手，带你从零开始把 SwiftUI 学透：不只是会用组件，而是能在动手之前就预测出界面会长什么样、状态变了哪些视图会刷新、动画会怎么走。

## 这门教程想让你得到什么

写 UI 的人大致分两种。一种人记住了很多“配方”：要圆角就 `.clipShape`，要居中就套个 `Spacer`，出了问题就换一种写法再试。另一种人脑子里有模型：知道父视图向子视图提议了多大的尺寸，知道这个 `@State` 属于哪个视图身份，知道这次状态变化被哪个事务包裹。前一种人遇到没见过的需求就卡住，后一种人能推出来。

这门教程的目标是让你成为后一种人。全教程围绕三个模型展开：

| 模型 | 一句话 | 在哪学 |
| --- | --- | --- |
| 声明式渲染 | 界面是状态的函数，`UI = f(State)` | 第一部分 |
| 布局协商 | 父视图提议尺寸，子视图自己决定大小，父视图再摆放 | 第二部分 |
| 数据流 | 每份数据只有一个源头，其他地方要么只读、要么持有绑定 | 第三部分 |

组件（第四部分）是这三个模型的具体应用，动画（第五部分）是“状态变化”在时间上的展开。最后两部分把这些放回真实的平台和工程里。

## 学习路线

```text
第一部分 思维模型      01 声明式 → 02 App 结构 → 03 视图身份 → 04 修饰符
        │
第二部分 布局系统      05 布局原理 → 06 栈与对齐 → 07 网格与懒加载 → 08 自适应
        │
第三部分 状态与数据流  09 State/Binding → 10 Observable → 11 环境 → 12 并发 → 13 持久化
        │
        ├──────────────────────────┐
第四部分 组件（14–25）        第五部分 动画（26–30）
        │                          │
        └──────────┬───────────────┘
第六部分 平台      31 iOS → 32 macOS → 33 多端统一
        │
第七部分 工程      34 架构 → 35 性能 → 36 无障碍与本地化 → 37 综合实战
```

前三部分必须按顺序学，后面的章节都建立在它们之上。第四、第五部分可以交叉着学：学完 14–17 章的基础组件就可以先去看动画，再回来看导航和绘制。

::: tip 建议的节奏
每章大约需要 40–90 分钟。不要只读，每一段代码都在 Xcode 里敲一遍，然后**改一个地方，先猜结果，再看预览**。猜错的地方就是你的模型和真实行为不一致的地方，那正是最值得学的地方。
:::

## 每章的结构

1. **本章目标**：学完能回答哪些问题。
2. **正文**：从一个具体问题出发，中间穿插“想一想”，请你先停下来猜一猜再往下读。
3. **常见误区**：初学者最容易踩的坑，以及为什么会踩。
4. **小结**与**练习**：练习没有标准答案，但都能用本章内容做出来。
5. **官方文档**：对应的 Apple 文档与 WWDC 讲座链接。

## 版本基准

本教程在下面的环境中编写，所有示例代码都用这套工具链做过类型检查：

| 项目 | 版本 |
| --- | --- |
| Xcode | 27.2 |
| Swift | 6.4（编译器 6.4.2） |
| SDK | iOS 27.2、macOS 27.2 |
| 语言模式 | Swift 6 |

Swift 6.3 随 Xcode 26.4 在 2026 年 3 月发布，Swift 6.4 随 Xcode 27 在 2026 年 9 月发布。SwiftUI 本身不随 Swift 版本号走，它跟着操作系统版本走，所以教程里你会同时看到两类版本标记：

- <Badge type="tip" text="iOS 26+ / macOS 26+" /> 这类标记说明一个 **API 需要的最低系统版本**。没有标记的 API 在 iOS 18 / macOS 15 及以上都可用，这是本教程默认的最低部署版本。少数更早就有的 API 也标了版本，方便需要支持旧系统的读者参考。
- <Badge type="warning" text="Swift 6.4" /> 这类标记说明一个**语法或编译器行为**是 Swift 6.4（Xcode 27）才有的。用 Swift 6.3 编译时写法不同的地方，正文会给出两种写法。

所有 6.3 到 6.4 的语法差异汇总在[附录 A](/appendix/swift-6-4)，API 的系统版本要求汇总在[附录 B](/appendix/api-availability)。

::: warning 部署版本与编译版本是两回事
用 Xcode 27 编译，不代表你的 App 只能跑在 iOS 27 上。你可以把最低部署版本设为 iOS 17，然后对新 API 用 `if #available(iOS 26, *)` 做判断。但有些变化只跟**编译器**有关，例如 Xcode 27 把 `@State` 从属性包装器换成了宏，这个变化在所有部署版本上都生效。第 9 章会详细讲。
:::

## 准备环境

### 新建一个多平台项目

1. 打开 Xcode，选择 **File › New › Project…**
2. 顶部选 **Multiplatform**，模板选 **App**。这样得到的一个 target 可以同时编译到 iOS、iPadOS、macOS，后面讲多端统一时会用到。
3. Interface 选 **SwiftUI**，Storage 先选 **None**。

### 确认三项构建设置

选中项目 › 选中 target › **Build Settings**，搜索下面三项：

| 设置项 | 建议值 | 说明 |
| --- | --- | --- |
| Swift Language Version | Swift 6 | 打开完整的数据竞争检查。模板可能默认是 Swift 5，请手动改成 6 |
| Default Actor Isolation | MainActor | 新建 App 项目的默认值。没有特别标注的代码都在主线程上运行 |
| Approachable Concurrency | Yes | 新建 App 项目的默认值。启用一组让并发更容易上手的编译器特性 |

后两项是 Swift 6.2 引入的。它们的意思是：除非你明确要求，否则你的代码都在主 actor 上运行。UI 代码本来就必须在主线程上跑，所以这个默认值让你在学 SwiftUI 的前半程几乎不用想并发的事。第 12 章会把这件事讲清楚。本教程的示例代码都是在这三项设置下检查的。

### 学会用预览

SwiftUI 最好的学习工具是 Xcode 的预览画布（Canvas）。在任何一个 Swift 文件底部写：

```swift
struct HelloView: View {
    var body: some View {
        Text("你好，SwiftUI")
    }
}

#Preview {
    HelloView()
}
```

按 <kbd>⌥ Option</kbd> + <kbd>⌘ Command</kbd> + <kbd>Return</kbd> 打开画布。之后每次保存，画布都会更新。一个文件里可以写多个 `#Preview`，给它们起名字，分别展示不同状态：

```swift
#Preview("默认") {
    HelloView()
}

#Preview("深色模式") {
    HelloView()
        .preferredColorScheme(.dark)
}
```

教程中的代码大多是一个完整的 `View` 结构体，你只要把它粘进文件、在 `#Preview` 里创建它，就能看到效果。

## 关于代码风格的约定

- 示例优先保证**一段代码讲清一件事**，所以数据通常直接写在视图里。真实项目怎么组织，放在第 34 章讲。
- 界面文字用中文，标识符用英文。
- 标了 `iOS` 或 `macOS` 的代码只适用于该平台，没有标的两个平台都能编译。

准备好了就开始第 1 章。第一章不写多少代码，只做一件事：让你换一种方式去想“界面”这个东西。

## 官方文档

- [SwiftUI 框架总览](https://developer.apple.com/documentation/swiftui)
- [SwiftUI 更新记录（按年列出每次发布的新 API）](https://developer.apple.com/documentation/updates/swiftui)
- [Previews in Xcode](https://developer.apple.com/documentation/swiftui/previews-in-xcode)
- [`Preview(_:body:)` 宏](https://developer.apple.com/documentation/swiftui/preview(_:body:))
- [Swift 6.4 发布说明（swift.org）](https://www.swift.org/blog/swift-6.4-released/)
- [Swift 6.3 发布说明（swift.org）](https://www.swift.org/blog/swift-6.3-released/)
- [Apple 官方 SwiftUI 入门教程](https://developer.apple.com/tutorials/swiftui)
