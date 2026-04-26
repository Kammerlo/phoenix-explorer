import { Router } from "express";
import { API } from "../config/blockfrost";
import { GovActionVote, GovernanceActionDetail, GovernanceActionListItem, VoteData } from "@shared/dtos/GovernanceOverview";
import { ApiReturnType } from "@shared/APIReturnType";
import { Drep, DrepDelegates } from "@shared/dtos/drep.dto";

import { cache, getTransactions } from "../config/cache";

export const governanceController = Router();

governanceController.get('/actions', async (req, res) => {
    const pageInfo = req.query;

    // Frontend pagination is 1-based; accept legacy 0 as "first page".
    const requestedPage = Math.max(1, Number.parseInt(String(pageInfo.page || 1)));
    const requestedSize = Number.parseInt(String(pageInfo.size || 10));
    const proposals = await API.governance.proposals({
        page: requestedPage,
        count: requestedSize
    });

    const govActionListItems: GovernanceActionListItem[] = proposals.map((proposal: any) => {
        // Blockfrost list returns `expiration` (scheduled expiry epoch).
        // `expired_epoch`/`enacted_epoch` are only on the detail endpoint.
        const status = proposal.expired_epoch ? 'EXPIRED' : proposal.enacted_epoch ? 'ENACTED' : 'ACTIVE';
        return {
            txHash: proposal.tx_hash,
            index: proposal.cert_index,
            type: proposal.governance_type,
            status,
            expiredEpoch: proposal.expired_epoch ?? proposal.expiration ?? null,
            enactedEpoch: proposal.enacted_epoch ?? null,
        } as GovernanceActionListItem;
    });
    // Estimate total so the pagination panel keeps a "next" button visible
    // until we reach a short page (Blockfrost doesn't return a global count).
    const hasMore = govActionListItems.length >= requestedSize;
    const estimatedTotal = hasMore
        ? (requestedPage + 1) * requestedSize
        : (requestedPage - 1) * requestedSize + govActionListItems.length;
    res.json({
        data: govActionListItems,
        lastUpdated: Date.now(),
        total: estimatedTotal,
        currentPage: requestedPage - 1, // FooterTable expects 0-based
        pageSize: requestedSize,
        totalPages: Math.ceil(estimatedTotal / requestedSize),
    } as ApiReturnType<GovernanceActionListItem[]>);
});

governanceController.get('/actions/:txHash/:indexStr', async (req, res) => {
    const { txHash, indexStr } = req.params;
    const index = Number.parseInt(indexStr);
    let governanceDetail = undefined;
    let error = undefined;
    try {
        // Proposal is required; metadata + votes are best-effort. Without this split
        // a proposal with no off-chain metadata 404'd via proposalMetadata and the
        // entire detail page rendered "Governance Action Not Found".
        const proposal = await API.governance.proposal(txHash, index);
        const [metadata, votes, transaction] = await Promise.all([
            API.governance.proposalMetadata(txHash, index).catch(() => null as any),
            API.governance.proposalVotesAll(txHash, index).catch(() => [] as any[]),
            getTransactions(txHash).catch(() => ({ block_time: undefined } as any))
        ]);

        // Safely parse metadata.json_metadata
        let jsonMetadata: any = {};
        try {
            if (metadata?.json_metadata) {
                if (typeof metadata.json_metadata === 'string') {
                    jsonMetadata = JSON.parse(metadata.json_metadata);
                } else {
                    jsonMetadata = metadata.json_metadata;
                }
            }
        } catch (e) {
            console.error('Error parsing json_metadata:', e);
        }
        const body = jsonMetadata?.body || {};
        const authorsRaw: any[] = Array.isArray(jsonMetadata?.authors) ? jsonMetadata.authors : [];
        const p = proposal as any;
        const status = p.expired_epoch ? 'EXPIRED' : p.enacted_epoch ? 'ENACTED' : 'ACTIVE';
        governanceDetail = {
            txHash: txHash,
            index: indexStr,
            status: status,
            dateCreated: transaction.block_time || "",
            actionType: proposal.governance_type,
            expiredEpoch: p.expired_epoch ?? null,
            enactedEpoch: p.enacted_epoch ?? null,
            rationale: body.rationale || null,
            abstract: body.abstract || null,
            motivation: body.motivation || null,
            title: body.title || null,
            authors: authorsRaw.map((a: any) => (typeof a === 'string' ? a : a?.name || String(a))),
            anchorUrl: (proposal as any).anchor_url ?? undefined,
            anchorHash: (proposal as any).anchor_hash ?? undefined,
            depositReturn: (proposal as any).return_address ?? undefined,
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
        lastUpdated: Date.now(),
    } as ApiReturnType<GovernanceActionDetail>);
});

governanceController.get('/actions/:txHash/:indexStr/votes', async (req, res) => {
    const { txHash, indexStr } = req.params;
    const index = Number.parseInt(indexStr);
    const votes = await API.governance.proposalVotesAll(txHash, index);

    const govActionVote: GovActionVote[] = await Promise.all(votes.map(async (vote) => {
            const transaction = await getTransactions(vote.tx_hash);
            return {
                voter: vote.voter,
                voterType: vote.voter_role as any,
                vote: vote.vote,
                txHash: vote.tx_hash,
                certIndex: vote.cert_index,
                voteTime: transaction.block_time || "",
            } as GovActionVote;
            }));
    res.json({
        data: govActionVote,
        lastUpdated: Date.now(),
        total: govActionVote.length,
        pageSize: govActionVote.length,
    } as ApiReturnType<GovActionVote[]>);
});

governanceController.get('/dreps', async (req, res) => {
    const pageInfo = req.query;
    // Frontend pagination is 1-based; accept legacy 0 as "first page".
    const requestedPage = Math.max(1, Number.parseInt(String(pageInfo.page || 1)));
    const requestedSize = Number.parseInt(String(pageInfo.size || 100));
    const drepsData = await API.governance.dreps({
        page: requestedPage,
        count: requestedSize
    });

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
            (typeof jsonMetadata?.body?.givenName === 'string'
                ? jsonMetadata.body.givenName
                : jsonMetadata?.body?.givenName?.["@value"] || "") : "",
            drepHash: drep.hex,
            drepId: drep.drep_id,
            status: "ACTIVE",
        } as Drep);
    }
    // Apply client-supplied sort (e.g. ?sort=activeVoteStake,DESC). The values that come
    // from Blockfrost are strings or numbers — coerce to a numeric comparator for stake/amount fields.
    const sortParam = String(pageInfo.sort || '');
    if (sortParam) {
        const [rawKey, rawDir] = sortParam.split(',');
        const dir = (rawDir || 'ASC').toUpperCase() === 'DESC' ? -1 : 1;
        const numericKeys = new Set(['activeVoteStake']);
        if (rawKey) {
            dreps.sort((a: any, b: any) => {
                const av = a[rawKey];
                const bv = b[rawKey];
                if (numericKeys.has(rawKey)) {
                    return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
                }
                return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
            });
        }
    }
    // Estimate total so the pagination panel keeps a "next" button visible
    // until we reach a short page (Blockfrost doesn't return a global count).
    const hasMore = dreps.length >= requestedSize;
    const estimatedTotal = hasMore
        ? (requestedPage + 1) * requestedSize
        : (requestedPage - 1) * requestedSize + dreps.length;
    res.json({
        data: dreps,
        lastUpdated: Date.now(),
        total: estimatedTotal,
        currentPage: requestedPage - 1, // FooterTable expects 0-based
        pageSize: requestedSize,
        totalPages: Math.ceil(estimatedTotal / requestedSize),
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

    // Compute governance participation rate: votes cast / total proposals on chain
    let govParticipationRate = 0;
    try {
        const proposals = await API.governance.proposals({ page: 1, count: 100 });
        if (proposals.length > 0 && votes.length > 0) {
            govParticipationRate = Math.min(1, votes.length / proposals.length);
        }
    } catch {
        // leave at 0 if proposals fetch fails
    }


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
        govParticipationRate,
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
        lastUpdated: Date.now(),
    } as ApiReturnType<Drep>);
});

governanceController.get('/dreps/:drepId/votes', async (req, res) => {
    const { drepId } = req.params;
    const pageInfo = req.query;
    const votesData = await API.governance.drepsByIdVotes(drepId);
    // Frontend pagination is 1-based; accept legacy 0 as "first page".
    const rawPage = Number.parseInt(String(pageInfo.page ?? 1));
    const rawSize = Number.parseInt(String(pageInfo.size ?? 10));
    const safePage = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);
    const safeSize = Number.isNaN(rawSize) ? 10 : Math.max(1, rawSize);
    const start = (safePage - 1) * safeSize;
    const end = start + safeSize;

    const votes: GovernanceActionListItem[] = votesData
        .slice(start, end)
        .map((vote: any) => {
            return {
                txHash: vote.tx_hash,
                index: vote.cert_index,
                vote: vote.vote,
            } as GovernanceActionListItem;
        });
    res.json({
        data: votes,
        lastUpdated: Date.now(),
        total: votesData.length,
        currentPage: safePage - 1, // FooterTable expects 0-based
        pageSize: safeSize,
        totalPages: Math.ceil(votesData.length / safeSize),
    } as ApiReturnType<GovernanceActionListItem[]>);
});

governanceController.get('/dreps/:drepId/delegates', async (req, res) => {
    const { drepId } = req.params;
    const pageInfo = req.query;
    const delegatorsData = await API.governance.drepsByIdDelegatorsAll(drepId);
    // Frontend pagination is 1-based; accept legacy 0 as "first page".
    const rawPage = Number.parseInt(String(pageInfo.page ?? 1));
    const rawSize = Number.parseInt(String(pageInfo.size ?? 10));
    const safePage = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);
    const safeSize = Number.isNaN(rawSize) ? 10 : Math.max(1, rawSize);
    const start = (safePage - 1) * safeSize;
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
        lastUpdated: Date.now(),
        total: delegatorsData.length,
        currentPage: safePage - 1, // FooterTable expects 0-based
        pageSize: safeSize,
        totalPages: Math.ceil(delegatorsData.length / safeSize),
    } as ApiReturnType<DrepDelegates[]>);
});