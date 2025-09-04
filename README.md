# Twitter Cleaner

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange.svg)](CHANGELOG.md)

A powerful Chrome extension that helps you clean up your Twitter history by bulk deleting old tweets, retweets, and replies.

## Features

- **Bulk Delete**: Remove tweets, retweets, replies, and quote tweets before a specified date
- **Selective Cleaning**: Choose which types of tweets to delete
- **Progress Tracking**: Real-time progress monitoring with detailed statistics
- **Safe Operation**: All processing happens locally in your browser - no data sent to external servers
- **User Friendly**: Intuitive interface with no technical knowledge required
- **Configurable**: Adjustable delay times and processing limits

## Installation

### Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/detail/twitter-cleaner/XXXXXX)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/yourusername/twitter-cleaner/releases)
2. Unzip the downloaded file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the unzipped folder

## Usage

1. **Open Twitter/X**: Navigate to [twitter.com](https://twitter.com) or [x.com](https://x.com)
2. **Launch Extension**: Click the Twitter Cleaner icon in your browser toolbar
3. **Configure Settings**:
   - Set the cutoff date for tweets to delete
   - Select which types of tweets to clean (tweets, retweets, replies, quotes)
   - Adjust advanced settings if needed
4. **Start Cleaning**: Click "Start Cleaning" and monitor progress
5. **Monitor Progress**: View real-time statistics and logs
6. **Stop Anytime**: Click "Stop Cleaning" to pause the process

## Screenshots

<!-- Add screenshots here -->

## Requirements

- Chrome browser (latest version recommended)
- Access to twitter.com or x.com
- Internet connection during use

## Security & Privacy

- **No Data Collection**: All operations are performed locally in your browser
- **No External Servers**: No data is sent to external servers
- **Minimal Permissions**: Only requests necessary permissions for Twitter.com
- **Open Source**: Full code transparency - you can review the entire codebase

## Development

### Prerequisites

- Node.js (v16 or higher)
- Chrome browser

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/twitter-cleaner.git
cd twitter-cleaner

# Install dependencies (if any)
npm install
```

### Building

```bash
# Build the extension
npm run build

# Create a zip file for distribution
npm run package
```

### Development

```bash
# Start development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Project Structure

```
twitter-cleaner/
├── src/
│   ├── content/           # Content scripts for Twitter interaction
│   ├── popup/             # Extension popup UI
│   ├── background/        # Background service worker
│   └── utils/             # Utility functions
├── assets/                # Images, icons, and static assets
├── docs/                  # Documentation
├── tests/                 # Test files
├── .github/               # GitHub workflows and templates
├── dist/                  # Built extension files
├── package.json
├── README.md
└── LICENSE
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Support for more browsers (Firefox, Safari)
- [ ] Advanced filtering options (hashtags, mentions)
- [ ] Export deletion history
- [ ] Batch scheduling
- [ ] Multi-language support

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## Support

- 📧 **Email**: support@twitter-cleaner.com
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/twitter-cleaner/discussions)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/twitter-cleaner/issues)
- 📖 **Documentation**: Complete [documentation](docs/) with Chrome extension requirements, user guides, and API reference

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is for educational purposes and personal use. Use responsibly and respect Twitter's Terms of Service. The authors are not responsible for any misuse of this tool.

## Acknowledgments

- Twitter/X for their platform
- The open source community for various tools and libraries
- Contributors who help improve this project

---

**Made with ❤️ by the Twitter Cleaner team**