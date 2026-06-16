import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#2f6f4f" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#f5f6f5" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Splitplata" }} />
        {/* Title is set dynamically from the group name inside the screen. */}
        <Stack.Screen name="group/[id]" options={{ title: "Group" }} />
      </Stack>
    </>
  );
}
