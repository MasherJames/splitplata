/**
 * Domain model for Splitplata.
 *
 * Money convention: every monetary amount is an **integer in the currency's
 * minor unit** (e.g. cents for USD). This keeps all arithmetic exact — no
 * floating-point drift — and makes "the shares must sum to the total" a
 * checkable invariant. Format to a decimal string only at the UI edge.
 */

export type Cents = number;

export interface Member {
  id: string;
  name: string;
}

/**
 * How an expense is divided among its participants.
 * - `equal`   — split evenly; remainder pennies handed to the first participants.
 * - `exact`   — each participant owes an explicit amount; weights must sum to the total.
 * - `percent` — each participant owes a percentage; weights are basis points (sum 10000).
 * - `shares`  — each participant owes a proportional number of shares (e.g. 2:1:1).
 */
export type SplitMode = "equal" | "exact" | "percent" | "shares";

/**
 * A per-participant weight whose meaning depends on the expense's SplitMode.
 * Ignored entirely for `equal` splits.
 */
export interface SplitWeight {
  memberId: string;
  /** exact: cents · percent: basis points · shares: share count. */
  value: number;
}

export interface Expense {
  id: string;
  description: string;
  /** Total paid, in minor units. */
  amount: Cents;
  /** Member who fronted the money. */
  payerId: string;
  /** Members the cost is divided among. */
  participantIds: string[];
  splitMode: SplitMode;
  /** Required for every mode except `equal`. */
  weights?: SplitWeight[];
  category?: string;
  /** ISO-8601 date (calendar day the expense occurred). */
  date: string;
  /** ISO-8601 timestamp of record creation. */
  createdAt: string;
}

/** A real-world transfer that settles debt (not a shared cost). */
export interface Payment {
  id: string;
  fromId: string;
  toId: string;
  amount: Cents;
  date: string;
  note?: string;
}

export interface Group {
  /** Stable id; doubles as the share identity primitive. */
  id: string;
  name: string;
  /** ISO-4217 code, e.g. "USD". Single base currency per group. */
  currency: string;
  members: Member[];
  expenses: Expense[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}

/** Net position of one member: positive = owed money, negative = owes money. */
export interface Balance {
  memberId: string;
  net: Cents;
}

/** A single suggested transfer in a simplified settlement plan. */
export interface Transfer {
  fromId: string;
  toId: string;
  amount: Cents;
}
