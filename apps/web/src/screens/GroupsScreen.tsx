import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGroupStore } from "@splitplata/app";
import { groupStore } from "../store.js";
import { CURRENCIES, DEFAULT_CURRENCY } from "../currencies.js";
import { Logo } from "../components/Logo.js";

/**
 * Parse the comma-separated members field: trim each name, drop blanks, and
 * collapse case-insensitive duplicates (reporting which were dropped) so two
 * "Ann"s can't quietly become two separate members.
 */
function parseMemberNames(input: string): { names: string[]; duplicates: string[] } {
  const seen = new Set<string>();
  const names: string[] = [];
  const duplicates: string[] = [];
  for (const part of input.split(",")) {
    const name = part.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) duplicates.push(name);
    else {
      seen.add(key);
      names.push(name);
    }
  }
  return { names, duplicates };
}

/** Home screen: the list of saved groups plus a create form. */
export function GroupsScreen() {
  const { groups, loaded } = useGroupStore(groupStore);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [members, setMembers] = useState("");

  const parsed = useMemo(() => parseMemberNames(members), [members]);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const group = groupStore.createGroup({ name, currency, memberNames: parsed.names });
    setName("");
    setMembers("");
    navigate(`/g/${group.id}`);
  };

  return (
    <main className="app">
      <header>
        <Logo />
        <p className="sub">Split expenses. No account needed.</p>
        <Link className="link import-link" to="/import">Import a shared group →</Link>
      </header>

      <section className="card">
        <h2>New group</h2>
        <form className="stack" onSubmit={onCreate}>
          <label className="formfield">
            <span className="formlabel">Group name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend Trip"
              autoFocus
            />
          </label>
          <label className="formfield">
            <span className="formlabel">Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="formfield">
            <span className="formlabel">Members</span>
            <textarea
              className="oneline"
              value={members}
              onChange={(e) => setMembers(e.target.value)}
              placeholder="Names, separated by commas"
              rows={1}
            />
            {parsed.duplicates.length > 0 ? (
              <span className="error">
                Duplicate {parsed.duplicates.length === 1 ? "name" : "names"} ignored:{" "}
                {parsed.duplicates.join(", ")}
              </span>
            ) : parsed.names.length > 0 ? (
              <span className="muted">
                {parsed.names.length} {parsed.names.length === 1 ? "member" : "members"}:{" "}
                {parsed.names.join(", ")}
              </span>
            ) : null}
          </label>
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
