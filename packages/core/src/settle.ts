import type { Balance, Group, Transfer } from "./types.js";
import { computeBalances } from "./balances.js";

/**
 * Reduce a set of net balances to a small set of transfers that settles
 * everyone. This is the feature most ledgers get wrong by showing the raw
 * web of who-paid-what; here we collapse it to "pay X to Y".
 *
 * Algorithm: greedy largest-debtor-to-largest-creditor matching. At each step
 * the biggest debtor pays the biggest creditor the smaller of the two
 * magnitudes, zeroing at least one party. This is not provably the global
 * minimum (that problem is NP-hard), but it is optimal for the common cases and
 * near-optimal otherwise, while staying O(n log n) and fully deterministic.
 */
export function simplifyBalances(balances: Balance[]): Transfer[] {
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ id: b.memberId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ id: b.memberId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di]!;
    const creditor = creditors[ci]!;
    const pay = Math.min(debtor.amount, creditor.amount);

    if (pay > 0) {
      transfers.push({ fromId: debtor.id, toId: creditor.id, amount: pay });
    }
    debtor.amount -= pay;
    creditor.amount -= pay;

    if (debtor.amount === 0) di++;
    if (creditor.amount === 0) ci++;
  }

  return transfers;
}

/** Compute and simplify a group's outstanding debts in one call. */
export function settlementPlan(group: Group): Transfer[] {
  return simplifyBalances(computeBalances(group));
}
