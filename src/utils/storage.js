/**
 * Chrome Storage Manager
 * 管理扩展的配置和状态存储
 */
export class StorageManager {
  constructor() {
    this.storage = chrome.storage.local;
  }

  /**
   * 保存配置
   * @param {Object} config - 配置对象
   */
  async saveConfig(config) {
    try {
      await this.storage.set({ config });
      return true;
    } catch (error) {
      console.error('保存配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取配置
   * @returns {Promise<Object>} 配置对象
   */
  async getConfig() {
    try {
      const result = await this.storage.get('config');
      return result.config || this.getDefaultConfig();
    } catch (error) {
      console.error('获取配置失败:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * 保存进度状态
   * @param {Object} progress - 进度对象
   */
  async saveProgress(progress) {
    try {
      await this.storage.set({ progress });
      return true;
    } catch (error) {
      console.error('保存进度失败:', error);
      throw error;
    }
  }

  /**
   * 获取进度状态
   * @returns {Promise<Object>} 进度对象
   */
  async getProgress() {
    try {
      const result = await this.storage.get('progress');
      return result.progress || this.getDefaultProgress();
    } catch (error) {
      console.error('获取进度失败:', error);
      return this.getDefaultProgress();
    }
  }

  /**
   * 清除进度状态
   */
  async clearProgress() {
    try {
      await this.storage.remove('progress');
      return true;
    } catch (error) {
      console.error('清除进度失败:', error);
      throw error;
    }
  }

  /**
   * 保存日志
   * @param {Array} logs - 日志数组
   */
  async saveLogs(logs) {
    try {
      await this.storage.set({ logs });
      return true;
    } catch (error) {
      console.error('保存日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取日志
   * @returns {Promise<Array>} 日志数组
   */
  async getLogs() {
    try {
      const result = await this.storage.get('logs');
      return result.logs || [];
    } catch (error) {
      console.error('获取日志失败:', error);
      return [];
    }
  }

  /**
   * 清除所有数据
   */
  async clearAll() {
    try {
      await this.storage.clear();
      return true;
    } catch (error) {
      console.error('清除所有数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取默认配置
   * @returns {Object} 默认配置
   */
  getDefaultConfig() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    
    return {
      cutoffDate: date.toISOString().split('T')[0],
      tweetTypes: ['TWEET', 'RETWEET', 'REPLY', 'QUOTE'],
      deleteDelay: 2000,
      scrollDelay: 3000,
      maxTweets: 10000,
      maxScrollAttempts: 50,
      emptyPageStopThreshold: 5,
      debugMode: false
    };
  }

  /**
   * 获取默认进度
   * @returns {Object} 默认进度
   */
  getDefaultProgress() {
    return {
      processed: 0,
      deleted: 0,
      skipped: 0,
      errors: 0,
      scrollAttempts: 0,
      totalElements: 0,
      isRunning: false,
      startTime: null,
      endTime: null,
      currentTweet: null
    };
  }
}