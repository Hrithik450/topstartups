"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Globe, Building, Arrow, Minus, Plus, Search, Close, Check } from "./icons";
import { MAIN_CATEGORIES, SPECIAL_OPTIONS, IndustryCategory } from "@/lib/categories";
import { validateWebsiteSyntax } from "@/lib/validation/domain";
import { useUserAuth } from "@/lib/auth/use-user-auth";
import ManageFloorModal from "./ManageFloorModal";

export default function Hero() {
  const { user, ownedFloors, login, logout, loading: authLoading } = useUserAuth();
  const [price, setPrice] = useState(50);
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IndustryCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isManageOpen, setIsManageOpen] = useState(false);

  const categoryWrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [open]);

  // Close dropdown on click/touch outside or Esc key
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Filter categories based on search query
  const query = searchQuery.trim().toLowerCase();

  const filteredMain = useMemo(() => {
    if (!query) return MAIN_CATEGORIES;
    return MAIN_CATEGORIES.filter((c) => c.name.toLowerCase().includes(query));
  }, [query]);

  const filteredSpecial = useMemo(() => {
    if (!query) return SPECIAL_OPTIONS;
    return SPECIAL_OPTIONS.filter((c) => c.name.toLowerCase().includes(query));
  }, [query]);

  const hasAnyMatches = filteredMain.length > 0 || filteredSpecial.length > 0;

  const handleSelect = (cat: IndustryCategory) => {
    setSelectedCategory(cat);
    setOpen(false);
    setSearchQuery("");
  };

  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justClaimed, setJustClaimed] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<{
    type: "error" | "success" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id");
    const sessionId = params.get("session_id") || params.get("checkout_id") || paymentId;

    // Check if returning from a real Dodo checkout session
    if ((paymentId || sessionId) && !sessionId?.startsWith("mock_")) {
      const targetQuery = paymentId
        ? `payment_id=${encodeURIComponent(paymentId)}`
        : `session_id=${encodeURIComponent(sessionId || "")}`;

      setPaymentNotice({
        type: "info",
        message: "Verifying payment confirmation with Dodo Payments...",
      });

      fetch(`/api/checkout/verify?${targetQuery}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "succeeded") {
            setJustClaimed(data.companyName || "Your company");
            setPaymentNotice(null);
            if (data.customerEmail) {
              localStorage.setItem("getopfloor_manage_email", data.customerEmail);
            }
            // Trigger 3D tower reload immediately and after a short tick
            window.dispatchEvent(new CustomEvent("floors-refresh"));
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("floors-refresh"));
            }, 1200);
          } else if (data.status === "failed") {
            setPaymentNotice({
              type: "error",
              message:
                data.error ||
                "Payment was not completed. For test mode INR payments, select UPI and use 'success@upi'.",
            });
          } else {
            setPaymentNotice({
              type: "info",
              message: "Payment is still processing. Your floor will update shortly.",
            });
          }
        })
        .catch((err) => {
          console.warn("Could not verify payment session:", err);
          setPaymentNotice(null);
        })
        .finally(() => {
          window.history.replaceState({}, "", window.location.pathname);
        });
      return;
    }

    if (params.get("claimed") === "true") {
      setJustClaimed(params.get("company") || "Your company");
      window.dispatchEvent(new CustomEvent("floors-refresh"));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Check for pending claim intent after returning from Google Auth
  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    try {
      const pendingRaw = sessionStorage.getItem("pending_claim_intent");
      if (pendingRaw) {
        sessionStorage.removeItem("pending_claim_intent");
        const pending = JSON.parse(pendingRaw);
        if (pending.url) {
          setUrl(pending.url);
          if (pending.price) setPrice(pending.price);
          setIsSubmitting(true);
          fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: pending.url,
              category: pending.category || "Startup",
              price: pending.price || 50,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
              } else {
                setIsSubmitting(false);
              }
            })
            .catch(() => setIsSubmitting(false));
        }
      }
    } catch (e) {}
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setPaymentNotice({
        type: "error",
        message: "Please enter your startup website URL (e.g. acme.ai or yourcompany.com).",
      });
      return;
    }

    // Client-side domain & syntax validation filter
    const syntaxCheck = validateWebsiteSyntax(url.trim());
    if (!syntaxCheck.valid) {
      setPaymentNotice({
        type: "error",
        message: syntaxCheck.error || "Please enter a valid, secure HTTPS website.",
      });
      return;
    }

    // Direct Google Auth Gate before checkout if not logged in
    if (!user) {
      try {
        sessionStorage.setItem(
          "pending_claim_intent",
          JSON.stringify({
            url: syntaxCheck.cleanUrl || url.trim(),
            category: selectedCategory?.name || "Startup",
            price: Math.max(50, price),
          })
        );
      } catch (e) {}

      login("/");
      return;
    }

    setIsSubmitting(true);
    setPaymentNotice(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: syntaxCheck.cleanUrl || url.trim(),
          category: selectedCategory?.name || "Startup",
          price: Math.max(50, price),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      console.error("Checkout error:", err);
      setPaymentNotice({
        type: "error",
        message: err.message || "Could not start checkout. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <section className="hero">
      {/* Top Founder Auth Bar */}
      <div className="hero-auth-bar" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "1rem", gap: "10px" }}>
        {user ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", padding: "4px 12px", borderRadius: "999px" }}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name || "User"} style={{ width: "24px", height: "24px", borderRadius: "50%" }} />
            ) : (
              <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#ff9f43", color: "#000", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold" }}>
                {(user.name || user.email).charAt(0).toUpperCase()}
              </span>
            )}
            <span style={{ fontSize: "13px", fontWeight: 500 }}>{user.name || user.email}</span>
            {ownedFloors.length > 0 && (
              <button
                type="button"
                onClick={() => setIsManageOpen(true)}
                style={{ background: "linear-gradient(135deg,#ff9f43,#ee5253)", border: "none", color: "#fff", padding: "2px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
              >
                My Floors ({ownedFloors.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => logout()}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "12px", cursor: "pointer", marginLeft: "4px" }}
              title="Sign Out"
            >
              Log out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => login()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Sign In with Google
          </button>
        )}
      </div>

      {paymentNotice && (
        <div
          className={`claimed-banner payment-notice ${paymentNotice.type}`}
          role="status"
        >
          <span>{paymentNotice.message}</span>
          <button
            type="button"
            className="claimed-close-btn"
            onClick={() => setPaymentNotice(null)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}

      {justClaimed && (
        <div className="claimed-banner celebration" role="status">
          <span>🏆 Congratulations! <strong>{justClaimed}</strong> has claimed Top Floor (#1)!</span>
          <button
            type="button"
            className="claimed-edit-btn"
            onClick={() => setIsManageOpen(true)}
          >
            Edit Floor
          </button>
          <button
            type="button"
            className="claimed-close-btn"
            onClick={() => setJustClaimed(null)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      )}

      <h1 className="headline">
        Claim top floor for
        <span className="price-stepper">
          <button className="step-btn" onClick={() => setPrice((p) => Math.max(50, p - 1))} aria-label="Lower bid">
            <Minus />
          </button>
          <span className="price">₹{price}</span>
          <button className="step-btn" onClick={() => setPrice((p) => p + 1)} aria-label="Raise bid">
            <Plus />
          </button>
        </span>
      </h1>

      <ManageFloorModal isOpen={isManageOpen} onClose={() => setIsManageOpen(false)} />

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-inputs-row">
          <label className="field url-field">
            <Globe />
            <input
              placeholder="yourcompany.com"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </label>

          <div
            ref={categoryWrapperRef}
            className="category-wrapper"
            style={{ position: "relative", zIndex: open ? 120 : 10 }}
          >
            <button
              type="button"
              className={`field select category-field ${open ? "open" : ""}`}
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={open}
            >
              {selectedCategory?.icon ? (
                <span className="selected-category-icon">
                  {selectedCategory.icon === ">_" ? (
                    <span className="category-code-tag">&gt;_</span>
                  ) : (
                    selectedCategory.icon
                  )}
                </span>
              ) : (
                <Building />
              )}
              <span className="category-label">{selectedCategory?.name ?? "Category"}</span>
              <span className="caret">▾</span>
            </button>

            {open && (
              <div className="category-popover" role="listbox" aria-label="Industry Categories">
                {/* Sticky Search Header */}
                <div className="category-search-header">
                  <div className="category-search-box">
                    <span className="category-search-icon">
                      <Search />
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="category-search-input"
                      placeholder="Search industries..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && filteredMain.length > 0) {
                          e.preventDefault();
                          handleSelect(filteredMain[0]);
                        }
                      }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="category-search-clear"
                        onClick={() => {
                          setSearchQuery("");
                          searchInputRef.current?.focus();
                        }}
                        aria-label="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Scrollable Categories List */}
                <div className="category-scroll-list">
                  {filteredMain.length > 0 && (
                    <div className="category-group">
                      {filteredMain.map((cat) => {
                        const isSelected = selectedCategory?.id === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            className={`category-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelect(cat)}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <span className="category-item-icon">
                              {cat.icon === ">_" ? (
                                <span className="category-code-tag">&gt;_</span>
                              ) : (
                                cat.icon
                              )}
                            </span>
                            <span className="category-item-name">{cat.name}</span>
                            {isSelected && (
                              <span className="category-check-icon">
                                <Check />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredSpecial.length > 0 && (
                    <div className="category-group special">
                      <div className="category-group-header">Special Options</div>
                      {filteredSpecial.map((cat) => {
                        const isSelected = selectedCategory?.id === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            className={`category-item special ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelect(cat)}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <span className="category-item-icon">{cat.icon}</span>
                            <span className="category-item-name">{cat.name}</span>
                            {isSelected && (
                              <span className="category-check-icon">
                                <Check />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!hasAnyMatches && (
                    <div className="category-empty-state">
                      <p className="category-empty-text">No industries matching &ldquo;{searchQuery}&rdquo;</p>
                      <button
                        type="button"
                        className="category-empty-fallback-btn"
                        onClick={() => handleSelect(SPECIAL_OPTIONS[0])}
                      >
                        💡 Select &ldquo;Other&rdquo;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <button type="submit" className="claim-btn" disabled={isSubmitting}>
          {isSubmitting ? "Redirecting..." : (
            <>Claim top floor <Arrow /></>
          )}
        </button>
      </form>

      <p className="subtitle">
        To claim top floor again, use the same URL you used earlier.
        You&apos;ll pay the difference &amp; claim top floor.
      </p>
    </section>
  );
}