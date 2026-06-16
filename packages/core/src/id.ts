/**
 * Dependency-free, cross-platform id generator.
 *
 * We avoid `crypto.randomUUID` because it isn't reliably present on the React
 * Native (Hermes) runtime. Collision resistance here only needs to hold within
 * a single group's local data, so timestamp + randomness is plenty.
 */
export function createId(prefix = "id"): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}${rand}`;
}
