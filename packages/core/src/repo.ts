import type { Group } from "./types.js";

/**
 * Serialization for the app's *entire* dataset — the list of groups a device
 * holds locally. Wrapped in a versioned envelope so the on-disk format can
 * evolve without bricking a user's saved data. Distinct from `codec.ts`, which
 * encodes a single group for sharing over a link.
 */

export const STORE_VERSION = 1;

interface StoreEnvelope {
  v: number;
  groups: Group[];
}

export function serializeGroups(groups: Group[]): string {
  const envelope: StoreEnvelope = { v: STORE_VERSION, groups };
  return JSON.stringify(envelope);
}

/**
 * Parse a previously serialized dataset. Unknown/corrupt/empty input yields an
 * empty list rather than throwing, so a bad localStorage value can never wedge
 * app startup.
 */
export function deserializeGroups(raw: string | null | undefined): Group[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<StoreEnvelope>;
    if (parsed?.v !== STORE_VERSION || !Array.isArray(parsed.groups)) return [];
    return parsed.groups as Group[];
  } catch {
    return [];
  }
}
