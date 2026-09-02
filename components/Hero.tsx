"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Globe, Building, Arrow, Minus, Plus, Search, Close, Check } from "./icons";
import { MAIN_CATEGORIES, SPECIAL_OPTIONS, IndustryCategory } from "@/lib/categories";
import { validateWebsiteSyntax } from "@/lib/validation/domain";
import ManageFloorModal from "./ManageFloorModal";

export default function Hero() {
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