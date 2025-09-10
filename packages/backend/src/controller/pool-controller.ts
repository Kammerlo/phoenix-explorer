import { ApiReturnType } from "@shared/APIReturnType";
import { PoolOverview } from "@shared/dtos/pool.dto";
import { Router } from "express";
import { API } from "src/config/blockfrost";

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