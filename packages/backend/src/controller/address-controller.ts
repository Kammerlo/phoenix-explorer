import { add } from "@blockfrost/blockfrost-js/lib/endpoints/ipfs";
import { ApiReturnType } from "@shared/APIReturnType";
import { AddressDetail, StakeAddressDetail } from "@shared/dtos/address.dto";
import { Transaction } from "@shared/dtos/transaction.dto";
import { Router, Request, Response } from "express";
import { API } from "src/config/blockfrost";
import { fetchTransactionDetail } from "src/service/transactionService";

export const addressController = Router();

addressController.get('/:address', async (req, res) => {
    const address = req.params.address;

    const addressData = await API.addresses(address);
    const addressDetailData = await API.addressesTotal(address);
    const addressDetail: AddressDetail = {
        address: addressData.address,
        txCount: addressDetailData.tx_count,
        balance: addressData.amount ? Number.parseInt(addressData.amount.find(a => a.unit === 'lovelace')?.quantity || '0') : 0,
        tokens: addressData.amount ? addressData.amount.filter(a => a.unit !== 'lovelace').map(a => ({
            address: '',
            name: '', // Placeholder, need to fetch token metadata separately if needed
            displayName: '', // Placeholder
            fingerprint: a.unit, // Using unit as fingerprint for now
            quantity: Number.parseInt(a.quantity),
        })) : [],
        stakeAddress: addressData.stake_address || '',
        isContract: false, // Blockfrost does not provide this info directly
        verifiedContract: undefined, // Placeholder
        associatedNativeScript: undefined, // Placeholder
        associatedSmartContract: undefined, // Placeholder
        scriptHash: undefined // Placeholder
    }

    // Placeholder response
    res.json({
        data: addressDetail,
        lastUpdated: Math.floor(Date.now() / 1000),
    } as ApiReturnType<AddressDetail>);
});

addressController.get('/:address/transactions', async (req, res) => {
    const address = req.params.address;
    const pageInfo = req.query;
    console.log(pageInfo);
    const addressTransactions = await API.addressesTransactions(address, {
    page: Number.parseInt(String(pageInfo.page || 0)),
    count: Number.parseInt(String(pageInfo.size || 10))
    });
    const txData: Transaction[] = [];
    for (const addrTx of addressTransactions) {
        const txDetail = await fetchTransactionDetail(addrTx.tx_hash);
        txData.push({
            hash: addrTx.tx_hash,
            blockNo: txDetail.tx.blockNo,
            blockHash: txDetail.tx.blockHash,
            epochNo: txDetail.tx.epochNo,
            epochSlot: txDetail.tx.epochSlot,
            epochSlotNo: txDetail.tx.epochSlot ?? 0, // Added missing property, fallback to 0 if undefined
            slot: txDetail.tx.slotNo,
            addressesInput: [], // Placeholder, need to fetch inputs separately if needed
            addressesOutput: [], // Placeholder, need to fetch outputs separately if needed
            fee: txDetail.tx.fee,
            totalOutput: txDetail.tx.totalOutput,
            time: txDetail.tx.time,
            balance: 0, // Placeholder, need to calculate balance change for the address if needed
            tokens: [], // Added missing property, placeholder empty array
        } as Transaction);
    }

    res.json({
        data: txData,
        lastUpdated: Math.floor(Date.now() / 1000),
    } as ApiReturnType<Transaction[]>);
});

addressController.get('/:address/stake', async (req, res) => {
    const address = req.params.address;
    const stakeAddressData = await API.accounts(address);

    const stakeAddressDetail: StakeAddressDetail = {
        status: stakeAddressData.active ? "ACTIVE" : "INACTIVE",
        stakeAddress: address,
        totalStake: Number.parseInt(stakeAddressData.controlled_amount || '0'),
        rewardAvailable: Number.parseInt(stakeAddressData.rewards_sum || '0'),
        rewardWithdrawn: Number.parseInt(stakeAddressData.withdrawals_sum || '0'), // Blockfrost does not provide this info directly
        pool: {
            tickerName: '',
            poolName: '',
            poolId: ''  // No delegation
        }
    };
    if(stakeAddressData.pool_id) {
        await API.poolMetadata(stakeAddressData.pool_id).then(pool => {
            stakeAddressDetail.pool.tickerName = pool.ticker || '';
            stakeAddressDetail.pool.poolName = pool.name || '';
            stakeAddressDetail.pool.poolId = pool.pool_id || '';
        });
    }

    res.json({
        data: stakeAddressDetail,
        lastUpdated: Math.floor(Date.now() / 1000),
    } as ApiReturnType<typeof stakeAddressDetail>);
})