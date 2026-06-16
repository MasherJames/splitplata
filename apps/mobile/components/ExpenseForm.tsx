import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  buildExpenseDraft,
  emptyExpenseForm,
  type Group,
  type SplitMode,
} from "@splitplata/core";
import { groupStore } from "../store";
import { styles as base } from "../app/index";

const SPLIT_MODES: { value: SplitMode; label: string }[] = [
  { value: "equal", label: "Equally" },
  { value: "exact", label: "Exact" },
  { value: "percent", label: "Percent" },
  { value: "shares", label: "Shares" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Full expense-entry form mirroring the web version, built from RN primitives. */
export function ExpenseForm({ group }: { group: Group }) {
  const memberIds = useMemo(() => group.members.map((m) => m.id), [group.members]);
  const [form, setForm] = useState(() =>
    emptyExpenseForm(memberIds, group.members[0]?.id ?? "", todayISO()),
  );
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleParticipant = (id: string) =>
    setForm((f) => ({
      ...f,
      participantIds: f.participantIds.includes(id)
        ? f.participantIds.filter((p) => p !== id)
        : [...f.participantIds, id],
    }));

  const setWeight = (id: string, value: string) =>
    setForm((f) => ({ ...f, weights: { ...f.weights, [id]: value } }));

  const onSubmit = () => {
    const result = buildExpenseDraft(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    groupStore.addExpense(group.id, result.draft);
    setForm(emptyExpenseForm(memberIds, form.payerId, todayISO()));
    setError(null);
  };

  const unit = form.splitMode === "exact" ? group.currency : form.splitMode === "percent" ? "%" : "×";

  return (
    <View>
      <TextInput
        style={base.input}
        value={form.description}
        onChangeText={(t) => set("description", t)}
        placeholder="What was it for?"
        placeholderTextColor="#aaa"
      />
      <TextInput
        style={base.input}
        value={form.amount}
        onChangeText={(t) => set("amount", t)}
        placeholder="0.00"
        placeholderTextColor="#aaa"
        keyboardType="decimal-pad"
      />

      <Text style={s.label}>Who paid</Text>
      <View style={s.chips}>
        {group.members.map((m) => (
          <Chip key={m.id} on={form.payerId === m.id} onPress={() => set("payerId", m.id)} label={m.name} />
        ))}
      </View>

      <Text style={s.label}>Split</Text>
      <View style={s.chips}>
        {SPLIT_MODES.map((m) => (
          <Chip
            key={m.value}
            on={form.splitMode === m.value}
            onPress={() => set("splitMode", m.value)}
            label={m.label}
          />
        ))}
      </View>

      <Text style={s.label}>Participants</Text>
      {group.members.map((m) => {
        const on = form.participantIds.includes(m.id);
        return (
          <View key={m.id} style={s.participantRow}>
            <Pressable style={s.participantTap} onPress={() => toggleParticipant(m.id)}>
              <Text style={[s.checkbox, on && s.checkboxOn]}>{on ? "✓" : ""}</Text>
              <Text style={base.rowLeft}>{m.name}</Text>
            </Pressable>
            {on && form.splitMode !== "equal" && (
              <View style={s.weightWrap}>
                <TextInput
                  style={s.weightInput}
                  value={form.weights[m.id] ?? ""}
                  onChangeText={(t) => setWeight(m.id, t)}
                  placeholder="0"
                  placeholderTextColor="#bbb"
                  keyboardType="decimal-pad"
                />
                <Text style={s.unit}>{unit}</Text>
              </View>
            )}
          </View>
        );
      })}

      <TextInput
        style={[base.input, { marginTop: 12 }]}
        value={form.category ?? ""}
        onChangeText={(t) => set("category", t)}
        placeholder="Category (optional)"
        placeholderTextColor="#aaa"
      />

      {error && <Text style={s.error}>{error}</Text>}

      <Pressable style={base.button} onPress={onSubmit}>
        <Text style={base.buttonText}>Add expense</Text>
      </Pressable>
    </View>
  );
}

function Chip({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable style={[s.chip, on && s.chipOn]} onPress={onPress}>
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 12, letterSpacing: 1, color: "#888", marginTop: 14, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  chipOn: { backgroundColor: "#2f6f4f", borderColor: "#2f6f4f" },
  chipText: { color: "#555", fontSize: 14 },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  participantTap: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bbb",
    textAlign: "center",
    lineHeight: 21,
    color: "#fff",
    overflow: "hidden",
  },
  checkboxOn: { backgroundColor: "#2f6f4f", borderColor: "#2f6f4f" },
  weightWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  weightInput: {
    width: 72,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: "right",
    color: "#1a1a1a",
  },
  unit: { color: "#888", minWidth: 28, fontSize: 13 },
  error: {
    color: "#c44545",
    backgroundColor: "rgba(196,69,69,0.08)",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    fontSize: 13,
  },
});
