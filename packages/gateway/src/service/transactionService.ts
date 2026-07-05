import {API} from "../config/blockfrost";
import {getAsset, getBlock, getDatumCbor, getScriptCbor, getTransactions, getTxDetail, getTxMetadata, getTxRedeemers, getUtxos, setTxDetail} from "../config/cache";
import {IContractItemTx, Token, TPoolCertificated, TransactionDetail} from "@shared/dtos/transaction.dto";
import {computeTxTags, computeTotalLovelaceOutput} from "@shared/helpers/txTags";
import {buildContracts} from "@shared/helpers/contracts";

async function getPoolCertificates(txHash: string, poolUpdateCount: number, poolRetireCount: number) {
  const [poolUpdates, poolRetires] = await Promise.all([
    poolUpdateCount > 0 ? API.txsPoolUpdates(txHash) : [],
    poolRetireCount > 0 ? API.txsPoolRetires(txHash) : []
  ]);
  return [
    ...poolUpdates.map(toTPoolCertified),
    ...poolRetires.map((cert) => ({
      poolId: cert.pool_id,
      epoch: cert.retiring_epoch ?? 0,
      type: "POOL_DEREGISTRATION"
    } as TPoolCertificated))
  ];
}

async function getUtxosAndSummaryMap(utxos: any) {
  const summaryMap: { [address: string]: { address: string; value: number; tokens: Token[] } } = {};

  for (const utxo of [...utxos.inputs, ...utxos.outputs]) {
    if (utxo.reference) {
      // Skip reference inputs as they are not part of the transaction summary
      continue;
    }
    const value = parseInt(
      utxo.amount.find((a: { unit: string; }) => a.unit === "lovelace")?.quantity ?? "0"
    );
    const isOutput = utxos.outputs.includes(utxo);
    // Outputs add to an address (received → positive); inputs subtract (sent → negative).
    // The Summary component treats value > 0 as received, < 0 as sent.
    const signedValue = isOutput ? value : -value;

    if (!summaryMap[utxo.address]) {
      summaryMap[utxo.address] = {address: utxo.address, value: 0, tokens: []};
    }

    summaryMap[utxo.address].value += signedValue;

    const tokens = await Promise.all(utxo.amount
      .filter((a: { unit: string; }) => a.unit !== "lovelace")
      .map(toToken));
    for(const token of tokens) {
      // Same sign convention as lovelace: outputs positive (received), inputs negative (sent).
      const signedQuantity = token.assetQuantity * (isOutput ? 1 : -1);
      const existingToken = summaryMap[utxo.address].tokens.find(t => t.assetId === token.assetId);
      if (existingToken) {
        existingToken.assetQuantity += signedQuantity;
      } else {
        summaryMap[utxo.address].tokens.push({ ...token, assetQuantity: signedQuantity });
      }
    }
  }
  // Filter out tokens with amount zero
  for (const address in summaryMap) {
    summaryMap[address].tokens = summaryMap[address].tokens.filter(token => token.assetQuantity !== 0);
  }
  return summaryMap;
}

async function convertUtxosAndCollateral(utxos: any[]) {
  const inputUtxos = [];
  const inputCollaterals = [];
  for (const utxo of utxos) {
    if (utxo.reference) {
      // Skip reference inputs as they are not part of the transaction summary
      continue;
    }
    if (utxo.collateral) {
      inputCollaterals.push(await toUtxo(utxo));
    } else {
      inputUtxos.push(await toUtxo(utxo));
    }
  }
  return {utxo: inputUtxos, collateral: inputCollaterals};
}

// Warm the asset cache once per distinct token, then assemble the summary map
// and the input/output/collateral lists (which resolve every asset from the
// warm cache). Without the prefetch, asset metadata would be requested once per
// occurrence — the dominant cost on token-heavy transactions.
async function assembleUtxoViews(utxos: any) {
  const distinctUnits = new Set<string>();
  for (const utxo of [...(utxos.inputs ?? []), ...(utxos.outputs ?? [])]) {
    for (const amount of utxo.amount ?? []) {
      if (amount.unit && amount.unit !== "lovelace") distinctUnits.add(amount.unit);
    }
  }
  await Promise.all([...distinctUnits].map((unit) => getAsset(unit)));

  const summaryMap = await getUtxosAndSummaryMap(utxos);
  const inputs = await convertUtxosAndCollateral(utxos.inputs);
  const outputs = await convertUtxosAndCollateral(utxos.outputs);
  return { summaryMap, inputs, outputs };
}

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

export async function fetchTransactionDetail(txHash: string): Promise<TransactionDetail> {
  const cachedTxDetail = getTxDetail(txHash);
  if (cachedTxDetail) return cachedTxDetail;

  // Wave 1 — everything keyed by the tx hash alone.
  const [tx, utxos, metadata] = await Promise.all([
    getTransactions(txHash),
    getUtxos(txHash),
    getTxMetadata(txHash)
  ]);

  // Wave 2 — block header, UTxO/asset assembly and every certificate list are
  // independent of one another. Absent certificate types resolve to [] without
  // an upstream call.
  const [block, utxoViews, delegations, withdrawals, stakes, poolCertificates, mirs, contracts] = await Promise.all([
    getBlock(tx.block),
    assembleUtxoViews(utxos),
    tx.delegation_count > 0 ? API.txsDelegations(txHash) : [],
    tx.withdrawal_count > 0 ? API.txsWithdrawals(txHash) : [],
    tx.stake_cert_count > 0 ? API.txsStakes(txHash) : [],
    tx.pool_update_count > 0 || tx.pool_retire_count > 0
      ? getPoolCertificates(txHash, tx.pool_update_count, tx.pool_retire_count)
      : [],
    tx.mir_cert_count > 0 ? API.txsMirs(txHash) : [],
    (tx.redeemer_count ?? 0) > 0 ? buildTxContracts(txHash, utxos) : []
  ]);

  const txDetail: TransactionDetail = {
    tx: {
      hash: tx.hash,
      time: tx.block_time.toString(),
      blockNo: tx.block_height ?? 0,
      blockHash: block.hash ?? "",
      epochSlot: block.epoch_slot ?? 0,
      epochNo: block.epoch ?? 0,
      status: "SUCCESS",
      confirmation: block.confirmations ?? 0,
      fee: parseInt(tx.fees ?? "0"),
      totalOutput: computeTotalLovelaceOutput(tx.output_amount),
      maxEpochSlot: block.epoch_slot ?? 0,
      slotNo: tx.slot ?? 0,
      tags: computeTxTags(tx),
    },
    summary: {
      stakeAddress: Object.values(utxoViews.summaryMap),
    },
    collaterals: {
      collateralInputResponses: utxoViews.inputs.collateral,
      collateralOutputResponses: utxoViews.outputs.collateral
    },
    utxOs: {
      inputs: utxoViews.inputs.utxo,
      outputs: utxoViews.outputs.utxo,
    },
    metadata: metadata.length > 0 ? metadata.map((m: any) => {
      return {
        label: parseInt(m.label, 10),
        value: m.json_metadata != null ? JSON.stringify(m.json_metadata) : (m.cbor_metadata ?? "null")
      }
    }) : undefined,
    metadataHash: "",
  };

  if (delegations.length > 0) {
    txDetail.delegations = delegations.map((d) => ({
      address: d.address,
      poolId: d.pool_id
    }));
  }

  if (withdrawals.length > 0) {
    txDetail.withdrawals = withdrawals.map((w) => ({
      stakeAddressFrom: w.address,
      addressTo: [''], // TODO: Handle multiple addresses
      amount: Number.parseInt(w.amount),
    }));
  }

  if (stakes.length > 0) {
    txDetail.stakeCertificates = stakes.map((s) => ({
      stakeAddress: s.address,
      type: s.registration ? "STAKE_REGISTRATION" as const : "STAKE_DEREGISTRATION" as const,
    }));
  }

  if (poolCertificates.length > 0) {
    txDetail.poolCertificates = poolCertificates;
  }

  if (mirs.length > 0) {
    txDetail.instantaneousRewards = mirs.map((mir) => ({
      amount: mir.amount,
      stakeAddress: mir.address
    }));
  }

  if (contracts.length > 0) {
    txDetail.contracts = contracts;
  }

  setTxDetail(txHash, txDetail);
  return txDetail;
}

function toTPoolCertified(cert: any): TPoolCertificated {
  return {
    cost: Number.parseInt(cert.fixed_cost),
    margin: cert.margin_cost,
    metadataHash: cert.metadata?.hash ?? "",
    metadataUrl: cert.metadata?.url ?? "",
    pledge: cert.pledge ? Number.parseInt(cert.pledge) : 0,
    poolId: cert.pool_id,
    poolOwners: cert.owners,
    relays: cert.relays.map((relay: { dns: any; dns_srv: any; ipv4: any; ipv6: any; port: any; }) => {
      return {
        dnsName: relay.dns ?? "",
        dnsSrvName: relay.dns_srv ?? "",
        ipv4: relay.ipv4 ?? "",
        ipv6: relay.ipv6 ?? "",
        port: relay.port
      }
    }),
    rewardAccount: cert.reward_account,
    type: "POOL_REGISTRATION",
    vrfKey: cert.vrf_key,
    epoch: cert.active_epoch ?? 0,
  } as TPoolCertificated
}

async function toToken(utxo: any): Promise<Token> {
  const quantity = parseInt(utxo.quantity);
  const asset = await getAsset(utxo.unit);
  let name: string;
  if (asset.onchain_metadata) {
    name = (asset.onchain_metadata["name"] as string);
  } else {
    name = asset.asset_name ?? "";
  }
  let token: Token = {
    assetName: name,
    assetQuantity: quantity,
    assetId: utxo.unit,
    policy: {
      policyId: asset.policy_id ?? "",
      totalToken: asset.mint_or_burn_count ?? 0, // TODO check could be a wrong number
    }
  };
  if (asset.metadata) {
    token.metadata = {
      description: asset.metadata.description ?? "",
      url: asset.metadata.url ?? "",
      logo: asset.metadata.logo ?? "",
      ticker: asset.metadata.ticker ?? "",
      decimals: asset.metadata.decimals ?? 0,
    };
  }
  return token;
}

async function toUtxo(utxo: any) {
  return {
    address: utxo.address,
    assetId: utxo.assetId,
    value: parseInt(
      utxo.amount.find((a: { unit: string; }) => a.unit === "lovelace")?.quantity ?? "0"
    ),
    txHash: utxo.tx_hash,
    index: utxo.output_index.toString(),
    // Smart-contract markers so the flow view can flag datum / reference-script UTxOs.
    dataHash: utxo.data_hash ?? null,
    inlineDatum: utxo.inline_datum ?? null,
    referenceScriptHash: utxo.reference_script_hash ?? null,
    tokens: (
      await Promise.all(
        utxo.amount
          .filter((a: { unit: string }) => a.unit !== "lovelace")
          .map(toToken)
      )
    ).filter(Boolean) // removes null/undefined
  }
}
