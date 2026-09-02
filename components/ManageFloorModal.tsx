"use client";

import { useState, useEffect } from "react";
import { MAIN_CATEGORIES } from "@/lib/categories";
import { validateWebsiteSyntax } from "@/lib/validation/domain";
import { useUserAuth } from "@/lib/auth/use-user-auth";

interface ManageFloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFloorUpdated?: () => void;
}

interface FloorItem {
  id: number;
  rank: number;
  companyName: string;
  url: string;
  category: string | null;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  pricePaid: number;
  ownerEmail: string | null;
}

export default function ManageFloorModal({
  isOpen,
  onClose,
  onFloorUpdated,
}: ManageFloorModalProps) {
  const { user, login } = useUserAuth();

  // Email OTP state
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [ownedFloors, setOwnedFloors] = useState<FloorItem[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);

  // Status & loading
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Active form data
  const [formData, setFormData] = useState<{
    companyName: string;
    url: string;
    category: string;
    tagline: string;
    description: string;
    logoUrl: string;
  }>({
    companyName: "",
    url: "",
    category: "Startup",
    tagline: "",
    description: "",
    logoUrl: "",
  });

  // Restore stored session or Google user session on open
  useEffect(() => {
    if (!isOpen) return;

    // 1. If logged in via Google Auth, auto-load owned floors
    if (user?.email) {
      setEmail(user.email);
      setLoading(true);
      fetch("/api/auth/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.ownedFloors?.length > 0) {
            setOwnedFloors(data.ownedFloors);
            setSelectedFloorId(data.ownedFloors[0].id);
            setSessionToken("google_auth_session");
          } else if (data.authenticated) {
            setOwnedFloors([]);
            setStatusMsg({
              type: "info",
              text: `No claimed skyscraper floors found for ${user.email}. Claim a floor on the tower to start managing!`,
            });
          }
        })
        .catch((err) => console.warn("Failed to load user floors:", err))
        .finally(() => setLoading(false));
      return;
    }

    // 2. Fallback to localStorage OTP session
    if (typeof window !== "undefined") {
      const storedEmail = localStorage.getItem("getopfloor_manage_email");
      const storedSession = localStorage.getItem("getopfloor_session_token");

      if (storedEmail && storedSession) {
        setEmail(storedEmail);
        setSessionToken(storedSession);
        fetchOwnedFloors(storedEmail, storedSession);
      } else if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, [isOpen, user]);

  // When selected floor changes in dropdown, populate form
  useEffect(() => {
    if (!selectedFloorId || ownedFloors.length === 0) return;
    const current = ownedFloors.find((f) => f.id === selectedFloorId);
    if (current) {
      setFormData({
        companyName: current.companyName || "",
        url: current.url || "",
        category: current.category || "Startup",
        tagline: current.tagline || "",
        description: current.description || "",
        logoUrl: current.logoUrl || "",
      });
    }
  }, [selectedFloorId, ownedFloors]);

  // ─── STEP 1: Send OTP to email ───
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setStatusMsg({ type: "error", text: "Please enter your email address." });
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send verification code.");

      setOtpSent(true);
      setStatusMsg({
        type: "info",
        text: `We sent a 6-digit code to ${email.trim()}. Enter it below to manage your products.`,
      });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 2: Verify OTP ───
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setStatusMsg({ type: "error", text: "Please enter the complete 6-digit code." });
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid verification code.");

      setSessionToken(data.sessionToken);
      setOwnedFloors(data.floors || []);

      localStorage.setItem("getopfloor_manage_email", email.trim().toLowerCase());
      localStorage.setItem("getopfloor_session_token", data.sessionToken);

      if (data.floors && data.floors.length > 0) {
        setSelectedFloorId(data.floors[0].id);
        setStatusMsg({
          type: "success",
          text: `Verified! Found ${data.floors.length} floor${data.floors.length > 1 ? "s" : ""}. Select below to manage.`,
        });
      } else {
        setStatusMsg({
          type: "info",
          text: "No claimed floors found under this email address.",
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Fetch floors using active email session
  const fetchOwnedFloors = async (userEmail: string, sToken: string) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(
        `/api/floors/manage?email=${encodeURIComponent(userEmail)}&session_token=${encodeURIComponent(sToken)}`
      );
      const data = await res.json();
      if (!res.ok || !data.floors) throw new Error(data.error || "Could not fetch floors.");

      setOwnedFloors(data.floors);
      if (data.floors.length > 0) {
        setSelectedFloorId((prev) => (prev && data.floors.some((f: any) => f.id === prev) ? prev : data.floors[0].id));
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
      setSessionToken("");
      localStorage.removeItem("getopfloor_session_token");
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 3: Save Changes (Email Authenticated) ───
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFloorId || !sessionToken || !email) return;

    if (formData.url?.trim()) {
      const check = validateWebsiteSyntax(formData.url.trim());
      if (!check.valid) {
        setStatusMsg({ type: "error", text: check.error || "Please enter a valid, secure website URL." });
        return;
      }
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/floors/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorId: selectedFloorId,
          email,
          sessionToken,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update floor");

      setStatusMsg({ type: "success", text: "Floor details updated successfully!" });
      onFloorUpdated?.();
      window.dispatchEvent(new CustomEvent("floors-refresh"));
      fetchOwnedFloors(email, sessionToken);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // ─── STEP 4: Vacate Floor (Email Authenticated) ───
  const handleDelete = async () => {
    if (!selectedFloorId || !sessionToken || !email) return;

    const currentFloor = ownedFloors.find((f) => f.id === selectedFloorId);
    if (!confirm(`Are you sure you want to vacate Floor #${currentFloor?.rank} (${currentFloor?.companyName})? This will reset the floor to an available slot.`)) {
      return;
    }

    setDeleting(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/floors/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorId: selectedFloorId,
          email,
          sessionToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete floor");

      setStatusMsg({ type: "success", text: "Floor vacated successfully." });
      onFloorUpdated?.();
      window.dispatchEvent(new CustomEvent("floors-refresh"));

      const remaining = ownedFloors.filter((f) => f.id !== selectedFloorId);
      setOwnedFloors(remaining);
      if (remaining.length > 0) {
        setSelectedFloorId(remaining[0].id);
      } else {
        setSelectedFloorId(null);
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("getopfloor_manage_email");
    localStorage.removeItem("getopfloor_session_token");
    setSessionToken("");
    setOwnedFloors([]);
    setSelectedFloorId(null);
    setOtpSent(false);
    setOtpCode("");
    setStatusMsg(null);
  };

  if (!isOpen) return null;

  const currentFloorMeta = ownedFloors.find((f) => f.id === selectedFloorId);

  return (
    <div className="manage-modal-overlay" onClick={onClose}>
      <div className="manage-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="manage-modal-header">
          <div>
            <h2 className="manage-modal-title">Manage Your Skyscraper Floors</h2>
            <p className="manage-modal-subtitle">
              Verify your email to update startup details, logos, or vacate floors anytime.
            </p>
          </div>
          <button type="button" className="manage-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {statusMsg && (
          <div className={`manage-status-badge ${statusMsg.type}`}>
            {statusMsg.type === "success" ? "✓ " : statusMsg.type === "info" ? "ℹ " : "⚠ "}
            {statusMsg.text}
          </div>
        )}

        {/* ─── GOOGLE AUTH / EMAIL VERIFICATION ─── */}
        {!sessionToken ? (
          <div>
            {!otpSent ? (
              <div style={{ marginTop: "12px" }}>
                {/* 1-Tap Google Sign-In */}
                <button
                  type="button"
                  onClick={() => login()}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    color: "#fff",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                    marginBottom: "16px",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Continue with Google
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0", color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.12)" }} />
                  <span>OR VERIFY WITH EMAIL CODE</span>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.12)" }} />
                </div>

                <form onSubmit={handleSendOtp}>
                  <label className="manage-field-group">
                    <span className="manage-label">Email Used During Checkout</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="email"
                        className="manage-input"
                        placeholder="founder@yourstartup.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <button
                        type="submit"
                        className="manage-load-btn"
                        disabled={loading || !email.trim()}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {loading ? "Sending..." : "Send Code"}
                      </button>
                    </div>
                  </label>
                </form>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ marginTop: "12px" }}>
                <label className="manage-field-group">
                  <span className="manage-label">Enter 6-Digit Verification Code</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      className="manage-input"
                      placeholder="123456"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      required
                      autoFocus
                      style={{
                        letterSpacing: "4px",
                        fontSize: "18px",
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                    />
                    <button
                      type="submit"
                      className="manage-load-btn"
                      disabled={loading || otpCode.trim().length < 6}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {loading ? "Verifying..." : "Verify & Open"}
                    </button>
                  </div>
                </label>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                  <button
                    type="button"
                    className="manage-sub-btn"
                    onClick={() => setOtpSent(false)}
                  >
                    ← Change Email
                  </button>
                  <button
                    type="button"
                    className="manage-resend-btn"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* ─── ACTIVE DASHBOARD: DROPDOWN & EDIT FORM ─── */
          <div>
            {/* Header bar with email & logout */}
            <div className="manage-user-bar">
              <span>
                Logged in as: <strong className="manage-user-email">{email}</strong>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="manage-logout-btn"
              >
                Log out
              </button>
            </div>

            {/* PRODUCT DROPDOWN: select which floor to manage */}
            {ownedFloors.length > 1 && (
              <label className="manage-field-group" style={{ marginBottom: "16px" }}>
                <span className="manage-label manage-dropdown-label">
                  Select Startup / Floor to Manage:
                </span>
                <select
                  className="manage-input manage-select"
                  value={selectedFloorId || ""}
                  onChange={(e) => setSelectedFloorId(Number(e.target.value))}
                >
                  {ownedFloors.map((f) => (
                    <option key={f.id} value={f.id}>
                      🏢 Floor #{f.rank} — {f.companyName} (₹{f.pricePaid})
                    </option>
                  ))}
                </select>
              </label>
            )}

            {currentFloorMeta && (
              <form className="manage-edit-form" onSubmit={handleSave}>
                <div className="manage-floor-meta">
                  <span>Current Skyscraper Floor: <strong>#{currentFloorMeta.rank}</strong></span>
                  <span>Amount Paid: <strong>₹{currentFloorMeta.pricePaid}</strong></span>
                </div>

                <label className="manage-field-group">
                  <span className="manage-label">Company / Startup Name</span>
                  <input
                    type="text"
                    className="manage-input"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    required
                  />
                </label>

                <label className="manage-field-group">
                  <span className="manage-label">Website URL</span>
                  <input
                    type="url"
                    className="manage-input"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </label>

                <label className="manage-field-group">
                  <span className="manage-label">Industry Category</span>
                  <select
                    className="manage-input manage-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {MAIN_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="manage-field-group">
                  <span className="manage-label">Tagline (Floor Banner Subtitle)</span>
                  <input
                    type="text"
                    className="manage-input"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="e.g. AI-powered search for developers"
                  />
                </label>

                <label className="manage-field-group">
                  <span className="manage-label">Detailed Description</span>
                  <textarea
                    className="manage-input manage-textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What does your company do? Mention pitch, hiring, etc."
                  />
                </label>

                <label className="manage-field-group">
                  <span className="manage-label">Logo Image URL (Optional)</span>
                  <input
                    type="url"
                    className="manage-input"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://yourstartup.com/logo.png"
                  />
                </label>

                <div className="manage-actions-row">
                  <button
                    type="button"
                    className="manage-delete-btn"
                    onClick={handleDelete}
                    disabled={deleting || saving}
                  >
                    {deleting ? "Removing..." : "Vacate Floor"}
                  </button>

                  <div className="manage-right-btns">
                    <button type="button" className="manage-cancel-btn" onClick={onClose}>
                      Cancel
                    </button>
                    <button type="submit" className="manage-save-btn" disabled={saving || deleting}>
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
