import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  type AppRole,
  type Permissions,
  getPermissions,
} from "@/utils/permissions";

const STORAGE_KEY = "@ijro_auth_v2";

interface AuthState {
  role: AppRole;
  userName: string;
  userEmail: string;
  userDept: string;
  userPosition: string;
  isLiveAuth: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  permissions: Permissions;
  isReady: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  /** For admin: manually adjust role (dev/testing only) */
  setRole: (role: AppRole) => void;
  setUserInfo: (info: Partial<Pick<AuthState, "userName" | "userEmail" | "userDept">>) => void;
}

const DEFAULT_STATE: AuthState = {
  role: "employee",
  userName: "",
  userEmail: "",
  userDept: "",
  userPosition: "",
  isLiveAuth: false,
  isAuthenticated: false,
};

function buildApiUrl(path: string): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

const AuthContext = createContext<AuthContextValue>({
  ...DEFAULT_STATE,
  permissions: getPermissions("employee"),
  isReady: false,
  login: async () => ({ success: false }),
  logout: () => {},
  setRole: () => {},
  setUserInfo: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(DEFAULT_STATE);
  const [isReady, setIsReady] = useState(false);

  // ── Restore session from AsyncStorage ──────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const saved = JSON.parse(raw) as Partial<AuthState>;
            setState((prev) => ({ ...prev, ...saved }));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setIsReady(true));
  }, []);

  const persist = useCallback((next: AuthState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────
  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      const url = buildApiUrl("/api/monitoring/auth/login");
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password: password.trim() }),
        });
        const data = (await res.json()) as {
          success: boolean;
          user?: {
            email: string;
            name: string;
            bolim?: string;
            lavozim?: string;
            role: string;
          };
          error?: string;
        };

        if (res.ok && data.success && data.user) {
          const next: AuthState = {
            role: data.user.role as AppRole,
            userName: data.user.name,
            userEmail: data.user.email,
            userDept: data.user.bolim ?? "",
            userPosition: data.user.lavozim ?? "",
            isLiveAuth: true,
            isAuthenticated: true,
          };
          setState(next);
          persist(next);
          return { success: true };
        }
        return {
          success: false,
          error: data.error ?? "Kirish mumkin bo'lmadi",
        };
      } catch {
        return {
          success: false,
          error: "Server bilan bog'lanishda xatolik",
        };
      }
    },
    [persist],
  );

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    const next = { ...DEFAULT_STATE };
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  // ── Admin helpers ──────────────────────────────────────────────────────
  const setRole = useCallback(
    (role: AppRole) => {
      setState((prev) => {
        const next = { ...prev, role };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setUserInfo = useCallback(
    (info: Partial<Pick<AuthState, "userName" | "userEmail" | "userDept">>) => {
      setState((prev) => {
        const next = { ...prev, ...info };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        permissions: getPermissions(state.role),
        isReady,
        login,
        logout,
        setRole,
        setUserInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
