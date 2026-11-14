# SwiftUI 系统教程

从零开始系统学习 SwiftUI：布局、状态与数据流、组件、动画，覆盖 iOS、macOS 与多端统一。以 Swift 6.3 / 6.4 和 Xcode 27 SDK 为基准。

在线阅读：<https://swiftczz.github.io/swiftui-tutorial/>

## 内容

| 部分 | 章节 |
| --- | --- |
| 思维模型 | 01–04：声明式 UI、App 结构、视图身份、修饰符 |
| 布局系统 | 05–08：布局协商、栈与对齐、网格与懒加载、自适应与自定义 Layout |
| 状态与数据流 | 09–13：State/Binding、Observation、环境与偏好、Swift 6 并发、持久化 |
| 组件 | 14–25：文本图像、控件、表单、列表、滚动、导航、模态、工具栏与搜索、绘制、Liquid Glass、手势、系统能力 |
| 动画 | 26–30：动画原理、时间曲线与弹簧、转场与共享元素、多阶段与关键帧、特效 |
| 平台与多端统一 | 31–33：iOS/iPadOS、macOS、一套代码多个平台 |
| 工程实践 | 34–37：架构、性能与调试、无障碍与本地化、综合实战 |
| 附录 | Swift 6.3/6.4 语法变化、API 可用性速查、官方资源索引 |

每章末尾附有对应的 Apple 官方文档与 WWDC 讲座链接。

## 质量保证

- 全部 Swift 示例代码用 Xcode 27.2（Swift 6.4.2）的 iOS 与 macOS SDK 做类型检查，语言模式为 Swift 6，默认主 actor 隔离。
- 全部外部链接经过有效性校验；WWDC 讲座链接核对过标题。
- API 的系统版本要求读取自 Apple 开发者文档。

## 本地开发

```bash
npm install
npm run dev            # 本地预览
npm run build          # 构建静态站点
npm run check:swift    # 检查示例代码（需要 macOS 与 Xcode）
npm run check:links    # 检查外部链接
```

代码块的围栏标记：` ```swift ` 默认在任一平台通过即可；加 `ios` 或 `macos` 只在该平台检查；加 `nocheck` 跳过（伪代码、故意写错的反例、依赖完整 App 的入口）。

推送到 `main` 分支后，GitHub Actions 会自动构建并发布到 GitHub Pages。
