import { createLogger } from '../utils/logger.js';

/**
 * Tweet Detector - 推文识别和分类模块
 * 基于现有 cleaner.js 的推文检测逻辑重构
 */
export class TweetDetector {
  constructor() {
    this.logger = createLogger('TweetDetector');
    
    // 推文类型枚举
    this.TweetType = {
      RETWEET: 'RETWEET',
      REPLY: 'REPLY',
      TWEET: 'TWEET',
      QUOTE: 'QUOTE'
    };
    
    // 选择器配置
    this.selectors = {
      tweet: [
        '[data-testid="tweet"]',
        'article[data-testid="tweet"]',
        '[data-testid="cellInnerDiv"] article'
      ],
      timestamp: 'time[datetime]',
      tweetText: '[data-testid="tweetText"]',
      userName: '[data-testid="User-Name"]',
      retweetButton: [
        '[data-testid="retweet"]',
        '[data-testid="unretweet"]',
        'button[data-testid="retweet"]',
        'div[data-testid="retweet"]'
      ],
      moreButton: [
        '[data-testid="caret"]',
        '[aria-label*="更多"]',
        '[aria-label*="More"]',
        'button[aria-haspopup="menu"]',
        'div[role="button"][aria-haspopup="menu"]'
      ]
    };
    
    // 转推指示器
    this.retweetIndicators = [
      'You reposted',
      'You Retweeted',
      '你转推了',
      '你转发了',
      '你已转帖',
      'reposted'
    ];
    
    // 回复指示器
    this.replyIndicators = [
      '回复',
      'Replying to',
      '你回复了',
      '你已回复'
    ];
    
    // 引用指示器
    this.quoteIndicators = [
      '引用',
      'Quote',
      'Quoted post',
      '引用推文'
    ];
    
    // 当前主页用户句柄
    this.currentProfileHandle = null;
    
    this.init();
  }

  init() {
    this.currentProfileHandle = this.getCurrentProfileHandle();
    this.logger.debug('TweetDetector 初始化完成', { currentProfileHandle: this.currentProfileHandle });
  }

  /**
   * 查找所有推文元素
   */
  findTweetElements() {
    try {
      let tweets = [];
      
      // 尝试不同的选择器
      for (const selector of this.selectors.tweet) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          tweets = elements;
          this.logger.debug(`找到 ${tweets.length} 条推文: ${selector}`);
          break;
        }
      }
      
      // 如果在用户主页，过滤只显示当前用户的推文
      if (this.currentProfileHandle) {
        const filtered = tweets.filter(tweet => 
          this.isTweetByCurrentUser(tweet) || this.isRetweetedPost(tweet)
        );
        
        if (filtered.length !== tweets.length) {
          this.logger.debug(`按当前主页用户 @${this.currentProfileHandle} 过滤: ${filtered.length}/${tweets.length}`);
        }
        
        return filtered;
      }
      
      return tweets;
    } catch (error) {
      this.logger.error('查找推文元素失败:', error);
      return [];
    }
  }

  /**
   * 获取推文信息
   */
  getTweetInfo(tweetElement) {
    try {
      const tweetId = this.getTweetId(tweetElement);
      const tweetDate = this.getTweetDate(tweetElement);
      const tweetText = this.getTweetText(tweetElement);
      const tweetType = this.detectTweetType(tweetElement);
      
      return {
        id: tweetId,
        element: tweetElement,
        date: tweetDate,
        text: tweetText,
        type: tweetType
      };
    } catch (error) {
      this.logger.error('获取推文信息失败:', error);
      return null;
    }
  }

  /**
   * 获取推文 ID
   */
  getTweetId(tweetElement) {
    try {
      // 尝试从 href 中提取推文 ID
      const links = tweetElement.querySelectorAll('a[href*="/status/"]');
      for (const link of links) {
        const match = link.href.match(/\/status\/(\d+)/);
        if (match) {
          return match[1];
        }
      }
      
      // 备用方案：使用文本内容和位置生成唯一标识
      const text = tweetElement.textContent.substring(0, 100);
      const position = Array.from(
        tweetElement.parentNode?.children || []
      ).indexOf(tweetElement);
      return `${text.replace(/\s/g, '').substring(0, 20)}_${position}`;
    } catch (error) {
      this.logger.error('获取推文 ID 失败:', error);
      return `fallback_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * 获取推文日期
   */
  getTweetDate(tweetElement) {
    try {
      // 查找时间元素
      const timeElement = tweetElement.querySelector('time');
      if (timeElement) {
        const datetime = timeElement.getAttribute('datetime');
        if (datetime) {
          return new Date(datetime);
        }
      }
      
      // 查找相对时间文本
      const timeLinks = tweetElement.querySelectorAll('a[href*="/status/"]');
      for (const link of timeLinks) {
        const timeText = link.textContent.trim();
        if (timeText) {
          return this.parseRelativeTime(timeText);
        }
      }
      
      return new Date();
    } catch (error) {
      this.logger.error('获取推文日期失败:', error);
      return new Date();
    }
  }

  /**
   * 获取推文文本
   */
  getTweetText(tweetElement) {
    try {
      const textElement = (
        tweetElement.querySelector('[data-testid="tweetText"]') ||
        tweetElement.querySelector('[lang]') ||
        tweetElement.querySelector('span[dir]')
      );
      
      if (textElement) {
        return textElement.textContent.substring(0, 100);
      }
      
      return tweetElement.textContent.substring(0, 100);
    } catch (error) {
      this.logger.error('获取推文文本失败:', error);
      return '';
    }
  }

  /**
   * 解析相对时间
   */
  parseRelativeTime(timeStr) {
    try {
      const now = new Date();
      
      // 解析分钟
      let match = timeStr.match(/(\d+)\s*分钟|(\d+)m/);
      if (match) {
        const minutes = parseInt(match[1] || match[2]);
        return new Date(now.getTime() - minutes * 60 * 1000);
      }
      
      // 解析小时
      match = timeStr.match(/(\d+)\s*小时|(\d+)h/);
      if (match) {
        const hours = parseInt(match[1] || match[2]);
        return new Date(now.getTime() - hours * 60 * 60 * 1000);
      }
      
      // 解析天
      match = timeStr.match(/(\d+)\s*天|(\d+)d/);
      if (match) {
        const days = parseInt(match[1] || match[2]);
        return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      }
      
      // 解析月份和日期格式
      match = timeStr.match(/(\d{1,2})月(\d{1,2})日|(\w{3})\s+(\d{1,2})/);
      if (match) {
        if (match[1]) {
          return new Date(
            now.getFullYear(),
            parseInt(match[1]) - 1,
            parseInt(match[2])
          );
        } else {
          const months = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
            Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
          };
          return new Date(
            now.getFullYear(),
            months[match[3]],
            parseInt(match[4])
          );
        }
      }
      
      return now;
    } catch (error) {
      this.logger.error('解析相对时间失败:', error);
      return new Date();
    }
  }

  /**
   * 检测推文类型
   */
  detectTweetType(tweetElement) {
    if (this.isRetweetedPost(tweetElement)) {
      return this.TweetType.RETWEET;
    }
    if (this.isReplyPost(tweetElement)) {
      return this.TweetType.REPLY;
    }
    if (this.isQuotePost(tweetElement)) {
      return this.TweetType.QUOTE;
    }
    return this.TweetType.TWEET;
  }

  /**
   * 检测是否为转推
   */
  isRetweetedPost(tweetElement) {
    try {
      const fullText = tweetElement.textContent;
      for (const indicator of this.retweetIndicators) {
        if (fullText.includes(indicator)) {
          this.logger.debug(`检测到转推: ${indicator}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      this.logger.error('转推检测失败:', error);
      return false;
    }
  }

  /**
   * 检测是否为回复
   */
  isReplyPost(tweetElement) {
    try {
      const fullText = tweetElement.textContent || '';
      
      for (const indicator of this.replyIndicators) {
        if (fullText.includes(indicator)) {
          this.logger.debug(`检测到回复: ${indicator}`);
          return true;
        }
      }
      
      // 检查回复元素
      if (tweetElement.querySelector('[data-testid="reply"]')) {
        this.logger.debug('通过元素检测到回复');
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('回复检测失败:', error);
      return false;
    }
  }

  /**
   * 检测是否为引用推文
   */
  isQuotePost(tweetElement) {
    try {
      // 检查引用元素
      if (tweetElement.querySelector('[data-testid="quoteTweet"]')) {
        this.logger.debug('通过元素检测到引用');
        return true;
      }
      
      const fullText = tweetElement.textContent || '';
      for (const indicator of this.quoteIndicators) {
        if (fullText.includes(indicator)) {
          this.logger.debug(`检测到引用: ${indicator}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error('引用检测失败:', error);
      return false;
    }
  }

  /**
   * 获取当前主页用户句柄
   */
  getCurrentProfileHandle() {
    try {
      const path = (window.location.pathname || '').split('/').filter(Boolean);
      if (path.length === 0) return null;
      
      const first = path[0];
      const reserved = new Set([
        'home', 'notifications', 'messages', 'explore', 'search',
        'i', 'settings', 'compose', 'topics', 'lists', 'bookmarks',
        'tos', 'privacy', 'login', 'signup'
      ]);
      
      if (reserved.has(first)) return null;
      
      if (/^[A-Za-z0-9_]{1,15}$/.test(first)) {
        return first.toLowerCase();
      }
      
      return null;
    } catch (error) {
      this.logger.error('获取当前主页用户句柄失败:', error);
      return null;
    }
  }

  /**
   * 获取推文作者句柄
   */
  getTweetAuthorHandle(tweetElement) {
    try {
      // 优先从用户名块中提取
      const userNameContainers = tweetElement.querySelectorAll(
        '[data-testid="User-Name"] a[href^="/"]'
      );
      
      const links = userNameContainers.length > 0
        ? userNameContainers
        : tweetElement.querySelectorAll('a[href^="/"]');
      
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/^\/([A-Za-z0-9_]{1,15})(?:[/?#].*|$)/);
        if (match) {
          return match[1].toLowerCase();
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('获取推文作者句柄失败:', error);
      return null;
    }
  }

  /**
   * 检查推文是否为当前用户发布
   */
  isTweetByCurrentUser(tweetElement) {
    const handle = this.currentProfileHandle;
    if (!handle) return true;
    
    const author = this.getTweetAuthorHandle(tweetElement);
    return author ? author === handle : false;
  }

  /**
   * 根据推文 ID 重新定位推文元素
   */
  findTweetElementById(tweetId) {
    try {
      if (!tweetId) return null;
      
      // 优先通过链接匹配
      const anchor = document.querySelector(`a[href*="/status/${tweetId}"]`);
      if (anchor) {
        const article = anchor.closest('article[data-testid="tweet"], article');
        if (article) return article;
        
        const tweet = anchor.closest(
          '[data-testid="tweet"], [data-testid="cellInnerDiv"] article'
        );
        if (tweet) return tweet;
      }
      
      // 兜底：遍历所有推文元素
      const candidates = this.findTweetElements();
      for (const element of candidates) {
        const links = element.querySelectorAll('a[href*="/status/"]');
        for (const link of links) {
          const match = link.href.match(/\/status\/(\d+)/);
          if (match && match[1] === tweetId) {
            return element;
          }
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('根据 ID 查找推文元素失败:', error);
      return null;
    }
  }
}