import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useGroup } from "@splitplata/app";
import {
  computeBalances,
  formatAmount,
  formatMoney,
  settlementPlan,
  type Group,
  type Transfer,
} from "@splitplata/core";
import { groupStore } from "../store.js";
import { ExpenseForm } from "../components/ExpenseForm.js";
import { PaymentForm, type PaymentPrefill } from "../components/PaymentForm.js";

/** Group detail: rename the group and manage its members. */
export function GroupScreen() {
  const { id } = useParams();
  const group = useGroup(groupStore, id);
  const navigate = useNavigate();
  const [newMember, setNewMember] = useState("");
  // A "Record" click on a settlement suggestion seeds the payment form;
  // the bumped key remounts it so the new values take effect.
  const [prefill, setPrefill] = useState<PaymentPrefill | undefined>(undefined);
  const [prefillKey, setPrefillKey] = useState(0);

  const onRecord = (t: Transfer) => {
    setPrefill({ fromId: t.fromId, toId: t.toId, amount: formatAmount(t.amount) });
    setPrefillKey((k) => k + 1);
  };

  if (!group) {
    return (
      <main className="app">
        <p className="muted">Group not found.</p>
        <Link className="link" to="/">← Back to groups</Link>
      </main>
    );
  }

  const onAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.trim()) return;
    groupStore.addMember(group.id, newMember);
    setNewMember("");
  };

  return (
    <main className="app">
      <header>
        <Link className="link back" to="/">← Groups</Link>
        <input
          className="title-input"
          value={group.name}
          onChange={(e) => groupStore.renameGroup(group.id, e.target.value)}
          aria-label="Group name"
        />
        <p className="sub">{group.currency}</p>
      </header>

      <section className="card">
        <h2>Members ({group.members.length})</h2>
        {group.members.length === 0 ? (
          <p className="muted">No members yet. Add the first one below.</p>
        ) : (
          <ul className="list">
            {group.members.map((m) => (
              <li key={m.id}>
                <input
                  className="grow inline-input"
                  value={m.name}
                  onChange={(e) => groupStore.renameMember(group.id, m.id, e.target.value)}
                  aria-label={`Rename ${m.name}`}
                />
                <button
                  className="ghost danger"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => groupStore.removeMember(group.id, m.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="row" onSubmit={onAddMember}>
          <input
            className="grow"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            placeholder="Add a member"
          />
          <button type="submit" disabled={!newMember.trim()}>Add</button>
        </form>
      </section>

      {group.members.length > 0 && (
        <section className="card">
          <h2>Add expense</h2>
          <ExpenseForm group={group} />
        </section>
      )}

      <BalancesAndSettlement group={group} onRecord={onRecord} />

      {group.members.length > 1 && (
        <section className="card">
          <h2>Record a payment</h2>
          <PaymentForm key={prefillKey} group={group} initial={prefill} />
        </section>
      )}

      {group.payments.length > 0 && (
        <section className="card">
          <h2>Payments ({group.payments.length})</h2>
          <ul className="list">
            {[...group.payments]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((p) => {
                const nameOf = (mid: string) =>
                  group.members.find((m) => m.id === mid)?.name ?? "?";
                return (
                  <li key={p.id}>
                    <span className="grow">
                      {nameOf(p.fromId)} → {nameOf(p.toId)}
                      <br />
                      <span className="muted">
                        {p.date}
                        {p.note ? ` · ${p.note}` : ""}
                      </span>
                    </span>
                    <span>{formatMoney(p.amount, group.currency)}</span>
                    <button
                      className="ghost danger"
                      aria-label="Delete payment"
                      onClick={() => groupStore.removePayment(group.id, p.id)}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Expenses ({group.expenses.length})</h2>
        {group.expenses.length === 0 ? (
          <p className="muted">No expenses yet.</p>
        ) : (
          <ul className="list">
            {[...group.expenses]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((e) => {
                const payer = group.members.find((m) => m.id === e.payerId)?.name ?? "?";
                return (
                  <li key={e.id}>
                    <span className="grow">
                      {e.description}
                      <br />
                      <span className="muted">
                        {payer} paid · {e.date}
                        {e.category ? ` · ${e.category}` : ""}
                      </span>
                    </span>
                    <span>{formatMoney(e.amount, group.currency)}</span>
                    <button
                      className="ghost danger"
                      aria-label={`Delete ${e.description}`}
                      onClick={() => groupStore.removeExpense(group.id, e.id)}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Danger zone</h2>
        <button
          className="ghost danger"
          onClick={() => {
            if (confirm(`Delete "${group.name}"? This can't be undone.`)) {
              groupStore.deleteGroup(group.id);
              navigate("/");
            }
          }}
        >
          Delete group
        </button>
      </section>
    </main>
  );
}

/** Live net balances and the simplified "who pays whom" plan. */
function BalancesAndSettlement({
  group,
  onRecord,
}: {
  group: Group;
  onRecord: (t: Transfer) => void;
}) {
  const balances = useMemo(() => computeBalances(group), [group]);
  const plan = useMemo(() => settlementPlan(group), [group]);
  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.name ?? id;

  // Nothing to show until there's activity to balance.
  if (group.expenses.length === 0 && group.payments.length === 0) return null;

  return (
    <>
      <section className="card">
        <h2>Balances</h2>
        <ul className="list">
          {balances.map((b) => (
            <li key={b.memberId} className={b.net >= 0 ? "pos" : "neg"}>
              <span>{nameOf(b.memberId)}</span>
              <span>{formatMoney(b.net, group.currency)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Settle up</h2>
        {plan.length === 0 ? (
          <p className="muted">All settled. 🎉</p>
        ) : (
          <ul className="list">
            {plan.map((t, i) => (
              <li key={i}>
                <span className="grow">{nameOf(t.fromId)} → {nameOf(t.toId)}</span>
                <span>{formatMoney(t.amount, group.currency)}</span>
                <button className="ghost record" onClick={() => onRecord(t)}>
                  Record
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
