/**
 * Logger Utility
 * 提供统一的日志记录功能
 */
export class Logger {
  constructor(component = 'Unknown') {
    this.component = component;
    this.logLevel = 'info'; // debug, info, warning, error
    this.enableConsole = true;
    this.enableStorage = false;
  }

  /**
   * 设置日志级别
   * @param {string} level - 日志级别
   */
  setLogLevel(level) {
    this.logLevel = level;
  }

  /**
   * 启用或禁用控制台输出
   * @param {boolean} enabled - 是否启用
   */
  setConsoleEnabled(enabled) {
    this.enableConsole = enabled;
  }

  /**
   * 启用或禁用存储输出
   * @param {boolean} enabled - 是否启用
   */
  setStorageEnabled(enabled) {
    this.enableStorage = enabled;
  }

  /**
   * 记录调试信息
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  /**
   * 记录一般信息
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  info(message, ...args) {
    this.log('info', message, ...args);
  }

  /**
   * 记录警告信息
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  warning(message, ...args) {
    this.log('warning', message, ...args);
  }

  /**
   * 记录错误信息
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  error(message, ...args) {
    this.log('error', message, ...args);
  }

  /**
   * 内部日志记录方法
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  log(level, message, ...args) {
    // 检查日志级别
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component: this.component,
      message,
      args: args.length > 0 ? args : undefined,
    };

    // 控制台输出
    if (this.enableConsole) {
      this.logToConsole(level, message, ...args);
    }

    // 存储输出
    if (this.enableStorage) {
      this.logToStorage(logEntry);
    }
  }

  /**
   * 检查是否应该记录该级别的日志
   * @param {string} level - 日志级别
   * @returns {boolean} 是否应该记录
   */
  shouldLog(level) {
    const levels = {
      debug: 0,
      info: 1,
      warning: 2,
      error: 3,
    };

    return levels[level] >= levels[this.logLevel];
  }

  /**
   * 输出到控制台
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  logToConsole(level, message, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${this.component}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warning':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
      default:
        console.log(prefix, message, ...args);
    }
  }

  /**
   * 保存到存储
   * @param {Object} logEntry - 日志条目
   */
  async logToStorage(logEntry) {
    try {
      // 获取现有日志
      const result = await chrome.storage.local.get('logs');
      const logs = result.logs || [];

      // 添加新日志
      logs.push(logEntry);

      // 限制日志数量
      const maxLogs = 1000;
      if (logs.length > maxLogs) {
        logs.splice(0, logs.length - maxLogs);
      }

      // 保存日志
      await chrome.storage.local.set({ logs });
    } catch (error) {
      console.error('保存日志到存储失败:', error);
    }
  }

  /**
   * 获取所有日志
   * @returns {Promise<Array>} 日志数组
   */
  async getLogs() {
    try {
      const result = await chrome.storage.local.get('logs');
      return result.logs || [];
    } catch (error) {
      console.error('获取日志失败:', error);
      return [];
    }
  }

  /**
   * 清除所有日志
   */
  async clearLogs() {
    try {
      await chrome.storage.local.remove('logs');
    } catch (error) {
      console.error('清除日志失败:', error);
    }
  }

  /**
   * 创建带性能监控的日志
   * @param {string} operation - 操作名称
   * @param {Function} fn - 要执行的函数
   * @returns {Promise<any>} 函数执行结果
   */
  async time(operation, fn) {
    const startTime = performance.now();

    try {
      this.debug(`开始操作: ${operation}`);

      const result = await fn();

      const endTime = performance.now();
      const duration = endTime - startTime;

      this.info(`操作完成: ${operation} (${duration.toFixed(2)}ms)`);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.error(`操作失败: ${operation} (${duration.toFixed(2)}ms)`, error);

      throw error;
    }
  }
}

/**
 * 日志级别枚举
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
};

/**
 * 创建日志实例的工厂函数
 * @param {string} component - 组件名称
 * @returns {Logger} 日志实例
 */
export function createLogger(component) {
  return new Logger(component);
}

/**
 * 全局日志实例
 */
export const globalLogger = new Logger('Global');

/**
 * 设置全局日志配置
 * @param {Object} config - 配置对象
 */
export function configureGlobalLogger(config) {
  if (config.level) {
    globalLogger.setLogLevel(config.level);
  }
  if (config.enableConsole !== undefined) {
    globalLogger.setConsoleEnabled(config.enableConsole);
  }
  if (config.enableStorage !== undefined) {
    globalLogger.setStorageEnabled(config.enableStorage);
  }
}
