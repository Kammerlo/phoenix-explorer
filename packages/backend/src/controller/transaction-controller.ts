// controllers/transactionController.ts
import { Router } from "express";
import { fetchLatestTransactions, fetchTransactionDetail } from "../service/transactionService";
import { ApiReturnType } from "@shared/APIReturnType";
import { Transaction, TransactionDetail } from "@shared/dtos/transaction.dto";

export const transactionController = Router();

transactionController.get("", async (req, res) => {
  const txs = await fetchLatestTransactions();

  const page = parseInt(String(req.query.page ?? 0));
  const size = parseInt(String(req.query.size ?? 10));
  const totalPages = Math.ceil(txs.length / size);

  const paginated = txs.slice(page * size, (page + 1) * size);

  const response: ApiReturnType<Transaction[]> = {
    total: txs.length,
    data: paginated,
    lastUpdated: Math.floor(Date.now() / 1000),
    currentPage: page,
    totalPage: totalPages,
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
