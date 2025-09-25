import { Router } from "express";
import { API } from "../config/blockfrost";
import { GovernanceActionDetail, GovernanceActionListItem } from "@shared/dtos/GovernanceOverview";
import { ApiReturnType } from "@shared/APIReturnType";
import { Drep, DrepDelegates } from "@shared/dtos/drep.dto";
import { json } from "stream/consumers";

export const governanceController = Router();

governanceController.get('/actions', async (req, res) => {
    const pageInfo = req.query;
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const proposals = await API.governance.proposals({
        page: Number.parseInt(String(pageInfo.page || 0)),
        count: Number.parseInt(String(pageInfo.size || 100))
    });

    const govActionListItems: GovernanceActionListItem[] = proposals.map((proposal) => {
        return {
            txHash: proposal.tx_hash,
            index: proposal.cert_index,
            type: proposal.governance_type
        } as GovernanceActionListItem;
    });
    res.json({
        data: govActionListItems, // Reverse to show the latest block first
        lastUpdated: unixTimestamp,
        total: govActionListItems.length, // TODO need to find the total number of blocks
        currentPage: Number.parseInt(String(pageInfo.page ?? 0)),
        pageSize: Number.parseInt(String(pageInfo.size ?? 10)),
        totalPages: Math.ceil(govActionListItems.length / (pageInfo.size ? Number.parseInt(String(pageInfo.size)) : 100)),
    } as ApiReturnType<GovernanceActionListItem[]>);
});

governanceController.get('/actions/:txHash/:indexStr', async (req, res) => {
    const { txHash, indexStr } = req.params;
    const index = Number.parseInt(indexStr);
    const proposal = await API.governance.proposal(txHash, index);
    console.log(proposal);
    const metadata = await API.governance.proposalMetadata(txHash, index);
    console.log(metadata);
    // const jsonMetadata = JSON.parse((metadata.json_metadata as string) || "{}");
    const governanceDetail: GovernanceActionDetail = {
        txHash: txHash,
        index: indexStr,
        dateCreated: "",
        actionType: proposal.governance_type,
        status: "", // TODO
        motivation: typeof proposal.governance_description === "string" ? proposal.governance_description : JSON.stringify(proposal.governance_description ?? ""),
        rationale: "",
        isValidHash: true, // Assuming the hash is valid
        anchorHash: "",
        anchorUrl: "",
        abstract: "",
        allowedVoteByCC: true,
        allowedVoteBySPO: true,
    };
    res.json({
        data: governanceDetail,
        lastUpdated: Math.floor(Date.now() / 1000),
    } as ApiReturnType<GovernanceActionDetail>);
});

governanceController.get('/dreps', async (req, res) => {
    const pageInfo = req.query;
    const drepsData = await API.governance.dreps({
        page: Number.parseInt(String(pageInfo.page || 0)),
        count: Number.parseInt(String(pageInfo.size || 100))
    });
    const unixTimestamp = Math.floor(Date.now() / 1000);
    let dreps: Drep[] = [];
    for (const drep of drepsData) {

        let drepDetails;
        let drepMetadata;
        let jsonMetadata : any
        try {
            drepDetails = await API.governance.drepsById(drep.drep_id);
            drepMetadata = await API.governance.drepsByIdMetadata(drep.drep_id);
            jsonMetadata = drepMetadata.json_metadata
        } catch (e) {
            console.error("Error fetching drep details for drep id:", drep.drep_id);
        }
        dreps.push({
            activeVoteStake: drepDetails ? drepDetails.amount : 0,
            anchorHash: drepMetadata ? drepMetadata?.hash : "",
            anchorUrl: drepMetadata ? drepMetadata?.url : "",
            givenName: jsonMetadata ? 
            (typeof jsonMetadata.body.givenName === 'string' 
                ? jsonMetadata.body.givenName 
                : jsonMetadata.body.givenName?.["@value"] || "") : "",
            drepHash: drep.hex,
            drepId: drep.drep_id,
            status: "ACTIVE",
        } as Drep);
    }
    res.json({
        data: dreps,
        lastUpdated: unixTimestamp,
        total: dreps.length,
        currentPage: 1,
        pageSize: dreps.length,
        totalPages: 1,
    } as ApiReturnType<Drep[]>);
});

governanceController.get('/dreps/:drepId', async (req, res) => {
    const { drepId } = req.params;
    let drepDetails;
    let drepMetadata;
    let jsonMetadata : any;
    let delegators : any[] = [];
    let updates : any[] = [];
    let createTx : any;
    let lastUpdateTx : any;
    let votes : any[] = [];
    try {
        drepDetails = await API.governance.drepsById(drepId);
        drepMetadata = await API.governance.drepsByIdMetadata(drepId);
        jsonMetadata = drepMetadata.json_metadata
        delegators = await API.governance.drepsByIdDelegatorsAll(drepId);
        updates = await API.governance.drepsByIdUpdatesAll(drepId);
        if(updates && updates.length > 0) {
            createTx = await API.txs(updates[0].tx_hash);
            lastUpdateTx = await API.txs(updates[updates.length - 1].tx_hash);
        }
        votes = await API.governance.drepsByIdVotesAll(drepId);
    } catch (e) {
        console.error("Error fetching drep details for drep id:", drepId);
    }
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const drep: Drep = {
        activeVoteStake: drepDetails ? drepDetails.amount : 0,
        anchorHash: drepMetadata ? drepMetadata?.hash : "",
        anchorUrl: drepMetadata ? drepMetadata?.url : "",
        givenName: jsonMetadata ? 
        (typeof jsonMetadata.body.givenName === 'string' 
            ? jsonMetadata.body.givenName 
            : jsonMetadata.body.givenName?.["@value"] || "") : "",
        drepHash: drepDetails ? drepDetails.hex : "",
        createdAt: createTx ? createTx.block_time : undefined,
        updatedAt: lastUpdateTx ? lastUpdateTx.block_time : undefined,
        drepId: drepId,
        status: drepDetails?.retired ? "RETIRED" : "ACTIVE",
        votingPower: drepDetails ? drepDetails.amount : 0,
        govParticipationRate: 0,
        delegators: delegators?.length || 0,
        votes: {
            total: votes?.length || 0,
            abstain: votes?.filter(v => v.vote === "abstain").length || 0,
            no: votes?.filter(v => v.vote === "no").length || 0,
            yes: votes?.filter(v => v.vote === "yes").length || 0,
        }
    } as Drep;
    res.json({
        data: drep,
        lastUpdated: unixTimestamp,
    } as ApiReturnType<Drep>);
});

governanceController.get('/dreps/:drepId/votes', async (req, res) => {
    const { drepId } = req.params;
    const pageInfo = req.query;
    const votesData = await API.governance.drepsByIdVotes(drepId);
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const page = Number.parseInt(String(pageInfo.page ?? 0));
    const size = Number.parseInt(String(pageInfo.size ?? 10));
    const safePage = Number.isNaN(page) ? 0 : Math.max(0, page);
    const safeSize = Number.isNaN(size) ? 10 : Math.max(1, size);
    const start = safePage * safeSize;
    const end = start + safeSize;

    const votes: GovernanceActionListItem[] = votesData
        .slice(start, end)
        .map((vote: any) => {
            return {
                txHash: vote.tx_hash,
                index: vote.cert_index,
                vote: vote.vote, // reuse the "type" field to carry the vote value
            } as GovernanceActionListItem;
        });
    res.json({
        data: votes,
        lastUpdated: unixTimestamp,
        total: votesData.length,
        currentPage: Number.parseInt(String(pageInfo.page ?? 0)),
        pageSize: Number.parseInt(String(pageInfo.size ?? 10)),
        totalPages: Math.ceil(votesData.length / (pageInfo.size ? Number.parseInt(String(pageInfo.size)) : 100)),
    } as ApiReturnType<GovernanceActionListItem[]>);
});

governanceController.get('/dreps/:drepId/delegates', async (req, res) => {
    const { drepId } = req.params;
    const pageInfo = req.query;
    const delegatorsData = await API.governance.drepsByIdDelegatorsAll(drepId);
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const page = Number.parseInt(String(pageInfo.page ?? 0));
    const size = Number.parseInt(String(pageInfo.size ?? 10));
    const safePage = Number.isNaN(page) ? 0 : Math.max(0, page);
    const safeSize = Number.isNaN(size) ? 10 : Math.max(1, size);
    const start = safePage * safeSize;
    const end = start + safeSize;

    const delegates = delegatorsData
        .slice(start, end)
        .map((delegator: any) => {
            return {
                address: delegator.address,
                amount: delegator.amount
            };
        });
    res.json({
        data: delegates,
        lastUpdated: unixTimestamp,
        total: delegatorsData.length,
        currentPage: Number.parseInt(String(pageInfo.page ?? 0)),
        pageSize: Number.parseInt(String(pageInfo.size ?? 10)),
        totalPages: Math.ceil(delegatorsData.length / (pageInfo.size ? Number.parseInt(String(pageInfo.size)) : 100)),
    } as ApiReturnType<DrepDelegates[]>);
});