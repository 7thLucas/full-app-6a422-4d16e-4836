import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  createElement,
  type ReactNode,
} from "react";
import { apiGet } from "~/lib/api.client";
import type { PublicUser } from "./authentication.types";
import { UserRole } from "./authentication.types";

export interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    apiGet<PublicUser>("/api/auth/me")
      .then((res) => setUser(res.success && res.data ? res.data : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value: AuthState = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === UserRole.Admin,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
