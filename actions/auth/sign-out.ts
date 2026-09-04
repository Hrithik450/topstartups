"use server";

import { signOut } from "@/lib/auth/auth";

export async function signOutAccount() {
  return await signOut();
}
