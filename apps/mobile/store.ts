import AsyncStorage from "@react-native-async-storage/async-storage";
import { createGroupStore, type KeyValueStore } from "@splitplata/app";

/**
 * Mobile persistence adapter: React Native's AsyncStorage. Its API is already
 * Promise-based, matching the store's contract directly.
 */
const asyncStorageAdapter: KeyValueStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};

/** App-wide singleton store shared across all screens. */
export const groupStore = createGroupStore(asyncStorageAdapter);
