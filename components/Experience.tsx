"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { TowerHandle } from "@/lib/three/app";
import Hero from "./Hero";
import StatChips from "./StatChips";
import Controls from "./Controls";
import FloorHoverCard, { type HoverData } from "./FloorHoverCard";

const TowerScene = dynamic(() => import("./TowerScene"), { ssr: false });

function Brand() {
  return (
    <div className="brand">
      BharatHunt
    </div>
  );
}

export default function Experience() {
  const handleRef = useRef<TowerHandle | null>(null);
  const [hoveredData, setHoveredData] = useState<HoverData | null>(null);
  const [theme, setTheme] = useState<"dark" | "sunset">("dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "sunset" : "dark";
    setTheme(nextTheme);
    handleRef.current?.setTheme(nextTheme);
  };

  return (
    <div className="stage" data-theme={theme}>
      <TowerScene handleRef={handleRef} onFloorHover={setHoveredData} theme={theme} />
      <div className="tower-top-fade" aria-hidden="true" />
      <div className="tower-cloud-fade" aria-hidden="true" />
      <div className="ui">
        <Brand />
        <Hero />
        <StatChips />
        <Controls handleRef={handleRef} theme={theme} onToggleTheme={toggleTheme} />
        <FloorHoverCard data={hoveredData} />
      </div>
    </div>
  );
}
