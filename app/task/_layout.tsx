import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";

export default function TaskLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          fontSize: 16,
        },
        headerShadowVisible: false,
        headerBackTitle: "Orqaga",
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "Topshiriq" }} />
      <Stack.Screen name="add" options={{ title: "Yangi topshiriq" }} />
    </Stack>
  );
}
