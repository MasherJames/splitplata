import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { decodeShareInput, type Group } from "@splitplata/core";
import { groupStore } from "../store.js";

/**
 * Lands a shared group. Reached either from a share link (`/import?d=…`, decoded
 * automatically) or by pasting a link/code manually. Shows a preview before the
 * user commits the import to their device.
 */
export function ImportScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const fromUrl = params.get("d") ?? "";
  const [pasted, setPasted] = useState("");

  const source = pasted.trim() || fromUrl;
  const decoded = useMemo<{ group?: Group; error?: string }>(() => {
    if (!source) return {};
    try {
      return { group: decodeShareInput(source) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Couldn't read that link." };
    }
  }, [source]);

  const onImport = () => {
    if (!decoded.group) return;
    groupStore.importGroup(decoded.group);
    navigate(`/g/${decoded.group.id}`);
  };

  return (
    <main className="app">
      <header>
        <Link className="link back" to="/">← Groups</Link>
        <h1>Import a group</h1>
        <p className="sub">Open a shared link or paste a share code.</p>
      </header>

      {!fromUrl && (
        <section className="card">
          <h2>Paste a link or code</h2>
          <textarea
            className="grow"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="https://…/import?d=…  or the raw code"
            rows={3}
          />
        </section>
      )}

      {decoded.error && (
        <section className="card">
          <p className="error">{decoded.error}</p>
        </section>
      )}

      {decoded.group && (
        <section className="card">
          <h2>Preview</h2>
          <div className="list">
            <div className="row between">
              <strong>{decoded.group.name}</strong>
              <span className="muted">{decoded.group.currency}</span>
            </div>
            <p className="muted">
              {decoded.group.members.length} members · {decoded.group.expenses.length} expenses ·{" "}
              {decoded.group.payments.length} payments
            </p>
          </div>
          {groupStore.getGroup(decoded.group.id) && (
            <p className="muted">
              You already have this group — importing will overwrite it with the shared version.
            </p>
          )}
          <button onClick={onImport}>Import group</button>
        </section>
      )}

      {!source && (
        <section className="card">
          <p className="muted">Nothing to import yet.</p>
        </section>
      )}
    </main>
  );
}
