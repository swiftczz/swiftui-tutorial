import { defineConfig } from 'vitepress'

const sidebar = [
  {
    text: '开始之前',
    items: [{ text: '导读：路线图与环境', link: '/guide/roadmap' }],
  },
  {
    text: '第一部分 · 思维模型',
    collapsed: false,
    items: [
      { text: '01 声明式 UI：换一种想法写界面', link: '/foundations/01-declarative' },
      { text: '02 第一个 App：App、Scene、View', link: '/foundations/02-first-app' },
      { text: '03 View、ViewBuilder 与视图身份', link: '/foundations/03-view-identity' },
      { text: '04 修饰符：顺序、环境与封装', link: '/foundations/04-modifiers' },
    ],
  },
  {
    text: '第二部分 · 布局系统',
    collapsed: false,
    items: [
      { text: '05 布局原理：提议与回应', link: '/layout/05-layout-model' },
      { text: '06 栈、对齐与间距', link: '/layout/06-stacks' },
      { text: '07 网格、懒加载与滚动容器', link: '/layout/07-grids-lazy' },
      { text: '08 自适应布局与自定义 Layout', link: '/layout/08-adaptive' },
    ],
  },
  {
    text: '第三部分 · 状态与数据流',
    collapsed: false,
    items: [
      { text: '09 @State 与 @Binding', link: '/state/09-state-binding' },
      { text: '10 Observation：@Observable 模型', link: '/state/10-observation' },
      { text: '11 环境与偏好：数据的上下游', link: '/state/11-environment' },
      { text: '12 Swift 6 并发与 SwiftUI', link: '/state/12-concurrency' },
      { text: '13 持久化：AppStorage 与 SwiftData', link: '/state/13-persistence' },
    ],
  },
  {
    text: '第四部分 · 组件',
    collapsed: false,
    items: [
      { text: '14 文本、图像与符号', link: '/components/14-text-image' },
      { text: '15 按钮与控件', link: '/components/15-controls' },
      { text: '16 文本输入、焦点与表单', link: '/components/16-input-forms' },
      { text: '17 列表与集合', link: '/components/17-lists' },
      { text: '18 ScrollView 深入', link: '/components/18-scrollview' },
      { text: '19 导航：Stack、Split 与 Tab', link: '/components/19-navigation' },
      { text: '20 模态呈现：sheet、alert 与 popover', link: '/components/20-presentation' },
      { text: '21 工具栏与搜索', link: '/components/21-toolbar-search' },
      { text: '22 形状、绘制与样式', link: '/components/22-shapes-drawing' },
      { text: '23 Liquid Glass 设计语言', link: '/components/23-liquid-glass' },
      { text: '24 手势', link: '/components/24-gestures' },
      { text: '25 系统能力：分享、拖放、照片、地图、图表', link: '/components/25-system-integration' },
    ],
  },
  {
    text: '第五部分 · 动画',
    collapsed: false,
    items: [
      { text: '26 动画原理：状态变化的插值', link: '/animation/26-animation-basics' },
      { text: '27 时间曲线与弹簧', link: '/animation/27-timing-springs' },
      { text: '28 转场与共享元素', link: '/animation/28-transitions' },
      { text: '29 多阶段、关键帧与自定义动画', link: '/animation/29-advanced-animation' },
      { text: '30 特效：滚动、符号、着色器', link: '/animation/30-effects' },
    ],
  },
  {
    text: '第六部分 · 平台与多端统一',
    collapsed: false,
    items: [
      { text: '31 iOS 与 iPadOS 专题', link: '/platforms/31-ios' },
      { text: '32 macOS 专题', link: '/platforms/32-macos' },
      { text: '33 多端统一：一套代码多个平台', link: '/platforms/33-multiplatform' },
    ],
  },
  {
    text: '第七部分 · 工程实践',
    collapsed: false,
    items: [
      { text: '34 架构：视图拆分与状态归属', link: '/engineering/34-architecture' },
      { text: '35 性能与调试', link: '/engineering/35-performance' },
      { text: '36 无障碍与本地化', link: '/engineering/36-accessibility-i18n' },
      { text: '37 综合实战：跨平台笔记 App', link: '/engineering/37-project' },
    ],
  },
  {
    text: '附录',
    collapsed: false,
    items: [
      { text: 'A Swift 6.3 / 6.4 语法变化', link: '/appendix/swift-6-4' },
      { text: 'B API 可用性速查', link: '/appendix/api-availability' },
      { text: 'C 官方资源索引', link: '/appendix/resources' },
    ],
  },
]

export default defineConfig({
  lang: 'zh-CN',
  title: 'SwiftUI 系统教程',
  description: '从零开始系统学习 SwiftUI：组件、布局、状态、动画，覆盖 iOS、macOS 与多端统一，基于 Swift 6.3 / 6.4',
  base: '/swiftui-tutorial/',
  cleanUrls: true,
  lastUpdated: false,
  markdown: {
    lineNumbers: false,
    theme: { light: 'github-light', dark: 'github-dark' },
  },
  themeConfig: {
    nav: [
      { text: '导读', link: '/guide/roadmap' },
      { text: '布局', link: '/layout/05-layout-model' },
      { text: '状态', link: '/state/09-state-binding' },
      { text: '组件', link: '/components/14-text-image' },
      { text: '动画', link: '/animation/26-animation-basics' },
      { text: '多端', link: '/platforms/33-multiplatform' },
      { text: '附录', link: '/appendix/swift-6-4' },
    ],
    sidebar,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/swiftczz/swiftui-tutorial', ariaLabel: 'GitHub 仓库' },
    ],
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一章', next: '下一章' },
    darkModeSwitchLabel: '外观',
    sidebarMenuLabel: '目录',
    returnToTopLabel: '回到顶部',
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到结果',
            resetButtonTitle: '清除',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },
    footer: {
      message: '基于 Swift 6.3 / 6.4 与 Xcode 27 SDK 编写，示例代码均经过编译器类型检查',
    },
  },
})
