# Phoenix Explorer — Community Cardano Explorer

## Community Project — Development in Progress

**I'm still committed to pushing this project forward**, but progress will be slower than anticipated due to the lack of funding. Unfortunately, my application to [Project Catalyst Fund 14](https://projectcatalyst.io/funds/14/cardano-open-developers/phoenix-explorer-reviving-an-open-source-explorer) was not successful, which means development will continue at a reduced pace as this remains a volunteer effort.

Despite these constraints, my goal remains the same: to build this explorer **for the community and as open source** so it can be reused by everyone. It's unfortunate that this valuable piece of software was about to be discontinued, which is why I decided to pick it up and continue its development.

**Development will progress as time permits. Any contributions — code, feedback, or support — are greatly appreciated!**

## Mission & Vision

Phoenix Explorer is an open-source Cardano blockchain explorer, originally based on the [Cardano Foundation Explorer](https://github.com/cardano-foundation/cf-explorer-frontend). When this important piece of infrastructure was about to be discontinued, this project stepped in to **revive, maintain, and extend it for the entire Cardano ecosystem**.

- **Community-Driven** — built by the community, for the community
- **Fully Open Source** — available for everyone to use, modify, and contribute
- **Multi-Provider** — supports Blockfrost (Gateway or direct) and Yaci Store
- **Actively Maintained** — bugs fixed, features added, PRs welcome

## Live Deployment

[phoenix-explorer.org](https://phoenix-explorer.org)

*You may encounter bugs. Thank you for your patience!*

---

## Features

### Dashboard
- Live blockchain visualizer — horizontal scrollable chain showing real-time blocks with fill level, transaction count, and pool info
- Network activity chart — transactions per block and average block fill over configurable ranges (Day / Week / Month / Year)
- Epoch progress, latest block stats, circulating supply, and active stake summary cards
- Latest blocks and latest transactions tables
- Top delegation pools with saturation bars

### Block Explorer
- Paginated block list with block number, time, transaction count, size, and fill bar
- Block detail — hash, epoch/slot, producer pool, all transactions, and visual fill indicator

### Transaction Explorer
- Paginated transaction list with type tags (Transfer, Token, Mint, Stake, Pool, Script, Governance)
- Transaction detail — UTXOs, fees, metadata, smart contract redeemers, minting/burning, delegations, withdrawals, and signatories

### Epoch Explorer
- Epoch list with status (active / completed), block count, transaction count, fees, and active stake
- Epoch detail with full statistics

### Stake Pools
- Pool list with live saturation, pool size, and lifetime blocks
- Pool detail — metadata, pledge, margin, delegation stats, produced blocks, and staking lifecycle

### Native Tokens & NFTs
- Token list with logo, ticker, and circulating supply
- Token detail — mint/burn analytics chart, holder list, transaction history, and policy details
- Policy page listing all tokens under a minting policy

### Addresses
- Payment address detail — balance, UTXOs, and transaction history
- Stake address detail — delegation, rewards, and registration history

### Governance (Conway era)
- Governance action list and detail (proposals, votes, ratification status)
- DRep registry with delegation tracking and vote history
- Constitutional Committee member list and detail

### Protocol Parameters
- Live on-chain protocol parameters organised into Network, Economic, Technical, and Governance groups
- Interactive playground for each group — simulate the effect of parameter changes (fee calculations, pool saturation, epoch reward splits, block throughput, and more)

---

## Architecture

Phoenix Explorer is an npm workspaces monorepo with three packages:

```
phoenix-explorer/
├── packages/
│   ├── frontend/   # React 18 SPA (Vite, MUI v7, Redux Toolkit, React Router v7)
│   ├── backend/    # Express 5 gateway server (TypeScript, Blockfrost SDK)
│   └── shared/     # DTOs and API types consumed by both frontend and backend
├── docs/           # Development guides
└── .env.example    # Environment variable template
```

### Data Provider Connectors

The frontend uses a pluggable connector system. The active connector is selected via the `REACT_APP_API_TYPE` environment variable and can be overridden at runtime from the provider settings UI.

| Mode | How it works | When to use |
|------|-------------|-------------|
| `GATEWAY` (default) | Frontend → local Express backend → Blockfrost | Production; keeps API key server-side, adds response caching |
| `YACI` | Frontend → Yaci Store REST API directly | Local devnet / private networks using [Yaci Store](https://github.com/bloxbean/yaci-store) |
| `BLOCKFROST` | Frontend → Blockfrost API directly from the browser | Quick local testing; exposes API key in the JS bundle — not for production |

---

## Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Node.js | 18.x | 20.x recommended |
| npm | 9.x | comes with Node 18+ |
| Docker & Compose | 24.x / 2.x | optional, for the Docker setup |

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/Kammerlo/phoenix-explorer.git
cd phoenix-explorer
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
# Blockfrost API key — get a free key at https://blockfrost.io
# The prefix must match NETWORK (e.g. "mainnet..." for mainnet)
API_KEY=mainnetXXXXXXXXXXXXXXXXXXXXXXXXXX

# Cardano network: mainnet | preprod | preview
NETWORK=mainnet
```

All other values have working defaults for local development.

### 3. Start

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |

---

## Environment Variables

The root `.env` file configures both the backend and the Vite frontend build.

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | — | **Required.** Blockfrost project key. |
| `NETWORK` | `mainnet` | Cardano network (`mainnet`, `preprod`, `preview`). |
| `PORT` | `3000` | Port the Express server listens on. |
| `HOST` | `0.0.0.0` | Interface the server binds to. |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_TYPE` | `GATEWAY` | Active data provider (`GATEWAY`, `YACI`, `BLOCKFROST`). |
| `REACT_APP_API_URL` | `http://localhost:3000/api` | Base URL for the selected provider. |
| `REACT_APP_NETWORK` | `mainnet` | Network label shown in the UI. |
| `REACT_APP_BLOCKFROST_API_KEY` | — | Only needed for `BLOCKFROST` mode (browser-direct). |
| `REACT_APP_API_URL_COIN_GECKO` | CoinGecko markets endpoint | ADA price data source. |

### Provider URL examples

```env
# GATEWAY (default)
REACT_APP_API_URL=http://localhost:3000/api

# YACI
REACT_APP_API_URL=http://localhost:8080/api/v1

# BLOCKFROST (direct)
REACT_APP_API_URL=https://cardano-mainnet.blockfrost.io/api/v0
```

---

## Docker Setup

```bash
cp .env.example .env
# Fill in API_KEY in .env
docker compose up --build
```

Then start the frontend separately (Vite requires a host dev server):

```bash
npm run dev --workspace=frontend
```

---

## Individual Package Scripts

All commands can also be run per-package from the repo root:

```bash
# Frontend only
npm run dev --workspace=frontend      # Vite dev server (hot reload)
npm run build --workspace=frontend    # Production build to packages/frontend/dist/

# Backend only
npm run dev --workspace=backend       # ts-node-dev with hot reload
npm run build --workspace=backend     # Compile TypeScript to packages/backend/dist/
```

---

## Contributing

Contributions are what keep this project alive.

- **Report bugs** — open an issue with reproduction steps
- **Suggest features** — ideas and feedback are welcome
- **Submit PRs** — code contributions are greatly appreciated
- **Improve docs** — help make setup and usage clearer
- **Star the repo** — helps with visibility

See [`docs/local-development.md`](docs/local-development.md) for a detailed guide covering environment setup, switching providers, and connecting to a local Yaci devnet.

---

*Built with love for the Cardano ecosystem.*
