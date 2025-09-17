import { Router } from "express";
import { API } from "../config/blockfrost";
import { Block } from "@shared/dtos/block.dto";
import { ApiReturnType } from "@shared/APIReturnType";
import { ITokenOverview, TokenHolder } from "@shared/dtos/token.dto";
import { Transaction } from "@shared/dtos/transaction.dto";


/**
 * Router that exposes token-related endpoints.
 *
 * Endpoints:
 * - GET /             : list tokens with pagination
 * - GET /:tokenId     : get detailed overview for a single token
 */
export const tokenController = Router();

/**
 * GET /
 *
 * Returns a paginated list of token overviews.
 * Query parameters:
 * - page (number) : page index (defaults to 0)
 * - size (number) : page size (defaults to 100)
 *
 * Response shape: ApiReturnType<ITokenOverview[]>
 * - data: array of token overviews (policy, displayName, supply, fingerprint)
 * - lastUpdated: unix timestamp of response
 * - total/currentPage/pageSize/totalPages: pagination metadata
 *
 * Notes:
 * - The implementation uses the Blockfrost `API.assets` call to fetch assets and
 *   maps them into the internal `ITokenOverview` shape. The displayed name is
 *   extracted from the asset hex and decoded as UTF-8.
 */
tokenController.get('', async (req, res) => {
  const pageInfo = req.query;
  const unixTimestamp = Math.floor(Date.now() / 1000);

  const assets = await API.assets({
    page: Number.parseInt(String(pageInfo.page || 0)),
    count: Number.parseInt(String(pageInfo.size || 100))
  });

  const assetData: ITokenOverview[] = assets.map((asset) => {
    return {
      policy: asset.asset.slice(0, 58),
      displayName: Buffer.from(asset.asset.slice(58), 'hex').toString('utf8'),
      supply: asset.quantity ? Number.parseInt(asset.quantity) : 0,
      fingerprint: asset.asset,
    } as ITokenOverview;
  });

  res.json({
    data: assetData.reverse(), // Reverse to show the latest block first
    lastUpdated: unixTimestamp,
    total: assetData.length, // TODO need to find the total number of blocks
    currentPage: Number.parseInt(String(pageInfo.page ?? 0)),
    pageSize: Number.parseInt(String(pageInfo.size ?? 10)),
    totalPages: Math.ceil(assetData.length / (pageInfo.size ? Number.parseInt(String(pageInfo.size)) : 100)),
  } as ApiReturnType<ITokenOverview[]>);
});

/**
 * GET /:tokenId
 *
 * Returns a detailed overview for a single token identified by `tokenId`.
 * Path parameters:
 * - tokenId (string) : asset id / fingerprint
 *
 * Response shape: ApiReturnType<ITokenOverview>
 * - data: detailed token overview including metadata and analytics (time series)
 * - lastUpdated: unix timestamp of response
 * - total/pageSize/currentPage: pagination metadata (single item)
 *
 * Behaviour:
 * - Fetches the asset by id, initial mint transaction, full asset history and
 *   derives an analytics time series by iterating the history and accumulating amounts.
 * - Decodes names from hex where applicable and normalizes metadata fields.
 */
tokenController.get('/:tokenId', async (req, res) => {
  const assetById = await API.assetsById(req.params.tokenId);
  const mintTx = await API.txs(assetById.initial_mint_tx_hash);
  const history = await API.assetsHistoryAll(assetById.asset);
  const lastActivity = await API.txs(history[history.length - 1].tx_hash);

  const activityData: { date: number; value: number }[] = [];
  let amount = 0;
  for (const item of history) {
    const tx = await API.txs(item.tx_hash);
    amount += Number.parseInt(item.amount);
    activityData.push({
      date: tx.block_time,
      value: amount
    })
  }

  const ITokenOverviewData: ITokenOverview = {
    name: assetById.asset,
    displayName: Buffer.from(assetById.asset_name ?? "", 'hex').toString('utf8'),
    policy: assetById.policy_id,
    supply: assetById.mint_or_burn_count,
    fingerprint: assetById.fingerprint,
    createdOn: mintTx.block_time + "",
    txCount: history.length,
    tokenLastActivity: lastActivity.block_time + "",
    analytics: activityData,
    metadata: assetById.metadata ? {
      policy: assetById.policy_id,
      decimals: assetById.metadata.decimals ?? 0,
      logo: assetById.metadata.logo ?? "",
      url: assetById.metadata.url ?? "",
      ticker: assetById.metadata.ticker ?? "",
      description: assetById.metadata.description || ""
    } : undefined
  }
  res.json({
    total: 1,
    data: ITokenOverviewData,
    error: undefined,
    lastUpdated: Math.floor(Date.now() / 1000),
    currentPage: 0,
    pageSize: 1,
  } as ApiReturnType<ITokenOverview>);
});

tokenController.get('/:tokenId/holders', async (req, res) => {
  const pageInfo = req.query;
  const unixTimestamp = Math.floor(Date.now() / 1000);
  const assetById = await API.assetsById(req.params.tokenId);

  const assetAddresses = await API.assetsAddresses(req.params.tokenId, {
    page: Number.parseInt(String(pageInfo.page || 0)),
    count: Number.parseInt(String(pageInfo.size || 100))
  });

  const holders = assetAddresses.map((entry) => {
    return {
      address: entry.address,
      amount: entry.quantity ? Number.parseInt(entry.quantity) : 0,
      ratio: (Number.parseInt(entry.quantity) / (assetById.quantity ? Number.parseInt(assetById.quantity) : 1)) * 100
    } as TokenHolder;
  })

  res.json({
    data: holders,
    lastUpdated: unixTimestamp,
    total: holders.length, // TODO need to find the total number of blocks
    currentPage: Number.parseInt(String(pageInfo.page ?? 0)),
    pageSize: Number.parseInt(String(pageInfo.size ?? 10)),
    totalPages: Math.ceil(holders.length / (pageInfo.size ? Number.parseInt(String(pageInfo.size)) : 100)), // TODO need to find the total number of blocks
  } as ApiReturnType<TokenHolder[]>);
});

tokenController.get('/:tokenId/transactions', async (req, res) => {
  const pageInfo = req.query;
  const unixTimestamp = Math.floor(Date.now() / 1000);
  const assetById = await API.assetsById(req.params.tokenId);
  const assetTransactions = await API.assetsTransactions(req.params.tokenId, {
    page: Number.parseInt(String(pageInfo.page || 0)),
    count: Number.parseInt(String(pageInfo.size || 100))
  });

  const transactions : Transaction[] = await Promise.all(assetTransactions.map(async (entry) => {
    const tx = await API.txs(entry.tx_hash);
    const block = tx.block_height ? await API.blocks(tx.block_height) : null;
    return {
      blockNo: tx.block_height ?? 0,
      hash: entry.tx_hash,
      time: tx.block_time.toString(),
      slot: tx.slot ?? 0,
      epochNo: block?.epoch ?? 0,
      epochSlotNo: block?.epoch_slot ?? 0,
      fee: Number.parseInt(tx.fees ?? '0'),
      totalOutput: tx.output_amount.filter((amount) => amount.unit === 'lovelace').reduce((acc, amount) => acc + Number.parseInt(amount.quantity), 0),
      blockHash: block?.hash
    } as Transaction
  } ));

  res.json({
    data: transactions,
    lastUpdated: unixTimestamp,
    total: transactions.length, // TODO need to find the total number of blocks
    currentPage: Number.parseInt(String(pageInfo.page ?? 0)),
    pageSize: Number.parseInt(String(pageInfo.size ?? 10)),
    totalPages: Math.ceil(transactions.length / (pageInfo.size ? Number.parseInt(String(pageInfo.size)) : 100)), // TODO need to find the total number of blocks
  } as ApiReturnType<Transaction[]>);
});