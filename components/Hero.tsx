"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Building, Arrow, Minus, Plus } from "./icons";

const CATEGORIES = ["SaaS", "AI", "Fintech", "Consumer", "Dev tools", "Marketplace", "Hardware"];

export default function Hero() {
  const [price, setPrice] = useState(46);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click/touch outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

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
              <Building />
              <span className="category-label">{category ?? "Category"}</span>
              <span className="caret">▾</span>
            </button>
            {open && (
              <div className="menu" role="listbox">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`menu-item ${category === c ? "selected" : ""}`}
                    onClick={() => {
                      setCategory(c);
                      setOpen(false);
                    }}
                    role="option"
                    aria-selected={category === c}
                  >
                    {c}
                  </button>
                ))}
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
