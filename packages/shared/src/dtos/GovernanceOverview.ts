export interface GovernanceOverview {
    activeDReps: number;
    activeSPOs: number;
    activeCommittees: number;
    totalGovActions: number;
    govCountMap: {
        PARAMETER_CHANGE_ACTION: number;
        UPDATE_COMMITTEE: number;
        INFO_ACTION: number;
        NEW_CONSTITUTION: number;
        NO_CONFIDENCE: number;
        HARD_FORK_INITIATION_ACTION: number;
        TREASURY_WITHDRAWALS_ACTION: number;
    };
    govStatusMap: {
        EXPIRED: number;
        ENACTED: number;
        OPEN_BALLOT: number;
    };
}

export interface GovernanceActionListItem {
    // govActionName: string;
    txHash: string;
    index: number;
    type?: string;
    vote?: 'yes' | 'no' | 'abstain';
    // status: string;
    // votingPower: number;
    // indexType: number;
    // isRepeatVote: null;
    // voterHash: null;
    // createdAt: string;
}

export interface GovernanceActionDetail {
    txHash: string;
    index: string;
    dateCreated: string;
    actionType: string;
    status: string;
    motivation: string | null;
    rationale: string | null;
    isValidHash: boolean;
    anchorHash: string | null;
    anchorUrl: string | null;
    abstract: string | null;
    allowedVoteByCC: boolean;
    allowedVoteBySPO: boolean;
}