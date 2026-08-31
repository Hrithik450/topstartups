"use client";

import { useEffect, useState } from "react";
import { RulerTall, Bank, Stack, Plane, Eye, Globe } from "./icons";

type Chip = { key: string; className?: string; render: () => React.ReactNode };

export default function StatChips({ heightFt = 731 }: { heightFt?: number | string }) {
  const [online, setOnline] = useState(52);
  const [viewed, setViewed] = useState(192775);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const a = setInterval(() => setOnline((n) => Math.max(20, n + (Math.random() < 0.5 ? -1 : 1))), 3200);
    const b = setInterval(() => setViewed((n) => n + Math.floor(Math.random() * 4) + 1), 2600);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);

  const chips: Chip[] = [
    {
      key: "online",
      className: "online",
      render: () => (
        <>
          <span className="dot" /> <span className="num">{mounted ? online : 53}</span> online
        </>
      ),
    },
    { key: "tall", render: () => (<><RulerTall /> <span className="num">{typeof heightFt === "number" ? heightFt.toLocaleString() : heightFt}</span> ft tall</>) },
    { key: "sale", render: () => (<><Bank /> <span className="num">₹823</span> sale made</>) },
    { key: "claimed", render: () => (<><Stack /> <span className="num">58</span> floors claimed</>) },
    { key: "aerial", render: () => (<><Plane /> <span className="num">13</span> aerial hours booked</>) },
    { key: "viewed", render: () => (<><Eye /> <span className="num" suppressHydrationWarning>{viewed.toLocaleString()}</span> floors viewed</>) },
    { key: "countries", render: () => (<><Globe /> <span className="num">127</span> countries visited from</>) },
    {
      key: "built",
      render: () => (
        <>
          <span className="avatar" style={{ background: "linear-gradient(135deg,#7cc0ff,#2b6fff)" }} /> Built by You
        </>
      ),
    },
    {
      key: "backed",
      render: () => (
        <>
          <span className="avatar" style={{ background: "linear-gradient(135deg,#ffd27c,#ff9f43)" }} /> Backed by BharatHunt
        </>
      ),
    },
  ];

  return (
    <div className="stats">
      {chips.map((c, i) => (
        <span key={c.key} className={`chip ${c.className ?? ""}`} style={{ ["--i" as string]: i }}>
          {c.render()}
        </span>
      ))}
    </div>
  );
}
