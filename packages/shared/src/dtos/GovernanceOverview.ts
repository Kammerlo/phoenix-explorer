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
    status: GovActionStatus;
    expiredEpoch: number | null;
    enactedEpoch: number | null;
    motivation: string | null;
    rationale: string | null;
    title: string | null;
    authors: string[] | null;
    abstract: string | null;
    votesStats: VoteData;
}

export type GovActionStatus = 'EXPIRED' | 'ENACTED' | 'ACTIVE';

export type VoteType = 'committee' | 'drep' | 'spo';

export interface VoteData {
    committee?: {
        yes: number;
        no: number;
        abstain: number;
    };
    drep?: {
        yes: number;
        no: number;
        abstain: number;
    };
    spo?: {
        yes: number;
        no: number;
        abstain: number;
    };
}