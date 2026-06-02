import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";
import { parseDeadline, daysFromToday } from "@/utils/dateUtils";

export interface TaskRow {
  id: string;
  fish: string;
  bolim: string;
  lavozim: string;
  topshiriq: string;
  muddat?: number;
  berilganSana?: string;
  topshirishSana?: string;
  qolganKun?: number;
  holati: string;
  tugatishBelgilash?: boolean;
  ishTugatilishiKun?: string;
  /** Column N ARRAYFORMULA text — exact value from Google Sheets, e.g. "3 kun kech bajarilgan" */
  kechikishMatn?: string;
}

interface Props {
  task: TaskRow;
  onPress?: () => void;
}

function useCountdown(topshirishSana: string | undefined, holati: string) {
  const colors = useColors();
  // Live "now" that re-computes once per hour so labels never go stale
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!topshirishSana) return null;
  const deadline = parseDeadline(topshirishSana);
  if (!deadline) return null;

  // Completed or under-review — don't show a live countdown
  if (holati === "Yakunlandi" || holati === "Tekshirishda") return null;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (holati === "Kechikdi" || days < 0) {
    return {
      label: `${Math.abs(days)} kun kechikdi`,
      color: colors.statusLate,
      bg: colors.statusLateBg,
      icon: "alert-circle" as const,
    };
  }
  if (days === 0) {
    return {
      label: "Bugun muddati!",
      color: "#b45309",
      bg: "#fef3c7",
      icon: "alert-triangle" as const,
    };
  }
  if (days <= 3) {
    return {
      label: `${days} kun qoldi`,
      color: colors.statusInProgress,
      bg: colors.statusInProgressBg,
      icon: "clock" as const,
    };
  }
  return {
    label: `${days} kun qoldi`,
    color: colors.mutedForeground,
    bg: colors.secondary,
    icon: "clock" as const,
  };
}

export function TaskCard({ task, onPress }: Props) {
  const colors = useColors();
  const countdown = useCountdown(task.topshirishSana, task.holati);

  const isLate = task.holati === "Kechikdi";
  const isCompleted = task.holati === "Yakunlandi";
  const isPending = task.holati === "Tekshirishda";
  // Delay display comes directly from Sheets column N ARRAYFORMULA
  const kechikishMatn = task.kechikishMatn?.trim() ?? "";
  const showDelayBadge = kechikishMatn.length > 0;
  const delayIsLate = kechikishMatn.includes("kech");
  const delayIsEarly = kechikishMatn.includes("erta") || kechikishMatn.includes("avval");

  const accentColor = isLate
    ? colors.statusLate
    : isCompleted
    ? colors.statusCompleted
    : isPending
    ? "#7c3aed"
    : countdown && countdown.color !== colors.mutedForeground
    ? countdown.color
    : colors.border;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          borderLeftColor: accentColor,
          opacity: pressed ? 0.93 : 1,
        },
      ]}
      onPress={onPress}
    >
      {/* Header: name + status */}
      <View style={styles.header}>
        <View style={styles.nameSection}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {task.fish}
          </Text>
          <Text
            style={[styles.dept, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {task.bolim} · {task.lavozim}
          </Text>
        </View>
        <StatusBadge status={task.holati} size="sm" />
      </View>

      {/* Task name */}
      <View style={[styles.taskRow, { borderTopColor: colors.border }]}>
        <Feather name="clipboard" size={13} color={colors.mutedForeground} />
        <Text
          style={[styles.taskText, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {task.topshiriq}
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {task.topshirishSana && (
          <View style={styles.metaItem}>
            <Feather name="calendar" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {task.topshirishSana.replace(/^[A-Za-z]+,\s*/, "")}
            </Text>
          </View>
        )}

        {/* Live countdown (active tasks only) */}
        {countdown && (
          <View
            style={[
              styles.pill,
              { backgroundColor: countdown.bg, borderRadius: 6 },
            ]}
          >
            <Feather name={countdown.icon} size={11} color={countdown.color} />
            <Text style={[styles.pillText, { color: countdown.color }]}>
              {countdown.label}
            </Text>
          </View>
        )}

        {/* Delay badge — exact text from Sheets column N ARRAYFORMULA */}
        {showDelayBadge && (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: delayIsLate ? "#fff1f2" : delayIsEarly ? "#dcfce7" : "#dbeafe",
                borderRadius: 6,
              },
            ]}
          >
            <Feather
              name={delayIsLate ? "alert-triangle" : delayIsEarly ? "award" : "check"}
              size={11}
              color={delayIsLate ? "#e11d48" : delayIsEarly ? "#16a34a" : "#2563eb"}
            />
            <Text
              style={[
                styles.pillText,
                { color: delayIsLate ? "#e11d48" : delayIsEarly ? "#16a34a" : "#2563eb" },
              ]}
            >
              {kechikishMatn}
            </Text>
          </View>
        )}

        {/* Tekshirishda — awaiting approval */}
        {isPending && (
          <View
            style={[styles.pill, { backgroundColor: "#ede9fe", borderRadius: 6 }]}
          >
            <Feather name="eye" size={11} color="#7c3aed" />
            <Text style={[styles.pillText, { color: "#7c3aed" }]}>
              Tasdiq kutilmoqda
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  nameSection: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  dept: { fontSize: 12, fontFamily: "Inter_400Regular" },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 10,
  },
  taskText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
