import {API} from "../config/blockfrost";
import {getBlock, getTransactions, getTxDetail, getUtxos} from "../config/cache";
import {Token, TPoolCertificated, Transaction, TransactionDetail} from "@shared/dtos/transaction.dto";

export async function fetchLatestTransactions(minTransactionCount : number = 10): Promise<Transaction[]> {
  const latestBlockTransactions = await API.blocksLatestTxs();
  const latestBlock = await API.blocksLatest();
  let blockDelta = 1;
  // ensuring we are adding atleast a minimum amount of transactions
  while (latestBlockTransactions.length <= minTransactionCount) {
    const blockHeight = latestBlock.height! - blockDelta;
    const blockTxs = await API.blocksTxs(blockHeight);
    latestBlockTransactions.push(...blockTxs);
    blockDelta = blockDelta + 1;
  }

  const transactions : Transaction[] = [];
  for(const txHash of latestBlockTransactions) {
    const tx = await getTransactions(txHash);
    transactions.push({
      blockNo: tx.block_height ?? 0,
      hash: txHash,
      time: tx.block_time.toString(),
      slot: tx.slot ?? 0,
      epochNo: latestBlock.epoch ?? 0,
      epochSlotNo: latestBlock.epoch_slot ?? 0,
      fee: parseInt(tx.fees ?? "0"),
      totalOutput: tx.output_amount
        .filter((amount) => amount.unit === "lovelace")
        .reduce((acc, a) => acc + parseInt(a.quantity), 0),
      blockHash: tx.block,
    } as Transaction);
  }
  return transactions;
}

async function getPoolCertificates(txHash: string, poolUpdateCount: number, poolRetireCount: number) {
  const poolCertificated: TPoolCertificated[] = [];
  if (poolUpdateCount > 0) {
    const poolUpdated = await API.txsPoolUpdates(txHash);
    poolCertificated.push(...poolUpdated.map(toTPoolCertified));
  }
  if (poolRetireCount > 0) {
    const poolRetires = await API.txsPoolRetires(txHash);
    poolCertificated.push(...poolRetires.map((cert) => {
      return {
        poolId: cert.pool_id,
        epoch: cert.retiring_epoch ?? 0,
        type: "POOL_DEREGISTRATION"
      } as TPoolCertificated
    }));
  }
  return poolCertificated;
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
    const signedValue = isOutput ? -value : value;

    if (!summaryMap[utxo.address]) {
      summaryMap[utxo.address] = {address: utxo.address, value: 0, tokens: []};
    }

    summaryMap[utxo.address].value += signedValue;

    const tokens = await Promise.all(utxo.amount
      .filter((a: { unit: string; }) => a.unit !== "lovelace")
      .map(toToken));
    for(const token of tokens) {
      if (!summaryMap[utxo.address].tokens.some(t => t.assetId === token.assetId)) {
        summaryMap[utxo.address].tokens.push(token);
      } else {
        const existingToken = summaryMap[utxo.address].tokens.find(t => t.assetId === token.assetId);
        if (existingToken) {
          existingToken.assetQuantity += token.assetQuantity * (isOutput ? -1 : 1);
        }
      }
    }
  }
  // Filter out tokens with amount zero
  for (const address in summaryMap) {
    summaryMap[address].tokens = summaryMap[address].tokens.filter(token => token.assetQuantity !== 0);
  }
  return summaryMap;
}

async function convertUtxosAndCollateral(utxos: any, tx: any) {
  const inputUtxos = [];
  const inputCollaterals = [];
  for (const utxo of utxos) {
    if (utxo.reference) {
      // Skip reference inputs as they are not part of the transaction summary
      continue;
    }
    if (utxo.collateral) {
      inputCollaterals.push(await toUtxo(tx.hash, utxo));
    } else {
      inputUtxos.push(await toUtxo(tx.hash, utxo));
    }
  }
  return {utxo: inputUtxos, collateral: inputCollaterals};
}

export async function fetchTransactionDetail(txHash: string): Promise<TransactionDetail> {
  const cachedTxDetail = await getTxDetail(txHash);
  if (cachedTxDetail) {
    console.log("Using cached transaction detail for transaction:", txHash);
    return cachedTxDetail;
  }

  const tx = await getTransactions(txHash);
  const block = await getBlock(tx.block);
  const utxos = await getUtxos(txHash);
  const summaryMap = await getUtxosAndSummaryMap(utxos);

  const metadata = await API.txsMetadata(txHash);

  const { utxo: inputUtxos, collateral: inputCollaterals } = await convertUtxosAndCollateral(utxos.inputs, txHash);
  const { utxo: outputUtxos, collateral: outputCollaterals } = await convertUtxosAndCollateral(utxos.outputs, txHash);

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
      totalOutput: tx.output_amount
        .filter((a) => a.unit === "lovelace")
        .reduce((acc, a) => acc + parseInt(a.quantity), 0),
      maxEpochSlot: block.epoch_slot ?? 0,
      slotNo: tx.slot ?? 0,
    },
    summary: {
      stakeAddress: Object.values(summaryMap),
    },
    collaterals: {
      collateralInputResponses: inputCollaterals,
      collateralOutputResponses: outputCollaterals
    },
    utxOs: {
      inputs: inputUtxos,
      outputs: outputUtxos,
    },
    metadata: metadata.length > 0 ? metadata.map((m: any) => {
      return {
        label: m.label,
        value: JSON.stringify(m.json_metadata)
      }
    }) : undefined,
    metadataHash: "",
  };

  if (tx.delegation_count > 0) {
    const delegations = await API.txsDelegations(txHash);
    txDetail.delegations = delegations.map((d) => {
      return {
        address: d.address,
        poolId: d.pool_id
      }
    });
  }

  if (tx.withdrawal_count > 0) {
    const withdrawals = await API.txsWithdrawals(txHash);

    txDetail.withdrawals = withdrawals.map((w) => {
      return {
        stakeAddressFrom: w.address,
        addressTo: [''], // TODO: Handle multiple addresses
        amount: Number.parseInt(w.amount),
      }
    });
  }

  if (tx.stake_cert_count > 0) {
    const stakes = await API.txsStakes(txHash);
    txDetail.stakeCertificates = stakes.map((s: any) => {
      return {
        stakeAddress: s.address,
        type: s.registration ? "STAKE_REGISTRATION" : "STAKE_DEREGISTRATION",
      }
    });
  }

  if (tx.pool_retire_count > 0 || tx.pool_update_count > 0) {
    txDetail.poolCertificates = await getPoolCertificates(txHash, tx.pool_update_count, tx.pool_retire_count);
  }

  if (tx.mir_cert_count > 0) {
    const mirs = await API.txsMirs(txHash);
    txDetail.instantaneousRewards = mirs.map((mir: any) => {
      return {
        amount: mir.amount,
        stakeAddress: mir.address
      }
    });
  }
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
  const asset = await API.assetsById(utxo.unit);
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

async function toUtxo(txHash: string, utxo: any) {
  return {
    address: utxo.address,
    assetId: utxo.assetId,
    value: parseInt(
      utxo.amount.find((a: { unit: string; }) => a.unit === "lovelace")?.quantity ?? "0"
    ),
    txHash: utxo.tx_hash,
    index: utxo.output_index.toString(),
    tokens: (
      await Promise.all(
        utxo.amount
          .filter((a: { unit: string }) => a.unit !== "lovelace")
          .map(toToken)
      )
    ).filter(Boolean) // removes null/undefined
  }
}
