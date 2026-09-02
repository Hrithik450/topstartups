"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Globe, Building, Arrow, Minus, Plus, Search, Close, Check } from "./icons";
import { MAIN_CATEGORIES, SPECIAL_OPTIONS, IndustryCategory } from "@/lib/categories";

export default function Hero() {
  const [price, setPrice] = useState(46);
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

  return (
    <section className="hero">
      <h1 className="headline">
        Claim top floor for
        <span className="price-stepper">
          <button className="step-btn" onClick={() => setPrice((p) => Math.max(1, p - 1))} aria-label="Lower bid">
            <Minus />
          </button>
          <span className="price">₹{price}</span>
          <button className="step-btn" onClick={() => setPrice((p) => p + 1)} aria-label="Raise bid">
            <Plus />
          </button>
        </span>
      </h1>

      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-inputs-row">
          <label className="field url-field">
            <Globe />
            <input placeholder="yourcompany.com" inputMode="url" />
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
                        <Close />
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
                              <span className="category-item-check">
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
                            className={`category-item special-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelect(cat)}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <span className="category-item-icon">{cat.icon}</span>
                            <span className="category-item-name">{cat.name}</span>
                            {isSelected && (
                              <span className="category-item-check">
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

        <button type="submit" className="claim-btn">
          Claim top floor <Arrow />
        </button>
      </form>

      <p className="subtitle">
        To claim top floor again, use the same URL you used earlier.
        <br />
        You&apos;ll pay the difference &amp; claim top floor.
      </p>
    </section>
  );
}
