import { describe, expect, it } from "vitest";
import {
  computeBalances,
  computeShares,
  createGroup,
  addExpense,
  addMember,
  addPayment,
  buildExpenseDraft,
  buildPaymentDraft,
  emptyExpenseForm,
  decodeGroup,
  distributeEvenly,
  distributeProportionally,
  encodeGroup,
  formatMoney,
  parseAmount,
  renameMember,
  removeMember,
  serializeGroups,
  deserializeGroups,
  settlementPlan,
  simplifyBalances,
} from "./index.js";
import type { Expense, Group } from "./types.js";

const T = "2026-01-01T00:00:00.000Z";

/** Build a small fixture group: Ann, Bob, Cara, no expenses yet. */
function trio(): Group {
  return createGroup({
    name: "Trip",
    memberNames: ["Ann", "Bob", "Cara"],
    now: T,
  });
}

function ids(g: Group) {
  const [ann, bob, cara] = g.members.map((m) => m.id);
  return { ann: ann!, bob: bob!, cara: cara! };
}

describe("distributeEvenly", () => {
  it("sums to the total and hands remainders to the front", () => {
    expect(distributeEvenly(1000, 3)).toEqual([334, 333, 333]);
    expect(distributeEvenly(100, 3).reduce((a, b) => a + b)).toBe(100);
  });
  it("handles negatives symmetrically", () => {
    expect(distributeEvenly(-1000, 3)).toEqual([-334, -333, -333]);
  });
});

describe("distributeProportionally", () => {
  it("respects weights and sums exactly via largest remainder", () => {
    expect(distributeProportionally(1000, [1, 1, 2])).toEqual([250, 250, 500]);
    const odd = distributeProportionally(100, [1, 1, 1]);
    expect(odd.reduce((a, b) => a + b)).toBe(100);
  });
});

describe("computeShares", () => {
  it("splits equally by default", () => {
    const g = trio();
    const { ann, bob, cara } = ids(g);
    const exp: Expense = {
      id: "e1",
      description: "Dinner",
      amount: 1000,
      payerId: ann,
      participantIds: [ann, bob, cara],
      splitMode: "equal",
      date: T,
      createdAt: T,
    };
    expect(computeShares(exp)).toEqual({ [ann]: 334, [bob]: 333, [cara]: 333 });
  });

  it("rejects exact splits that don't sum to the total", () => {
    const g = trio();
    const { ann, bob } = ids(g);
    const exp: Expense = {
      id: "e2",
      description: "x",
      amount: 1000,
      payerId: ann,
      participantIds: [ann, bob],
      splitMode: "exact",
      weights: [
        { memberId: ann, value: 600 },
        { memberId: bob, value: 300 },
      ],
      date: T,
      createdAt: T,
    };
    expect(() => computeShares(exp)).toThrow(/sum/i);
  });
});

describe("computeBalances", () => {
  it("nets to zero and tracks payer credit", () => {
    let g = trio();
    const { ann, bob, cara } = ids(g);
    g = addExpense(
      g,
      {
        description: "Hotel",
        amount: 3000,
        payerId: ann,
        participantIds: [ann, bob, cara],
        splitMode: "equal",
        date: T,
      },
      T,
    );
    const balances = computeBalances(g);
    const sum = balances.reduce((a, b) => a + b.net, 0);
    expect(sum).toBe(0);
    const byId = Object.fromEntries(balances.map((b) => [b.memberId, b.net]));
    expect(byId[ann]).toBe(2000); // paid 3000, owes 1000
    expect(byId[bob]).toBe(-1000);
    expect(byId[cara]).toBe(-1000);
  });

  it("applies settlement payments", () => {
    let g = trio();
    const { ann, bob, cara } = ids(g);
    g = addExpense(
      g,
      {
        description: "Hotel",
        amount: 3000,
        payerId: ann,
        participantIds: [ann, bob, cara],
        splitMode: "equal",
        date: T,
      },
      T,
    );
    g = addPayment(g, { fromId: bob, toId: ann, amount: 1000, date: T }, T);
    const byId = Object.fromEntries(
      computeBalances(g).map((b) => [b.memberId, b.net]),
    );
    expect(byId[bob]).toBe(0);
    expect(byId[ann]).toBe(1000);
  });
});

describe("simplifyBalances", () => {
  it("collapses to a minimal set of transfers", () => {
    const transfers = simplifyBalances([
      { memberId: "a", net: 2000 },
      { memberId: "b", net: -1000 },
      { memberId: "c", net: -1000 },
    ]);
    expect(transfers).toHaveLength(2);
    expect(transfers.every((t) => t.toId === "a")).toBe(true);
    expect(transfers.reduce((s, t) => s + t.amount, 0)).toBe(2000);
  });

  it("end-to-end settlement plan settles a group", () => {
    let g = trio();
    const { ann, bob, cara } = ids(g);
    g = addExpense(
      g,
      {
        description: "Hotel",
        amount: 3000,
        payerId: ann,
        participantIds: [ann, bob, cara],
        splitMode: "equal",
        date: T,
      },
      T,
    );
    const plan = settlementPlan(g);
    expect(plan).toHaveLength(2);
    expect(plan.every((t) => t.toId === ann)).toBe(true);
  });
});

describe("buildExpenseDraft", () => {
  const base = () => {
    const g = trio();
    const { ann, bob, cara } = ids(g);
    return { g, ann, bob, cara };
  };

  it("builds an equal-split draft from a populated form", () => {
    const { ann, bob, cara } = base();
    const form = emptyExpenseForm([ann, bob, cara], ann, "2026-06-16");
    const res = buildExpenseDraft({ ...form, description: "Dinner", amount: "45.00" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.draft.amount).toBe(4500);
      expect(res.draft.splitMode).toBe("equal");
      expect(res.draft.weights).toBeUndefined();
    }
  });

  it("rejects empty and non-positive amounts", () => {
    const { ann, bob } = base();
    const form = emptyExpenseForm([ann, bob], ann, "2026-06-16");
    expect(buildExpenseDraft({ ...form, amount: "" }).ok).toBe(false);
    expect(buildExpenseDraft({ ...form, amount: "0" }).ok).toBe(false);
  });

  it("converts percentages to basis points and enforces 100%", () => {
    const { ann, bob } = base();
    const form = emptyExpenseForm([ann, bob], ann, "2026-06-16");
    const bad = buildExpenseDraft({
      ...form,
      amount: "100.00",
      splitMode: "percent",
      weights: { [ann]: "60", [bob]: "30" },
    });
    expect(bad.ok).toBe(false);
    const good = buildExpenseDraft({
      ...form,
      amount: "100.00",
      splitMode: "percent",
      weights: { [ann]: "60", [bob]: "40" },
    });
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.draft.weights).toEqual([
        { memberId: ann, value: 6000 },
        { memberId: bob, value: 4000 },
      ]);
    }
  });

  it("surfaces the splitter's error for exact amounts that miss the total", () => {
    const { ann, bob } = base();
    const form = emptyExpenseForm([ann, bob], ann, "2026-06-16");
    const res = buildExpenseDraft({
      ...form,
      amount: "10.00",
      splitMode: "exact",
      weights: { [ann]: "6.00", [bob]: "3.00" },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/sum|total/i);
  });

  it("builds shares splits", () => {
    const { ann, bob } = base();
    const form = emptyExpenseForm([ann, bob], ann, "2026-06-16");
    const res = buildExpenseDraft({
      ...form,
      amount: "30.00",
      splitMode: "shares",
      weights: { [ann]: "2", [bob]: "1" },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.draft.weights).toEqual([
      { memberId: ann, value: 2 },
      { memberId: bob, value: 1 },
    ]);
  });
});

describe("buildPaymentDraft", () => {
  it("builds a valid payment", () => {
    const res = buildPaymentDraft({
      fromId: "a",
      toId: "b",
      amount: "12.50",
      date: "2026-06-16",
      note: "  venmo  ",
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.draft.amount).toBe(1250);
      expect(res.draft.note).toBe("venmo");
    }
  });

  it("rejects self-payment, missing party, and bad amounts", () => {
    expect(buildPaymentDraft({ fromId: "a", toId: "a", amount: "5", date: "d" }).ok).toBe(false);
    expect(buildPaymentDraft({ fromId: "", toId: "b", amount: "5", date: "d" }).ok).toBe(false);
    expect(buildPaymentDraft({ fromId: "a", toId: "b", amount: "0", date: "d" }).ok).toBe(false);
    expect(buildPaymentDraft({ fromId: "a", toId: "b", amount: "x", date: "d" }).ok).toBe(false);
  });

  it("a recorded payment zeroes out the matching debt", () => {
    let g = trio();
    const { ann, bob, cara } = ids(g);
    g = addExpense(
      g,
      {
        description: "Hotel",
        amount: 3000,
        payerId: ann,
        participantIds: [ann, bob, cara],
        splitMode: "equal",
        date: T,
      },
      T,
    );
    const res = buildPaymentDraft({ fromId: bob, toId: ann, amount: "10.00", date: T });
    expect(res.ok).toBe(true);
    if (res.ok) {
      g = addPayment(g, res.draft, T);
      const byId = Object.fromEntries(computeBalances(g).map((b) => [b.memberId, b.net]));
      expect(byId[bob]).toBe(0);
    }
  });
});

describe("money", () => {
  it("parses and round-trips", () => {
    expect(parseAmount("12.34")).toBe(1234);
    expect(parseAmount("0")).toBe(0);
    expect(() => parseAmount("abc")).toThrow();
    expect(formatMoney(1234, "USD")).toMatch(/12\.34/);
  });
});

describe("member management", () => {
  it("renames and removes members immutably and bumps updatedAt", () => {
    const g = trio();
    const { bob } = ids(g);
    const renamed = renameMember(g, bob, "Bobby", "2026-02-02T00:00:00.000Z");
    expect(renamed).not.toBe(g);
    expect(g.members.find((m) => m.id === bob)?.name).toBe("Bob"); // original untouched
    expect(renamed.members.find((m) => m.id === bob)?.name).toBe("Bobby");
    expect(renamed.updatedAt).toBe("2026-02-02T00:00:00.000Z");

    const fewer = removeMember(renamed, bob);
    expect(fewer.members).toHaveLength(2);
  });
});

describe("repo serialization", () => {
  it("round-trips a list of groups through the versioned envelope", () => {
    const groups = [trio(), createGroup({ name: "Lunch", now: T })];
    expect(deserializeGroups(serializeGroups(groups))).toEqual(groups);
  });
  it("returns an empty list for corrupt or missing data", () => {
    expect(deserializeGroups(null)).toEqual([]);
    expect(deserializeGroups("not json")).toEqual([]);
    expect(deserializeGroups(JSON.stringify({ v: 999, groups: [] }))).toEqual([]);
  });
});

describe("codec", () => {
  it("round-trips a group through a share token", () => {
    let g = trio();
    g = addMember(g, "Díana 🌮", T);
    const token = encodeGroup(g);
    const back = decodeGroup(token);
    expect(back).toEqual(g);
  });
  it("rejects an unknown version", () => {
    expect(() => decodeGroup("99.abcd")).toThrow(/version/i);
  });
});
