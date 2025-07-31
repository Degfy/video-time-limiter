# 多语言支持 / Multilingual Support

## 概述 / Overview

视频时长限制器现在支持中文和英语两种语言。扩展会自动检测浏览器语言并设置相应的界面语言，用户也可以手动切换语言。

The Video Time Limiter now supports both Chinese and English. The extension automatically detects the browser language and sets the interface language accordingly. Users can also manually switch languages.

## 支持的语言 / Supported Languages

- 中文 (简体) / Chinese (Simplified) - `zh-CN`
- English (US) - `en-US`

## 功能特性 / Features

### 自动语言检测 / Automatic Language Detection
- 扩展首次安装时会自动检测浏览器语言
- 支持的语言会自动设置，不支持的语言默认使用中文
- The extension automatically detects browser language on first installation
- Supported languages are set automatically, unsupported languages default to Chinese

### 手动语言切换 / Manual Language Switching
- 在弹窗界面右上角有语言选择器
- 切换语言后立即生效，无需重启扩展
- Language selector is located in the top-right corner of the popup
- Language changes take effect immediately without restarting the extension

### 多语言界面 / Multilingual Interface
- 弹窗设置界面完全本地化
- 警告提示消息支持多语言
- 时间格式根据语言自动调整
- Popup settings interface is fully localized
- Warning messages support multiple languages
- Time format adjusts automatically based on language

## 技术实现 / Technical Implementation

### 文件结构 / File Structure
```
limiter/
├── i18n.js                    # 国际化核心模块 / I18n core module
├── _locales/                  # Chrome扩展国际化目录 / Chrome extension i18n directory
│   ├── zh_CN/
│   │   └── messages.json      # 中文消息文件 / Chinese messages
│   └── en_US/
│       └── messages.json      # 英文消息文件 / English messages
├── popup.html                 # 带有i18n属性的界面 / Interface with i18n attributes
├── popup.js                   # 集成国际化功能 / Integrated i18n functionality
├── content.js                 # 支持多语言警告 / Multilingual warning support
└── background.js              # 语言设置存储 / Language settings storage
```

### 核心组件 / Core Components

#### 1. i18n.js 模块 / i18n.js Module
- 提供完整的国际化API
- 支持语言检测、切换和消息获取
- 包含时间格式化功能
- Provides complete internationalization API
- Supports language detection, switching, and message retrieval
- Includes time formatting functionality

#### 2. HTML属性标记 / HTML Attribute Marking
- 使用 `data-i18n` 属性标记需要翻译的文本
- 使用 `data-i18n-placeholder` 属性标记输入框占位符
- Use `data-i18n` attribute to mark text that needs translation
- Use `data-i18n-placeholder` attribute to mark input placeholders

#### 3. 动态文本更新 / Dynamic Text Updates
- 语言切换时自动更新所有界面文本
- 保持用户输入的数据不变
- Automatically updates all interface text when switching languages
- Preserves user input data

## 使用方法 / Usage

### 用户操作 / User Operations
1. 打开扩展弹窗
2. 在右上角选择语言
3. 界面立即切换到选定语言
4. 设置会自动保存

1. Open extension popup
2. Select language in the top-right corner
3. Interface immediately switches to selected language
4. Settings are automatically saved

### 开发者扩展 / Developer Extension

#### 添加新语言 / Adding New Languages
1. 在 `i18n.js` 的 `MESSAGES` 对象中添加新语言
2. 在 `_locales/` 目录下创建对应的语言文件夹
3. 更新 `SUPPORTED_LANGUAGES` 数组

1. Add new language to `MESSAGES` object in `i18n.js`
2. Create corresponding language folder in `_locales/` directory
3. Update `SUPPORTED_LANGUAGES` array

#### 添加新的翻译文本 / Adding New Translation Text
1. 在 `i18n.js` 的各语言消息中添加新键值
2. 在HTML中使用 `data-i18n` 属性引用
3. 在JavaScript中使用 `I18n.getMessage()` 获取

1. Add new key-value pairs to language messages in `i18n.js`
2. Reference using `data-i18n` attribute in HTML
3. Use `I18n.getMessage()` to retrieve in JavaScript

## API 参考 / API Reference

### I18n 对象方法 / I18n Object Methods

```javascript
// 初始化语言设置 / Initialize language settings
await I18n.initLanguage()

// 获取当前语言 / Get current language
const currentLang = I18n.getCurrentLanguage()

// 设置语言 / Set language
await I18n.setLanguage('en-US')

// 获取翻译消息 / Get translated message
const message = I18n.getMessage('key', ...args)

// 格式化时间显示 / Format time display
const timeText = I18n.formatTime(milliseconds)

// 获取支持的语言列表 / Get supported languages list
const languages = I18n.getSupportedLanguages()

// 获取语言显示名称 / Get language display name
const displayName = I18n.getLanguageDisplayName('zh-CN')
```

## 注意事项 / Notes

1. 语言设置存储在 Chrome 扩展的本地存储中
2. 切换语言不会影响已保存的用户数据
3. 时间格式会根据语言自动调整
4. 警告消息支持自定义内容的多语言显示

1. Language settings are stored in Chrome extension local storage
2. Switching languages does not affect saved user data
3. Time format adjusts automatically based on language
4. Warning messages support multilingual display of custom content

## 故障排除 / Troubleshooting

### 常见问题 / Common Issues

**Q: 语言切换后部分文本没有更新？**
A: 检查HTML元素是否正确添加了 `data-i18n` 属性。

**Q: Language switching doesn't update some text?**
A: Check if HTML elements have correctly added `data-i18n` attributes.

**Q: 自定义消息不支持多语言？**
A: 自定义消息由用户输入，不会自动翻译。建议用户根据需要输入对应语言的内容。

**Q: Custom messages don't support multiple languages?**
A: Custom messages are user input and won't be automatically translated. Users should input content in their preferred language.

**Q: 扩展名称在浏览器中显示不正确？**
A: 确保 `_locales` 目录结构正确，并且 `messages.json` 文件格式正确。

**Q: Extension name displays incorrectly in browser?**
A: Ensure `_locales` directory structure is correct and `messages.json` files are properly formatted.