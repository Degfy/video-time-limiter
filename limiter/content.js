// Content Script - 内容脚本
// 在所有网页中运行，检测视频播放并统计时长
// Content Script - runs on all web pages, detects video playback and tracks duration

(function () {
  'use strict';

  // 配置
  let config = {
    timeLimit: 60000,
    customMessage: '您今日的视频观看时间已超过限制！请适当休息。',
    watchTime: 0,
    language: 'zh-CN'
  };

  // 状态管理
  let isVideoPlaying = false;
  let startTime = null;
  let lastWarningTime = 0;
  let warningElement = null;
  let videoElements = new Set();
  let observer = null;
  let reportInterval = null; // 定时上报间隔

  // 初始化
  init();

  async function init() {
    console.log('视频时长限制器 - 内容脚本已加载 / Video Time Limiter - Content script loaded');

    // 获取初始配置
    await loadInitialConfig();

    // 开始监听视频
    startVideoMonitoring();

    // 监听来自background的消息
    chrome.runtime.onMessage.addListener(handleMessage);
  }

  // 获取本地化消息
  function getLocalizedMessage(key, defaultMessage) {
    const messages = {
      'zh-CN': {
        warningTitle: '时间限制提醒',
        defaultWarning: '您今日的视频观看时间已超过限制！请适当休息。',
        closeButton: '我知道了',
        continueWatching: '继续观看'
      },
      'en-US': {
        warningTitle: 'Time Limit Reminder',
        defaultWarning: 'Your daily video watching time has exceeded the limit! Please take a break.',
        closeButton: 'I Understand',
        continueWatching: 'Continue Watching'
      }
    };
    
    const currentLang = config.language || 'zh-CN';
    const langMessages = messages[currentLang] || messages['zh-CN'];
    return langMessages[key] || defaultMessage;
  }

  // 加载配置（仅在初始化时使用）
  async function loadInitialConfig() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
      if (response && !response.error) {
        config = response;
        console.log('初始配置加载完成:', config);
      }
    } catch (error) {
      console.error('加载初始配置失败:', error);
    }
  }

  // 处理来自background的消息
  function handleMessage(request, sender, sendResponse) {
    if (request.action === 'configUpdated') {
      // 被动接收配置更新
      if (request.config) {
        config = request.config;
        console.log('接收到配置更新:', config);
      } else if (request.changes) {
        // 处理storage变化通知
        updateConfigFromChanges(request.changes);
      }
    }
  }

  // 根据storage变化更新配置
  function updateConfigFromChanges(changes) {
    if (changes.timeLimit && changes.timeLimit.newValue !== undefined) {
      config.timeLimit = changes.timeLimit.newValue;
    }
    if (changes.customMessage && changes.customMessage.newValue !== undefined) {
      config.customMessage = changes.customMessage.newValue;
    }
    if (changes.watchTime && changes.watchTime.newValue !== undefined) {
      config.watchTime = changes.watchTime.newValue;
    }
    if (changes.language && changes.language.newValue !== undefined) {
      config.language = changes.language.newValue;
    }
    console.log('配置已更新 / Config updated:', config);
  }

  // 开始视频监听
  function startVideoMonitoring() {
    // 监听现有视频
    findAndMonitorVideos();

    // 使用MutationObserver监听DOM变化
    observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'VIDEO' || node.querySelector('video')) {
                shouldCheck = true;
              }
            }
          });
        }
      });

      if (shouldCheck) {
        setTimeout(findAndMonitorVideos, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 查找并监听视频元素
  function findAndMonitorVideos() {
    const videos = document.querySelectorAll('video');

    videos.forEach(video => {
      if (!videoElements.has(video)) {
        videoElements.add(video);
        addVideoListeners(video);
      }
    });
  }

  // 为视频元素添加事件监听器
  function addVideoListeners(video) {
    // 播放事件
    video.addEventListener('play', () => {
      handleVideoPlay(video);
    });

    // 暂停事件
    video.addEventListener('pause', () => {
      handleVideoPause(video);
    });

    // 结束事件
    video.addEventListener('ended', () => {
      handleVideoPause(video);
    });

    // 时间更新事件（用于检测拖拽）
    video.addEventListener('timeupdate', () => {
      // 如果视频正在播放但我们的状态是暂停，重新开始计时
      if (!video.paused && !isVideoPlaying) {
        handleVideoPlay(video);
      }
    });

    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && isVideoPlaying) {
        handleVideoPause(video);
      } else if (!document.hidden && !video.paused) {
        handleVideoPlay(video);
      }
    });
  }

  // 处理视频播放
  function handleVideoPlay(video) {
    if (!isVideoPlaying) {
      isVideoPlaying = true;
      startTime = Date.now();
      console.log('视频开始播放');

      // 启动每秒上报定时器
      startReportInterval();
    }
  }

  // 处理视频暂停
  function handleVideoPause(video) {
    if (isVideoPlaying && startTime) {
      const watchTime = Date.now() - startTime;
      isVideoPlaying = false;

      // 停止定时上报
      stopReportInterval();

      console.log(`视频暂停，本次观看时长: ${watchTime}ms`);

      // 发送最后一次观看时长到background
      sendWatchTime(watchTime);

      startTime = null;
    }
  }

  // 发送观看时长到background
  async function sendWatchTime(time) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'addWatchTime',
        time: time
      });

      if (response && !response.error) {
        config.watchTime = response.watchTime;

        // 检查是否超过限制
        if (response.isOverLimit) {
          showWarning(response.customMessage || config.customMessage);
        }
      }
    } catch (error) {
      console.error('发送观看时长失败:', error);
    }
  }

  // 启动定时上报
  function startReportInterval() {
    // 清除现有定时器
    stopReportInterval();

    // 每秒上报一次
    reportInterval = setInterval(() => {
      if (isVideoPlaying && startTime) {
        const currentTime = Date.now();
        const watchTime = currentTime - startTime;

        // 发送1秒的观看时长
        sendWatchTime(1000);

        // 重置开始时间，避免重复计算
        startTime = currentTime;
      }
    }, 1000);
  }

  // 停止定时上报
  function stopReportInterval() {
    if (reportInterval) {
      clearInterval(reportInterval);
      reportInterval = null;
    }
  }

  // 暂停所有视频
  function pauseAllVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (!video.paused) {
        video.pause();
        console.log('自动暂停视频:', video);
      }
    });
  }

  // 显示警告提示
  function showWarning(message) {
    const now = Date.now();

    // 如果距离上次警告不足2秒，不显示
    if (now - lastWarningTime < 2000) {
      return;
    }

    lastWarningTime = now;

    // 移除现有警告
    removeWarning();

    // 自动暂停所有正在播放的视频
    pauseAllVideos();

    // 创建警告元素
    warningElement = document.createElement('div');
    warningElement.id = 'video-time-limiter-warning';
    warningElement.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          text-align: center;
          max-width: 500px;
          margin: 20px;
        ">
          <div style="
            font-size: 48px;
            margin-bottom: 20px;
          ">⏰</div>
          <h2 style="
            color: #e74c3c;
            margin: 0 0 20px 0;
            font-size: 24px;
            font-weight: 600;
          ">${getLocalizedMessage('warningTitle', '时间限制提醒')}</h2>
          <p style="
            color: #333;
            margin: 0 0 30px 0;
            font-size: 20px;
            font-weight: bold;
            line-height: 1.5;
          ">${message}</p>
          <div style="
            color: #e74c3c;
            margin-bottom: 30px;
            font-size: 18px;
            font-weight: bold;
          ">
            今日已观看: ${formatTime(config.watchTime)} / ${formatTime(config.timeLimit)}
          </div>
          <button id="close-warning-btn" style="
            background: #3498db;
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
          ">${getLocalizedMessage('closeButton', '我知道了')}</button>
        </div>
      </div>
    `;

    // 添加到页面
    document.body.appendChild(warningElement);

    // 添加关闭事件
    const closeBtn = warningElement.querySelector('#close-warning-btn');
    closeBtn.addEventListener('click', removeWarning);
    closeBtn.addEventListener('mouseover', function () {
      this.style.background = '#2980b9';
    });
    closeBtn.addEventListener('mouseout', function () {
      this.style.background = '#3498db';
    });

    // 点击背景关闭
    warningElement.addEventListener('click', (e) => {
      if (e.target === warningElement) {
        removeWarning();
      }
    });

    // ESC键关闭
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        removeWarning();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // 10秒后检查是否还在播放视频，如果是则再次提醒
    setTimeout(() => {
      if (isVideoPlaying) {
        showWarning(message);
      }
    }, 10000);
  }

  // 移除警告
  function removeWarning() {
    if (warningElement && warningElement.parentNode) {
      warningElement.parentNode.removeChild(warningElement);
      warningElement = null;
    }
  }

  // 格式化时间显示
  function formatTime(milliseconds) {
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

  // 页面卸载时处理
  window.addEventListener('beforeunload', () => {
    // 停止定时上报
    stopReportInterval();

    if (isVideoPlaying && startTime) {
      const watchTime = Date.now() - startTime;
      // 使用同步方式发送最后的观看时长
      navigator.sendBeacon('/video-time-tracker', JSON.stringify({
        action: 'addWatchTime',
        time: watchTime
      }));
    }

    // 清理
    if (observer) {
      observer.disconnect();
    }
    removeWarning();
  });

})();