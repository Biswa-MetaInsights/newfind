import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthTokens } from "@eventmind/types";

interface AuthState {
  userEmail: string | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  _hasHydrated: boolean;
  setAuth: (email: string, tokens: AuthTokens) => void;
  clearAuth: () => void;
  expireSession: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userEmail: null,
      tokens: null,
      isAuthenticated: false,
      sessionExpired: false,
      _hasHydrated: false,
      setAuth: (userEmail, tokens) =>
        set({ userEmail, tokens, isAuthenticated: true, sessionExpired: false }),
      clearAuth: () =>
        set({ userEmail: null, tokens: null, isAuthenticated: false, sessionExpired: false }),
      expireSession: () =>
        set({ userEmail: null, tokens: null, isAuthenticated: false, sessionExpired: true }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "eventmind-auth",
      onRehydrateStorage: () => (state) => {
        if (state?.tokens?.access_token) {
          try {
            const part = state.tokens.access_token.split(".")[1];
            const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
            if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) state.expireSession();
          } catch { state.expireSession(); }
        } else if (state?.isAuthenticated) state.expireSession();
        state?.setHasHydrated(true);
      },
    }
  )
);
