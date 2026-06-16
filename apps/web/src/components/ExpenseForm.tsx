import { useMemo, useState } from "react";
import {
  buildExpenseDraft,
  emptyExpenseForm,
  type Group,
  type SplitMode,
} from "@splitplata/core";
import { groupStore } from "../store.js";

const SPLIT_MODES: { value: SplitMode; label: string }[] = [
  { value: "equal", label: "Equally" },
  { value: "exact", label: "Exact amounts" },
  { value: "percent", label: "Percentages" },
  { value: "shares", label: "Shares" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Full expense-entry form: payer, amount, participants, and any split mode. */
export function ExpenseForm({ group }: { group: Group }) {
  const memberIds = useMemo(() => group.members.map((m) => m.id), [group.members]);
  const [form, setForm] = useState(() =>
    emptyExpenseForm(memberIds, group.members[0]?.id ?? "", todayISO()),
  );
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.name ?? id;
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleParticipant = (id: string) =>
    setForm((f) => ({
      ...f,
      participantIds: f.participantIds.includes(id)
        ? f.participantIds.filter((p) => p !== id)
        : [...f.participantIds, id],
    }));

  const setWeight = (id: string, value: string) =>
    setForm((f) => ({ ...f, weights: { ...f.weights, [id]: value } }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = buildExpenseDraft(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    groupStore.addExpense(group.id, result.draft);
    setForm(emptyExpenseForm(memberIds, form.payerId, todayISO()));
    setError(null);
  };

  const unit =
    form.splitMode === "exact" ? group.currency : form.splitMode === "percent" ? "%" : "×";

  return (
    <form className="stack" onSubmit={onSubmit}>
      <input
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder="What was it for?"
      />

      <div className="row">
        <input
          className="grow"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          placeholder="0.00"
          inputMode="decimal"
        />
        <select value={form.payerId} onChange={(e) => set("payerId", e.target.value)}>
          {group.members.map((m) => (
            <option key={m.id} value={m.id}>{m.name} paid</option>
          ))}
        </select>
      </div>

      <label className="field">
        <span>Split</span>
        <select
          value={form.splitMode}
          onChange={(e) => set("splitMode", e.target.value as SplitMode)}
        >
          {SPLIT_MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>

      <div className="participants">
        {group.members.map((m) => {
          const on = form.participantIds.includes(m.id);
          return (
            <div key={m.id} className="participant-row">
              <label className="chk">
                <input type="checkbox" checked={on} onChange={() => toggleParticipant(m.id)} />
                <span>{m.name}</span>
              </label>
              {on && form.splitMode !== "equal" && (
                <span className="weight">
                  <input
                    value={form.weights[m.id] ?? ""}
                    onChange={(e) => setWeight(m.id, e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    aria-label={`${form.splitMode} for ${nameOf(m.id)}`}
                  />
                  <em>{unit}</em>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="row">
        <input
          className="grow"
          type="date"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
        />
        <input
          className="grow"
          value={form.category ?? ""}
          onChange={(e) => set("category", e.target.value)}
          placeholder="Category (optional)"
        />
      </div>

      {error && <p className="error">{error}</p>}
      <button type="submit">Add expense</button>
    </form>
  );
}
