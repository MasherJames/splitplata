import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { getViewer, setViewer } from "../lib/identity.js";
import { BalanceHero } from "../components/BalanceHero.js";
import { ExpenseForm } from "../components/ExpenseForm.js";
import { PaymentForm, type PaymentPrefill } from "../components/PaymentForm.js";
import { ShareExport } from "../components/ShareExport.js";

type Tab = "summary" | "expenses" | "settle" | "manage";
const TABS: { id: Tab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "expenses", label: "Expenses" },
  { id: "settle", label: "Settle" },
  { id: "manage", label: "Manage" },
];

export function GroupScreen() {
  const { id } = useParams();
  const group = useGroup(groupStore, id);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab");
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : "summary";
  const setTab = (t: Tab) =>
    setParams(
      (p) => {
        p.set("tab", t);
        return p;
      },
      { replace: true },
    );

  const [viewerId, setViewerId] = useState<string | null>(() => (id ? getViewer(id) : null));
  // A "Record" tap on a settlement suggestion seeds the payment form and jumps
  // to the Settle tab; the bumped key remounts the form with the new values.
  const [prefill, setPrefill] = useState<PaymentPrefill | undefined>(undefined);
  const [prefillKey, setPrefillKey] = useState(0);

  if (!group) {
    return (
      <main className="app">
        <p className="muted">Group not found.</p>
        <Link className="link back" to="/">← Back to groups</Link>
      </main>
    );
  }

  const onRecord = (t: Transfer) => {
    setPrefill({ fromId: t.fromId, toId: t.toId, amount: formatAmount(t.amount) });
    setPrefillKey((k) => k + 1);
    setTab("settle");
  };

  const chooseViewer = (memberId: string | null) => {
    setViewerId(memberId);
    if (id) setViewer(id, memberId);
  };

  return (
    <main className="app">
      <header className="group-header">
        <Link className="link back" to="/">← Groups</Link>
        <input
          className="title-input"
          value={group.name}
          onChange={(e) => groupStore.renameGroup(group.id, e.target.value)}
          aria-label="Group name"
        />
        <BalanceHero group={group} viewerId={viewerId} onChangeViewer={chooseViewer} />
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "summary" && <SummaryTab group={group} onRecord={onRecord} onAdd={() => setTab("expenses")} />}
      {tab === "expenses" && <ExpensesTab group={group} />}
      {tab === "settle" && <SettleTab group={group} prefill={prefill} prefillKey={prefillKey} />}
      {tab === "manage" && <ManageTab group={group} onDeleted={() => navigate("/")} />}
    </main>
  );
}

/* ------------------------------- Summary ------------------------------- */

function SummaryTab({
  group,
  onRecord,
  onAdd,
}: {
  group: Group;
  onRecord: (t: Transfer) => void;
  onAdd: () => void;
}) {
  const balances = useMemo(() => computeBalances(group), [group]);
  const plan = useMemo(() => settlementPlan(group), [group]);
  const nameOf = (mid: string) => group.members.find((m) => m.id === mid)?.name ?? mid;

  if (group.expenses.length === 0 && group.payments.length === 0) {
    return (
      <section className="card">
        <p className="empty">No activity yet.<br />Add your first expense to see balances.</p>
        <button onClick={onAdd}>Add an expense</button>
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <h2>Balances</h2>
        <ul className="list">
          {balances.map((b) => (
            <li key={b.memberId} className={b.net > 0 ? "pos" : b.net < 0 ? "neg" : ""}>
              <span>{nameOf(b.memberId)}</span>
              <span>
                {b.net > 0 ? "▲ " : b.net < 0 ? "▼ " : ""}
                {formatMoney(b.net, group.currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Settle up</h2>
        {plan.length === 0 ? (
          <p className="empty">All settled up. 🎉</p>
        ) : (
          <ul className="list">
            {plan.map((t, i) => (
              <li key={i}>
                <span className="grow">{nameOf(t.fromId)} → {nameOf(t.toId)}</span>
                <span className="amount">{formatMoney(t.amount, group.currency)}</span>
                <button className="ghost record" onClick={() => onRecord(t)}>Mark as paid</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/* ------------------------------- Expenses ------------------------------ */

function ExpensesTab({ group }: { group: Group }) {
  return (
    <>
      {group.members.length > 0 && (
        <section className="card">
          <h2>Add expense</h2>
          <ExpenseForm group={group} />
        </section>
      )}

      <section className="card">
        <h2>Expenses ({group.expenses.length})</h2>
        {group.expenses.length === 0 ? (
          <p className="empty">No expenses yet.</p>
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
                    <span className="amount">{formatMoney(e.amount, group.currency)}</span>
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
    </>
  );
}

/* -------------------------------- Settle ------------------------------- */

function SettleTab({
  group,
  prefill,
  prefillKey,
}: {
  group: Group;
  prefill?: PaymentPrefill;
  prefillKey: number;
}) {
  const nameOf = (mid: string) => group.members.find((m) => m.id === mid)?.name ?? "?";

  return (
    <>
      {group.members.length > 1 ? (
        <section className="card">
          <h2>Mark a payment as paid</h2>
          <p className="muted">
            Log money that has already changed hands in real life. This updates the
            balances — it doesn't move any money.
          </p>
          <PaymentForm key={prefillKey} group={group} initial={prefill} />
        </section>
      ) : (
        <section className="card">
          <p className="empty">Add at least two members to record payments.</p>
        </section>
      )}

      {group.payments.length > 0 && (
        <section className="card">
          <h2>Payments ({group.payments.length})</h2>
          <ul className="list">
            {[...group.payments]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((p) => (
                <li key={p.id}>
                  <span className="grow">
                    {nameOf(p.fromId)} → {nameOf(p.toId)}
                    <br />
                    <span className="muted">
                      {p.date}
                      {p.note ? ` · ${p.note}` : ""}
                    </span>
                  </span>
                  <span className="amount">{formatMoney(p.amount, group.currency)}</span>
                  <button
                    className="ghost danger"
                    aria-label="Delete payment"
                    onClick={() => groupStore.removePayment(group.id, p.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}
    </>
  );
}

/* -------------------------------- Manage ------------------------------- */

function ManageTab({ group, onDeleted }: { group: Group; onDeleted: () => void }) {
  const [newMember, setNewMember] = useState("");

  const onAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.trim()) return;
    groupStore.addMember(group.id, newMember);
    setNewMember("");
  };

  return (
    <>
      <section className="card">
        <h2>Members ({group.members.length})</h2>
        {group.members.length === 0 ? (
          <p className="empty">No members yet. Add the first one below.</p>
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

      <ShareExport group={group} />

      <section className="card">
        <h2>Danger zone</h2>
        <button
          className="ghost danger"
          onClick={() => {
            if (confirm(`Delete "${group.name}"? This can't be undone.`)) {
              groupStore.deleteGroup(group.id);
              onDeleted();
            }
          }}
        >
          Delete group
        </button>
      </section>
    </>
  );
}
