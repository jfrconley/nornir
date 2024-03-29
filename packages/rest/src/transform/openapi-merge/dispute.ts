import { Dispute, DisputePrefix, SingleMergeInput } from "./data";

export function getDispute(input: SingleMergeInput): Dispute | undefined {
  if ("disputePrefix" in input) {
    if (input.disputePrefix !== undefined) {
      return {
        prefix: input.disputePrefix,
      };
    }

    return undefined;
  } else if ("dispute" in input) {
    return input.dispute;
  }

  return undefined;
}

export type DisputeStatus = "disputed" | "undisputed";

function isDisputePrefix(dispute: Dispute): dispute is DisputePrefix {
  return "prefix" in dispute;
}

export function applyDispute(dispute: Dispute | undefined, input: string, status: DisputeStatus): string {
  if (dispute === undefined) {
    return input;
  }

  if ((status === "disputed" && !dispute.mergeDispute) || dispute.alwaysApply) {
    return isDisputePrefix(dispute) ? `${dispute.prefix}${input}` : `${input}${dispute.suffix}`;
  }

  return input;
}
