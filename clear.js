// X.com (Twitter) 批量删除推文脚本 - 简化版 2025
// 移除试运行，采用纯单条处理模式

(function() {
    'use strict';
    
    // ==================== 目录（Outline） ====================
    // 1) 类型与配置：TweetType, CONFIG, 运行时状态
    // 2) 日志与通用工具：log(), wait()
    // 3) DOM/上下文辅助：getCurrentProfileHandle(), getTweetAuthorHandle(), isTweetByCurrentUser()
    // 4) 推文查找：findTweetElements(), findTweetElementById(), scrollDown(), scrollToTweet()
    // 5) 推文信息解析：getTweetId(), getTweetDate(), parseRelativeTime(), getTweetInfo(), getBriefTweetInfo()
    // 6) 推文类型检测：isRetweetedPost(), isReplyPost(), isQuotePost(), detectTweetType()
    // 7) 交互操作：findRetweetButton(), findAndClickMoreButton(), findAndClickDelete()
    // 8) 删除处理：deleteViaMenu(), undoRetweet(), deleteHandlers, processTweet()
    // 9) 批次与循环：buildCurrentBatch(), processNextTweet(), cleanupTweets()
    // 10) 统计展示与导出：showProgress(), showFinalStats(), window.TwitterCleaner
    // 注：采用函数声明，顺序对执行无影响；以上仅为阅读导航
    
    // ==================== 类型定义 ====================
    const TweetType = {
        RETWEET: '转推',
        REPLY: '回复',
        TWEET: '推文',
        QUOTE: '引用'
    };
    
    // ==================== 配置 ====================
    const CONFIG = {
        cutoffDate: new Date('2025-08-01'), // 删除此日期之前的推文
        deleteDelay: 2000, // 删除操作间隔（毫秒）
        scrollDelay: 3000, // 滚动等待时间
        maxTweets: 10000, // 最大处理推文数量
        debug: true, // 启用详细调试信息
        maxScrollAttempts: 50, // 最大滚动尝试次数
        emptyPageStopThreshold: 5 // 页面完全无推文时的停止阈值
    };
    
    let stats = {
        processed: 0,
        deleted: 0,
        skipped: 0,
        errors: 0,
        scrollAttempts: 0,
        totalElements: 0
    };
    
    // 记录已处理的推文ID，避免重复处理
    let processedTweetIds = new Set();
    // 当前批次的待处理队列（缓存快照，元素引用仅作初值，处理前会按ID重新定位）
    let CURRENT_BATCH = [];
    
    // 当前主页用户句柄缓存
    let CURRENT_PROFILE_HANDLE = null;
    
    // ==================== 日志和工具函数 ====================
    
    /**
     * 输出日志信息
     * @param {string} message - 日志消息
     * @param {string} [type='info'] - 日志类型: 'info'|'success'|'warning'|'error'|'debug'
     */
    function log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const emoji = {
            'info': 'ℹ️',
            'success': '✅', 
            'warning': '⚠️',
            'error': '❌',
            'debug': '🔍'
        };
        
        if (type === 'debug' && !CONFIG.debug) return;
        
        console.log(`${emoji[type]} [${timestamp}] ${message}`);
    }
    
    /**
     * 等待指定的毫秒数
     * @param {number} ms - 等待的毫秒数
     * @returns {Promise<void>}
     */
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 通过推文ID在当前DOM中重新定位推文元素
    function findTweetElementById(tweetId) {
        try {
            if (!tweetId) return null;
            const anchor = document.querySelector(`a[href*="/status/${tweetId}"]`);
            if (anchor) {
                // 优先 article，再退回最近包含 tweet 的容器
                const article = anchor.closest('article[data-testid="tweet"], article');
                if (article) return article;
                const tweet = anchor.closest('[data-testid="tweet"], [data-testid="cellInnerDiv"] article');
                if (tweet) return tweet;
            }
            // 兜底：遍历 tweet 列表中，通过链接匹配
            const candidates = findTweetElements();
            for (const el of candidates) {
                const links = el.querySelectorAll('a[href*="/status/"]');
                for (const l of links) {
                    const m = l.href.match(/\/status\/(\d+)/);
                    if (m && m[1] === tweetId) return el;
                }
            }
            return null;
        } catch (_) {
            return null;
        }
    }

    // 根据当前DOM构建批次队列（只含未处理的条目）
    function buildCurrentBatch() {
        const elements = findTweetElements();
        const infos = elements
            .map(getTweetInfo)
            .filter(info => info && !processedTweetIds.has(info.id));
        CURRENT_BATCH = infos;
        stats.totalElements = infos.length;
        if (CONFIG.debug) {
            log(`🧾 新批次构建完成，共 ${infos.length} 条未处理`, 'debug');
        }
        return CURRENT_BATCH.length;
    }
    
    // ==================== 推文类型检测 ====================
    
    /**
     * 检测推文是否为转推
     * @param {HTMLElement} tweetElement - 推文DOM元素
     * @returns {boolean}
     */
    function isRetweetedPost(tweetElement) {
        try {
            // 方法1: 检查转推指示器文本
            const retweetIndicators = [
                'You reposted',
                'You Retweeted', 
                '你转推了',
                '你转发了',
                '你已转帖',
                'reposted'
            ];
            
            const fullText = tweetElement.textContent;
            for (const indicator of retweetIndicators) {
                if (fullText.includes(indicator)) {
                    log(`通过文本指示器检测到转推: ${indicator}`, 'debug');
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            log(`转推检测出错: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * 检测推文是否为回复
     * @param {HTMLElement} tweetElement - 推文DOM元素
     * @returns {boolean}
     */
    function isReplyPost(tweetElement) {
        try {
            const replyIndicators = [
                '回复',
                'Replying to',
                '你回复了',
                '你已回复'
            ];
            const fullText = tweetElement.textContent || '';
            for (const indicator of replyIndicators) {
                if (fullText.includes(indicator)) {
                    log(`通过文本指示器检测到回复: ${indicator}`, 'debug');
                    return true;
                }
            }
            // 部分情况下存在回复特定的标识元素
            if (tweetElement.querySelector('[data-testid="reply"]')) {
                log('通过元素选择器检测到回复: [data-testid="reply"]', 'debug');
                return true;
            }
            return false;
        } catch (error) {
            log(`回复检测出错: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * 检测推文是否为引用推文
     * @param {HTMLElement} tweetElement - 推文DOM元素
     * @returns {boolean}
     */
    function isQuotePost(tweetElement) {
        try {
            // 优先使用平台自带的引用标识
            if (tweetElement.querySelector('[data-testid="quoteTweet"]')) {
                log('通过元素选择器检测到引用: [data-testid="quoteTweet"]', 'debug');
                return true;
            }
            const quoteIndicators = [
                '引用',
                'Quote',
                'Quoted post',
                '引用推文'
            ];
            const fullText = tweetElement.textContent || '';
            for (const indicator of quoteIndicators) {
                if (fullText.includes(indicator)) {
                    log(`通过文本指示器检测到引用: ${indicator}`, 'debug');
                    return true;
                }
            }
            return false;
        } catch (error) {
            log(`引用检测出错: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * 检测推文类型
     * @param {HTMLElement} tweetElement - 推文DOM元素
     * @returns {string} 返回推文类型
     */
    function detectTweetType(tweetElement) {
        if (isRetweetedPost(tweetElement)) return TweetType.RETWEET;
        if (isReplyPost(tweetElement)) return TweetType.REPLY;
        if (isQuotePost(tweetElement)) return TweetType.QUOTE;
        return TweetType.TWEET;
    }
    
    /**
     * 查找转推按钮
     * @param {HTMLElement} tweetElement - 推文DOM元素
     * @returns {HTMLElement|null} 返回找到的按钮元素或null
     */
    function findRetweetButton(tweetElement) {
        const selectors = [
            '[data-testid="retweet"]',
            '[data-testid="unretweet"]',
            'button[data-testid="retweet"]',
            'div[data-testid="retweet"]',
            '[aria-label*="转推"]',
            '[aria-label*="Retweet"]',
            '[aria-label*="已转推"]',
            '[aria-label*="Retweeted"]',
            '[aria-label*="Undo repost"]'
        ];
        
        for (const selector of selectors) {
            const button = tweetElement.querySelector(selector);
            if (button) {
                log(`找到转推按钮: ${selector}`, 'debug');
                return button;
            }
        }
        
        return null;
    }
    
    
    
    // ==================== 推文信息解析 ====================
    
    /**
     * 获取推文ID
     * @param {HTMLElement} tweetElement - 推文DOM元素
     * @returns {string} 推文ID
     */
    function getTweetId(tweetElement) {
        try {
            // 尝试从href中提取推文ID
            const links = tweetElement.querySelectorAll('a[href*="/status/"]');
            for (const link of links) {
                const match = link.href.match(/\/status\/(\d+)/);
                if (match) {
                    return match[1];
                }
            }
            
            // 使用元素的文本内容和位置作为唯一标识
            const text = tweetElement.textContent.substring(0, 100);
            const position = Array.from(tweetElement.parentNode?.children || []).indexOf(tweetElement);
            return `${text.replace(/\s/g, '').substring(0, 20)}_${position}`;
        } catch (error) {
            return `fallback_${Math.random().toString(36).substr(2, 9)}`;
        }
    }
    
    /**
     * 获取推文日期
     * @param {HTMLElement} tweetElement - 推文DOM元素
     * @returns {Date} 推文日期
     */
    function getTweetDate(tweetElement) {
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
                return parseRelativeTime(timeText);
            }
        }
        
        return new Date(); // 默认返回当前时间
    }
    
    /**
     * 解析相对时间字符串为Date对象
     * @param {string} timeStr - 时间字符串
     * @returns {Date} 解析后的日期对象
     */
    function parseRelativeTime(timeStr) {
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
                return new Date(now.getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]));
            } else {
                const months = {'Jan':0,'Feb':1,'Mar':2,'Apr':3,'May':4,'Jun':5,'Jul':6,'Aug':7,'Sep':8,'Oct':9,'Nov':10,'Dec':11};
                return new Date(now.getFullYear(), months[match[3]], parseInt(match[4]));
            }
        }
        
        return now;
    }
    
    /**
     * 获取推文详细信息
     * @param {HTMLElement} tweetElement - 推文DOM元素
     * @returns {Object|null} 包含推文信息的对象
     */
    function getTweetInfo(tweetElement) {
        try {
            const tweetId = getTweetId(tweetElement);
            const tweetDate = getTweetDate(tweetElement);
            
            // 获取推文文本
            const textElement = tweetElement.querySelector('[data-testid="tweetText"]') ||
                               tweetElement.querySelector('[lang]') ||
                               tweetElement.querySelector('span[dir]');
            
            const tweetText = textElement ? 
                textElement.textContent.substring(0, 100) : 
                tweetElement.textContent.substring(0, 100);
            
            // 推文类型判断
            const tweetType = detectTweetType(tweetElement);
            
            return {
                id: tweetId,
                element: tweetElement,
                date: tweetDate,
                text: tweetText.replace(/\n/g, ' ').trim(),
                type: tweetType
            };
            
        } catch (error) {
            log(`解析推文信息失败: ${error.message}`, 'error');
            return null;
        }
    }
    
    /**
     * 生成推文简略信息（用于调试输出）
     * @param {HTMLElement} tweetElement - 推文DOM元素
     * @param {number} [index=0] - 推文索引
     * @returns {Object} 简略信息对象
     */
    function getBriefTweetInfo(tweetElement, index = 0) {
        try {
            const info = getTweetInfo(tweetElement);
            if (!info) return { i: index + 1, type: 'N/A', date: '', text: '', id: '' };
            return {
                i: index + 1,
                type: info.type,
                date: info.date ? info.date.toLocaleString() : '',
                text: (info.text || '').substring(0, 50),
                id: info.id
            };
        } catch (_) {
            return { i: index + 1, type: 'N/A', date: '', text: '', id: '' };
        }
    }
    
    // ==================== DOM/上下文辅助 ====================
    
    function getCurrentProfileHandle() {
        try {
            const path = (window.location.pathname || '').split('/').filter(Boolean);
            if (path.length === 0) return null;
            const first = path[0];
            const reserved = new Set([
                'home','notifications','messages','explore','search','i','settings','compose',
                'topics','lists','bookmarks','tos','privacy','login','signup'
            ]);
            if (reserved.has(first)) return null;
            // 过滤包含特殊路径的，如 /<handle>/status/...
            if (/^[A-Za-z0-9_]{1,15}$/.test(first)) {
                return first.toLowerCase();
            }
            return null;
        } catch (_) {
            return null;
        }
    }
    
    function getTweetAuthorHandle(tweetElement) {
        try {
            // 优先从用户名块中提取
            const userNameContainers = tweetElement.querySelectorAll('[data-testid="User-Name"] a[href^="/"]');
            const links = userNameContainers.length > 0 ? userNameContainers : tweetElement.querySelectorAll('a[href^="/"]');
            for (const link of links) {
                const href = link.getAttribute('href') || '';
                const m = href.match(/^\/([A-Za-z0-9_]{1,15})(?:[/?#].*|$)/);
                if (m) {
                    return m[1].toLowerCase();
                }
            }
            return null;
        } catch (_) {
            return null;
        }
    }
    
    function isTweetByCurrentUser(tweetElement) {
        const handle = getCurrentProfileHandle();
        if (!handle) return true; // 无法识别当前主页时，放行，避免误杀
        const author = getTweetAuthorHandle(tweetElement);
        return author ? author === handle : false;
    }
    
    // ==================== 推文查找 ====================
    function findTweetElements() {
        const selectors = [
            '[data-testid="tweet"]',
            'article[data-testid="tweet"]',
            '[data-testid="cellInnerDiv"] article',
        ];
        
        let tweets = [];
        
        for (const selector of selectors) {
            tweets = Array.from(document.querySelectorAll(selector));
            if (tweets.length > 0) {
                log(`找到 ${tweets.length} 条推文: ${selector}`, 'debug');
                break;
            }
        }
        
        // 若处于某个用户主页，则仅保留该用户所发的推文
        const currentHandle = CURRENT_PROFILE_HANDLE;
        if (currentHandle) {
            // 在主页：保留“本人发布的”或“本人转推的”推文
            const filtered = tweets.filter(el => isTweetByCurrentUser(el) || isRetweetedPost(el));
            if (filtered.length !== tweets.length) {
                log(`按当前主页用户 @${currentHandle} 过滤（含转推）: ${filtered.length}/${tweets.length}`, 'debug');
            }
            // 调试：输出简略列表
            if (CONFIG.debug && filtered.length > 0) {
                log('--- 本次 findTweetElements 推文列表（过滤后） ---', 'debug');
                const brief = filtered.map((el, i) => getBriefTweetInfo(el, i));
                try { console.table(brief); } catch (_) { log(JSON.stringify(brief), 'debug'); }
            }
            return filtered;
        }
        
        // 调试：输出简略列表（未过滤）
        if (CONFIG.debug && tweets.length > 0) {
            log('--- 本次 findTweetElements 推文列表 ---', 'debug');
            const brief = tweets.map((el, i) => getBriefTweetInfo(el, i));
            try { console.table(brief); } catch (_) { log(JSON.stringify(brief), 'debug'); }
        }
        
        return tweets;
    }
    
    async function scrollDown() {
        const beforeScrollHeight = document.documentElement.scrollHeight;
        
        window.scrollTo({ 
            top: beforeScrollHeight, 
            behavior: 'smooth' 
        });
        
        await wait(CONFIG.scrollDelay);
        
        const afterScrollHeight = document.documentElement.scrollHeight;
        const hasNewContent = afterScrollHeight > beforeScrollHeight;
        
        log(`滚动${hasNewContent ? '成功' : '无效'}: ${beforeScrollHeight} → ${afterScrollHeight}`, 'debug');
        
        return hasNewContent;
    }
    
    // ==================== 删除处理 ====================
    // 删除策略映射
    const deleteHandlers = {
        [TweetType.RETWEET]: undoRetweetWithScroll,
        [TweetType.REPLY]: deleteViaMenuWithScroll,
        [TweetType.TWEET]: deleteViaMenuWithScroll,
        [TweetType.QUOTE]: deleteViaMenuWithScroll
    };
    
    // 带滚动的转推处理函数
    async function undoRetweetWithScroll(tweetElement) {
        // 先滚动到转推按钮位置
        await scrollToRetweetButton(tweetElement);
        // 再执行原来的转推取消逻辑
        return await undoRetweet(tweetElement);
    }
    
    // 带滚动的普通删除处理函数
    async function deleteViaMenuWithScroll(tweetElement) {
        // 先滚动到更多按钮位置
        await scrollToMoreButton(tweetElement);
        // 再执行原来的删除逻辑
        return await deleteViaMenu(tweetElement);
    }
    // 高层统一接口
    async function processTweet(tweetInfo) {
        try {
        const handler = deleteHandlers[tweetInfo.type];
        if (!handler) {
            log(`❌ 未知的推文类型: ${tweetInfo.type}`, 'error');
            return false;
        }
        const success = await handler(tweetInfo.element);
        if (success) {
            stats.deleted++;
            log(`✅ 删除${tweetInfo.type}成功`, 'success');
        } else {
            stats.errors++;
            log(`❌ 删除${tweetInfo.type}失败`, 'error');
        }
        return success;
        } catch (err) {
        stats.errors++;
        log(`删除过程出错: ${err.message}`, 'error');
        return false;
        }
    }

    // 普通推文走菜单逻辑
    async function deleteViaMenu(tweetElement) {
        const found = await findAndClickMoreButton(tweetElement);
        if (!found) return false;
        return await findAndClickDelete();
    }

    async function undoRetweet(tweetElement) {
        try {
            log('开始取消转推流程...', 'debug');
            
            const retweetButton = findRetweetButton(tweetElement);
            if (!retweetButton) {
                log('未找到转推按钮', 'warning');
                return false;
            }
            
            // 点击转推按钮
            log('点击转推按钮...', 'debug');
            retweetButton.click();
            await wait(2000);
            
            // 查找取消转推选项
            const undoTexts = [
                '取消转推',
                '撤销转帖',
                'undo retweet',
                'unretweet',
                '取消转发',
                'undo repost',
                'remove repost'
            ];
            
            let undoOption = null;
            const menuItems = document.querySelectorAll('[role="menuitem"], [data-testid="Dropdown"] [role="menuitem"]');
            
            for (const item of menuItems) {
                const text = item.textContent.toLowerCase().trim();
                for (const undoText of undoTexts) {
                    if (text.includes(undoText)) {
                        undoOption = item;
                        log(`找到取消转推选项: ${text}`, 'debug');
                        break;
                    }
                }
                if (undoOption) break;
            }
            
            if (undoOption) {
                log('点击取消转推选项...', 'debug');
                undoOption.click();
                await wait(2000);
                return true;
            } else {
                log('未找到取消转推选项', 'warning');
                // 按ESC关闭菜单
                document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
                await wait(500);
                return false;
            }
            
        } catch (error) {
            log(`取消转推过程出错: ${error.message}`, 'error');
            document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
            await wait(500);
            return false;
        }
    }

    // ==================== 交互操作 ====================
    async function findAndClickMoreButton(tweetElement) {
        const moreSelectors = [
            '[data-testid="caret"]',
            '[aria-label*="更多"]',
            '[aria-label*="More"]',
            'button[aria-haspopup="menu"]',
            'div[role="button"][aria-haspopup="menu"]'
        ];
        
        for (const selector of moreSelectors) {
            const button = tweetElement.querySelector(selector);
            if (button) {
                log('找到更多按钮，正在点击...', 'debug');
                button.click();
                await wait(1000); // 减少初始等待时间，让智能等待机制处理
                return true;
            }
        }
        
        return false;
    }
    
    async function findAndClickDelete() {
        await wait(800);
        
        const deleteSelectors = [
            '[data-testid="Dropdown"] [role="menuitem"]',
            '[role="menuitem"]',
            'div[role="menuitem"]',
            'a[role="menuitem"]'
        ];
        
        let deleteButton = null;
        
        for (const selector of deleteSelectors) {
            const items = document.querySelectorAll(selector);
            for (const item of items) {
                const text = item.textContent.toLowerCase();
                if (text.includes('删除') || text.includes('delete') || text.includes('Delete')) {
                    deleteButton = item;
                    break;
                }
            }
            if (deleteButton) break;
        }
        
        if (!deleteButton) {
            log('未找到删除选项', 'warning');
            document.body.click();
            return false;
        }
        
        log('找到删除选项，正在点击...', 'debug');
        deleteButton.click();
        await wait(1500);
        
        // 确认删除
        const confirmSelectors = [
            '[data-testid="confirmationSheetConfirm"]',
            'button[data-testid="confirmationSheetConfirm"]',
            '[role="button"][data-testid="confirmationSheetConfirm"]'
        ];
        
        let confirmButton = null;
        for (const selector of confirmSelectors) {
            confirmButton = document.querySelector(selector);
            if (confirmButton) break;
        }
        
        if (!confirmButton) {
            const buttons = document.querySelectorAll('button, div[role="button"]');
            for (const button of buttons) {
                const text = button.textContent.toLowerCase();
                if (text.includes('删除') || text.includes('delete')) {
                    confirmButton = button;
                    break;
                }
            }
        }
        
        if (confirmButton) {
            log('确认删除...', 'debug');
            confirmButton.click();
            await wait(1500);
            return true;
        } else {
            log('未找到确认删除按钮', 'warning');
            return false;
        }
    }
    
    
    // ==================== 单条推文处理 ====================
    
    async function processNextTweet() {
        // 若当前批次为空，则构建新批次
        if (!CURRENT_BATCH || CURRENT_BATCH.length === 0) {
            const built = buildCurrentBatch();
            if (built === 0) {
                return null; // 当前页面没有可处理的推文
            }
        }

        // 取出本批次的第一条
        const tweetInfoFromBatch = CURRENT_BATCH.shift();
        if (!tweetInfoFromBatch) {
            return 'no_new';
        }

        // 处理前按ID重新定位元素，避免虚拟化导致的失效
        const freshElement = findTweetElementById(tweetInfoFromBatch.id) || tweetInfoFromBatch.element;
        const tweetInfo = freshElement ? { ...tweetInfoFromBatch, element: freshElement } : tweetInfoFromBatch;

        // 标记为已处理以避免重复
        processedTweetIds.add(tweetInfo.id);
        stats.processed++;

        // 分割线开始
        log('\n' + '='.repeat(60), 'info');
        log(`[${stats.processed}] 处理推文 [${tweetInfo.type}]`, 'info');
        log(`🆔 ID: ${tweetInfo.id}`, 'debug');
        log(`📅 日期: ${tweetInfo.date.toLocaleString()}`);
        log(`📝 内容: ${tweetInfo.text.substring(0, 80)}${tweetInfo.text.length > 80 ? '...' : ''}`);

        // 检查是否需要处理
        const shouldProcess = tweetInfo.date < CONFIG.cutoffDate;

        if (shouldProcess) {
            log(`🗑️ 开始处理${tweetInfo.type}...`, 'info');
            const success = await processTweet(tweetInfo);

            if (success) {
                await wait(CONFIG.deleteDelay);
                // 不再滚动到顶部，保持批次稳定
                log('-'.repeat(60), 'info');
                return 'deleted'; // 表示有删除操作
            }
            log('-'.repeat(60), 'info');
            return 'processed'; // 处理了但失败
        } else {
            let reason = '';
            if (tweetInfo.date >= CONFIG.cutoffDate) {
                reason = '日期较新';
            }
            log(`- 跳过: ${tweetInfo.type} (${reason})`, 'info');
            stats.skipped++;
            return 'skipped';
        }
    }
        
    // ==================== 主执行/循环控制 ====================
    
    async function cleanupTweets() {
        log('=== 开始执行 X.com 清理脚本 (简化版) ===', 'success');
        log(`🎯 截止日期: ${CONFIG.cutoffDate.toLocaleDateString()}`);
        
        // 初始化并缓存当前主页用户句柄
        CURRENT_PROFILE_HANDLE = getCurrentProfileHandle();
        if (CURRENT_PROFILE_HANDLE) {
            log(`👤 当前主页用户: @${CURRENT_PROFILE_HANDLE}`);
        } else {
            log('👤 未处于具体用户主页，忽略作者过滤', 'debug');
        }
        
        if (!window.location.hostname.includes('x.com') && !window.location.hostname.includes('twitter.com')) {
            log('❌ 请在 X.com 或 Twitter.com 上运行此脚本', 'error');
            return;
        }
        
        // 重置统计
        stats = { processed: 0, deleted: 0, skipped: 0, errors: 0, scrollAttempts: 0, totalElements: 0 };
        processedTweetIds.clear();
        
        let consecutiveEmptyPages = 0; // 连续页面无任何推文
        
        while (stats.scrollAttempts < CONFIG.maxScrollAttempts && stats.processed < CONFIG.maxTweets) {
            const result = await processNextTweet();
            if (result === null) {
                // 页面没有任何可识别的推文
                consecutiveEmptyPages++;
                log('📜 页面无推文，尝试滚动加载...', 'warning');
                
                // 若连续多次为空页面，则认为账号无内容，提前结束
                if (consecutiveEmptyPages >= CONFIG.emptyPageStopThreshold) {
                    log(`⏹️ 连续 ${CONFIG.emptyPageStopThreshold} 次页面为空，可能账号无内容，停止`, 'info');
                    break;
                }
                
                stats.scrollAttempts++;
                const hasMore = await scrollDown();
                
                if (hasMore) {
                    consecutiveEmptyPages = 0;
                }
                continue;
            }
            
            if (result === 'deleted') {
                // 有删除操作，重置计数器
                consecutiveEmptyPages = 0;
                continue; // 重新开始处理
            }
            
            if (result === 'no_new') {
                // 当前页面没有新推文，滚动加载
                log('🔄 当前页面推文已全部处理，滚动加载更多...', 'info');
                stats.scrollAttempts++;
                const hasMore = await scrollDown();
                
                if (!hasMore) {
                    consecutiveEmptyPages++;
                    if (consecutiveEmptyPages >= CONFIG.emptyPageStopThreshold) break;
                } else {
                    consecutiveEmptyPages = 0;
                }
                continue;
            }
            
            if (result === 'skipped') {
                consecutiveEmptyPages = 0;
            } else {
                consecutiveEmptyPages = 0;
            }
            
            // 定期显示进度
            if (stats.processed % 10 === 0) {
                showProgress();
            }
            
            // 短暂延迟避免过快操作
            await wait(500);
        }
        
        showFinalStats();
    }
    
    function showProgress() {
        log('\n=== 📊 进度更新 ===', 'info');
        log(`已处理: ${stats.processed} | 已删除: ${stats.deleted} | 跳过: ${stats.skipped} | 错误: ${stats.errors}`);
        log(`滚动次数: ${stats.scrollAttempts} | 页面推文: ${stats.totalElements}`);
    }
    
    function showFinalStats() {
        log('\n=== 🎉 执行完成 ===', 'success');
        log(`📈 最终统计:`);
        log(`   处理推文: ${stats.processed}`);
        log(`   已删除: ${stats.deleted}`);
        log(`   跳过: ${stats.skipped}`);
        log(`   错误: ${stats.errors}`);
        log(`   滚动次数: ${stats.scrollAttempts}`);
        
        if (stats.processed >= CONFIG.maxTweets) {
            log(`⚠️ 已达到最大处理数量限制 (${CONFIG.maxTweets})`, 'warning');
        }
        
        if (stats.scrollAttempts >= CONFIG.maxScrollAttempts) {
            log(`⚠️ 已达到最大滚动次数限制 (${CONFIG.maxScrollAttempts})`, 'warning');
        }
        
        const successRate = stats.processed > 0 ? (stats.deleted / stats.processed * 100).toFixed(1) : 0;
        log(`✨ 删除成功率: ${successRate}%`);
    }
    
    // 滚动到转推按钮位置
    async function scrollToRetweetButton(tweetElement) {
        try {
            const retweetButton = findRetweetButton(tweetElement);
            if (retweetButton) {
                // 获取转推按钮的位置信息
                const rect = retweetButton.getBoundingClientRect();
                const buttonTop = rect.top + window.pageYOffset;
                const viewportHeight = window.innerHeight;
                
                // 将转推按钮滚动到视窗中央偏下位置（因为按钮通常在推文底部）
                const targetScrollTop = buttonTop - (viewportHeight * 0.7);
                
                log(`📍 滚动到转推按钮位置: ${Math.round(targetScrollTop)}px`, 'debug');
                
                window.scrollTo({
                    top: Math.max(0, targetScrollTop),
                    behavior: 'smooth'
                });
                
                // 等待滚动完成
                await wait(1500);
                
                log('✅ 转推按钮已滚动到视窗内', 'debug');
            } else {
                // 如果找不到转推按钮，回退到推文整体滚动
                await scrollToTweetElement(tweetElement);
            }
        } catch (error) {
            log(`滚动到转推按钮位置失败: ${error.message}`, 'error');
        }
    }
    
    // 滚动到更多按钮位置
    async function scrollToMoreButton(tweetElement) {
        try {
            // 获取推文元素的位置信息
            const rect = tweetElement.getBoundingClientRect();
            const elementTop = rect.top + window.pageYOffset;
            const viewportHeight = window.innerHeight;
            
            // 将推文顶部滚动到视窗中央偏上位置（更多按钮通常在推文顶部）
            const targetScrollTop = elementTop - (viewportHeight * 0.3);
            
            log(`📍 滚动到更多按钮位置: ${Math.round(targetScrollTop)}px`, 'debug');
            
            window.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
            });
            
            // 等待滚动完成
            await wait(1500);
            
            log('✅ 更多按钮已滚动到视窗内', 'debug');
        } catch (error) {
            log(`滚动到更多按钮位置失败: ${error.message}`, 'error');
        }
    }
    
    // 通用推文元素滚动函数（作为备选方案）
    async function scrollToTweetElement(tweetElement) {
        try {
            const rect = tweetElement.getBoundingClientRect();
            const elementTop = rect.top + window.pageYOffset;
            const viewportHeight = window.innerHeight;
            const targetScrollTop = elementTop - (viewportHeight * 0.3);
            
            log(`📍 滚动到推文位置: ${Math.round(targetScrollTop)}px`, 'debug');
            
            window.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
            });
            
            await wait(1500);
        } catch (error) {
            log(`滚动到推文位置失败: ${error.message}`, 'error');
        }
    }
    
    // ==================== 导出到全局 ====================
    
    window.TwitterCleaner = {
        start: cleanupTweets,
        config: CONFIG,
        stats: stats,
        
        // 调试工具
        debug: {
            tweet: function(tweetElement) {
                const tweetInfo = getTweetInfo(tweetElement);
                console.table(tweetInfo);
            },
            isRetweet: isRetweetedPost,
            isReply: isReplyPost,
            isQuote: isQuotePost,
            detectType: detectTweetType,
            findButton: findRetweetButton
        },
        
        setConfig: function(newConfig) {
            Object.assign(CONFIG, newConfig);
            log('✅ 配置已更新');
            console.table(CONFIG);
        },
        
        setCutoffDate: function(dateStr) {
            CONFIG.cutoffDate = new Date(dateStr);
            log(`📅 截止日期设置为: ${CONFIG.cutoffDate.toLocaleDateString()}`);
        },
        
        enableDebug: function(enable = true) {
            CONFIG.debug = enable;
            log(`🔍 调试模式${enable ? '开启' : '关闭'}`);
        },
        
        resetProgress: function() {
            processedTweetIds.clear();
            stats = { processed: 0, deleted: 0, skipped: 0, errors: 0, scrollAttempts: 0, totalElements: 0 };
            log('🔄 进度已重置');
        },
        
        showProgress: showProgress,
        
        // 暂停和恢复功能
        stop: function() {
            CONFIG.maxTweets = stats.processed; // 通过设置限制来停止
            log('⏹️ 脚本已停止');
        }
    };
    
    log('🚀 X.com 清理脚本已加载完成 (简化版)', 'success');
    log('📖 使用方法:');
    log('1. TwitterCleaner.start() - 开始执行');
    log('2. TwitterCleaner.setCutoffDate("2022-01-01") - 设置删除截止日期');
    log('7. TwitterCleaner.showProgress() - 显示当前进度');
    log('8. TwitterCleaner.stop() - 停止执行');
    log('💡 脚本会自动滚动到每条推文位置后再进行删除操作');
    
    console.table(CONFIG);
    
})();