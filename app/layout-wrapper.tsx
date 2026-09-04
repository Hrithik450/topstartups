"use client";

import React, { useEffect } from "react";
import type { User } from "@/lib/db/config/schema";
import { useUserStore } from "@/store/user-store";
import { useErrorStore } from "@/store/error-store";
import { useFloorsStore } from "@/store/floors-store";
import { SuccessAlert } from "@/components/alerts/success";
import { FailureAlert } from "@/components/alerts/failure";
import { getFloorsByEmailAction } from "@/actions/floors/floors.actions";

export function LayoutWrapper({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const { setUser } = useUserStore();
  const { setOwnedFloors } = useFloorsStore();
  const { status, message } = useErrorStore();

  // Initialize user and fetch user's owned floors once on session resolution
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      if (initialUser.email) {
        getFloorsByEmailAction(initialUser.email).then((res) => {
          if (res.success && res.data) {
            setOwnedFloors(res.data);
          }
        });
      }
    } else {
      // Client-side session fallback if SSR didn't have session cookies
      fetch("/api/auth/session")
        .then((r) => r.json())
        .then((session) => {
          if (session?.user?.email) {
            const clientUser: User = {
              id: session.user.id || "",
              email: session.user.email,
              name: session.user.name || null,
              emailVerified: null,
              phone: null,
              avatarUrl: (session.user as any).avatarUrl || session.user.image || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            setUser(clientUser);
            getFloorsByEmailAction(session.user.email).then((res) => {
              if (res.success && res.data) {
                setOwnedFloors(res.data);
              }
            });
          } else {
            setUser(null);
            setOwnedFloors([]);
          }
        })
        .catch(() => {
          setUser(null);
          setOwnedFloors([]);
        });
    }
  }, [initialUser, setUser, setOwnedFloors]);

  return (
    <>
      {children}
      {status === "saved" && message && <SuccessAlert message={message} duration={4000} />}
      {status === "error" && message && <FailureAlert message={message} duration={4000} />}
    </>
  );
}

export default LayoutWrapper;
