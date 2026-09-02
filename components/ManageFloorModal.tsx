"use client";

import { useState, useEffect } from "react";
import { MAIN_CATEGORIES } from "@/lib/categories";

interface ManageFloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialToken?: string;
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
  initialToken = "",
  onFloorUpdated,
}: ManageFloorModalProps) {
  const [authMode, setAuthMode] = useState<"email" | "token">("email");

  // Email OTP state
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [ownedFloors, setOwnedFloors] = useState<FloorItem[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);

  // Legacy Token state
  const [token, setToken] = useState(initialToken);

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

  // Restore stored session or token on open
  useEffect(() => {
    if (!isOpen) return;

    if (initialToken) {
      setAuthMode("token");
      setToken(initialToken);
      fetchLegacyFloor(initialToken);
      return;
    }

    if (typeof window !== "undefined") {
      const storedEmail = localStorage.getItem("getopfloor_manage_email");
      const storedSession = localStorage.getItem("getopfloor_session_token");

      if (storedEmail && storedSession) {
        setEmail(storedEmail);
        setSessionToken(storedSession);
        fetchOwnedFloors(storedEmail, storedSession);
      } else {
        const storedToken = localStorage.getItem("bharathunt_manage_token");
        if (storedToken) {
          setToken(storedToken);
        }
      }
    }
  }, [isOpen, initialToken]);

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
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFloorId || !sessionToken || !email) return;

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
  const handleDeleteEmail = async () => {
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

  // ─── Legacy Token Lookup Fallback ───
  const fetchLegacyFloor = async (tokenToUse: string) => {
    if (!tokenToUse.trim()) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/floors/manage?token=${encodeURIComponent(tokenToUse.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.floor) throw new Error(data.error || "Floor not found for this token");

      setOwnedFloors([data.floor]);
      setSelectedFloorId(data.floor.id);
      setFormData({
        companyName: data.floor.companyName || "",
        url: data.floor.url || "",
        category: data.floor.category || "Startup",
        tagline: data.floor.tagline || "",
        description: data.floor.description || "",
        logoUrl: data.floor.logoUrl || "",
      });
      localStorage.setItem("bharathunt_manage_token", tokenToUse.trim());
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutEmail = () => {
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
              Update startup details, logos, or vacate floors anytime without remembering tokens.
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

        {/* ─── MODE A: EMAIL VERIFICATION (Default & Modern) ─── */}
        {authMode === "email" && !sessionToken && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} style={{ marginTop: "12px" }}>
                <label className="manage-field-group">
                  <span className="manage-label">Enter the Email Used During Checkout</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="email"
                      className="manage-input"
                      placeholder="founder@yourstartup.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
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
                    onClick={() => setOtpSent(false)}
                    style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "12px", cursor: "pointer" }}
                  >
                    ← Change Email
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={loading}
                    style={{ background: "none", border: "none", color: "#818cf8", fontSize: "12px", cursor: "pointer" }}
                  >
                    Resend Code
                  </button>
                </div>
              </form>
            )}

            <div style={{ marginTop: "24px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setAuthMode("token")}
                style={{ background: "none", border: "none", color: "#6b7280", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
              >
                Have an old secret manage token? Enter token instead
              </button>
            </div>
          </div>
        )}

        {/* ─── MODE B: LEGACY TOKEN INPUT ─── */}
        {authMode === "token" && !sessionToken && (
          <div>
            <div className="manage-token-bar">
              <input
                type="text"
                className="manage-input"
                placeholder="Enter secret manage token..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <button
                type="button"
                className="manage-load-btn"
                onClick={() => fetchLegacyFloor(token)}
                disabled={loading || !token.trim()}
              >
                {loading ? "Loading..." : "Find Floor"}
              </button>
            </div>
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setAuthMode("email")}
                style={{ background: "none", border: "none", color: "#818cf8", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
              >
                ← Switch to Email Verification
              </button>
            </div>
          </div>
        )}

        {/* ─── ACTIVE DASHBOARD: DROPDOWN & EDIT FORM ─── */}
        {(sessionToken || (authMode === "token" && ownedFloors.length > 0)) && (
          <div>
            {/* Header bar with email & logout */}
            {sessionToken && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#9ca3af",
                }}
              >
                <span>
                  Logged in as: <strong style={{ color: "#fff" }}>{email}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleLogoutEmail}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f87171",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Log out
                </button>
              </div>
            )}

            {/* PRODUCT DROPDOWN: select which floor to manage */}
            {ownedFloors.length > 1 && (
              <label className="manage-field-group" style={{ marginBottom: "16px" }}>
                <span className="manage-label" style={{ color: "#818cf8", fontWeight: 600 }}>
                  Select Startup / Floor to Manage:
                </span>
                <select
                  className="manage-input manage-select"
                  value={selectedFloorId || ""}
                  onChange={(e) => setSelectedFloorId(Number(e.target.value))}
                  style={{ borderColor: "#6366f1" }}
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
              <form className="manage-edit-form" onSubmit={handleSaveEmail}>
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
                    onClick={handleDeleteEmail}
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
