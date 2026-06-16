import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useGroup } from "@splitplata/app";
import {
  computeBalances,
  formatAmount,
  formatMoney,
  settlementPlan,
  type Group,
  type Transfer,
} from "@splitplata/core";
import { groupStore } from "../../store";
import { confirmDelete, styles } from "../index";
import { ExpenseForm } from "../../components/ExpenseForm";
import { PaymentForm, type PaymentPrefill } from "../../components/PaymentForm";
import { ShareExport } from "../../components/ShareExport";

/** Group detail: rename the group and manage its members. */
export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(groupStore, id);
  const router = useRouter();
  const [newMember, setNewMember] = useState("");
  const [prefill, setPrefill] = useState<PaymentPrefill | undefined>(undefined);
  const [prefillKey, setPrefillKey] = useState(0);

  const onRecord = (t: Transfer) => {
    setPrefill({ fromId: t.fromId, toId: t.toId, amount: formatAmount(t.amount) });
    setPrefillKey((k) => k + 1);
  };

  if (!group) {
    return (
      <View style={styles.content}>
        <Text style={styles.muted}>Group not found.</Text>
      </View>
    );
  }

  const onAddMember = () => {
    if (!newMember.trim()) return;
    groupStore.addMember(group.id, newMember);
    setNewMember("");
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: group.name || "Group" }} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>GROUP NAME</Text>
        <TextInput
          style={styles.input}
          value={group.name}
          onChangeText={(text) => groupStore.renameGroup(group.id, text)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>MEMBERS ({group.members.length})</Text>
        {group.members.length === 0 ? (
          <Text style={styles.muted}>No members yet. Add the first one below.</Text>
        ) : (
          group.members.map((m) => (
            <View key={m.id} style={styles.row}>
              <TextInput
                style={[styles.rowLeft, { flex: 1 }]}
                value={m.name}
                onChangeText={(text) => groupStore.renameMember(group.id, m.id, text)}
              />
              <Pressable
                hitSlop={8}
                onPress={() => groupStore.removeMember(group.id, m.id)}
              >
                <Text style={{ color: "#c44545", fontWeight: "700", fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={newMember}
            onChangeText={setNewMember}
            placeholder="Add a member"
            placeholderTextColor="#aaa"
            onSubmitEditing={onAddMember}
          />
          <Pressable
            style={[styles.button, !newMember.trim() && styles.buttonDisabled]}
            onPress={onAddMember}
            disabled={!newMember.trim()}
          >
            <Text style={styles.buttonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {group.members.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ADD EXPENSE</Text>
          <ExpenseForm group={group} />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>SHARE & EXPORT</Text>
        <ShareExport group={group} />
      </View>

      <BalancesAndSettlement group={group} onRecord={onRecord} />

      {group.members.length > 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>RECORD A PAYMENT</Text>
          <PaymentForm key={prefillKey} group={group} initial={prefill} />
        </View>
      )}

      {group.payments.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PAYMENTS ({group.payments.length})</Text>
          {[...group.payments]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .map((p) => {
              const nameOf = (mid: string) =>
                group.members.find((m) => m.id === mid)?.name ?? "?";
              return (
                <View key={p.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLeft}>
                      {nameOf(p.fromId)} → {nameOf(p.toId)}
                    </Text>
                    <Text style={styles.muted}>
                      {p.date}
                      {p.note ? ` · ${p.note}` : ""}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: "600", marginRight: 12 }}>
                    {formatMoney(p.amount, group.currency)}
                  </Text>
                  <Pressable hitSlop={8} onPress={() => groupStore.removePayment(group.id, p.id)}>
                    <Text style={{ color: "#c44545", fontWeight: "700", fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>EXPENSES ({group.expenses.length})</Text>
        {group.expenses.length === 0 ? (
          <Text style={styles.muted}>No expenses yet.</Text>
        ) : (
          [...group.expenses]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .map((e) => {
              const payer = group.members.find((m) => m.id === e.payerId)?.name ?? "?";
              return (
                <View key={e.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLeft}>{e.description}</Text>
                    <Text style={styles.muted}>
                      {payer} paid · {e.date}
                      {e.category ? ` · ${e.category}` : ""}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: "600", marginRight: 12 }}>
                    {formatMoney(e.amount, group.currency)}
                  </Text>
                  <Pressable hitSlop={8} onPress={() => groupStore.removeExpense(group.id, e.id)}>
                    <Text style={{ color: "#c44545", fontWeight: "700", fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>
              );
            })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>DANGER ZONE</Text>
        <Pressable
          onPress={() =>
            confirmDelete(group.name, () => {
              groupStore.deleteGroup(group.id);
              router.back();
            })
          }
        >
          <Text style={{ color: "#c44545", fontWeight: "600" }}>Delete group</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/** Live net balances and the simplified settlement plan. */
function BalancesAndSettlement({
  group,
  onRecord,
}: {
  group: Group;
  onRecord: (t: Transfer) => void;
}) {
  const balances = useMemo(() => computeBalances(group), [group]);
  const plan = useMemo(() => settlementPlan(group), [group]);
  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.name ?? id;

  if (group.expenses.length === 0 && group.payments.length === 0) return null;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>BALANCES</Text>
        {balances.map((b) => (
          <View key={b.memberId} style={styles.row}>
            <Text style={styles.rowLeft}>{nameOf(b.memberId)}</Text>
            <Text style={{ fontWeight: "600", color: b.net >= 0 ? "#2f8f5b" : "#c44545" }}>
              {formatMoney(b.net, group.currency)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>SETTLE UP</Text>
        {plan.length === 0 ? (
          <Text style={styles.muted}>All settled. 🎉</Text>
        ) : (
          plan.map((t, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.rowLeft, { flex: 1 }]}>
                {nameOf(t.fromId)} → {nameOf(t.toId)}
              </Text>
              <Text style={{ fontWeight: "600", marginRight: 12 }}>
                {formatMoney(t.amount, group.currency)}
              </Text>
              <Pressable
                style={{
                  backgroundColor: "rgba(47,111,79,0.1)",
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 14,
                }}
                onPress={() => onRecord(t)}
              >
                <Text style={{ color: "#2f6f4f", fontWeight: "600", fontSize: 13 }}>Record</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </>
  );
}
