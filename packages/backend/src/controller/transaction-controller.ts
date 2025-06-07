import {Router} from "express";
import {API} from "../config/blockfrost";
import {Token, Transaction, TransactionDetail} from "@shared/dtos/transaction.dto";
import {getBlock, getTransactions, getTxMetadata} from "../config/cache";
import {ApiReturnType} from "@shared/APIReturnType";

export const transactionController = Router();

transactionController.get('', async (req, res) => {
  // currently returning the last transactions from the latest block
  const latestBlockTransactions = await API.blocksLatestTxs();
  const latestBlock = await API.blocksLatest();
  const txs: Transaction[] = [];
  for (const txHash of latestBlockTransactions) {
    const tx = await getTransactions(txHash);
    txs.push({
      blockNo: tx.block_height ?? 0,
      hash: txHash,
      time: tx.block_time.toString(),
      slot: tx.slot ?? 0,
      epochNo: latestBlock.epoch ?? 0,
      epochSlotNo: latestBlock.epoch_slot ?? 0,
      fee: Number.parseInt(tx.fees ?? '0'),
      totalOutput: tx.output_amount.filter((amount) => amount.unit === 'lovelace').reduce((acc, amount) => acc + Number.parseInt(amount.quantity), 0),
      blockHash: latestBlock.hash
    } as Transaction);
  }
  res.json({
    total: txs.length,
    data: txs,
    lastUpdated: Math.floor(Date.now() / 1000),
    currentPage: Number.parseInt(String(req.query.page ?? 0)),
    pageSize: Number.parseInt(String(req.query.size ?? 10)),
    totalPages: Math.ceil(txs.length / (req.query.size ? Number.parseInt(String(req.query.size)) : 100)),
  } as ApiReturnType<Transaction[]>);
});

transactionController.get('/:txHash', async (req, res) => {
  const tx = await getTransactions(req.params.txHash);
  const block = await getBlock(tx.block);
  const utxos = await API.txsUtxos(req.params.txHash);
  const summary: {[key:string] : any} = {};
  for(const utxo of [...utxos.inputs, ...utxos.outputs]) {
    if(summary[utxo.address]) {
      let value = Number.parseInt(utxo.amount.find(amount => amount.unit === 'lovelace')?.quantity ?? '0');
      if(utxos.outputs.includes(utxo)) {
        value = -value; // If it's an output, subtract the value
      }
      summary[utxo.address].value += value;
      summary[utxo.address].tokens.push(...utxo.amount.filter(amount => amount.unit !== 'lovelace').map(token => ({
        address: token.unit,
        assetName: token.unit,
        assetQuantity: Number.parseInt(token.quantity),
        assetId: token.unit, // Assuming assetId is the same as unit for simplicity
        addressId: 0, // Placeholder, as we don't have address IDs in this context
        displayName: token.unit,
        fingerprint: '', // Placeholder, as we don't have fingerprints in this context
        name: '', // Placeholder, as we don't have names in this context
        quantity: Number.parseInt(token.quantity)
      } as Token)));
    } else {
      let value = Number.parseInt(utxo.amount.find(amount => amount.unit === 'lovelace')?.quantity ?? '0');
      if(utxos.outputs.includes(utxo)) {
        value = -value; // If it's an output, subtract the value
      }
      summary[utxo.address] = {
        address: utxo.address,
        value: value,
        tokens: utxo.amount.filter(amount => amount.unit !== 'lovelace').map(token => ({
          address: token.unit,
          assetName: token.unit,
          assetQuantity: Number.parseInt(token.quantity),
          assetId: token.unit, // Assuming assetId is the same as unit for simplicity
          addressId: 0, // Placeholder, as we don't have address IDs in this context
          displayName: token.unit,
          fingerprint: '', // Placeholder, as we don't have fingerprints in this context
          name: '', // Placeholder, as we don't have names in this context
          quantity: Number.parseInt(token.quantity)
        } as Token))
      };
    }
  }
  const response : ApiReturnType<TransactionDetail> = {
    data: {
      tx: {
        hash: tx.hash,
        time: tx.block_time.toString(),
        blockNo: tx.block_height ?? 0,
        epochSlot: block.epoch_slot ?? 0,
        epochNo: block.epoch ?? 0,
        status: 'SUCCESS',
        confirmation: block.confirmations ?? 0,
        fee: Number.parseInt(tx.fees ?? '0'),
        totalOutput: tx.output_amount.filter((amount) => amount.unit === 'lovelace').reduce((acc, amount) => acc + Number.parseInt(amount.quantity), 0),
        maxEpochSlot: block.epoch_slot ?? 0,
        slotNo: tx.slot ?? 0
      },
      summary: {
        stakeAddress: Object.values(summary)
      },
      utxOs: {
        inputs: utxos.inputs.map(input => ({
          address: input.address,
          value: Number.parseInt(input.amount.find(amount => amount.unit === 'lovelace')?.quantity ?? '0'),
          txHash: input.tx_hash,
          index: input.output_index.toString(),
          tokens: input.amount.filter(amount => amount.unit !== 'lovelace').map(token => ({
            address: token.unit,
            assetName: token.unit,
            assetQuantity: Number.parseInt(token.quantity),
            assetId: token.unit, // Assuming assetId is the same as unit for simplicity
            addressId: 0, // Placeholder, as we don't have address IDs in this context
            displayName: token.unit,
            fingerprint: '', // Placeholder, as we don't have fingerprints in this context
            name: '', // Placeholder, as we don't have names in this context
            quantity: Number.parseInt(token.quantity)
          } as Token))
        })),
        outputs: utxos.outputs.map(output => ({
          address: output.address,
          value: Number.parseInt(output.amount.find(amount => amount.unit === 'lovelace')?.quantity ?? '0'),
          txHash: tx.hash,
          index: output.output_index.toString(),
          tokens: output.amount.filter(amount => amount.unit !== 'lovelace').map(token => ({
            address: token.unit,
            assetName: token.unit,
            assetQuantity: Number.parseInt(token.quantity),
            assetId: token.unit, // Assuming assetId is the same as unit for simplicity
            addressId: 0, // Placeholder, as we don't have address IDs in this context
            displayName: token.unit,
            fingerprint: '', // Placeholder, as we don't have fingerprints in this context
            name: '', // Placeholder, as we don't have names in this context
            quantity: Number.parseInt(token.quantity)
          } as Token))
        }))
      },
      metadataHash: ''
    },
    lastUpdated: Math.floor(Date.now() / 1000),
    currentPage: 0,
  };
  res.json(response);
});
