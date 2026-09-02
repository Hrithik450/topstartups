"use client";

import { useState, useEffect } from "react";
import { MAIN_CATEGORIES } from "@/lib/categories";

interface ManageFloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialToken?: string;
  onFloorUpdated?: () => void;
}

export default function ManageFloorModal({
  isOpen,
  onClose,
  initialToken = "",
  onFloorUpdated,
}: ManageFloorModalProps) {
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [floorData, setFloorData] = useState<{
    rank: number;
    companyName: string;
    url: string;
    category: string;
    tagline: string;
    description: string;
    logoUrl: string;
    pricePaid: number;
  } | null>(null);

  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
      fetchFloor(initialToken);
    } else if (typeof window !== "undefined") {
      const stored = localStorage.getItem("bharathunt_manage_token");
      if (stored) {
        setToken(stored);
        fetchFloor(stored);
      }
    }
  }, [initialToken, isOpen]);

  const fetchFloor = async (tokenToUse: string) => {
    if (!tokenToUse.trim()) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/floors/manage?token=${encodeURIComponent(tokenToUse.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.floor) {
        throw new Error(data.error || "Floor not found for this secret token");
      }
      setFloorData({
        rank: data.floor.rank,
        companyName: data.floor.companyName || "",
        url: data.floor.url || "",
        category: data.floor.category || "Startup",
        tagline: data.floor.tagline || "",
        description: data.floor.description || "",
        logoUrl: data.floor.logoUrl || "",
        pricePaid: data.floor.pricePaid || 50,
      });
      localStorage.setItem("bharathunt_manage_token", tokenToUse.trim());
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
      setFloorData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!floorData || !token.trim()) return;

    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/floors/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          companyName: floorData.companyName,
          url: floorData.url,
          category: floorData.category,
          tagline: floorData.tagline,
          description: floorData.description,
          logoUrl: floorData.logoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update floor");

      setStatusMsg({ type: "success", text: "Floor details updated successfully!" });
      onFloorUpdated?.();
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove your company from this skyscraper floor? This will reset the floor to an available slot.")) {
      return;
    }

    setDeleting(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/floors/manage?token=${encodeURIComponent(token.trim())}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete floor");

      localStorage.removeItem("bharathunt_manage_token");
      setStatusMsg({ type: "success", text: "Floor vacated successfully." });
      onFloorUpdated?.();
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="manage-modal-overlay" onClick={onClose}>
      <div className="manage-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="manage-modal-header">
          <div>
            <h2 className="manage-modal-title">Manage Your Skyscraper Floor</h2>
            <p className="manage-modal-subtitle">Update your startup details or vacate your floor anytime.</p>
          </div>
          <button type="button" className="manage-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Token Input Bar */}
        <div className="manage-token-bar">
          <input
            type="text"
            className="manage-input"
            placeholder="Enter your secret manage token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button
            type="button"
            className="manage-load-btn"
            onClick={() => fetchFloor(token)}
            disabled={loading || !token.trim()}
          >
            {loading ? "Loading..." : "Find Floor"}
          </button>
        </div>

        {statusMsg && (
          <div className={`manage-status-badge ${statusMsg.type}`}>
            {statusMsg.type === "success" ? "✓ " : "⚠ "}
            {statusMsg.text}
          </div>
        )}

        {floorData && (
          <form className="manage-edit-form" onSubmit={handleSave}>
            <div className="manage-floor-meta">
              <span>Current Floor: <strong>#{floorData.rank}</strong></span>
              <span>Paid: <strong>₹{floorData.pricePaid}</strong></span>
            </div>

            <label className="manage-field-group">
              <span className="manage-label">Company Name</span>
              <input
                type="text"
                className="manage-input"
                value={floorData.companyName}
                onChange={(e) => setFloorData({ ...floorData, companyName: e.target.value })}
                required
              />
            </label>

            <label className="manage-field-group">
              <span className="manage-label">Website URL</span>
              <input
                type="url"
                className="manage-input"
                value={floorData.url}
                onChange={(e) => setFloorData({ ...floorData, url: e.target.value })}
                required
              />
            </label>

            <label className="manage-field-group">
              <span className="manage-label">Industry Category</span>
              <select
                className="manage-input manage-select"
                value={floorData.category}
                onChange={(e) => setFloorData({ ...floorData, category: e.target.value })}
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
                value={floorData.tagline}
                onChange={(e) => setFloorData({ ...floorData, tagline: e.target.value })}
                placeholder="e.g. AI-powered search for developers"
              />
            </label>

            <label className="manage-field-group">
              <span className="manage-label">Detailed Description</span>
              <textarea
                className="manage-input manage-textarea"
                rows={3}
                value={floorData.description}
                onChange={(e) => setFloorData({ ...floorData, description: e.target.value })}
                placeholder="What does your company do? Mention pitch, hiring, etc."
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
    </div>
  );
}
