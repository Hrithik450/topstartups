"use client";

import { useEffect, useRef } from "react";
import type { TowerHandle } from "@/lib/three/app";
import type { HoverData } from "@/components/floor-hover-card";
import type { Floor } from "@/lib/db/config/schema";

export function TowerScene({
  handleRef,
  onFloorHover,
  theme = "sunset",
  floors,
  onLoaded,
}: {
  handleRef: React.MutableRefObject<TowerHandle | null>;
  onFloorHover?: (data: HoverData | null) => void;
  theme?: "dark" | "sunset";
  floors?: Floor[];
  onLoaded?: () => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const onFloorHoverRef = useRef(onFloorHover);
  onFloorHoverRef.current = onFloorHover;

  const floorsRef = useRef(floors);
  floorsRef.current = floors;

  const prevFloorCountRef = useRef<number | null>(null);

  // 1. Mount or rebuild Three.js Tower when floors are available or floor count changes
  useEffect(() => {
    if (!floors) return;
    if (!mount.current) return;

    // If already mounted with the exact same floor count, just update textures
    if (handleRef.current && prevFloorCountRef.current === floors.length) {
      handleRef.current.updateListings?.(floors);
      return;
    }

    // Clean up previous instance if rebuilding due to new floor count
    if (handleRef.current) {
      handleRef.current.dispose();
      handleRef.current = null;
    }

    prevFloorCountRef.current = floors.length;
    let disposed = false;

    import("@/lib/three/app").then(({ createTower }) => {
      if (disposed || !mount.current) return;
      const handle = createTower(mount.current, {
        onFloorHover: (data) => onFloorHoverRef.current?.(data),
        theme,
        listings: floors,
        onLoaded: () => onLoadedRef.current?.(),
      });
      handleRef.current = handle;
    });

    return () => {
      disposed = true;
    };
  }, [floors?.length]);

  // 2. Reactively update floors when loaded without recreating the scene
  useEffect(() => {
    if (
      floors &&
      handleRef.current?.updateListings &&
      prevFloorCountRef.current === floors.length
    ) {
      handleRef.current.updateListings(floors);
    }
  }, [floors]);

  // 3. Reactively update theme without recreating the scene
  useEffect(() => {
    if (handleRef.current) {
      handleRef.current.setTheme(theme);
    }
  }, [theme, handleRef]);

  return <div ref={mount} className="scene-canvas" />;
}
