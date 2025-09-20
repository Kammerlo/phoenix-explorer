import { Router } from "express";
import { API } from "../config/blockfrost";
import { GovernanceActionDetail, GovernanceActionListItem } from "@shared/dtos/GovernanceOverview";
import { ApiReturnType } from "@shared/APIReturnType";
import { Drep } from "@shared/dtos/drep.dto";
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
        };
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
        console.log("--------");
        console.log(jsonMetadata);
        console.log("--------");

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