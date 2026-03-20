import { create } from 'zustand';
import type { AuthSession } from '@dw-church/api-client';

const SESSION_KEY = 'dw-church-session';

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: AuthSession | null) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
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
        // Check if token is expired
        if (session.expiresAt > Date.now()) {
          set({ session, isAuthenticated: true, isLoading: false });
          return;
        }
      }
    } catch {
      // corrupted data
    }
    localStorage.removeItem(SESSION_KEY);
    set({ session: null, isAuthenticated: false, isLoading: false });
  },
}));
