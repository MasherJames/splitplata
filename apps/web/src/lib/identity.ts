/**
 * "Which member am I?" — a device-local preference, one per group. It drives the
 * balance hero ("You are owed €X"). Deliberately NOT part of the Group model:
 * it's personal to this device and must never travel inside a share link.
 */
const KEY = "splitplata:viewer";

type ViewerMap = Record<string, string>;

function read(): ViewerMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ViewerMap) : {};
  } catch {
    return {};
  }
}

export function getViewer(groupId: string): string | null {
  return read()[groupId] ?? null;
}

export function setViewer(groupId: string, memberId: string | null): void {
  try {
    const map = read();
    if (memberId) map[groupId] = memberId;
    else delete map[groupId];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — selection just won't persist */
  }
}
