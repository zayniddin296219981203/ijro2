import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  useGetMonitoringRows,
  useGetMonitoringStats,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { StatsCard } from "@/components/StatsCard";
import { computeEmployeeStats, RATING_META, type EmployeeStats } from "@/utils/performance";
import type { TaskRow } from "@/components/TaskCard";

type Tab = "umumiy" | "xodimlar" | "bolimlar";

function ProgressBar({
  value,
  color,
  bg,
}: {
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.progressBg, { backgroundColor: bg }]}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.min(100, Math.max(0, value))}%` as `${number}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

function RatingBadge({ rating }: { rating: EmployeeStats["rating"] }) {
  const meta = RATING_META[rating];
  return (
    <View
      style={[
        styles.ratingBadge,
        { backgroundColor: meta.bg },
      ]}
    >
      <Feather name={meta.icon as any} size={11} color={meta.color} />
      <Text style={[styles.ratingText, { color: meta.color }]}>{rating}</Text>
    </View>
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Text style={styles.medal}>🥇</Text>;
  if (rank === 2) return <Text style={styles.medal}>🥈</Text>;
  if (rank === 3) return <Text style={styles.medal}>🥉</Text>;
  return (
    <View style={styles.rankCircle}>
      <Text style={styles.rankNum}>{rank}</Text>
    </View>
  );
}

function EmployeeCard({
  emp,
  rank,
}: {
  emp: EmployeeStats;
  rank: number;
}) {
  const colors = useColors();
  const meta = RATING_META[emp.rating];
  const isTopPerformer = rank <= 3;
  const isMostDelayed = emp.avgDelayDays > 10;

  return (
    <View
      style={[
        styles.empCard,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: isTopPerformer ? meta.color : colors.border,
          borderWidth: isTopPerformer ? 1.5 : 1,
        },
      ]}
    >
      <View style={styles.empHeader}>
        <RankMedal rank={rank} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.empName, { color: colors.foreground }]}>
            {emp.fish}
          </Text>
          <Text style={[styles.empMeta, { color: colors.mutedForeground }]}>
            {emp.bolim} · {emp.lavozim}
          </Text>
        </View>
        <View style={styles.empScoreWrap}>
          <Text style={[styles.empScore, { color: meta.color }]}>
            {emp.productivityScore}
          </Text>
          <Text style={[styles.empScoreLabel, { color: colors.mutedForeground }]}>
            ball
          </Text>
        </View>
      </View>

      <View style={styles.empTags}>
        <RatingBadge rating={emp.rating} />
        {isMostDelayed && (
          <View style={[styles.tagBadge, { backgroundColor: "#fff1f2" }]}>
            <Feather name="alert-triangle" size={10} color="#e11d48" />
            <Text style={[styles.tagText, { color: "#e11d48" }]}>
              Kechikish ko'p
            </Text>
          </View>
        )}
        {emp.onTimePercent === 100 && emp.totalTasks >= 2 && (
          <View style={[styles.tagBadge, { backgroundColor: "#dcfce7" }]}>
            <Feather name="zap" size={10} color="#16a34a" />
            <Text style={[styles.tagText, { color: "#16a34a" }]}>
              Doim o'z vaqtida
            </Text>
          </View>
        )}
      </View>

      <View style={styles.empProgressRow}>
        <Text style={[styles.empProgressLabel, { color: colors.mutedForeground }]}>
          O'z vaqtida
        </Text>
        <Text style={[styles.empProgressPct, { color: meta.color }]}>
          {emp.onTimePercent}%
        </Text>
      </View>
      <ProgressBar
        value={emp.onTimePercent}
        color={meta.color}
        bg={colors.secondary}
      />

      <View style={styles.empStatsGrid}>
        <View style={styles.empStatItem}>
          <Text style={[styles.empStatVal, { color: colors.foreground }]}>
            {emp.totalTasks}
          </Text>
          <Text style={[styles.empStatKey, { color: colors.mutedForeground }]}>
            Jami
          </Text>
        </View>
        <View style={styles.empStatItem}>
          <Text style={[styles.empStatVal, { color: "#16a34a" }]}>
            {emp.onTime}
          </Text>
          <Text style={[styles.empStatKey, { color: colors.mutedForeground }]}>
            O'z vaqtida
          </Text>
        </View>
        <View style={styles.empStatItem}>
          <Text
            style={[
              styles.empStatVal,
              { color: emp.delayedCompleted + emp.late > 0 ? "#e11d48" : colors.foreground },
            ]}
          >
            {emp.delayedCompleted + emp.late}
          </Text>
          <Text style={[styles.empStatKey, { color: colors.mutedForeground }]}>
            Kechikdi
          </Text>
        </View>
        <View style={styles.empStatItem}>
          <Text
            style={[
              styles.empStatVal,
              { color: emp.avgDelayDays > 0 ? "#d97706" : colors.foreground },
            ]}
          >
            {emp.avgDelayDays > 0 ? `${emp.avgDelayDays}k` : "—"}
          </Text>
          <Text style={[styles.empStatKey, { color: colors.mutedForeground }]}>
            O'rtacha kech
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissions } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("umumiy");
  const [isExporting, setIsExporting] = useState(false);

  const { data: statsData, isLoading: statsLoading } = useGetMonitoringStats();
  const { data: rowsData, isLoading: rowsLoading } = useGetMonitoringRows();

  const topPad = Platform.OS === "web" ? 67 : 0;
  const isLoading = statsLoading || rowsLoading;

  const employeeStats = useMemo(() => {
    const rows = (rowsData?.rows ?? []) as TaskRow[];
    return computeEmployeeStats(rows);
  }, [rowsData]);

  const topPerformers = employeeStats.slice(0, 3);
  const mostDelayed = [...employeeStats]
    .filter((e) => e.avgDelayDays > 0)
    .sort((a, b) => b.avgDelayDays - a.avgDelayDays)
    .slice(0, 3);

  const handleExport = async () => {
    const rows = (rowsData?.rows ?? []) as TaskRow[];
    if (rows.length === 0) {
      Alert.alert("Ma'lumot yo'q", "Eksport qilish uchun topshiriqlar mavjud emas.");
      return;
    }

    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");

      const sheetRows = rows.map((r) => {
        let holat = r.holati ?? "";
        if (r.kechikishMatn?.trim()) holat = r.kechikishMatn.trim();
        else if (r.holati === "Jarayonda" && r.topshirishSana) {
          // Parse DD/MM/YYYY FIRST — new Date("03/06/2026") wrongly → March 6
          const dmy = r.topshirishSana.replace(/^[A-Za-z]+,\s*/, "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          const deadline = dmy
            ? new Date(+dmy[3], +dmy[2] - 1, +dmy[1], 12, 0, 0, 0)
            : (() => { const d = new Date(r.topshirishSana!.replace(/^[A-Za-z]+,\s*/, "")); return isNaN(d.getTime()) ? null : d; })();
          if (deadline) {
            const dl = new Date(deadline); dl.setHours(0, 0, 0, 0);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const diff = Math.round((dl.getTime() - today.getTime()) / (1000*60*60*24));
            holat = diff < 0 ? `Kechikmoqda — ${Math.abs(diff)} kun` : diff === 0 ? "Jarayonda — Bugun muddat" : `Jarayonda — ${diff} kun qoldi`;
          }
        }
        return {
          "Sana": r.berilganSana ?? "",
          "Bo'lim": r.bolim ?? "",
          "Xodim": r.fish ?? "",
          "Topshiriq": r.topshiriq ?? "",
          "Holat": holat,
        };
      });

      const ws = XLSX.utils.json_to_sheet(sheetRows);

      // Column widths
      ws["!cols"] = [
        { wch: 12 },
        { wch: 22 },
        { wch: 24 },
        { wch: 42 },
        { wch: 28 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Topshiriqlar");

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Statistika_${dateStr}.xlsx`;

      if (Platform.OS === "web") {
        XLSX.writeFile(wb, fileName);
      } else {
        const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "Excel faylni ulashish",
          });
        } else {
          Alert.alert("Saqlandi", `Fayl saqlandi: ${fileName}`);
        }
      }
    } catch (err) {
      console.error("[StatsExport] Error:", err);
      Alert.alert("Xato", "Eksport qilishda xatolik yuz berdi.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const stats = statsData;
  if (!stats) return null;

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const pending = (stats as any).pending ?? 0;

  const TABS: { id: Tab; label: string }[] = [
    { id: "umumiy", label: "Umumiy" },
    ...(permissions.canMonitorProgress
      ? [
          { id: "xodimlar" as Tab, label: "Xodimlar" },
          { id: "bolimlar" as Tab, label: "Bo'limlar" },
        ]
      : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab bar + export button */}
      <View
        style={[
          styles.tabBar,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.tabsRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              style={[
                styles.tabItem,
                activeTab === tab.id && {
                  borderBottomColor: colors.primary,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color:
                      activeTab === tab.id
                        ? colors.primary
                        : colors.mutedForeground,
                    fontFamily:
                      activeTab === tab.id ? "Inter_700Bold" : "Inter_400Regular",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Excel export button */}
        {permissions.canMonitorProgress && (
          <Pressable
            style={({ pressed }) => [
              styles.exportBtn,
              {
                backgroundColor: isExporting ? colors.secondary : "#dcfce7",
                borderColor: "#bbf7d0",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
              <Feather name="download" size={14} color="#16a34a" />
            )}
            <Text style={styles.exportBtnText}>
              {isExporting ? "…" : "Excel"}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 16,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── UMUMIY tab ──────────────────────────────────── */}
        {activeTab === "umumiy" && (
          <>
            <View style={styles.statsGrid}>
              <StatsCard
                title="Jami"
                value={stats.total}
                icon="list"
                color={colors.chartBlue}
                bg={colors.secondary}
              />
              <StatsCard
                title="Yakunlandi"
                value={stats.completed}
                icon="check-circle"
                color={colors.statusCompleted}
                bg={colors.statusCompletedBg}
              />
            </View>
            <View style={[styles.statsGrid, { marginTop: 10 }]}>
              <StatsCard
                title="Kechikdi"
                value={stats.late}
                icon="alert-circle"
                color={colors.statusLate}
                bg={colors.statusLateBg}
              />
              <StatsCard
                title="Tekshirishda"
                value={pending}
                icon="eye"
                color="#7c3aed"
                bg="#ede9fe"
              />
            </View>

            {/* Overall progress */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderRadius: colors.radius,
                  borderColor: colors.border,
                  marginTop: 16,
                },
              ]}
            >
              <View style={styles.progressHeader}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  Bajarilish darajasi
                </Text>
                <Text style={[styles.progressPct, { color: colors.primary }]}>
                  {completionRate}%
                </Text>
              </View>
              <ProgressBar
                value={completionRate}
                color={
                  completionRate >= 80
                    ? colors.statusCompleted
                    : completionRate >= 50
                    ? colors.statusInProgress
                    : colors.statusLate
                }
                bg={colors.secondary}
              />
            </View>

            {/* Quick top performers */}
            {permissions.canMonitorProgress && topPerformers.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    Top Xodimlar
                  </Text>
                  <Pressable onPress={() => setActiveTab("xodimlar")}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>
                      Barchasi →
                    </Text>
                  </Pressable>
                </View>
                {topPerformers.map((emp, i) => {
                  const meta = RATING_META[emp.rating];
                  return (
                    <View
                      key={emp.fish}
                      style={[
                        styles.quickEmpRow,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderRadius: colors.radius,
                        },
                      ]}
                    >
                      <RankMedal rank={i + 1} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.empName, { color: colors.foreground }]}
                        >
                          {emp.fish}
                        </Text>
                        <Text
                          style={[
                            styles.empMeta,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {emp.bolim}
                        </Text>
                      </View>
                      <RatingBadge rating={emp.rating} />
                      <Text style={[styles.empScore, { color: meta.color }]}>
                        {emp.productivityScore}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ── XODIMLAR tab ────────────────────────────────── */}
        {activeTab === "xodimlar" && (
          <>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderRadius: colors.radius,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Ball hisoblash
              </Text>
              <Text
                style={[styles.legendText, { color: colors.mutedForeground }]}
              >
                O'z vaqtida: +60% ta'sir · Boshliq tasdiqladimi: +20% · Kechikish: −20%{"\n"}
                100 ball = A'lo · 55+ = Yaxshi · 30+ = O'rtacha · &lt;30 = Yomon
              </Text>
            </View>

            {mostDelayed.length > 0 && (
              <>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: "#be123c", marginTop: 16 },
                  ]}
                >
                  ⚠ Ko'p kechikkanlar
                </Text>
                {mostDelayed.map((emp) => (
                  <View
                    key={emp.fish + "-delay"}
                    style={[
                      styles.quickEmpRow,
                      {
                        backgroundColor: "#fff1f2",
                        borderColor: "#fecdd3",
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <Feather name="alert-triangle" size={18} color="#e11d48" />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.empName, { color: colors.foreground }]}
                      >
                        {emp.fish}
                      </Text>
                      <Text
                        style={[styles.empMeta, { color: "#9f1239" }]}
                      >
                        O'rtacha {emp.avgDelayDays} kun kechikish
                      </Text>
                    </View>
                    <Text style={[styles.empScore, { color: "#e11d48" }]}>
                      {emp.productivityScore}
                    </Text>
                  </View>
                ))}
              </>
            )}

            <Text
              style={[
                styles.sectionTitle,
                { color: colors.foreground, marginTop: 20 },
              ]}
            >
              Reyting jadvali
            </Text>
            {employeeStats.map((emp, i) => (
              <EmployeeCard key={emp.fish} emp={emp} rank={i + 1} />
            ))}
          </>
        )}

        {/* ── BO'LIMLAR tab ───────────────────────────────── */}
        {activeTab === "bolimlar" && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.foreground, marginTop: 0 },
              ]}
            >
              Bo'limlar samaradorligi
            </Text>
            {stats.departments.map((dept) => {
              const pct =
                dept.total > 0
                  ? Math.round((dept.completed / dept.total) * 100)
                  : 0;
              const deptPending =
                (dept as any).pending ?? 0;
              const barColor =
                pct >= 80
                  ? colors.statusCompleted
                  : pct >= 50
                  ? colors.statusInProgress
                  : colors.statusLate;

              return (
                <View
                  key={dept.name}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderRadius: colors.radius,
                      borderColor: colors.border,
                      marginBottom: 10,
                    },
                  ]}
                >
                  <View style={styles.deptHeader}>
                    <Text style={[styles.deptName, { color: colors.foreground }]}>
                      {dept.name}
                    </Text>
                    <Text
                      style={[
                        styles.progressPct,
                        { color: barColor, fontSize: 18 },
                      ]}
                    >
                      {pct}%
                    </Text>
                  </View>
                  <View style={styles.deptChips}>
                    <View
                      style={[
                        styles.deptChip,
                        { backgroundColor: colors.secondary },
                      ]}
                    >
                      <Text
                        style={[styles.deptChipText, { color: colors.mutedForeground }]}
                      >
                        {dept.total} jami
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.deptChip,
                        { backgroundColor: colors.statusCompletedBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.deptChipText,
                          { color: colors.statusCompleted },
                        ]}
                      >
                        {dept.completed} yakunlandi
                      </Text>
                    </View>
                    {dept.late > 0 && (
                      <View
                        style={[
                          styles.deptChip,
                          { backgroundColor: colors.statusLateBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.deptChipText,
                            { color: colors.statusLate },
                          ]}
                        >
                          {dept.late} kechikdi
                        </Text>
                      </View>
                    )}
                    {deptPending > 0 && (
                      <View
                        style={[styles.deptChip, { backgroundColor: "#ede9fe" }]}
                      >
                        <Text
                          style={[styles.deptChipText, { color: "#7c3aed" }]}
                        >
                          {deptPending} tekshirishda
                        </Text>
                      </View>
                    )}
                  </View>
                  <ProgressBar
                    value={pct}
                    color={barColor}
                    bg={colors.secondary}
                  />

                  {(() => {
                    const deptEmps = employeeStats.filter(
                      (e) => e.bolim === dept.name,
                    );
                    if (deptEmps.length === 0) return null;
                    return (
                      <View style={styles.deptEmpList}>
                        {deptEmps.map((emp, idx) => (
                          <View key={emp.fish} style={styles.deptEmpRow}>
                            <Text
                              style={[
                                styles.deptEmpName,
                                { color: colors.foreground },
                              ]}
                            >
                              {idx + 1}. {emp.fish}
                            </Text>
                            <RatingBadge rating={emp.rating} />
                            <Text
                              style={[
                                styles.deptEmpScore,
                                { color: RATING_META[emp.rating].color },
                              ]}
                            >
                              {emp.productivityScore}b
                            </Text>
                          </View>
                        ))}
                      </View>
                    );
                  })()}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabsRow: {
    flexDirection: "row",
    flex: 1,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabLabel: { fontSize: 14 },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  exportBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#16a34a",
  },
  statsGrid: { flexDirection: "row", gap: 10 },
  card: { padding: 16, borderWidth: 1, marginBottom: 0 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressPct: { fontSize: 22, fontFamily: "Inter_700Bold" },
  progressBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, minWidth: 4 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  quickEmpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  medal: { fontSize: 22 },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#475569" },
  empCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  empHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  empName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  empMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  empScoreWrap: { alignItems: "center" },
  empScore: { fontSize: 22, fontFamily: "Inter_700Bold" },
  empScoreLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  empTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  empProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  empProgressLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  empProgressPct: { fontSize: 12, fontFamily: "Inter_700Bold" },
  empStatsGrid: {
    flexDirection: "row",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
  },
  empStatItem: { flex: 1, alignItems: "center" },
  empStatVal: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  empStatKey: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  legendText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  deptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  deptName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  deptChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  deptChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deptChipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  deptEmpList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    gap: 8,
  },
  deptEmpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deptEmpName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  deptEmpScore: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
