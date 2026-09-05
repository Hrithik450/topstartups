import { create } from "zustand";
import { devtools } from "zustand/middleware";

function toUserFriendlyError(
  err: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  if (!err) return fallback;
  if (typeof err === "string") {
    if (err.includes("duplicate key") || err.includes("unique constraint")) {
      return "This record already exists.";
    }
    if (err.includes("ECONNREFUSED") || err.includes("fetch failed")) {
      return "Unable to connect to server. Please check your internet connection.";
    }
    return err;
  }
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      return "Network connection issue. Please check your internet.";
    }
    if (msg.includes("Unauthorized") || msg.includes("unauthorized")) {
      return "Session expired. Please sign in again.";
    }
    return msg;
  }
  return fallback;
}

export interface ErrorStore {
  status: "error" | "saving" | "saved" | null;
  message: string | null;
  showError: (error: unknown, fallbackMessage?: string) => void;
  showSuccess: (message: string) => void;
  reset: () => void;
}

export const useErrorStore = create<ErrorStore>()(
  devtools((set) => ({
    status: null,
    message: null,
    showError: (error, fallbackMessage) => {
      set({ status: "error", message: toUserFriendlyError(error, fallbackMessage) });
    },
    showSuccess: (message) => set({ status: "saved", message }),
    reset: () => set({ status: null, message: null }),
  }))
);
