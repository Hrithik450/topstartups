"use client";

import { useState } from "react";
import { Globe, Building, Arrow, Minus, Plus } from "./icons";

const CATEGORIES = ["SaaS", "AI", "Fintech", "Consumer", "Dev tools", "Marketplace", "Hardware"];

export default function Hero() {
  const [price, setPrice] = useState(46);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

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
        <label className="field">
          <Globe />
          <input placeholder="yourcompany.com" inputMode="url" />
        </label>

        <div style={{ position: "relative" }}>
          <button type="button" className="field select" onClick={() => setOpen((o) => !o)}>
            <Building />
            {category ?? "Choose a category"}
            <span className="caret">▾</span>
          </button>
          {open && (
            <div className="menu">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setCategory(c);
                    setOpen(false);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
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
