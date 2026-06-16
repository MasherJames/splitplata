import type { Expense, Group, Member, Payment } from "./types.js";
import { createId } from "./id.js";

/**
 * Pure, immutable builders for mutating a group. Every function returns a new
 * Group (never mutates its input) and bumps `updatedAt`, so they drop straight
 * into React/Redux-style state without surprises. Timestamps are injected by the
 * caller to keep these deterministic and testable.
 */

export interface NewGroupInput {
  name: string;
  currency?: string;
  memberNames?: string[];
  now?: string;
}

export function createGroup(input: NewGroupInput): Group {
  const now = input.now ?? new Date().toISOString();
  return {
    id: createId("grp"),
    name: input.name.trim(),
    currency: input.currency ?? "USD",
    members: (input.memberNames ?? []).map((name) => makeMember(name)),
    expenses: [],
    payments: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function makeMember(name: string): Member {
  return { id: createId("mbr"), name: name.trim() };
}

function touch(group: Group, now?: string): Group {
  return { ...group, updatedAt: now ?? new Date().toISOString() };
}

export function addMember(group: Group, name: string, now?: string): Group {
  return touch({ ...group, members: [...group.members, makeMember(name)] }, now);
}

export function removeMember(group: Group, memberId: string, now?: string): Group {
  return touch(
    { ...group, members: group.members.filter((m) => m.id !== memberId) },
    now,
  );
}

export function renameMember(
  group: Group,
  memberId: string,
  name: string,
  now?: string,
): Group {
  return touch(
    {
      ...group,
      members: group.members.map((m) =>
        m.id === memberId ? { ...m, name: name.trim() } : m,
      ),
    },
    now,
  );
}

export function renameGroup(group: Group, name: string, now?: string): Group {
  return touch({ ...group, name: name.trim() }, now);
}

export function addExpense(
  group: Group,
  expense: Omit<Expense, "id" | "createdAt">,
  now?: string,
): Group {
  const stamp = now ?? new Date().toISOString();
  const full: Expense = { ...expense, id: createId("exp"), createdAt: stamp };
  return touch({ ...group, expenses: [...group.expenses, full] }, stamp);
}

export function updateExpense(
  group: Group,
  expenseId: string,
  patch: Partial<Omit<Expense, "id" | "createdAt">>,
  now?: string,
): Group {
  return touch(
    {
      ...group,
      expenses: group.expenses.map((e) =>
        e.id === expenseId ? { ...e, ...patch } : e,
      ),
    },
    now,
  );
}

export function removeExpense(group: Group, expenseId: string, now?: string): Group {
  return touch(
    { ...group, expenses: group.expenses.filter((e) => e.id !== expenseId) },
    now,
  );
}

export function addPayment(
  group: Group,
  payment: Omit<Payment, "id">,
  now?: string,
): Group {
  const full: Payment = { ...payment, id: createId("pay") };
  return touch({ ...group, payments: [...group.payments, full] }, now);
}

export function removePayment(group: Group, paymentId: string, now?: string): Group {
  return touch(
    { ...group, payments: group.payments.filter((p) => p.id !== paymentId) },
    now,
  );
}
