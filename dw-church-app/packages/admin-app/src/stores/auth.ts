import { create } from 'zustand';
import { DWChurchClient } from '@dw-church/api-client';
import type { AuthSession } from '@dw-church/api-client';

const SESSION_KEY = 'dw-church-session';

/** 5 minutes in milliseconds */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

// Per-tab session storage. Using sessionStorage (not localStorage) means:
//   - Super admin, tenant A admin, tenant B support access, etc. can all be
//     logged in simultaneously in different tabs without overwriting each other.
//   - Closing a tab drops its session (stricter security model, acceptable
//     tradeoff — refresh tokens are still available for same-tab reloads).
// One-time migration: if a legacy localStorage session exists, copy it into
// sessionStorage so the current tab doesn't appear logged out on first load.
if (typeof window !== 'undefined') {
  try {
    const legacy = localStorage.getItem(SESSION_KEY);
    if (legacy && !sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, legacy);
    }
    localStorage.removeItem(SESSION_KEY);
  } catch { /* storage unavailable */ }
}

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: AuthSession | null) => void;
  logout: () => void;
  hydrate: () => void;
  refresh: (client: DWChurchClient) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isAuthenticated: false,
  isLoading: true,

  setSession: (session) => {
    if (session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
    set({ session, isAuthenticated: !!session, isLoading: false });
  },

  logout: () => {
    sessionStorage.removeItem(SESSION_KEY);
    set({ session: null, isAuthenticated: false, isLoading: false });
  },

  hydrate: () => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const session: AuthSession = JSON.parse(raw);
        const now = Date.now();

        // Token still valid
        if (session.expiresAt > now) {
          set({ session, isAuthenticated: true, isLoading: false });
          return;
        }

        // Token expired but refresh token exists — let caller handle refresh
        // (hydrate is synchronous, so we just mark as not authenticated here;
        //  the App component's useEffect will attempt the refresh)
        if (session.refreshToken) {
          // Keep session in state so refresh can access the refreshToken
          set({ session, isAuthenticated: false, isLoading: false });
          return;
        }
      }
    } catch {
      // corrupted data
    }
    sessionStorage.removeItem(SESSION_KEY);
    set({ session: null, isAuthenticated: false, isLoading: false });
  },

  refresh: async (client: DWChurchClient) => {
    const { session } = get();
    if (!session?.refreshToken) return;

    try {
      const newSession = await client.refreshToken(session.refreshToken);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      set({ session: newSession, isAuthenticated: true, isLoading: false });
    } catch {
      // Refresh failed — clear session
      sessionStorage.removeItem(SESSION_KEY);
      set({ session: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

/**
 * Returns true if the current session token is close to expiry
 * (less than 5 minutes remaining).
 */
export function isTokenExpiringSoon(session: AuthSession | null): boolean {
  if (!session) return false;
  return session.expiresAt - Date.now() < REFRESH_THRESHOLD_MS;
}
