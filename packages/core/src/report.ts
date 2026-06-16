import { computeBalances } from "./balances.js";
import { formatMoney } from "./money.js";
import { settlementPlan } from "./settle.js";
import type { Group } from "./types.js";

/**
 * A self-contained, print-ready HTML summary of a group. Both platforms feed
 * this to their PDF path: the web opens it in a window and calls print(); mobile
 * hands it to expo-print. Generated as a string here so the document is
 * identical everywhere and needs no PDF dependency in core.
 */
export function toSummaryHtml(group: Group, generatedAt?: string): string {
  const name = (id: string) =>
    escapeHtml(group.members.find((m) => m.id === id)?.name ?? "?");
  const money = (cents: number) => escapeHtml(formatMoney(cents, group.currency));

  const balances = computeBalances(group);
  const plan = settlementPlan(group);
  const stamp = generatedAt ?? new Date().toISOString().slice(0, 10);

  const balanceRows = balances
    .map(
      (b) =>
        `<tr><td>${name(b.memberId)}</td><td class="num ${b.net >= 0 ? "pos" : "neg"}">${money(b.net)}</td></tr>`,
    )
    .join("");

  const settleRows = plan.length
    ? plan
        .map(
          (t) =>
            `<tr><td>${name(t.fromId)} &rarr; ${name(t.toId)}</td><td class="num">${money(t.amount)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" class="muted">All settled.</td></tr>`;

  const expenseRows =
    [...group.expenses]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map(
        (e) =>
          `<tr><td>${escapeHtml(e.date)}</td><td>${escapeHtml(e.description)}</td><td>${name(e.payerId)}</td><td class="num">${money(e.amount)}</td></tr>`,
      )
      .join("") || `<tr><td colspan="4" class="muted">No expenses.</td></tr>`;

  const paymentRows =
    [...group.payments]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map(
        (p) =>
          `<tr><td>${escapeHtml(p.date)}</td><td>${name(p.fromId)} &rarr; ${name(p.toId)}</td><td>${escapeHtml(p.note ?? "")}</td><td class="num">${money(p.amount)}</td></tr>`,
      )
      .join("") || `<tr><td colspan="4" class="muted">No payments.</td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(group.name)} — Splitplata</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; max-width: 720px; margin: 0 auto; padding: 32px 24px; }
  h1 { color: #2f6f4f; margin: 0 0 2px; }
  .meta { color: #888; margin: 0 0 24px; font-size: 13px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin: 28px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #eee; font-size: 14px; }
  th { color: #888; font-weight: 600; font-size: 12px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .pos { color: #2f8f5b; font-weight: 600; }
  .neg { color: #c44545; font-weight: 600; }
  .muted { color: #999; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${escapeHtml(group.name)}</h1>
  <p class="meta">${escapeHtml(group.currency)} · ${group.members.length} members · exported ${escapeHtml(stamp)}</p>

  <h2>Balances</h2>
  <table><tbody>${balanceRows}</tbody></table>

  <h2>Settle up</h2>
  <table><tbody>${settleRows}</tbody></table>

  <h2>Expenses</h2>
  <table>
    <thead><tr><th>Date</th><th>Description</th><th>Paid by</th><th class="num">Amount</th></tr></thead>
    <tbody>${expenseRows}</tbody>
  </table>

  <h2>Payments</h2>
  <table>
    <thead><tr><th>Date</th><th>From &rarr; To</th><th>Note</th><th class="num">Amount</th></tr></thead>
    <tbody>${paymentRows}</tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
