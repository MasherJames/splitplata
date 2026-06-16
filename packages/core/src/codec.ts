import type { Group } from "./types.js";
import { fromBase64Url, toBase64Url } from "./base64.js";

/**
 * The "sync without a backend" story: a whole group snapshot encodes to a
 * URL-safe string you can drop in a share link. Decoding reconstructs the
 * group. Versioned so we can evolve the wire format without breaking old links.
 */

export const SHARE_VERSION = 1;

/** Encode a group into a compact, URL-safe, versioned token. */
export function encodeGroup(group: Group): string {
  const payload = JSON.stringify(group);
  return `${SHARE_VERSION}.${toBase64Url(payload)}`;
}

/** Decode a token produced by {@link encodeGroup}. Throws on malformed input. */
export function decodeGroup(token: string): Group {
  const dot = token.indexOf(".");
  if (dot === -1) throw new Error("Malformed share token: missing version.");
  const version = Number(token.slice(0, dot));
  if (version !== SHARE_VERSION) {
    throw new Error(`Unsupported share version ${version} (expected ${SHARE_VERSION}).`);
  }
  const json = fromBase64Url(token.slice(dot + 1));
  const parsed = JSON.parse(json) as Group;
  if (!parsed || typeof parsed.id !== "string" || !Array.isArray(parsed.members)) {
    throw new Error("Decoded share token is not a valid group.");
  }
  return parsed;
}
