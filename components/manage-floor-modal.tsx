"use client";

import { useState, useEffect } from "react";
import { MAIN_CATEGORIES } from "@/lib/categories";
import { validateWebsiteSyntax, extractRootHostname } from "@/lib/validation/domain";
import { useUserStore } from "@/store/user-store";
import { useFloorsStore } from "@/store/floors-store";
import { useErrorStore } from "@/store/error-store";
import { updateFloorAction, deleteFloorAction } from "@/actions/floors/floors.actions";
import { Close } from "./icons";

interface ManageFloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFloorUpdated?: () => void;
}

export function ManageFloorModal({ isOpen, onClose, onFloorUpdated }: ManageFloorModalProps) {
  const { user, login, isLoading: authLoading } = useUserStore();
  const { floors, ownedFloors, setOwnedFloors, addNewFloor } = useFloorsStore();
  const { showSuccess, showError } = useErrorStore();

  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [outbidding, setOutbidding] = useState(false);

  // Status & loading
  const loading = authLoading;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Active form data
  const [formData, setFormData] = useState<{
    companyUrl: string;
    category: string;
    tagline: string;
    description: string;
    logoUrl: string;
  }>({
    companyUrl: "",
    category: "Startup",
    tagline: "",
    description: "",
    logoUrl: "",
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setStatusMsg(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload logo to Vercel Blob Storage");
      }

      setFormData((prev) => ({ ...prev, logoUrl: data.url }));
      setStatusMsg({ type: "success", text: "✓ Logo uploaded successfully!" });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to upload image." });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Derive top floor required price
  const maxClaimedPrice = floors.reduce((max, f) => Math.max(max, Number(f.pricePaid || 0)), 0);
  const topFloorPrice = maxClaimedPrice > 0 ? maxClaimedPrice + 1 : 99;

  // Reset status msg when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStatusMsg(null);
  }, [isOpen]);

  useEffect(() => {
    if (ownedFloors.length > 0) {
      setSelectedFloorId((prev) =>
        prev && ownedFloors.some((f) => String(f.id) === String(prev)) ? prev : ownedFloors[0].id
      );
    } else {
      setSelectedFloorId(null);
    }
  }, [ownedFloors]);

  // When selected floor changes in dropdown, populate form
  useEffect(() => {
    if (!selectedFloorId || ownedFloors.length === 0) return;
    const current = ownedFloors.find((f) => f.id === selectedFloorId);
    if (current) {
      setFormData({
        companyUrl: current.companyUrl || "",
        category: current.category || "Startup",
        tagline: current.tagline || "",
        description: current.description || "",
        logoUrl: current.logoUrl || "",
      });
    }
  }, [selectedFloorId, ownedFloors]);

  // Outbid and reclaim Top Floor #1 for the difference price (gateway minimum ₹50)
  const handleOutbidUpgrade = async () => {
    const current = ownedFloors.find((f) => f.id === selectedFloorId);
    if (!current) return;

    setOutbidding(true);
    setStatusMsg(null);

    try {
      const diff = Math.max(50, topFloorPrice - Number(current.pricePaid || 0));
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyUrl: current.companyUrl,
          category: current.category,
          price: diff,
          targetRank: 1,
          customerName: user?.name || undefined,
          customerEmail: user?.email || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Failed to initiate outbid checkout");
      }

      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Could not start outbid upgrade." });
      setOutbidding(false);
    }
  };

  // Save floor details
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFloorId) return;

    if (!formData.companyUrl.trim()) {
      setStatusMsg({ type: "error", text: "Startup website URL is required." });
      return;
    }

    const syntaxCheck = validateWebsiteSyntax(formData.companyUrl.trim());
    if (!syntaxCheck.valid) {
      setStatusMsg({
        type: "error",
        text: syntaxCheck.error || "Please enter a valid, secure HTTPS website.",
      });
      return;
    }

    setSaving(true);
    setStatusMsg(null);

    try {
      const cleanUrl = syntaxCheck.cleanUrl || formData.companyUrl.trim();
      const derivedCompanyName = extractRootHostname(cleanUrl).toLowerCase();

      // 1. Optimistically update Zustand floors store immediately
      addNewFloor({
        id: String(selectedFloorId),
        companyName: derivedCompanyName,
        companyUrl: cleanUrl,
        category: formData.category.trim(),
        tagline: formData.tagline.trim(),
        description: formData.description.trim(),
        logoUrl: formData.logoUrl.trim() || null,
      });

      // 2. Trigger global success toast alert
      showSuccess("Floor details updated successfully!");

      // 3. Call server action
      const res = await updateFloorAction(
        {
          floorId: String(selectedFloorId),
          companyName: derivedCompanyName,
          companyUrl: cleanUrl,
          category: formData.category.trim(),
          tagline: formData.tagline.trim(),
          description: formData.description.trim(),
          logoUrl: formData.logoUrl.trim() || null,
        },
        user?.email || ""
      );

      if (!res.success) throw new Error(res.error || "Failed to update floor details.");

      setStatusMsg({
        type: "success",
        text: "Floor details updated successfully! Live 3D tower updated.",
      });

      // Update local state
      setOwnedFloors(
        ownedFloors.map((f) =>
          f.id === selectedFloorId
            ? {
                ...f,
                ...formData,
                companyName: derivedCompanyName,
                companyUrl: cleanUrl,
              }
            : f
        )
      );

      if (onFloorUpdated) onFloorUpdated();
    } catch (err: any) {
      showError(err.message || "Failed to save changes.");
      setStatusMsg({ type: "error", text: err.message || "Failed to save changes." });
    } finally {
      setSaving(false);
    }
  };

  // Vacate floor
  const handleDelete = async () => {
    if (!selectedFloorId) return;
    const confirmMsg =
      "Are you sure you want to vacate this floor? This will reset the floor back to an open slot.";
    if (!confirm(confirmMsg)) return;

    setDeleting(true);
    setStatusMsg(null);

    try {
      const res = await deleteFloorAction(String(selectedFloorId), user?.email || "");
      if (!res.success) throw new Error(res.error || "Failed to vacate floor.");

      showSuccess("Floor successfully vacated.");
      setStatusMsg({
        type: "success",
        text: "Floor successfully vacated and returned to open state.",
      });

      const remaining = ownedFloors.filter((f) => f.id !== selectedFloorId);
      setOwnedFloors(remaining);
      setSelectedFloorId(remaining.length > 0 ? remaining[0].id : null);

      if (onFloorUpdated) onFloorUpdated();
    } catch (err: any) {
      showError(err.message || "Failed to vacate floor.");
      setStatusMsg({ type: "error", text: err.message || "Failed to vacate floor." });
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="manage-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="manage-modal-container animate-scale-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="manage-modal-header">
          <div>
            <h2 className="manage-modal-title">Manage Your Skyscraper Floors</h2>
            <p className="manage-modal-subtitle">
              {loading || authLoading
                ? "Connecting to verified startup skyscraper database..."
                : user
                  ? `Logged in as ${user.email} — Update startup details, logos, or vacate floors anytime.`
                  : "Sign in with Google to manage your claimed skyscraper startups."}
            </p>
          </div>
          <button
            type="button"
            className="manage-modal-close"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <Close />
          </button>
        </div>

        {statusMsg && (
          <div className={`manage-status-badge ${statusMsg.type}`}>
            {statusMsg.type === "success" ? "✓ " : statusMsg.type === "info" ? "ℹ " : "⚠ "}
            {statusMsg.text}
          </div>
        )}

        {/* ─── 1. CLEAN ANIMATED LOADER WHILE FETCHING ─── */}
        {loading || authLoading ? (
          <div className="manage-modal-loading">
            <div className="manage-spinner" />
            <h4 className="manage-loading-text">Fetching your skyscraper floors...</h4>
            <p className="manage-loading-sub">Connecting securely to verified database</p>
          </div>
        ) : !user ? (
          /* ─── 2. GOOGLE LOGIN REQUIRED IF NOT LOGGED IN ─── */
          <div className="manage-auth-box">
            <p className="manage-auth-desc">
              Access and manage all your claimed startup floors across any device.
            </p>
            <button type="button" onClick={() => login()} className="manage-google-btn">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign In with Google
            </button>
          </div>
        ) : ownedFloors.length === 0 ? (
          /* ─── 3. ZERO CLAIMED PRODUCTS STATE ─── */
          <div className="manage-empty-box">
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏢</div>
            <h3 className="manage-empty-title">0 Claimed Products / Floors</h3>
            <p className="manage-empty-desc">
              No claimed skyscraper floors found for <strong>{user.email}</strong>. Claim a floor to
              feature your company on the 3D tower!
            </p>
            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}
            >
              <button
                type="button"
                className="manage-btn-primary"
                onClick={() => {
                  onClose();
                  setTimeout(() => {
                    const inputEl = document.querySelector<HTMLInputElement>(".url-field input");
                    if (inputEl) {
                      inputEl.focus();
                      inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }, 150);
                }}
              >
                Claim Top Floor Now
              </button>
              <button type="button" className="manage-btn-secondary" onClick={() => login()}>
                Switch Account
              </button>
            </div>
          </div>
        ) : (
          /* ─── 4. EDIT FORM FOR CLAIMED PRODUCTS ─── */
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Floor Selector Dropdown */}
            {ownedFloors.length > 1 && (
              <div>
                <label className="manage-label">Select Floor to Manage</label>
                <select
                  className="manage-input"
                  value={selectedFloorId || ""}
                  onChange={(e) => setSelectedFloorId(e.target.value)}
                >
                  {ownedFloors.map((f) => {
                    const idx = floors.findIndex((fl) => fl.id === f.id || fl.companyUrl === f.companyUrl);
                    const rankDisplay = idx !== -1 ? idx + 1 : f.rank || "—";
                    return (
                      <option key={f.id} value={f.id}>
                        Floor #{rankDisplay} — {f.companyUrl}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Outbid & Reclaim Top Floor Upgrade Banner */}
            {(() => {
              const current = ownedFloors.find((f) => f.id === selectedFloorId);
              if (!current) return null;

              const idx = floors.findIndex(
                (fl) => fl.id === current.id || fl.companyUrl === current.companyUrl
              );
              const currentRank = idx !== -1 ? idx + 1 : current.rank;

              if (currentRank && currentRank > 1) {
                const diff = Math.max(50, topFloorPrice - Number(current.pricePaid || 0));
                const newTotal = Number(current.pricePaid || 0) + diff;
                return (
                  <div className="manage-outbid-banner" style={{ marginTop: 0 }}>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#ff6b1a",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>⚡ Reclaim Penthouse Floor #1</span>
                        <span
                          style={{
                            fontSize: "12px",
                            opacity: 0.9,
                            color: "#fff",
                            background: "#ff6b1a",
                            padding: "2px 8px",
                            borderRadius: "999px",
                          }}
                        >
                          Currently Floor #{currentRank}
                        </span>
                      </div>
                      <p className="manage-outbid-desc">
                        You previously paid ₹{current.pricePaid}. Outbid for{" "}
                        <strong>₹{diff}</strong> (minimum ₹50 outbid rule) to reclaim{" "}
                        <strong>Top Floor #1</strong> with a total floor value of{" "}
                        <strong>₹{newTotal}</strong>!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOutbidUpgrade}
                      disabled={outbidding}
                      className="manage-btn-primary"
                      style={{ padding: "8px 16px", fontSize: "13px" }}
                    >
                      {outbidding ? "Connecting..." : `⚡ Outbid for ₹${diff} →`}
                    </button>
                  </div>
                );
              } else if (currentRank === 1) {
                return (
                  <div
                    className="manage-penthouse-banner"
                    style={{
                      marginTop: 0,
                      padding: "9px 13px",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: "10px",
                      fontSize: "13px",
                      color: "#10b981",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>
                      👑 Currently occupying the #1 Top Penthouse Floor (₹{current.pricePaid} paid)
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Edit Form */}
            <form onSubmit={handleSave} style={{ marginTop: "4px" }}>
              <div>
                <label className="manage-field-group">
                  <span className="manage-label">Website URL</span>
                  <input
                    type="url"
                    required
                    className="manage-input"
                    value={formData.companyUrl}
                    onChange={(e) => setFormData({ ...formData, companyUrl: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="manage-field-group">
                  <span className="manage-label">Industry Category</span>
                  <select
                    className="manage-input manage-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {MAIN_CATEGORIES.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="manage-field-group">
                  <span className="manage-label">Tagline (One-Liner)</span>
                  <input
                    type="text"
                    className="manage-input"
                    placeholder="e.g. World's fastest developer tool"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="manage-field-group">
                  <span className="manage-label">About / Description</span>
                  <textarea
                    rows={2}
                    className="manage-input"
                    placeholder="Short description displayed on hover card..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="manage-field-group">
                  <span className="manage-label">Company Logo (Vercel Blob Storage)</span>
                  <div
                    style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "6px" }}
                  >
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo preview"
                        className="manage-logo-preview"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://www.google.com/s2/favicons?domain=${formData.companyUrl || "getopfloor.com"}&sz=128`;
                        }}
                      />
                    ) : (
                      <div className="manage-logo-preview">🏢</div>
                    )}
                    <div style={{ flex: 1, display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        className="manage-input"
                        placeholder="Logo URL or upload image file..."
                        value={formData.logoUrl}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      />
                      <label className="manage-file-upload-btn">
                        {uploadingLogo ? "Uploading..." : "Upload File"}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          disabled={uploadingLogo}
                          onChange={handleLogoUpload}
                        />
                      </label>
                    </div>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="manage-delete-btn"
                  title="Vacate and reset this floor"
                >
                  {deleting ? "Vacating..." : "Vacate Floor"}
                </button>

                <button type="submit" disabled={saving || deleting} className="manage-save-btn">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
