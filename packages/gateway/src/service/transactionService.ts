import {API} from "../config/blockfrost";
import {getAsset, getBlock, getDatumCbor, getScriptCbor, getTransactions, getTxDetail, getTxMetadata, getTxRedeemers, getUtxos, setTxDetail} from "../config/cache";
import {IContractItemTx, TransactionDetail} from "@shared/dtos/transaction.dto";
import {buildContracts} from "@shared/helpers/contracts";
import {buildTransactionDetail, RawAssetInfo} from "@shared/helpers/txDetail";

// Smart-contract enrichment: resolve the script CBOR, datum and redeemer data
// for each invocation via the shared (connector-agnostic) builder. Best-effort —
// a backend without /scripts/* support (e.g. demeter) leaves contracts empty
// and the rest of the detail still renders.
async function buildTxContracts(txHash: string, utxos: any): Promise<IContractItemTx[]> {
  try {
    const redeemers = await getTxRedeemers(txHash);
    return await buildContracts({
      redeemers,
      inputs: utxos.inputs,
      outputs: utxos.outputs,
      resolvers: {
        scriptCbor: (hash) => getScriptCbor(hash),
        datumCbor: (hash) => getDatumCbor(hash)
      }
    });
  } catch (err) {
    console.error("Failed to build contracts for tx", txHash, "-", (err as Error)?.message);
    return [];
  }
}

/**
 * Fetches everything a transaction-detail page needs and assembles it via the
 * shared `buildTransactionDetail` helper (the same assembly the in-browser
 * BlockfrostConnector uses, guaranteeing identical output across providers).
 *
 * Fetch strategy: two parallel waves. Wave 1 needs only the tx hash; wave 2
 * fans out over the block header, certificate lists (skipped without an
 * upstream call when the tx's counts say they're absent) and the contract
 * enrichment. Asset metadata resolves through the deduped 1h cache.
 */
export async function fetchTransactionDetail(txHash: string): Promise<TransactionDetail> {
  const cachedTxDetail = getTxDetail(txHash);
  if (cachedTxDetail) return cachedTxDetail;

  const [tx, utxos, metadata] = await Promise.all([
    getTransactions(txHash),
    getUtxos(txHash),
    getTxMetadata(txHash)
  ]);

  const [block, delegations, withdrawals, stakes, poolUpdates, poolRetires, mirs, contracts] = await Promise.all([
    getBlock(tx.block),
    tx.delegation_count > 0 ? API.txsDelegations(txHash) : [],
    tx.withdrawal_count > 0 ? API.txsWithdrawals(txHash) : [],
    tx.stake_cert_count > 0 ? API.txsStakes(txHash) : [],
    tx.pool_update_count > 0 ? API.txsPoolUpdates(txHash) : [],
    tx.pool_retire_count > 0 ? API.txsPoolRetires(txHash) : [],
    tx.mir_cert_count > 0 ? API.txsMirs(txHash) : [],
    (tx.redeemer_count ?? 0) > 0 ? buildTxContracts(txHash, utxos) : []
  ]);

  const txDetail = await buildTransactionDetail({
    tx,
    block,
    utxos,
    metadata,
    delegations,
    withdrawals,
    stakes,
    poolUpdates,
    poolRetires,
    mirs,
    contracts,
    resolveAsset: (unit) => getAsset(unit) as Promise<RawAssetInfo>
  });

  setTxDetail(txHash, txDetail);
  return txDetail;
}
