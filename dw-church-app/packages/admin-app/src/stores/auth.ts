import { create } from 'zustand';
import { DWChurchClient } from '@dw-church/api-client';
import type { AuthSession } from '@dw-church/api-client';

const SESSION_KEY = 'dw-church-session';

/** 5 minutes in milliseconds */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

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
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    set({ session, isAuthenticated: !!session, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ session: null, isAuthenticated: false, isLoading: false });
  },

  hydrate: () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
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
    localStorage.removeItem(SESSION_KEY);
    set({ session: null, isAuthenticated: false, isLoading: false });
  },

  refresh: async (client: DWChurchClient) => {
    const { session } = get();
    if (!session?.refreshToken) return;

    try {
      const newSession = await client.refreshToken(session.refreshToken);
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      set({ session: newSession, isAuthenticated: true, isLoading: false });
    } catch {
      // Refresh failed — clear session
      localStorage.removeItem(SESSION_KEY);
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
