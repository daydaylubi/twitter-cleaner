import { createLogger } from '../utils/logger.js';

/**
 * Tweet Deleter - 推文删除操作模块
 * 基于现有 cleaner.js 的删除逻辑重构
 */
export class TweetDeleter {
  constructor(config) {
    this.logger = createLogger('TweetDeleter');
    this.config = config;
    
    // 推文类型
    this.TweetType = {
      RETWEET: 'RETWEET',
      REPLY: 'REPLY',
      TWEET: 'TWEET',
      QUOTE: 'QUOTE'
    };
    
    // 删除策略映射
    this.deleteHandlers = {
      [this.TweetType.RETWEET]: this.undoRetweet.bind(this),
      [this.TweetType.REPLY]: this.deleteViaMenu.bind(this),
      [this.TweetType.TWEET]: this.deleteViaMenu.bind(this),
      [this.TweetType.QUOTE]: this.deleteViaMenu.bind(this)
    };
    
    // 选择器配置
    this.selectors = {
      retweetButton: [
        '[data-testid="retweet"]',
        '[data-testid="unretweet"]',
        'button[data-testid="retweet"]',
        'div[data-testid="retweet"]',
        '[aria-label*="转推"]',
        '[aria-label*="Retweet"]',
        '[aria-label*="已转推"]',
        '[aria-label*="Retweeted"]',
        '[aria-label*="Undo repost"]'
      ],
      moreButton: [
        '[data-testid="caret"]',
        '[aria-label*="更多"]',
        '[aria-label*="More"]',
        'button[aria-haspopup="menu"]',
        'div[role="button"][aria-haspopup="menu"]'
      ],
      deleteButton: [
        '[data-testid="Dropdown"] [role="menuitem"]',
        '[role="menuitem"]',
        'div[role="menuitem"]',
        'a[role="menuitem"]'
      ],
      confirmButton: [
        '[data-testid="confirmationSheetConfirm"]',
        'button[data-testid="confirmationSheetConfirm"]',
        '[role="button"][data-testid="confirmationSheetConfirm"]'
      ]
    };
    
    // 取消转推文本
    this.undoRetweetTexts = [
      '取消转推',
      '撤销转帖',
      'undo retweet',
      'unretweet',
      '取消转发',
      'undo repost',
      'remove repost'
    ];
    
    // 删除文本
    this.deleteTexts = ['删除', 'delete', 'Delete'];
    
    this.logger.debug('TweetDeleter 初始化完成');
  }

  /**
   * 删除推文的主要入口
   */
  async deleteTweet(tweetElement, tweetType) {
    try {
      this.logger.debug(`开始删除${tweetType}`, tweetElement);
      
      // 根据推文类型选择删除策略
      const handler = this.deleteHandlers[tweetType];
      if (!handler) {
        this.logger.error(`未知的推文类型: ${tweetType}`);
        return false;
      }
      
      // 执行删除操作
      const success = await handler(tweetElement);
      
      if (success) {
        this.logger.info(`删除${tweetType}成功`);
      } else {
        this.logger.error(`删除${tweetType}失败`);
      }
      
      return success;
    } catch (error) {
      this.logger.error(`删除${tweetType}时发生错误:`, error);
      return false;
    }
  }

  /**
   * 取消转推
   */
  async undoRetweet(tweetElement) {
    try {
      this.logger.debug('开始取消转推流程');
      
      // 滚动到转推按钮位置
      await this.scrollToRetweetButton(tweetElement);
      
      // 查找转推按钮
      const retweetButton = this.findRetweetButton(tweetElement);
      if (!retweetButton) {
        this.logger.warning('未找到转推按钮');
        return false;
      }
      
      // 点击转推按钮
      this.logger.debug('点击转推按钮');
      retweetButton.click();
      await this.sleep(2000);
      
      // 查找取消转推选项
      const undoOption = this.findUndoRetweetOption();
      if (!undoOption) {
        this.logger.warning('未找到取消转推选项');
        await this.closeMenu();
        return false;
      }
      
      // 点击取消转推选项
      this.logger.debug('点击取消转推选项');
      undoOption.click();
      await this.sleep(2000);
      
      return true;
    } catch (error) {
      this.logger.error('取消转推过程出错:', error);
      await this.closeMenu();
      return false;
    }
  }

  /**
   * 通过菜单删除推文
   */
  async deleteViaMenu(tweetElement) {
    try {
      this.logger.debug('开始通过菜单删除流程');
      
      // 滚动到更多按钮位置
      await this.scrollToMoreButton(tweetElement);
      
      // 查找并点击更多按钮
      const moreButtonFound = await this.findAndClickMoreButton(tweetElement);
      if (!moreButtonFound) {
        this.logger.warning('未找到更多按钮');
        return false;
      }
      
      // 查找并点击删除选项
      const deleteFound = await this.findAndClickDelete();
      if (!deleteFound) {
        this.logger.warning('未找到删除选项');
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error('通过菜单删除过程出错:', error);
      await this.closeMenu();
      return false;
    }
  }

  /**
   * 查找转推按钮
   */
  findRetweetButton(tweetElement) {
    for (const selector of this.selectors.retweetButton) {
      const button = tweetElement.querySelector(selector);
      if (button) {
        this.logger.debug(`找到转推按钮: ${selector}`);
        return button;
      }
    }
    return null;
  }

  /**
   * 查找并点击更多按钮
   */
  async findAndClickMoreButton(tweetElement) {
    for (const selector of this.selectors.moreButton) {
      const button = tweetElement.querySelector(selector);
      if (button) {
        this.logger.debug('找到更多按钮，正在点击');
        button.click();
        await this.sleep(1000);
        return true;
      }
    }
    return false;
  }

  /**
   * 查找取消转推选项
   */
  findUndoRetweetOption() {
    try {
      const menuItems = document.querySelectorAll(
        '[role="menuitem"], [data-testid="Dropdown"] [role="menuitem"]'
      );
      
      for (const item of menuItems) {
        const text = item.textContent.toLowerCase().trim();
        for (const undoText of this.undoRetweetTexts) {
          if (text.includes(undoText.toLowerCase())) {
            this.logger.debug(`找到取消转推选项: ${text}`);
            return item;
          }
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('查找取消转推选项失败:', error);
      return null;
    }
  }

  /**
   * 查找并点击删除选项
   */
  async findAndClickDelete() {
    try {
      await this.sleep(800);
      
      let deleteButton = null;
      
      // 查找删除按钮
      for (const selector of this.selectors.deleteButton) {
        const items = document.querySelectorAll(selector);
        for (const item of items) {
          const text = item.textContent.toLowerCase();
          if (this.deleteTexts.some(deleteText => text.includes(deleteText))) {
            deleteButton = item;
            break;
          }
        }
        if (deleteButton) break;
      }
      
      if (!deleteButton) {
        this.logger.warning('未找到删除选项');
        document.body.click();
        return false;
      }
      
      // 点击删除按钮
      this.logger.debug('找到删除选项，正在点击');
      deleteButton.click();
      await this.sleep(1500);
      
      // 确认删除
      const confirmButton = this.findConfirmButton();
      if (!confirmButton) {
        this.logger.warning('未找到确认删除按钮');
        return false;
      }
      
      // 点击确认按钮
      this.logger.debug('确认删除');
      confirmButton.click();
      await this.sleep(1500);
      
      return true;
    } catch (error) {
      this.logger.error('查找并点击删除选项失败:', error);
      return false;
    }
  }

  /**
   * 查找确认按钮
   */
  findConfirmButton() {
    try {
      // 优先使用专用选择器
      for (const selector of this.selectors.confirmButton) {
        const button = document.querySelector(selector);
        if (button) {
          return button;
        }
      }
      
      // 兜底：查找包含删除文本的按钮
      const buttons = document.querySelectorAll('button, div[role="button"]');
      for (const button of buttons) {
        const text = button.textContent.toLowerCase();
        if (this.deleteTexts.some(deleteText => text.includes(deleteText))) {
          return button;
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('查找确认按钮失败:', error);
      return null;
    }
  }

  /**
   * 滚动到转推按钮位置
   */
  async scrollToRetweetButton(tweetElement) {
    try {
      const retweetButton = this.findRetweetButton(tweetElement);
      if (retweetButton) {
        await this.scrollToElement(retweetButton, 0.7);
      } else {
        await this.scrollToElement(tweetElement, 0.3);
      }
    } catch (error) {
      this.logger.error('滚动到转推按钮位置失败:', error);
    }
  }

  /**
   * 滚动到更多按钮位置
   */
  async scrollToMoreButton(tweetElement) {
    try {
      await this.scrollToElement(tweetElement, 0.3);
    } catch (error) {
      this.logger.error('滚动到更多按钮位置失败:', error);
    }
  }

  /**
   * 滚动到指定元素
   */
  async scrollToElement(element, viewportRatio = 0.3) {
    try {
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + window.pageYOffset;
      const viewportHeight = window.innerHeight;
      const targetScrollTop = elementTop - viewportHeight * viewportRatio;
      
      this.logger.debug(`滚动到元素位置: ${Math.round(targetScrollTop)}px`);
      
      window.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
      
      await this.sleep(1500);
      
      this.logger.debug('元素已滚动到视窗内');
    } catch (error) {
      this.logger.error('滚动到元素失败:', error);
    }
  }

  /**
   * 关闭菜单
   */
  async closeMenu() {
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await this.sleep(500);
    } catch (error) {
      this.logger.error('关闭菜单失败:', error);
    }
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}