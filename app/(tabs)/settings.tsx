import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useGetMonitoringConfig,
  useUpdateMonitoringConfig,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS, ROLE_META } from "@/utils/permissions";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role, userName, userEmail, userDept, userPosition, logout } = useAuth();

  // Guard: only admin can access settings
  useEffect(() => {
    if (role !== "admin") {
      router.replace("/(tabs)");
    }
  }, [role]);

  const { data: configData, isLoading: configLoading } = useGetMonitoringConfig();
  const updateConfig = useUpdateMonitoringConfig();

  const isConnected = !!(configData as any)?.connected;
  const saEmail: string | undefined = (configData as any)?.serviceAccountEmail;

  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Tasks");
  const [staffSheetName, setStaffSheetName] = useState("Staff");

  useEffect(() => {
    if (configData) {
      setSpreadsheetId((configData as any).spreadsheetId ?? "");
      setSheetName((configData as any).sheetName ?? "Tasks");
      setStaffSheetName((configData as any).staffSheetName ?? "Staff");
    }
  }, [configData]);

  const topPad = Platform.OS === "web" ? 67 : 0;
  const roleMeta = ROLE_META[role];

  const handleLogout = () => {
    Alert.alert("Chiqish", "Tizimdan chiqmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "Chiqish", style: "destructive", onPress: logout },
    ]);
  };

  const handleSaveSheets = async () => {
    if (!spreadsheetId.trim()) {
      Alert.alert("Xato", "Spreadsheet ID kiritilmadi");
      return;
    }
    try {
      await updateConfig.mutateAsync({
        data: {
          spreadsheetId: spreadsheetId.trim(),
          sheetName: sheetName.trim() || "Tasks",
          staffSheetName: staffSheetName.trim() || "Staff",
        },
      });
      Alert.alert(
        "Saqlandi ✓",
        "Google Sheets sozlamalari saqlandi.\n\nRo'yxatni yangilash (swipe down) — ma'lumotlar jonli jadvaldan yuklanadi.",
      );
    } catch {
      Alert.alert("Xato", "Saqlashda xatolik yuz berdi");
    }
  };

  if (role !== "admin") return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + 24,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90),
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Admin profile ──────────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Hisob
      </Text>

      <View
        style={[
          styles.profileCard,
          { backgroundColor: roleMeta.bg, borderRadius: colors.radius },
        ]}
      >
        <View style={styles.profileTop}>
          <View style={styles.avatarWrap}>
            <Feather name="shield" size={24} color={roleMeta.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: roleMeta.text }]}>
              {userName || "Admin"}
            </Text>
            <Text style={[styles.profileEmail, { color: "rgba(255,255,255,0.75)" }]}>
              {userEmail || "—"}
            </Text>
          </View>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{ROLE_LABELS[role]}</Text>
          </View>
        </View>
        {(userDept || userPosition) && (
          <View style={styles.profileExtra}>
            {userDept ? (
              <View style={styles.profileExtraItem}>
                <Feather name="briefcase" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.profileExtraText}>{userDept}</Text>
              </View>
            ) : null}
            {userPosition ? (
              <View style={styles.profileExtraItem}>
                <Feather name="award" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.profileExtraText}>{userPosition}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.logoutBtn,
          { borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={16} color="#dc2626" />
        <Text style={styles.logoutBtnText}>Tizimdan chiqish</Text>
      </Pressable>

      {/* ── Connection status ──────────────────────────────────────── */}
      <View style={styles.divider} />
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Google Sheets
      </Text>

      <View
        style={[
          styles.statusCard,
          {
            backgroundColor: colors.card,
            borderColor: isConnected ? "#bbf7d0" : "#fde68a",
            borderRadius: colors.radius,
            borderWidth: 1.5,
          },
        ]}
      >
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIcon,
              {
                backgroundColor: isConnected ? colors.statusCompletedBg : "#fef3c7",
                borderRadius: 8,
              },
            ]}
          >
            <Feather
              name={isConnected ? "check-circle" : "alert-triangle"}
              size={18}
              color={isConnected ? colors.statusCompleted : "#d97706"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.statusTitleRow}>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                Google Sheets
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isConnected ? colors.statusCompletedBg : "#fef3c7" },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isConnected ? colors.statusCompleted : "#92400e" },
                  ]}
                >
                  {isConnected ? "ULANGAN ✓" : "SOZLANMAGAN"}
                </Text>
              </View>
            </View>
            <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>
              {isConnected
                ? saEmail
                  ? `Hisob: ${saEmail}`
                  : "Jonli ma'lumot yuklanmoqda"
                : "Quyida ulash ko'rsatmalarini bajaring"}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Setup guide ────────────────────────────────────────────── */}
      {!isConnected && (
        <View
          style={[
            styles.setupCard,
            { backgroundColor: "#eff6ff", borderColor: "#bfdbfe", borderRadius: colors.radius },
          ]}
        >
          <View style={styles.setupHeader}>
            <Feather name="key" size={16} color="#1e40af" />
            <Text style={[styles.setupTitle, { color: "#1e40af" }]}>
              Ulash uchun 5 qadam
            </Text>
          </View>
          <View style={styles.stepList}>
            {[
              {
                title: "Sheets API ni yoqing",
                link: "https://console.developers.google.com/apis/api/sheets.googleapis.com",
                linkLabel: "Google Sheets API →",
              },
              {
                title: "Xizmat hisobini yarating",
                desc: '"Service Accounts" → "Create" → JSON kalit yuklab oling',
              },
              {
                title: "Tasks va Staff jadvallarini ulashing",
                desc: "Jadvalni oching → Share → JSON dagi client_email ni qo'shing",
              },
              {
                title: "JSON kalitni secret sifatida saqlang",
                desc: 'Replit → Secrets → "GOOGLE_SERVICE_ACCOUNT_JSON"',
              },
              {
                title: "Quyida Spreadsheet ID ni kiriting va saqlang",
                desc: null,
              },
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepNum, { backgroundColor: "#1e40af" }]}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: "#1e3a8a" }]}>
                    {step.title}
                  </Text>
                  {step.desc && (
                    <Text style={[styles.stepDesc, { color: "#3730a3" }]}>
                      {step.desc}
                    </Text>
                  )}
                  {step.link && (
                    <Pressable onPress={() => Linking.openURL(step.link!)}>
                      <Text style={[styles.stepLink, { color: "#2563eb" }]}>
                        {step.linkLabel}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Staff sheet format ─────────────────────────────────────── */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: "#f0f9ff", borderColor: "#bae6fd", borderRadius: colors.radius },
        ]}
      >
        <View style={styles.infoCardHeader}>
          <Feather name="users" size={14} color="#0369a1" />
          <Text style={[styles.infoCardTitle, { color: "#0369a1" }]}>
            Staff varag'i ustunlari
          </Text>
        </View>
        <Text style={[styles.infoCardText, { color: "#0c4a6e" }]}>
          A: Email  ·  B: Parol  ·  C: Ism{"\n"}
          D: Bo'lim  ·  E: Lavozim  ·  F: Rol{"\n\n"}
          Rol qiymatlari: Admin / Boss / Employee
        </Text>
      </View>

      {/* ── Spreadsheet config ─────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 20 }]}>
        Jadval sozlamalari
      </Text>

      {configLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
      ) : (
        <>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              SPREADSHEET ID yoki URL
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius - 4,
                  color: colors.foreground,
                },
              ]}
              value={spreadsheetId}
              onChangeText={setSpreadsheetId}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              To'liq URL yoki faqat ID
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              TOPSHIRIQLAR VARAG'I (Tasks)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius - 4,
                  color: colors.foreground,
                },
              ]}
              value={sheetName}
              onChangeText={setSheetName}
              placeholder="Tasks"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              XODIMLAR VARAG'I (Staff)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius - 4,
                  color: colors.foreground,
                },
              ]}
              value={staffSheetName}
              onChangeText={setStaffSheetName}
              placeholder="Staff"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleSaveSheets}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="save" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Saqlash</Text>
              </>
            )}
          </Pressable>
        </>
      )}

      {/* ── Tasks column guide ─────────────────────────────────────── */}
      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.secondary, borderRadius: colors.radius, marginTop: 8 },
        ]}
      >
        <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>
          Tasks varag'i ustunlari (A→M)
        </Text>
        <Text style={[styles.infoCardText, { color: colors.mutedForeground }]}>
          A: ID · B: F.I.Sh · C: Bo'lim · D: Lavozim · E: Topshiriq{"\n"}
          F: Muddat (kun) · G: Berilgan sana · H: Topshirish sana{"\n"}
          I: Qolgan kun · J: Holati · K: Boshliq belgisi{"\n"}
          L: Tugatilish kuni · M: Kechikkan kun{"\n\n"}
          Holati: Jarayonda · Kechikdi · Yakunlandi · Tekshirishda
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  profileCard: { padding: 18, marginBottom: 12 },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 2 },
  profileEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  rolePill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rolePillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  profileExtra: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  profileExtraItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileExtraText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderWidth: 1,
    marginBottom: 24,
  },
  logoutBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#dc2626" },
  divider: { height: 1, backgroundColor: "transparent", marginBottom: 12 },
  statusCard: { padding: 16, marginBottom: 14 },
  statusRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  statusIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  statusTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  statusTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  statusDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  setupCard: { padding: 16, borderWidth: 1, marginBottom: 16 },
  setupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  setupTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  stepList: { gap: 12 },
  step: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  stepNumText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  stepTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  stepDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  stepLink: { fontSize: 12, fontFamily: "Inter_500Medium" },
  infoCard: { padding: 14, marginBottom: 8 },
  infoCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  infoCardTitle: { fontSize: 12, fontFamily: "Inter_700Bold" },
  infoCardText: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 19 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 6 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
