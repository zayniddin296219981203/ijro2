import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

function LogoutHeaderButton() {
  const colors = useColors();
  const { logout, userName, role } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Chiqish",
      `${userName || "Foydalanuvchi"} sifatida kirgansiz.\nTizimdan chiqmoqchimisiz?`,
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Chiqish",
          style: "destructive",
          onPress: logout,
        },
      ],
    );
  };

  if (role === "admin") return null;

  return (
    <Pressable
      onPress={handleLogout}
      style={({ pressed }) => [
        styles.logoutBtn,
        { opacity: pressed ? 0.6 : 1 },
      ]}
      hitSlop={12}
    >
      <Feather name="log-out" size={19} color={colors.mutedForeground} />
    </Pressable>
  );
}

function NativeTabLayout() {
  const { role } = useAuth();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <Label>Monitoring</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
        <Label>Statistika</Label>
      </NativeTabs.Trigger>
      {role === "admin" && (
        <NativeTabs.Trigger name="settings">
          <Icon sf={{ default: "gear", selected: "gear" }} />
          <Label>Sozlamalar</Label>
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { role } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const canSeeSettings = role === "admin";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: {
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
          fontSize: 17,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
        headerRight: () => <LogoutHeaderButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ijro Monitoring",
          tabBarLabel: "Monitoring",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="list.bullet" tintColor={color} size={22} />
            ) : (
              <Feather name="list" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Statistika",
          tabBarLabel: "Statistika",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar.fill" tintColor={color} size={22} />
            ) : (
              <Feather name="bar-chart-2" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Sozlamalar",
          tabBarLabel: "Sozlamalar",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gear" tintColor={color} size={22} />
            ) : (
              <Feather name="settings" size={22} color={color} />
            ),
          href: canSeeSettings ? undefined : null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  logoutBtn: {
    paddingRight: 16,
    paddingLeft: 8,
    paddingVertical: 4,
  },
});
