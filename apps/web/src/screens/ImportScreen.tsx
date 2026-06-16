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

  const exists = decoded.group ? groupStore.getGroup(decoded.group.id) : undefined;

  return (
    <main className="app">
      <Link className="link back" to="/">← Groups</Link>

      <div className="import-hero">
        <span className="import-hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" />
            <path d="M7 10l5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        </span>
        <h1>Import a group</h1>
        <p className="sub">Paste a share link or code to add it to this device.</p>
      </div>

      {!fromUrl && (
        <section className="card">
          <label className="formfield">
            <span className="formlabel">Share link or code</span>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="https://…/import?d=…   or the raw code"
              rows={3}
              autoFocus
            />
          </label>
        </section>
      )}

      {decoded.error && (
        <section className="card">
          <p className="error">{decoded.error}</p>
        </section>
      )}

      {decoded.group && (
        <section className="card preview-card">
          <div className="preview-head">
            <div>
              <p className="preview-kicker">You're importing</p>
              <div className="preview-name">{decoded.group.name}</div>
            </div>
            <span className="badge">{decoded.group.currency}</span>
          </div>

          {decoded.group.members.length > 0 && (
            <div className="chips">
              {decoded.group.members.map((m) => (
                <span key={m.id} className="chip">{m.name}</span>
              ))}
            </div>
          )}

          <div className="preview-stats">
            <span><strong>{decoded.group.members.length}</strong> members</span>
            <span><strong>{decoded.group.expenses.length}</strong> expenses</span>
            <span><strong>{decoded.group.payments.length}</strong> payments</span>
          </div>

          {exists && (
            <p className="note">
              You already have this group — importing overwrites it with the shared version.
            </p>
          )}

          <button className="block" onClick={onImport}>Import group</button>
        </section>
      )}

      {!source && !decoded.error && (
        <p className="empty">Nothing to import yet — paste a link or code above.</p>
      )}
    </main>
  );
}
