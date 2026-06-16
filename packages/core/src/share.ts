import { decodeGroup, encodeGroup } from "./codec.js";
import type { Group } from "./types.js";

/**
 * Turning a group into a shareable link and back. The heavy lifting (versioned,
 * URL-safe encoding) lives in `codec.ts`; this layer is about getting the token
 * into and out of the URLs/text a user actually pastes around.
 */

export const SHARE_QUERY_KEY = "d";

/** Encode a group as a share token. */
export function encodeShareToken(group: Group): string {
  return encodeGroup(group);
}

/** The import path for a share link, e.g. "/import?d=1.xxxx". Prefix with an origin. */
export function buildSharePath(group: Group): string {
  return `/import?${SHARE_QUERY_KEY}=${encodeShareToken(group)}`;
}

/**
 * Pull a share token out of arbitrary user input — a full URL (`?d=`/`#d=`) or a
 * bare token pasted on its own. Returns null when nothing usable is present.
 */
export function extractShareToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const qMark = trimmed.indexOf("?");
  const hash = trimmed.indexOf("#");
  const query =
    qMark !== -1 ? trimmed.slice(qMark + 1) : hash !== -1 ? trimmed.slice(hash + 1) : "";

  if (query) {
    for (const pair of query.split("&")) {
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const key = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (key === SHARE_QUERY_KEY && value) {
        const clean = value.split("#")[0] ?? "";
        return decodeURIComponent(clean);
      }
    }
  }

  // A bare token looks like "<version>.<base64url>".
  if (/^\d+\.[A-Za-z0-9\-_]+$/.test(trimmed)) return trimmed;
  return null;
}

/** Decode arbitrary share input (URL or bare token) into a Group. Throws if invalid. */
export function decodeShareInput(input: string): Group {
  const token = extractShareToken(input);
  if (!token) throw new Error("No share code found in the input.");
  return decodeGroup(token);
}
