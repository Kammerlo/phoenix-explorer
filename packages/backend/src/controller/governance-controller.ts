import { Router } from "express";
import { API } from "../config/blockfrost";
import { GovernanceActionDetail, GovernanceActionListItem, VoteData } from "@shared/dtos/GovernanceOverview";
import { ApiReturnType } from "@shared/APIReturnType";
import { Drep, DrepDelegates } from "@shared/dtos/drep.dto";
import { json } from "stream/consumers";
import { cache, getTransactions } from "src/config/cache";

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
    let governanceDetail = undefined;
    let error = undefined;
    try {
        const proposal = await API.governance.proposal(txHash, index);
        const metadata = await API.governance.proposalMetadata(txHash, index);
        const votes = await API.governance.proposalVotesAll(txHash, index);

        const transaction = await getTransactions(txHash);
        
        // Safely parse metadata.json_metadata
        let jsonMetadata: any = {};
        try {
            if (metadata.json_metadata) {
                if (typeof metadata.json_metadata === 'string') {
                    jsonMetadata = JSON.parse(metadata.json_metadata);
                } else {
                    // Already parsed object
                    jsonMetadata = metadata.json_metadata;
                }
            }
        } catch (e) {
            console.error('Error parsing json_metadata:', e);
            jsonMetadata = {};
        }
        const status = proposal.expired_epoch ? 'EXPIRED' : proposal.enacted_epoch ? 'ENACTED' : 'ACTIVE';
        governanceDetail = {
            txHash: txHash,
            index: indexStr,
            status: status,
            dateCreated: transaction.block_time || "",
            actionType: proposal.governance_type,
            expiredEpoch: proposal.expired_epoch,
            enactedEpoch: proposal.enacted_epoch,
            rationale: jsonMetadata.body.rationale || "",
            abstract: jsonMetadata.body.abstract || "",
            motivation: jsonMetadata.body.motivation || "",
            title: jsonMetadata.body.title || "",
            authors: jsonMetadata.authors.map((author: any) => author.name) || [],
            allowedVoteByCC: true,
            allowedVoteBySPO: true,
            votesStats: {
                committee: {
                    yes: votes.filter(v => v.vote === "yes" && v.voter_role === "constitutional_committee").length,
                    no: votes.filter(v => v.vote === "no" && v.voter_role === "constitutional_committee").length,
                    abstain: votes.filter(v => v.vote === "abstain" && v.voter_role === "constitutional_committee").length,
                    total: votes.filter(v => v.voter_role === "constitutional_committee").length,
                },
                drep: {
                    yes: votes.filter(v => v.vote === "yes" && v.voter_role === "drep").length,
                    no: votes.filter(v => v.vote === "no" && v.voter_role === "drep").length,
                    abstain: votes.filter(v => v.vote === "abstain" && v.voter_role === "drep").length,
                    total: votes.filter(v => v.voter_role === "drep").length,
                },
                spo: {
                    yes: votes.filter(v => v.vote === "yes" && v.voter_role === "spo").length,
                    no: votes.filter(v => v.vote === "no" && v.voter_role === "spo").length,
                    abstain: votes.filter(v => v.vote === "abstain" && v.voter_role === "spo").length,
                    total: votes.filter(v => v.voter_role === "spo").length,
                }
            } as VoteData,
        } as GovernanceActionDetail;
    } catch (e) {
        error = "Governance action not found";
        console.error("Error fetching governance action:", e);
    }
    res.json({
        data: governanceDetail,
        error: error,
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
            
            // Safely parse DRep metadata
            if (drepMetadata?.json_metadata) {
                if (typeof drepMetadata.json_metadata === 'string') {
                    try {
                        jsonMetadata = JSON.parse(drepMetadata.json_metadata);
                    } catch (parseError) {
                        console.error("Error parsing DRep json_metadata:", parseError);
                        jsonMetadata = {};
                    }
                } else {
                    jsonMetadata = drepMetadata.json_metadata;
                }
            } else {
                jsonMetadata = {};
            }
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
        
        // Safely parse DRep metadata
        if (drepMetadata?.json_metadata) {
            if (typeof drepMetadata.json_metadata === 'string') {
                try {
                    jsonMetadata = JSON.parse(drepMetadata.json_metadata);
                } catch (parseError) {
                    console.error("Error parsing DRep json_metadata:", parseError);
                    jsonMetadata = {};
                }
            } else {
                jsonMetadata = drepMetadata.json_metadata;
            }
        } else {
            jsonMetadata = {};
        }
        
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