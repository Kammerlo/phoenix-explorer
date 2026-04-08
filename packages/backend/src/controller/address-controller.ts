import { ApiReturnType } from "@shared/APIReturnType";
import { AddressDetail, StakeAddressDetail } from "@shared/dtos/address.dto";
import { Transaction } from "@shared/dtos/transaction.dto";
import { Router, Request, Response } from "express";
import { API } from "../config/blockfrost";
import { cache, fetchAddressTotal } from "../config/cache";
import { fetchTransactionDetail } from "../service/transactionService";

export const addressController = Router();

addressController.get('/:address', async (req, res) => {
    const address = req.params.address;

    try {
        // Stake addresses (stake1...) need different handling — use accounts endpoint
        if (address.startsWith('stake')) {
            const accountData = await API.accounts(address);
            const addressDetail: AddressDetail = {
                address: address,
                txCount: 0,
                balance: Number.parseInt(accountData.controlled_amount || '0'),
                tokens: [],
                stakeAddress: address,
                isContract: false,
            };
            res.json({
                data: addressDetail,
                lastUpdated: Date.now(),
            } as ApiReturnType<AddressDetail>);
            return;
        }

        const [addressData, addressDetailData] = await Promise.all([
            API.addresses(address),
            API.addressesTotal(address)
        ]);

        const addressDetail: AddressDetail = {
            address: addressData.address,
            txCount: addressDetailData.tx_count,
            balance: addressData.amount ? Number.parseInt(addressData.amount.find(a => a.unit === 'lovelace')?.quantity || '0') : 0,
            tokens: addressData.amount ? addressData.amount.filter(a => a.unit !== 'lovelace').map(a => ({
                address: '',
                name: '',
                displayName: '',
                fingerprint: a.unit,
                quantity: Number.parseInt(a.quantity),
            })) : [],
            stakeAddress: addressData.stake_address || '',
            isContract: false,
        };

        res.json({
            data: addressDetail,
            lastUpdated: Date.now(),
        } as ApiReturnType<AddressDetail>);
    } catch (err: any) {
        res.json({
            data: null,
            error: err.message || 'Failed to fetch address',
            lastUpdated: Date.now(),
        } as ApiReturnType<AddressDetail | null>);
    }
});

addressController.get('/:address/transactions', async (req, res) => {
    const address = req.params.address;
    const pageInfo = req.query;

    try {
        // Stake addresses use a different Blockfrost endpoint for transactions
        const isStakeAddress = address.startsWith('stake');
        const page = Number.parseInt(String(pageInfo.page || 1));
        const count = Number.parseInt(String(pageInfo.size || 10));

        if (isStakeAddress) {
            // Blockfrost doesn't provide a direct transactions-by-stake-address endpoint
            res.json({
                data: [],
                lastUpdated: Date.now(),
                currentPage: page,
                total: 0
            } as ApiReturnType<Transaction[]>);
            return;
        }

        const [addrTxs, addressData] = await Promise.all([
            API.addressesTransactions(address, { page, count }),
            fetchAddressTotal(address)
        ]);

        const txData: Transaction[] = await Promise.all(
            addrTxs.map(async (addrTx) => {
                const txDetail = await fetchTransactionDetail(addrTx.tx_hash);
                return {
                    hash: addrTx.tx_hash,
                    blockNo: txDetail.tx.blockNo,
                    blockHash: txDetail.tx.blockHash,
                    epochNo: txDetail.tx.epochNo,
                    epochSlot: txDetail.tx.epochSlot,
                    epochSlotNo: txDetail.tx.epochSlot ?? 0,
                    slot: txDetail.tx.slotNo,
                    addressesInput: [],
                    addressesOutput: [],
                    fee: txDetail.tx.fee,
                    totalOutput: txDetail.tx.totalOutput,
                    time: txDetail.tx.time,
                    balance: 0,
                    tokens: [],
                    tags: (txDetail.tx as any).tags,
                } as Transaction;
            })
        );

        res.json({
            data: txData,
            lastUpdated: Date.now(),
            currentPage: page,
            total: addressData.tx_count
        } as ApiReturnType<Transaction[]>);
    } catch (err: any) {
        res.json({
            data: [],
            error: err.message || 'Failed to fetch transactions',
            lastUpdated: Date.now(),
            currentPage: 0,
            total: 0
        } as ApiReturnType<Transaction[]>);
    }
});

addressController.get('/:address/stake', async (req, res) => {
    const address = req.params.address;

    try {
        const stakeAddressData = await API.accounts(address);

        const stakeAddressDetail: StakeAddressDetail = {
            status: stakeAddressData.active ? "ACTIVE" : "INACTIVE",
            stakeAddress: address,
            totalStake: Number.parseInt(stakeAddressData.controlled_amount || '0'),
            rewardAvailable: Number.parseInt(stakeAddressData.rewards_sum || '0'),
            rewardWithdrawn: Number.parseInt(stakeAddressData.withdrawals_sum || '0'),
            pool: {
                tickerName: '',
                poolName: '',
                poolId: ''
            }
        };

        if (stakeAddressData.pool_id) {
            const pool = await API.poolMetadata(stakeAddressData.pool_id);
            stakeAddressDetail.pool.tickerName = pool.ticker || '';
            stakeAddressDetail.pool.poolName = pool.name || '';
            stakeAddressDetail.pool.poolId = pool.pool_id || '';
        }

        res.json({
            data: stakeAddressDetail,
            lastUpdated: Date.now(),
        } as ApiReturnType<StakeAddressDetail>);
    } catch (err: any) {
        res.json({
            data: null,
            error: err.message || 'Failed to fetch stake details',
            lastUpdated: Date.now(),
        });
    }
})