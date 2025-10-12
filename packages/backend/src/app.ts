import express from "express";
import cors from "cors";
import { epochController } from "./controller/epoch-controller";
import { blockController } from "./controller/block-controller";
import { transactionController } from "./controller/transaction-controller";
import { tokenController } from "./controller/token-controller";
import { governanceController } from "./controller/governance-controller";
import { addressController } from "./controller/address-controller";
import { poolController } from "./controller/pool-controller";
import { protocolParameterController } from "./controller/protocol-parameter-controller";
// optional, for typing

const app = express();

app.use(cors()); // Adjust for your frontend origin if needed
app.use(express.json());

app.use("/api/epochs", epochController);
app.use("/api/blocks", blockController);
app.use("/api/transactions", transactionController);
app.use("/api/tokens", tokenController);
app.use("/api/governance", governanceController);
app.use("/api/addresses", addressController);
app.use("/api/pools", poolController);
app.use("/api/protocol-parameters", protocolParameterController); // Add this line for protocol parameters

export default app;
