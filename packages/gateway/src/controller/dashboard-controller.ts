import { Router } from 'express';
import { API } from '../config/blockfrost';
import { envelope, errorEnvelope } from '@shared/helpers/envelope';
import { DashboardStats } from '@shared/dtos/dashboard.dto';

export const dashboardController = Router();

dashboardController.get('/stats', async (_req, res) => {
  try {
    const [latestBlock, network, latestEpoch] = await Promise.all([
      API.blocksLatest(),
      API.network(),
      API.epochsLatest()
    ]);

    const now = Math.floor(Date.now() / 1000);
    const progressPercent =
      latestEpoch.start_time && latestEpoch.end_time
        ? Math.min(
            100,
            Math.round(
              ((now - latestEpoch.start_time) /
                (latestEpoch.end_time - latestEpoch.start_time)) *
                100
            )
          )
        : 0;

    const data: DashboardStats = {
      currentEpoch: {
        no: latestEpoch.epoch,
        startTime: latestEpoch.start_time,
        endTime: latestEpoch.end_time,
        txCount: latestEpoch.tx_count,
        blkCount: latestEpoch.block_count,
        outSum: latestEpoch.output,
        fees: latestEpoch.fees,
        activeStake: latestEpoch.active_stake ?? null,
        progressPercent,
      },
      latestBlock: {
        height: latestBlock.height,
        hash: latestBlock.hash,
        slot: latestBlock.slot ?? null,
        epochNo: latestBlock.epoch ?? null,
        epochSlot: latestBlock.epoch_slot ?? null,
        time: latestBlock.time,
        txCount: latestBlock.tx_count,
        size: latestBlock.size,
      },
      supply: {
        circulating: network.supply.circulating,
        total: network.supply.total,
        max: network.supply.max,
        locked: network.supply.locked,
      },
      stake: {
        live: network.stake.live,
        active: network.stake.active,
      },
    };

    res.json(envelope(data));
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json(errorEnvelope<DashboardStats>(err));
  }
});
