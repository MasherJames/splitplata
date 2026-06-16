import type { Expense, SplitWeight } from "./types.js";

/**
 * The slice of an expense the splitter actually needs. Accepting this rather
 * than a full `Expense` lets us compute shares for an unsaved draft (no id yet).
 */
export type ShareInput = Pick<
  Expense,
  "participantIds" | "amount" | "splitMode" | "weights"
>;

/**
 * Distribute an integer `total` into `count` parts as evenly as possible.
 * The remainder pennies are handed to the earliest parts, so the result always
 * sums back to `total` exactly. Negative totals are supported symmetrically.
 */
export function distributeEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const base = Math.floor(abs / count);
  const remainder = abs - base * count;
  return Array.from({ length: count }, (_, i) =>
    sign * (base + (i < remainder ? 1 : 0)),
  );
}

/**
 * Distribute an integer `total` across parts proportionally to `weights`.
 * Uses the largest-remainder method so the parts sum to `total` exactly even
 * when the proportions don't divide cleanly. Used for `percent` and `shares`.
 */
export function distributeProportionally(
  total: number,
  weights: number[],
): number[] {
  const weightSum = weights.reduce((a, w) => a + w, 0);
  if (weightSum <= 0) return distributeEvenly(total, weights.length);

  const exact = weights.map((w) => (total * w) / weightSum);
  const floored = exact.map((v) => Math.floor(v));
  let remainder = total - floored.reduce((a, v) => a + v, 0);

  // Hand out the leftover units to the parts with the largest fractional loss.
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floored];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    const entry = order[k]!;
    result[entry.i]! += 1;
    remainder -= 1;
  }
  return result;
}

export interface ShareError {
  code: "NO_PARTICIPANTS" | "MISSING_WEIGHTS" | "WEIGHT_MEMBER_MISMATCH" | "EXACT_SUM_MISMATCH";
  message: string;
}

/**
 * Compute how much each participant owes for a single expense, in minor units.
 * Returns a map of memberId -> owed cents. The returned amounts always sum to
 * `expense.amount`.
 *
 * Throws a typed error string for malformed expenses so callers can validate
 * before persisting.
 */
export function computeShares(expense: ShareInput): Record<string, number> {
  const { participantIds, amount, splitMode, weights } = expense;
  if (participantIds.length === 0) {
    throw shareError({ code: "NO_PARTICIPANTS", message: "Expense has no participants." });
  }

  if (splitMode === "equal") {
    return zip(participantIds, distributeEvenly(amount, participantIds.length));
  }

  const byMember = weightsByMember(weights);
  for (const id of participantIds) {
    if (!(id in byMember)) {
      throw shareError({
        code: "MISSING_WEIGHTS",
        message: `Missing ${splitMode} weight for participant ${id}.`,
      });
    }
  }

  const orderedWeights = participantIds.map((id) => byMember[id]!);

  if (splitMode === "exact") {
    const sum = orderedWeights.reduce((a, v) => a + v, 0);
    if (sum !== amount) {
      throw shareError({
        code: "EXACT_SUM_MISMATCH",
        message: `Exact splits sum to ${sum} but total is ${amount}.`,
      });
    }
    return zip(participantIds, orderedWeights);
  }

  // percent (basis points) and shares both reduce to proportional distribution.
  return zip(participantIds, distributeProportionally(amount, orderedWeights));
}

function weightsByMember(weights: SplitWeight[] | undefined): Record<string, number> {
  if (!weights || weights.length === 0) {
    throw shareError({ code: "MISSING_WEIGHTS", message: "Split weights are required." });
  }
  const map: Record<string, number> = {};
  for (const w of weights) map[w.memberId] = w.value;
  return map;
}

function zip(ids: string[], values: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  ids.forEach((id, i) => {
    out[id] = (out[id] ?? 0) + (values[i] ?? 0);
  });
  return out;
}

function shareError(err: ShareError): Error {
  const e = new Error(err.message);
  e.name = err.code;
  return e;
}
