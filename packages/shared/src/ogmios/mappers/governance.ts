import { OgmiosGovernanceProposal, OgmiosVoteRole } from "../types";
import {
  GovernanceActionListItem,
  GovernanceActionDetail,
  GovActionVote,
  VoteType,
  VoteData
} from "../../dtos/GovernanceOverview";

export function voterTypeOf(role: OgmiosVoteRole): VoteType {
  switch (role) {
    case "constitutionalCommittee": return "constitutional_committee";
    case "delegateRepresentative": return "drep";
    case "stakePoolOperator": return "spo";
  }
}

export function mapProposalToListItem(p: OgmiosGovernanceProposal): GovernanceActionListItem {
  return {
    txHash: p.proposal.transaction.id,
    index: p.proposal.index,
    type: p.action.type,
    status: "ACTIVE",
    expiredEpoch: p.until?.epoch ?? null,
    enactedEpoch: null
  };
}

function emptyTally() { return { yes: 0, no: 0, abstain: 0 }; }

function aggregateVotes(p: OgmiosGovernanceProposal): VoteData {
  const data: VoteData = { committee: emptyTally(), drep: emptyTally(), spo: emptyTally() };
  for (const v of p.votes) {
    const bucket =
      v.issuer.role === "constitutionalCommittee" ? data.committee :
      v.issuer.role === "delegateRepresentative" ? data.drep : data.spo;
    if (bucket) bucket[v.vote] += 1;
  }
  return data;
}

export function mapProposalToDetail(p: OgmiosGovernanceProposal): GovernanceActionDetail {
  return {
    txHash: p.proposal.transaction.id,
    index: String(p.proposal.index),
    dateCreated: "",
    actionType: p.action.type,
    status: "ACTIVE",
    expiredEpoch: p.until?.epoch ?? null,
    enactedEpoch: null,
    motivation: null,
    rationale: null,
    title: null,
    authors: null,
    abstract: null,
    votesStats: aggregateVotes(p),
    anchorUrl: p.metadata?.url,
    anchorHash: p.metadata?.hash,
    depositReturn: p.returnAccount
  };
}

export function mapProposalVotes(p: OgmiosGovernanceProposal): GovActionVote[] {
  return p.votes.map((v) => ({
    voter: v.issuer.id,
    voterType: voterTypeOf(v.issuer.role),
    vote: v.vote,
    txHash: p.proposal.transaction.id,
    certIndex: p.proposal.index,
    voteTime: ""
  }));
}
