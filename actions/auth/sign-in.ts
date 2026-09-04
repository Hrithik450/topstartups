"use server";

import { signIn } from "@/lib/auth/auth";

export async function signInWithGoogle(redirectTo?: string) {
  return await signIn("google", redirectTo ? { redirectTo } : undefined);
}
