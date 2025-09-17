import { MessageManager } from '../utils/messaging.js';
import { StorageManager } from '../utils/storage.js';
import {
  POPUP_TO_BACKGROUND,
  BACKGROUND_TO_POPUP,
  CONTENT_TO_BACKGROUND,
} from '../utils/message-types.js';
import { Logger, createLogger } from '../utils/logger.js';

/**
 * Background Script - Chrome 扩展后台服务
 * 使用 Service Worker 架构
 */
class BackgroundService {
  constructor() {
    this.logger = createLogger('Background');
    this.storage = new StorageManager();
    this.messaging = new MessageManager();
    this.activeTabs = new Map();

    this.init();
  }

  async init() {
    try {
      this.logger.info('Background Service 初始化开始');

      // 设置消息处理器
      this.setupMessageHandlers();

      // 设置扩展生命周期监听器
      this.setupLifecycleListeners();

      // 设置标签页监听器
      this.setupTabListeners();

      // 定期清理过期数据
      this.setupPeriodicCleanup();

      this.logger.info('Background Service 初始化完成');
    } catch (error) {
      this.logger.error('Background Service 初始化失败:', error);
    }
  }

  /**
   * 设置消息处理器
   */
  setupMessageHandlers() {
    // 获取扩展状态
    this.messaging.registerHandler(
      POPUP_TO_BACKGROUND.GET_EXTENSION_STATUS,
      async (payload) => {
        return {
          version: chrome.runtime.getManifest().version,
          activeTabs: this.activeTabs.size,
          timestamp: new Date().toISOString(),
        };
      }
    );

    // 获取配置
    this.messaging.registerHandler(
      POPUP_TO_BACKGROUND.GET_CONFIG,
      async (payload) => {
        return await this.storage.getConfig();
      }
    );

    // 保存配置
    this.messaging.registerHandler(
      POPUP_TO_BACKGROUND.SAVE_CONFIG,
      async (payload) => {
        await this.storage.saveConfig(payload);
      }
    );




    // 获取日志
    this.messaging.registerHandler(
      POPUP_TO_BACKGROUND.GET_LOGS,
      async (payload) => {
        return await this.storage.getLogs();
      }
    );

    // 清除日志
    this.messaging.registerHandler(
      POPUP_TO_BACKGROUND.CLEAR_LOGS,
      async (payload) => {
        await this.storage.clearLogs();
      }
    );


    // 处理来自 content script 的日志消息
    this.messaging.registerHandler(
      CONTENT_TO_BACKGROUND.LOG_MESSAGE,
      async (payload) => {
        // 转发日志消息到 popup
        await this.messaging.sendToRuntime({
          type: BACKGROUND_TO_POPUP.LOG_MESSAGE,
          payload,
        });
      }
    );

    // 处理来自 content script 的进度更新消息
    this.messaging.registerHandler(
      CONTENT_TO_BACKGROUND.PROGRESS_UPDATE,
      async (payload) => {
        // 转发进度更新到 popup
        await this.messaging.sendToRuntime({
          type: BACKGROUND_TO_POPUP.PROGRESS_UPDATE,
          payload,
        });
      }
    );

    // 处理来自 content script 的清理完成消息
    this.messaging.registerHandler(
      CONTENT_TO_BACKGROUND.CLEANUP_COMPLETE,
      async (payload) => {
        // 转发清理完成消息到 popup
        await this.messaging.sendToRuntime({
          type: BACKGROUND_TO_POPUP.CLEANUP_COMPLETE,
          payload,
        });
      }
    );
  }

  /**
   * 设置扩展生命周期监听器
   */
  setupLifecycleListeners() {
    // 扩展安装事件
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    // 扩展启动事件
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // 扩展消息事件（已在 MessageManager 中处理）
  }

  /**
   * 设置标签页监听器
   */
  setupTabListeners() {
    // 标签页更新事件
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // 标签页移除事件
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemove(tabId);
    });

    // 标签页激活事件
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivate(activeInfo);
    });
  }

  /**
   * 设置定期清理
   */
  setupPeriodicCleanup() {
    // 每小时清理一次过期数据
    setInterval(() => {
      this.cleanupExpiredData();
    }, 60 * 60 * 1000);

    // 每分钟清理一次不活跃的标签页
    setInterval(() => {
      this.cleanupInactiveTabs();
    }, 60 * 1000);
  }

  /**
   * 处理扩展安装
   */
  async handleInstall(details) {
    try {
      this.logger.info('扩展安装/更新', details);

      if (details.reason === 'install') {
        // 首次安装
        await this.handleFirstInstall();
      } else if (details.reason === 'update') {
        // 更新安装
        await this.handleUpdate(details.previousVersion);
      }
    } catch (error) {
      this.logger.error('处理扩展安装失败:', error);
    }
  }

  /**
   * 处理首次安装
   */
  async handleFirstInstall() {
    try {
      this.logger.info('首次安装，初始化默认配置');

      // 设置默认配置
      const defaultConfig = this.storage.getDefaultConfig();
      await this.storage.saveConfig(defaultConfig);

      // 可以在这里显示欢迎页面或设置指南
      // chrome.tabs.create({ url: 'welcome.html' });
    } catch (error) {
      this.logger.error('处理首次安装失败:', error);
    }
  }

  /**
   * 处理扩展更新
   */
  async handleUpdate(previousVersion) {
    try {
      this.logger.info(
        `扩展更新: ${previousVersion} → ${chrome.runtime.getManifest().version}`
      );

      // 可以在这里执行版本特定的迁移逻辑
      await this.migrateData(previousVersion);
    } catch (error) {
      this.logger.error('处理扩展更新失败:', error);
    }
  }

  /**
   * 数据迁移
   */
  async migrateData(previousVersion) {
    try {
      // 根据版本执行相应的迁移逻辑
      this.logger.info(`执行数据迁移: ${previousVersion}`);

      // 示例：如果是从 1.0.0 版本升级
      if (previousVersion === '1.0.0') {
        // 执行特定的迁移逻辑
      }
    } catch (error) {
      this.logger.error('数据迁移失败:', error);
    }
  }

  /**
   * 处理扩展启动
   */
  async handleStartup() {
    try {
      this.logger.info('扩展启动');

      // 恢复活跃标签页状态
      await this.restoreActiveTabs();
    } catch (error) {
      this.logger.error('处理扩展启动失败:', error);
    }
  }

  /**
   * 处理标签页更新
   */
  async handleTabUpdate(tabId, tab) {
    try {
      // 检查是否为 Twitter 页面
      if (this.isTwitterPage(tab.url)) {
        this.logger.debug(`Twitter 标签页更新: ${tabId}`);

        // 可以在这里注入 content script 或执行其他操作
        // chrome.scripting.executeScript({
        //   target: { tabId },
        //   files: ['content.js']
        // });
      }
    } catch (error) {
      this.logger.error('处理标签页更新失败:', error);
    }
  }

  /**
   * 处理标签页移除
   */
  async handleTabRemove(tabId) {
    try {
      this.activeTabs.delete(tabId);
      this.logger.debug(`标签页移除: ${tabId}`);
    } catch (error) {
      this.logger.error('处理标签页移除失败:', error);
    }
  }

  /**
   * 处理标签页激活
   */
  async handleTabActivate(activeInfo) {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab && this.isTwitterPage(tab.url)) {
        this.logger.debug(`Twitter 标签页激活: ${activeInfo.tabId}`);
      }
    } catch (error) {
      this.logger.error('处理标签页激活失败:', error);
    }
  }

  /**
   * 检查是否为 Twitter 页面
   */
  isTwitterPage(url) {
    return url && (url.includes('twitter.com') || url.includes('x.com'));
  }

  /**
   * 恢复活跃标签页状态
   */
  async restoreActiveTabs() {
    try {
      const tabs = await chrome.tabs.query({});

      for (const tab of tabs) {
        if (this.isTwitterPage(tab.url)) {
          this.activeTabs.set(tab.id, {
            url: tab.url,
            timestamp: Date.now(),
          });
        }
      }

      this.logger.info(`恢复 ${this.activeTabs.size} 个活跃标签页`);
    } catch (error) {
      this.logger.error('恢复活跃标签页失败:', error);
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData() {
    try {
      this.logger.debug('清理过期数据');


      // 清理过期的日志数据（超过 3 天）
      const logs = await this.storage.getLogs();
      const expireDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      const recentLogs = logs.filter((log) => {
        const logDate = new Date(log.timestamp);
        return logDate > expireDate;
      });

      if (recentLogs.length !== logs.length) {
        await this.storage.saveLogs(recentLogs);
        this.logger.info(
          `清理过期日志数据: ${logs.length - recentLogs.length} 条`
        );
      }
    } catch (error) {
      this.logger.error('清理过期数据失败:', error);
    }
  }

  /**
   * 清理不活跃的标签页
   */
  async cleanupInactiveTabs() {
    try {
      const now = Date.now();
      const inactiveThreshold = 5 * 60 * 1000; // 5 分钟

      for (const [tabId, tabInfo] of this.activeTabs) {
        if (now - tabInfo.timestamp > inactiveThreshold) {
          this.activeTabs.delete(tabId);
          this.logger.debug(`清理不活跃标签页: ${tabId}`);
        }
      }
    } catch (error) {
      this.logger.error('清理不活跃标签页失败:', error);
    }
  }

  /**
   * 获取扩展统计信息
   */
  async getStats() {
    return {
      version: chrome.runtime.getManifest().version,
      activeTabs: this.activeTabs.size,
      uptime: Date.now() - (chrome.runtime.getManifest().manifest_version || 0),
      memoryUsage: process.memoryUsage ? process.memoryUsage() : null,
    };
  }
}

// 初始化 Background Service
new BackgroundService();
