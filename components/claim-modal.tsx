"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, Close } from "./icons";

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl: string;
  category: string;
  price: number;
  targetRank: number;
}

async function safeFetchJson(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (res.status === 429) {
      throw new Error("Too many requests. Please wait a few seconds and try again.");
    }
    if (!res.ok) {
      throw new Error(`Server temporarily unavailable (${res.status}). Please try again.`);
    }
    throw new Error("Unexpected server response format. Please refresh the page and try again.");
  }
  return await res.json();
}

export function ClaimModal({
  isOpen,
  onClose,
  targetUrl,
  category,
  price,
  targetRank,
}: ClaimModalProps) {
  const [founderName, setFounderName] = useState("");
  const [founderEmail, setFounderEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Restore saved founder details from previous sessions
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("getopfloor_manage_email") || "";
      const savedName = localStorage.getItem("getopfloor_founder_name") || "";
      if (savedEmail) setFounderEmail(savedEmail);
      if (savedName) setFounderName(savedName);
    }
  }, [isOpen]);

  // Focus the name input when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = founderName.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMessage("Please enter your name or company representative name.");
      return;
    }

    const cleanEmail = founderEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Founder email address is required for ownership verification.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address (e.g. founder@yourcompany.com).");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Live SMTP & MX email verification without OTP
      const emailRes = await fetch("/api/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const emailData = await safeFetchJson(emailRes);
      if (!emailRes.ok || !emailData.valid) {
        setErrorMessage(
          emailData.error ||
            "The email address could not be reached via SMTP. Please provide an active work email."
        );
        setIsSubmitting(false);
        return;
      }

      // 2. Create Dodo checkout session with locked customer details
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          category,
          price: Math.max(50, price),
          targetRank,
          customerName: cleanName,
          customerEmail: cleanEmail,
        }),
      });

      const checkoutData = await safeFetchJson(checkoutRes);
      if (!checkoutRes.ok || !checkoutData.checkoutUrl) {
        setErrorMessage(checkoutData.error || "Failed to create secure checkout session.");
        setIsSubmitting(false);
        return;
      }

      // Persist verified founder credentials
      if (typeof window !== "undefined") {
        localStorage.setItem("getopfloor_manage_email", cleanEmail);
        localStorage.setItem("getopfloor_founder_name", cleanName);
      }

      // Redirect directly to Dodo Payments checkout page
      window.location.href = checkoutData.checkoutUrl;
    } catch (err: any) {
      console.error("Modal checkout error:", err);
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="manage-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-modal-title"
    >
      <div className="manage-modal-content" style={{ maxWidth: "460px" }}>
        {/* Header */}
        <div className="manage-modal-header">
          <div>
            <h2 id="claim-modal-title" className="manage-modal-title">
              Founder Details
            </h2>
            <p className="manage-modal-subtitle">
              Verify your ownership contact before proceeding to payment.
            </p>
          </div>
          <button
            type="button"
            className="manage-modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <Close />
          </button>
        </div>

        {/* Claim Placement Summary Box */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Placement</span>
            <span style={{ fontWeight: 600, color: "var(--brand-orange, #ff6b1a)" }}>
              {targetRank === 1 ? "Top Floor #1" : `Floor #${targetRank}`} (₹{price})
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Website</span>
            <span
              style={{
                maxWidth: "240px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontWeight: 500,
              }}
            >
              {targetUrl}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Category</span>
            <span style={{ fontWeight: 500 }}>{category}</span>
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#fca5a5",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "13px",
              lineHeight: 1.4,
            }}
            role="alert"
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.75)",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Founder / Contact Name
            </label>
            <input
              ref={nameInputRef}
              type="text"
              className="manage-input"
              placeholder="e.g. Elon Musk"
              value={founderName}
              onChange={(e) => setFounderName(e.target.value)}
              disabled={isSubmitting}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.75)",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Work / Founder Email
            </label>
            <input
              type="email"
              className="manage-input"
              placeholder="founder@yourcompany.com"
              value={founderEmail}
              onChange={(e) => setFounderEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              inputMode="email"
              required
            />
            <p
              style={{
                fontSize: "11.5px",
                color: "rgba(255, 255, 255, 0.5)",
                marginTop: "6px",
                marginBottom: 0,
                lineHeight: 1.4,
              }}
            >
              🔒 Verified via live SMTP reachability. No disposable emails allowed.
            </p>
          </div>

          <p
            style={{
              fontSize: "11.5px",
              color: "rgba(255, 255, 255, 0.45)",
              margin: "0 0 4px 0",
              lineHeight: 1.4,
            }}
          >
            ℹ️ Your name and email will be pre-filled into Dodo Checkout for invoice and claim
            security.
          </p>

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              type="button"
              className="manage-load-btn"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                color: "rgba(255, 255, 255, 0.8)",
                flex: 1,
                height: "44px",
                padding: 0,
              }}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="manage-load-btn"
              style={{
                flex: 2,
                height: "44px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "14px",
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>Verifying &amp; Loading...</span>
              ) : (
                <span>Proceed to Checkout →</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
