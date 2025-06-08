// services/transactionService.ts
import {API} from "../config/blockfrost";
import {getBlock, getTransactions, getTxDetail, getUtxos} from "../config/cache";
import {Token, TPoolCertificated, Transaction, TransactionDetail} from "@shared/dtos/transaction.dto";

export async function fetchLatestTransactions(): Promise<Transaction[]> {
  const latestBlockTransactions = await API.blocksLatestTxs();
  const latestBlock = await API.blocksLatest();

  const txs: Transaction[] = await Promise.all(
    latestBlockTransactions.map(async (txHash) => {
      const tx = await getTransactions(txHash);
      return {
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
        blockHash: latestBlock.hash,
      } as Transaction;
    })
  );

  return txs;
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

async function getUtxosAndSummaryMap(txHash: string) {
  const utxos = await getUtxos(txHash);

  const summaryMap: { [address: string]: { address: string; value: number; tokens: Token[] } } = {};

  for (const utxo of [...utxos.inputs, ...utxos.outputs]) {
    const value = parseInt(
      utxo.amount.find((a) => a.unit === "lovelace")?.quantity ?? "0"
    );
    const isOutput = utxos.outputs.includes(utxo);
    const signedValue = isOutput ? -value : value;
    const tokens = await Promise.all(utxo.amount
      .filter((a) => a.unit !== "lovelace")
      .map(toToken));

    if (!summaryMap[utxo.address]) {
      summaryMap[utxo.address] = {address: utxo.address, value: 0, tokens: []};
    }

    summaryMap[utxo.address].value += signedValue;
    summaryMap[utxo.address].tokens.push(...tokens);
  }
  return {utxos, summaryMap};
}

export async function fetchTransactionDetail(txHash: string): Promise<TransactionDetail> {
  const cachedTxDetail = await getTxDetail(txHash);
  if(cachedTxDetail) {
    console.log("Using cached transaction detail for transaction:", txHash);
    return cachedTxDetail;
  }

  const tx = await getTransactions(txHash);
  const block = await getBlock(tx.block);
  const {utxos, summaryMap} = await getUtxosAndSummaryMap(txHash);

  const metadata = await API.txsMetadata(txHash);

  const txDetail: TransactionDetail = {
    tx: {
      hash: tx.hash,
      time: tx.block_time.toString(),
      blockNo: tx.block_height ?? 0,
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
      collateralInputResponses: utxos.inputs
        .filter((utxo) => utxo.collateral)
        .map(toUtxo(tx.hash)),
      collateralOutputResponses: utxos.outputs
        .filter((utxo) => utxo.collateral)
        .map(toUtxo(tx.hash))
    },
    utxOs: {
      inputs: utxos.inputs.filter((utxo) => !utxo.collateral).map(toUtxo(tx.hash)),
      outputs: utxos.outputs.filter((utxo) => !utxo.collateral).map(toUtxo(tx.hash)),
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

function toUtxo(txHash: string) {
  return (utxo: any) => ({
    address: utxo.address,
    assetId: utxo.assetId,
    value: parseInt(
      utxo.amount.find((a: { unit: string; }) => a.unit === "lovelace")?.quantity ?? "0"
    ),
    txHash,
    index: utxo.output_index.toString(),
    tokens: utxo.amount
      .filter((a: { unit: string; }) => a.unit !== "lovelace")
      .map(toToken),
  });
}
