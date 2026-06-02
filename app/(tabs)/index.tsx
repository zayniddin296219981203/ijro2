import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetMonitoringRows } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { ROLE_META } from "@/utils/permissions";
import { TaskCard, type TaskRow } from "@/components/TaskCard";
import { parseDeadline, daysFromToday, sortBucket } from "@/utils/dateUtils";

const FILTERS = [
  { label: "Barchasi", value: "" },
  { label: "Kechikdi", value: "Kechikdi" },
  { label: "Tekshirishda", value: "Tekshirishda" },
  { label: "Yakunlandi", value: "Yakunlandi" },
  { label: "Jarayonda", value: "Jarayonda" },
];

function sortRows(rows: TaskRow[]): TaskRow[] {
  return [...rows].sort((a, b) => {
    const ba = sortBucket(a.holati);
    const bb = sortBucket(b.holati);
    if (ba !== bb) return ba - bb;
    const da = parseDeadline(a.topshirishSana);
    const db = parseDeadline(b.topshirishSana);
    const daysA = da ? daysFromToday(da) : 0;
    const daysB = db ? daysFromToday(db) : 0;
    if (ba === 3) return daysB - daysA;
    return daysA - daysB;
  });
}

export default function MonitoringScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role, permissions, userName, logout } = useAuth();
  const [activeFilter, setActiveFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } =
    useGetMonitoringRows();

  const allRows = (data?.rows ?? []) as TaskRow[];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of allRows) {
      counts[r.holati] = (counts[r.holati] ?? 0) + 1;
    }
    return counts;
  }, [allRows]);

  const tekshirishCount = statusCounts["Tekshirishda"] ?? 0;

  const rows = useMemo(() => {
    let list = allRows;

    if (activeFilter) {
      list = list.filter((r) => r.holati === activeFilter);
    }

    if (permissions.canViewOwnTasksOnly && userName.trim()) {
      const uname = userName.trim().toLowerCase();
      list = list.filter((r) => r.fish.toLowerCase().includes(uname));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.fish.toLowerCase().includes(q) ||
          r.topshiriq.toLowerCase().includes(q) ||
          r.bolim.toLowerCase().includes(q) ||
          r.lavozim.toLowerCase().includes(q),
      );
    }

    return sortRows(list);
  }, [allRows, activeFilter, searchQuery, permissions.canViewOwnTasksOnly, userName]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const roleMeta = ROLE_META[role];

  const handleLogout = () => {
    Alert.alert(
      "Chiqish",
      `${userName || "Foydalanuvchi"} sifatida kirgansiz.\nTizimdan chiqmoqchimisiz?`,
      [
        { text: "Bekor qilish", style: "cancel" },
        { text: "Chiqish", style: "destructive", onPress: logout },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Role banner */}
      <View
        style={[
          styles.roleBanner,
          {
            backgroundColor: roleMeta.bg,
            paddingTop: Platform.OS === "web" ? topPad : 8,
          },
        ]}
      >
        <View style={styles.roleLeft}>
          <Feather
            name={roleMeta.icon as any}
            size={14}
            color="rgba(255,255,255,0.8)"
          />
          <Text style={styles.roleLabel}>
            {role === "admin" ? "Admin" : role === "boss" ? "Boshliq" : "Xodim"}
          </Text>
          {userName ? (
            <Text style={styles.roleUserName}>— {userName}</Text>
          ) : null}
          {tekshirishCount > 0 && permissions.canApproveTask && (
            <View style={styles.approvalBadge}>
              <Text style={styles.approvalBadgeText}>
                {tekshirishCount} tasdiq kutmoqda
              </Text>
            </View>
          )}
        </View>

        <View style={styles.roleActions}>
          {permissions.canAddTask && (
            <Pressable
              style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.75 : 1 }]}
              hitSlop={8}
              onPress={() => router.push("/task/add")}
            >
              <Feather name="plus" size={15} color="#fff" />
              <Text style={styles.addBtnText}>Qo'shish</Text>
            </Pressable>
          )}
          {/* Logout button in banner (visible for boss/employee since they have no settings tab) */}
          {role !== "admin" && (
            <Pressable
              style={({ pressed }) => [styles.logoutIconBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleLogout}
              hitSlop={10}
            >
              <Feather name="log-out" size={15} color="rgba(255,255,255,0.8)" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder={
              permissions.canViewOwnTasksOnly
                ? "Topshiriq qidirish..."
                : "Ism, topshiriq yoki bo'lim..."
            }
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.value;
            const isTekshirish = f.value === "Tekshirishda";
            const count = f.value ? (statusCounts[f.value] ?? 0) : allRows.length;
            return (
              <Pressable
                key={f.value}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? isTekshirish ? "#7c3aed" : colors.primary
                      : colors.card,
                    borderColor: isActive
                      ? isTekshirish ? "#7c3aed" : colors.primary
                      : colors.border,
                    borderRadius: 20,
                  },
                ]}
                onPress={() => setActiveFilter(f.value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: isActive ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {f.label}
                </Text>
                {isTekshirish && tekshirishCount > 0 && !isActive && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{tekshirishCount}</Text>
                  </View>
                )}
                {!isTekshirish && count > 0 && isActive && (
                  <View style={[styles.filterBadge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                    <Text style={[styles.filterBadgeText, { color: "#fff" }]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={[styles.centerText, { color: colors.statusLate }]}>
            Ma'lumot yuklanmadi
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={() => refetch()}
          >
            <Text style={styles.retryText}>Qayta urinish</Text>
          </Pressable>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
            {permissions.canViewOwnTasksOnly && !userName
              ? "Sozlamalarda ismingizni kiriting"
              : "Topshiriqlar topilmadi"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={() =>
                router.push({
                  pathname: "/task/[id]",
                  params: { id: item.id, data: JSON.stringify(item) },
                })
              }
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  roleBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  roleLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" },
  roleLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff", letterSpacing: 0.3 },
  roleUserName: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  approvalBadge: { backgroundColor: "#fbbf24", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  approvalBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#78350f" },
  roleActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  logoutIconBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 7,
  },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  filterWrap: { paddingBottom: 8 },
  filterRow: { paddingHorizontal: 16, gap: 8, flexDirection: "row" },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  filterBadge: { backgroundColor: "#7c3aed", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: "center" },
  filterBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  list: { paddingTop: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  centerText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
