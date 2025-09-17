import { StorageManager } from '../utils/storage.js';
import { MessageManager } from '../utils/messaging.js';
import {
  POPUP_TO_CONTENT,
  BACKGROUND_TO_POPUP,
} from '../utils/message-types.js';
import { Logger } from '../utils/logger.js';

class PopupManager {
  constructor() {
    this.storage = new StorageManager();
    this.messaging = new MessageManager();
    this.logger = new Logger('Popup');

    this.isRunning = false;
    this.currentStats = {
      processed: 0,
      deleted: 0,
      skipped: 0,
      errors: 0,
    };

    this.init();
  }

  async init() {
    try {
      // 初始化 UI 元素
      this.initElements();

      // 检查当前页面是否为 Twitter/X 网站
      await this.checkCurrentPage();

      // 加载保存的配置
      await this.loadConfig();

      // 绑定事件监听器
      this.bindEventListeners();

      // 设置消息处理器
      this.setupMessageHandlers();

      this.logger.info('Popup 初始化完成');
    } catch (error) {
      this.logger.error('Popup 初始化失败:', error);
    }
  }

  initElements() {
    // 设置元素
    this.elements = {
      // 输入元素
      cutoffDate: document.getElementById('cutoffDate'),
      tweetTypes: document.querySelectorAll('input[name="tweetTypes"]'),
      deleteDelay: document.getElementById('deleteDelay'),
      scrollDelay: document.getElementById('scrollDelay'),
      maxTweets: document.getElementById('maxTweets'),
      debugMode: document.getElementById('debugMode'),

      // 按钮元素
      startBtn: document.getElementById('startBtn'),
      stopBtn: document.getElementById('stopBtn'),
      clearLogBtn: document.getElementById('clearLogBtn'),
      advancedToggle: document.getElementById('advancedToggle'),

      // 状态元素
      processedCount: document.getElementById('processedCount'),
      deletedCount: document.getElementById('deletedCount'),
      skippedCount: document.getElementById('skippedCount'),
      errorsCount: document.getElementById('errorsCount'),
      currentOperation: document.getElementById('currentOperation'),

      // 日志元素
      logContainer: document.getElementById('logContainer'),
      advancedSettings: document.getElementById('advancedSettings'),
    };
  }

  bindEventListeners() {
    // 控制按钮
    this.elements.startBtn.addEventListener('click', () =>
      this.startCleaning()
    );
    this.elements.stopBtn.addEventListener('click', () => this.stopCleaning());
    this.elements.clearLogBtn.addEventListener('click', () => this.clearLog());

    // 高级设置切换
    this.elements.advancedToggle.addEventListener('click', () => {
      const isVisible = this.elements.advancedSettings.style.display !== 'none';
      this.elements.advancedSettings.style.display = isVisible
        ? 'none'
        : 'block';

      // 更新按钮文本和图标
      const toggleText =
        this.elements.advancedToggle.querySelector('span:first-child');
      const toggleIcon =
        this.elements.advancedToggle.querySelector('span:last-child');

      if (isVisible) {
        toggleText.textContent = '🔧 高级设置';
        toggleIcon.textContent = '▼';
        this.elements.advancedToggle.classList.remove('active');
      } else {
        toggleText.textContent = '🔧 高级设置';
        toggleIcon.textContent = '▲';
        this.elements.advancedToggle.classList.add('active');
      }
    });

    // 配置变更自动保存
    this.elements.cutoffDate.addEventListener('change', () =>
      this.saveConfig()
    );
    this.elements.tweetTypes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => this.saveConfig());
    });
    this.elements.deleteDelay.addEventListener('change', () =>
      this.saveConfig()
    );
    this.elements.scrollDelay.addEventListener('change', () =>
      this.saveConfig()
    );
    this.elements.maxTweets.addEventListener('change', () => this.saveConfig());
    this.elements.debugMode.addEventListener('change', () => this.saveConfig());
  }

  async loadConfig() {
    try {
      const config = await this.storage.getConfig();

      // 设置默认值
      const defaultConfig = {
        cutoffDate: this.getDefaultDate(),
        tweetTypes: ['TWEET', 'RETWEET', 'REPLY', 'QUOTE'],
        deleteDelay: 2000,
        scrollDelay: 3000,
        maxTweets: 10000,
        debugMode: false,
      };

      const mergedConfig = { ...defaultConfig, ...config };

      // 应用配置到 UI
      this.elements.cutoffDate.value = mergedConfig.cutoffDate;
      this.elements.tweetTypes.forEach((checkbox) => {
        checkbox.checked = mergedConfig.tweetTypes.includes(checkbox.value);
      });
      this.elements.deleteDelay.value = mergedConfig.deleteDelay;
      this.elements.scrollDelay.value = mergedConfig.scrollDelay;
      this.elements.maxTweets.value = mergedConfig.maxTweets;
      this.elements.debugMode.checked = mergedConfig.debugMode;

      this.logger.info('配置加载完成');
    } catch (error) {
      this.logger.error('配置加载失败:', error);
    }
  }

  async saveConfig() {
    try {
      const config = {
        cutoffDate: this.elements.cutoffDate.value,
        tweetTypes: Array.from(this.elements.tweetTypes)
          .filter((cb) => cb.checked)
          .map((cb) => cb.value),
        deleteDelay: parseInt(this.elements.deleteDelay.value),
        scrollDelay: parseInt(this.elements.scrollDelay.value),
        maxTweets: parseInt(this.elements.maxTweets.value),
        debugMode: this.elements.debugMode.checked,
      };

      await this.storage.saveConfig(config);
      this.logger.info('配置保存完成');
    } catch (error) {
      this.logger.error('配置保存失败:', error);
    }
  }

  async startCleaning() {
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // 获取配置
      const config = await this.storage.getConfig();

      // 发送开始清理消息
      await this.messaging.sendMessage(tab.id, {
        type: POPUP_TO_CONTENT.START_CLEANING,
        payload: config,
      });
      // 更新 UI 状态
      this.setRunningState(true);
      this.log('开始清理推文...', 'info');
    } catch (error) {
      this.logger.error('启动清理失败:', error);
      this.log('启动清理失败: ' + error.message, 'error');
    }
  }

  async stopCleaning() {
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // 发送停止清理消息
      await this.messaging.sendMessage(tab.id, {
        type: POPUP_TO_CONTENT.STOP_CLEANING,
        payload: {},
      });

      // 更新 UI 状态
      this.setRunningState(false);
      this.log('停止清理推文', 'warning');
    } catch (error) {
      this.logger.error('停止清理失败:', error);
      this.log('停止清理失败: ' + error.message, 'error');
    }
  }

  setRunningState(running) {
    this.isRunning = running;

    // 更新按钮状态
    this.elements.startBtn.disabled = running;
    this.elements.stopBtn.disabled = !running;

    // 更新当前操作状态
    const operationText =
      this.elements.currentOperation.querySelector('.operation-text');
    operationText.textContent = running ? '正在清理中...' : '准备就绪';
  }

  updateStatsUI() {
    this.elements.processedCount.textContent = this.currentStats.processed;
    this.elements.deletedCount.textContent = this.currentStats.deleted;
    this.elements.skippedCount.textContent = this.currentStats.skipped;
    this.elements.errorsCount.textContent = this.currentStats.errors;
  }

  /**
   * 设置消息处理器
   */
  setupMessageHandlers() {
    // 处理来自 background script 的日志消息
    this.messaging.registerHandler(
      BACKGROUND_TO_POPUP.LOG_MESSAGE,
      async (payload) => {
        if (this.isRunning) {
          this.log(payload.message, payload.level);
        }
        return { success: true };
      }
    );

    // 处理来自 background script 的进度更新消息
    this.messaging.registerHandler(
      BACKGROUND_TO_POPUP.PROGRESS_UPDATE,
      async (payload) => {
        if (this.isRunning) {
          this.handleProgressUpdate(payload);
        }
        return { success: true };
      }
    );

    // 处理来自 background script 的清理完成消息
    this.messaging.registerHandler(
      BACKGROUND_TO_POPUP.CLEANUP_COMPLETE,
      async (payload) => {
        if (this.isRunning) {
          this.handleCleanupComplete(payload);
        }
        return { success: true };
      }
    );
  }

  handleProgressUpdate(payload) {
    this.currentStats = payload.stats;
    this.updateStatsUI();

    // 更新当前操作
    if (payload.currentTweet) {
      const operationText =
        this.elements.currentOperation.querySelector('.operation-text');
      operationText.textContent = `正在处理: ${
        payload.currentTweet.type
      } - ${payload.currentTweet.text.substring(0, 50)}...`;
    }
  }

  handleCleanupComplete(payload) {
    // 更新统计数据
    this.currentStats = payload.stats;
    this.updateStatsUI();

    // 设置运行状态为停止
    this.setRunningState(false);

    // 更新当前操作状态
    const operationText =
      this.elements.currentOperation.querySelector('.operation-text');
    operationText.textContent = '清理完成';

    // 添加完成日志
    this.log('推文清理完成', 'info');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${level}`;
    logEntry.innerHTML = `
      <span class="log-timestamp">${timestamp}</span>
      <span class="log-message">${message}</span>
    `;

    this.elements.logContainer.appendChild(logEntry);
    this.elements.logContainer.scrollTop =
      this.elements.logContainer.scrollHeight;

    // 限制日志条数
    const maxLogs = 100;
    while (this.elements.logContainer.children.length > maxLogs) {
      this.elements.logContainer.removeChild(
        this.elements.logContainer.firstChild
      );
    }
  }

  clearLog() {
    this.elements.logContainer.innerHTML = '';
    this.log('日志已清除', 'info');
  }

  getDefaultDate() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  }

  /**
   * 检查当前页面是否为 Twitter/X 网站
   */
  async checkCurrentPage() {
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // 检查是否在 Twitter/X 页面
      const isTwitterPage =
        tab.url.includes('twitter.com') || tab.url.includes('x.com');

      // 如果不在 Twitter/X 页面，禁用相关按钮并显示提示
      if (!isTwitterPage) {
        this.elements.startBtn.disabled = true;
        this.log('请在 Twitter 或 X.com 页面使用此扩展', 'warning');
      }

      return isTwitterPage;
    } catch (error) {
      this.logger.error('检查当前页面失败:', error);
      // 出错时默认启用按钮，让用户可以尝试操作
      return true;
    }
  }
}

// 当 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  /**
   * Chrome 的 popup 页面生命周期很特殊：当你点扩展图标时，它会创建一个全新的 popup.html 页面，失焦时销毁。
   *
   * 一旦你打开 popup 的 DevTools，Chrome 会「热重载」popup 页面一次，确保调试器能捕捉到脚本。
   *
   * 结果就是：
   *
   * 同一个 window 下，popup.js 被加载两次。
   *
   * DOMContentLoaded 回调也会注册两次并触发两次。
   *
   * 于是 PopupManager 就被实例化了两次。
   *
   * 因此需要单例保护。
   */
  if (!window.__popupManager) {
    window.__popupManager = new PopupManager();
  }
});
