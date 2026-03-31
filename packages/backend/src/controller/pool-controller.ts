import { ApiReturnType } from "@shared/APIReturnType";
import { PoolDetail, PoolOverview } from "@shared/dtos/pool.dto";
import { Block } from "@shared/dtos/block.dto";
import { Router } from "express";
import { API } from "../config/blockfrost";
import { getBlock, getTransactions } from "../config/cache";

export const poolController = Router();

poolController.get('', async (req, res) => {
    const pageInfo = req.query;
    const poolExtended = await API.poolsExtended({
        page: Number.parseInt(String(pageInfo.page || 0)),
        count: Number.parseInt(String(pageInfo.size || 100))
    });

    // Currently the trick with (pool as any) is necessary because blockfrost-js is returning the wrong types
    const poolData = poolExtended.map((pool) => {
        return {
            id: 0, // Placeholder, will be replaced below
            poolId: pool.pool_id,
            poolName: (pool as any).metadata?.name || 'Unknown Pool',
            tickerName: (pool as any).metadata?.ticker || 'N/A',
            poolSize: Number.parseInt((pool as any).active_stake ?? '0'),
            declaredPledge: Number.parseInt((pool as any).declared_pledge ?? '0'),
            saturation: ((pool as any).live_saturation ?? 0),
            lifetimeBlock: Number.parseInt((pool as any).blocks_minted ?? '0'),
        } as PoolOverview;
    });
    res.json({
        data: poolData,
        lastUpdated: Math.floor(Date.now() / 1000),
        total: poolExtended.length, // TODO need to find the total number of pools
        currentPage: Number.parseInt(String(pageInfo.page ?? 0)),
        pageSize: Number.parseInt(String(pageInfo.size ?? 10)),
        totalPages: Math.ceil(poolExtended.length / (pageInfo.size ? Number.parseInt(String(pageInfo.size)) : 100)),
    } as ApiReturnType<PoolOverview[]>);

});

poolController.get('/:poolId/blocks', async (req, res) => {
    const { poolId } = req.params;
    const pageInfo = req.query;
    const page = Math.max(1, Number.parseInt(String(pageInfo.page || 1)));
    const count = Number.parseInt(String(pageInfo.size || 20));
    try {
        const [blockHashes, poolInfo] = await Promise.all([
            API.poolsByIdBlocks(poolId, { page, count }),
            API.poolsById(poolId)
        ]);
        const blocks = await Promise.all(blockHashes.map(hash => getBlock(hash)));
        const total = poolInfo.blocks_minted || 0;
        const blocksData: Block[] = blocks.map(block => ({
            blockNo: block.height ?? 0,
            epochNo: block.epoch ?? 0,
            epochSlotNo: block.epoch_slot ?? 0,
            slotNo: block.slot ?? 0,
            hash: block.hash,
            height: block.height,
            slot: block.slot,
            txCount: block.tx_count,
            output: Number.parseInt(block.output ?? '0'),
            totalFees: Number.parseInt(block.fees ?? '0'),
            totalOutput: Number.parseInt(block.output ?? '0'),
            time: block.time.toString(),
            previousBlock: block.previous_block ?? undefined,
            nextBlock: block.next_block ?? undefined,
            size: block.size,
            slotLeader: block.slot_leader ?? undefined,
            confirmations: (block as any).confirmations,
            blockVrf: block.block_vrf ?? undefined,
        }));
        res.json({
            data: blocksData,
            lastUpdated: Math.floor(Date.now() / 1000),
            total,
            currentPage: page - 1,
            pageSize: count,
            totalPages: Math.ceil(total / count),
        } as ApiReturnType<Block[]>);
    } catch (error) {
        res.status(404).json({ message: 'Pool blocks not available' });
    }
});

poolController.get('/:poolId', async (req, res) => {
    const { poolId } = req.params;
    try {
        const pool = await API.poolsById(poolId);
        const poolMetadata = await API.poolMetadata(poolId);
        const relays = await API.poolsByIdRelays(poolId);
        const createTx = await getTransactions(pool.registration[0]);
        let totalBalanceOfPoolOwners = 0;
        for (const owner of pool.owners) {
            const addressInfo = await API.accountsAddresses(owner);
            for (const address of addressInfo) {
                const addressI = await API.addresses(address.address);
                totalBalanceOfPoolOwners += Number.parseInt(addressI.amount.find(a => a.unit === 'lovelace')?.quantity || '0');
            }
        }
        res.json({
            data: {
                poolName: poolMetadata.name || 'Unknown Pool',
                tickerName: poolMetadata.ticker || 'N/A',
                poolView: poolMetadata.pool_id || '',
                poolStatus: pool.registration.length > pool.retirement.length ? 'ACTIVE' : 'RETIRED',
                createDate: createTx.block_time || '',
                rewardAccounts: pool.owners,
                ownerAccounts: pool.owners,
                poolSize: Number.parseInt(pool.active_stake || '0'),
                stakeLimit: Number.parseInt(pool.active_stake || '0'), // Placeholder, Blockfrost does not provide stake limit
                delegators: pool.live_delegators || 0,
                saturation: pool.live_saturation || 0,
                totalBalanceOfPoolOwners: totalBalanceOfPoolOwners, // Placeholder, Blockfrost does not provide this info
                reward: pool.margin_cost || '0',
                ros: 0, // Placeholder, Blockfrost does not provide this info
                pledge: Number.parseInt(pool.declared_pledge || '0'),
                cost: Number.parseInt(pool.fixed_cost || '0'),
                margin: pool.margin_cost || '0',
                epochBlock: pool.blocks_epoch || 0,
                lifetimeBlock: pool.blocks_minted || 0,
                description: poolMetadata.description || '',
                hashView: poolMetadata.hash || '',
                homepage: poolMetadata.homepage || '',
                // iconUrl: poolMetadata.url || '',
                // logoUrl: poolMetadata.url || '',
                vrfKey: (pool as any).vrf_key,
                livePledge: Number.parseInt((pool as any).live_pledge ?? '0'),
                relays: relays.map((r: any) => ({
                    ipv4: r.ipv4 ?? undefined,
                    ipv6: r.ipv6 ?? undefined,
                    dns: r.dns ?? undefined,
                    dnsSrv: r.dns_srv ?? undefined,
                    port: r.port ?? undefined
                })),
            } as PoolDetail,
            lastUpdated: Math.floor(Date.now() / 1000),
            total: 1,
            currentPage: 0,
            pageSize: 1,
            totalPages: 1,
        } as ApiReturnType<PoolDetail>);
    } catch (error) {
        res.status(404).json({ message: 'Pool not found' });
    }
});