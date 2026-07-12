import express from "express";
import compression from "compression";
import cors from "cors";
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

app.use(cors()); // Adjust for your frontend origin if needed
// Gzip JSON responses — a token-heavy transaction detail is ~290KB identity /
// ~30KB gzipped. Browsers always send Accept-Encoding, so this is pure win.
app.use(compression());
app.use(express.json());

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
