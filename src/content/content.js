import { TweetDetector } from './tweet-detector.js';
import { TweetDeleter } from './deleter.js';
import { StorageManager } from '../utils/storage.js';
import { MessageManager } from '../utils/messaging.js';
import {
  POPUP_TO_CONTENT,
  CONTENT_TO_BACKGROUND,
} from '../utils/message-types.js';
import { Logger, createLogger } from '../utils/logger.js';

/**
 * Twitter Cleaner - 主要的清理逻辑类
 * 基于现有 cleaner.js 重构，适配 Chrome Extension 架构
 */
export class TwitterCleaner {
  constructor() {
    this.logger = createLogger('TwitterCleaner');
    this.storage = new StorageManager();
    this.messaging = new MessageManager();
    this.detector = new TweetDetector();
    this.deleter = null;

    // 运行状态
    this.isRunning = false;
    this.shouldStop = false;

    // 统计数据
    this.stats = {
      processed: 0,
      deleted: 0,
      skipped: 0,
      errors: 0,
      scrollAttempts: 0,
      totalElements: 0,
    };

    // 配置
    this.config = {
      cutoffDate: new Date('2025-08-01'),
      tweetTypes: ['TWEET', 'RETWEET', 'REPLY', 'QUOTE'],
      deleteDelay: 2000,
      scrollDelay: 3000,
      maxTweets: 10000,
      maxScrollAttempts: 50,
      emptyPageStopThreshold: 5,
      debug: false,
    };

    // 处理状态
    this.processedTweetIds = new Set();
    this.currentBatch = [];

    this.init();
  }

  async init() {
    try {
      this.logger.info('Twitter Cleaner 初始化开始');

      // 检查是否在 Twitter 页面
      if (!this.isTwitterPage()) {
        this.logger.warning('不在 Twitter 页面，跳过初始化');
        return;
      }

      // 加载保存的配置
      await this.loadConfig();

      // 设置消息处理器
      this.setupMessageHandlers();

      // 等待页面加载完成
      await this.waitForPageReady();

      this.logger.info('Twitter Cleaner 初始化完成');
    } catch (error) {
      this.logger.error('初始化失败:', error);
    }
  }

  /**
   * 检查是否在 Twitter 页面
   */
  isTwitterPage() {
    const hostname = window.location.hostname;
    return hostname.includes('twitter.com') || hostname.includes('x.com');
  }

  /**
   * 等待页面准备就绪
   */
  async waitForPageReady() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });
  }

  /**
   * 加载配置
   */
  async loadConfig() {
    try {
      const savedConfig = await this.storage.getConfig();
      this.config = { ...this.config, ...savedConfig };

      // 转换日期字符串为 Date 对象
      if (typeof this.config.cutoffDate === 'string') {
        this.config.cutoffDate = new Date(this.config.cutoffDate);
      }

      // 设置日志级别
      if (this.config.debug) {
        this.logger.setLogLevel('debug');
      }

      this.logger.info('配置加载完成', this.config);
    } catch (error) {
      this.logger.error('加载配置失败:', error);
    }
  }

  /**
   * 设置消息处理器
   */
  setupMessageHandlers() {
    // 开始清理
    this.messaging.registerHandler(
      POPUP_TO_CONTENT.START_CLEANING,
      async (payload) => {
        await this.startCleaning(payload);
        return { success: true };
      }
    );

    // 停止清理
    this.messaging.registerHandler(
      POPUP_TO_CONTENT.STOP_CLEANING,
      async (payload) => {
        await this.stopCleaning();
        return { success: true };
      }
    );

    // 获取状态
    this.messaging.registerHandler(
      POPUP_TO_CONTENT.GET_STATUS,
      async (payload) => {
        return {
          isRunning: this.isRunning,
          stats: this.stats,
          config: this.config,
        };
      }
    );

    // 重置进度
    this.messaging.registerHandler(
      POPUP_TO_CONTENT.RESET_PROGRESS,
      async (payload) => {
        await this.resetProgress();
        return { success: true };
      }
    );
  }

  /**
   * 开始清理
   */
  async startCleaning(config = {}) {
    if (this.isRunning) {
      this.logger.warning('清理已在进行中');
      return;
    }

    try {
      this.logger.info('开始清理推文');

      // 更新配置
      this.config = { ...this.config, ...config };
      if (typeof this.config.cutoffDate === 'string') {
        this.config.cutoffDate = new Date(this.config.cutoffDate);
      }

      // 重置状态
      this.isRunning = true;
      this.shouldStop = false;
      this.resetStats();

      // 删除器实例
      this.deleter = new TweetDeleter(this.config);

      // 发送状态更新
      await this.sendStatusUpdate();

      // 开始清理过程
      await this.cleanupTweets();
    } catch (error) {
      this.logger.error('启动清理失败:', error);
      this.isRunning = false;
      await this.sendStatusUpdate();
    }
  }

  /**
   * 停止清理
   */
  async stopCleaning() {
    if (!this.isRunning) {
      this.logger.warning('清理未在进行中');
      return;
    }

    try {
      this.logger.info('停止清理');
      this.shouldStop = true;
      this.isRunning = false;

      // 保存当前进度
      await this.saveProgress();

      // 发送状态更新
      await this.sendStatusUpdate();
    } catch (error) {
      this.logger.error('停止清理失败:', error);
    }
  }

  /**
   * 重置进度
   */
  async resetProgress() {
    try {
      this.logger.info('重置进度');

      this.resetStats();
      this.processedTweetIds.clear();
      this.currentBatch = [];

      // 清除保存的进度
      await this.storage.clearProgress();

      // 发送状态更新
      await this.sendStatusUpdate();
    } catch (error) {
      this.logger.error('重置进度失败:', error);
    }
  }

  /**
   * 主要的清理循环
   */
  async cleanupTweets() {
    this.logger.info('开始执行清理循环');

    let consecutiveEmptyPages = 0;

    while (
      this.isRunning &&
      !this.shouldStop &&
      this.stats.scrollAttempts < this.config.maxScrollAttempts &&
      this.stats.processed < this.config.maxTweets
    ) {
      try {
        // 构建当前批次
        const batchSize = this.buildCurrentBatch();

        if (batchSize === 0) {
          consecutiveEmptyPages++;
          this.logger.warning(
            `页面无推文，尝试滚动加载 (${consecutiveEmptyPages}/${this.config.emptyPageStopThreshold})`
          );

          if (consecutiveEmptyPages >= this.config.emptyPageStopThreshold) {
            this.logger.info('连续多次页面为空，可能账号无内容，停止清理');
            break;
          }

          // 滚动加载更多推文
          const hasMore = await this.scrollDown();
          if (hasMore) {
            consecutiveEmptyPages = 0;
          }

          this.stats.scrollAttempts++;
          continue;
        }

        // 处理当前批次
        const result = await this.processCurrentBatch();

        if (result === 'stopped') {
          break;
        }

        consecutiveEmptyPages = 0;

        // 定期发送状态更新
        if (this.stats.processed % 10 === 0) {
          await this.sendStatusUpdate();
        }

        // 短暂延迟避免过快操作
        await this.sleep(500);
      } catch (error) {
        this.logger.error('清理循环出错:', error);
        this.stats.errors++;

        if (this.stats.errors > 10) {
          this.logger.error('错误次数过多，停止清理');
          break;
        }
      }
    }

    // 清理完成
    await this.cleanupComplete();
  }

  /**
   * 构建当前批次的推文队列
   */
  buildCurrentBatch() {
    try {
      const elements = this.detector.findTweetElements();
      const tweetInfos = elements
        .map((element) => this.detector.getTweetInfo(element))
        .filter((info) => info && !this.processedTweetIds.has(info.id));

      this.currentBatch = tweetInfos;
      this.stats.totalElements = tweetInfos.length;

      this.logger.debug(`构建批次完成，共 ${tweetInfos.length} 条未处理推文`);

      return tweetInfos.length;
    } catch (error) {
      this.logger.error('构建批次失败:', error);
      return 0;
    }
  }

  /**
   * 处理当前批次
   */
  async processCurrentBatch() {
    while (this.currentBatch.length > 0 && this.isRunning && !this.shouldStop) {
      const tweetInfo = this.currentBatch.shift();

      try {
        const result = await this.processTweet(tweetInfo);

        if (result === 'stopped') {
          return 'stopped';
        }
      } catch (error) {
        this.logger.error('处理推文失败:', error);
        this.stats.errors++;
      }
    }

    return 'completed';
  }

  /**
   * 处理单个推文
   */
  async processTweet(tweetInfo) {
    try {
      // 标记为已处理
      this.processedTweetIds.add(tweetInfo.id);
      this.stats.processed++;

      this.logger.debug(`处理推文 [${tweetInfo.type}] ID: ${tweetInfo.id}`);

      // 检查是否需要处理
      const shouldProcess = tweetInfo.date < this.config.cutoffDate;

      if (!shouldProcess) {
        this.logger.debug(
          `跳过推文: 日期较新 (${tweetInfo.date.toLocaleDateString()})`
        );
        this.stats.skipped++;
        return 'skipped';
      }

      // 检查推文类型是否匹配
      if (!this.config.tweetTypes.includes(tweetInfo.type)) {
        this.logger.debug(`跳过推文: 类型不匹配 (${tweetInfo.type})`);
        this.stats.skipped++;
        return 'skipped';
      }

      // 执行删除操作
      const success = await this.deleter.deleteTweet(
        tweetInfo.element,
        tweetInfo.type
      );

      if (success) {
        this.stats.deleted++;
        this.logger.info(`删除${tweetInfo.type}成功`);

        // 等待删除间隔
        await this.sleep(this.config.deleteDelay);
      } else {
        this.stats.errors++;
        this.logger.error(`删除${tweetInfo.type}失败`);
      }

      // 发送进度更新
      await this.sendStatusUpdate(tweetInfo);

      return success ? 'deleted' : 'failed';
    } catch (error) {
      this.logger.error('处理推文异常:', error);
      this.stats.errors++;
      return 'failed';
    }
  }

  /**
   * 向下滚动页面
   */
  async scrollDown() {
    try {
      const beforeScrollHeight = document.documentElement.scrollHeight;

      window.scrollTo({
        top: beforeScrollHeight,
        behavior: 'smooth',
      });

      await this.sleep(this.config.scrollDelay);

      const afterScrollHeight = document.documentElement.scrollHeight;
      const hasNewContent = afterScrollHeight > beforeScrollHeight;

      this.logger.debug(
        `滚动${
          hasNewContent ? '成功' : '无效'
        }: ${beforeScrollHeight} → ${afterScrollHeight}`
      );

      return hasNewContent;
    } catch (error) {
      this.logger.error('滚动失败:', error);
      return false;
    }
  }

  /**
   * 清理完成
   */
  async cleanupComplete() {
    try {
      this.isRunning = false;

      this.logger.info('清理完成', {
        processed: this.stats.processed,
        deleted: this.stats.deleted,
        skipped: this.stats.skipped,
        errors: this.stats.errors,
      });

      // 保存最终进度
      await this.saveProgress();

      // 发送最终状态更新
      await this.sendStatusUpdate();
    } catch (error) {
      this.logger.error('清理完成处理失败:', error);
    }
  }

  /**
   * 发送状态更新
   */
  async sendStatusUpdate(currentTweet = null) {
    try {
      await this.messaging.sendToRuntime({
        type: CONTENT_TO_BACKGROUND.PROGRESS_UPDATE,
        payload: {
          stats: this.stats,
          currentTweet,
        },
      });
    } catch (error) {
      this.logger.error('发送状态更新失败:', error);
    }
  }

  /**
   * 保存进度
   */
  async saveProgress() {
    try {
      const progress = {
        stats: this.stats,
        processedTweetIds: Array.from(this.processedTweetIds),
        timestamp: new Date().toISOString(),
      };

      await this.storage.saveProgress(progress);
    } catch (error) {
      this.logger.error('保存进度失败:', error);
    }
  }

  /**
   * 重置统计数据
   */
  resetStats() {
    this.stats = {
      processed: 0,
      deleted: 0,
      skipped: 0,
      errors: 0,
      scrollAttempts: 0,
      totalElements: 0,
    };
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 当 DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TwitterCleaner();
  });
} else {
  new TwitterCleaner();
}
