import { ApiReturnType } from "@shared/APIReturnType";
import { PoolDetail, PoolOverview } from "@shared/dtos/pool.dto";
import { Router } from "express";
import { API } from "src/config/blockfrost";
import { getTransactions } from "src/config/cache";

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
            pledge: Number.parseInt((pool as any).declared_pledge ?? '0'),
            saturation: (pool as any).live_saturation ?? 0,
            stakeLimit: 0, // Placeholder, will be replaced below
            reserves: 0, // Placeholder, will be replaced below
            lifetimeBlock: Number.parseInt((pool as any).blocks_minted ?? '0'),
            votingPower: Number.parseInt((pool as any).active_stake ?? '0'),
            governanceParticipationRate: 0, // Placeholder, will be replaced below
            retired: false, // This endpoint only returns active pools
            kparam: 0, // Placeholder, will be replaced below
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

poolController.get('/:poolId', async (req, res) => {
    const { poolId } = req.params;
    try {
        const pool = await API.poolsById(poolId);
        const poolMetadata = await API.poolMetadata(poolId);
        const createTx = await getTransactions(pool.registration[0]);
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
                totalBalanceOfPoolOwners: 0, // Placeholder, Blockfrost does not provide this info
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