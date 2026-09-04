"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Globe, Building, Arrow, Minus, Plus, Search, Close, Check, ChevronDown } from "./icons";
import { MAIN_CATEGORIES, SPECIAL_OPTIONS, IndustryCategory } from "@/lib/categories";
import { validateWebsiteSyntax } from "@/lib/validation/domain";
import { useUserStore } from "@/store/user-store";
import { useFloorsStore } from "@/store/floors-store";

async function safeFetchJson(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (res.status === 429) {
      throw new Error("Too many requests or security check active. Please wait a few seconds and try again.");
    }
    if (!res.ok) {
      throw new Error(`Server temporarily unavailable (${res.status}). Please try again.`);
    }
    throw new Error("Unexpected server response format. Please refresh the page and try again.");
  }
  return await res.json();
}

export function Hero({
  onOpenManage,
  initialFloors = [],
  initialLocks = {},
}: {
  onOpenManage?: () => void;
  initialFloors?: any[];
  initialLocks?: Record<number, any>;
} = {}) {
  const { user, login, logout, isLoading: authLoading } = useUserStore();
  const { ownedFloors } = useFloorsStore();

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
      if (
        categoryWrapperRef.current &&
        !categoryWrapperRef.current.contains(e.target as Node)
      ) {
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
  const [topFloorPrice, setTopFloorPrice] = useState(initialTopPrice);
  const [topFloorClaimed, setTopFloorClaimed] = useState(initialFloors.length > 0);
  const [allLocks, setAllLocks] = useState<Record<number, {
    isLocked: boolean;
    lockedByEmail?: string | null;
    companyName?: string | null;
    secondsRemaining?: number;
  }>>(initialLocks as any);

  const [activeFloors, setActiveFloors] = useState<any[]>(initialFloors);

  // Check if current URL input already exists on the skyscraper
  const existingFloorOnTower = useMemo(() => {
    if (!url || url.trim().length < 3) return null;
    const cleanHost = url
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLowerCase()
      .trim();
    if (!cleanHost || cleanHost.length < 3) return null;
    return activeFloors.find((f) => {
      if (!f.isClaimed) return false;
      const fHost = (f.url || "")
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0]
        .toLowerCase()
        .trim();
      return fHost === cleanHost;
    });
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

  // Normal bidding: all new bids and reclaims target Top Penthouse Floor #1
  const targetRank = 1;
  const minAllowedPrice = useMemo(() => {
    if (existingFloorOnTower && existingFloorOnTower.rank > 1) return differencePrice;
    return topFloorPrice;
  }, [existingFloorOnTower, differencePrice, topFloorPrice]);

  const targetLock = allLocks[1] || { isLocked: false };
  const userEmail = user?.email?.toLowerCase().trim();
  const lockHolderEmail = targetLock.lockedByEmail?.toLowerCase().trim();
  const isHeldByMe = Boolean(userEmail && lockHolderEmail && userEmail === lockHolderEmail);
  const isTargetLocked = Boolean(targetLock.isLocked);
  const isStrangerLocked = Boolean(isTargetLocked && !isHeldByMe);

  // Sync current floors and concurrency locks
  const fetchFloorsAndLocks = () => {
    fetch("/api/floors", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setAllLocks(data.locks || {});
        if (data.floors) {
          setActiveFloors(data.floors);
          const maxClaimedPrice = data.floors.reduce(
            (max: number, f: any) => Math.max(max, Number(f.pricePaid || 0)),
            0
          );
          const hasClaimed = data.floors.length > 0;
          const requiredTopPrice = hasClaimed ? maxClaimedPrice + 1 : 99;
          setTopFloorClaimed(hasClaimed);
          setTopFloorPrice(requiredTopPrice);
          setPrice((prev) => Math.max(requiredTopPrice, prev));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchFloorsAndLocks();

    const handleLocksUpdated = (e: any) => {
      const raw = e.detail;
      if (!raw) return;
      if (Array.isArray(raw)) {
        const lockMap: Record<number, any> = {};
        for (const l of raw) {
          lockMap[l.targetRank] = {
            isLocked: true,
            targetRank: l.targetRank,
            lockedByEmail: l.lockedByEmail,
            companyName: l.companyName,
            secondsRemaining: 360,
          };
        }
        setAllLocks(lockMap);
      } else if (typeof raw === "object") {
        setAllLocks(raw);
      }
    };

    window.addEventListener("floors-refresh", fetchFloorsAndLocks);
    window.addEventListener("floor-claimed-success", fetchFloorsAndLocks);
    window.addEventListener("locks-updated", handleLocksUpdated);
    return () => {
      window.removeEventListener("floors-refresh", fetchFloorsAndLocks);
      window.removeEventListener("floor-claimed-success", fetchFloorsAndLocks);
      window.removeEventListener("locks-updated", handleLocksUpdated);
    };
  }, []);

  // Handle floor selection from 3D scene / hover card
  useEffect(() => {
    const handleSelectFloorPrice = (e: any) => {
      const detail = e.detail;
      if (detail && typeof detail.price === "number") {
        setPrice(Math.max(50, detail.price));
      }
    };

    window.addEventListener("select-floor-price", handleSelectFloorPrice);
    return () => {
      window.removeEventListener("select-floor-price", handleSelectFloorPrice);
    };
  }, []);

  // Handle browser Back / Forward navigation (bfcache restoration)
  useEffect(() => {
    const handlePageShow = () => {
      setIsSubmitting(false);
      if (user?.email) {
        fetch("/api/checkout/release-lock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, targetRank }),
        })
          .then(() => fetchFloorsAndLocks())
          .catch(() => fetchFloorsAndLocks());
      } else {
        fetchFloorsAndLocks();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [user, targetRank]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id");
    const rawSessionId =
      params.get("session_id") ||
      params.get("checkout_session_id") ||
      params.get("checkout_id");
    const sessionId = rawSessionId && rawSessionId !== "{CHECKOUT_ID}" ? rawSessionId : null;
    const targetId = paymentId || sessionId;

    // Check if returning from a real Dodo checkout session
    if (targetId && !targetId.startsWith("mock_")) {
      const statusParam = params.get("status")?.toLowerCase();
      if (statusParam === "failed" || statusParam === "cancelled") {
        setIsSubmitting(false);
        setPaymentNotice({
          type: "error",
          message:
            "Your payment was cancelled or could not be completed. Your account was not charged. You can restart checkout whenever you're ready.",
        });
        window.history.replaceState({}, "", window.location.pathname);
        window.dispatchEvent(new CustomEvent("floors-refresh"));
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
            setJustClaimed(data.companyName || "Your company");
            setPaymentNotice(null);
            setIsSubmitting(false);
            window.history.replaceState({}, "", window.location.pathname);

            if (data.customerEmail) {
              localStorage.setItem("getopfloor_manage_email", data.customerEmail);
            }

            // Broadcast floor claim event for the owner
            window.dispatchEvent(
              new CustomEvent("floor-claimed-success", {
                detail: {
                  isOwner: true,
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
            setTimeout(pollVerification, 1200);
          } else {
            setIsSubmitting(false);
            setPaymentNotice({
              type: "info",
              message: "Your payment was received and is confirming. Your floor will appear momentarily!",
            });
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
          if (pending.category) {
            const cat =
              MAIN_CATEGORIES.find((c) => c.name.toLowerCase() === pending.category.toLowerCase()) ||
              SPECIAL_OPTIONS.find((c) => c.name.toLowerCase() === pending.category.toLowerCase());
            if (cat) setSelectedCategory(cat);
          }

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
            .then(safeFetchJson)
            .then(async (data) => {
              if (data?.checkoutUrl) {
                window.location.href = data.checkoutUrl;
              } else {
                setIsSubmitting(false);
                setPaymentNotice({
                  type: "error",
                  message: data?.error || "Website verification failed. Please enter an active, secure HTTPS website.",
                });
              }
            })
            .catch((err) => {
              setIsSubmitting(false);
              setPaymentNotice({
                type: "error",
                message: err?.message || "Could not start checkout. Please try again.",
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
      // Live reachability & SSL security pre-verification
      const valRes = await fetch("/api/validate-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: syntaxCheck.cleanUrl || url.trim() }),
      });

      const valData = await safeFetchJson(valRes);
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
              category: selectedCategory.name,
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
          category: selectedCategory.name,
          price: Math.max(50, price),
          targetRank,
          customerName: user?.name || undefined,
          customerEmail: user?.email || undefined,
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

      {/* Existing Floor Reclaim / Top Floor Status Notice */}
      {existingFloorOnTower && existingFloorOnTower.rank === 1 && (
        <div className="claimed-banner celebration" style={{ marginBottom: "16px" }} role="status">
          <span>👑 <strong>{existingFloorOnTower.companyName || url}</strong> is already featured at Top Penthouse Floor #1!</span>
          <button type="button" className="claimed-edit-btn" onClick={() => onOpenManage?.()}>
            Manage
          </button>
        </div>
      )}

      {existingFloorOnTower && existingFloorOnTower.rank > 1 && (
        <div
          className="claimed-banner payment-notice info"
          style={{ marginBottom: "16px", background: "rgba(255, 107, 0, 0.12)", border: "1px solid rgba(255, 120, 0, 0.35)", color: "#ff8c00" }}
          role="status"
        >
          <span>
            ⚡ <strong>{existingFloorOnTower.companyName || url}</strong> is on Floor #{existingFloorOnTower.rank} (₹{existingFloorOnTower.pricePaid} paid). Outbid for <strong>₹{differencePrice}</strong> to reclaim <strong>Top Floor #1</strong> with a total floor value of <strong>₹{Number(existingFloorOnTower.pricePaid || 0) + differencePrice}</strong>!
          </span>
          <button type="button" className="claimed-edit-btn" style={{ background: "#ff6b00", color: "#fff", borderColor: "#ff6b00" }} onClick={() => onOpenManage?.()}>
            Manage
          </button>
        </div>
      )}

      <h1 className="headline">
        {existingFloorOnTower && existingFloorOnTower.rank > 1 ? (
          "Outbid & reclaim top floor for"
        ) : existingFloorOnTower && existingFloorOnTower.rank === 1 ? (
          "Featured at Top Penthouse Floor #1"
        ) : topFloorClaimed ? (
          "Outbid top floor for"
        ) : (
          "Claim top floor for"
        )}
        {(!existingFloorOnTower || existingFloorOnTower.rank > 1) && (
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
            <span className="price-editable-wrap" title="Click or tap to type any custom bid amount (e.g. ₹202)">
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
        )}
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
          className={`claim-btn ${isStrangerLocked || (existingFloorOnTower && existingFloorOnTower.rank === 1) ? "claim-btn-locked" : ""}`}
          disabled={isSubmitting || isStrangerLocked || Boolean(existingFloorOnTower && existingFloorOnTower.rank === 1)}
          title={
            existingFloorOnTower && existingFloorOnTower.rank === 1
              ? "This startup is already at Top Penthouse Floor #1"
              : isStrangerLocked
              ? "Someone is currently in checkout claiming Top Floor #1"
              : undefined
          }
        >
          {isSubmitting ? (
            "Verifying..."
          ) : existingFloorOnTower && existingFloorOnTower.rank === 1 ? (
            <>👑 Already Top Floor #1</>
          ) : isTargetLocked ? (
            isHeldByMe ? (
              <>⚡ Resume Claim Top Floor #1 <Arrow /></>
            ) : (
              <>🔒 Someone is claiming Top Floor #1...</>
            )
          ) : existingFloorOnTower && existingFloorOnTower.rank > 1 ? (
            <>⚡ Outbid & Reclaim Top Floor #1 for ₹{price} <Arrow /></>
          ) : topFloorClaimed ? (
            <>⚡ Outbid Top Floor #1 for ₹{price} <Arrow /></>
          ) : (
            <>Claim top floor <Arrow /></>
          )}
        </button>
      </form>

      <p className="subtitle">
        Click or tap the price to enter any custom bid amount. Outbid the current top floor to claim the penthouse spot on the digital tower skyline.
      </p>

      <div className="policy-links-container">
        <a href="/rules" className="policy-link">Platform Rules</a>
        <span className="policy-dot">•</span>
        <a href="/terms" className="policy-link">Terms</a>
        <span className="policy-dot">•</span>
        <a href="/privacy" className="policy-link">Privacy</a>
      </div>
    </section>
  );
}