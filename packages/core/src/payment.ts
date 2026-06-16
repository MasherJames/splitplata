import { parseAmount } from "./money.js";
import type { Payment } from "./types.js";

/** A payment ready for `addPayment` — everything but the generated id. */
export type PaymentDraft = Omit<Payment, "id">;

/** Raw form values for recording a settlement payment. */
export interface PaymentFormValues {
  fromId: string;
  toId: string;
  amount: string;
  /** ISO calendar day, e.g. "2026-06-16". */
  date: string;
  note?: string;
}

export type PaymentBuildResult =
  | { ok: true; draft: PaymentDraft }
  | { ok: false; error: string };

export function emptyPaymentForm(
  fromId: string,
  toId: string,
  date: string,
): PaymentFormValues {
  return { fromId, toId, amount: "", date, note: "" };
}

/**
 * Validate raw form values and assemble a persistable {@link PaymentDraft}.
 * Never throws — returns a typed error message both UIs can show inline.
 */
export function buildPaymentDraft(values: PaymentFormValues): PaymentBuildResult {
  if (!values.fromId) return err("Choose who is paying.");
  if (!values.toId) return err("Choose who is being paid.");
  if (values.fromId === values.toId) return err("Payer and payee must be different.");

  let amount: number;
  try {
    amount = parseAmount(values.amount);
  } catch {
    return err("Enter a valid amount.");
  }
  if (amount <= 0) return err("Amount must be greater than zero.");

  return {
    ok: true,
    draft: {
      fromId: values.fromId,
      toId: values.toId,
      amount,
      date: values.date,
      note: values.note?.trim() || undefined,
    },
  };
}

function err(error: string): PaymentBuildResult {
  return { ok: false, error };
}
