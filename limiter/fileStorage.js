// 本地存储管理模块
// 提供统一的存储接口，支持Chrome扩展的storage API

(function(global) {
  'use strict';
  
  // 存储键名常量
  const STORAGE_KEYS = {
    SERVER_URL: 'serverUrl',
    USER_ID: 'userId',
    TIME_LIMIT: 'timeLimit',
    CUSTOM_MESSAGE: 'customMessage',
    WATCH_TIME: 'watchTime',
    LAST_DATE: 'lastDate',
    SETTINGS: 'settings'
  };
  
  // 默认配置
  const DEFAULT_SETTINGS = {
    timeLimit: 60000, // 60秒
    customMessage: '您今日的视频观看时间已超过限制！请适当休息。',
    watchTime: 0,
    lastDate: new Date().toDateString(),
    serverUrl: '',
    userId: ''
  };
  
  // 文件存储类
  class FileStorage {
    constructor() {
      this.isExtension = typeof chrome !== 'undefined' && chrome.storage;
    }
    
    // 获取存储数据
    async get(key) {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            resolve(result[key]);
          });
        });
      } else {
        // 降级到localStorage
        const value = localStorage.getItem(key);
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
    }
    
    // 获取多个存储数据
    async getMultiple(keys) {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.get(keys, resolve);
        });
      } else {
        const result = {};
        keys.forEach(key => {
          const value = localStorage.getItem(key);
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        });
        return result;
      }
    }
    
    // 设置存储数据
    async set(key, value) {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [key]: value }, resolve);
        });
      } else {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
      }
    }
    
    // 设置多个存储数据
    async setMultiple(data) {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.set(data, resolve);
        });
      } else {
        Object.entries(data).forEach(([key, value]) => {
          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, stringValue);
        });
      }
    }
    
    // 删除存储数据
    async remove(key) {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.remove([key], resolve);
        });
      } else {
        localStorage.removeItem(key);
      }
    }
    
    // 清空所有存储数据
    async clear() {
      if (this.isExtension) {
        return new Promise((resolve) => {
          chrome.storage.local.clear(resolve);
        });
      } else {
        localStorage.clear();
      }
    }
    
    // 监听存储变化
    onChanged(callback) {
      if (this.isExtension) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === 'local') {
            callback(changes);
          }
        });
      } else {
        // localStorage没有原生的变化监听，使用自定义事件
        window.addEventListener('storage', (e) => {
          const changes = {};
          changes[e.key] = {
            oldValue: e.oldValue ? JSON.parse(e.oldValue) : undefined,
            newValue: e.newValue ? JSON.parse(e.newValue) : undefined
          };
          callback(changes);
        });
      }
    }
  }
  
  // 配置管理类
  class ConfigManager {
    constructor(storage) {
      this.storage = storage;
    }
    
    // 初始化配置
    async initialize() {
      const existingConfig = await this.storage.getMultiple(Object.values(STORAGE_KEYS));
      const updates = {};
      
      // 检查并设置默认值
      Object.entries(DEFAULT_SETTINGS).forEach(([key, defaultValue]) => {
        const storageKey = STORAGE_KEYS[key.toUpperCase()] || key;
        if (existingConfig[storageKey] === undefined || existingConfig[storageKey] === null) {
          updates[storageKey] = defaultValue;
        }
      });
      
      // 生成用户ID（如果不存在）
      if (!existingConfig[STORAGE_KEYS.USER_ID]) {
        updates[STORAGE_KEYS.USER_ID] = this.generateUserId();
      }
      
      if (Object.keys(updates).length > 0) {
        await this.storage.setMultiple(updates);
      }
      
      return this.getConfig();
    }
    
    // 生成用户ID
    generateUserId() {
      return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // 获取完整配置
    async getConfig() {
      const data = await this.storage.getMultiple(Object.values(STORAGE_KEYS));
      
      return {
        serverUrl: data[STORAGE_KEYS.SERVER_URL] || '',
        userId: data[STORAGE_KEYS.USER_ID] || '',
        timeLimit: data[STORAGE_KEYS.TIME_LIMIT] || DEFAULT_SETTINGS.timeLimit,
        customMessage: data[STORAGE_KEYS.CUSTOM_MESSAGE] || DEFAULT_SETTINGS.customMessage,
        watchTime: data[STORAGE_KEYS.WATCH_TIME] || 0,
        lastDate: data[STORAGE_KEYS.LAST_DATE] || new Date().toDateString()
      };
    }
    
    // 更新配置
    async updateConfig(updates) {
      const storageUpdates = {};
      
      Object.entries(updates).forEach(([key, value]) => {
        const storageKey = STORAGE_KEYS[key.toUpperCase()];
        if (storageKey) {
          storageUpdates[storageKey] = value;
        }
      });
      
      await this.storage.setMultiple(storageUpdates);
      return this.getConfig();
    }
    
    // 重置观看时间（跨天时调用）
    async resetDailyWatchTime() {
      const today = new Date().toDateString();
      await this.storage.setMultiple({
        [STORAGE_KEYS.WATCH_TIME]: 0,
        [STORAGE_KEYS.LAST_DATE]: today
      });
    }
    
    // 检查是否需要重置（跨天检查）
    async checkAndResetDaily() {
      const config = await this.getConfig();
      const today = new Date().toDateString();
      
      if (config.lastDate !== today) {
        await this.resetDailyWatchTime();
        return true;
      }
      return false;
    }
    
    // 添加观看时间
    async addWatchTime(time) {
      await this.checkAndResetDaily();
      const config = await this.getConfig();
      const newWatchTime = config.watchTime + time;
      
      await this.storage.set(STORAGE_KEYS.WATCH_TIME, newWatchTime);
      return newWatchTime;
    }
    
    // 获取观看时间
    async getWatchTime() {
      await this.checkAndResetDaily();
      return await this.storage.get(STORAGE_KEYS.WATCH_TIME) || 0;
    }
    
    // 导出配置
    async exportConfig() {
      const config = await this.getConfig();
      return JSON.stringify(config, null, 2);
    }
    
    // 导入配置
    async importConfig(configJson) {
      try {
        const config = JSON.parse(configJson);
        await this.updateConfig(config);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    
    // 清空所有数据
    async clearAllData() {
      await this.storage.clear();
      return this.initialize();
    }
  }
  
  // 时间格式化工具
  class TimeFormatter {
    static formatDuration(milliseconds) {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}小时${minutes % 60}分钟${seconds % 60}秒`;
      } else if (minutes > 0) {
        return `${minutes}分钟${seconds % 60}秒`;
      } else {
        return `${seconds}秒`;
      }
    }
    
    static formatTime(milliseconds) {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    
    static parseTimeInput(timeStr) {
      // 支持多种时间格式输入："1h30m", "90m", "5400s", "01:30:00"
      if (!timeStr) return 0;
      
      timeStr = timeStr.trim().toLowerCase();
      
      // 格式：HH:MM:SS 或 MM:SS
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':').map(p => parseInt(p) || 0);
        if (parts.length === 3) {
          return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        } else if (parts.length === 2) {
          return (parts[0] * 60 + parts[1]) * 1000;
        }
      }
      
      // 格式：1h30m20s
      let totalMs = 0;
      const hourMatch = timeStr.match(/(\d+)h/);
      const minuteMatch = timeStr.match(/(\d+)m/);
      const secondMatch = timeStr.match(/(\d+)s/);
      
      if (hourMatch) totalMs += parseInt(hourMatch[1]) * 3600 * 1000;
      if (minuteMatch) totalMs += parseInt(minuteMatch[1]) * 60 * 1000;
      if (secondMatch) totalMs += parseInt(secondMatch[1]) * 1000;
      
      if (totalMs > 0) return totalMs;
      
      // 纯数字，假设为分钟
      const number = parseInt(timeStr);
      if (!isNaN(number)) {
        return number * 60 * 1000;
      }
      
      return 0;
    }
  }
  
  // 创建实例
  const storage = new FileStorage();
  const configManager = new ConfigManager(storage);
  
  // 导出到全局
  global.FileStorage = {
    storage,
    configManager,
    TimeFormatter,
    STORAGE_KEYS,
    DEFAULT_SETTINGS
  };
  
})(typeof window !== 'undefined' ? window : global);