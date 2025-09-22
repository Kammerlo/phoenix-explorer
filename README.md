# Phoenix Explorer - Community Cardano Explorer 🚀

## 🚧 Development Notice - Community Project 🚧

**This explorer is currently under heavy development.** I'm actively seeking funding and have applied to [Project Catalyst Fund 14](https://projectcatalyst.io/funds/14/cardano-open-developers/phoenix-explorer-reviving-an-open-source-explorer) to support this initiative.

My goal is to build this explorer **for the community and as open source** so it can be reused by everyone. It's unfortunate that this valuable piece of software was about to be discontinued, which is why I decided to pick it up and continue its development.

## 🎯 Mission & Vision

This repository houses an open source Cardano Explorer, originally based on the [Cardano Foundation Explorer](https://github.com/cardano-foundation/cf-explorer-frontend). When this important piece of infrastructure was about to be discontinued, I stepped in to **revive, maintain and extend it for the entire Cardano ecosystem**.

**Why Phoenix Explorer?**
- 🌟 **Community-Driven**: Built by the community, for the community
- 🔓 **Fully Open Source**: Available for everyone to use, modify, and contribute
- 🔄 **Continuous Development**: Actively maintained and improved
- 🤝 **Collaborative**: Welcoming contributions from all Cardano developers

## 🌐 Live Deployment

Currently deployed at: **[phoenix-explorer.org](https://phoenix-explorer.org)**

*Please note: There's still a lot of work to do, and you may encounter bugs along the way. Thank you for your patience! 🙏*

## 🏗️ Architecture & API Support

**Currently Work-in-progress:**
- 🔄 Blockfrost - as an API Gateway

**Planned API Connectors:**
- 🔄 [Yaci-Store](https://github.com/bloxbean/yaci-store) API
- 🔄 Additional APIs based on community needs

**Important Note:** Since we rely on public APIs, we can only display the data available through these services. This may differ from aggregated data available in proprietary explorers.

## 🤝 Community Contributions Welcome!

Your contributions help keep this project alive! Here's how you can help:

- 🐛 **Report Bugs**: Found an issue? Please open an issue
- 💡 **Suggest Features**: Have ideas? We'd love to hear them
- 🔧 **Submit PRs**: Code contributions are greatly appreciated
- 📖 **Improve Docs**: Help make the documentation better
- ⭐ **Star the Repo**: Show your support for the project

**Let's build the future of Cardano exploration together!**


## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: `^v18.16.0` or higher (Node 20+ recommended)
- **npm**: `^9.5.1` or higher
- **Git**: For cloning the repository

## 🚀 Quick Start Guide

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/Kammerlo/phoenix-explorer.git
cd phoenix-explorer

# Install dependencies
npm install
```

### Step 2: Environment Configuration

```bash
# Create environment file from template
cp packages/frontend/.env.example packages/frontend/.env
cp packages/backend/.env.example packages/backend/.env
```

### Step 3: Configure Environment Variables

Edit `packages/frontend/.env` with your settings:

```env
# Application Configuration
PORT=3000
REACT_APP_NETWORK=mainnet  # Options: mainnet, preprod, preview

# API Configuration
REACT_APP_API_TYPE=GATEWAY    # Currently supported: GATEWAY
REACT_APP_API_URL=http://localhost:8080  # Your Gateway backend
```

**Supported Networks:**
- `mainnet` - Cardano Mainnet
- `preprod` - Cardano Pre-Production Testnet  
- `preview` - Cardano Preview Testnet

### Step 4: Development Server

```bash
# Start the development servers - will start backend and frontend
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
phoenix-explorer/
├── packages/
│   ├── frontend/     # React frontend application
│   ├── backend/      # Backend API services (if applicable)
│   └── shared/       # Shared utilities and types
├── docs/            # Documentation
└── README.md        # This file
```

---

**Built with ❤️ for the Cardano ecosystem**