import { OgmiosEraSummary } from "../types";

function eraForSlot(slot: number, eras: OgmiosEraSummary[]): OgmiosEraSummary {
  for (const era of eras) {
    if (slot >= era.start.slot && (era.end === null || slot < era.end.slot)) return era;
  }
  return eras[eras.length - 1];
}

export function slotToUnixTime(slot: number, eras: OgmiosEraSummary[]): number {
  const era = eraForSlot(slot, eras);
  const slotLenSec = era.parameters.slotLength.milliseconds / 1000;
  return era.start.time.seconds + (slot - era.start.slot) * slotLenSec;
}

function eraForEpoch(epoch: number, eras: OgmiosEraSummary[]): OgmiosEraSummary {
  for (const era of eras) {
    if (epoch >= era.start.epoch && (era.end === null || epoch < era.end.epoch)) return era;
  }
  return eras[eras.length - 1];
}

export function epochBounds(
  epoch: number,
  eras: OgmiosEraSummary[]
): { startTime: number; endTime: number; epochLength: number; firstSlot: number } {
  const era = eraForEpoch(epoch, eras);
  const epochsIntoEra = epoch - era.start.epoch;
  const epochLength = era.parameters.epochLength;
  const firstSlot = era.start.slot + epochsIntoEra * epochLength;
  const startTime = slotToUnixTime(firstSlot, eras);
  const slotLenSec = era.parameters.slotLength.milliseconds / 1000;
  const endTime = startTime + epochLength * slotLenSec;
  return { startTime, endTime, epochLength, firstSlot };
}

export function epochProgressPercent(
  currentSlot: number,
  bounds: { firstSlot: number; epochLength: number }
): number {
  const into = currentSlot - bounds.firstSlot;
  if (into <= 0) return 0;
  if (into >= bounds.epochLength) return 100;
  return Math.round((into / bounds.epochLength) * 100);
}
