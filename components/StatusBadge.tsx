import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const colors = useColors();

  const getColors = () => {
    switch (status) {
      case "Yakunlandi":
        return { bg: colors.statusCompletedBg, text: colors.statusCompleted };
      case "Kechikdi":
        return { bg: colors.statusLateBg, text: colors.statusLate };
      case "Tekshirishda":
        return { bg: "#ede9fe", text: "#7c3aed" };
      default:
        return { bg: colors.statusInProgressBg, text: colors.statusInProgress };
    }
  };

  const { bg, text } = getColors();
  const isSmall = size === "sm";

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: 6 }]}>
      <Text
        style={[styles.text, { color: text, fontSize: isSmall ? 11 : 12 }]}
      >
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: "Inter_600SemiBold",
  },
});
