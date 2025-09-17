# Twitter Cleaner Chrome 扩展架构方案

## 1. 项目概述

### 1.1 项目背景
目前 Twitter Cleaner 已实现 MVP 版本，通过控制台脚本形式提供推文清理功能。为了提升用户体验并扩大用户群体，需要将其转换为 Chrome 扩展程序。

### 1.2 架构目标
- **用户体验**: 提供直观的图形界面，无需技术背景即可使用
- **功能完整性**: 保持原有脚本的所有核心功能
- **可维护性**: 采用模块化设计，便于后续维护和扩展
- **安全性**: 遵循 Chrome Extension 安全最佳实践

### 1.3 设计原则
- 模块化架构，职责清晰
- 消息驱动，松耦合设计
- 状态管理集中化
- 错误处理完善化
- 用户体验友好化

## 2. 整体架构设计

### 2.1 系统架构图
```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                          │
├─────────────────────────────────────────────────────────────┤
│  Popup (popup.html/popup.js)                                │
│  ├── 用户设置界面                                            │
│  ├── 控制面板                                                │
│  └── 进度显示                                                │
├─────────────────────────────────────────────────────────────┤
│  Content Script (content.js)                               │
│  ├── Twitter 页面交互                                       │
│  ├── 推文识别和删除逻辑                                     │
│  └── 消息通信                                               │
├─────────────────────────────────────────────────────────────┤
│  Background Script (background.js)                         │
│  ├── 状态管理                                               │
│  ├── 消息中转                                               │
│  └── 权限管理                                               │
├─────────────────────────────────────────────────────────────┤
│  Storage (chrome.storage)                                  │
│  ├── 用户配置                                               │
│  └── 执行状态                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 核心模块说明

#### 2.2.1 Popup 模块
**职责**: 用户界面和配置管理
- 提供日期选择器组件
- 推文类型选择器（推文、转推、回复、引用）
- 启动/停止控制按钮
- 实时进度显示（已处理、已删除、跳过、错误数量）
- 执行日志展示
- 用户配置管理
- 高级设置面板（删除间隔、滚动间隔、最大处理数量、调试模式）
- 当前操作状态显示

**技术实现**:
- 使用原生 HTML/CSS/JavaScript
- 响应式设计，适配不同屏幕尺寸
- 使用 Chrome Storage API 保存配置
- 消息通信机制与 Content Script 和 Background Script 交互

#### 2.2.2 Content Script 模块
**职责**: 在 Twitter 页面执行清理操作
- 推文元素识别和分类
- 不同类型推文的删除策略
- 自动滚动加载更多推文
- 进度状态同步
- 错误处理和恢复
- 连续空页面检测停止机制
- 推文去重处理

**技术实现**:
- 基于现有 cleaner.js 逻辑重构
- 使用 TweetDetector 类进行推文识别和分类
- 使用 TweetDeleter 类执行不同类型的删除操作
- 实现智能滚动和元素定位
- 优化删除操作的成功率
- 批量处理机制，避免一次性处理过多推文

#### 2.2.3 Background Script 模块
**职责**: 后台状态管理和消息中转
- 扩展状态管理
- 消息路由和分发
- 权限管理
- 存储访问控制
- 日志管理（存储和清理）
- 扩展生命周期管理（安装、更新、启动）

**技术实现**:
- Chrome Extension Service Worker
- 消息通信管理
- 状态持久化
- 错误监控
- 定期清理过期数据
- 标签页状态管理

#### 2.2.4 Storage 模块
**职责**: 用户配置和执行状态持久化
- 用户设置存储
- 执行状态缓存
- 日志存储
- 过期数据清理

**技术实现**:
- Chrome Storage API
- 数据结构设计
- 缓存策略
- 数据同步机制
- 定期清理过期日志（超过3天）

## 3. 数据流设计

### 3.1 消息通信架构
```
用户操作 → Popup → Background → Content Script → Twitter DOM
   ↑                                              ↓
   ←────────────── 状态同步 ←──────────────────────
```

### 3.2 消息类型定义

#### 3.2.1 控制消息
```javascript
// Popup → Content Script
{
  type: 'START_CLEANING',
  payload: {
    cutoffDate: '2025-08-01',
    tweetTypes: ['TWEET', 'RETWEET', 'REPLY', 'QUOTE'],
    deleteDelay: 2000,
    scrollDelay: 3000,
    maxTweets: 10000,
    maxScrollAttempts: 50,
    emptyPageStopThreshold: 5,
    debugMode: false
  }
}

// 停止清理
{
  type: 'STOP_CLEANING',
  payload: {}
}
```

#### 3.2.2 状态消息
```javascript
// Content Script → Background Script → Popup (转发)
{
  type: 'CONTENT_PROGRESS_UPDATE',
  payload: {
    stats: {
      processed: 100,
      deleted: 85,
      skipped: 10,
      errors: 5,
      scrollAttempts: 3,
      totalElements: 0
    },
    currentTweet: {
      id: '123456789',
      type: 'TWEET',
      date: '2025-07-15T12:00:00Z',
      text: '推文内容预览...',
      element: '[object HTMLElement]'
    }
  }
}

// 日志消息
{
  type: 'CONTENT_LOG_MESSAGE',
  payload: {
    level: 'info',
    message: '处理进度信息',
    component: 'ContentScript',
    timestamp: '2025-01-01T12:00:00Z'
  }
}

// 清理完成消息
{
  type: 'CONTENT_CLEANUP_COMPLETE',
  payload: {
    stats: {
      processed: 100,
      deleted: 85,
      skipped: 10,
      errors: 5,
      scrollAttempts: 3,
      totalElements: 0
    }
  }
}
```

#### 3.2.3 配置和状态消息
```javascript
// Popup → Background Script (获取扩展状态)
{
  type: 'GET_EXTENSION_STATUS',
  payload: {}
}

// Popup → Background Script (获取配置)
{
  type: 'GET_CONFIG',
  payload: {}
}

// Popup → Background Script (保存配置)
{
  type: 'SAVE_CONFIG',
  payload: {
    cutoffDate: '2025-08-01',
    tweetTypes: ['TWEET', 'RETWEET'],
    deleteDelay: 2000,
    scrollDelay: 3000,
    maxTweets: 10000,
    maxScrollAttempts: 50,
    emptyPageStopThreshold: 5,
    debugMode: false
  }
}

// Popup → Background Script (获取日志)
{
  type: 'GET_LOGS',
  payload: {}
}

// Popup → Background Script (清除日志)
{
  type: 'CLEAR_LOGS',
  payload: {}
}
```

## 4. 技术实现方案

### 4.1 Manifest V3 配置
```json
{
  "manifest_version": 3,
  "name": "Twitter Cleaner",
  "version": "1.0.0",
  "description": "批量清理 Twitter 历史推文的 Chrome 扩展",
  "author": "Twitter Cleaner Team",
  "homepage_url": "https://github.com/yourusername/twitter-cleaner",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "*://*.twitter.com/*",
    "*://*.x.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Twitter Cleaner",
    "default_icon": {
      "16": "assets/icons/icon16.svg",
      "48": "assets/icons/icon48.svg",
      "128": "assets/icons/icon128.svg"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.twitter.com/*",
        "*://*.x.com/*"
      ],
      "js": [
        "content.js"
      ],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "assets/icons/icon16.svg",
    "48": "assets/icons/icon48.svg",
    "128": "assets/icons/icon128.svg"
  },
  "web_accessible_resources": [
    {
      "resources": [
        "assets/*"
      ],
      "matches": [
        "*://*.twitter.com/*",
        "*://*.x.com/*"
      ]
    }
  ]
}
```

### 4.2 核心代码结构

#### 4.2.1 Popup 界面结构
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Twitter Cleaner</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <!-- 头部 -->
    <div class="header">
      <h1>Twitter Cleaner</h1>
      <p class="subtitle">批量清理 Twitter 历史推文</p>
    </div>

    <!-- 设置区域 -->
    <div class="card">
      <h3 class="card-title">
        <span>⚙️</span>
        清理设置
      </h3>

      <!-- 截止日期 -->
      <div class="form-group">
        <label for="cutoffDate">📅 截止日期</label>
        <input type="date" id="cutoffDate" name="cutoffDate">
        <small>删除此日期之前的所有推文</small>
      </div>

      <!-- 推文类型 -->
      <div class="form-group">
        <label>🗨️ 推文类型</label>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" name="tweetTypes" value="TWEET" checked>
            <span class="checkmark"></span>
            推文
          </label>
          <label class="checkbox-label">
            <input type="checkbox" name="tweetTypes" value="RETWEET" checked>
            <span class="checkmark"></span>
            转推
          </label>
          <label class="checkbox-label">
            <input type="checkbox" name="tweetTypes" value="REPLY" checked>
            <span class="checkmark"></span>
            回复
          </label>
          <label class="checkbox-label">
            <input type="checkbox" name="tweetTypes" value="QUOTE" checked>
            <span class="checkmark"></span>
            引用
          </label>
        </div>
      </div>

      <!-- 高级设置 -->
      <div class="form-group">
        <button type="button" id="advancedToggle" class="btn-link">
          <span>🔧 高级设置</span>
          <span>▼</span>
        </button>
        <div id="advancedSettings" class="advanced-settings" style="display: none;">
          <div class="setting-item">
            <label for="deleteDelay">⏱️ 删除间隔 (毫秒)</label>
            <input type="number" id="deleteDelay" value="2000" min="500" max="10000">
          </div>
          <div class="setting-item">
            <label for="scrollDelay">🖱️ 滚动间隔 (毫秒)</label>
            <input type="number" id="scrollDelay" value="3000" min="1000" max="10000">
          </div>
          <div class="setting-item">
            <label for="maxTweets">📊 最大处理数量</label>
            <input type="number" id="maxTweets" value="10000" min="100" max="50000">
          </div>
          <div class="setting-item">
            <label class="checkbox-label">
              <input type="checkbox" id="debugMode">
              <span class="checkmark"></span>
              🐞 调试模式
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- 控制区域 -->
    <div class="control-section">
      <button id="startBtn" class="btn btn-primary">
        <span class="btn-icon">▶</span>
        开始清理
      </button>
      <button id="stopBtn" class="btn btn-danger" disabled>
        <span class="btn-icon">⏸</span>
        停止清理
      </button>
    </div>

    <!-- 状态区域 -->
    <div class="card status-section">
      <h3 class="card-title">
        <span>📊</span>
        执行状态
      </h3>

      <!-- 进度信息 -->
      <div class="progress-info">
        <div class="progress-item">
          <span class="label">已处理</span>
          <span class="value" id="processedCount">0</span>
        </div>
        <div class="progress-item">
          <span class="label">已删除</span>
          <span class="value" id="deletedCount">0</span>
        </div>
        <div class="progress-item">
          <span class="label">跳过</span>
          <span class="value" id="skippedCount">0</span>
        </div>
        <div class="progress-item">
          <span class="label">错误</span>
          <span class="value" id="errorsCount">0</span>
        </div>
      </div>

      <!-- 当前操作 -->
      <div class="current-operation" id="currentOperation">
        <span class="operation-text">准备就绪</span>
      </div>

      <!-- 日志区域 -->
      <div class="log-section">
        <div class="log-header">
          <h4>
            <span>📋</span>
            执行日志
          </h4>
          <button id="clearLogBtn" class="btn-link">清除日志</button>
        </div>
        <div id="logContainer" class="log-container"></div>
      </div>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

#### 4.2.2 Content Script 核心逻辑
```javascript
// content.js
import { TweetDetector } from './tweet-detector.js';
import { TweetDeleter } from './deleter.js';
import { StorageManager } from '../utils/storage.js';
import { MessageManager } from '../utils/messaging.js';
import {
  POPUP_TO_CONTENT,
  CONTENT_TO_BACKGROUND,
} from '../utils/message-types.js';
import { Logger, createLogger } from '../utils/logger.js';

class TwitterCleaner {
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

  setupMessageHandlers() {
    // 开始清理
    this.messaging.registerHandler(
      POPUP_TO_CONTENT.START_CLEANING,
      async (payload) => {
        this.startCleaning(payload);
      }
    );

    // 停止清理
    this.messaging.registerHandler(
      POPUP_TO_CONTENT.STOP_CLEANING,
      async (payload) => {
        this.stopCleaning();
      }
    );
  }

  async startCleaning(config = {}) {
    if (this.isRunning) {
      this.logger.info('清理已在进行中');
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

      // 重置全局状态
      this.processedTweetIds.clear();
      this.currentBatch = [];

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

  async stopCleaning() {
    if (!this.isRunning) {
      this.logger.info('清理未在进行中');
      return;
    }

    try {
      this.logger.info('停止清理');
      this.shouldStop = true;
      this.isRunning = false;

      // 发送状态更新
      await this.sendStatusUpdate();
    } catch (error) {
      this.logger.error('停止清理失败:', error);
    }
  }

  async cleanupTweets() {
    this.logger.info('开始执行清理循环');

    // 滚动到页面顶部
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    // 等待滚动完成
    await this.sleep(1000);

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
          const message1 = `页面无推文，尝试滚动加载 (${consecutiveEmptyPages}/${this.config.emptyPageStopThreshold})`;
          this.logger.info(message1);
          await this.sendLog('info', message1);

          if (consecutiveEmptyPages >= this.config.emptyPageStopThreshold) {
            const message2 = '连续多次页面为空，可能账号无内容，停止清理';
            this.logger.info(message2);
            await this.sendLog('info', message2);
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

  // 其他核心方法...
}
```

### 4.3 数据结构设计

#### 4.3.1 用户配置结构
```javascript
const userConfig = {
  // 基础设置
  cutoffDate: '2025-08-01',
  tweetTypes: ['TWEET', 'RETWEET', 'REPLY', 'QUOTE'],

  // 高级设置
  deleteDelay: 2000,
  scrollDelay: 3000,
  maxTweets: 10000,
  maxScrollAttempts: 50,
  emptyPageStopThreshold: 5,
  debugMode: false
};
```

#### 4.3.2 执行状态结构
```javascript
const executionState = {
  isRunning: false,
  stats: {
    processed: 0,
    deleted: 0,
    skipped: 0,
    errors: 0,
    scrollAttempts: 0,
    totalElements: 0
  },
  currentTweet: {
    id: '',
    type: '',
    date: '',
    text: '',
    element: '[object HTMLElement]'
  }
};
```

## 5. 安全性设计

### 5.1 权限最小化
- 只请求必要的权限（storage, activeTab, scripting）
- 限制域名范围（*.twitter.com, *.x.com）
- 不访问用户敏感数据

### 5.2 数据安全
- 所有操作在用户本地浏览器完成
- 不上传任何用户数据到外部服务器
- 使用 Chrome Storage API 进行本地存储
- 配置数据存储在用户本地，不进行加密存储

### 5.3 操作安全
- 明确的用户授权流程
- 可随时停止清理操作
- 操作前确认机制
- 详细的操作日志记录

## 6. 性能优化

### 6.1 内存管理
- 避免内存泄漏，及时清理引用
- 批量处理机制，避免一次性处理过多推文
- 使用 WeakMap 管理临时数据

### 6.2 执行效率
- 异步处理，避免阻塞主线程
- 智能滚动，减少不必要的页面操作
- 缓存机制，避免重复计算

### 6.3 用户体验
- 提供实时进度反馈
- 响应式设计，适配不同屏幕
- 平滑的动画效果
- 清晰的错误提示

## 7. 开发计划

### 7.1 开发阶段

#### 第一阶段：基础框架（已完成）
- [x] 创建 Chrome Extension 基础结构
- [x] 实现 Popup 界面
- [x] 搭建消息通信框架
- [x] 实现基础配置管理

#### 第二阶段：核心功能（已完成）
- [x] 移植推文识别逻辑
- [x] 实现删除操作功能
- [x] 添加进度跟踪功能
- [x] 完善错误处理机制

#### 第三阶段：高级功能（已完成）
- [x] 实现自动滚动功能
- [x] 添加连续空页面检测停止机制
- [x] 优化用户界面
- [x] 添加高级设置面板

#### 第四阶段：测试优化（进行中）
- [ ] 全面的功能测试
- [ ] 性能优化
- [ ] 用户体验优化
- [ ] 准备发布

### 7.2 技术风险控制

#### 7.2.1 Twitter 网站结构变化
- 建立选择器配置化机制
- 定期更新适配规则
- 提供兼容性检查功能

#### 7.2.2 Chrome 扩展政策变更
- 持续关注政策更新
- 遵循开发最佳实践
- 保持代码的可维护性

#### 7.2.3 性能问题
- 实现批处理和延迟机制
- 添加性能监控
- 提供配置选项调整性能

## 8. 测试策略

### 8.1 单元测试
- 测试核心功能模块
- 验证推文识别准确性
- 测试删除操作逻辑
- 验证配置管理功能

### 8.2 集成测试
- 测试消息通信机制
- 验证状态同步功能
- 测试数据持久化
- 验证错误处理流程

### 8.3 端到端测试
- 完整的用户操作流程测试
- 不同场景的功能测试
- 性能和稳定性测试
- 用户体验测试

### 8.4 兼容性测试
- 不同 Chrome 版本测试
- 不同操作系统测试
- 不同屏幕尺寸测试
- 多语言环境测试

## 9. 部署和发布

### 9.1 打包和签名
- 生成扩展包文件
- 准备应用商店素材
- 编写发布说明
- 准备隐私政策

### 9.2 应用商店发布
- Chrome Web Store 发布
- 应用描述和截图
- 用户评价管理
- 版本更新维护

### 9.3 后续维护
- 定期更新适配规则
- 修复用户反馈问题
- 添加新功能
- 性能优化

## 10. 总结

本架构方案将现有的控制台脚本转换为用户友好的 Chrome 扩展，保持了原有功能的同时大幅提升了用户体验。采用模块化设计便于后续维护和功能扩展，符合 Chrome Extension 开发最佳实践。

主要优势：
- **用户体验**: 直观的图形界面，无需技术背景
- **功能完整**: 保留所有核心功能，支持高级配置
- **架构清晰**: 模块化设计，职责明确
- **安全可靠**: 遵循安全最佳实践，保护用户隐私
- **易于维护**: 标准化的开发流程，便于后续迭代

建议按照优先级分阶段开发，先实现核心功能，再逐步完善高级特性，确保产品质量和用户体验。