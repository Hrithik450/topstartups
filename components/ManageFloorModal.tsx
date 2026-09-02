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

  // Auto-load owned floors whenever modal opens or user logs in
  useEffect(() => {
    if (!isOpen) return;

    if (user?.email) {
      setLoading(true);
      setStatusMsg(null);
      fetch("/api/auth/me", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && Array.isArray(data.ownedFloors) && data.ownedFloors.length > 0) {
            setOwnedFloors(data.ownedFloors);
            setSelectedFloorId((prev) => (prev && data.ownedFloors.some((f: any) => f.id === prev) ? prev : data.ownedFloors[0].id));
          } else {
            setOwnedFloors([]);
            setSelectedFloorId(null);
          }
        })
        .catch((err) => console.warn("Failed to load user floors:", err))
        .finally(() => setLoading(false));
    } else {
      setOwnedFloors([]);
      setSelectedFloorId(null);
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

  // Save floor details
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFloorId) return;

    if (!formData.companyName.trim()) {
      setStatusMsg({ type: "error", text: "Company name cannot be empty." });
      return;
    }

    if (!formData.url.trim()) {
      setStatusMsg({ type: "error", text: "Startup website URL cannot be empty." });
      return;
    }

    const syntaxCheck = validateWebsiteSyntax(formData.url.trim());
    if (!syntaxCheck.valid) {
      setStatusMsg({ type: "error", text: syntaxCheck.error || "Please enter a valid, secure HTTPS website." });
      return;
    }

    setSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/floors/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorId: selectedFloorId,
          companyName: formData.companyName.trim(),
          url: syntaxCheck.cleanUrl || formData.url.trim(),
          category: formData.category.trim(),
          tagline: formData.tagline.trim(),
          description: formData.description.trim(),
          logoUrl: formData.logoUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update floor details.");

      setStatusMsg({ type: "success", text: "Floor details updated successfully! Live 3D tower updated." });

      // Update local state
      setOwnedFloors((prev) =>
        prev.map((f) => (f.id === selectedFloorId ? { ...f, ...formData, url: syntaxCheck.cleanUrl || formData.url.trim() } : f))
      );

      // Trigger global refresh
      window.dispatchEvent(new CustomEvent("floors-refresh"));
      if (onFloorUpdated) onFloorUpdated();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to save changes." });
    } finally {
      setSaving(false);
    }
  };

  // Vacate floor
  const handleDelete = async () => {
    if (!selectedFloorId) return;
    const confirmMsg = "Are you sure you want to vacate this floor? This will reset the floor back to an open slot.";
    if (!confirm(confirmMsg)) return;

    setDeleting(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/floors/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          floorId: selectedFloorId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to vacate floor.");

      setStatusMsg({ type: "success", text: "Floor successfully vacated and returned to open state." });

      const remaining = ownedFloors.filter((f) => f.id !== selectedFloorId);
      setOwnedFloors(remaining);
      setSelectedFloorId(remaining.length > 0 ? remaining[0].id : null);

      window.dispatchEvent(new CustomEvent("floors-refresh"));
      if (onFloorUpdated) onFloorUpdated();
    } catch (err: any) {
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
              {user
                ? `Logged in as ${user.email} — Update startup details, logos, or vacate floors anytime.`
                : "Sign in with Google to manage your claimed skyscraper startups."}
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

        {/* ─── GOOGLE LOGIN REQUIRED IF NOT LOGGED IN ─── */}
        {!user ? (
          <div style={{ marginTop: "24px", textAlign: "center", padding: "20px 0" }}>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", marginBottom: "20px" }}>
              Access and manage all your claimed startup floors across any device.
            </p>
            <button
              type="button"
              onClick={() => login()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                background: "linear-gradient(135deg, rgba(255, 159, 67, 0.2), rgba(238, 82, 83, 0.2))",
                border: "1px solid rgba(255, 159, 67, 0.5)",
                color: "#fff",
                padding: "12px 28px",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Sign In with Google
            </button>
          </div>
        ) : ownedFloors.length === 0 && !loading ? (
          <div style={{ marginTop: "24px", textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.6)" }}>
            <p style={{ fontSize: "15px", marginBottom: "8px" }}>No claimed skyscraper floors found for <strong>{user.email}</strong>.</p>
            <p style={{ fontSize: "13px" }}>Claim a floor on the skyscraper to feature your startup here!</p>
          </div>
        ) : (
          <div>
            {/* Floor Selector Dropdown */}
            {ownedFloors.length > 1 && (
              <div style={{ margin: "16px 0" }}>
                <label className="manage-label">Select Floor to Manage</label>
                <select
                  className="manage-input"
                  value={selectedFloorId || ""}
                  onChange={(e) => setSelectedFloorId(Number(e.target.value))}
                >
                  {ownedFloors.map((f) => (
                    <option key={f.id} value={f.id}>
                      Floor #{f.rank} — {f.companyName} ({f.url})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSave} style={{ marginTop: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label className="manage-field-group">
                  <span className="manage-label">Startup / Company Name</span>
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
                    type="text"
                    className="manage-input"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </label>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="manage-field-group">
                  <span className="manage-label">Industry Category</span>
                  <select
                    className="manage-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {MAIN_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
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
                    placeholder="e.g. Next-Gen AI Platform"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="manage-field-group">
                  <span className="manage-label">About / Description</span>
                  <textarea
                    className="manage-input"
                    rows={3}
                    placeholder="Brief description for hover overview card..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="manage-delete-btn"
                  title="Vacate and reset this floor"
                >
                  {deleting ? "Vacating..." : "Vacate Floor"}
                </button>

                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="manage-save-btn"
                >
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
