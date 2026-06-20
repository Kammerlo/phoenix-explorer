import { mapProposalToListItem, mapProposalToDetail, mapProposalVotes, voterTypeOf } from "./governance";
import { OgmiosGovernanceProposal } from "../types";
import fixture from "../__fixtures__/governanceProposals.json";

const P = (fixture as unknown as OgmiosGovernanceProposal[])[0];

describe("governance mappers", () => {
  it("maps a proposal to a list item", () => {
    const item = mapProposalToListItem(P);
    expect(item.txHash).toBe(P.proposal.transaction.id);
    expect(item.index).toBe(P.proposal.index);
    expect(item.type).toBe(P.action.type);
    expect(item.status).toBe("ACTIVE");
    expect(item.expiredEpoch).toBe(P.until?.epoch ?? null);
  });

  it("aggregates votes by role into votesStats", () => {
    const detail = mapProposalToDetail(P);
    const ccNo = P.votes.filter((v) => v.issuer.role === "constitutionalCommittee" && v.vote === "no").length;
    expect(detail.votesStats.committee?.no).toBe(ccNo);
  });

  it("maps each vote to a GovActionVote", () => {
    const votes = mapProposalVotes(P);
    expect(votes).toHaveLength(P.votes.length);
    expect(votes[0].voter).toBe(P.votes[0].issuer.id);
    expect(votes[0].vote).toBe(P.votes[0].vote);
  });

  it("maps roles to voter types", () => {
    expect(voterTypeOf("constitutionalCommittee")).toBe("constitutional_committee");
    expect(voterTypeOf("delegateRepresentative")).toBe("drep");
    expect(voterTypeOf("stakePoolOperator")).toBe("spo");
  });
});
