# Documentation

Welcome to the Twitter Cleaner documentation. This comprehensive guide will help you understand, use, and contribute to the Twitter Cleaner Chrome extension.

## 📚 Documentation Overview

### [Chrome Extension Requirements (PRD)](prd/)
Complete product requirements documentation for the Chrome extension.

- [Chrome Extension Features](prd/#chrome-extension-requirements)
- [Product Vision & Values](prd/#-product-vision)
- [Development Roadmap](prd/#-development-roadmap)
- [Success Metrics](prd/#-product-metrics)

### [User Guide](user-guide/)
Complete guide for end users, including installation, configuration, and troubleshooting.

- [Getting Started](user-guide/#getting-started)
- [Installation](user-guide/#installation)
- [Basic Usage](user-guide/#basic-usage)
- [Advanced Features](user-guide/#advanced-features)
- [Troubleshooting](user-guide/#troubleshooting)
- [Best Practices](user-guide/#best-practices)

### [Development Guide](development/)
Comprehensive guide for developers who want to contribute to the project.

- [Project Structure](development/#project-structure)
- [Development Setup](development/#development-setup)
- [Core Architecture](development/#core-architecture)
- [Key Modules](development/#key-modules)
- [Testing](development/#testing)
- [Building and Deployment](development/#building-and-deployment)

### [API Reference](api/)
Detailed API documentation for extension APIs and internal interfaces.

- [Chrome Extension APIs](api/#chrome-extension-apis)
- [Internal APIs](api/#internal-apis)
- [Message Types](api/#message-types)
- [Configuration Schema](api/#configuration-schema)
- [Error Handling](api/#error-handling)

### [Examples](examples/)
Practical code examples and integration patterns.

- [Configuration Examples](examples/#configuration-examples)
- [Extension Development Examples](examples/#extension-development-examples)
- [Integration Examples](examples/#integration-examples)
- [Testing Examples](examples/#testing-examples)
- [Custom UI Examples](examples/#custom-ui-examples)

## 🚀 Quick Start

### For Users

1. **Install the Extension**
   ```bash
   # From Chrome Web Store (recommended)
   # Visit: https://chrome.google.com/webstore/detail/twitter-cleaner/XXXXXX
   ```

2. **Configure Settings**
   - Open Twitter/X in your browser
   - Click the Twitter Cleaner icon
   - Set your preferred cutoff date and tweet types

3. **Start Cleaning**
   - Click "Start Cleaning"
   - Monitor progress in real-time
   - Stop anytime if needed

### For Developers

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/twitter-cleaner.git
   cd twitter-cleaner
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Load Extension**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

## 📋 Documentation Structure

```
docs/
├── README.md                 # This file - documentation overview
├── prd/                     # Chrome Extension Product Requirements
│   ├── README.md            # PRD overview and roadmap
│   ├── Twitter_Cleaner_Chrome_Extension_PRD_v2.0.md  # Chrome extension requirements
│   └── Twitter_Cleaner_PRD.md                 # Product overview
├── user-guide/              # End-user documentation
│   └── README.md            # Complete user guide
├── development/             # Developer documentation
│   ├── README.md            # Development guide
│   └── architecture/        # Architecture diagrams
├── api/                     # API reference
│   └── README.md            # API documentation
├── examples/                # Code examples
│   └── README.md            # Examples overview
└── images/                  # Documentation images
    └── architecture.png     # Architecture diagram
```

## 🎯 Key Features

### Core Functionality
- **Bulk Tweet Deletion**: Remove tweets, retweets, replies, and quotes
- **Selective Cleaning**: Choose which types of content to delete
- **Date-based Filtering**: Delete content older than specified date
- **Real-time Progress**: Monitor cleaning progress with detailed statistics
- **Safe Operation**: All processing happens locally in your browser

### Technical Features
- **Chrome Extension**: Built with Manifest V3
- **Modern JavaScript**: ES6+ with async/await
- **Modular Architecture**: Clean, maintainable code structure
- **Comprehensive Testing**: Unit, integration, and e2e tests
- **Performance Optimized**: Efficient processing with rate limiting

### User Experience
- **Intuitive Interface**: Easy-to-use popup interface
- **Configurable Settings**: Flexible configuration options
- **Progress Tracking**: Real-time progress and statistics
- **Error Handling**: Robust error recovery and logging
- **Privacy-focused**: No data collection or external servers

## 🔧 Technical Requirements

### System Requirements
- **Browser**: Chrome (latest version recommended)
- **Memory**: 512MB RAM minimum
- **Storage**: 50MB disk space for extension

### Development Requirements
- **Node.js**: v16 or higher
- **Chrome**: Developer mode enabled
- **Git**: For version control
- **Text Editor**: VS Code or similar

## 📖 Related Documentation

### Extension Documentation
- [Chrome Extension Developer Guide](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extension API Reference](https://developer.chrome.com/docs/extensions/reference/)

### Web Development Resources
- [MDN Web Docs](https://developer.mozilla.org/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [JavaScript Best Practices](https://github.com/airbnb/javascript)

### Open Source Resources
- [Open Source Guides](https://opensource.guide/)
- [Contributor Covenant](https://www.contributor-covenant.org/)
- [Keep a Changelog](https://keepachangelog.com/)

## 🤝 Contributing to Documentation

We welcome contributions to our documentation! Here's how you can help:

### Ways to Contribute
1. **Fix Typos and Errors**: Small corrections are always appreciated
2. **Add Examples**: Share your custom implementations
3. **Improve Clarity**: Make complex topics easier to understand
4. **Add Screenshots**: Visual documentation helps users
5. **Translate**: Help translate documentation to other languages

### Documentation Guidelines
- Use clear, concise language
- Include code examples where helpful
- Follow the existing formatting and structure
- Add screenshots for UI-related content
- Test your examples to ensure they work

### Submitting Changes
1. Fork the repository
2. Create a documentation branch
3. Make your changes
4. Submit a pull request with "docs:" prefix

## 📞 Support

### Getting Help
- **Documentation**: Start with these docs
- **GitHub Discussions**: Ask questions and share tips
- **GitHub Issues**: Report bugs or request features
- **Email Support**: For sensitive issues

### Community Resources
- [GitHub Discussions](https://github.com/yourusername/twitter-cleaner/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/twitter-cleaner)
- [Reddit r/chromeextensions](https://www.reddit.com/r/chromeextensions/)

## 📄 License

This documentation is part of the Twitter Cleaner project and is licensed under the MIT License. See [LICENSE](../LICENSE) for details.

## 🔗 Quick Links

- [Main README](../README.md)
- [Installation Guide](user-guide/#installation)
- [Development Setup](development/#development-setup)
- [API Reference](api/#chrome-extension-apis)
- [Examples](examples/#configuration-examples)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Changelog](../CHANGELOG.md)

---

*Documentation last updated: January 2025*