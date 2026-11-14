# 16 文本输入、焦点与表单

## 本章目标

- 掌握 `TextField`、`SecureField`、`TextEditor` 的用法与配置
- 用 `TextField(value:format:)` 直接编辑数字、货币、日期
- 用 `@FocusState` 控制和观察焦点
- 处理键盘：类型、提交、收起、工具栏
- 用 `Form` 组织输入界面，理解它在 iOS 与 macOS 上的差异
- 写出带校验的表单

## TextField

### 基本用法

```swift
struct TextFieldBasics: View {
    @State private var name = ""
    @State private var bio = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            TextField("姓名", text: $name)

            TextField("姓名", text: $name, prompt: Text("请输入真实姓名"))
                .textFieldStyle(.roundedBorder)

            TextField("个人简介", text: $bio, axis: .vertical)
                .lineLimit(2...5)
                .textFieldStyle(.roundedBorder)

            Text("你好，\(name.isEmpty ? "陌生人" : name)")
        }
        .padding()
    }
}
```

- 第一个参数是**标签**，说明这个输入框是什么。在 iOS 上它默认也充当占位文字；在 macOS 的 `Form` 里它显示在输入框左边。
- `prompt:` 单独指定占位文字。同时给了标签和 prompt 时，标签用于辅助功能和 macOS 的表单布局，prompt 显示在输入框里。
- `axis: .vertical` 让输入框随内容纵向增长，配合 `.lineLimit(2...5)` 限制最少和最多行数。这是做“聊天输入框”的标准写法。

| 样式 | 外观 |
| --- | --- |
| `.automatic` | 由上下文决定 |
| `.plain` | 无任何装饰 |
| `.roundedBorder` | 圆角边框 |
| `.squareBorder` | 方角边框（macOS） |
| `.bordered` <Badge type="tip" text="27+" /> | 27 系列新增的带边框样式 |

### 绑定非字符串的值

`TextField` 可以直接绑定数字、日期等类型，自动完成“文字 ↔ 值”的转换和格式化：

```swift
struct FormattedFields: View {
    @State private var age = 18
    @State private var price = 99.9
    @State private var ratio = 0.25
    @State private var name = PersonNameComponents(givenName: "三", familyName: "张")

    var body: some View {
        Form {
            TextField("年龄", value: $age, format: .number)
            TextField("价格", value: $price, format: .currency(code: "CNY"))
            TextField("比例", value: $ratio, format: .percent)
            TextField("姓名", value: $name, format: .name(style: .long))

            Text("年龄 \(age)，价格 \(price)，比例 \(ratio)")
                .font(.caption)
        }
    }
}
```

值会在**提交**（按回车）或**失去焦点**时更新，而不是每敲一个字就更新。输入了无法解析的内容时，值保持不变。

::: warning 数字键盘没有回车键
在 iPhone 上如果配合 `.keyboardType(.decimalPad)` 使用，数字键盘上没有回车键，用户无法“提交”。你需要自己提供一个收起键盘的办法（见后文“键盘工具栏”），否则值不会更新。
:::

### 输入行为的配置

```swift
struct InputConfiguration: View {
    @State private var email = ""
    @State private var username = ""
    @State private var code = ""

    var body: some View {
        Form {
            TextField("电子邮箱", text: $email)
                .textContentType(.emailAddress)
                .autocorrectionDisabled()
                #if os(iOS)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                #endif

            TextField("用户名", text: $username)
                .autocorrectionDisabled()
                #if os(iOS)
                .textInputAutocapitalization(.never)
                #endif

            TextField("验证码", text: $code)
                .textContentType(.oneTimeCode)
                #if os(iOS)
                .keyboardType(.numberPad)
                #endif
        }
    }
}
```

| 修饰符 | 作用 | 平台 |
| --- | --- | --- |
| `.keyboardType(_:)` | 键盘类型：`.emailAddress`、`.numberPad`、`.decimalPad`、`.URL`、`.phonePad` | iOS |
| `.textInputAutocapitalization(_:)` | 自动大写：`.never`、`.words`、`.sentences`、`.characters` | iOS |
| `.autocorrectionDisabled()` | 关闭自动更正 | 全平台 |
| `.textContentType(_:)` | 内容的语义，用于自动填充：`.emailAddress`、`.password`、`.newPassword`、`.oneTimeCode`、`.name` | 全平台 |
| `.submitLabel(_:)` | 回车键上显示的文字：`.done`、`.search`、`.send`、`.next`、`.go` | iOS |

`textContentType` 值得重视。设成 `.oneTimeCode`，短信验证码会自动出现在键盘上方；设成 `.newPassword`，系统会建议强密码；设成 `.emailAddress`，会提示用户保存过的邮箱。这些都是零成本的体验提升。

`keyboardType` 等修饰符只存在于 iOS，所以在多平台代码里要用 `#if os(iOS)` 包起来。这是条件编译的典型用途：API 在另一个平台上根本不存在。

### 响应提交

```swift
struct SubmitDemo: View {
    @State private var query = ""
    @State private var history: [String] = []

    var body: some View {
        VStack(alignment: .leading) {
            TextField("搜索", text: $query)
                .textFieldStyle(.roundedBorder)
                .submitLabel(.search)
                .onSubmit {
                    guard !query.isEmpty else { return }
                    history.insert(query, at: 0)
                    query = ""
                }

            ForEach(history, id: \.self) { Text($0) }
        }
        .padding()
    }
}
```

`.onSubmit` 在用户按回车时触发。它是环境型的，可以加在包含多个输入框的容器上统一处理。

### 限制和过滤输入

SwiftUI 没有“最大长度”这样的属性。按照声明式的思路，在状态变化时修正它：

```swift
struct InputFiltering: View {
    @State private var phone = ""
    @State private var nickname = ""

    var body: some View {
        Form {
            TextField("手机号（仅数字，最多 11 位）", text: $phone)
                .onChange(of: phone) { _, newValue in
                    let filtered = String(newValue.filter(\.isNumber).prefix(11))
                    if filtered != newValue { phone = filtered }
                }

            TextField("昵称（最多 12 字）", text: $nickname)
                .onChange(of: nickname) { _, newValue in
                    if newValue.count > 12 { nickname = String(newValue.prefix(12)) }
                }

            Text("\(nickname.count) / 12")
                .font(.caption)
                .foregroundStyle(nickname.count >= 12 ? .red : .secondary)
        }
    }
}
```

`if filtered != newValue` 这个判断是必要的，避免无意义的重复赋值。

## SecureField

密码输入框，内容显示为圆点：

```swift
struct PasswordField: View {
    @State private var password = ""
    @State private var isRevealed = false

    var body: some View {
        HStack {
            Group {
                if isRevealed {
                    TextField("密码", text: $password)
                } else {
                    SecureField("密码", text: $password)
                }
            }
            .textContentType(.password)
            .autocorrectionDisabled()

            Button {
                isRevealed.toggle()
            } label: {
                Image(systemName: isRevealed ? "eye.slash" : "eye")
            }
            .buttonStyle(.plain)
        }
        .padding(10)
        .background(.quaternary, in: .rect(cornerRadius: 8))
        .padding()
    }
}
```

“显示密码”的功能是在 `TextField` 和 `SecureField` 之间切换。这里用了 `if`，两个输入框是不同的视图身份，切换时焦点会丢失。对这个场景影响不大，但你现在应该能一眼看出这一点了。

## TextEditor

多行的长文本编辑：

```swift
struct TextEditorBasics: View {
    @State private var content = "在这里写点什么……"

    var body: some View {
        VStack(alignment: .trailing) {
            TextEditor(text: $content)
                .font(.body)
                .lineSpacing(4)
                .scrollContentBackground(.hidden)        // 隐藏默认背景，才能自定义背景
                .padding(8)
                .background(.yellow.opacity(0.15), in: .rect(cornerRadius: 10))
                .frame(minHeight: 160)

            Text("\(content.count) 字")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
```

`TextEditor` 没有占位文字。需要的话，用 `overlay` 在内容为空时叠一个 `Text`。

`TextField(axis: .vertical)` 和 `TextEditor` 怎么选：前者适合“几行以内、会随内容长高”的输入（评论、聊天）；后者适合“占据一块固定区域、内部滚动”的长文编辑（笔记正文）。

### 富文本编辑 <Badge type="tip" text="iOS 26+ / macOS 26+" />

从 26 系列开始，`TextEditor` 可以绑定 `AttributedString`，直接支持富文本编辑：粗体、斜体、下划线、颜色、字号等。系统的格式菜单和键盘快捷键（<kbd>⌘B</kbd>、<kbd>⌘I</kbd>）自动可用。

```swift
@available(iOS 26, macOS 26, *)
struct RichTextEditor: View {
    @State private var text = AttributedString("选中一些文字，然后按 ⌘B 试试。")
    @State private var selection = AttributedTextSelection()

    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                Button("粗体", systemImage: "bold") {
                    text.transformAttributes(in: &selection) { container in
                        let current = container.font ?? .default
                        container.font = current.bold()
                    }
                }
                Button("标红", systemImage: "paintbrush") {
                    text.transformAttributes(in: &selection) { container in
                        container.foregroundColor = .red
                    }
                }
            }
            .buttonStyle(.bordered)

            TextEditor(text: $text, selection: $selection)
                .frame(minHeight: 160)
        }
        .padding()
    }
}
```

`selection` 绑定当前的选区，`transformAttributes(in:)` 对选区内的文字修改属性。这是一个较新的 API，完整能力请看章末的官方文档。

## 焦点：@FocusState

“焦点”指当前哪个控件在接收键盘输入。SwiftUI 把焦点也做成了状态：

```swift
struct FocusBasics: View {
    @State private var text = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 16) {
            TextField("点下面的按钮让我获得焦点", text: $text)
                .textFieldStyle(.roundedBorder)
                .focused($isFocused)

            HStack {
                Button("聚焦") { isFocused = true }
                Button("取消聚焦") { isFocused = false }
            }

            Text(isFocused ? "正在输入" : "未聚焦")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
```

`@FocusState` 是双向的：

- **读**它，知道输入框当前是否有焦点
- **写**它，让输入框获得或失去焦点（在 iOS 上就是弹出或收起键盘）

这又一次体现了声明式的思路：没有 `becomeFirstResponder()` 这样的命令，只有“焦点状态是什么”。

### 多个输入框之间切换

多个输入框时，用一个枚举表示“焦点在谁身上”：

```swift
struct LoginForm: View {
    enum Field: Hashable {
        case email, password
    }

    @State private var email = ""
    @State private var password = ""
    @FocusState private var focusedField: Field?

    var body: some View {
        Form {
            TextField("电子邮箱", text: $email)
                .focused($focusedField, equals: .email)
                .submitLabel(.next)
                .textContentType(.emailAddress)

            SecureField("密码", text: $password)
                .focused($focusedField, equals: .password)
                .submitLabel(.go)
                .textContentType(.password)

            Button("登录") { login() }
                .disabled(email.isEmpty || password.isEmpty)
        }
        .onSubmit {
            switch focusedField {
            case .email: focusedField = .password        // 邮箱按回车 → 跳到密码
            case .password: login()                      // 密码按回车 → 登录
            case nil: break
            }
        }
        .onAppear { focusedField = .email }              // 页面出现时自动聚焦
    }

    private func login() {
        focusedField = nil                               // 收起键盘
    }
}
```

`focusedField` 是可选的枚举：`nil` 表示没有任何输入框聚焦。`.focused($focusedField, equals: .email)` 的意思是“当 `focusedField == .email` 时我有焦点；我获得焦点时把它设成 `.email`”。

### 默认焦点与焦点范围

在 macOS、iPad（接键盘时）、tvOS 上，焦点不只属于输入框，按钮、列表也能被聚焦，用 <kbd>Tab</kbd> 键切换。相关工具：

```swift
struct DefaultFocusDemo: View {
    @FocusState private var focused: Int?
    @State private var values = ["", "", ""]

    var body: some View {
        Form {
            ForEach(values.indices, id: \.self) { index in
                TextField("字段 \(index + 1)", text: $values[index])
                    .focused($focused, equals: index)
            }
        }
        .defaultFocus($focused, 1)       // 界面出现时默认聚焦第二个
    }
}
```

`.defaultFocus` 指定一个区域首次获得焦点时落在哪个控件上，比在 `onAppear` 里手动设置更可靠。

`.focusable()` 让任意视图可以获得焦点，`.onKeyPress` 让获得焦点的视图响应按键。这两个在第 32 章讲 macOS 键盘操作时再展开。

## 键盘的处理（iOS）

### 收起键盘

除了设置 `@FocusState` 为 `nil` / `false`，还可以让滚动自动收起键盘：

```swift
struct KeyboardDismiss: View {
    @State private var text = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                TextField("输入后向下滚动试试", text: $text)
                    .textFieldStyle(.roundedBorder)
                ForEach(0..<30, id: \.self) { Text("内容行 \($0)") }
            }
            .padding()
        }
        .scrollDismissesKeyboard(.interactively)
    }
}
```

`.interactively` 让键盘跟着手指下滑；`.immediately` 一开始滚动就收起。`List` 和 `Form` 默认就有合理的行为。

### 键盘工具栏

在键盘上方加一排按钮，解决数字键盘没有回车键的问题：

```swift
struct KeyboardToolbar: View {
    @State private var amount = 0.0
    @FocusState private var isFocused: Bool

    var body: some View {
        Form {
            TextField("金额", value: $amount, format: .number)
                .focused($isFocused)
                #if os(iOS)
                .keyboardType(.decimalPad)
                #endif
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("完成") { isFocused = false }
            }
        }
    }
}
```

### 键盘避让

第 8 章讲过：键盘占据的区域算作安全区域，内容会自动上移。`Form`、`List`、`ScrollView` 会自动滚动，让当前聚焦的输入框保持可见。通常你不需要做任何事。

## Form

`Form` 是专门为“设置”和“数据录入”界面设计的容器。它会根据平台调整里面控件的布局和外观。

```swift
struct ProfileFormDemo: View {
    @State private var name = ""
    @State private var birthday = Date.now
    @State private var gender = 0
    @State private var notify = true
    @State private var frequency = 1.0
    @State private var bio = ""

    var body: some View {
        Form {
            Section("基本信息") {
                TextField("姓名", text: $name)
                DatePicker("生日", selection: $birthday, displayedComponents: .date)
                Picker("性别", selection: $gender) {
                    Text("不透露").tag(0)
                    Text("男").tag(1)
                    Text("女").tag(2)
                }
            }

            Section {
                Toggle("接收通知", isOn: $notify)
                if notify {
                    LabeledContent("每日上限") {
                        Stepper("\(Int(frequency)) 条", value: $frequency, in: 1...20)
                    }
                }
            } header: {
                Text("通知")
            } footer: {
                Text("关闭后你将不会收到任何推送消息。")
            }

            Section("简介") {
                TextEditor(text: $bio)
                    .frame(minHeight: 80)
            }

            Section {
                Button("保存") {}
                Button("注销账号", role: .destructive) {}
            }
        }
    }
}
```

`Section` 把相关的控件分组，可以带 `header` 和 `footer`。

### 平台差异

同一段 `Form` 代码：

| | iOS | macOS |
| --- | --- | --- |
| 整体外观 | 分组的圆角卡片列表，可滚动 | 两列布局：标签右对齐，控件左对齐 |
| `Section` 的 header | 卡片上方的小号灰色文字 | 粗体标题 |
| `Toggle` | 行尾的滑动开关 | 复选框 |
| `Picker` | 行尾显示当前值，点击弹出菜单 | 弹出按钮 |
| `TextField` 的标签 | 占位文字 | 输入框左侧的标签 |

macOS 上如果想要 iOS 那样的分组卡片外观（现代的“系统设置”就是这个风格），加上：

```swift
struct GroupedFormOnMac: View {
    @State private var isOn = true

    var body: some View {
        Form {
            Section("通用") {
                Toggle("启动时打开", isOn: $isOn)
                LabeledContent("版本", value: "1.0")
            }
        }
        .formStyle(.grouped)
    }
}
```

| `formStyle` | 外观 |
| --- | --- |
| `.automatic` | 平台默认 |
| `.grouped` | 分组卡片。iOS 的默认，macOS 上是“系统设置”风格 |
| `.columns` | 标签与控件两列对齐。macOS 的默认 |

## 综合示例：带校验的注册表单

```swift
@Observable
class SignUpModel {
    var email = ""
    var password = ""
    var confirm = ""
    var agreed = false

    var emailError: String? {
        guard !email.isEmpty else { return nil }
        return email.contains("@") && email.contains(".") ? nil : "邮箱格式不正确"
    }

    var passwordError: String? {
        guard !password.isEmpty else { return nil }
        return password.count >= 8 ? nil : "密码至少 8 位"
    }

    var confirmError: String? {
        guard !confirm.isEmpty else { return nil }
        return confirm == password ? nil : "两次输入的密码不一致"
    }

    var canSubmit: Bool {
        !email.isEmpty && !password.isEmpty && !confirm.isEmpty
            && emailError == nil && passwordError == nil && confirmError == nil
            && agreed
    }
}

struct SignUpForm: View {
    enum Field: Hashable { case email, password, confirm }

    @State private var model = SignUpModel()
    @FocusState private var focus: Field?

    var body: some View {
        Form {
            Section {
                TextField("电子邮箱", text: $model.email)
                    .focused($focus, equals: .email)
                    .textContentType(.emailAddress)
                    .autocorrectionDisabled()
                    .submitLabel(.next)
                errorText(model.emailError)

                SecureField("密码", text: $model.password)
                    .focused($focus, equals: .password)
                    .textContentType(.newPassword)
                    .submitLabel(.next)
                errorText(model.passwordError)

                SecureField("确认密码", text: $model.confirm)
                    .focused($focus, equals: .confirm)
                    .textContentType(.newPassword)
                    .submitLabel(.done)
                errorText(model.confirmError)
            }

            Section {
                Toggle("我已阅读并同意服务条款", isOn: $model.agreed)
            }

            Section {
                Button("注册") { focus = nil }
                    .disabled(!model.canSubmit)
            }
        }
        .onSubmit {
            switch focus {
            case .email: focus = .password
            case .password: focus = .confirm
            default: focus = nil
            }
        }
    }

    @ViewBuilder
    private func errorText(_ message: String?) -> some View {
        if let message {
            Label(message, systemImage: "exclamationmark.circle")
                .font(.caption)
                .foregroundStyle(.red)
        }
    }
}
```

留意这个例子的结构，它用到了前面几章的多个原则：

- **校验结果是派生值**（计算属性），不是状态。没有“邮箱是否有效”的存储属性，也就不存在它和 `email` 不同步的可能。
- **按钮是否可用也是派生值** `canSubmit`。
- **校验逻辑在模型里**，不在视图里。这样可以单独测试。
- 空输入不显示错误，避免用户一打开页面就看到一片红。

## 常见误区

**误区一：“用 `onChange` 在每次输入时把校验结果写进另一个状态。”** 校验结果是输入的派生值，用计算属性。

**误区二：“`TextField(value:format:)` 输入时值没变。”** 它在提交或失去焦点时才更新。数字键盘没有回车键，需要提供收起键盘的方式。

**误区三：“在 `onAppear` 里设置焦点不生效。”** 有时视图还没完全就绪。改用 `.defaultFocus`，或者在 `.task` 里设置。

**误区四：“`TextEditor` 加了背景色看不到。”** 它有自己的默认背景。先加 `.scrollContentBackground(.hidden)`。

**误区五：“iOS 专有的修饰符导致 macOS 编译失败。”** `keyboardType`、`textInputAutocapitalization` 只存在于 iOS，多平台代码里用 `#if os(iOS)` 包住。

## 小结

- `TextField` 绑定字符串，也可以用 `value:format:` 直接绑定数字等类型；`axis: .vertical` 支持多行增长。
- `textContentType`、`keyboardType`、`submitLabel` 等修饰符配置输入行为；`onSubmit` 响应回车。
- `SecureField` 用于密码，`TextEditor` 用于长文本，26 系列起支持 `AttributedString` 富文本。
- `@FocusState` 把焦点变成可读可写的状态；多个输入框用可选枚举表示焦点位置。
- `Form` 根据平台自动调整控件布局；`formStyle(.grouped)` 可以在 macOS 上得到分组卡片外观。
- 校验结果和按钮可用性都是派生值，放在模型的计算属性里。

## 练习

1. 做一个聊天输入栏：一个会随内容增高（1 到 5 行）的输入框，右边一个发送按钮（内容为空时禁用）。发送后清空输入框并保持焦点。
2. 做一个四位验证码输入界面：四个方框，每输入一位自动跳到下一个，四位输完自动收起键盘。（提示：四个 `TextField` + 一个 `@FocusState` 枚举，或一个隐藏的 `TextField` + 四个显示用的方框。）
3. 做一个转账表单：收款人、金额（`value:format:`，货币格式）、备注。金额为 0 或超过余额时显示错误并禁用提交按钮。
4. 把 `ProfileFormDemo` 分别用 `.formStyle(.grouped)` 和 `.formStyle(.columns)` 在 macOS 预览里查看，描述它们的差别。

## 官方文档

- [`TextField`](https://developer.apple.com/documentation/swiftui/textfield)
- [`SecureField`](https://developer.apple.com/documentation/swiftui/securefield)
- [`TextEditor`](https://developer.apple.com/documentation/swiftui/texteditor)
- [Text input and output（专题总览）](https://developer.apple.com/documentation/swiftui/text-input-and-output)
- [Building rich SwiftUI text experiences](https://developer.apple.com/documentation/swiftui/building-rich-swiftui-text-experiences)
- [`FocusState`](https://developer.apple.com/documentation/swiftui/focusstate)
- [Focus（专题总览）](https://developer.apple.com/documentation/swiftui/focus)
- [`focused(_:equals:)`](https://developer.apple.com/documentation/swiftui/view/focused(_:equals:))
- [`onSubmit(of:_:)`](https://developer.apple.com/documentation/swiftui/view/onsubmit(of:_:))
- [`submitLabel(_:)`](https://developer.apple.com/documentation/swiftui/view/submitlabel(_:))
- [`textContentType(_:)`](https://developer.apple.com/documentation/swiftui/view/textcontenttype(_:))
- [`scrollDismissesKeyboard(_:)`](https://developer.apple.com/documentation/swiftui/view/scrolldismisseskeyboard(_:))
- [`Form`](https://developer.apple.com/documentation/swiftui/form)
- [`FormStyle`](https://developer.apple.com/documentation/swiftui/formstyle)
- [WWDC25：Code-along: Cook up a rich text experience in SwiftUI with AttributedString](https://developer.apple.com/videos/play/wwdc2025/280/)
