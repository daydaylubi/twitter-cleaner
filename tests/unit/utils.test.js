/**
 * Basic tests for utility functions
 */

import { StorageManager } from '../../src/utils/storage.js';
import { MessageManager } from '../../src/utils/messaging.js';
import { Logger, createLogger } from '../../src/utils/logger.js';

// Mock Chrome APIs
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  }
};

describe('Utility Functions', () => {
  describe('StorageManager', () => {
    let storageManager;

    beforeEach(() => {
      storageManager = new StorageManager();
      jest.clearAllMocks();
    });

    test('should create StorageManager instance', () => {
      expect(storageManager).toBeInstanceOf(StorageManager);
    });

    test('should get default config', () => {
      const defaultConfig = storageManager.getDefaultConfig();
      expect(defaultConfig).toHaveProperty('cutoffDate');
      expect(defaultConfig).toHaveProperty('tweetTypes');
      expect(defaultConfig).toHaveProperty('deleteDelay');
    });

    test('should get default progress', () => {
      const defaultProgress = storageManager.getDefaultProgress();
      expect(defaultProgress).toHaveProperty('processed');
      expect(defaultProgress).toHaveProperty('deleted');
      expect(defaultProgress).toHaveProperty('skipped');
      expect(defaultProgress).toHaveProperty('errors');
    });
  });

  describe('Logger', () => {
    let logger;

    beforeEach(() => {
      logger = new Logger('Test');
      console.log = jest.fn();
      console.info = jest.fn();
      console.warn = jest.fn();
      console.error = jest.fn();
      console.debug = jest.fn();
    });

    test('should create Logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    test('should log info messages', () => {
      logger.info('Test message');
      expect(console.info).toHaveBeenCalled();
    });

    test('should log error messages', () => {
      logger.error('Test error');
      expect(console.error).toHaveBeenCalled();
    });

    test('should respect log level', () => {
      logger.setLogLevel('error');
      logger.info('This should not be logged');
      logger.error('This should be logged');
      expect(console.info).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('MessageManager', () => {
    let messageManager;

    beforeEach(() => {
      messageManager = new MessageManager();
      jest.clearAllMocks();
    });

    test('should create MessageManager instance', () => {
      expect(messageManager).toBeInstanceOf(MessageManager);
    });

    test('should register message handlers', () => {
      const handler = jest.fn();
      messageManager.registerHandler('TEST', handler);
      expect(messageManager.messageHandlers.has('TEST')).toBe(true);
    });
  });
});

describe('Chrome Extension APIs', () => {
  test('should have Chrome APIs available', () => {
    expect(chrome).toBeDefined();
    expect(chrome.runtime).toBeDefined();
    expect(chrome.storage).toBeDefined();
    expect(chrome.tabs).toBeDefined();
  });

  test('should mock Chrome API methods', () => {
    chrome.runtime.sendMessage({ type: 'test' });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'test' });
  });
});