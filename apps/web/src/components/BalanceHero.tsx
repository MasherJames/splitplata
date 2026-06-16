import { useMemo } from "react";
import { balanceMap, formatMoney, type Group } from "@splitplata/core";

/**
 * The "lead with your balance" hero. When the viewer has chosen who they are it
 * shows their personal net ("You are owed / You owe"); otherwise it falls back
 * to a neutral group total and nudges them to pick. Colour is always backed by a
 * sign and a ▲/▼ glyph for colourblind safety.
 */
export function BalanceHero({
  group,
  viewerId,
  onChangeViewer,
}: {
  group: Group;
  viewerId: string | null;
  onChangeViewer: (memberId: string | null) => void;
}) {
  const balances = useMemo(() => balanceMap(group), [group]);
  const totalSpent = useMemo(
    () => group.expenses.reduce((sum, e) => sum + e.amount, 0),
    [group.expenses],
  );

  const net = viewerId ? balances[viewerId] ?? 0 : null;
  const tone = net === null ? "flat" : net > 0 ? "owed" : net < 0 ? "owe" : "flat";

  const label =
    net === null
      ? "Total spent"
      : net > 0
        ? "You are owed"
        : net < 0
          ? "You owe"
          : "You're settled up";

  const amount =
    net === null ? formatMoney(totalSpent, group.currency) : formatMoney(Math.abs(net), group.currency);

  const glyph = net !== null && net > 0 ? "▲" : net !== null && net < 0 ? "▼" : "";

  return (
    <div className="hero">
      <p className="hero-label">{label}</p>
      <p className={`hero-amount ${tone}`}>
        {amount}
        {glyph && <span className="hero-arrow" aria-hidden="true">{glyph}</span>}
      </p>
      <div className="hero-foot">
        <label className="viewer">
          I'm
          <select
            value={viewerId ?? ""}
            onChange={(e) => onChangeViewer(e.target.value || null)}
            aria-label="Who are you in this group?"
          >
            <option value="">— pick —</option>
            {group.members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <span className="hero-stat">
          {group.members.length} members · {formatMoney(totalSpent, group.currency)} spent
        </span>
      </div>
    </div>
  );
}
