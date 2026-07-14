import express from "express";
import compression from "compression";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { ENV } from "./config/env";
import { epochController } from "./controller/epoch-controller";
import { blockController } from "./controller/block-controller";
import { transactionController } from "./controller/transaction-controller";
import { tokenController } from "./controller/token-controller";
import { governanceController } from "./controller/governance-controller";
import { addressController } from "./controller/address-controller";
import { poolController } from "./controller/pool-controller";
import { protocolParamsController } from "./controller/protocol-params-controller";
import { dashboardController } from "./controller/dashboard-controller";
import { searchController } from "./controller/search-controller";
import { uplcVerificationController } from "./controller/uplc-verification-controller";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// One proxy hop (the frontend nginx) sets X-Real-IP/X-Forwarded-For — trust it
// so req.ip (and the rate limiter) see the real client, not the proxy.
app.set("trust proxy", 1);

app.use(cors()); // Adjust for your frontend origin if needed
// Gzip JSON responses — a token-heavy transaction detail is ~290KB identity /
// ~30KB gzipped. Browsers always send Accept-Encoding, so this is pure win.
app.use(compression());
app.use(express.json());

// Inbound access log: the client-proxy already logs every upstream Blockfrost
// call, but without this line the *cause* of that traffic (which request, from
// whom) is invisible — "the gateway is doing something" is always an inbound
// request being served.
app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    const ua = (req.headers["user-agent"] ?? "-").slice(0, 60);
    console.log(
      `[${new Date().toISOString()}] [request] ${req.ip} ${req.method} ${req.originalUrl} → ${res.statusCode} ${Date.now() - started}ms "${ua}"`
    );
  });
  next();
});

// Per-IP rate limit: a human browsing the explorer stays far below this; a
// crawler walking the infinite tx/block/address link space does not — and
// every crawled page costs upstream Blockfrost quota. RATE_LIMIT_PER_MIN=0
// disables the limiter.
if (ENV.RATE_LIMIT_PER_MIN > 0) {
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: ENV.RATE_LIMIT_PER_MIN,
      standardHeaders: true,
      legacyHeaders: false,
      message: { data: null, error: "Too many requests — slow down.", lastUpdated: Date.now() }
    })
  );
}

app.use("/api/epochs", epochController);
app.use("/api/blocks", blockController);
app.use("/api/transactions", transactionController);
app.use("/api/tokens", tokenController);
app.use("/api/governance", governanceController);
app.use("/api/addresses", addressController);
app.use("/api/pools", poolController);
app.use("/api/protocol-params", protocolParamsController);
app.use("/api/dashboard", dashboardController);
app.use("/api/search", searchController);
app.use("/api/scripts", uplcVerificationController);

app.use(errorHandler);

export default app;
