/**
 * Message Manager
 * 管理扩展内部的消息通信
 */
export class MessageManager {
  constructor() {
    this.messageHandlers = new Map();
    this.setupMessageListener();
  }

  /**
   * 设置消息监听器
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });
  }

  /**
   * 处理接收到的消息
   * @param {Object} message - 消息对象
   * @param {Object} sender - 发送者信息
   * @param {Function} sendResponse - 响应函数
   */
  handleMessage(message, sender, sendResponse) {
    const { type, payload } = message;
    
    // 查找对应的消息处理器
    const handler = this.messageHandlers.get(type);
    if (handler) {
      try {
        const result = handler(payload, sender);
        
        // 如果是 Promise，等待结果
        if (result instanceof Promise) {
          result
            .then(response => {
              sendResponse({ success: true, data: response });
            })
            .catch(error => {
              sendResponse({ success: false, error: error.message });
            });
        } else {
          sendResponse({ success: true, data: result });
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    } else {
      sendResponse({ success: false, error: `Unknown message type: ${type}` });
    }
  }

  /**
   * 注册消息处理器
   * @param {string} type - 消息类型
   * @param {Function} handler - 处理函数
   */
  registerHandler(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * 发送消息到 background script
   * @param {Object} message - 消息对象
   * @returns {Promise<Object>} 响应数据
   */
  async sendToBackground(message) {
    try {
      const response = await chrome.runtime.sendMessage(message);
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('发送消息到 background script 失败:', error);
      throw error;
    }
  }

  /**
   * 发送消息到指定标签页的 content script
   * @param {number} tabId - 标签页 ID
   * @param {Object} message - 消息对象
   * @returns {Promise<Object>} 响应数据
   */
  async sendMessage(tabId, message) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      if (response && response.success) {
        return response.data;
      }
      return response; // 直接返回 response（兼容旧的处理方式）
    } catch (error) {
      console.error('发送消息到 content script 失败:', error);
      throw error;
    }
  }

  /**
   * 广播消息到所有匹配的标签页
   * @param {Object} message - 消息对象
   * @param {string} urlPattern - URL 匹配模式
   * @returns {Promise<Array>} 所有标签页的响应
   */
  async broadcastMessage(message, urlPattern = '*://*.twitter.com/*') {
    try {
      const tabs = await chrome.tabs.query({ url: urlPattern });
      const responses = [];
      
      for (const tab of tabs) {
        try {
          const response = await this.sendMessage(tab.id, message);
          responses.push({ tabId: tab.id, response });
        } catch (error) {
          responses.push({ tabId: tab.id, error: error.message });
        }
      }
      
      return responses;
    } catch (error) {
      console.error('广播消息失败:', error);
      throw error;
    }
  }

  /**
   * 发送日志消息到 popup
   * @param {string} message - 日志消息
   * @param {string} level - 日志级别
   */
  async sendLog(message, level = 'info') {
    try {
      await this.sendToBackground({
        type: 'LOG_MESSAGE',
        payload: {
          message,
          level,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('发送日志消息失败:', error);
    }
  }

  /**
   * 发送进度更新消息到 popup
   * @param {Object} stats - 统计数据
   * @param {Object} currentTweet - 当前处理的推文信息
   */
  async sendProgressUpdate(stats, currentTweet = null) {
    try {
      await this.sendToBackground({
        type: 'PROGRESS_UPDATE',
        payload: {
          stats,
          currentTweet
        }
      });
    } catch (error) {
      console.error('发送进度更新失败:', error);
    }
  }
}

/**
 * Content Script 专用的消息管理器
 */
export class ContentScriptMessageManager extends MessageManager {
  constructor() {
    super();
    this.setupContentScriptHandlers();
  }

  /**
   * 设置 content script 专用消息处理器
   */
  setupContentScriptHandlers() {
    // 开始清理
    this.registerHandler('START_CLEANING', async (payload) => {
      // 这里将在 TwitterCleaner 类中实现
      return { received: true };
    });

    // 停止清理
    this.registerHandler('STOP_CLEANING', async (payload) => {
      // 这里将在 TwitterCleaner 类中实现
      return { received: true };
    });

    // 获取状态
    this.registerHandler('GET_STATUS', async (payload) => {
      // 这里将在 TwitterCleaner 类中实现
      return {
        isRunning: false,
        stats: {
          processed: 0,
          deleted: 0,
          skipped: 0,
          errors: 0
        }
      };
    });

    // 重置进度
    this.registerHandler('RESET_PROGRESS', async (payload) => {
      // 这里将在 TwitterCleaner 类中实现
      return { received: true };
    });
  }
}

/**
 * Background Script 专用的消息管理器
 */
export class BackgroundMessageManager extends MessageManager {
  constructor() {
    super();
    this.setupBackgroundHandlers();
  }

  /**
   * 设置 background script 专用消息处理器
   */
  setupBackgroundHandlers() {
    // 日志消息转发
    this.registerHandler('LOG_MESSAGE', async (payload, sender) => {
      // 转发日志消息到所有打开的 popup
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });
        
        for (const tab of tabs) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'LOG_MESSAGE',
              payload
            });
          } catch (error) {
            // popup 可能没有打开，忽略错误
          }
        }
      } catch (error) {
        console.error('转发日志消息失败:', error);
      }
      
      return { success: true };
    });

    // 进度更新转发
    this.registerHandler('PROGRESS_UPDATE', async (payload, sender) => {
      // 转发进度更新到所有打开的 popup
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });
        
        for (const tab of tabs) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'PROGRESS_UPDATE',
              payload
            });
          } catch (error) {
            // popup 可能没有打开，忽略错误
          }
        }
      } catch (error) {
        console.error('转发进度更新失败:', error);
      }
      
      return { success: true };
    });
  }
}