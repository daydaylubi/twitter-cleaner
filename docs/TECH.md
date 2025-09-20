# Twitter Cleaner 技术文档 (TECH)

## 技术架构

### 整体架构
Twitter Cleaner 采用 Chrome Extension Manifest V3 架构，基于现代 Web 技术栈构建，使用模块化设计确保代码的可维护性和可扩展性。

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Popup UI      │    │  Background     │    │  Content Script │
│   (用户界面)     │    │  (后台服务)      │    │  (页面操作)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Utils Layer    │
                    │  (工具层)        │
                    └─────────────────┘
```

**实际消息流向**:
- Popup ↔ Content Script (直接通信)
- Popup ↔ Background (配置和状态管理)
- Content Script → Background (日志和进度报告)
- Background → Popup (状态转发)

### 技术栈
- **前端框架**: 原生 JavaScript ES6+ 模块
- **构建工具**: Webpack 5
- **代码规范**: ESLint + Prettier
- **浏览器支持**: Chrome 88+
- **依赖管理**: npm

## 核心模块

### 1. Popup 模块 (`src/popup/`)

#### 功能职责
- 提供用户交互界面
- 管理用户配置
- 显示实时状态和日志
- 控制清理过程的开始和停止

#### 核心文件
- `popup.html`: 用户界面结构
- `popup.css`: 样式定义
- `popup.js`: 交互逻辑和状态管理

#### 关键类
```
class PopupManager {
  constructor() {
    this.storage = new StorageManager();
    this.messaging = new MessageManager();
    this.logger = new Logger('Popup');
  }
}
```

#### 主要功能
- **配置管理**: 保存和加载用户设置
- **状态监控**: 实时显示清理进度
- **消息处理**: 与 Background 和 Content Script 通信
- **UI 控制**: 管理界面元素的显示和交互

### 2. Background 模块 (`src/background/`)

#### 功能职责
- 管理扩展生命周期
- 处理跨组件消息传递
- 管理标签页状态
- 提供数据存储服务

#### 核心文件
- `background.js`: 后台服务主逻辑

#### 关键类
```
class BackgroundService {
  constructor() {
    this.logger = createLogger('Background');
    this.storage = new StorageManager();
    this.messaging = new MessageManager();
    this.activeTabs = new Map();
  }
}
```
#### 主要功能
- **消息路由**: 转发各组件间的消息
- **状态管理**: 维护扩展和标签页状态
- **数据持久化**: 管理配置和日志存储
- **生命周期管理**: 处理扩展的启动和关闭

### 3. Content Script 模块 (`src/content/`)

#### 功能职责
- 在 Twitter 页面中执行清理操作
- 检测和分类推文
- 执行删除操作
- 管理页面滚动和加载

#### 核心文件
- `content.js`: 主清理逻辑
- `tweet-detector.js`: 推文检测和分类
- `deleter.js`: 推文删除操作

#### 关键类
```
class TwitterCleaner {
  constructor() {
    this.detector = new TweetDetector();
    this.deleter = new TweetDeleter();
    this.messaging = new MessageManager();
  }
}

class TweetDetector {
  // 推文检测和分类逻辑
}

class TweetDeleter {
  // 推文删除操作逻辑
}
```

#### 主要功能
- **推文检测**: 识别页面中的推文元素
- **类型分类**: 判断推文类型（原创、转推、回复、引用）
- **删除操作**: 执行具体的删除操作
- **页面管理**: 控制页面滚动和内容加载

### 4. Utils 模块 (`src/utils/`)

#### 功能职责
- 提供通用工具函数
- 管理消息传递
- 处理数据存储
- 提供日志服务

#### 核心文件
- `messaging.js`: 消息传递管理
- `storage.js`: 数据存储管理
- `logger.js`: 日志服务
- `message-types.js`: 消息类型定义

#### 关键类
```
class MessageManager {
  // 消息传递管理
}

class StorageManager {
  // 数据存储管理
}

class Logger {
  // 日志服务
}
```
## 消息传递架构

### 通信路径

#### 1. 直接通信
- **Popup ↔ Content Script**: 使用 `chrome.tabs.sendMessage()` 直接通信
  - 开始/停止清理指令
  - 配置参数传递

#### 2. 间接通信（通过 Background）
- **Content Script → Background → Popup**: 日志和进度报告
  - Content Script 发送进度更新到 Background
  - Background 转发到 Popup 显示

#### 3. 配置管理
- **Popup ↔ Background**: 配置存储和获取
  - 用户设置保存和加载
  - 扩展状态查询

### 消息类型
- `POPUP_TO_CONTENT`: Popup 到 Content Script（直接）
- `CONTENT_TO_BACKGROUND`: Content Script 到 Background
- `POPUP_TO_BACKGROUND`: Popup 到 Background
- `BACKGROUND_TO_POPUP`: Background 到 Popup

### 消息处理机制
```javascript
// Popup 直接发送到 Content Script
await chrome.tabs.sendMessage(tabId, {
  type: POPUP_TO_CONTENT.START_CLEANING,
  payload: config
});

// Content Script 发送到 Background
await chrome.runtime.sendMessage({
  type: CONTENT_TO_BACKGROUND.PROGRESS_UPDATE,
  payload: stats
});

// Background 转发到 Popup
await chrome.runtime.sendMessage({
  type: BACKGROUND_TO_POPUP.PROGRESS_UPDATE,
  payload: stats
});
```
## 推文检测算法

### DOM 选择器策略
```
const selectors = {
  tweet: [
    '[data-testid="tweet"]',
    'article[data-testid="tweet"]',
    '[data-testid="cellInnerDiv"] article'
  ],
  timestamp: 'time[datetime]',
  tweetText: '[data-testid="tweetText"]',
  userName: '[data-testid="User-Name"]'
};
```
### 推文类型识别
1. **转推识别**: 检查转推按钮状态和文本指示器
2. **回复识别**: 检查回复按钮和文本指示器
3. **引用识别**: 检查引用按钮和文本指示器
4. **原创识别**: 排除上述类型后的推文

### 时间戳解析
```
const timestamp = element.querySelector('time[datetime]');
const date = new Date(timestamp.getAttribute('datetime'));
```
## 删除操作策略

### 删除方法映射
```
const deleteHandlers = {
  RETWEET: this.undoRetweet.bind(this),
  REPLY: this.deleteViaMenu.bind(this),
  TWEET: this.deleteViaMenu.bind(this),
  QUOTE: this.deleteViaMenu.bind(this)
};
```

### 转推取消流程
1. 定位转推按钮
2. 点击取消转推
3. 等待操作完成

### 菜单删除流程
1. 点击更多按钮
2. 等待菜单展开
3. 点击删除选项
4. 确认删除操作

## 性能优化

### 批量处理
```
// 分批处理推文，避免页面卡顿
const batchSize = 10;
const batches = this.chunkArray(tweets, batchSize);
```
### 智能滚动
```
// 检测页面高度变化，判断是否有新内容
const beforeScrollHeight = document.documentElement.scrollHeight;
// 执行滚动操作
const afterScrollHeight = document.documentElement.scrollHeight;
const hasNewContent = afterScrollHeight > beforeScrollHeight;
```
### 内存管理
```
// 清理已处理的推文 ID，避免重复处理
this.processedTweetIds.add(tweetId);

// 定期清理过期的处理记录
if (this.processedTweetIds.size > 10000) {
  this.processedTweetIds.clear();
}
```

## 错误处理

### 错误分类
1. **网络错误**: 请求超时、连接失败
2. **DOM 错误**: 元素不存在、结构变化
3. **操作错误**: 删除失败、权限不足
4. **系统错误**: 内存不足、浏览器限制

### 错误恢复策略
```
try {
  await this.deleteTweet(tweetElement, tweetType);
} catch (error) {
  this.logger.error('删除失败:', error);
  this.stats.errors++;
  
  // 错误次数过多时停止操作
  if (this.stats.errors > 10) {
    this.logger.error('错误次数过多，停止清理');
    break;
  }
}
```
## 配置管理

### 默认配置
```
const defaultConfig = {
  cutoffDate: new Date().toISOString().split('T')[0],
  tweetTypes: ['TWEET', 'RETWEET', 'REPLY', 'QUOTE'],
  deleteDelay: 2000,
  scrollDelay: 3000,
  maxTweets: 10000,
  maxScrollAttempts: 50,
  emptyPageStopThreshold: 5,
  debugMode: false
};
```

### 配置持久化
```
// 保存配置
await this.storage.saveConfig(config);

// 加载配置
const config = await this.storage.getConfig();
```

## 日志系统

### 日志级别
- `debug`: 调试信息
- `info`: 一般信息
- `warn`: 警告信息
- `error`: 错误信息

### 日志格式
```
{
  level: 'info',
  message: '推文删除成功',
  component: 'TweetDeleter',
  timestamp: '2024-01-01T00:00:00.000Z',
  args: { tweetId: '1234567890' }
}
```

### 日志存储
- 使用 Chrome Storage API 存储日志
- 支持日志查看和清理
- 自动限制日志数量，避免存储溢出

## 构建和部署

### 开发环境
```
# 安装依赖
npm install

# 开发模式构建
npm run dev

# 生产模式构建
npm run build
```

### 构建配置
- **Webpack**: 模块打包和代码转换
- **Babel**: ES6+ 代码转换
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化

### 打包发布
```
# 创建发布包
npm run package
```