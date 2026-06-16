import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useGroupStore } from "@splitplata/app";
import { groupStore } from "../store";

/** Home: the list of saved groups plus an inline create form. */
export default function GroupsScreen() {
  const { groups, loaded } = useGroupStore(groupStore);
  const router = useRouter();

  const [name, setName] = useState("");
  const [members, setMembers] = useState("");

  const onCreate = () => {
    if (!name.trim()) return;
    const memberNames = members
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const group = groupStore.createGroup({ name, currency: "USD", memberNames });
    setName("");
    setMembers("");
    router.push(`/group/${group.id}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>NEW GROUP</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Group name (e.g. Weekend Trip)"
          placeholderTextColor="#aaa"
        />
        <TextInput
          style={[styles.input, styles.multiline]}
          value={members}
          onChangeText={setMembers}
          placeholder={"Members — one per line\nAnn\nBob\nCara"}
          placeholderTextColor="#aaa"
          multiline
        />
        <Pressable
          style={[styles.button, !name.trim() && styles.buttonDisabled]}
          onPress={onCreate}
          disabled={!name.trim()}
        >
          <Text style={styles.buttonText}>Create group</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>YOUR GROUPS</Text>
        {!loaded ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : groups.length === 0 ? (
          <Text style={styles.muted}>No groups yet. Create one above.</Text>
        ) : (
          groups.map((g) => (
            <Link key={g.id} href={`/group/${g.id}`} asChild>
              <Pressable style={styles.row}>
                <Text style={styles.rowLeft}>{g.name}</Text>
                <Text style={styles.muted}>
                  {g.members.length} {g.members.length === 1 ? "member" : "members"} · {g.currency}
                </Text>
              </Pressable>
            </Link>
          ))
        )}
      </View>
    </ScrollView>
  );
}

/** Shared styles also used by the group detail screen. */
export const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 12, letterSpacing: 1, color: "#888", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    marginBottom: 10,
    color: "#1a1a1a",
  },
  multiline: { minHeight: 76, textAlignVertical: "top" },
  button: { backgroundColor: "#2f6f4f", borderRadius: 8, padding: 12, alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  rowLeft: { fontSize: 16, color: "#1a1a1a" },
  muted: { color: "#999", fontSize: 13 },
});

// Re-export so screens can call confirm-style deletes consistently.
export function confirmDelete(label: string, onConfirm: () => void) {
  Alert.alert("Delete", `Delete "${label}"? This can't be undone.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}
