// 国际化支持模块
// Internationalization support module

(function() {
  'use strict';

  // 支持的语言
  const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US'];
  
  // 默认语言
  const DEFAULT_LANGUAGE = 'zh-CN';
  
  // 语言包
  const MESSAGES = {
    'zh-CN': {
      // 扩展基本信息
      extensionName: '视频时长限制器',
      extensionDescription: '记录视频播放时长，超过设置值时弹出警告',
      extensionTitle: '视频时长限制器',
      
      // 弹窗界面
      popupTitle: '视频时长限制器',
      popupSubtitle: '管理您的视频观看时间',
      
      // 统计信息
      todayWatchTime: '今日观看时长',
      timeLimit: '限制',
      minutes: '分钟',
      hours: '小时',
      
      // 模式切换
      localMode: '本地模式',
      remoteMode: '远程模式',
      
      // 表单标签
      dailyTimeLimit: '每日观看时间限制',
      timeLimitPlaceholder: '例如: 30m, 1h30m, 01:30:00',
      serverUrl: '服务器接口地址',
      serverUrlPlaceholder: 'http://localhost:8080',
      serverUrlExample: '示例: http://localhost:8080 或 https://your-server.com',
      userId: '用户ID',
      customUserId: '输入自定义用户ID（可选）',
      customMessage: '自定义提示内容',
      customMessagePlaceholder: '当超过时间限制时显示的提示信息',
      
      // 按钮
      saveSettings: '保存设置',
      checkServer: '检查',
      copyId: '复制ID',
      editId: '编辑',
      regenerateId: '重新生成',
      
      // 时间预设
      timePreset5min: '5分钟',
      timePreset30min: '30分钟',
      timePreset1hour: '1小时',
      timePreset2hours: '2小时',
      timePreset3hours: '3小时',
      
      // 服务器状态
      serverStatus: '服务器状态',
      serverConnected: '已连接',
      serverDisconnected: '未连接',
      serverChecking: '检查中',
      serverUnknown: '未知',
      serverOnline: '服务器在线',
      serverOffline: '服务器离线',
      serverPartial: '部分功能可用',
      
      // 消息提示
      settingsSaved: '设置已保存',
      settingsSaveError: '保存设置失败',
      serverCheckSuccess: '服务器连接正常',
      serverCheckError: '服务器连接失败',
      userIdCopied: '用户ID已复制到剪贴板',
      userIdCopyError: '复制失败',
      userIdRegenerated: '用户ID已重新生成',
      configLoadError: '加载配置失败',
      
      // 警告消息
      defaultWarningMessage: '您今日的视频观看时间已超过限制！请适当休息。',
      
      // 页脚
      footerText: '视频时长限制器 v1.0',
      
      // 加载状态
      loading: '加载中...',
      
      // 时间格式
      formatMinutes: '{0}分钟',
      formatHours: '{0}小时',
      formatHoursMinutes: '{0}小时{1}分钟',
      
      // 额外的消息
      invalidTimeLimit: '请输入有效的时间限制',
      serverUrlRequired: '远程模式下请输入服务器地址',
      invalidServerUrl: '请输入有效的服务器地址',
      confirmRegenerateUserId: '确定要重新生成用户ID吗？这将清空当前的观看记录。',
      userIdRegenerateError: '重新生成失败',
      edit: '编辑',
      cancel: '取消',
      userIdRequired: '用户ID不能为空',
      userIdUpdated: '用户ID已更新',
      userIdUpdateError: '更新失败',
      serverNotConfigured: '未配置',
      checkingServerStatus: '正在检查服务器状态...',
      checking: '检查中...',
      checkFailed: '检查失败',
      saving: '保存中...'
    },
    
    'en-US': {
      // Extension basic info
      extensionName: 'Video Time Limiter',
      extensionDescription: 'Track video watching time and show warnings when limit exceeded',
      extensionTitle: 'Video Time Limiter',
      
      // Popup interface
      popupTitle: 'Video Time Limiter',
      popupSubtitle: 'Manage Your Video Watching Time',
      
      // Statistics
      todayWatchTime: 'Today\'s Watch Time',
      timeLimit: 'Limit',
      minutes: 'minutes',
      hours: 'hours',
      
      // Mode switch
      localMode: 'Local Mode',
      remoteMode: 'Remote Mode',
      
      // Form labels
      dailyTimeLimit: 'Daily Watch Time Limit',
      timeLimitPlaceholder: 'e.g.: 30m, 1h30m, 01:30:00',
      serverUrl: 'Server API URL',
      serverUrlPlaceholder: 'http://localhost:8080',
      serverUrlExample: 'Example: http://localhost:8080 or https://your-server.com',
      userId: 'User ID',
      customUserId: 'Enter custom User ID (optional)',
      customMessage: 'Custom Warning Message',
      customMessagePlaceholder: 'Message to show when time limit is exceeded',
      
      // Buttons
      saveSettings: 'Save Settings',
      checkServer: 'Check',
      copyId: 'Copy ID',
      editId: 'Edit',
      regenerateId: 'Regenerate',
      
      // Time presets
      timePreset5min: '5 min',
      timePreset30min: '30 min',
      timePreset1hour: '1 hour',
      timePreset2hours: '2 hours',
      timePreset3hours: '3 hours',
      
      // Server status
      serverStatus: 'Server Status',
      serverConnected: 'Connected',
      serverDisconnected: 'Disconnected',
      serverChecking: 'Checking',
      serverUnknown: 'Unknown',
      serverOnline: 'Server Online',
      serverOffline: 'Server Offline',
      serverPartial: 'Partial Features Available',
      
      // Message prompts
      settingsSaved: 'Settings saved successfully',
      settingsSaveError: 'Failed to save settings',
      serverCheckSuccess: 'Server connection successful',
      serverCheckError: 'Server connection failed',
      userIdCopied: 'User ID copied to clipboard',
      userIdCopyError: 'Copy failed',
      userIdRegenerated: 'User ID regenerated',
      configLoadError: 'Failed to load configuration',
      
      // Warning messages
      defaultWarningMessage: 'Your daily video watching time has exceeded the limit! Please take a break.',
      
      // Footer
      footerText: 'Video Time Limiter v1.0',
      
      // Loading state
      loading: 'Loading...',
      
      // 时间格式
      formatMinutes: '{0} minutes',
      formatHours: '{0} hours',
      formatHoursMinutes: '{0} hours {1} minutes',
      
      // 额外的消息
      invalidTimeLimit: 'Please enter a valid time limit',
      serverUrlRequired: 'Please enter server URL in remote mode',
      invalidServerUrl: 'Please enter a valid server URL',
      confirmRegenerateUserId: 'Are you sure you want to regenerate the User ID? This will clear current watch records.',
      userIdRegenerateError: 'Regeneration failed',
      edit: 'Edit',
      cancel: 'Cancel',
      userIdRequired: 'User ID cannot be empty',
      userIdUpdated: 'User ID updated',
      userIdUpdateError: 'Update failed',
      serverNotConfigured: 'Not configured',
      checkingServerStatus: 'Checking server status...',
      checking: 'Checking...',
      checkFailed: 'Check failed',
      saving: 'Saving...'
    }
  };
  
  // 当前语言
  let currentLanguage = DEFAULT_LANGUAGE;
  
  // 初始化语言设置
  async function initLanguage() {
    try {
      // 检查是否在Chrome扩展环境中
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        // 从存储中获取用户设置的语言
        const result = await chrome.storage.local.get(['language']);
        if (result.language && SUPPORTED_LANGUAGES.includes(result.language)) {
          currentLanguage = result.language;
        } else {
          // 如果没有设置，尝试从浏览器语言检测
          const browserLang = detectBrowserLanguage();
          currentLanguage = browserLang;
          // 保存检测到的语言
          await chrome.storage.local.set({ language: currentLanguage });
        }
      } else {
        // 非扩展环境，从localStorage获取或使用浏览器语言
        const savedLang = localStorage.getItem('video-limiter-language');
        if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
          currentLanguage = savedLang;
        } else {
          const browserLang = detectBrowserLanguage();
          currentLanguage = browserLang;
          localStorage.setItem('video-limiter-language', currentLanguage);
        }
      }
    } catch (error) {
      console.error('Failed to initialize language:', error);
      currentLanguage = DEFAULT_LANGUAGE;
    }
  }
  
  // 检测浏览器语言
  function detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    
    // 检查是否支持浏览器语言
    if (SUPPORTED_LANGUAGES.includes(browserLang)) {
      return browserLang;
    }
    
    // 检查语言代码的前缀（如 en-GB -> en-US）
    const langPrefix = browserLang.split('-')[0];
    const matchedLang = SUPPORTED_LANGUAGES.find(lang => lang.startsWith(langPrefix));
    
    return matchedLang || DEFAULT_LANGUAGE;
  }
  
  // 获取当前语言
  function getCurrentLanguage() {
    return currentLanguage;
  }
  
  // 设置语言
  async function setLanguage(language) {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    currentLanguage = language;
    
    try {
      // 检查是否在Chrome扩展环境中
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ language: currentLanguage });
      } else {
        // 非扩展环境，保存到localStorage
        localStorage.setItem('video-limiter-language', currentLanguage);
      }
    } catch (error) {
      console.error('Failed to save language setting:', error);
    }
  }
  
  // 获取翻译文本
  function getMessage(key, ...args) {
    const messages = MESSAGES[currentLanguage] || MESSAGES[DEFAULT_LANGUAGE];
    let message = messages[key];
    
    if (!message) {
      console.warn(`Missing translation for key: ${key} in language: ${currentLanguage}`);
      // 尝试使用默认语言
      message = MESSAGES[DEFAULT_LANGUAGE][key] || key;
    }
    
    // 处理参数替换 {0}, {1}, etc.
    if (args.length > 0) {
      message = message.replace(/{(\d+)}/g, (match, index) => {
        const argIndex = parseInt(index);
        return args[argIndex] !== undefined ? args[argIndex] : match;
      });
    }
    
    return message;
  }
  
  // 获取所有支持的语言
  function getSupportedLanguages() {
    return [...SUPPORTED_LANGUAGES];
  }
  
  // 获取语言显示名称
  function getLanguageDisplayName(language) {
    const displayNames = {
      'zh-CN': '中文',
      'en-US': 'English'
    };
    return displayNames[language] || language;
  }
  
  // 格式化时间显示
  function formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      if (remainingMinutes > 0) {
        return getMessage('formatHoursMinutes', hours, remainingMinutes);
      } else {
        return getMessage('formatHours', hours);
      }
    } else {
      return getMessage('formatMinutes', minutes);
    }
  }
  
  // 导出API
  window.I18n = {
    initLanguage,
    getCurrentLanguage,
    setLanguage,
    getMessage,
    getSupportedLanguages,
    getLanguageDisplayName,
    formatTime,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE
  };
  
})();