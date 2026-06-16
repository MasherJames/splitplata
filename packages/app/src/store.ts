import {
  addExpense as addExpenseToGroup,
  addMember as addMemberToGroup,
  addPayment as addPaymentToGroup,
  createGroup as makeGroup,
  deserializeGroups,
  removeExpense as removeExpenseFromGroup,
  removeMember as removeMemberFromGroup,
  removePayment as removePaymentFromGroup,
  renameGroup as renameGroupCore,
  renameMember as renameMemberCore,
  serializeGroups,
  type Expense,
  type Group,
  type NewGroupInput,
  type Payment,
} from "@splitplata/core";

/**
 * Minimal key/value persistence contract. Satisfied by the browser's
 * `localStorage` (sync) and React Native's `AsyncStorage` (async) alike — the
 * store awaits the result either way, so each platform injects its own adapter.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}

export interface GroupStoreState {
  groups: Group[];
  /** False until the first load from persistence completes. */
  loaded: boolean;
}

/**
 * A tiny external store (the `useSyncExternalStore` contract) that owns the list
 * of groups, persists every mutation, and exposes immutable actions built on
 * `@splitplata/core`. One instance per app; share it across screens so they all
 * read the same state. Holding it here — not in component state — is what lets
 * web and mobile reuse the exact same logic.
 */
export interface GroupStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): GroupStoreState;
  /** Idempotent; the first call hydrates from persistence, later calls are no-ops. */
  load(): Promise<void>;

  createGroup(input: NewGroupInput): Group;
  /** Add a shared group, or replace the existing one with the same id (snapshot sync). */
  importGroup(group: Group): void;
  getGroup(id: string): Group | undefined;
  renameGroup(groupId: string, name: string): void;
  deleteGroup(groupId: string): void;

  addMember(groupId: string, name: string): void;
  renameMember(groupId: string, memberId: string, name: string): void;
  removeMember(groupId: string, memberId: string): void;

  addExpense(groupId: string, expense: Omit<Expense, "id" | "createdAt">): void;
  removeExpense(groupId: string, expenseId: string): void;
  addPayment(groupId: string, payment: Omit<Payment, "id">): void;
  removePayment(groupId: string, paymentId: string): void;
}

const DEFAULT_KEY = "splitplata:groups";

export function createGroupStore(
  adapter: KeyValueStore,
  key: string = DEFAULT_KEY,
): GroupStore {
  let state: GroupStoreState = { groups: [], loaded: false };
  const listeners = new Set<() => void>();
  let loadPromise: Promise<void> | null = null;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const commit = (groups: Group[]) => {
    state = { groups, loaded: state.loaded };
    emit();
    // Fire-and-forget persistence; a failed write must never block the UI.
    void Promise.resolve(adapter.setItem(key, serializeGroups(groups))).catch(() => {});
  };

  const mutateGroup = (groupId: string, fn: (g: Group) => Group) => {
    commit(state.groups.map((g) => (g.id === groupId ? fn(g) : g)));
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot() {
      return state;
    },

    load() {
      if (loadPromise) return loadPromise;
      loadPromise = Promise.resolve(adapter.getItem(key))
        .then((raw) => {
          state = { groups: deserializeGroups(raw), loaded: true };
          emit();
        })
        .catch(() => {
          state = { groups: [], loaded: true };
          emit();
        });
      return loadPromise;
    },

    createGroup(input) {
      const group = makeGroup(input);
      commit([...state.groups, group]);
      return group;
    },

    importGroup(group) {
      const exists = state.groups.some((g) => g.id === group.id);
      commit(
        exists
          ? state.groups.map((g) => (g.id === group.id ? group : g))
          : [...state.groups, group],
      );
    },

    getGroup(id) {
      return state.groups.find((g) => g.id === id);
    },

    renameGroup(groupId, name) {
      mutateGroup(groupId, (g) => renameGroupCore(g, name));
    },

    deleteGroup(groupId) {
      commit(state.groups.filter((g) => g.id !== groupId));
    },

    addMember(groupId, name) {
      mutateGroup(groupId, (g) => addMemberToGroup(g, name));
    },

    renameMember(groupId, memberId, name) {
      mutateGroup(groupId, (g) => renameMemberCore(g, memberId, name));
    },

    removeMember(groupId, memberId) {
      mutateGroup(groupId, (g) => removeMemberFromGroup(g, memberId));
    },

    addExpense(groupId, expense) {
      mutateGroup(groupId, (g) => addExpenseToGroup(g, expense));
    },

    removeExpense(groupId, expenseId) {
      mutateGroup(groupId, (g) => removeExpenseFromGroup(g, expenseId));
    },

    addPayment(groupId, payment) {
      mutateGroup(groupId, (g) => addPaymentToGroup(g, payment));
    },

    removePayment(groupId, paymentId) {
      mutateGroup(groupId, (g) => removePaymentFromGroup(g, paymentId));
    },
  };
}
