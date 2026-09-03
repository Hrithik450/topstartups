"use client";

import { useEffect, useRef } from "react";
import type { TowerHandle } from "@/lib/three/app";
import type { HoverData } from "@/components/FloorHoverCard";
import type { Listing } from "@/lib/three/listings";

export default function TowerScene({
  handleRef,
  onFloorHover,
  theme = "sunset",
  listings,
  onLoaded,
}: {
  handleRef: React.MutableRefObject<TowerHandle | null>;
  onFloorHover?: (data: HoverData | null) => void;
  theme?: "dark" | "sunset";
  listings?: Listing[];
  onLoaded?: () => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const onFloorHoverRef = useRef(onFloorHover);
  onFloorHoverRef.current = onFloorHover;

  const listingsRef = useRef(listings);
  listingsRef.current = listings;

  const prevFloorCountRef = useRef<number | null>(null);

  // 1. Mount or rebuild Three.js Tower when listings are available or floor count changes
  useEffect(() => {
    if (!listings) return;
    if (!mount.current) return;

    // If already mounted with the exact same floor count, just update textures
    if (handleRef.current && prevFloorCountRef.current === listings.length) {
      handleRef.current.updateListings?.(listings);
      return;
    }

    // Clean up previous instance if rebuilding due to new floor count
    if (handleRef.current) {
      handleRef.current.dispose();
      handleRef.current = null;
    }

    prevFloorCountRef.current = listings.length;
    let disposed = false;

    import("@/lib/three/app").then(({ createTower }) => {
      if (disposed || !mount.current) return;
      const handle = createTower(mount.current, {
        onFloorHover: (data) => onFloorHoverRef.current?.(data),
        theme,
        listings,
        onLoaded: () => onLoadedRef.current?.(),
      });
      handleRef.current = handle;
    });

    return () => {
      disposed = true;
    };
  }, [listings?.length]);

  // 2. Reactively update listings when loaded without recreating the scene
  useEffect(() => {
    if (listings && handleRef.current?.updateListings && prevFloorCountRef.current === listings.length) {
      handleRef.current.updateListings(listings);
    }
  }, [listings]);

  // 3. Reactively update theme without recreating the scene
  useEffect(() => {
    if (handleRef.current) {
      handleRef.current.setTheme(theme);
    }
  }, [theme, handleRef]);

  return <div ref={mount} className="scene-canvas" />;
}
