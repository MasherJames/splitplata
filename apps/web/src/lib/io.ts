/** Browser-side file output helpers used by the export buttons. */

/** Trigger a download of in-memory text as a file. */
export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Open an HTML document in a new window and invoke the print dialog — the
 * dependency-free path to "Save as PDF" via the browser's own print engine.
 */
export function printHtml(html: string) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow pop-ups to export a PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Give the new document a tick to lay out before printing.
  win.setTimeout(() => win.print(), 250);
}

/** Make a filename-safe slug from a group name. */
export function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "group";
}
