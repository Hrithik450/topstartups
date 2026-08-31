"use client";

import { useRef, useState } from "react";
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

  return (
    <div className="stage">
      <TowerScene handleRef={handleRef} onFloorHover={setHoveredData} />
      <div className="tower-top-fade" aria-hidden="true" />
      <div className="tower-cloud-fade" aria-hidden="true" />
      <div className="ui">
        <Brand />
        <Hero />
        <StatChips />
        <Controls handleRef={handleRef} />
        <FloorHoverCard data={hoveredData} />
      </div>
    </div>
  );
}
