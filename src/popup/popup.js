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

      // 获取当前状态
      await this.updateStatus();

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
      resetBtn: document.getElementById('resetBtn'),
      clearLogBtn: document.getElementById('clearLogBtn'),
      advancedToggle: document.getElementById('advancedToggle'),

      // 状态元素
      processedCount: document.getElementById('processedCount'),
      deletedCount: document.getElementById('deletedCount'),
      skippedCount: document.getElementById('skippedCount'),
      errorsCount: document.getElementById('errorsCount'),
      progressFill: document.getElementById('progressFill'),
      progressText: document.getElementById('progressText'),
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
    this.elements.resetBtn.addEventListener('click', () =>
      this.resetProgress()
    );
    this.elements.clearLogBtn.addEventListener('click', () => this.clearLog());

    // 高级设置切换
    this.elements.advancedToggle.addEventListener('click', () => {
      const isVisible = this.elements.advancedSettings.style.display !== 'none';
      this.elements.advancedSettings.style.display = isVisible
        ? 'none'
        : 'block';

      // 更新按钮文本和图标
      const toggleText = this.elements.advancedToggle.querySelector('span:first-child');
      const toggleIcon = this.elements.advancedToggle.querySelector('span:last-child');

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

  async resetProgress() {
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // 发送重置进度消息
      await this.messaging.sendMessage(tab.id, {
        type: POPUP_TO_CONTENT.RESET_PROGRESS,
        payload: {},
      });

      // 重置本地状态
      this.currentStats = {
        processed: 0,
        deleted: 0,
        skipped: 0,
        errors: 0,
      };

      // 更新 UI
      this.updateStatsUI();
      this.updateProgressUI();
      this.log('进度已重置', 'info');
    } catch (error) {
      this.logger.error('重置进度失败:', error);
      this.log('重置进度失败: ' + error.message, 'error');
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

  async updateStatus() {
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // 请求状态更新
      const response = await this.messaging.sendMessage(tab.id, {
        type: POPUP_TO_CONTENT.GET_STATUS,
        payload: {},
      });

      if (response) {
        this.currentStats = response.stats || this.currentStats;
        this.setRunningState(response.isRunning || false);
        this.updateStatsUI();
        this.updateProgressUI();
      }
    } catch (error) {
      // 如果 content script 未运行，使用默认状态
      this.updateStatsUI();
      this.updateProgressUI();
    }
  }

  updateStatsUI() {
    this.elements.processedCount.textContent = this.currentStats.processed;
    this.elements.deletedCount.textContent = this.currentStats.deleted;
    this.elements.skippedCount.textContent = this.currentStats.skipped;
    this.elements.errorsCount.textContent = this.currentStats.errors;
  }

  updateProgressUI() {
    const total = this.currentStats.processed || 1;
    const percentage = Math.round((this.currentStats.deleted / total) * 100);

    this.elements.progressFill.style.width = `${percentage}%`;
    this.elements.progressText.textContent = `${percentage}%`;
  }

  /**
   * 设置消息处理器
   */
  setupMessageHandlers() {
    // 处理来自 background script 的日志消息
    this.messaging.registerHandler(
      BACKGROUND_TO_POPUP.LOG_MESSAGE,
      async (payload) => {
        this.log(payload.message, payload.level);
        return { success: true };
      }
    );

    // 处理来自 background script 的进度更新消息
    this.messaging.registerHandler(
      BACKGROUND_TO_POPUP.PROGRESS_UPDATE,
      async (payload) => {
        this.handleProgressUpdate(payload);
        return { success: true };
      }
    );
  }

  handleProgressUpdate(payload) {
    this.currentStats = payload.stats;
    this.updateStatsUI();
    this.updateProgressUI();

    // 更新当前操作
    if (payload.currentTweet) {
      const operationText =
        this.elements.currentOperation.querySelector('.operation-text');
      operationText.textContent = `正在处理: ${
        payload.currentTweet.type
      } - ${payload.currentTweet.text.substring(0, 50)}...`;
    }
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
      const isTwitterPage = tab.url.includes('twitter.com') || tab.url.includes('x.com');

      // 如果不在 Twitter/X 页面，禁用相关按钮并显示提示
      if (!isTwitterPage) {
        this.elements.startBtn.disabled = true;
        this.elements.resetBtn.disabled = true;
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
  new PopupManager();
});
