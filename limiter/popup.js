// Popup 脚本 - 设置界面逻辑

(function () {
  'use strict';

  // DOM 元素
  const elements = {
    watchTimeDisplay: document.getElementById('watchTimeDisplay'),
    timeLimitDisplay: document.getElementById('timeLimitDisplay'),
    progressFill: document.getElementById('progressFill'),
    statusIndicator: document.getElementById('statusIndicator'),
    modeText: document.getElementById('modeText'),
    localModeBtn: document.getElementById('localModeBtn'),
    remoteModeBtn: document.getElementById('remoteModeBtn'),
    remoteModeConfig: document.getElementById('remoteModeConfig'),
    timeLimit: document.getElementById('timeLimit'),
    serverUrl: document.getElementById('serverUrl'),
    userIdDisplay: document.getElementById('userIdDisplay'),
    customUserId: document.getElementById('customUserId'),
    customMessage: document.getElementById('customMessage'),
    saveBtn: document.getElementById('saveBtn'),
    copyUserIdBtn: document.getElementById('copyUserIdBtn'),
    editUserIdBtn: document.getElementById('editUserIdBtn'),
    regenerateUserIdBtn: document.getElementById('regenerateUserIdBtn'),
    checkServerBtn: document.getElementById('checkServerBtn'),
    serverStatus: document.getElementById('serverStatus'),
    currentServerStatus: document.getElementById('currentServerStatus'),
    messageArea: document.getElementById('messageArea')
  };

  // 当前配置
  let currentConfig = {};

  // 当前模式
  let currentMode = 'local'; // 'local' 或 'remote'

  // 初始化
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    console.log('设置界面已加载');

    // 监听配置变化
    listenForConfigUpdates();

    // 请求初始配置
    requestInitialConfig();

    // 绑定事件
    bindEvents();

    // 定时更新显示
    setInterval(updateDisplay, 1000);
  }

  // 监听配置更新
  function listenForConfigUpdates() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'configUpdated') {
        currentConfig.watchTime = message.config.watchTime;
        updateUI();
      }
    });
  }

  // 请求初始配置
  async function requestInitialConfig() {
    try {
      showLoading(true);

      const response = await chrome.runtime.sendMessage({ action: 'getConfig' });

      console.log('获取初始配置成功:', response);

      if (response && !response.error) {
        currentConfig = response;
        updateUI();
      } else {
        showMessage('获取配置失败: ' + (response?.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('获取配置失败:', error);
      showMessage('获取配置失败: ' + error.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  // 更新UI显示
  function updateUI() {
    // 更新统计显示
    updateDisplay();

    // 判断当前模式
    const hasServerUrl = currentConfig.serverUrl && currentConfig.serverUrl.trim();
    currentMode = hasServerUrl ? 'remote' : 'local';

    // 更新表单
    elements.timeLimit.value = formatTimeForInput(currentConfig.timeLimit || 60000);

    elements.serverUrl.value = currentConfig.serverUrl || '';
    elements.userIdDisplay.textContent = currentConfig.userId || '未设置';
    elements.customMessage.value = currentConfig.customMessage || '';

    // 更新模式显示
    updateModeDisplay();
  }

  // 更新显示数据
  function updateDisplay() {
    if (!currentConfig) return;

    const watchTime = currentConfig.watchTime || 0;
    const timeLimit = currentConfig.timeLimit || 60000;

    // 更新时间显示
    elements.watchTimeDisplay.textContent = formatTime(watchTime);
    elements.timeLimitDisplay.textContent = formatTime(timeLimit);

    // 更新进度条
    const progress = Math.min((watchTime / timeLimit) * 100, 100);
    elements.progressFill.style.width = progress + '%';

    // 根据进度改变颜色
    if (progress >= 100) {
      elements.progressFill.style.background = '#dc3545';
    } else if (progress >= 80) {
      elements.progressFill.style.background = '#ffc107';
    } else {
      elements.progressFill.style.background = '#28a745';
    }
  }

  // 更新模式显示
  function updateModeDisplay() {
    // 更新按钮状态
    elements.localModeBtn.classList.toggle('active', currentMode === 'local');
    elements.remoteModeBtn.classList.toggle('active', currentMode === 'remote');

    // 更新模式指示器
    if (currentMode === 'remote') {
      elements.statusIndicator.className = 'status-indicator status-remote';
      elements.modeText.textContent = '远程模式';
      elements.remoteModeConfig.style.display = 'block';
    } else {
      elements.statusIndicator.className = 'status-indicator status-local';
      elements.modeText.textContent = '本地模式';
      elements.remoteModeConfig.style.display = 'none';
    }

    // 更新服务器状态显示
    if (currentMode === 'remote' && currentConfig.serverUrl) {
      checkServerStatusSilently();
    } else {
      updateServerStatusDisplay('未连接', 'unknown');
    }
  }

  // 切换模式
  function switchMode(mode) {
    if (currentMode === mode) return;

    currentMode = mode;
    updateModeDisplay();

    // 如果切换到本地模式，清空服务器配置
    if (mode === 'local') {
      elements.serverUrl.value = '';
      // 隐藏服务器状态
      elements.serverStatus.style.display = 'none';
      currentConfig.serverUrl = '';
      showMessage('已切换到本地模式', 'success');
    } else {
      // 切换到远程模式，给出示例服务器地址
      if (!elements.serverUrl.value.trim()) {
        elements.serverUrl.value = 'http://localhost:8080';
        currentConfig.serverUrl = 'http://localhost:8080';
      }
      showMessage('已切换到远程模式，请配置服务器地址', 'success');
    }
  }

  // 绑定事件
  function bindEvents() {
    // 模式切换按钮
    elements.localModeBtn.addEventListener('click', () => switchMode('local'));
    elements.remoteModeBtn.addEventListener('click', () => switchMode('remote'));

    // 保存按钮
    elements.saveBtn.addEventListener('click', saveConfig);

    // 复制用户ID
    elements.copyUserIdBtn.addEventListener('click', copyUserId);

    // 编辑用户ID
    elements.editUserIdBtn.addEventListener('click', toggleUserIdEdit);

    // 重新生成用户ID
    elements.regenerateUserIdBtn.addEventListener('click', regenerateUserId);

    // 检查服务器状态
    elements.checkServerBtn.addEventListener('click', checkServerStatus);

    // 时间预设按钮
    document.querySelectorAll('.time-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const minutes = parseInt(e.target.dataset.time);
        elements.timeLimit.value = minutes + 'm';
        currentConfig.timeLimit = minutes * 60 * 1000;
      });
    });

    // 输入框变化时实时验证
    elements.timeLimit.addEventListener('input', validateTimeInput);
    elements.serverUrl.addEventListener('input', validateServerUrl);

    // 自定义用户ID输入框事件
    elements.customUserId.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveCustomUserId();
      }
    });

    elements.customUserId.addEventListener('blur', saveCustomUserId);
  }

  // 验证时间输入
  function validateTimeInput() {
    const value = elements.timeLimit.value.trim();
    const milliseconds = parseTimeInput(value);

    if (value && milliseconds === 0) {
      elements.timeLimit.style.borderColor = '#dc3545';
    } else {
      elements.timeLimit.style.borderColor = '#ddd';
    }
  }

  // 验证服务器URL
  function validateServerUrl() {
    const value = elements.serverUrl.value.trim();

    if (value && !isValidUrl(value)) {
      elements.serverUrl.style.borderColor = '#dc3545';
    } else {
      elements.serverUrl.style.borderColor = '#ddd';
    }
  }

  // 保存配置
  async function saveConfig() {
    try {
      showLoading(true);

      // 验证输入
      const timeLimit = parseTimeInput(elements.timeLimit.value.trim());
      if (timeLimit === 0) {
        showMessage('请输入有效的时间限制', 'error');
        return;
      }


      // 准备配置数据
      const config = {
        timeLimit: timeLimit,
        customMessage: elements.customMessage.value.trim()
      };

      console.log("config=>", config)

      // 根据当前模式处理服务器配置
      if (currentMode === 'remote') {
        const serverUrl = elements.serverUrl.value.trim();
        if (!serverUrl) {
          showMessage('远程模式下请输入服务器地址', 'error');
          return;
        }
        if (!isValidUrl(serverUrl)) {
          showMessage('请输入有效的服务器地址', 'error');
          return;
        }
        config.serverUrl = serverUrl;
        config.userId = currentConfig.userId;
      } else {
        // 本地模式下清空服务器配置
        config.serverUrl = '';
      }

      console.log('更新配置==>', config);

      // 发送到background
      const response = await chrome.runtime.sendMessage({
        action: 'updateConfig',
        config: config
      });

      if (response && response.success) {
        showMessage('设置已保存', 'success');
        // 配置会通过监听器自动更新，无需手动重新加载
      } else {
        showMessage('保存失败: ' + (response?.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      showMessage('保存失败: ' + error.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  // 复制用户ID
  async function copyUserId() {
    try {
      await navigator.clipboard.writeText(currentConfig.userId);
      showMessage('用户ID已复制到剪贴板', 'success');
    } catch (error) {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = currentConfig.userId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showMessage('用户ID已复制到剪贴板', 'success');
    }
  }

  // 重新生成用户ID
  async function regenerateUserId() {
    if (!confirm('确定要重新生成用户ID吗？这将清空当前的观看记录。')) {
      return;
    }

    try {
      showLoading(true);

      const newUserId = generateUserId();

      const response = await chrome.runtime.sendMessage({
        action: 'updateConfig',
        config: { userId: newUserId }
      });

      if (response && response.success) {
        showMessage('用户ID已重新生成', 'success');
        // 配置会通过监听器自动更新，无需手动重新加载
      } else {
        showMessage('重新生成失败: ' + (response?.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('重新生成用户ID失败:', error);
      showMessage('重新生成失败: ' + error.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  // 切换用户ID编辑模式
  function toggleUserIdEdit() {
    const isEditing = elements.customUserId.style.display !== 'none';

    if (isEditing) {
      // 取消编辑
      elements.customUserId.style.display = 'none';
      elements.editUserIdBtn.textContent = '编辑';
      elements.customUserId.value = '';
    } else {
      // 开始编辑
      elements.customUserId.style.display = 'block';
      elements.customUserId.value = currentConfig.userId || '';
      elements.editUserIdBtn.textContent = '取消';
      elements.customUserId.focus();
    }
  }

  // 保存自定义用户ID
  async function saveCustomUserId() {
    const customId = elements.customUserId.value.trim();

    if (!customId) {
      showMessage('用户ID不能为空', 'error');
      return;
    }

    if (customId === currentConfig.userId) {
      // 没有变化，直接取消编辑
      toggleUserIdEdit();
      return;
    }

    try {
      showLoading(true);

      const response = await chrome.runtime.sendMessage({
        action: 'updateConfig',
        config: { userId: customId }
      });

      if (response && response.success) {
        showMessage('用户ID已更新', 'success');
        // 配置会通过监听器自动更新，无需手动重新加载
        toggleUserIdEdit();
      } else {
        showMessage('更新失败: ' + (response?.error || '未知错误'), 'error');
      }
    } catch (error) {
      console.error('更新用户ID失败:', error);
      showMessage('更新失败: ' + error.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  // 更新服务器状态显示
  function updateServerStatusDisplay(statusText, statusClass) {
    elements.currentServerStatus.textContent = statusText;
    elements.currentServerStatus.className = `status-text ${statusClass}`;
  }

  // 静默检查服务器状态
  async function checkServerStatusSilently() {
    if (!currentConfig.serverUrl) {
      updateServerStatusDisplay('未配置', 'unknown');
      return;
    }

    updateServerStatusDisplay('检查中...', 'checking');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkServerStatus',
        serverUrl: currentConfig.serverUrl
      });

      if (response && !response.error) {
        switch (response.status) {
          case 'online':
            updateServerStatusDisplay('已连接', 'connected');
            break;
          case 'partial':
            updateServerStatusDisplay('连接异常', 'disconnected');
            break;
          case 'offline':
            updateServerStatusDisplay('连接失败', 'disconnected');
            break;
          default:
            updateServerStatusDisplay('未知状态', 'unknown');
        }
      } else {
        updateServerStatusDisplay('连接失败', 'disconnected');
      }
    } catch (error) {
      updateServerStatusDisplay('连接失败', 'disconnected');
    }
  }

  // 检查服务器状态
  async function checkServerStatus() {
    const serverUrl = elements.serverUrl.value.trim();

    if (!serverUrl) {
      showMessage('请先输入服务器地址', 'error');
      return;
    }

    try {
      // 显示检查中状态
      elements.serverStatus.className = 'server-status checking';
      elements.serverStatus.textContent = '正在检查服务器状态...';
      elements.checkServerBtn.textContent = '检查中...';
      elements.checkServerBtn.disabled = true;

      const response = await chrome.runtime.sendMessage({
        action: 'checkServerStatus',
        serverUrl: serverUrl
      });

      if (response && !response.error) {
        // 显示服务器状态
        elements.serverStatus.className = `server-status ${response.status}`;

        let statusText = '';
        switch (response.status) {
          case 'online':
            statusText = '✅ ' + response.message;
            updateServerStatusDisplay('已连接', 'connected');
            break;
          case 'partial':
            statusText = '⚠️ ' + response.message;
            updateServerStatusDisplay('连接异常', 'disconnected');
            break;
          case 'offline':
            statusText = '❌ ' + response.message;
            updateServerStatusDisplay('连接失败', 'disconnected');
            break;
          default:
            statusText = '❓ ' + response.message;
            updateServerStatusDisplay('未知状态', 'unknown');
        }

        elements.serverStatus.textContent = statusText;

        // 自动隐藏状态信息
        setTimeout(() => {
          elements.serverStatus.style.display = 'none';
        }, 5000);

      } else {
        elements.serverStatus.className = 'server-status offline';
        elements.serverStatus.textContent = '❌ ' + (response?.error || '检查失败');
        updateServerStatusDisplay('连接失败', 'disconnected');
      }
    } catch (error) {
      console.error('检查服务器状态失败:', error);
      elements.serverStatus.className = 'server-status offline';
      elements.serverStatus.textContent = '❌ 检查失败: ' + error.message;
      updateServerStatusDisplay('连接失败', 'disconnected');
    } finally {
      elements.checkServerBtn.textContent = '检查';
      elements.checkServerBtn.disabled = false;
    }
  }

  // 生成用户ID
  function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 解析时间输入
  function parseTimeInput(timeStr) {
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

  // 格式化时间用于输入框
  function formatTimeForInput(milliseconds) {
    const totalMinutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }

  // 格式化时间显示
  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}小时${minutes}分钟${seconds}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  // 验证URL
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // 显示消息
  function showMessage(message, type = 'info') {
    elements.messageArea.innerHTML = '';

    const messageEl = document.createElement('div');
    messageEl.className = type === 'error' ? 'error-message' : 'success-message';
    messageEl.textContent = message;

    elements.messageArea.appendChild(messageEl);

    // 3秒后自动清除
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 3000);
  }

  // 显示/隐藏加载状态
  function showLoading(loading) {
    if (loading) {
      document.body.classList.add('loading');
      elements.saveBtn.textContent = '保存中...';
    } else {
      document.body.classList.remove('loading');
      elements.saveBtn.textContent = '保存设置';
    }
  }

})();