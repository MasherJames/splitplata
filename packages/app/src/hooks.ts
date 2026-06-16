import { useEffect, useSyncExternalStore } from "react";
import type { Group } from "@splitplata/core";
import type { GroupStore, GroupStoreState } from "./store.js";

/**
 * Subscribe a component to the whole group store, triggering a one-time load on
 * first mount. Returns the live `{ groups, loaded }` snapshot.
 */
export function useGroupStore(store: GroupStore): GroupStoreState {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  useEffect(() => {
    void store.load();
  }, [store]);
  return state;
}

/** Subscribe to a single group by id (re-renders only the detail screen needs). */
export function useGroup(store: GroupStore, id: string | undefined): Group | undefined {
  const { groups } = useGroupStore(store);
  return id ? groups.find((g) => g.id === id) : undefined;
}
