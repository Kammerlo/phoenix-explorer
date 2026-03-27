# Phoenix Explorer - Community Cardano Explorer 🚀

## 🚧 Community Project - Development Continues 🚧

**I'm still committed to pushing this project forward**, but progress will be slower than anticipated due to the lack of funding. Unfortunately, my application to [Project Catalyst Fund 14](https://projectcatalyst.io/funds/14/cardano-open-developers/phoenix-explorer-reviving-an-open-source-explorer) was not successful, which means development will continue at a reduced pace as this remains a volunteer effort.

Despite these constraints, my goal remains the same: to build this explorer **for the community and as open source** so it can be reused by everyone. It's unfortunate that this valuable piece of software was about to be discontinued, which is why I decided to pick it up and continue its development.

**Development will progress as time permits.** Any contributions, whether code, feedback, or support, are greatly appreciated!

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
# Create environment file from the template
cp .env.example .env
```

Then edit `.env` and fill in the required values:

| Variable | Description |
|---|---|
| `API_KEY` | Blockfrost project API key (get one at [blockfrost.io](https://blockfrost.io)) |
| `NETWORK` | Cardano network: `mainnet`, `preprod`, or `preview` |
| `REACT_APP_API_TYPE` | Data provider: `GATEWAY` (default), `YACI`, or `BLOCKFROST` |
| `REACT_APP_API_URL` | Backend URL (default `http://localhost:3000/api` for GATEWAY mode) |
| `REACT_APP_NETWORK` | Network label shown in the UI |

**Supported Networks:**
- `mainnet` - Cardano Mainnet
- `preprod` - Cardano Pre-Production Testnet
- `preview` - Cardano Preview Testnet

### Step 3: Development Server

```bash
# Start both backend and frontend with a single command
npm run dev
```

The application will be available at [http://localhost:5173](http://localhost:5173)

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