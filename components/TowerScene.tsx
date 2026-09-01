"use client";

import { useEffect, useRef } from "react";
import type { TowerHandle } from "@/lib/three/app";

import type { HoverData } from "@/components/FloorHoverCard";

export default function TowerScene({
  handleRef,
  onFloorHover,
  theme = "dark",
}: {
  handleRef: React.MutableRefObject<TowerHandle | null>;
  onFloorHover?: (data: HoverData | null) => void;
  theme?: "dark" | "sunset";
}) {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let handle: TowerHandle | null = null;
    let disposed = false;

    import("@/lib/three/app").then(({ createTower }) => {
      if (disposed || !mount.current) return;
      handle = createTower(mount.current, { onFloorHover, theme });
      handleRef.current = handle;
    });

    return () => {
      disposed = true;
      handle?.dispose();
      handleRef.current = null;
    };
  }, [handleRef, onFloorHover, theme]);

  return <div ref={mount} className="scene-canvas" />;
}
