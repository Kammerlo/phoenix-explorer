import {Router} from "express";
import {API} from "../config/blockfrost";
import {Block} from "@shared/dtos/block.dto";
import {ApiReturnType} from "@shared/APIReturnType";
import {ITokenOverview} from "@shared/dtos/token.dto";


export const tokenController = Router();

tokenController.get('', async (req, res) => {
  const pageInfo = req.query;
  const unixTimestamp = Math.floor(Date.now() / 1000);

  const assets = await API.assets({
    page: Number.parseInt(String(pageInfo.page || 0)),
    count: Number.parseInt(String(pageInfo.size || 100))
  });

  const assetData : ITokenOverview[] = assets.map((asset) => {
    return {
      policy: asset.asset.slice(0,58),
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

tokenController.get('/:tokenId', async (req, res) => {
  const assetById = await API.assetsById(req.params.tokenId);
  const mintTx = await API.txs(assetById.initial_mint_tx_hash);
  const history = await API.assetsHistoryAll(assetById.asset);
  const lastActivity =  await API.txs(history[history.length - 1].tx_hash);

  const activityData  : { date: number; value: number }[] = [];
  let amount = 0;
  for( const item of history) {
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
