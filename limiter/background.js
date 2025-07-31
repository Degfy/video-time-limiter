// Service Worker - 后台脚本

// 存储配置
const CONFIG_KEYS = {
  SERVER_URL: 'serverUrl',
  USER_ID: 'userId',
  TIME_LIMIT: 'timeLimit',
  CUSTOM_MESSAGE: 'customMessage',
  WATCH_TIME: 'watchTime',
  LAST_DATE: 'lastDate'
};

// 累积上报相关状态
let accumulatedWatchTime = 0; // 累积的观看时长
let currentUrl = ''; // 当前观看的URL
let lastServerSyncTime = 0;
const SERVER_SYNC_INTERVAL = 30000; // 30秒
let syncTimer = null; // 定时器引用

// 默认配置
const DEFAULT_CONFIG = {
  timeLimit: 60000, // 60秒，单位毫秒
  customMessage: '您今日的视频观看时间已超过限制！请适当休息。',
  watchTime: 0,
  lastDate: new Date().toDateString()
};

// 初始化
chrome.runtime.onInstalled.addListener(async () => {
  console.log('视频时长限制器已安装');
  await initializeConfig();

  // 启动定时累积同步
  startAccumulatedSyncTimer();
});

// Service Worker启动时也启动定时器
chrome.runtime.onStartup.addListener(() => {
  console.log('视频时长限制器Service Worker已启动');
  startAccumulatedSyncTimer();
});

// 当Service Worker被唤醒时启动定时器
if (typeof self !== 'undefined' && self.addEventListener) {
  self.addEventListener('activate', () => {
    console.log('视频时长限制器Service Worker已激活');
    startAccumulatedSyncTimer();
  });
}

// 启动定时累积同步
function startAccumulatedSyncTimer() {
  // 避免重复启动定时器
  if (syncTimer) {
    return;
  }

  console.log('启动累积同步定时器');

  // 每30秒检查一次是否需要累积同步
  syncTimer = setInterval(async () => {
    if (accumulatedWatchTime > 0) {
      await syncAccumulatedTimeToServer();
    }
  }, SERVER_SYNC_INTERVAL);
}

// 初始化配置
async function initializeConfig() {
  const result = await chrome.storage.local.get(Object.values(CONFIG_KEYS));

  // 设置默认值
  const updates = {};
  if (!result[CONFIG_KEYS.TIME_LIMIT]) {
    updates[CONFIG_KEYS.TIME_LIMIT] = DEFAULT_CONFIG.timeLimit;
  }
  if (!result[CONFIG_KEYS.CUSTOM_MESSAGE]) {
    updates[CONFIG_KEYS.CUSTOM_MESSAGE] = DEFAULT_CONFIG.customMessage;
  }
  if (!result[CONFIG_KEYS.WATCH_TIME]) {
    updates[CONFIG_KEYS.WATCH_TIME] = DEFAULT_CONFIG.watchTime;
  }
  if (!result[CONFIG_KEYS.LAST_DATE]) {
    updates[CONFIG_KEYS.LAST_DATE] = DEFAULT_CONFIG.lastDate;
  }
  if (!result[CONFIG_KEYS.USER_ID]) {
    updates[CONFIG_KEYS.USER_ID] = generateUserId();
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
}

// 生成用户ID
function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 检查是否跨天，如果跨天则重置观看时间
async function checkAndResetDaily() {
  const result = await chrome.storage.local.get([CONFIG_KEYS.LAST_DATE, CONFIG_KEYS.WATCH_TIME]);
  const today = new Date().toDateString();

  if (result[CONFIG_KEYS.LAST_DATE] !== today) {
    await chrome.storage.local.set({
      [CONFIG_KEYS.WATCH_TIME]: 0,
      [CONFIG_KEYS.LAST_DATE]: today
    });
    return true;
  }
  return false;
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addWatchTime') {
    handleAddWatchTime(request.time, sender.tab.url)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true; // 保持消息通道开放
  }

  if (request.action === 'getConfig') {
    getConfig()
      .then(config => sendResponse(config))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'updateConfig') {
    updateConfig(request.config)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'checkServerStatus') {
    checkServerStatus(request.serverUrl)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});



// 处理添加观看时间
async function handleAddWatchTime(time, url) {
  await checkAndResetDaily();

  const config = await getLocalConfig();
  const newWatchTime = config.watchTime + time;

  // 更新本地存储
  await chrome.storage.local.set({
    [CONFIG_KEYS.WATCH_TIME]: newWatchTime
  });

  // 判断是否为远程模式
  const isRemoteMode = config.serverUrl && config.serverUrl.trim();

  // 如果是远程模式，累积观看时长
  if (isRemoteMode && config.userId) {
    accumulatedWatchTime += time;
    currentUrl = url; // 记录当前URL

    // 检查是否需要立即同步到服务器（达到30秒间隔）
    const now = Date.now();
    if (now - lastServerSyncTime >= SERVER_SYNC_INTERVAL) {
      await syncAccumulatedTimeToServer();
    }
  }

  // 检查是否超过限制
  const isOverLimit = newWatchTime >= config.timeLimit;

  // 通知所有content script和popup观看时间已更新
  try {
    const updatedConfig = await getLocalConfig();

    // 通知popup
    chrome.runtime.sendMessage({
      type: 'configUpdated',
      config: updatedConfig
    }).catch(() => {
      // popup可能未打开，忽略错误
    });

    // 通知所有content script
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'configUpdated',
          config: updatedConfig
        }).catch(() => {
          // 忽略无法发送消息的标签页
        });
      });
    });
  } catch (error) {
    console.log('发送观看时间更新通知失败:', error);
  }

  return {
    watchTime: newWatchTime,
    timeLimit: config.timeLimit,
    isOverLimit,
    customMessage: config.customMessage
  };
}

// 同步到服务器
async function syncToServer(serverUrl, userId, url, watchTime) {
  const response = await fetch(`${serverUrl}/api/v1/videos/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: url,
      watchTime: watchTime,
      at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    throw new Error(`服务器响应错误: ${response.status}`);
  }

  const data = await response.json();

  // 更新本地数据以服务器数据为准
  await chrome.storage.local.set({
    [CONFIG_KEYS.WATCH_TIME]: data.watchTime,
    [CONFIG_KEYS.TIME_LIMIT]: data.limitTime,
    [CONFIG_KEYS.CUSTOM_MESSAGE]: data.customMessage || DEFAULT_CONFIG.customMessage
  });

  return data;
}

// 累积同步到服务器
async function syncAccumulatedTimeToServer() {
  if (accumulatedWatchTime === 0) {
    return;
  }

  const config = await getLocalConfig();
  const isRemoteMode = config.serverUrl && config.serverUrl.trim();

  if (!isRemoteMode || !config.userId) {
    return;
  }

  console.log(`开始同步累积观看时长 ${accumulatedWatchTime}ms 到服务器`);

  let deltaTime = accumulatedWatchTime

  try {
    const response = await fetch(`${config.serverUrl}/api/v1/videos/${config.userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: currentUrl,
        watchTime: deltaTime,
        at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.error(`累积同步到服务器失败:`, response.statusText);
      return;
    }

    const { data } = await response.json();
    console.log(`成功同步累积观看时长 ${deltaTime}ms 到服务器`);
    accumulatedWatchTime -= deltaTime;

    // 利用服务器返回的数据更新本地存储
    await chrome.storage.local.set({
      [CONFIG_KEYS.WATCH_TIME]: data.watchTime,
      [CONFIG_KEYS.TIME_LIMIT]: data.limitTime + accumulatedWatchTime,
      [CONFIG_KEYS.CUSTOM_MESSAGE]: data.customMessage || DEFAULT_CONFIG.customMessage
    });

    // 清空累积的观看时长
    accumulatedWatchTime = 0;
    lastServerSyncTime = Date.now();

  } catch (error) {
    console.error(`累积同步到服务器时发生错误:`, error);
  }
}

// 获取本地配置（不从服务器获取）
async function getLocalConfig() {
  await checkAndResetDaily();

  const result = await chrome.storage.local.get(Object.values(CONFIG_KEYS));

  return {
    serverUrl: result[CONFIG_KEYS.SERVER_URL] || '',
    userId: result[CONFIG_KEYS.USER_ID] || '',
    timeLimit: result[CONFIG_KEYS.TIME_LIMIT] || DEFAULT_CONFIG.timeLimit,
    customMessage: result[CONFIG_KEYS.CUSTOM_MESSAGE] || DEFAULT_CONFIG.customMessage,
    watchTime: (result[CONFIG_KEYS.WATCH_TIME] || 0),
  };
}

// 获取配置
async function getConfig() {
  await checkAndResetDaily();

  const result = await chrome.storage.local.get(Object.values(CONFIG_KEYS));

  // 判断是否为远程模式
  const isRemoteMode = result[CONFIG_KEYS.SERVER_URL] && result[CONFIG_KEYS.SERVER_URL].trim();

  // 如果是远程模式且配置了服务器，从服务器获取最新数据
  if (isRemoteMode && result[CONFIG_KEYS.USER_ID]) {
    try {
      const serverData = await getServerData(result[CONFIG_KEYS.SERVER_URL], result[CONFIG_KEYS.USER_ID]);
      console.log("serverData==>", serverData)

      // 更新本地数据
      await chrome.storage.local.set({
        [CONFIG_KEYS.WATCH_TIME]: serverData.watchTime + accumulatedWatchTime, // 加上还没有上报的累积时间
        [CONFIG_KEYS.TIME_LIMIT]: serverData.limitTime,
        [CONFIG_KEYS.CUSTOM_MESSAGE]: serverData.customMessage || result[CONFIG_KEYS.CUSTOM_MESSAGE]
      });

      result[CONFIG_KEYS.WATCH_TIME] = serverData.watchTime + accumulatedWatchTime; // 加上还没有上报的累积时间
      result[CONFIG_KEYS.TIME_LIMIT] = serverData.limitTime;
      if (serverData.customMessage !== undefined) {
        result[CONFIG_KEYS.CUSTOM_MESSAGE] = serverData.customMessage;
      }
    } catch (error) {
      console.error('从服务器获取数据失败:', error);
    }
  }

  return {
    serverUrl: result[CONFIG_KEYS.SERVER_URL] || '',
    userId: result[CONFIG_KEYS.USER_ID] || '',
    timeLimit: result[CONFIG_KEYS.TIME_LIMIT] || DEFAULT_CONFIG.timeLimit,
    customMessage: result[CONFIG_KEYS.CUSTOM_MESSAGE] || DEFAULT_CONFIG.customMessage,
    watchTime: (result[CONFIG_KEYS.WATCH_TIME] || 0),
  };
}

// 从服务器获取数据
async function getServerData(serverUrl, userId) {
  const response = await fetch(`${serverUrl}/api/v1/videos/${userId}`);

  if (!response.ok) {
    throw new Error(`服务器响应错误: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

// 更新配置
async function updateConfig(config) {
  const updates = {};

  if (config.serverUrl !== undefined) {
    updates[CONFIG_KEYS.SERVER_URL] = config.serverUrl;
  }
  if (config.userId !== undefined) {
    updates[CONFIG_KEYS.USER_ID] = config.userId;
  }
  if (config.timeLimit !== undefined) {
    updates[CONFIG_KEYS.TIME_LIMIT] = config.timeLimit;
  }
  if (config.customMessage !== undefined) {
    updates[CONFIG_KEYS.CUSTOM_MESSAGE] = config.customMessage;
  }

  // 判断是否为远程模式
  const isRemoteMode = config.serverUrl && config.serverUrl.trim();

  // 如果是远程模式，同步配置到服务器
  if (isRemoteMode && config.userId) {
    try {
      const response = await fetch(`${config.serverUrl}/api/v1/videos/${config.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          limitTime: config.timeLimit,
          customMessage: config.customMessage || '您今天的视频观看时间已达到限制！'
        })
      });

      if (!response.ok) {
        console.error('同步配置到服务器失败:', response.statusText);
      }
    } catch (error) {
      console.error('同步配置到服务器时发生错误:', error);
    }
  }

  await chrome.storage.local.set(updates);

  // 通知所有content script和popup配置已更新
  try {
    const updatedConfig = await getConfig();

    console.log("updatedConfig->", updatedConfig)

    // 通知popup
    chrome.runtime.sendMessage({
      type: 'configUpdated',
      config: updatedConfig
    }).catch(() => {
      // popup可能未打开，忽略错误
    });

    // 通知所有content script
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'configUpdated',
          config: updatedConfig
        }).catch(() => {
          // 忽略无法发送消息的标签页
        });
      });
    });
  } catch (error) {
    console.log('发送配置更新通知失败:', error);
  }

  return { success: true };
}



// 检查服务器状态
async function checkServerStatus(serverUrl) {
  if (!serverUrl || !serverUrl.trim()) {
    throw new Error('服务器地址不能为空');
  }

  try {
    // 检查健康检查接口
    const healthResponse = await fetch(`${serverUrl}/api/health-check`, {
      method: 'GET',
      timeout: 5000 // 5秒超时
    });

    if (healthResponse.ok) {
      return {
        status: 'online',
        message: '服务器连接正常',
        responseTime: Date.now()
      };
    } else {
      return {
        status: 'error',
        message: `服务器响应错误: ${healthResponse.status}`,
        responseTime: Date.now()
      };
    }
  } catch (error) {
    // 如果健康检查失败，尝试访问API根路径
    try {
      const apiResponse = await fetch(`${serverUrl}/api/v1/videos/test`, {
        method: 'GET',
        timeout: 5000
      });

      return {
        status: 'partial',
        message: 'API可访问但健康检查失败',
        responseTime: Date.now()
      };
    } catch (apiError) {
      return {
        status: 'offline',
        message: `服务器连接失败: ${error.message}`,
        responseTime: Date.now()
      };
    }
  }
}

// 监听存储变化，通知content script
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'local') {
    console.log('检测到storage变化:', changes);

    // 获取最新的完整配置
    try {
      const updatedConfig = await getLocalConfig();

      console.log('最新的完整配置:', updatedConfig);

      // 通知所有content script配置已更新（发送完整配置）
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'configUpdated',
            config: updatedConfig,
            changes: changes
          }).catch(() => {
            // 忽略无法发送消息的标签页
          });
        });
      });

      // 通知popup
      chrome.runtime.sendMessage({
        type: 'configUpdated',
        config: updatedConfig
      }).catch(() => {
        // popup可能未打开，忽略错误
      });
    } catch (error) {
      console.error('获取配置失败:', error);
    }
  }
});