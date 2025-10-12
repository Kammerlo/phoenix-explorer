import { ApiReturnType } from "@shared/APIReturnType";
import { ProtocolParameters } from "@shared/dtos/protocolParams.dto";
import { Router } from "express";
import { API } from "src/config/blockfrost";

export const protocolParameterController = Router();

protocolParameterController.get('', async (req, res) => {
    const latestParameters = await API.epochsLatestParameters();
    const protocolParams: ProtocolParameters = {
        epoch: latestParameters.epoch,
        minFeeA: latestParameters.min_fee_a,
        minFeeB: latestParameters.min_fee_b,
        maxBlockSize: latestParameters.max_block_size,
        maxTxSize: latestParameters.max_tx_size,
        maxBhSize: latestParameters.max_block_header_size,
        keyDeposit: latestParameters.key_deposit,
        poolDeposit: latestParameters.pool_deposit,
        eMax: latestParameters.e_max,
        nOpt: latestParameters.n_opt,
        a0: latestParameters.a0,
        rho: latestParameters.rho,
        tau: latestParameters.tau,
        decentralisationParam: latestParameters.decentralisation_param,
        extraEntropy: latestParameters.extra_entropy,
        protocolMajorVer: latestParameters.protocol_major_ver,
        protocolMinorVer: latestParameters.protocol_minor_ver,
        minUtxo: latestParameters.min_utxo,
        minPoolCost: latestParameters.min_pool_cost,
        nonce: latestParameters.nonce
    };
    res.json({
        data: protocolParams,
        lastUpdated: Math.floor(Date.now() / 1000),
        total: 1,
        currentPage: 0,
        pageSize: 1,
        totalPages: 1,
    } as ApiReturnType<ProtocolParameters>);
});

protocolParameterController.get('/:epoch', async (req, res) => {
    const { epoch } = req.params;
    const epochId = Number.parseInt(epoch);
    if (isNaN(epochId) || epochId < 0) {
        res.status(400).json({ error: "Invalid epoch parameter" });
        return;
    }
    const epochParameters = await API.epochsParameters(epochId);
    const protocolParams: ProtocolParameters = {
        epoch: epochParameters.epoch,
        minFeeA: epochParameters.min_fee_a,
        minFeeB: epochParameters.min_fee_b,
        maxBlockSize: epochParameters.max_block_size,
        maxTxSize: epochParameters.max_tx_size,
        maxBhSize: epochParameters.max_block_header_size,
        keyDeposit: epochParameters.key_deposit,
        poolDeposit: epochParameters.pool_deposit,
        eMax: epochParameters.e_max,
        nOpt: epochParameters.n_opt,
        a0: epochParameters.a0,
        rho: epochParameters.rho,
        tau: epochParameters.tau,
        decentralisationParam: epochParameters.decentralisation_param,
        extraEntropy: epochParameters.extra_entropy,
        protocolMajorVer: epochParameters.protocol_major_ver,
        protocolMinorVer: epochParameters.protocol_minor_ver,
        minUtxo: epochParameters.min_utxo,
        minPoolCost: epochParameters.min_pool_cost,
        nonce: epochParameters.nonce
    };
    res.json({
        data: protocolParams,
        lastUpdated: Math.floor(Date.now() / 1000),
        total: 1,
        currentPage: 0,
        pageSize: 1,
        totalPages: 1,
    } as ApiReturnType<ProtocolParameters>);
});