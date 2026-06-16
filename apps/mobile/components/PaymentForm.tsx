import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { buildPaymentDraft, type Group } from "@splitplata/core";
import { groupStore } from "../store";
import { styles as base } from "../app/index";

const todayISO = () => new Date().toISOString().slice(0, 10);

export interface PaymentPrefill {
  fromId: string;
  toId: string;
  amount: string;
}

/**
 * Record a settlement payment. Seeded from `initial` when a settlement
 * suggestion's "Record" button is tapped; remount (via key) resets it.
 */
export function PaymentForm({ group, initial }: { group: Group; initial?: PaymentPrefill }) {
  const [fromId, setFromId] = useState(initial?.fromId ?? group.members[0]?.id ?? "");
  const [toId, setToId] = useState(initial?.toId ?? group.members[1]?.id ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = () => {
    const result = buildPaymentDraft({ fromId, toId, amount, date, note });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    groupStore.addPayment(group.id, result.draft);
    setAmount("");
    setNote("");
    setError(null);
  };

  return (
    <View>
      <Text style={s.label}>Who paid</Text>
      <View style={s.chips}>
        {group.members.map((m) => (
          <Chip key={m.id} on={fromId === m.id} onPress={() => setFromId(m.id)} label={m.name} />
        ))}
      </View>

      <Text style={s.label}>Paid to</Text>
      <View style={s.chips}>
        {group.members.map((m) => (
          <Chip key={m.id} on={toId === m.id} onPress={() => setToId(m.id)} label={m.name} />
        ))}
      </View>

      <TextInput
        style={[base.input, { marginTop: 12 }]}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        placeholderTextColor="#aaa"
        keyboardType="decimal-pad"
      />
      <TextInput
        style={base.input}
        value={note}
        onChangeText={setNote}
        placeholder="Note (optional)"
        placeholderTextColor="#aaa"
      />

      {error && <Text style={s.error}>{error}</Text>}

      <Pressable style={base.button} onPress={onSubmit}>
        <Text style={base.buttonText}>Record payment</Text>
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
  error: {
    color: "#c44545",
    backgroundColor: "rgba(196,69,69,0.08)",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    fontSize: 13,
  },
});
