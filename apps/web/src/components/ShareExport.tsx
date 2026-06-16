import { useState } from "react";
import { buildSharePath, toCSV, toSummaryHtml, type Group } from "@splitplata/core";
import { downloadText, printHtml, slugify } from "../lib/io.js";

/** Share-link generation plus CSV / PDF export for a group. */
export function ShareExport({ group }: { group: Group }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}${buildSharePath(group)}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  };

  const onCsv = () => downloadText(`${slugify(group.name)}.csv`, toCSV(group), "text/csv");
  const onPdf = () => printHtml(toSummaryHtml(group));

  return (
    <section className="card">
      <h2>Share &amp; export</h2>

      <p className="muted">Anyone with this link can import a snapshot of the group.</p>
      <div className="row">
        <input
          className="grow"
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Share link"
        />
        <button onClick={onCopy}>{copied ? "Copied!" : "Copy link"}</button>
      </div>

      <div className="row export-row">
        <button className="ghost record" onClick={onCsv}>Export CSV</button>
        <button className="ghost record" onClick={onPdf}>Export PDF</button>
      </div>
    </section>
  );
}
