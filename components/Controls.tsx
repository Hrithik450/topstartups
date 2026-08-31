"use client";

import { useState } from "react";
import type { TowerHandle } from "@/lib/three/app";
import {
  Reset,
  Plus,
  Minus,
  Ruler,
  SoundOn,
  SoundOff,
  ChevLeft,
  ChevRight,
  ArrowUp,
  ArrowDown,
} from "./icons";

export default function Controls({
  handleRef,
}: {
  handleRef: React.MutableRefObject<TowerHandle | null>;
}) {
  const [ruler, setRuler] = useState(false);
  const [sound, setSound] = useState(false);
  const h = () => handleRef.current;

  return (
    <div className="controls">
      <button className="ctrl" onClick={() => h()?.reset()}>
        <Reset />
        <span>Reset</span>
      </button>

      <button className="ctrl" onClick={() => h()?.zoom(1)}>
        <Plus />
        <span>Zoom in</span>
      </button>
      <button className="ctrl" onClick={() => h()?.zoom(-1)}>
        <Minus />
        <span>Zoom out</span>
      </button>

      <button className={`ctrl ${ruler ? "active" : ""}`} onClick={() => setRuler(h()?.toggleRuler() ?? false)}>
        <Ruler />
        <span>Ruler {ruler ? "off" : "on"}</span>
      </button>

      <button className={`ctrl ${sound ? "active" : ""}`} onClick={() => setSound((s) => !s)}>
        {sound ? <SoundOn /> : <SoundOff />}
        <span>Sound {sound ? "off" : "on"}</span>
      </button>

      <div className="ctrl group">
        <button className="mini" onClick={() => h()?.nudgeRotate(-1)} aria-label="Rotate left">
          <ChevLeft />
        </button>
        <button className="mini" onClick={() => h()?.nudgeRotate(1)} aria-label="Rotate right">
          <ChevRight />
        </button>
        <span>Rotate</span>
      </div>

      <div className="ctrl group">
        <button className="mini" onClick={() => h()?.moveFloors(1)} aria-label="Move up">
          <ArrowUp />
        </button>
        <button className="mini" onClick={() => h()?.moveFloors(-1)} aria-label="Move down">
          <ArrowDown />
        </button>
        <span>Move floors</span>
      </div>
    </div>
  );
}
