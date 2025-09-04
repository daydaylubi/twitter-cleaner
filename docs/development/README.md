# Development Guide

## Overview

This guide provides comprehensive information for developers who want to contribute to the Twitter Cleaner Chrome extension.

## Project Structure

```
twitter-cleaner/
├── src/
│   ├── content/
│   │   ├── content.js          # Main content script
│   │   ├── tweet-detector.js   # Tweet identification logic
│   │   └── deleter.js          # Deletion operations
│   ├── popup/
│   │   ├── popup.html          # Extension popup UI
│   │   ├── popup.js            # Popup logic
│   │   └── popup.css           # Popup styles
│   ├── background/
│   │   └── background.js       # Background service worker
│   ├── utils/
│   │   ├── storage.js          # Chrome storage utilities
│   │   ├── messaging.js        # Message passing utilities
│   │   └── logger.js           # Logging utilities
│   └── assets/
│       ├── icons/              # Extension icons
│       └── images/             # UI images
├── docs/                       # Documentation
├── tests/                      # Test files
├── .github/                    # GitHub workflows
├── dist/                       # Build output
├── package.json
└── manifest.json               # Extension manifest
```

## Prerequisites

- Node.js (v16 or higher)
- Chrome browser
- Git
- Basic knowledge of:
  - JavaScript/ES6+
  - Chrome Extension API
  - DOM manipulation
  - Async/await patterns

## Development Setup

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/twitter-cleaner.git
cd twitter-cleaner

# Install dependencies
npm install

# Create development branch
git checkout -b feature/your-feature-name
```

### 2. Development Environment

```bash
# Start development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### 3. Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` directory (after building)

## Core Architecture

### Extension Components

#### 1. Content Script (`src/content/`)
- **Purpose**: Interact with Twitter pages
- **Responsibilities**:
  - Detect tweet elements
  - Perform deletion operations
  - Handle page scrolling
  - Send progress updates

#### 2. Popup (`src/popup/`)
- **Purpose**: User interface for configuration
- **Responsibilities**:
  - Display settings form
  - Show progress and logs
  - Handle user interactions
  - Communicate with content script

#### 3. Background Script (`src/background/`)
- **Purpose**: Background service worker
- **Responsibilities**:
  - Manage extension state
  - Handle message routing
  - Manage storage operations

#### 4. Utilities (`src/utils/`)
- **Purpose**: Shared functionality
- **Components**:
  - Storage management
  - Message passing
  - Logging system
  - Helper functions

### Message Passing Architecture

```javascript
// Popup → Content Script
chrome.tabs.sendMessage(tabId, {
  type: 'START_CLEANING',
  payload: { config }
});

// Content Script → Popup
chrome.runtime.sendMessage({
  type: 'PROGRESS_UPDATE',
  payload: { stats }
});

// Background script routes messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Route messages between components
});
```

## Key Modules

### Tweet Detection

```javascript
// src/content/tweet-detector.js
class TweetDetector {
  constructor() {
    this.selectors = {
      tweet: '[data-testid="tweet"]',
      timestamp: 'time[datetime]',
      deleteButton: '[data-testid="caret"]'
    };
  }

  async findTweets() {
    // Implementation for finding tweet elements
  }

  getTweetType(tweetElement) {
    // Determine if tweet, retweet, reply, or quote
  }

  getTweetDate(tweetElement) {
    // Extract tweet date
  }
}
```

### Deletion Engine

```javascript
// src/content/deleter.js
class TweetDeleter {
  constructor(config) {
    this.config = config;
    this.stats = { processed: 0, deleted: 0, skipped: 0, errors: 0 };
  }

  async deleteTweet(tweetElement) {
    try {
      // Click delete button
      // Confirm deletion
      // Wait for completion
      // Update stats
    } catch (error) {
      // Handle errors
    }
  }

  async processBatch(tweets) {
    // Process tweets with delays
  }
}
```

### Storage Management

```javascript
// src/utils/storage.js
class StorageManager {
  static async saveConfig(config) {
    return chrome.storage.local.set({ config });
  }

  static async loadConfig() {
    const result = await chrome.storage.local.get('config');
    return result.config || this.getDefaultConfig();
  }

  static async saveProgress(progress) {
    return chrome.storage.local.set({ progress });
  }

  static async clearProgress() {
    return chrome.storage.local.remove('progress');
  }
}
```

## Testing

### Unit Tests

```javascript
// tests/unit/tweet-detector.test.js
describe('TweetDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new TweetDetector();
  });

  test('should detect tweet elements', () => {
    // Mock DOM elements
    // Test detection logic
  });

  test('should extract tweet date correctly', () => {
    // Test date extraction
  });
});
```

### Integration Tests

```javascript
// tests/integration/message-passing.test.js
describe('Message Passing', () => {
  test('should send start cleaning message', async () => {
    // Test message sending between components
  });
});
```

### End-to-End Tests

```javascript
// tests/e2e/cleaning-workflow.test.js
describe('Cleaning Workflow', () => {
  test('should complete full cleaning cycle', async () => {
    // Test complete user workflow
  });
});
```

## Chrome Extension API Usage

### Storage API

```javascript
// Save user preferences
chrome.storage.local.set({ config: userConfig });

// Load preferences
chrome.storage.local.get('config', (result) => {
  const config = result.config;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  // Handle changes
});
```

### Tabs API

```javascript
// Get current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
});

// Send message to content script
chrome.tabs.sendMessage(tabId, message);
```

### Runtime API

```javascript
// Send message to background script
chrome.runtime.sendMessage(message);

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message
});
```

## Development Best Practices

### Code Style

- Follow ES6+ standards
- Use async/await for asynchronous operations
- Implement proper error handling
- Add JSDoc comments for all public methods
- Use meaningful variable and function names

### Error Handling

```javascript
async function safeOperation() {
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    logger.error('Operation failed', error);
    throw new UserFriendlyError('Operation failed. Please try again.');
  }
}
```

### Performance Optimization

- Use debouncing for rapid events
- Implement batch processing
- Cache DOM queries when possible
- Use WeakMap for temporary data storage
- Clean up event listeners

### Security Considerations

- Validate all user inputs
- Sanitize HTML content
- Use Content Security Policy (CSP)
- Implement proper permission requests
- Avoid eval() and other dangerous functions

## Debugging

### Chrome DevTools

1. **Popup Debugging**:
   - Right-click extension popup → "Inspect"
   - Use standard DevTools

2. **Content Script Debugging**:
   - Open Twitter page
   - Open DevTools (F12)
   - Content script appears in "Sources" tab

3. **Background Script Debugging**:
   - Go to `chrome://extensions/`
   - Click "service worker" for background script
   - Use DevTools for debugging

### Common Debugging Scenarios

#### Message Passing Issues
```javascript
// Debug message passing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  console.log('From:', sender);
});
```

#### Tweet Detection Issues
```javascript
// Debug tweet detection
function debugTweetDetection() {
  const tweets = document.querySelectorAll('[data-testid="tweet"]');
  console.log('Found tweets:', tweets.length);
  tweets.forEach((tweet, index) => {
    console.log(`Tweet ${index}:`, tweet);
  });
}
```

## Building and Deployment

### Build Process

```bash
# Development build
npm run build:dev

# Production build
npm run build:prod

# Package for distribution
npm run package
```

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Twitter Cleaner",
  "version": "1.0.0",
  "description": "Bulk delete tweets from your Twitter account",
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
    "default_popup": "popup.html"
  },
  "content_scripts": [
    {
      "matches": ["*://*.twitter.com/*", "*://*.x.com/*"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

### Publishing to Chrome Web Store

1. **Prepare Package**:
   ```bash
   npm run package
   ```

2. **Upload to Chrome Web Store**:
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
   - Upload the ZIP file
   - Complete the store listing

3. **Submit for Review**:
   - Provide detailed description
   - Add screenshots and promotional images
   - Include privacy policy
   - Submit for review

## Contributing

### Development Workflow

1. **Fork the Repository**
2. **Create Feature Branch**:
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make Changes**:
   - Write code following project standards
   - Add tests for new functionality
   - Update documentation

4. **Test Changes**:
   ```bash
   npm test
   npm run lint
   ```

5. **Submit Pull Request**:
   - Push to your fork
   - Create PR with detailed description
   - Address review feedback

### Code Review Guidelines

- Ensure code follows project standards
- Verify tests are included and passing
- Check documentation is updated
- Confirm security considerations are addressed

## Resources

### Documentation
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Twitter HTML Structure Reference](https://developer.twitter.com/)

### Tools
- [Chrome Extension Reloader](https://chrome.google.com/webstore/detail/chrome-extension-reloader/fimgfedafeadlieiabdeeaodndnlbhid)
- [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Web Developer](https://chrome.google.com/webstore/detail/web-developer/bfbameneiokkgbdmiekhjnmfcnpgdmbk)

### Community
- [Chrome Extensions Google Group](https://groups.google.com/a/chromium.org/g/chromium-extensions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/google-chrome-extension)
- [Reddit r/chromeextensions](https://www.reddit.com/r/chromeextensions/)

---

*Last updated: January 2025*