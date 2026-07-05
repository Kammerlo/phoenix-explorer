# Local Development Guide

This guide covers running Phoenix Explorer on your local machine, configuring environment variables, switching data providers, and pointing the explorer at a private Yaci devnet.

---

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| Node.js | 18.x | 20.x recommended |
| npm | 9.x | comes with Node 18+ |
| Docker | 24.x | only required for the Docker Compose setup |
| Docker Compose | 2.x | bundled with Docker Desktop |

The project is an npm workspaces monorepo. All `npm` commands below must be run from the **repository root** unless stated otherwise.

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd phoenix-explorer

# 2. Install all workspace dependencies (frontend + gateway + shared)
npm install

# 3. Copy and fill in environment files
cp .env.template packages/gateway/.env
cp packages/frontend/.env.example packages/frontend/.env
# Edit both files — at minimum set API_KEY in packages/gateway/.env

# 4. Start both services concurrently
npm run dev
```

`npm run dev` runs the following workspaces in parallel using `concurrently`:

- **Gateway** — `ts-node-dev` with hot-reload on `packages/gateway/src/server.ts`, default port **3000**
- **Frontend** — Vite dev server on `packages/frontend`, default port **5173** (or the `PORT` value in `packages/frontend/.env`)

Open `http://localhost:5173` in your browser once both processes are ready.

---

## Environment Variables

### Gateway (`packages/gateway/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `API_KEY` | Yes* | — | Blockfrost project API key. Required when the gateway acts as a Blockfrost gateway. |
| `PORT` | No | `3000` | Port the Express server listens on. |
| `HOST` | No | `0.0.0.0` | Interface the server binds to. |
| `NETWORK` | No | `mainnet` | Cardano network passed to Blockfrost (`mainnet`, `preprod`, `preview`). |

*`API_KEY` is only required when the frontend is configured with `REACT_APP_API_TYPE=GATEWAY`.

### Frontend (`packages/frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `REACT_APP_API_TYPE` | No | `GATEWAY` | Active provider: `GATEWAY`, `YACI`, or `BLOCKFROST`. |
| `REACT_APP_API_URL` | No | `http://localhost:8080/api/v1` | Base URL for the selected provider. |
| `REACT_APP_NETWORK` | No | `mainnet` | Display network name (`mainnet`, `preprod`, `preview`). |
| `REACT_APP_BLOCKFROST_API_KEY` | No | — | Blockfrost API key used when `REACT_APP_API_TYPE=BLOCKFROST` (browser-side direct calls). |
| `REACT_APP_API_URL_COIN_GECKO` | No | `https://api.coingecko.com/...` | CoinGecko endpoint for ADA price data. |
| `PORT` | No | `3000` | Port used by the Vite dev server. |

A template covering both gateway and frontend variables is provided at `.env.template` in the repository root.

---

## Provider Switching

Phoenix Explorer supports three data providers. The active provider is determined by `REACT_APP_API_TYPE` in the frontend `.env` file. The selection can also be overridden at runtime via the provider settings UI, which persists the configuration in `localStorage` under the key `phoenix_provider_config`.

### GATEWAY (default)

The frontend talks to the local Express gateway, which proxies requests to Blockfrost.

```env
# packages/frontend/.env
REACT_APP_API_TYPE=GATEWAY
REACT_APP_API_URL=http://localhost:3000/api

# packages/gateway/.env
API_KEY=mainnetXXXXXXXXXXXXXXXXXXXXXXXX
NETWORK=mainnet
```

### YACI

The frontend talks directly to a [Yaci Store](https://github.com/bloxbean/yaci-store) REST API. No gateway process is needed.

```env
# packages/frontend/.env
REACT_APP_API_TYPE=YACI
REACT_APP_API_URL=http://localhost:8080/api/v1
REACT_APP_NETWORK=preview
```

Set `REACT_APP_API_URL` to the base URL of your Yaci Store instance. See [Pointing at a Yaci Devnet](#pointing-at-a-yaci-devnet) for local devnet instructions.

### BLOCKFROST

The frontend calls Blockfrost directly from the browser. Suitable for quick read-only use; your API key will be visible in the browser.

```env
# packages/frontend/.env
REACT_APP_API_TYPE=BLOCKFROST
REACT_APP_API_URL=https://cardano-mainnet.blockfrost.io/api/v0
REACT_APP_BLOCKFROST_API_KEY=mainnetXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_NETWORK=mainnet
```

---

## Docker Compose Setup

The Docker Compose configuration builds the gateway Express server from source and runs it as a container. The frontend continues to run as a Vite dev server on the host.

### Files created

| File | Location |
|---|---|
| `Dockerfile.gateway` | `packages/gateway/Dockerfile.gateway` |
| `docker-compose.yml` | Repository root `docker-compose.yml` |

### `packages/gateway/Dockerfile.gateway`

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY packages/gateway/package.json ./packages/gateway/
COPY packages/shared/package.json ./packages/shared/

# Install all workspace deps
RUN npm install --workspaces

# Copy source
COPY packages/gateway/ ./packages/gateway/
COPY packages/shared/ ./packages/shared/
COPY tsconfig.base.json ./

# Build shared first, then gateway
RUN npm run build --workspace=shared
RUN npm run build --workspace=gateway

EXPOSE 3000

CMD ["node", "packages/gateway/dist/server.js"]
```

### `docker-compose.yml` (repository root)

```yaml
version: "3.9"

services:
  gateway:
    build:
      context: .
      dockerfile: packages/gateway/Dockerfile.gateway
    ports:
      - "3000:3000"
    environment:
      PORT: "3000"
      HOST: "0.0.0.0"
      NETWORK: "${NETWORK:-mainnet}"
      API_KEY: "${API_KEY}"
    restart: unless-stopped
```

### Usage

1. Copy and fill in the root template:

   ```bash
   cp .env.template .env
   # Edit .env and set at least API_KEY
   ```

2. Build and start the gateway container:

   ```bash
   docker compose up --build
   ```

3. Start the frontend on the host:

   ```bash
   npm run dev --workspace=frontend
   ```

4. Point your frontend at the containerised gateway:

   ```env
   # packages/frontend/.env
   REACT_APP_API_TYPE=GATEWAY
   REACT_APP_API_URL=http://localhost:3000/api
   ```

---

## Configuring the Blockfrost API Key

1. Create a free project at [blockfrost.io](https://blockfrost.io) for the network you need (`mainnet`, `preprod`, or `preview`).
2. Copy the project ID — it looks like `mainnetXXXXXXXXXXXXXXXXXXXXXXXX`.
3. Set `API_KEY` in `packages/gateway/.env` (or in your Docker `.env`).
4. Ensure `NETWORK` in the same file matches the network of the API key.

The gateway reads these values in `packages/gateway/src/config/env.ts` via `dotenv`.

---

## Pointing at a Yaci Devnet

[Yaci DevKit](https://github.com/bloxbean/yaci-devkit) provides a self-contained private Cardano network with a built-in Yaci Store REST API (default `http://localhost:8080`). The frontend's `YaciConnector` calls Yaci Store **directly from the browser** — there is no gateway/Yaci proxy — so the only thing to get right is the browser's cross-origin rules.

### Local explorer (CORS-free) — recommended for devnet work

Run the explorer in dev mode and let Vite proxy Yaci **same-origin**, so the browser never makes a cross-origin request (no CORS to configure):

1. Bring up your devnet (Yaci Store at `http://localhost:8080`). Non-default port/host? set `REACT_APP_YACI_PROXY_TARGET` in the root `.env` (e.g. `REACT_APP_YACI_PROXY_TARGET=http://localhost:9000`).
2. Start the frontend (the gateway is not needed for YACI):
   ```bash
   npm run dev --workspace=frontend
   ```
3. Open the provider switcher → **Yaci Store (Direct)** → **Use local devnet URL** (fills `/local-yaci/api/v1`) → **Save & Reload**. Vite proxies `/local-yaci/*` → your Yaci Store. No CORS, no mixed content, no Chrome prompt.
   - Or seed it via the root `.env`: `REACT_APP_API_TYPE=YACI`, `REACT_APP_API_URL=/local-yaci/api/v1`.

> Pointing the browser straight at `http://localhost:8080/api/v1` works only if Yaci Store sends CORS headers for your origin; the `/local-yaci` proxy avoids that entirely.

### Hosted explorer (phoenix-explorer.org) + your local Yaci

The hosted server **cannot reach your localhost** — only your browser can, and browsers gate a public HTTPS page calling a local service. Reality (Chrome, late 2025+):
- **Mixed content is fine** for `http://localhost` / `http://127.0.0.1` (loopback is "potentially trustworthy"). Don't use `0.0.0.0`.
- **CORS is required** — the local target must return `Access-Control-Allow-Origin: https://phoenix-explorer.org`.
- **Local Network Access (LNA):** Chrome shows a one-time **"Allow local network"** prompt for a public site → localhost (it replaced the old `Access-Control-Allow-Private-Network` header). Firefox has no such prompt.

Pick one transport, then set the URL via the provider switcher (**Use local devnet URL** pre-fills `http://localhost:8090/api/v1`):

1. **CORS bridge (no tunnel, lowest friction).** Run a tiny CORS reverse-proxy in front of Yaci. Example `Caddyfile` (`caddy run`):
   ```caddyfile
   :8090 {
     @opts method OPTIONS
     handle @opts {
       header Access-Control-Allow-Origin "https://phoenix-explorer.org"
       header Access-Control-Allow-Methods "GET, POST, OPTIONS"
       header Access-Control-Allow-Headers "*"
       header Access-Control-Allow-Private-Network "true"
       respond "" 204
     }
     header Access-Control-Allow-Origin "https://phoenix-explorer.org"
     header Access-Control-Allow-Private-Network "true"
     reverse_proxy 127.0.0.1:8080
   }
   ```
   Set Yaci Base URL to `http://localhost:8090/api/v1`; accept Chrome's "Allow local network" prompt. (Alternative: enable CORS in yaci-store itself.)
2. **HTTPS tunnel (most robust, no prompt).** `cloudflared tunnel --url http://localhost:8080` (or `ngrok http 8080`) → set Yaci Base URL to the public `https://…/api/v1`. A public origin sidesteps LNA + mixed content; only ordinary CORS applies.
3. **Browser extension (advanced, prompt-free).** A proxy extension relays requests to localhost, bypassing page CORS/LNA. Heaviest to set up; out of scope here.

The provider selection is saved to the `phoenix_provider` cookie and applied on reload.

---

## Useful Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start gateway + frontend concurrently (from repo root) |
| `npm run dev --workspace=frontend` | Start only the Vite dev server |
| `npm run dev --workspace=gateway` | Start only the Express gateway with hot-reload |
| `npm run build --workspace=gateway` | Compile the gateway TypeScript to `packages/gateway/dist/` |
| `npm run build --workspace=frontend` | Build the frontend for production to `packages/frontend/dist/` |
| `docker compose up --build` | Build and start the gateway Docker container |
