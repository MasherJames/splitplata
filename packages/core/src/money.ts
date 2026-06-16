/**
 * Formatting helpers for the UI edge. Core stores integer minor units; these
 * convert to/from the human decimal representation.
 *
 * Assumes a 2-decimal currency (the overwhelming common case). For zero-decimal
 * currencies like JPY a future `minorUnitDigits` lookup would slot in here.
 */

const MINOR_PER_MAJOR = 100;

/** "12.34" or "1234" (cents) -> 1234. Throws on non-numeric input. */
export function parseAmount(input: string): number {
  const trimmed = input.trim().replace(/,/g, "");
  if (!/^-?\d*(\.\d{0,2})?$/.test(trimmed) || trimmed === "" || trimmed === "-") {
    throw new Error(`Invalid amount: "${input}"`);
  }
  const value = Math.round(parseFloat(trimmed) * MINOR_PER_MAJOR);
  return Object.is(value, -0) ? 0 : value;
}

/** 1234 -> "12.34". */
export function formatAmount(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const major = Math.floor(abs / MINOR_PER_MAJOR);
  const minor = abs % MINOR_PER_MAJOR;
  return `${sign}${major}.${minor.toString().padStart(2, "0")}`;
}

/** 1234, "USD" -> "$12.34" when Intl is available, else "USD 12.34". */
export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(cents / MINOR_PER_MAJOR);
  } catch {
    return `${currency} ${formatAmount(cents)}`;
  }
}
