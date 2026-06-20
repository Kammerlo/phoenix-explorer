import { OgmiosDelegateRepresentative } from "../types";
import { Drep } from "../../dtos/drep.dto";

export function mapDelegateRepresentative(raw: OgmiosDelegateRepresentative): Drep {
  const stake = raw.stake?.ada.lovelace ?? 0;
  const id = raw.id ?? raw.type; // predefined dreps (abstain/noConfidence) have no id
  return {
    activeVoteStake: stake,
    votingPower: stake,
    anchorHash: raw.metadata?.hash ?? "",
    anchorUrl: raw.metadata?.url ?? "",
    drepHash: id,
    drepId: id,
    status: raw.type === "registered" ? "ACTIVE" : "INACTIVE",
    delegators: raw.delegators?.length ?? 0
  };
}
