import { createGroupStore, type KeyValueStore } from "@splitplata/app";

/**
 * Web persistence adapter: the browser's localStorage. It's synchronous, but the
 * store's contract accepts sync or async, so it drops straight in. Guarded so a
 * private-mode browser that throws on access degrades to in-memory state.
 */
const localStorageAdapter: KeyValueStore = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable — keep working from memory */
    }
  },
};

/** App-wide singleton store. Import this everywhere; never create a second one. */
export const groupStore = createGroupStore(localStorageAdapter);
