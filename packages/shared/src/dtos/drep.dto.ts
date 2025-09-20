export interface Drep {
    activeVoteStake: number;
    anchorHash: string;
    anchorUrl: string;
    createdAt?: string;
    drepHash: string;
    givenName?: string;
    drepId: string;
    status: "ACTIVE" | "INACTIVE" | "RETIRED";
    updatedAt?: string;
    votingPower?: number;
    govParticipationRate?: number;
}

export interface DrepDetail {
    activeVoteStake: number;
    anchorUrl: string;
    anchorHash: string;
    createdAt: string;
    delegators: number;
    drepHash: string;
    drepId: string;
    liveStake: number;
    status: "ACTIVE" | "INACTIVE" | "RETIRED";
    votingParticipation: number;
    type: string;
    numberOfAbstainVotes: number | null;
    numberOfNoVotes: number | null;
    numberOfYesVote: number | null;
}