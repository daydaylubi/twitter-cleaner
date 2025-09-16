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
            .then((response) => {
              sendResponse({ success: true, data: response });
            })
            .catch((error) => {
              sendResponse({ success: false, error: error.message });
            });
        } else {
          sendResponse({ success: true, data: result });
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    } else {
      // 未找到消息处理器时，记录警告日志并发送空响应
      console.warn(`未找到消息处理器: ${type}`);
      sendResponse();
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
   * 发送消息到扩展的 runtime（background script 或 popup）
   * @param {Object} message - 消息对象
   * @returns {Promise<Object>} 响应数据
   */
  async sendToRuntime(message) {
    try {
      /** @type {any} */
      const response = await chrome.runtime.sendMessage(message);
      // 标准化响应格式
      if (response && response.success) {
        return response.data;
      } else if (response && response.error) {
        throw new Error(response.error);
      }
      // 如果响应不是标准格式，直接返回
      return response;
    } catch (error) {
      console.error('发送消息到 runtime 失败:', error);
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
      /** @type {any} */
      const response = await chrome.tabs.sendMessage(tabId, message);
      // 标准化响应格式
      if (response && response.success) {
        return response.data;
      } else if (response && response.error) {
        throw new Error(response.error);
      }
      // 如果响应不是标准格式，直接返回
      return response;
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
      /** @type {chrome.tabs.Tab[]} */
      const tabs = await chrome.tabs.query({ url: urlPattern });
      const responses = [];

      for (const tab of tabs) {
        try {
          /** @type {any} */
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
}
