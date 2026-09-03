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

  // 1. Mount Three.js Tower EXACTLY ONCE on initial load
  useEffect(() => {
    let handle: TowerHandle | null = null;
    let disposed = false;

    import("@/lib/three/app").then(({ createTower }) => {
      if (disposed || !mount.current) return;
      handle = createTower(mount.current, {
        onFloorHover: (data) => onFloorHoverRef.current?.(data),
        theme,
        listings: listingsRef.current,
        onLoaded: () => onLoadedRef.current?.(),
      });
      handleRef.current = handle;
      if (listingsRef.current && handle.updateListings) {
        handle.updateListings(listingsRef.current);
      }
    });

    return () => {
      disposed = true;
      handle?.dispose();
      handleRef.current = null;
    };
  }, []); // Strictly empty dependency array: NEVER re-mount or restart intro animation!

  // 2. Reactively update listings when loaded without recreating the scene
  useEffect(() => {
    if (listings && handleRef.current?.updateListings) {
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
