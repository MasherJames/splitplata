import { formatAmount } from "./money.js";
import type { Group } from "./types.js";

/**
 * Export a group's activity as CSV — one row per expense and per payment,
 * sorted by date. Amounts are plain decimals (no currency symbol) so the file
 * stays spreadsheet-friendly; the currency lives in its own column.
 */
export function toCSV(group: Group): string {
  const name = (id: string) => group.members.find((m) => m.id === id)?.name ?? "?";

  const header = [
    "Date",
    "Type",
    "Description",
    "Currency",
    "Amount",
    "Paid by",
    "Paid to",
    "Split",
    "Participants",
  ];

  const items: { date: string; row: string[] }[] = [];

  for (const e of group.expenses) {
    items.push({
      date: e.date,
      row: [
        e.date,
        "Expense",
        e.description,
        group.currency,
        formatAmount(e.amount),
        name(e.payerId),
        "",
        e.splitMode,
        e.participantIds.map(name).join("; "),
      ],
    });
  }

  for (const p of group.payments) {
    items.push({
      date: p.date,
      row: [
        p.date,
        "Payment",
        p.note ?? "",
        group.currency,
        formatAmount(p.amount),
        name(p.fromId),
        name(p.toId),
        "",
        "",
      ],
    });
  }

  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const lines = [header, ...items.map((i) => i.row)].map((cols) =>
    cols.map(escapeCsv).join(","),
  );
  // CRLF line endings + trailing newline: the most broadly compatible CSV shape.
  return lines.join("\r\n") + "\r\n";
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
