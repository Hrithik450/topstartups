"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, Close } from "./icons";
import {
  getValidatedFounderCredentials,
  clearStoredFounderCredentials,
  saveFounderCredentials,
} from "@/lib/validation/founder";

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl: string;
  category: string;
  price: number;
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

export function ClaimModal({ isOpen, onClose, targetUrl, category, price }: ClaimModalProps) {
  const [founderName, setFounderName] = useState("");
  const [founderEmail, setFounderEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Restore saved founder details from previous sessions only if 100% valid & uncorrupted
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const check = getValidatedFounderCredentials();
      if (check.valid && check.credentials) {
        setFounderName(check.credentials.name);
        setFounderEmail(check.credentials.email);
      } else {
        // If corrupted or invalid, fields are strictly cleared
        setFounderName("");
        setFounderEmail("");
        if (check.isCorrupted) {
          clearStoredFounderCredentials();
          setErrorMessage("Previously saved contact details were invalid and have been reset.");
        }
      }
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

    if (cleanEmail.includes("*")) {
      setErrorMessage(
        "Please enter your full unmasked email address (e.g. founder@yourcompany.com)."
      );
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

      // Persist verified founder credentials safely
      saveFounderCredentials(cleanName, cleanEmail);

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
      className="claim-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-modal-title"
    >
      <div className="claim-modal-content">
        {/* Header */}
        <div className="claim-modal-header">
          <div>
            <h2 id="claim-modal-title" className="claim-modal-title">
              Founder Details
            </h2>
            <p className="claim-modal-subtitle">
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
        <div className="claim-summary-card">
          <div className="claim-summary-row">
            <span className="claim-summary-label">Website</span>
            <span
              className="claim-summary-value"
              style={{
                maxWidth: "260px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {targetUrl}
            </span>
          </div>
          <div className="claim-summary-row">
            <span className="claim-summary-label">Category</span>
            <span className="claim-summary-value">{category}</span>
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="claim-error-banner" role="alert">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div className="claim-form-group">
            <label className="claim-label">Founder / Contact Name</label>
            <input
              ref={nameInputRef}
              type="text"
              className="claim-input"
              placeholder="e.g. Elon Musk"
              value={founderName}
              onChange={(e) => setFounderName(e.target.value)}
              disabled={isSubmitting}
              autoComplete="name"
              required
            />
          </div>

          <div className="claim-form-group">
            <label className="claim-label">Work / Founder Email</label>
            <input
              type="email"
              className="claim-input"
              placeholder="founder@yourcompany.com"
              value={founderEmail}
              onChange={(e) => setFounderEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              inputMode="email"
              required
            />
          </div>

          <div className="claim-actions">
            <button
              type="button"
              className="claim-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="claim-submit-btn" disabled={isSubmitting}>
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
