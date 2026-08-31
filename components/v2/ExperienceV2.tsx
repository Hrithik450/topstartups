"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { TowerHandle } from "@/lib/three/burjKhalifa";
import Hero from "@/components/Hero";
import StatChips from "@/components/StatChips";
import Controls from "@/components/Controls";
import FloorHoverCard, { type HoverData } from "@/components/FloorHoverCard";

const TowerSceneV2 = dynamic(() => import("./TowerSceneV2"), { ssr: false });

function Brand() {
  return (
    <div className="brand">
      BharatHunt
    </div>
  );
}

export default function ExperienceV2() {
  const handleRef = useRef<TowerHandle | null>(null);
  const [hoveredData, setHoveredData] = useState<HoverData | null>(null);

  return (
    <div className="stage">
      <TowerSceneV2 handleRef={handleRef} onFloorHover={setHoveredData} />
      <div className="tower-top-fade" aria-hidden="true" />
      <div className="tower-cloud-fade" aria-hidden="true" />
      <div className="ui">
        <Brand />
        <Hero />
        <StatChips heightFt="2,722" />
        <Controls handleRef={handleRef as any} />
        <FloorHoverCard data={hoveredData} />
      </div>
    </div>
  );
}
