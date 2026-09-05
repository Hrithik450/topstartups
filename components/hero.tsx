"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Globe, Building, Arrow, Minus, Plus, Search, Check, ChevronDown } from "./icons";
import { MAIN_CATEGORIES, SPECIAL_OPTIONS, IndustryCategory } from "@/lib/categories";
import { validateWebsiteSyntax, extractRootHostname } from "@/lib/validation/domain";
import { extractDodoRedirectParams } from "@/lib/dodo";
import { useFloorsStore } from "@/store/floors-store";

async function safeFetchJson(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (res.status === 429) {
      throw new Error(
        "Too many requests or security check active. Please wait a few seconds and try again."
      );
    }
    if (!res.ok) {
      throw new Error(`Server temporarily unavailable (${res.status}). Please try again.`);
    }
    throw new Error("Unexpected server response format. Please refresh the page and try again.");
  }
  return await res.json();
}

export function Hero({
  initialFloors = [],
}: {
  initialFloors?: any[];
} = {}) {
  const maxInitialPrice = initialFloors.reduce(
    (max: number, f: any) => Math.max(max, Number(f.pricePaid || 0)),
    0
  );
  const initialTopPrice = initialFloors.length > 0 ? maxInitialPrice + 1 : 99;

  const [price, setPrice] = useState(initialTopPrice);
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
  const [justClaimed, setJustClaimed] = useState<{
    companyName: string;
    rank?: number;
  } | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<{
    type: "error" | "success" | "info";
    message: string;
  } | null>(null);

  const storeFloors = useFloorsStore((s) => s.floors);
  const activeFloors = storeFloors.length > 0 ? storeFloors : initialFloors;

  const maxClaimedPrice = useMemo(
    () => activeFloors.reduce((max: number, f: any) => Math.max(max, Number(f.pricePaid || 0)), 0),
    [activeFloors]
  );
  const topFloorClaimed = activeFloors.length > 0;
  const topFloorPrice = topFloorClaimed ? maxClaimedPrice + 1 : 99;

  // Auto-adjust default price when top floor changes
  useEffect(() => {
    setPrice((prev) => (prev === 0 || prev === 99 || prev < topFloorPrice ? topFloorPrice : prev));
  }, [topFloorPrice]);

  // Check if current URL input already exists on the skyscraper
  const existingFloorOnTower = useMemo(() => {
    if (!url || url.trim().length < 3) return null;
    const cleanHost = extractRootHostname(url).toLowerCase();
    if (!cleanHost || cleanHost.length < 3) return null;
    return (
      activeFloors.find((f) => {
        const floorUrl = f.companyUrl || f.url || "";
        const fHost = extractRootHostname(floorUrl).toLowerCase();
        const fName = (f.companyName || "").toLowerCase();
        return fHost === cleanHost || fName === cleanHost;
      }) || null
    );
  }, [url, activeFloors]);

  // Difference price required to reclaim top floor #1 (gateway minimum ₹50)
  const differencePrice = useMemo(() => {
    if (!existingFloorOnTower || existingFloorOnTower.rank === 1) return 0;
    return Math.max(50, topFloorPrice - Number(existingFloorOnTower.pricePaid || 0));
  }, [existingFloorOnTower, topFloorPrice]);

  // If existing floor detected on lower rank, auto-switch to difference price
  useEffect(() => {
    if (existingFloorOnTower && existingFloorOnTower.rank > 1) {
      setPrice(differencePrice);
    }
  }, [existingFloorOnTower, differencePrice]);

  // Auto-populate category if existing floor already has one
  useEffect(() => {
    if (existingFloorOnTower && !selectedCategory && existingFloorOnTower.category) {
      const catName = existingFloorOnTower.category.trim();
      const match =
        MAIN_CATEGORIES.find((c) => c.name.toLowerCase() === catName.toLowerCase()) ||
        SPECIAL_OPTIONS.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (match) {
        setSelectedCategory(match);
      } else {
        setSelectedCategory({ id: "existing-cat", name: catName, icon: "🏢" });
      }
    }
  }, [existingFloorOnTower, selectedCategory]);

  // Normal bidding: all new bids and reclaims can enter any price >= ₹50 (minimum cutoff)
  const targetRank = 1;
  const minAllowedPrice = 50;

  // Handle browser Back / Forward navigation (bfcache restoration)
  useEffect(() => {
    const handlePageShow = () => {
      setIsSubmitting(false);
      useFloorsStore.getState().syncFloors(true);
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const { paymentId, sessionId, targetId, status } = extractDodoRedirectParams(
      new URLSearchParams(window.location.search)
    );

    // Check if returning from a real Dodo checkout session
    if (targetId && !targetId.startsWith("mock_")) {
      const statusParam = status?.toLowerCase();
      if (statusParam === "failed" || statusParam === "cancelled") {
        setIsSubmitting(false);
        setPaymentNotice({
          type: "error",
          message:
            "Your payment was cancelled or could not be completed. Your account was not charged. You can restart checkout whenever you're ready.",
        });
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      const queryParts: string[] = [];
      if (paymentId) queryParts.push(`payment_id=${encodeURIComponent(paymentId)}`);
      if (sessionId) queryParts.push(`session_id=${encodeURIComponent(sessionId)}`);
      const targetQuery = queryParts.join("&");

      setPaymentNotice({
        type: "info",
        message: "Verifying payment confirmation...",
      });

      let attempts = 0;
      const maxAttempts = 10;

      const pollVerification = async () => {
        try {
          const res = await fetch(`/api/checkout/verify?${targetQuery}`, { cache: "no-store" });
          const data = await safeFetchJson(res);

          if (data.status === "succeeded") {
            const assignedRank = typeof data.rank === "number" ? data.rank : undefined;
            setJustClaimed({
              companyName: data.companyName || "Your company",
              rank: assignedRank,
            });
            setPaymentNotice(null);
            setIsSubmitting(false);
            window.history.replaceState({}, "", window.location.pathname);

            if (data.customerEmail) {
              localStorage.setItem("getopfloor_manage_email", data.customerEmail);
            }

            // Immediately push the newly claimed floor into Zustand store so 3D tower and listings re-render right away!
            useFloorsStore.getState().addNewFloor({
              id: data.id,
              companyName: data.companyName,
              companyUrl: data.companyUrl || data.url,
              category: data.category || "Startup",
              tagline: data.tagline || "",
              description: data.description || "",
              logoUrl: data.logoUrl || null,
              pricePaid: Number(data.price || price),
              claimedAt: new Date(),
            });

            // Broadcast floor claim event for the owner (triggers syncFloors in main.tsx)
            window.dispatchEvent(
              new CustomEvent("floor-claimed-success", {
                detail: {
                  isOwner: true,
                  rank: assignedRank || 1,
                  companyName: data.companyName,
                  url: data.companyUrl || data.url,
                  logoUrl: data.logoUrl,
                  tagline: data.tagline,
                  description: data.description,
                  pricePaid: data.price || price,
                },
              })
            );

            return;
          } else if (data.status === "failed") {
            setIsSubmitting(false);
            setPaymentNotice({
              type: "error",
              message: data.error || "Payment was not completed. You can try claiming again.",
            });
            window.history.replaceState({}, "", window.location.pathname);
            return;
          }

          // Still pending/processing at payment gateway -> retry quick backoff
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(pollVerification, 1200);
          } else {
            setIsSubmitting(false);
            setPaymentNotice({
              type: "info",
              message:
                "Your payment was received and is confirming. Your floor will appear momentarily!",
            });
            window.history.replaceState({}, "", window.location.pathname);
          }
        } catch (err) {
          console.warn("Could not verify payment session:", err);
          setIsSubmitting(false);
          setPaymentNotice(null);
          window.history.replaceState({}, "", window.location.pathname);
        }
      };

      pollVerification();
      return;
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

    if (!selectedCategory) {
      setPaymentNotice({
        type: "error",
        message: "Category is mandatory. Please select an industry category for your startup.",
      });
      setOpen(true);
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
      const targetUrl = syntaxCheck.cleanUrl || url.trim();

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          category: selectedCategory.name,
          price: Math.max(50, price),
          targetRank,
        }),
      });

      const data = await safeFetchJson(res);
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
        <div className={`claimed-banner payment-notice ${paymentNotice.type}`} role="status">
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
          <span>
            🏆 <strong>{justClaimed.companyName}</strong> claimed{" "}
            {justClaimed.rank === 1
              ? "Top Floor #1"
              : justClaimed.rank
                ? `Floor #${justClaimed.rank}`
                : "a floor"}
            !
          </span>
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

      {/* Existing Floor Reclaim / Top Floor Status Notice */}
      {existingFloorOnTower && existingFloorOnTower.rank === 1 && (
        <div className="claimed-banner celebration" style={{ marginBottom: "16px" }} role="status">
          <span>
            👑 <strong>{existingFloorOnTower.companyName || url}</strong> holds Top Floor #1 (₹{existingFloorOnTower.pricePaid}). Boost your bid to defend your spot!
          </span>
        </div>
      )}

      {existingFloorOnTower && existingFloorOnTower.rank > 1 && (
        <div
          className="claimed-banner outbid-notice"
          style={{ marginBottom: "16px" }}
          role="status"
        >
          <span>
            ⚡ <strong>{existingFloorOnTower.companyName || url}</strong> is on Floor #
            {existingFloorOnTower.rank} (₹{existingFloorOnTower.pricePaid}). Bid{" "}
            <strong>₹50+</strong> to climb, or <strong>₹{differencePrice}</strong> for{" "}
            <strong>Top Floor #1</strong>!
          </span>
        </div>
      )}

      <h1 className="headline">
        {existingFloorOnTower && existingFloorOnTower.rank > 1
          ? price >= differencePrice
            ? "Outbid & reclaim top floor for"
            : "Boost your floor for"
          : existingFloorOnTower && existingFloorOnTower.rank === 1
            ? "Defend & boost Top Floor #1 for"
            : price >= topFloorPrice
              ? topFloorClaimed
                ? "Outbid top floor for"
                : "Claim top floor for"
              : "Claim a floor for"}
        <span className="price-stepper">
          <button
            type="button"
            className="step-btn"
            onClick={() => setPrice((p) => Math.max(minAllowedPrice, (p || minAllowedPrice) - 1))}
            aria-label="Lower bid"
            disabled={price <= minAllowedPrice}
          >
            <Minus />
          </button>
          <span
            className="price-editable-wrap"
            title="Click or tap to type any custom bid amount (min ₹50)"
          >
            <span className="price-currency">₹</span>
            <input
              type="number"
              className="price-input"
              value={price === 0 ? "" : price}
              min={minAllowedPrice}
              placeholder={String(minAllowedPrice)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setPrice(0);
                  return;
                }
                const val = parseInt(raw, 10);
                if (!isNaN(val)) {
                  setPrice(val);
                }
              }}
              onBlur={() => {
                setPrice((p) => Math.max(minAllowedPrice, p || minAllowedPrice));
              }}
              style={{
                width: `${Math.max(2, String(price || minAllowedPrice).length + 0.5)}ch`,
                minWidth: "2ch",
                cursor: "text",
              }}
              aria-label="Custom Bid Price in INR"
            />
          </span>
          <button
            type="button"
            className="step-btn"
            onClick={() => setPrice((p) => (p === 0 ? minAllowedPrice : p + 1))}
            aria-label="Raise bid"
          >
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
              <span className={`category-chevron ${open ? "open" : ""}`}>
                <ChevronDown />
              </span>
            </button>

            {/* Dropdown Popover */}
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
                      <p className="category-empty-text">
                        No industries matching &ldquo;{searchQuery}&rdquo;
                      </p>
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
          {isSubmitting ? (
            "Verifying..."
          ) : existingFloorOnTower && existingFloorOnTower.rank === 1 ? (
            <>
              👑 Defend & Boost Top Floor #1 for ₹{price} <Arrow />
            </>
          ) : existingFloorOnTower && existingFloorOnTower.rank > 1 ? (
            price >= differencePrice ? (
              <>
                ⚡ Outbid & Reclaim Top Floor #1 for ₹{price} <Arrow />
              </>
            ) : (
              <>
                ⚡ Boost Floor for ₹{price} <Arrow />
              </>
            )
          ) : price >= topFloorPrice ? (
            topFloorClaimed ? (
              <>
                ⚡ Outbid Top Floor #1 for ₹{price} <Arrow />
              </>
            ) : (
              <>
                ⚡ Claim Top Floor #1 for ₹{price} <Arrow />
              </>
            )
          ) : (
            <>
              ⚡ Claim Floor for ₹{price} <Arrow />
            </>
          )}
        </button>
      </form>

      <p className="subtitle">
        Claim your startup&apos;s floor on the digital skyscraper. Outbid competitors to take Top
        Floor #1.
      </p>

      <div className="policy-links-container">
        <a href="/rules" className="policy-link">
          Platform Rules
        </a>
        <span className="policy-dot">•</span>
        <a href="/terms" className="policy-link">
          Terms
        </a>
        <span className="policy-dot">•</span>
        <a href="/privacy" className="policy-link">
          Privacy
        </a>
      </div>
    </section>
  );
}
