"use client";

import { useEffect, useRef } from "react";
import type { TowerHandle } from "@/lib/three/app";
import type { HoverData } from "@/components/FloorHoverCard";
import type { Listing } from "@/lib/three/listings";

export default function TowerScene({
  handleRef,
  onFloorHover,
  theme = "dark",
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

  useEffect(() => {
    let handle: TowerHandle | null = null;
    let disposed = false;

    import("@/lib/three/app").then(({ createTower }) => {
      if (disposed || !mount.current) return;
      handle = createTower(mount.current, {
        onFloorHover: (data) => onFloorHoverRef.current?.(data),
        theme,
        listings,
        onLoaded: () => onLoadedRef.current?.(),
      });
      handleRef.current = handle;
      // Immediately notify parent so loader can safely exit
      onLoadedRef.current?.();
    });

    return () => {
      disposed = true;
      handle?.dispose();
      handleRef.current = null;
    };
  }, [handleRef, theme, listings]);

  return <div ref={mount} className="scene-canvas" />;
}
