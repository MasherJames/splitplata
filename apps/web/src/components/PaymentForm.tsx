import { useState } from "react";
import { buildPaymentDraft, type Group } from "@splitplata/core";
import { groupStore } from "../store.js";

const todayISO = () => new Date().toISOString().slice(0, 10);

export interface PaymentPrefill {
  fromId: string;
  toId: string;
  amount: string;
}

/**
 * Record a settlement payment between two members. Seeded from `initial` when a
 * settlement suggestion's "Record" button is used; remount (via key) resets it.
 */
export function PaymentForm({ group, initial }: { group: Group; initial?: PaymentPrefill }) {
  const [fromId, setFromId] = useState(initial?.fromId ?? group.members[0]?.id ?? "");
  const [toId, setToId] = useState(initial?.toId ?? group.members[1]?.id ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildPaymentDraft({ fromId, toId, amount, date, note });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    groupStore.addPayment(group.id, result.draft);
    setAmount("");
    setNote("");
    setError(null);
  };

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="row">
        <select className="grow" value={fromId} onChange={(e) => setFromId(e.target.value)}>
          {group.members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <span className="arrow">paid →</span>
        <select className="grow" value={toId} onChange={(e) => setToId(e.target.value)}>
          {group.members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div className="row">
        <input
          className="grow"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          inputMode="decimal"
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" />

      {error && <p className="error">{error}</p>}
      <button type="submit">Save payment</button>
    </form>
  );
}
