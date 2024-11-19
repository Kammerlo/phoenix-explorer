import { DRepDto } from "../types/drep-dto";
import { DRepRegistrationTypeEnum } from "../types";
import { DREP_ACTION_TYPE, POOL_ACTION_TYPE } from "../../../utils/constants";

export function dRepDtoToDrepOverview(drepDto: DRepDto): DrepOverview {
  return {
    drepId: drepDto.drepId || "",
    drepHash: drepDto.drepHash || "",
    status:
      drepDto.registrations && drepDto.registrations.length > 0
        ? drepDto.registrations[0].type === DRepRegistrationTypeEnum.REGDREPCERT
          ? "ACTIVE"
          : "RETIRED"
        : "ACTIVE",
    anchorHash: drepDto.anchorHash || "",
    anchorUrl: drepDto.anchorUrl || "",
    createdAt: drepDto.createdAt + "" || "",
    activeVoteStake: 0, // TODO: get from API
    type: "DREP",
    delegators: 0, // TODO: get from API
    liveStake: 0, // TODO: get from API
    votingParticipation: 0, // TODO: get from API
    certHistory: drepDto.registrations
      ? drepDto.registrations.map((registration) => {
          return {
            epochNo: registration.epoch || 0,
            createdAt: registration.blockTime + "" || "",
            blockNo: registration.blockNumber || 0,
            txHash: registration.txHash || "",
            epochSlotNo: registration.slot || 0,
            slotNo: registration.slot || 0, // TODO Slot currently doubled
            absoluteSlot: registration.slot || 0, // TODO Slot currently doubled
            actions: [mapDrepActionTypeToPoolType(registration.type || "")], // TODO Update this
            actionTypes: [DREP_ACTION_TYPE.REG_DREP_CERT] // TODO Update this
          } as CertificateHistory;
        })
      : []
  };
}

function mapDrepActionTypeToPoolType(actionType: string): POOL_ACTION_TYPE {
  switch (actionType) {
    case DREP_ACTION_TYPE.REG_DREP_CERT.toString():
      return POOL_ACTION_TYPE.POOL_REGISTRATION;
    case DREP_ACTION_TYPE.UNREG_DREP_CERT.toString():
      return POOL_ACTION_TYPE.POOL_DE_REGISTRATION;
    case DREP_ACTION_TYPE.UPDATE_DREP_CERT.toString():
      return POOL_ACTION_TYPE.POOL_UPDATE;
    default:
      return POOL_ACTION_TYPE.POOL_REGISTRATION;
  }
}
