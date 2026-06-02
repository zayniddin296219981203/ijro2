import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const { height: SCREEN_H } = Dimensions.get("window");

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTestCreds, setShowTestCreds] = useState(false);

  const pwRef = useRef<TextInputType>(null);

  const handleLogin = async () => {
    if (!email.trim()) {
      setError("Emailni kiriting");
      return;
    }
    if (!password.trim()) {
      setError("Parolni kiriting");
      return;
    }
    setIsLoading(true);
    setError("");
    const result = await login(email, password);
    setIsLoading(false);
    if (result.success) {
      router.replace("/(tabs)");
    } else {
      setError(result.error ?? "Kirish mumkin bo'lmadi");
    }
  };

  const fillTestCreds = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError("");
  };

  const TEST_USERS = [
    { label: "Admin", email: "admin@ijro.uz", pw: "admin123", color: "#1e3a5f" },
    { label: "Boshliq", email: "boss@ijro.uz", pw: "boss123", color: "#7c3aed" },
    { label: "Xodim", email: "zayniddin@ijro.uz", pw: "1234", color: "#0891b2" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: "#1e3a5f" }]}>
      {/* ── Branded hero ─────────────────────────────────────────────── */}
      <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
        <View style={styles.logoWrap}>
          <Feather name="shield" size={40} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Ijro Monitoring</Text>
        <Text style={styles.heroSub}>Ishni nazorat qilish tizimi</Text>
      </View>

      {/* ── Form card ────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kav}
      >
        <ScrollView
          style={[styles.formCard, { backgroundColor: colors.background }]}
          contentContainerStyle={[
            styles.formContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={[styles.formTitle, { color: colors.foreground }]}>
            Tizimga kirish
          </Text>
          <Text style={[styles.formSub, { color: colors.mutedForeground }]}>
            Staff jadvalidagi email va parol bilan kiring
          </Text>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              EMAIL
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius - 2,
                },
              ]}
            >
              <Feather name="mail" size={17} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
                placeholder="jasur@company.uz"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => pwRef.current?.focus()}
                autoFocus
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              PAROL
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius - 2,
                },
              ]}
            >
              <Feather name="lock" size={17} color={colors.mutedForeground} />
              <TextInput
                ref={pwRef}
                style={[styles.input, { color: colors.foreground }]}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(""); }}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPw((p) => !p)} hitSlop={8}>
                <Feather
                  name={showPw ? "eye-off" : "eye"}
                  size={17}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: "#fef2f2", borderColor: "#fca5a5", borderRadius: colors.radius - 2 },
              ]}
            >
              <Feather name="alert-circle" size={14} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Login button */}
          <Pressable
            style={({ pressed }) => [
              styles.loginBtn,
              {
                backgroundColor: isLoading ? "#9ca3af" : "#1e3a5f",
                borderRadius: colors.radius,
                opacity: pressed ? 0.88 : 1,
                marginTop: error ? 12 : 20,
              },
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.loginBtnText}>Tekshirilmoqda…</Text>
              </>
            ) : (
              <>
                <Feather name="log-in" size={18} color="#fff" />
                <Text style={styles.loginBtnText}>Kirish</Text>
              </>
            )}
          </Pressable>

          {/* Test credentials helper */}
          <Pressable
            style={styles.testToggle}
            onPress={() => setShowTestCreds((s) => !s)}
          >
            <Feather
              name={showTestCreds ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.mutedForeground}
            />
            <Text style={[styles.testToggleText, { color: colors.mutedForeground }]}>
              {showTestCreds ? "Sinov kirish yashirish" : "Sinov kirish (demo)"}
            </Text>
          </Pressable>

          {showTestCreds && (
            <View
              style={[
                styles.testBox,
                { backgroundColor: "#f0f9ff", borderColor: "#bae6fd", borderRadius: colors.radius - 2 },
              ]}
            >
              <View style={styles.testBoxHeader}>
                <Feather name="info" size={13} color="#0369a1" />
                <Text style={styles.testBoxTitle}>Demo kirish ma'lumotlari</Text>
              </View>
              <Text style={styles.testBoxNote}>
                Google Sheets ulanmagan bo'lsa bu ma'lumotlar ishlaydi
              </Text>
              {TEST_USERS.map((u) => (
                <Pressable
                  key={u.email}
                  style={({ pressed }) => [
                    styles.testRow,
                    { borderColor: "#e0f2fe", opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => fillTestCreds(u.email, u.pw)}
                >
                  <View style={[styles.testRoleDot, { backgroundColor: u.color }]}>
                    <Text style={styles.testRoleLetter}>
                      {u.label[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testUserLabel}>{u.label}</Text>
                    <Text style={styles.testUserEmail}>{u.email}</Text>
                  </View>
                  <Text style={styles.testUserPw}>/ {u.pw}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 10,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
  },
  kav: { flex: 1 },
  formCard: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  formContent: {
    padding: 28,
    paddingTop: 32,
  },
  formTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  formSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 28,
  },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#dc2626",
    flex: 1,
    lineHeight: 18,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  testToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  testToggleText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  testBox: {
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  testBoxHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  testBoxTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#0369a1",
  },
  testBoxNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#0369a1",
    lineHeight: 16,
    marginTop: -4,
  },
  testRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  testRoleDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  testRoleLetter: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  testUserLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#0c4a6e",
  },
  testUserEmail: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#0369a1",
  },
  testUserPw: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#0891b2",
  },
});
