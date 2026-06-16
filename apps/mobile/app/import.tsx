import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { decodeShareInput, type Group } from "@splitplata/core";
import { groupStore } from "../store";
import { styles } from "./index";

/**
 * Lands a shared group. Opened either by a deep link (`splitplata://import?d=…`,
 * decoded automatically) or reached in-app to paste a link/code by hand.
 */
export default function ImportScreen() {
  const { d } = useLocalSearchParams<{ d?: string }>();
  const router = useRouter();
  const [pasted, setPasted] = useState("");

  const source = pasted.trim() || d || "";
  const decoded = useMemo<{ group?: Group; error?: string }>(() => {
    if (!source) return {};
    try {
      return { group: decodeShareInput(source) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Couldn't read that link." };
    }
  }, [source]);

  const onImport = () => {
    if (!decoded.group) return;
    groupStore.importGroup(decoded.group);
    router.replace(`/group/${decoded.group.id}`);
  };

  const exists = decoded.group ? groupStore.getGroup(decoded.group.id) : undefined;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Import group" }} />

      {!d && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PASTE A LINK OR CODE</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={pasted}
            onChangeText={setPasted}
            placeholder="splitplata://import?d=…  or the raw code"
            placeholderTextColor="#aaa"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      {decoded.error && (
        <View style={styles.card}>
          <Text style={{ color: "#c44545" }}>{decoded.error}</Text>
        </View>
      )}

      {decoded.group && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PREVIEW</Text>
          <View style={styles.row}>
            <Text style={styles.rowLeft}>{decoded.group.name}</Text>
            <Text style={styles.muted}>{decoded.group.currency}</Text>
          </View>
          <Text style={styles.muted}>
            {decoded.group.members.length} members · {decoded.group.expenses.length} expenses ·{" "}
            {decoded.group.payments.length} payments
          </Text>
          {exists && (
            <Text style={[styles.muted, { marginTop: 8 }]}>
              You already have this group — importing overwrites it with the shared version.
            </Text>
          )}
          <Pressable style={[styles.button, { marginTop: 12 }]} onPress={onImport}>
            <Text style={styles.buttonText}>Import group</Text>
          </Pressable>
        </View>
      )}

      {!source && (
        <View style={styles.card}>
          <Text style={styles.muted}>Nothing to import yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}
