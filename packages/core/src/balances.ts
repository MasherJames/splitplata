import type { Balance, Group } from "./types.js";
import { computeShares } from "./split.js";

/**
 * Net balance for every member of a group, in minor units.
 *
 *   net > 0  → the group owes this member (they are a creditor)
 *   net < 0  → this member owes the group (they are a debtor)
 *
 * Each expense credits its payer the full amount and debits each participant
 * their computed share. Each settlement payment moves value from payer to payee.
 * Because shares always sum to the expense total, the grand total of all nets is
 * exactly zero.
 */
export function computeBalances(group: Group): Balance[] {
  const net = new Map<string, number>();
  for (const m of group.members) net.set(m.id, 0);

  const add = (memberId: string, delta: number) => {
    net.set(memberId, (net.get(memberId) ?? 0) + delta);
  };

  for (const expense of group.expenses) {
    add(expense.payerId, expense.amount);
    const shares = computeShares(expense);
    for (const [memberId, owed] of Object.entries(shares)) {
      add(memberId, -owed);
    }
  }

  for (const payment of group.payments) {
    // Paying down a debt reduces what the payer owes and what the payee is owed.
    add(payment.fromId, payment.amount);
    add(payment.toId, -payment.amount);
  }

  return group.members.map((m) => ({ memberId: m.id, net: net.get(m.id) ?? 0 }));
}

/** Convenience: a quick lookup map of memberId -> net balance. */
export function balanceMap(group: Group): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of computeBalances(group)) out[b.memberId] = b.net;
  return out;
}
