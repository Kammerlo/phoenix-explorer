import { DRepRegistration, DRepRegistrationTypeEnum } from "../types";

export function drepRegistrationsToDreps(drepRegistrations: DRepRegistration[]): Drep[] {
  return drepRegistrations.map((drepRegistration) => {
    return drepRegistrationToDrep(drepRegistration);
  });
}

export function drepRegistrationToDrep(drepRegistration: DRepRegistration): Drep {
  return {
    drepId: drepRegistration.drepId || "",
    drepHash: drepRegistration.drepHash || "",
    status: drepRegistration.type
      ? drepRegistration.type === DRepRegistrationTypeEnum.REGDREPCERT
        ? "ACTIVE"
        : "RETIRED"
      : "ACTIVE",
    anchorHash: drepRegistration.anchorHash || "",
    anchorUrl: drepRegistration.anchorUrl || "",
    createdAt: drepRegistration.blockTime + "" || "",
    updatedAt: drepRegistration.blockTime + "" || "",
    activeVoteStake: 0, // TODO: get from API
    votingPower: 0, // TODO: get from API
    govParticipationRate: 0 // TODO: get from API
  };
}
