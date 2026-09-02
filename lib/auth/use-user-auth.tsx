"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Floor } from "@/lib/db/config/schema";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface UserAuthContextType {
  user: AuthUser | null;
  ownedFloors: Floor[];
  loading: boolean;
  login: (returnTo?: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isOwnerOfFloor: (floorIdOrRank: number) => boolean;
}

const UserAuthContext = createContext<UserAuthContextType>({
  user: null,
  ownedFloors: [],
  loading: true,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  isOwnerOfFloor: () => false,
});

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ownedFloors, setOwnedFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setOwnedFloors(data.ownedFloors || []);
        } else {
          setUser(null);
          setOwnedFloors([]);
        }
      }
    } catch (err) {
      console.warn("Failed to check user auth session:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    // Listen for floors updates or auth changes
    const onRefresh = () => refreshUser();
    window.addEventListener("floors-refresh", onRefresh);
    window.addEventListener("focus", onRefresh);
    return () => {
      window.removeEventListener("floors-refresh", onRefresh);
      window.removeEventListener("focus", onRefresh);
    };
  }, [refreshUser]);

  const login = useCallback((returnTo?: string) => {
    const target = returnTo || window.location.pathname + window.location.search;
    window.location.href = `/api/auth/google/url?return_to=${encodeURIComponent(target)}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setOwnedFloors([]);
      window.dispatchEvent(new CustomEvent("floors-refresh"));
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  const isOwnerOfFloor = useCallback(
    (floorIdOrRank: number) => {
      if (!user || ownedFloors.length === 0) return false;
      return ownedFloors.some((f) => f.id === floorIdOrRank || f.rank === floorIdOrRank);
    },
    [user, ownedFloors]
  );

  return (
    <UserAuthContext.Provider
      value={{
        user,
        ownedFloors,
        loading,
        login,
        logout,
        refreshUser,
        isOwnerOfFloor,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  return useContext(UserAuthContext);
}
