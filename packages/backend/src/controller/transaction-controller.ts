import { Router } from "express";
import { fetchLatestTransactions, fetchTransactionDetail } from "../service/transactionService";
import { ApiReturnType } from "@shared/APIReturnType";
import { Transaction, TransactionDetail } from "@shared/dtos/transaction.dto";

export const transactionController = Router();

transactionController.get("", async (req, res) => {


  const size = parseInt(String(req.query.size ?? 10));
  const txs = await fetchLatestTransactions(size);

  const response: ApiReturnType<Transaction[]> = {
    total: txs.length,
    data: txs,
    lastUpdated: Math.floor(Date.now() / 1000)
  };

  res.json(response);
});

transactionController.get("/:txHash", async (req, res) => {
  const detail = await fetchTransactionDetail(req.params.txHash);
  const response: ApiReturnType<TransactionDetail> = {
    data: detail,
    lastUpdated: Math.floor(Date.now() / 1000),
    currentPage: 0,
  };
  res.json(response);
});
