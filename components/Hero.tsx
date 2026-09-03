"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Globe, Building, Arrow, Minus, Plus, Search, Close, Check } from "./icons";
import { MAIN_CATEGORIES, SPECIAL_OPTIONS, IndustryCategory } from "@/lib/categories";
import { validateWebsiteSyntax } from "@/lib/validation/domain";
import { useUserAuth } from "@/lib/auth/use-user-auth";

export default function Hero({ onOpenManage }: { onOpenManage?: () => void } = {}) {
  const { user, ownedFloors, login, logout, loading: authLoading } = useUserAuth();
  const [price, setPrice] = useState(50);
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IndustryCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const [minPrice, setMinPrice] = useState(50);
  const [topFloorClaimed, setTopFloorClaimed] = useState(false);
  const [topFloorLock, setTopFloorLock] = useState<{
    isLocked: boolean;
    companyName?: string | null;
    secondsRemaining?: number;
  }>({ isLocked: false });

  // Sync current top floor outbid price and concurrency lock status
  useEffect(() => {
    const fetchTopFloorPrice = () => {
      fetch("/api/floors", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.lock) {
            setTopFloorLock(data.lock);
          }
          if (data.floors && data.floors.length > 0) {
            const top = data.floors[0];
            if (top.isClaimed) {
              setTopFloorClaimed(true);
              const requiredMin = Number(top.pricePaid || 50) + 1;
              setMinPrice(requiredMin);
              setPrice((prev) => Math.max(requiredMin, prev));
            } else {
              setTopFloorClaimed(false);
              setMinPrice(50);
              setPrice(50);
            }
          }
        })
        .catch(() => {});
    };

    fetchTopFloorPrice();

    window.addEventListener("floors-refresh", fetchTopFloorPrice);
    return () => {
      window.removeEventListener("floors-refresh", fetchTopFloorPrice);
    };
  }, []);

  // Handle browser Back / Forward navigation (bfcache restoration)
  useEffect(() => {
    const handlePageShow = () => {
      setIsSubmitting(false);
      const params = new URLSearchParams(window.location.search);
      const paymentId = params.get("payment_id");
      const sessionId = params.get("session_id") || params.get("checkout_id");
      if (!paymentId && !sessionId && params.get("claimed") !== "true") {
        setPaymentNotice(null);
        fetch("/api/floors/lock-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rank: 1 }),
        }).catch(() => {});
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

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
        message: "Verifying payment confirmation...",
      });

      let attempts = 0;
      const maxAttempts = 3;

      const pollVerification = async () => {
        try {
          const res = await fetch(`/api/checkout/verify?${targetQuery}`, { cache: "no-store" });
          const data = await res.json();

          if (data.status === "succeeded") {
            setJustClaimed(data.companyName || "Your company");
            setPaymentNotice(null);
            setIsSubmitting(false);
            window.history.replaceState({}, "", window.location.pathname);

            if (data.customerEmail) {
              localStorage.setItem("getopfloor_manage_email", data.customerEmail);
            }

            // Broadcast floor claim event
            window.dispatchEvent(
              new CustomEvent("floor-claimed-success", {
                detail: {
                  rank: data.rank || 1,
                  companyName: data.companyName,
                  url: data.url,
                  logoUrl: data.logoUrl,
                  tagline: data.tagline,
                  description: data.description,
                  pricePaid: data.price || price,
                },
              })
            );

            // Immediate multi-stage floor refresh to guarantee 3D tower and listings update
            window.dispatchEvent(new CustomEvent("floors-refresh"));
            setTimeout(() => window.dispatchEvent(new CustomEvent("floors-refresh")), 500);
            setTimeout(() => window.dispatchEvent(new CustomEvent("floors-refresh")), 1500);
            return;
          } else if (data.status === "failed") {
            setIsSubmitting(false);
            setPaymentNotice({
              type: "error",
              message:
                data.error ||
                "Payment was not completed. You can try claiming again.",
            });
            window.history.replaceState({}, "", window.location.pathname);
            window.dispatchEvent(new CustomEvent("floors-refresh"));
            return;
          }

          // Still pending/processing at payment gateway -> retry quick backoff
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(pollVerification, 1000);
          } else {
            setIsSubmitting(false);
            setPaymentNotice(null);
            window.history.replaceState({}, "", window.location.pathname);
            window.dispatchEvent(new CustomEvent("floors-refresh"));
          }
        } catch (err) {
          console.warn("Could not verify payment session:", err);
          setIsSubmitting(false);
          setPaymentNotice(null);
          window.history.replaceState({}, "", window.location.pathname);
          window.dispatchEvent(new CustomEvent("floors-refresh"));
        }
      };

      pollVerification();
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

          const syntaxCheck = validateWebsiteSyntax(pending.url);
          if (!syntaxCheck.valid) {
            setPaymentNotice({
              type: "error",
              message: syntaxCheck.error || "Please enter a valid, secure HTTPS website.",
            });
            return;
          }

          setIsSubmitting(true);
          fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: syntaxCheck.cleanUrl || pending.url,
              category: pending.category || "Startup",
              price: pending.price || 50,
            }),
          })
            .then(async (res) => {
              const data = await res.json();
              if (res.ok && data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
              } else {
                setIsSubmitting(false);
                setPaymentNotice({
                  type: "error",
                  message: data.error || "Website verification failed. Please enter an active, secure HTTPS website.",
                });
              }
            })
            .catch(() => {
              setIsSubmitting(false);
              setPaymentNotice({
                type: "error",
                message: "Could not start checkout. Please try again.",
              });
            });
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

    setIsSubmitting(true);
    setPaymentNotice(null);

    try {
      // Live reachability & SSL security pre-verification
      const valRes = await fetch("/api/validate-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: syntaxCheck.cleanUrl || url.trim() }),
      });

      const valData = await valRes.json();
      if (!valRes.ok || !valData.valid) {
        setPaymentNotice({
          type: "error",
          message: valData.error || "This website could not be reached or is not secure. Please enter an active HTTPS website.",
        });
        setIsSubmitting(false);
        return;
      }

      const verifiedUrl = valData.cleanUrl || syntaxCheck.cleanUrl || url.trim();

      // Direct Google Auth Gate before checkout if not logged in
      if (!user) {
        try {
          sessionStorage.setItem(
            "pending_claim_intent",
            JSON.stringify({
              url: verifiedUrl,
              category: selectedCategory?.name || "Startup",
              price: Math.max(50, price),
            })
          );
        } catch (e) {}

        login("/");
        return;
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: verifiedUrl,
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
            onClick={() => onOpenManage?.()}
          >
            Manage
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
        {topFloorClaimed ? "Outbid top floor for" : "Claim top floor for"}
        <span className="price-stepper">
          <button className="step-btn" onClick={() => setPrice((p) => Math.max(minPrice, p - 1))} aria-label="Lower bid" disabled={price <= minPrice}>
            <Minus />
          </button>
          <span className="price">₹{price}</span>
          <button className="step-btn" onClick={() => setPrice((p) => p + 1)} aria-label="Raise bid">
            <Plus />
          </button>
        </span>
      </h1>

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

        <button
          type="submit"
          className={`claim-btn ${topFloorLock.isLocked ? "claim-btn-locked" : ""}`}
          disabled={isSubmitting || topFloorLock.isLocked}
          title={topFloorLock.isLocked ? "Someone is currently in checkout claiming the Top Floor (#1)" : undefined}
        >
          {isSubmitting ? (
            "Verifying..."
          ) : topFloorLock.isLocked ? (
            <>🔒 Claim in progress...</>
          ) : (
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