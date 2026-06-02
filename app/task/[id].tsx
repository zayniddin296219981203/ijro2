import React, { useState, useMemo, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePatchMonitoringRow,
  useDeleteMonitoringRow,
  useGetMonitoringStaff,
  getGetMonitoringRowsQueryKey,
  getGetMonitoringStatsQueryKey,
  type StaffMember,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import type { TaskRow } from "@/components/TaskCard";
import { parseDeadline, daysBetween, formatDMY } from "@/utils/dateUtils";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number | undefined;
}) {
  const colors = useColors();
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <View style={styles.infoLabel}>
        <Feather name={icon} size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoLabelText, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>
        {String(value)}
      </Text>
    </View>
  );
}

export default function TaskDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { permissions, role, userName } = useAuth();
  const params = useLocalSearchParams<{ id: string; data: string }>();
  const queryClient = useQueryClient();
  const patchRow = usePatchMonitoringRow();
  const deleteRow = useDeleteMonitoringRow();
  const { data: staffData } = useGetMonitoringStaff();

  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [completedDate, setCompletedDate] = useState<string | null>(null);
  const [localApproved, setLocalApproved] = useState(false);
  const [localKechikishMatn, setLocalKechikishMatn] = useState<string | null>(null);

  // Live "now" — refreshes every hour so countdown labels never go stale
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editFish, setEditFish] = useState("");
  const [editBolim, setEditBolim] = useState("");
  const [editLavozim, setEditLavozim] = useState("");
  const [editTopshiriq, setEditTopshiriq] = useState("");
  const [editMuddat, setEditMuddat] = useState("");
  const [editBerilganSana, setEditBerilganSana] = useState("");
  const [editTopshirishSana, setEditTopshirishSana] = useState("");
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");

  let task: TaskRow | null = null;
  try {
    if (params.data) task = JSON.parse(params.data) as TaskRow;
  } catch {
    task = null;
  }

  if (!task) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>
          Topshiriq topilmadi
        </Text>
      </View>
    );
  }

  const taskId = task.id;
  const effectiveStatus = localStatus ?? task.holati;
  const isCompleted = effectiveStatus === "Yakunlandi";
  const isPending = effectiveStatus === "Tekshirishda";
  const isApproved = task.tugatishBelgilash || localApproved;
  const isSaving = patchRow.isPending || deleteRow.isPending;
  const kechikishMatn = localKechikishMatn ?? task.kechikishMatn?.trim() ?? "";
  const showDelayBanner = kechikishMatn.length > 0 && (isCompleted || isPending);
  const delayIsLate = kechikishMatn.includes("kech");
  const delayIsEarly = kechikishMatn.includes("erta") || kechikishMatn.includes("avval");

  const refetchCaches = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: getGetMonitoringRowsQueryKey() }),
      queryClient.refetchQueries({ queryKey: getGetMonitoringStatsQueryKey() }),
    ]);
  };

  const extractError = (err: unknown): { msg: string; isProtected: boolean } => {
    const fallback = "Saqlashda xatolik yuz berdi. Qayta urinib ko'ring.";
    if (!err || typeof err !== "object") return { msg: fallback, isProtected: false };
    const anyErr = err as {
      data?: { error?: string; protected?: boolean } | null;
      response?: { data?: { error?: string; protected?: boolean } };
      message?: string;
    };
    const data = anyErr.data ?? anyErr.response?.data;
    if (data && typeof data === "object" && data.error) {
      return { msg: data.error, isProtected: !!data.protected };
    }
    return { msg: anyErr.message ?? fallback, isProtected: false };
  };

  const handleMarkDone = () => {
    const today = new Date();
    const deadline = parseDeadline(task!.topshirishSana);
    // daysBetween(today, deadline): positive = late (today after deadline), negative = early
    const diff = deadline ? daysBetween(today, deadline) : 0;
    const todayStr = formatDMY(today);
    const deadlineLabel = task!.topshirishSana?.replace(/^[A-Za-z]+,\s*/, "") ?? "—";

    const computeNote = (d: number): string => {
      if (d > 0) return `${d} kun kech bajarilgan`;
      if (d < 0) return `${Math.abs(d)} kun erta bajarilgan`;
      return "O'z vaqtida bajarilgan";
    };

    const doSubmit = (d: number) => {
      const noteText = computeNote(d);
      patchRow.mutate(
        {
          id: taskId,
          data: {
            holati: "Tekshirishda",
            ishTugatilishiKun: todayStr,
            kechikkanKun: noteText,
          },
        },
        {
          onSuccess: async () => {
            setLocalStatus("Tekshirishda");
            setCompletedDate(todayStr);
            setLocalKechikishMatn(noteText);
            await refetchCaches();
            Alert.alert(
              d > 0 ? "Kechikish bilan topshirildi" : "Tekshirishda",
              d > 0
                ? `${d} kun kechikib topshirildi.\nBoshliq tasdiqlashini kuting.\n\n✓ Google Sheets ga saqlandi.`
                : d < 0
                  ? `${Math.abs(d)} kun erta topshirildi.\nBoshliq tasdiqlashini kuting.\n\n✓ Google Sheets ga saqlandi.`
                  : "Topshiriq o'z vaqtida topshirildi.\nBoshliq tasdiqlashini kuting.\n\n✓ Google Sheets ga saqlandi.",
            );
          },
          onError: (err) => {
            const { msg, isProtected } = extractError(err);
            Alert.alert(
              isProtected ? "Sheets himoyalangan" : "Saqlanmadi",
              msg,
            );
          },
        },
      );
    };

    if (diff > 0) {
      Alert.alert(
        "Kechikish bilan topshirish",
        `Muddat: ${deadlineLabel}\n\nBugun topshirsangiz ${diff} kun kechikkan bo'ladi.\n\nBaribir topshirmoqchimisiz?`,
        [
          { text: "Bekor qilish", style: "cancel" },
          {
            text: `${diff} kun kech topshirish`,
            style: "destructive",
            onPress: () => doSubmit(diff),
          },
        ],
      );
    } else if (diff < 0) {
      const daysEarly = Math.abs(diff);
      Alert.alert(
        "Muddatidan oldin bajardim",
        `Muddatdan ${daysEarly} kun oldin topshirmoqchimisiz?`,
        [
          { text: "Bekor qilish", style: "cancel" },
          {
            text: `Ha, ${daysEarly} kun erta bajardim`,
            onPress: () => doSubmit(diff),
          },
        ],
      );
    } else {
      Alert.alert(
        "Bajardim",
        "Bu topshiriqni bajarilgan deb belgilamoqchimisiz?",
        [
          { text: "Bekor qilish", style: "cancel" },
          { text: "Ha, o'z vaqtida bajardim", onPress: () => doSubmit(0) },
        ],
      );
    }
  };

  const handleApprove = () => {
    const statusLabel = kechikishMatn || "bajarilgan";
    Alert.alert(
      "Tasdiqlash",
      `Bu topshiriq ${statusLabel}.\n\nYakunlandi deb tasdiqlaysizmi?`,
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Tasdiqlash",
          onPress: () => {
            patchRow.mutate(
              {
                id: taskId,
                data: { holati: "Yakunlandi", tugatishBelgilash: true },
              },
              {
                onSuccess: async () => {
                  setLocalApproved(true);
                  setLocalStatus("Yakunlandi");
                  await refetchCaches();
                  Alert.alert(
                    "Tasdiqlandi ✓",
                    (kechikishMatn
                      ? `Topshiriq: ${kechikishMatn}.`
                      : "Topshiriq yakunlandi.") +
                      "\n\n✓ Google Sheets ga saqlandi.",
                  );
                },
                onError: (err) => {
                  const { msg, isProtected } = extractError(err);
                  Alert.alert(
                    isProtected ? "Sheets himoyalangan" : "Tasdiqlanmadi",
                    msg,
                  );
                },
              },
            );
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "O'chirish",
      `"${task!.topshiriq}" topshirig'ini o'chirmoqchimisiz?\n\nBu amal bekor qilinmaydi.`,
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "O'chirish",
          style: "destructive",
          onPress: () => {
            deleteRow.mutate(
              { id: taskId },
              {
                onSuccess: async () => {
                  await refetchCaches();
                  router.back();
                },
                onError: (err) => {
                  const { msg, isProtected } = extractError(err);
                  Alert.alert(
                    isProtected ? "Sheets himoyalangan" : "O'chirilmadi",
                    msg,
                  );
                },
              },
            );
          },
        },
      ],
    );
  };

  const openEdit = () => {
    setEditFish(task!.fish ?? "");
    setEditBolim(task!.bolim ?? "");
    setEditLavozim(task!.lavozim ?? "");
    setEditTopshiriq(task!.topshiriq ?? "");
    setEditMuddat(task!.muddat != null ? String(task!.muddat) : "");
    setEditBerilganSana(task!.berilganSana ?? "");
    setEditTopshirishSana(
      task!.topshirishSana?.replace(/^[A-Za-z]+,\s*/, "") ?? "",
    );
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editFish.trim()) {
      Alert.alert("Xato", "Xodim ismi majburiy");
      return;
    }
    if (!editTopshiriq.trim()) {
      Alert.alert("Xato", "Topshiriq mazmuni majburiy");
      return;
    }
    patchRow.mutate(
      {
        id: taskId,
        data: {
          fish: editFish.trim(),
          bolim: editBolim.trim() || undefined,
          lavozim: editLavozim.trim() || undefined,
          topshiriq: editTopshiriq.trim(),
          muddat: editMuddat ? Number(editMuddat) : undefined,
          berilganSana: editBerilganSana.trim() || undefined,
          topshirishSana: editTopshirishSana.trim() || undefined,
        },
      },
      {
        onSuccess: async () => {
          setEditOpen(false);
          await refetchCaches();
          Alert.alert("Saqlandi ✓", "Topshiriq muvaffaqiyatli yangilandi.\n\n✓ Google Sheets ga saqlandi.");
        },
        onError: (err) => {
          const { msg, isProtected } = extractError(err);
          Alert.alert(
            isProtected ? "Sheets himoyalangan" : "Saqlanmadi",
            msg,
          );
        },
      },
    );
  };

  // Bidirectional deadline in edit modal
  const computeTopshirishSana = (muddatDays: string, baseSana: string): string => {
    const days = parseInt(muddatDays, 10);
    if (isNaN(days) || days <= 0) return "";
    const base = parseDeadline(baseSana);
    if (!base) return "";
    const result = new Date(base);
    result.setDate(result.getDate() + days);
    return formatDMY(result);
  };

  const computeMuddat = (tSana: string, baseSana: string): string => {
    const deadline = parseDeadline(tSana);
    const base = parseDeadline(baseSana);
    if (!deadline || !base) return "";
    const days = Math.round((deadline.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? String(days) : "";
  };

  const handleEditMuddatChange = (v: string) => {
    setEditMuddat(v);
    if (v.trim()) {
      const computed = computeTopshirishSana(v, editBerilganSana);
      if (computed) setEditTopshirishSana(computed);
    }
  };

  const handleEditTopshirishSanaChange = (v: string) => {
    setEditTopshirishSana(v);
    if (v.length >= 10) {
      const computed = computeMuddat(v, editBerilganSana);
      if (computed) setEditMuddat(computed);
    }
  };

  // Staff picker for edit modal
  const staffList = useMemo(() => {
    const all = (staffData?.staff ?? []) as StaffMember[];
    if (!staffSearch.trim()) return all;
    const q = staffSearch.trim().toLowerCase();
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.bolim ?? "").toLowerCase().includes(q),
    );
  }, [staffData, staffSearch]);

  const selectStaff = (member: StaffMember) => {
    setEditFish(member.name);
    setEditBolim(member.bolim ?? "");
    setEditLavozim(member.lavozim ?? "");
    setStaffPickerOpen(false);
    setStaffSearch("");
  };

  const showMarkDone =
    permissions.canMarkComplete &&
    !isCompleted &&
    !isPending &&
    role === "employee";
  const showApprove =
    permissions.canApproveTask && isPending && !isCompleted && role !== "employee";
  const showEdit = permissions.canEditTask && role !== "employee";
  const showDelete = permissions.canDeleteTask && role !== "employee";
  const hasActions = showMarkDone || showApprove || showEdit || showDelete;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom + (hasActions ? 80 : 0) + (Platform.OS === "web" ? 34 : 24),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={[
            styles.headerCard,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
        >
          <Text style={styles.taskTitle}>{task.topshiriq}</Text>
          <View style={styles.headerMeta}>
            <Text style={styles.headerName}>{task.fish}</Text>
            <StatusBadge status={effectiveStatus} />
          </View>
        </View>

        {/* Saving indicator */}
        {isSaving && (
          <View
            style={[
              styles.savingBanner,
              { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderRadius: colors.radius },
            ]}
          >
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={[styles.savingText, { color: "#1e40af" }]}>
              Google Sheets ga saqlanmoqda…
            </Text>
          </View>
        )}

        {/* Delay banner */}
        {showDelayBanner && (
          <View
            style={[
              styles.banner,
              {
                backgroundColor: delayIsLate ? "#fff1f2" : delayIsEarly ? "#dcfce7" : "#dbeafe",
                borderColor: delayIsLate ? "#fecdd3" : delayIsEarly ? "#bbf7d0" : "#bfdbfe",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather
              name={delayIsLate ? "alert-triangle" : delayIsEarly ? "award" : "check-circle"}
              size={15}
              color={delayIsLate ? "#e11d48" : delayIsEarly ? "#16a34a" : "#2563eb"}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.bannerTitle,
                  { color: delayIsLate ? "#be123c" : delayIsEarly ? "#15803d" : "#1e40af" },
                ]}
              >
                {kechikishMatn}
              </Text>
              {(completedDate ?? task.ishTugatilishiKun) && (
                <Text
                  style={[
                    styles.bannerDesc,
                    { color: delayIsLate ? "#9f1239" : delayIsEarly ? "#16a34a" : "#2563eb" },
                  ]}
                >
                  Topshirilgan:{" "}
                  {completedDate ?? task.ishTugatilishiKun} · Muddat:{" "}
                  {task.topshirishSana?.replace(/^[A-Za-z]+,\s*/, "") ?? "—"}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Pending */}
        {isPending && (
          <View
            style={[
              styles.banner,
              { backgroundColor: "#ede9fe", borderColor: "#ddd6fe", borderRadius: colors.radius },
            ]}
          >
            <Feather name="clock" size={15} color="#7c3aed" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: "#6d28d9" }]}>
                Boshliq tasdiqlashini kutmoqda
              </Text>
              <Text style={[styles.bannerDesc, { color: "#7c3aed" }]}>
                {kechikishMatn || "Boshliq tasdiqlashini kutilmoqda"}
              </Text>
            </View>
          </View>
        )}

        {/* Deadline countdown banner for active (Jarayonda / Kechikdi) tasks */}
        {!isPending && !isCompleted && (() => {
          const deadline = parseDeadline(task.topshirishSana);
          if (!deadline) return null;
          const today = new Date(now);
          today.setHours(0, 0, 0, 0);
          const target = new Date(deadline);
          target.setHours(0, 0, 0, 0);
          const daysLeft = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const dateLabel = task.topshirishSana?.replace(/^[A-Za-z]+,\s*/, "") ?? "—";
          if (daysLeft < 0) {
            return (
              <View
                style={[
                  styles.banner,
                  { backgroundColor: "#fff1f2", borderColor: "#fecdd3", borderRadius: colors.radius },
                ]}
              >
                <Feather name="alert-circle" size={15} color="#e11d48" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerTitle, { color: "#be123c" }]}>
                    Muddat o'tib ketdi — {Math.abs(daysLeft)} kun kechikdi
                  </Text>
                  <Text style={[styles.bannerDesc, { color: "#9f1239" }]}>
                    Topshirish sanasi: {dateLabel}
                  </Text>
                </View>
              </View>
            );
          }
          if (daysLeft === 0) {
            return (
              <View
                style={[
                  styles.banner,
                  { backgroundColor: "#fef3c7", borderColor: "#fde68a", borderRadius: colors.radius },
                ]}
              >
                <Feather name="alert-triangle" size={15} color="#b45309" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerTitle, { color: "#92400e" }]}>
                    Bugun muddati tugaydi
                  </Text>
                  <Text style={[styles.bannerDesc, { color: "#78350f" }]}>
                    Topshirish sanasi: {dateLabel}
                  </Text>
                </View>
              </View>
            );
          }
          return (
            <View
              style={[
                styles.banner,
                { backgroundColor: "#f0f9ff", borderColor: "#bae6fd", borderRadius: colors.radius },
              ]}
            >
              <Feather name="clock" size={15} color="#0369a1" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: "#075985" }]}>
                  {daysLeft} kun qoldi
                </Text>
                <Text style={[styles.bannerDesc, { color: "#0c4a6e" }]}>
                  Topshirish sanasi: {dateLabel}
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Role badge */}
        <View
          style={[
            styles.permBadge,
            {
              backgroundColor:
                role === "admin" ? "#eff6ff" : role === "boss" ? "#f5f3ff" : "#ecfeff",
              borderColor:
                role === "admin" ? "#bfdbfe" : role === "boss" ? "#ddd6fe" : "#a5f3fc",
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather
            name={role === "admin" ? "shield" : role === "boss" ? "star" : "user"}
            size={13}
            color={role === "admin" ? "#1e40af" : role === "boss" ? "#6d28d9" : "#0e7490"}
          />
          <Text
            style={[
              styles.permBadgeText,
              {
                color:
                  role === "admin" ? "#1e40af" : role === "boss" ? "#6d28d9" : "#0e7490",
              },
            ]}
          >
            {role === "admin"
              ? "Admin — to'liq huquq"
              : role === "boss"
              ? "Boshliq — boshqarish huquqi"
              : "Xodim — faqat ko'rish va bajarish"}
          </Text>
        </View>

        {/* Details */}
        <View
          style={[
            styles.detailCard,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius,
              borderColor: colors.border,
            },
          ]}
        >
          <InfoRow icon="user" label="Xodim" value={task.fish} />
          <InfoRow icon="briefcase" label="Bo'lim" value={task.bolim} />
          <InfoRow icon="award" label="Lavozim" value={task.lavozim} />
          <InfoRow icon="clipboard" label="Topshiriq" value={task.topshiriq} />
          <InfoRow icon="clock" label="Muddat (kun)" value={task.muddat} />
          <InfoRow icon="calendar" label="Berilgan sana" value={task.berilganSana} />
          <InfoRow
            icon="calendar"
            label="Topshirish sanasi"
            value={task.topshirishSana?.replace(/^[A-Za-z]+,\s*/, "")}
          />
          {kechikishMatn ? (
            <InfoRow
              icon={delayIsLate ? "alert-triangle" : delayIsEarly ? "award" : "check"}
              label="Bajarilish natijasi"
              value={kechikishMatn}
            />
          ) : null}
          {(completedDate ?? task.ishTugatilishiKun) && (
            <InfoRow
              icon="check-circle"
              label="Topshirilgan sana"
              value={completedDate ?? task.ishTugatilishiKun}
            />
          )}
          <InfoRow
            icon="check-square"
            label="Boshliq tasdiqladi"
            value={isApproved ? "Ha ✓" : "Yo'q"}
          />
          <InfoRow icon="hash" label="ID" value={task.id} />
        </View>

        {/* Sync badge */}
        {patchRow.isSuccess && !isSaving && (
          <View
            style={[
              styles.syncBadge,
              {
                backgroundColor: colors.statusCompletedBg,
                borderColor: "#bbf7d0",
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="check-circle" size={13} color={colors.statusCompleted} />
            <Text style={[styles.syncText, { color: colors.statusCompleted }]}>
              Muvaffaqiyatli saqlandi ✓
            </Text>
          </View>
        )}

        {/* Actions */}
        {hasActions && (
          <View style={styles.actionsRow}>
            {showMarkDone && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: isSaving ? "#9ca3af" : colors.statusCompleted,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.85 : 1,
                    flex: 1,
                  },
                ]}
                onPress={handleMarkDone}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="check-circle" size={16} color="#fff" />
                )}
                <Text style={styles.actionBtnText}>
                  {isSaving ? "Saqlanmoqda…" : "Bajardim"}
                </Text>
              </Pressable>
            )}
            {showApprove && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: isSaving ? "#9ca3af" : "#7c3aed",
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.85 : 1,
                    flex: 1,
                  },
                ]}
                onPress={handleApprove}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="star" size={16} color="#fff" />
                )}
                <Text style={styles.actionBtnText}>
                  {isSaving
                    ? "Saqlanmoqda…"
                    : delayIsLate
                    ? `Kechikish bilan Tasdiqlash`
                    : "Yakunlandi (Tasdiqlash)"}
                </Text>
              </Pressable>
            )}
            {showEdit && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.85 : 1,
                    flex: showDelete ? 1 : 2,
                  },
                ]}
                onPress={openEdit}
                disabled={isSaving}
              >
                <Feather name="edit-2" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Tahrirlash</Text>
              </Pressable>
            )}
            {showDelete && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: isSaving ? "#9ca3af" : colors.destructive,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.85 : 1,
                    flex: 1,
                  },
                ]}
                onPress={handleDelete}
                disabled={isSaving}
              >
                {deleteRow.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="trash-2" size={16} color="#fff" />
                )}
                <Text style={styles.actionBtnText}>
                  {deleteRow.isPending ? "O'chirilmoqda…" : "O'chirish"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Edit Modal ── */}
      <Modal
        visible={editOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Tahrirlash
              </Text>
              <Pressable onPress={() => setEditOpen(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
            >
              {/* Staff picker button */}
              <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>
                XODIM ISMI *
              </Text>
              <Pressable
                style={[
                  styles.pickerBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: editFish ? colors.primary : colors.border,
                    borderRadius: colors.radius - 4,
                    marginBottom: 12,
                  },
                ]}
                onPress={() => setStaffPickerOpen(true)}
              >
                <Text
                  style={[
                    styles.pickerBtnText,
                    { color: editFish ? colors.foreground : colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {editFish || "Xodimni tanlang..."}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
              </Pressable>

              <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>BO'LIM</Text>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    backgroundColor: editFish ? colors.secondary : colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius - 4,
                    color: colors.foreground,
                    marginBottom: 12,
                  },
                ]}
                value={editBolim}
                onChangeText={setEditBolim}
                placeholder="Bo'lim"
                placeholderTextColor={colors.mutedForeground}
                editable={!editFish}
              />

              <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>LAVOZIM</Text>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    backgroundColor: editFish ? colors.secondary : colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius - 4,
                    color: colors.foreground,
                    marginBottom: 12,
                  },
                ]}
                value={editLavozim}
                onChangeText={setEditLavozim}
                placeholder="Lavozim"
                placeholderTextColor={colors.mutedForeground}
                editable={!editFish}
              />

              <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>
                TOPSHIRIQ *
              </Text>
              <TextInput
                style={[
                  styles.editInput,
                  styles.editInputMulti,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius - 4,
                    color: colors.foreground,
                    marginBottom: 12,
                  },
                ]}
                value={editTopshiriq}
                onChangeText={setEditTopshiriq}
                placeholder="Topshiriq mazmuni"
                placeholderTextColor={colors.mutedForeground}
                multiline
              />

              <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>
                BERILGAN SANA
              </Text>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius - 4,
                    color: colors.foreground,
                    marginBottom: 12,
                  },
                ]}
                value={editBerilganSana}
                onChangeText={setEditBerilganSana}
                placeholder="KK/OO/YYYY"
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>
                MUDDAT (KUN)
              </Text>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius - 4,
                    color: colors.foreground,
                    marginBottom: 12,
                  },
                ]}
                value={editMuddat}
                onChangeText={handleEditMuddatChange}
                placeholder="5"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />

              <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>
                TOPSHIRISH SANASI
              </Text>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius - 4,
                    color: colors.foreground,
                    marginBottom: 20,
                  },
                ]}
                value={editTopshirishSana}
                onChangeText={handleEditTopshirishSanaChange}
                placeholder="KK/OO/YYYY"
                placeholderTextColor={colors.mutedForeground}
              />

              {/* Save / Cancel */}
              <Pressable
                style={({ pressed }) => [
                  styles.editSaveBtn,
                  {
                    backgroundColor: patchRow.isPending ? "#9ca3af" : colors.statusCompleted,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={handleSaveEdit}
                disabled={patchRow.isPending}
              >
                {patchRow.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="save" size={16} color="#fff" />
                )}
                <Text style={styles.editSaveBtnText}>
                  {patchRow.isPending ? "Saqlanmoqda…" : "Saqlash"}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.editCancelBtn,
                  {
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
                onPress={() => setEditOpen(false)}
                disabled={patchRow.isPending}
              >
                <Text style={[styles.editCancelBtnText, { color: colors.mutedForeground }]}>
                  Bekor qilish
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Staff Picker (inside edit modal) */}
      <Modal
        visible={staffPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setStaffPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Xodimni tanlang
              </Text>
              <Pressable onPress={() => setStaffPickerOpen(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
              <Feather name="search" size={15} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                value={staffSearch}
                onChangeText={setStaffSearch}
                placeholder="Ism yoki bo'lim..."
                placeholderTextColor={colors.mutedForeground}
                autoFocus
                autoCorrect={false}
              />
              {staffSearch.length > 0 && (
                <Pressable onPress={() => setStaffSearch("")}>
                  <Feather name="x-circle" size={15} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>

            {staffList.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Xodim topilmadi
                </Text>
              </View>
            ) : (
              <FlatList
                data={staffList}
                keyExtractor={(item) => item.email}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [
                      styles.staffItem,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: pressed ? colors.secondary : "transparent",
                      },
                    ]}
                    onPress={() => selectStaff(item)}
                  >
                    <View style={styles.staffAvatar}>
                      <Text style={styles.staffAvatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.staffName, { color: colors.foreground }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.staffMeta, { color: colors.mutedForeground }]}>
                        {item.bolim} · {item.lavozim}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                  </Pressable>
                )}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 15, fontFamily: "Inter_400Regular" },
  headerCard: { padding: 20, gap: 12 },
  taskTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 28,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  savingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
  },
  savingText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  bannerTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  bannerDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  permBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  permBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  detailCard: { borderWidth: 1, overflow: "hidden" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  infoLabel: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  infoLabelText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
    flex: 1,
    marginLeft: 8,
  },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  syncText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  actionsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    minWidth: 120,
  },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalContent: { padding: 20, paddingBottom: 40 },
  editLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  editInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  editInputMulti: { minHeight: 70, textAlignVertical: "top" },
  pickerBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerBtnText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
    marginRight: 8,
  },
  editSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 10,
  },
  editSaveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  editCancelBtn: {
    alignItems: "center",
    paddingVertical: 13,
    borderWidth: 1,
  },
  editCancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 2,
  },
  staffItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  staffAvatarText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  staffName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  staffMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyWrap: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
