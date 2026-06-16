import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGroupStore } from "@splitplata/app";
import { groupStore } from "../store.js";
import { CURRENCIES } from "../currencies.js";

/** Home screen: the list of saved groups plus a create form. */
export function GroupsScreen() {
  const { groups, loaded } = useGroupStore(groupStore);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<string>("USD");
  const [members, setMembers] = useState("");

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const memberNames = members
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const group = groupStore.createGroup({ name, currency, memberNames });
    setName("");
    setMembers("");
    navigate(`/g/${group.id}`);
  };

  return (
    <main className="app">
      <header>
        <h1>Splitplata</h1>
        <p className="sub">Split expenses. No account needed.</p>
      </header>

      <section className="card">
        <h2>New group</h2>
        <form className="stack" onSubmit={onCreate}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name (e.g. Weekend Trip)"
            autoFocus
          />
          <label className="field">
            <span>Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <textarea
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            placeholder="Members — one per line or comma-separated&#10;Ann&#10;Bob&#10;Cara"
            rows={3}
          />
          <button type="submit" disabled={!name.trim()}>Create group</button>
        </form>
      </section>

      <section className="card">
        <h2>Your groups</h2>
        {!loaded ? (
          <p className="muted">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="muted">No groups yet. Create one above to get started.</p>
        ) : (
          <ul className="list">
            {groups.map((g) => (
              <li key={g.id}>
                <Link className="grow link" to={`/g/${g.id}`}>
                  <span>{g.name}</span>
                  <span className="muted">
                    {g.members.length} {g.members.length === 1 ? "member" : "members"} · {g.currency}
                  </span>
                </Link>
                <button
                  className="ghost danger"
                  aria-label={`Delete ${g.name}`}
                  onClick={() => {
                    if (confirm(`Delete "${g.name}"? This can't be undone.`)) {
                      groupStore.deleteGroup(g.id);
                    }
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
