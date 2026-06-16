import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import { encodeShareToken, SHARE_QUERY_KEY, type Group } from "@splitplata/core";
import { exportCSV, exportPDF } from "../lib/export";

/** Share link + CSV/PDF export, using the OS share sheet for everything. */
export function ShareExport({ group }: { group: Group }) {
  const [copied, setCopied] = useState(false);

  // Deep link that re-opens the app on the import screen with the snapshot token.
  const shareUrl = Linking.createURL("/import", {
    queryParams: { [SHARE_QUERY_KEY]: encodeShareToken(group) },
  });

  const onShareLink = async () => {
    try {
      await Share.share({ message: `Join "${group.name}" on Splitplata: ${shareUrl}` });
    } catch {
      /* user dismissed */
    }
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const guard = (fn: () => Promise<void>) => async () => {
    try {
      await fn();
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <View>
      <Text style={s.hint}>Anyone with this link can import a snapshot of the group.</Text>
      <View style={s.buttons}>
        <Action label="Share link" onPress={onShareLink} />
        <Action label={copied ? "Copied!" : "Copy link"} onPress={onCopy} />
        <Action label="Export CSV" onPress={guard(() => exportCSV(group))} />
        <Action label="Export PDF" onPress={guard(() => exportPDF(group))} />
      </View>
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={s.action} onPress={onPress}>
      <Text style={s.actionText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hint: { color: "#888", fontSize: 13, marginBottom: 10 },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    backgroundColor: "rgba(47,111,79,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  actionText: { color: "#2f6f4f", fontWeight: "600", fontSize: 14 },
});
