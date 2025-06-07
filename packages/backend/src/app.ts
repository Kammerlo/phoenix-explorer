import express from "express";
import cors from "cors";
import {epochController} from "./controller/epoch-controller";
import {blockController} from "./controller/block-controller";
import {transactionController} from "./controller/transaction-controller";

const app = express();

app.use(cors()); // Adjust for your frontend origin if needed
app.use(express.json());

app.use("/api/epochs", epochController);
app.use("/api/blocks", blockController);
app.use("/api/transactions", transactionController);

export default app;
