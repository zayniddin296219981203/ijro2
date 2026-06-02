import React, { useState, useMemo } from "react";
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
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateMonitoringRow,
  useGetMonitoringStaff,
  getGetMonitoringRowsQueryKey,
  getGetMonitoringStatsQueryKey,
  type StaffMember,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { formatDMY, parseDeadline } from "@/utils/dateUtils";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  multiline,
  keyboardType,
  required,
  readOnly,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
  required?: boolean;
  readOnly?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={fieldStyles.group}>
      <View style={fieldStyles.labelRow}>
        <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        {required && (
          <Text style={[fieldStyles.required, { color: colors.statusLate }]}>
            {" "}*
          </Text>
        )}
      </View>
      <TextInput
        style={[
          fieldStyles.input,
          multiline && fieldStyles.inputMulti,
          {
            backgroundColor: readOnly ? colors.secondary : colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius - 4,
            color: readOnly ? colors.mutedForeground : colors.foreground,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize="sentences"
        autoCorrect={false}
        editable={!readOnly}
      />
      {hint && (
        <Text style={[fieldStyles.hint, { color: colors.mutedForeground }]}>
          {hint}
        </Text>
      )}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { marginBottom: 16 },
  labelRow: { flexDirection: "row", marginBottom: 6 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  required: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  inputMulti: { minHeight: 80, textAlignVertical: "top" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 16 },
});

export default function AddTaskScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userName, userDept, userPosition, role } = useAuth();
  const queryClient = useQueryClient();
  const createRow = useCreateMonitoringRow();
  const { data: staffData } = useGetMonitoringStaff();

  const today = new Date();
  const [fish, setFish] = useState(role === "employee" ? userName : "");
  const [bolim, setBolim] = useState(role === "employee" ? userDept : "");
  const [lavozim, setLavozim] = useState(role === "employee" ? userPosition : "");
  const [topshiriq, setTopshiriq] = useState("");
  const [muddat, setMuddat] = useState("");
  const [berilganSana, setBerilganSana] = useState(formatDMY(today));
  const [topshirishSana, setTopshirishSana] = useState("");

  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");

  const isSaving = createRow.isPending;
  const isEmployee = role === "employee";

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
    setFish(member.name);
    setBolim(member.bolim ?? "");
    setLavozim(member.lavozim ?? "");
    setStaffPickerOpen(false);
    setStaffSearch("");
  };

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
    const diffMs = deadline.getTime() - base.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? String(days) : "";
  };

  const handleMuddatChange = (v: string) => {
    setMuddat(v);
    if (v.trim()) {
      const computed = computeTopshirishSana(v, berilganSana);
      if (computed) setTopshirishSana(computed);
    }
  };

  const handleTopshirishSanaChange = (v: string) => {
    setTopshirishSana(v);
    if (v.length >= 10) {
      const computed = computeMuddat(v, berilganSana);
      if (computed) setMuddat(computed);
    }
  };

  const handleBerilganSanaChange = (v: string) => {
    setBerilganSana(v);
    if (muddat.trim()) {
      const computed = computeTopshirishSana(muddat, v);
      if (computed) setTopshirishSana(computed);
    }
  };

  const handleSubmit = () => {
    if (!fish.trim()) {
      Alert.alert("Xato", "Xodim ismi majburiy");
      return;
    }
    if (!topshiriq.trim()) {
      Alert.alert("Xato", "Topshiriq mazmuni majburiy");
      return;
    }

    createRow.mutate(
      {
        data: {
          fish: fish.trim(),
          bolim: bolim.trim() || undefined,
          lavozim: lavozim.trim() || undefined,
          topshiriq: topshiriq.trim(),
          muddat: muddat ? Number(muddat) : undefined,
          berilganSana: berilganSana.trim() || undefined,
          topshirishSana: topshirishSana.trim() || undefined,
          holati: "Jarayonda",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMonitoringRowsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMonitoringStatsQueryKey() });
          Alert.alert(
            "Qo'shildi ✓",
            `"${topshiriq.trim()}" topshirig'i muvaffaqiyatli qo'shildi.`,
            [{ text: "OK", onPress: () => router.back() }],
          );
        },
        onError: () => {
          Alert.alert("Xato", "Topshiriq qo'shishda xatolik yuz berdi. Qayta urinib ko'ring.");
        },
      },
    );
  };

  const topPad = Platform.OS === "web" ? 16 : 0;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 8, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View
          style={[
            styles.headerCard,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
          ]}
        >
          <Feather name="plus-circle" size={24} color="rgba(255,255,255,0.9)" />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Yangi topshiriq</Text>
            <Text style={styles.headerSub}>
              Barcha majburiy maydonlarni (*) to'ldiring
            </Text>
          </View>
        </View>

        {/* Employee section */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Xodim ma'lumotlari
          </Text>

          {/* Staff picker (admin/boss only) */}
          {!isEmployee && (
            <View style={fieldStyles.group}>
              <View style={fieldStyles.labelRow}>
                <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>
                  XODIM ISMI (F.I.SH)
                </Text>
                <Text style={[fieldStyles.required, { color: colors.statusLate }]}>
                  {" "}*
                </Text>
              </View>
              <Pressable
                style={[
                  styles.pickerBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: fish ? colors.primary : colors.border,
                    borderRadius: colors.radius - 4,
                  },
                ]}
                onPress={() => setStaffPickerOpen(true)}
              >
                <Text
                  style={[
                    styles.pickerBtnText,
                    { color: fish ? colors.foreground : colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {fish || "Xodimni tanlang..."}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}

          {isEmployee && (
            <Field
              label="XODIM ISMI (F.I.SH)"
              value={fish}
              onChangeText={setFish}
              placeholder="Abdullayev Jasur"
              required
              readOnly
            />
          )}

          <Field
            label="BO'LIM"
            value={bolim}
            onChangeText={setBolim}
            placeholder="Moliya bo'limi"
            readOnly={!isEmployee && !!fish}
          />
          <Field
            label="LAVOZIM"
            value={lavozim}
            onChangeText={setLavozim}
            placeholder="Bosh mutaxassis"
            readOnly={!isEmployee && !!fish}
          />
        </View>

        {/* Task section */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Topshiriq ma'lumotlari
          </Text>

          <Field
            label="TOPSHIRIQ MAZMUNI"
            value={topshiriq}
            onChangeText={setTopshiriq}
            placeholder="Topshiriqni batafsil yozing..."
            multiline
            required
          />
          <Field
            label="MUDDAT (KUN)"
            value={muddat}
            onChangeText={handleMuddatChange}
            placeholder="5"
            keyboardType="numeric"
            hint="Topshirilish sanasi avtomatik hisoblanadi"
          />
          <Field
            label="BERILGAN SANA"
            value={berilganSana}
            onChangeText={handleBerilganSanaChange}
            placeholder="27/05/2026"
            hint="Format: KK/OO/YYYY"
          />
          <Field
            label="TOPSHIRISH SANASI"
            value={topshirishSana}
            onChangeText={handleTopshirishSanaChange}
            placeholder="03/06/2026"
            hint="Format: KK/OO/YYYY — o'zgartirsa muddat qayta hisoblanadi"
          />
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: isSaving ? "#9ca3af" : colors.statusCompleted,
              borderRadius: colors.radius,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.submitBtnText}>Saqlanmoqda…</Text>
            </>
          ) : (
            <>
              <Feather name="check-circle" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Topshiriq qo'shish</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.cancelBtn,
            {
              borderColor: colors.border,
              borderRadius: colors.radius,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          onPress={() => router.back()}
          disabled={isSaving}
        >
          <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>
            Bekor qilish
          </Text>
        </Pressable>
      </ScrollView>

      {/* Staff Picker Modal */}
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
            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Xodimni tanlang
              </Text>
              <Pressable onPress={() => setStaffPickerOpen(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Search */}
            <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
              <Feather name="search" size={15} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                value={staffSearch}
                onChangeText={setStaffSearch}
                placeholder="Ism yoki bo'lim bo'yicha qidiring..."
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
  content: { paddingHorizontal: 16, gap: 12 },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 3,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  formCard: {
    borderWidth: 1,
    padding: 16,
    gap: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    marginBottom: 16,
    textTransform: "uppercase",
  },
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
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 16,
    marginTop: 4,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
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
    maxHeight: "80%",
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
  emptyWrap: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
