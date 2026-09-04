import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { User } from "@/lib/db/config/schema";
import { signInWithGoogle } from "@/actions/auth/sign-in";
import { signOutAccount } from "@/actions/auth/sign-out";
import { useErrorStore } from "./error-store";

import { useFloorsStore } from "./floors-store";

export type { User };

interface UserStore {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  login: (returnTo?: string) => void;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  devtools((set) => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,

    setUser: (user) =>
      set({
        user,
        isAuthenticated: Boolean(user),
        isLoading: false,
      }),

    login: async (returnTo?: string) => {
      const target = returnTo || window.location.pathname + window.location.search;
      try {
        await signInWithGoogle(target);
      } catch (err) {
        window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(target)}`;
      }
    },

    logout: async () => {
      try {
        await signOutAccount();
      } catch (err) {
        useErrorStore.getState().showError(err, "Failed to log out");
      } finally {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        useFloorsStore.getState().setOwnedFloors([]);
      }
    },
  }))
);
