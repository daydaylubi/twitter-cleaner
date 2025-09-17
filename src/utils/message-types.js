/**
 * 消息类型定义
 * 定义扩展中使用的所有消息类型及其用途
 */

// Popup 到 Content Script 的消息类型
export const POPUP_TO_CONTENT = {
  // 开始清理推文
  // 发送方: Popup
  // 接收方: Content Script (TwitterCleaner)
  START_CLEANING: 'START_CLEANING',

  // 停止清理推文
  // 发送方: Popup
  // 接收方: Content Script (TwitterCleaner)
  STOP_CLEANING: 'STOP_CLEANING',
};

// Content Script 到 Background Script 的消息类型
export const CONTENT_TO_BACKGROUND = {
  // 进度更新消息
  // 发送方: Content Script (TwitterCleaner)
  // 接收方: Background Script (BackgroundService)
  PROGRESS_UPDATE: 'CONTENT_PROGRESS_UPDATE',

  // 日志消息
  // 发送方: Content Script (TwitterCleaner)
  // 接收方: Background Script (BackgroundService)
  LOG_MESSAGE: 'CONTENT_LOG_MESSAGE',

  // 清理完成消息
  // 发送方: Content Script (TwitterCleaner)
  // 接收方: Background Script (BackgroundService)
  CLEANUP_COMPLETE: 'CONTENT_CLEANUP_COMPLETE',
};

// Popup 到 Background Script 的消息类型
export const POPUP_TO_BACKGROUND = {
  // 获取扩展状态
  // 发送方: Popup
  // 接收方: Background Script (BackgroundService)
  GET_EXTENSION_STATUS: 'GET_EXTENSION_STATUS',

  // 获取配置
  // 发送方: Popup
  // 接收方: Background Script (BackgroundService)
  GET_CONFIG: 'GET_CONFIG',

  // 保存配置
  // 发送方: Popup
  // 接收方: Background Script (BackgroundService)
  SAVE_CONFIG: 'SAVE_CONFIG',

  // 获取日志
  // 发送方: Popup
  // 接收方: Background Script (BackgroundService)
  GET_LOGS: 'GET_LOGS',

  // 清除日志
  // 发送方: Popup
  // 接收方: Background Script (BackgroundService)
  CLEAR_LOGS: 'CLEAR_LOGS',
};

// Background Script 到 Popup 的消息类型
export const BACKGROUND_TO_POPUP = {
  // 日志消息转发
  // 发送方: Background Script (BackgroundService)
  // 接收方: Popup
  LOG_MESSAGE: 'POPUP_LOG_MESSAGE',

  // 进度更新转发
  // 发送方: Background Script (BackgroundService)
  // 接收方: Popup
  PROGRESS_UPDATE: 'POPUP_PROGRESS_UPDATE',

  // 清理完成消息转发
  // 发送方: Background Script (BackgroundService)
  // 接收方: Popup
  CLEANUP_COMPLETE: 'POPUP_CLEANUP_COMPLETE',
};

// Content Script 内部使用的消息类型
export const CONTENT_INTERNAL = {
  // 推文类型消息
  // 发送方: TweetDetector
  // 接收方: Content Script (TwitterCleaner)
  TWEET: 'TWEET',
  RETWEET: 'RETWEET',
  REPLY: 'REPLY',
  QUOTE: 'QUOTE',
};
