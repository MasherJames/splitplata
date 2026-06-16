import { parseAmount } from "./money.js";
import { computeShares } from "./split.js";
import type { Expense, SplitMode, SplitWeight } from "./types.js";

/** An expense ready to hand to `addExpense` — everything but the generated id/timestamp. */
export type ExpenseDraft = Omit<Expense, "id" | "createdAt">;

/**
 * Raw, stringly-typed values straight off a form input. `weights` is keyed by
 * memberId and its meaning depends on `splitMode`:
 *   exact   → a decimal money string ("12.50")
 *   percent → a percentage string ("25")
 *   shares  → a share-count string ("2")
 * Ignored entirely when the mode is `equal`.
 */
export interface ExpenseFormValues {
  description: string;
  amount: string;
  payerId: string;
  participantIds: string[];
  splitMode: SplitMode;
  weights: Record<string, string>;
  /** ISO calendar day, e.g. "2026-06-16". */
  date: string;
  category?: string;
}

export type BuildResult =
  | { ok: true; draft: ExpenseDraft }
  | { ok: false; error: string };

/** Default empty form: everyone participates, equal split, payer/date supplied by caller. */
export function emptyExpenseForm(
  memberIds: string[],
  payerId: string,
  date: string,
): ExpenseFormValues {
  return {
    description: "",
    amount: "",
    payerId,
    participantIds: [...memberIds],
    splitMode: "equal",
    weights: {},
    date,
    category: "",
  };
}

/**
 * Validate raw form values and assemble a persistable {@link ExpenseDraft}.
 * Returns a typed error message (never throws) so both UIs can surface it
 * inline. The final check runs the real splitter, so anything `computeShares`
 * would reject — e.g. exact amounts that don't sum to the total — is caught here.
 */
export function buildExpenseDraft(values: ExpenseFormValues): BuildResult {
  const description = values.description.trim() || "Expense";

  if (!values.payerId) return err("Choose who paid.");
  if (values.participantIds.length === 0) {
    return err("Select at least one participant.");
  }

  let amount: number;
  try {
    amount = parseAmount(values.amount);
  } catch {
    return err("Enter a valid amount.");
  }
  if (amount <= 0) return err("Amount must be greater than zero.");

  let weights: SplitWeight[] | undefined;
  if (values.splitMode !== "equal") {
    const built: SplitWeight[] = [];
    for (const id of values.participantIds) {
      const raw = (values.weights[id] ?? "").trim();
      if (raw === "") return err("Fill in a split value for every participant.");

      let value: number;
      if (values.splitMode === "exact") {
        try {
          value = parseAmount(raw);
        } catch {
          return err("Split amounts must be valid numbers.");
        }
      } else {
        const num = Number(raw);
        if (!Number.isFinite(num) || num < 0) {
          return err(
            values.splitMode === "percent"
              ? "Percentages must be valid numbers."
              : "Shares must be valid numbers.",
          );
        }
        // percent → basis points so the proportional splitter stays integer-only.
        value = values.splitMode === "percent" ? Math.round(num * 100) : num;
      }
      built.push({ memberId: id, value });
    }

    if (values.splitMode === "percent") {
      const sum = built.reduce((a, w) => a + w.value, 0);
      if (sum !== 10000) return err("Percentages must add up to 100%.");
    }
    if (values.splitMode === "shares") {
      const sum = built.reduce((a, w) => a + w.value, 0);
      if (sum <= 0) return err("Shares must add up to more than zero.");
    }
    weights = built;
  }

  const draft: ExpenseDraft = {
    description,
    amount,
    payerId: values.payerId,
    participantIds: values.participantIds,
    splitMode: values.splitMode,
    weights,
    category: values.category?.trim() || undefined,
    date: values.date,
  };

  try {
    computeShares(draft);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Invalid split.");
  }
  return { ok: true, draft };
}

function err(error: string): BuildResult {
  return { ok: false, error };
}
