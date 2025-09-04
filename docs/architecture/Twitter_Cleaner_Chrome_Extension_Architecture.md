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
- 实时进度显示
- 执行日志展示
- 用户配置管理

**技术实现**:
- 使用原生 HTML/CSS/JavaScript 或 React
- 响应式设计，适配不同屏幕尺寸
- 支持深色模式
- 使用 Chrome Storage API 保存配置

#### 2.2.2 Content Script 模块
**职责**: 在 Twitter 页面执行清理操作
- 推文元素识别和分类
- 不同类型推文的删除策略
- 自动滚动加载更多推文
- 进度状态同步
- 错误处理和恢复

**技术实现**:
- 基于现有 cleaner.js 逻辑重构
- 使用 MutationObserver 监听页面变化
- 实现智能滚动和元素定位
- 优化删除操作的成功率

#### 2.2.3 Background Script 模块
**职责**: 后台状态管理和消息中转
- 扩展状态管理
- 消息路由和分发
- 权限管理
- 存储访问控制

**技术实现**:
- Chrome Extension Service Worker
- 消息通信管理
- 状态持久化
- 错误监控

#### 2.2.4 Storage 模块
**职责**: 用户配置和执行状态持久化
- 用户设置存储
- 执行状态缓存
- 历史记录管理

**技术实现**:
- Chrome Storage API
- 数据结构设计
- 缓存策略
- 数据同步机制

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
    config: {
      deleteDelay: 2000,
      scrollDelay: 3000,
      maxTweets: 10000,
      debug: true
    }
  }
}

// 停止清理
{
  type: 'STOP_CLEANING',
  payload: {}
}

// 获取状态
{
  type: 'GET_STATUS',
  payload: {}
}
```

#### 3.2.2 状态消息
```javascript
// Content Script → Popup
{
  type: 'PROGRESS_UPDATE',
  payload: {
    processed: 100,
    deleted: 85,
    skipped: 10,
    errors: 5,
    isRunning: true,
    currentTweet: {
      id: '123456789',
      type: 'TWEET',
      date: '2025-07-15',
      text: '推文内容预览...'
    }
  }
}

// 日志消息
{
  type: 'LOG_MESSAGE',
  payload: {
    level: 'info|success|warning|error|debug',
    message: '处理进度信息',
    timestamp: '2025-01-01T12:00:00Z'
  }
}
```

#### 3.2.3 配置消息
```javascript
// 保存配置
{
  type: 'SAVE_CONFIG',
  payload: {
    cutoffDate: '2025-08-01',
    tweetTypes: ['TWEET', 'RETWEET'],
    advancedConfig: {
      deleteDelay: 2000,
      scrollDelay: 3000,
      maxTweets: 10000,
      debug: false
    }
  }
}

// 加载配置
{
  type: 'LOAD_CONFIG',
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
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["*://*.twitter.com/*", "*://*.x.com/*"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["assets/*"],
      "matches": ["*://*.twitter.com/*", "*://*.x.com/*"]
    }
  ]
}
```

### 4.2 核心代码结构

#### 4.2.1 Popup 界面结构
```javascript
// popup.html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Twitter Cleaner</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <!-- 设置区域 -->
    <div class="settings-section">
      <h3>清理设置</h3>
      <div class="form-group">
        <label>截止日期</label>
        <input type="date" id="cutoffDate">
      </div>
      <div class="form-group">
        <label>推文类型</label>
        <div class="checkbox-group">
          <label><input type="checkbox" value="TWEET" checked> 推文</label>
          <label><input type="checkbox" value="RETWEET" checked> 转推</label>
          <label><input type="checkbox" value="REPLY" checked> 回复</label>
          <label><input type="checkbox" value="QUOTE" checked> 引用</label>
        </div>
      </div>
    </div>

    <!-- 控制区域 -->
    <div class="control-section">
      <button id="startBtn" class="btn btn-primary">开始清理</button>
      <button id="stopBtn" class="btn btn-danger" disabled>停止清理</button>
    </div>

    <!-- 状态区域 -->
    <div class="status-section">
      <div class="progress-info">
        <div class="progress-item">
          <span>已处理:</span>
          <span id="processedCount">0</span>
        </div>
        <div class="progress-item">
          <span>已删除:</span>
          <span id="deletedCount">0</span>
        </div>
        <div class="progress-item">
          <span>跳过:</span>
          <span id="skippedCount">0</span>
        </div>
        <div class="progress-item">
          <span>错误:</span>
          <span id="errorsCount">0</span>
        </div>
      </div>
      
      <!-- 进度条 -->
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>

      <!-- 日志区域 -->
      <div class="log-section">
        <h4>执行日志</h4>
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
class TwitterCleaner {
  constructor() {
    this.config = {
      cutoffDate: new Date('2025-08-01'),
      tweetTypes: ['TWEET', 'RETWEET', 'REPLY', 'QUOTE'],
      deleteDelay: 2000,
      scrollDelay: 3000,
      maxTweets: 10000,
      debug: false
    };
    
    this.stats = {
      processed: 0,
      deleted: 0,
      skipped: 0,
      errors: 0,
      scrollAttempts: 0
    };
    
    this.isRunning = false;
    this.processedTweetIds = new Set();
    this.currentBatch = [];
    
    this.init();
  }

  init() {
    // 监听来自 popup 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
    });
  }

  handleMessage(message, sendResponse) {
    switch (message.type) {
      case 'START_CLEANING':
        this.startCleaning(message.payload);
        break;
      case 'STOP_CLEANING':
        this.stopCleaning();
        break;
      case 'GET_STATUS':
        sendResponse({
          isRunning: this.isRunning,
          stats: this.stats,
          config: this.config
        });
        break;
    }
  }

  async startCleaning(config) {
    if (this.isRunning) return;
    
    this.config = { ...this.config, ...config };
    this.isRunning = true;
    this.resetStats();
    
    this.sendStatusUpdate();
    
    try {
      await this.cleanupTweets();
    } catch (error) {
      this.log(`清理过程出错: ${error.message}`, 'error');
    } finally {
      this.isRunning = false;
      this.sendStatusUpdate();
    }
  }

  stopCleaning() {
    this.isRunning = false;
    this.log('清理已停止', 'warning');
  }

  // 其他核心方法基于现有 cleaner.js 重构...
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
  advancedConfig: {
    deleteDelay: 2000,
    scrollDelay: 3000,
    maxTweets: 10000,
    maxScrollAttempts: 50,
    emptyPageStopThreshold: 5,
    debug: false
  },
  
  // 界面设置
  uiConfig: {
    darkMode: false,
    autoScroll: true,
    showProgress: true,
    logLevel: 'info'
  }
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
    text: ''
  },
  startTime: null,
  endTime: null,
  logs: []
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
- 实现数据加密存储敏感配置

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

#### 第一阶段：基础框架（2周）
- [ ] 创建 Chrome Extension 基础结构
- [ ] 实现 Popup 界面
- [ ] 搭建消息通信框架
- [ ] 实现基础配置管理

#### 第二阶段：核心功能（3周）
- [ ] 移植推文识别逻辑
- [ ] 实现删除操作功能
- [ ] 添加进度跟踪功能
- [ ] 完善错误处理机制

#### 第三阶段：高级功能（2周）
- [ ] 实现自动滚动功能
- [ ] 添加历史记录功能
- [ ] 优化用户界面
- [ ] 添加深色模式支持

#### 第四阶段：测试优化（1周）
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