"use client";

import { useEffect, useRef } from "react";
import type { TowerHandle } from "@/lib/three/burjKhalifa";

import type { HoverData } from "@/components/FloorHoverCard";

export default function TowerSceneV2({
  handleRef,
  onFloorHover,
}: {
  handleRef: React.MutableRefObject<TowerHandle | null>;
  onFloorHover?: (data: HoverData | null) => void;
}) {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let handle: TowerHandle | null = null;
    let disposed = false;

    import("@/lib/three/burjKhalifa").then(({ createTower }) => {
      if (disposed || !mount.current) return;
      handle = createTower(mount.current, { onFloorHover });
      handleRef.current = handle;
    });

    return () => {
      disposed = true;
      handle?.dispose();
      handleRef.current = null;
    };
  }, [handleRef, onFloorHover]);

  return <div ref={mount} className="scene-canvas" />;
}
