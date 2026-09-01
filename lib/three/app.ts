import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { INITIAL_LISTINGS, type Listing } from "./listings";

export type TowerHandle = {
  zoom: (dir: 1 | -1) => void;
  reset: () => void;
  jumpToTop: () => void;
  jumpToBase: () => void;
  nudgeRotate: (dir: 1 | -1) => void;
  moveFloors: (dir: 1 | -1) => void;
  toggleRotate: () => boolean;
  toggleRuler: () => boolean;
  toggleSound?: () => boolean;
  toggleTheme: () => "dark" | "sunset";
  setTheme: (theme: "dark" | "sunset") => void;
  dispose: () => void;
};

// Color constants
const DEFAULT_GLASS_TINT = { h: 26, s: 68, l: 54 };
const HELIPAD_DECK_HEX = "#ffaa00";
const HELIPAD_MARK_HEX = "#000000";

const AVAILABLE_LOGOS = new Set([
  "befailproof.ai",
  "japanpr.me",
  "pushup.quest",
  "nextdoor.company",
  "apps.apple.com",
  "jbair.com",
  "patentfig.ai",
  "faxer.me",
  "jointracky.com",
  "nextdoorcompany",
]);

const AVATAR_COLORS = [
  "#ff6b1a", "#f97316", "#ea580c", "#d97706", "#b45309",
  "#ef4444", "#e11d48", "#f59e0b", "#f43f5e", "#c2410c"
];

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s.trimEnd() + "…";
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGlassBackground(ctx: CanvasRenderingContext2D, floorIndex: number, theme: "dark" | "sunset" = "dark") {
  if (theme === "dark") {
    // 1. Deep luxury midnight office room background
    const roomGrad = ctx.createLinearGradient(0, 0, 0, 256);
    roomGrad.addColorStop(0, "#0b121e");
    roomGrad.addColorStop(0.35, "#070c15");
    roomGrad.addColorStop(0.75, "#04070e");
    roomGrad.addColorStop(1, "#020408");
    ctx.fillStyle = roomGrad;
    ctx.fillRect(0, 0, 1280, 256);

    // 2. Office Room Polished Floor & Ceiling Depth
    const floorSurfaceGrad = ctx.createLinearGradient(0, 195, 0, 256);
    floorSurfaceGrad.addColorStop(0, "rgba(18, 28, 44, 0.35)");
    floorSurfaceGrad.addColorStop(1, "rgba(8, 14, 24, 0.75)");
    ctx.fillStyle = floorSurfaceGrad;
    ctx.fillRect(0, 195, 1280, 61);

    // 3. Night Mode Interior Office Room Lighting (Soft, non-dominating warm ambient spotlights)
    const spotXPositions = [120, 360, 600, 840, 1080];
    for (const sx of spotXPositions) {
      // Recessed ceiling micro-fixture
      ctx.fillStyle = "rgba(255, 235, 180, 0.65)";
      ctx.fillRect(sx - 7, 2, 14, 3);

      // Soft downward ambient light cone
      const coneGrad = ctx.createRadialGradient(sx, 5, 2, sx, 110, 130);
      coneGrad.addColorStop(0, "rgba(255, 215, 135, 0.12)");
      coneGrad.addColorStop(0.4, "rgba(255, 195, 105, 0.05)");
      coneGrad.addColorStop(1, "rgba(255, 195, 105, 0)");
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(sx - 10, 5);
      ctx.lineTo(sx + 10, 5);
      ctx.lineTo(sx + 90, 220);
      ctx.lineTo(sx - 90, 220);
      ctx.closePath();
      ctx.fill();
    }

    // Subtle warm room ambient depth accent (alternating floors)
    if (floorIndex % 2 === 0) {
      const lampGrad = ctx.createRadialGradient(1020, 175, 0, 1020, 175, 80);
      lampGrad.addColorStop(0, "rgba(255, 190, 90, 0.09)");
      lampGrad.addColorStop(1, "rgba(255, 190, 90, 0)");
      ctx.fillStyle = lampGrad;
      ctx.beginPath();
      ctx.arc(1020, 175, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Modern Architectural Window Mullions & Glass Frame
    ctx.strokeStyle = "rgba(28, 42, 64, 0.75)";
    ctx.lineWidth = 4;
    for (let x = 0; x <= 1280; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    // Top ceiling rail & bottom baseboard
    ctx.fillStyle = "rgba(10, 16, 26, 0.9)";
    ctx.fillRect(0, 0, 1280, 8);
    ctx.fillRect(0, 248, 1280, 8);

    // Subtle glass reflection sheen on window surface
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(0, 8, 1280, 4);
    ctx.fillRect(0, 244, 1280, 4);
  } else {
    // Sunset / Evening Mode: Clean daylight architectural office room
    const roomGrad = ctx.createLinearGradient(0, 0, 0, 256);
    roomGrad.addColorStop(0, "#d97334");
    roomGrad.addColorStop(0.4, "#bd5b22");
    roomGrad.addColorStop(0.75, "#9c4212");
    roomGrad.addColorStop(1, "#752c06");
    ctx.fillStyle = roomGrad;
    ctx.fillRect(0, 0, 1280, 256);

    // Polished office floor surface
    ctx.fillStyle = "rgba(60, 20, 5, 0.25)";
    ctx.fillRect(0, 195, 1280, 61);

    // Clean architectural window mullions
    ctx.strokeStyle = "rgba(55, 18, 4, 0.4)";
    ctx.lineWidth = 4;
    for (let x = 0; x <= 1280; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    // Top and bottom frame rails
    ctx.fillStyle = "rgba(55, 18, 4, 0.6)";
    ctx.fillRect(0, 0, 1280, 8);
    ctx.fillRect(0, 248, 1280, 8);

    // Subtle daylight glass sheen
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(0, 8, 1280, 4);
    ctx.fillRect(0, 244, 1280, 4);
  }
}

function drawAvatar(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, title: string, id: string) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  roundRectPath(ctx, 56, 48, 160, 160, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    roundRectPath(ctx, 80, 72, 112, 112, 12);
    ctx.clip();
    ctx.drawImage(img, 80, 72, 112, 112);
    ctx.restore();
  } else {
    const bg = getAvatarColor(id || title);
    roundRectPath(ctx, 72, 64, 128, 128, 20);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 76px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((title.trim().charAt(0) || "?").toUpperCase(), 136, 134);
  }
}

function paintFloorTexture(
  ctx: CanvasRenderingContext2D,
  scale: number,
  listing: Listing,
  rank: number,
  floorIndex: number,
  logoImg: HTMLImageElement | null,
  theme: "dark" | "sunset" = "dark"
) {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, 1280, 256);

  drawGlassBackground(ctx, floorIndex, theme);
  drawAvatar(ctx, logoImg, listing.title, listing.id);

  // Domain Name (Primary Heading)
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 64px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";

  const domain = listing.url_or_handle.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const titleText = truncateText(ctx, domain, 700);
  ctx.fillText(titleText, 260, 128);

  const textWidth = ctx.measureText(titleText).width;
  ctx.fillStyle = "rgba(255, 107, 26, 0.85)";
  ctx.fillRect(260, 142, textWidth, 3);

  // Subtitle / Description
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.font = "500 36px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText(truncateText(ctx, listing.description || listing.title, 700), 260, 186);
  ctx.restore();

  // Rank and price
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 84px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText(`#${rank}`, 1232, 108);
  ctx.fillText(`₹${listing.total_paid}`, 1232, 204);
  ctx.restore();
}

function makeCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function createGlassGridTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(255, 140, 60, 0.12)";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = "rgba(45, 26, 18, 0.45)";
  ctx.lineWidth = 4;
  for (let x = 0; x <= 1024; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(1024, 128);
  ctx.stroke();
  ctx.fillStyle = "rgba(45, 26, 18, 0.5)";
  ctx.fillRect(0, 0, 1024, 6);
  ctx.fillRect(0, 250, 1024, 6);
  return makeCanvasTexture(canvas);
}

function createVideoPlaceholderTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  // Dark obsidian-to-slate cinematic gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 1920, 1080);
  bgGrad.addColorStop(0, "#080c14");
  bgGrad.addColorStop(0.5, "#121927");
  bgGrad.addColorStop(1, "#080c14");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1920, 1080);

  // Subtle video grid scanlines / film dots
  ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
  for (let y = 0; y < 1080; y += 8) {
    ctx.fillRect(0, y, 1920, 2);
  }

  // Outer bezel border with BharatHunt vibrant orange accent
  ctx.strokeStyle = "#ff6b1a";
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, 1900, 1060);

  // Inner framing border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 1856, 1016);

  // Top Category / HD Badge Pill
  ctx.fillStyle = "rgba(255, 107, 26, 0.22)";
  ctx.beginPath();
  ctx.roundRect(1920 / 2 - 210, 75, 420, 58, 29);
  ctx.fill();
  ctx.strokeStyle = "#ff6b1a";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#ff8c42";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 24px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText("▶ 16:9 4K BRAND VIDEO SPACE", 1920 / 2, 104);

  // Central Glowing Play Button Icon
  const cx = 1920 / 2;
  const cy = 460;
  const radius = 88;

  // Outer pulse aura
  const auraGrad = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 1.6);
  auraGrad.addColorStop(0, "rgba(255, 107, 26, 0.45)");
  auraGrad.addColorStop(1, "rgba(255, 107, 26, 0)");
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Play button circle
  const btnGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  btnGrad.addColorStop(0, "#ff8c42");
  btnGrad.addColorStop(1, "#ff5500");
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.stroke();

  // White Play Triangle ▶
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(cx - 24, cy - 40);
  ctx.lineTo(cx + 44, cy);
  ctx.lineTo(cx - 24, cy + 40);
  ctx.closePath();
  ctx.fill();

  // Main Title Text
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 68px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText("CLAIM TOP FLOOR & SHOWCASE VIDEO", 1920 / 2, 640);

  // Subtitle / Prompt
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.font = "600 36px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText("Stream your startup promo, demo reel, or product trailer", 1920 / 2, 725);

  // Video Player Bottom Control Bar
  ctx.fillStyle = "rgba(10, 14, 23, 0.88)";
  ctx.fillRect(48, 930, 1824, 96);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 930, 1824, 96);

  // Scrubber timeline track
  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.beginPath();
  ctx.roundRect(220, 970, 1380, 16, 8);
  ctx.fill();

  // Scrubber progress
  const progGrad = ctx.createLinearGradient(220, 0, 720, 0);
  progGrad.addColorStop(0, "#ff5500");
  progGrad.addColorStop(1, "#ff8c42");
  ctx.fillStyle = progGrad;
  ctx.beginPath();
  ctx.roundRect(220, 970, 500, 16, 8);
  ctx.fill();

  // Scrubber knob
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(720, 978, 14, 0, Math.PI * 2);
  ctx.fill();

  // Player controls icons / text
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 30px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("▶  00:00 / 01:30", 72, 978);

  ctx.textAlign = "right";
  ctx.font = "700 26px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ff8c42";
  ctx.fillText("4K HD  🔊  ⛶", 1836, 978);

  return makeCanvasTexture(canvas);
}

function createHelipadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = HELIPAD_DECK_HEX;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = HELIPAD_MARK_HEX;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(256, 256, 192, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = HELIPAD_MARK_HEX;
  ctx.font = "700 236px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("H", 256, 272);
  return makeCanvasTexture(canvas);
}

function createBillboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 1014, 246);
  ctx.fillStyle = "#000000";
  ctx.font = "800 104px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BharatHunt", 512, 134, 928);
  return makeCanvasTexture(canvas);
}


function createBrandingPlaceholderTexture(panelNumber: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2560;
  canvas.height = 420;
  const ctx = canvas.getContext("2d")!;

  // Dark obsidian gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 2560, 420);
  bgGrad.addColorStop(0, "#090d16");
  bgGrad.addColorStop(0.5, "#131a27");
  bgGrad.addColorStop(1, "#090d16");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 2560, 420);

  // Subtle tech grid pattern
  ctx.strokeStyle = "rgba(255, 107, 26, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 40; x < 2560; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 420);
    ctx.stroke();
  }
  for (let y = 30; y < 420; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(2560, y);
    ctx.stroke();
  }

  // Outer border with BharatHunt orange glow
  ctx.strokeStyle = "#ff6b1a";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 2540, 400);

  // Inner dashed framing
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 3;
  ctx.setLineDash([20, 14]);
  ctx.strokeRect(32, 32, 2496, 356);
  ctx.setLineDash([]);

  // Corner brackets
  ctx.strokeStyle = "#ff8c42";
  ctx.lineWidth = 6;
  const bSize = 48;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(32, 32 + bSize);
  ctx.lineTo(32, 32);
  ctx.lineTo(32 + bSize, 32);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(2528 - bSize, 32);
  ctx.lineTo(2528, 32);
  ctx.lineTo(2528, 32 + bSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(32, 388 - bSize);
  ctx.lineTo(32, 388);
  ctx.lineTo(32 + bSize, 388);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(2528 - bSize, 388);
  ctx.lineTo(2528, 388);
  ctx.lineTo(2528 - bSize, 388);
  ctx.stroke();

  // Left Tag Pill: Sponsor Status
  ctx.fillStyle = "rgba(255, 107, 26, 0.16)";
  ctx.beginPath();
  ctx.roundRect(80, 185, 340, 50, 25);
  ctx.fill();
  ctx.strokeStyle = "#ff6b1a";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#ff8c42";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 22px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText("⚡ PRIME PLAZA SPOT", 250, 210);

  // Right Tag Pill: Resolution & Media Spec
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.roundRect(2560 - 420, 185, 340, 50, 25);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#ff8c42";
  ctx.fillText("🖼️ 2560 × 420 WIDE MEDIA", 2560 - 250, 210);

  // Center Badge: Brand Spot #
  ctx.fillStyle = "rgba(255, 107, 26, 0.22)";
  ctx.beginPath();
  ctx.roundRect(2560 / 2 - 160, 55, 320, 50, 10);
  ctx.fill();
  ctx.strokeStyle = "#ff6b1a";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#ff8c42";
  ctx.font = "800 24px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText(`BRAND SPOT #${panelNumber} • SPONSOR`, 2560 / 2, 80);

  // Main Center Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 64px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText("RESERVED FOR BRANDING PLACEHOLDER", 2560 / 2, 190);

  // Subtitle / Prompt
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.font = "600 32px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText("Showcase your brand logo, corporate campaign, or sponsor creative across the main building plaza", 2560 / 2, 280);

  // Bottom CTA Bar
  ctx.fillStyle = "rgba(255, 107, 26, 0.12)";
  ctx.beginPath();
  ctx.roundRect(2560 / 2 - 280, 335, 560, 48, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 107, 26, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ff9e58";
  ctx.font = "700 22px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText("🚀 High-Traffic Landmark Billboard Placement", 2560 / 2, 359);

  return makeCanvasTexture(canvas);
}

function createBannerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 384;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffd21e";
  ctx.fillRect(0, 0, 1536, 384);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 1528, 376);
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "800 84px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText("Add your website domain here", 768, 192);
  return makeCanvasTexture(canvas);
}

function createRulerLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 220;
  canvas.height = 100;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f0c419";
  ctx.fillRect(0, 0, 220, 100);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 214, 94);
  ctx.fillStyle = "#111111";
  ctx.font = "800 42px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 110, 52);
  return makeCanvasTexture(canvas);
}

function createHiringTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 224;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 512, 224);
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 492, 204);
  ctx.fillStyle = "#22c55e";
  ctx.font = "800 112px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HIRING", 256, 118);
  return makeCanvasTexture(canvas);
}

// Bounding box helper: fit model to exact target height
function fitModelHeight(scene: THREE.Object3D, targetHeight: number): THREE.Group {
  const root = new THREE.Group();
  root.add(scene);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetHeight / (size.y || 1);
  root.scale.setScalar(scale);

  const updatedBox = new THREE.Box3().setFromObject(root);
  const center = updatedBox.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -updatedBox.min.y, -center.z);

  const wrapper = new THREE.Group();
  wrapper.add(root);
  wrapper.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return wrapper;
}


// Procedural Tree Helper
function makeLowPolyTree(x: number, z: number, scale: number): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6849, roughness: 0.9 });
  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x5e9c3e, roughness: 0.85 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x6fae4c, roughness: 0.85 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.1, 8), trunkMat);
  trunk.position.y = 0.55;
  trunk.castShadow = true;
  group.add(trunk);

  const foliage1 = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 16), leafMat1);
  foliage1.position.set(0, 1.5, 0);
  foliage1.scale.y = 0.82;
  foliage1.castShadow = true;
  group.add(foliage1);

  const foliage2 = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 16), leafMat2);
  foliage2.position.set(0.5, 1.2, 0.15);
  foliage2.scale.y = 0.82;
  foliage2.castShadow = true;
  group.add(foliage2);

  const foliage3 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), leafMat2);
  foliage3.position.set(-0.45, 1.25, -0.1);
  foliage3.scale.y = 0.82;
  foliage3.castShadow = true;
  group.add(foliage3);

  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  return group;
}

// Procedural Airplane with Tow Banner
function makeAirplaneBanner(bannerTex: THREE.Texture): { plane: THREE.Group; banner: THREE.Mesh; prop: THREE.Mesh } {
  const plane = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color: 0xd92b2b, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });

  const fuse = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 1.1, 6, 12), redMat);
  fuse.rotation.x = Math.PI / 2;
  plane.add(fuse);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 12), redMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.9;
  plane.add(nose);

  const prop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.08), darkMat);
  prop.position.z = -1.06;
  plane.add(prop);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.5), darkMat);
  wing.position.z = -0.1;
  plane.add(wing);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.32), darkMat);
  tail.position.z = 0.72;
  plane.add(tail);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.34), darkMat);
  fin.position.set(0, 0.22, 0.72);
  plane.add(fin);

  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), bannerMat);
  banner.rotation.y = Math.PI / 2;
  banner.position.set(0.01, 0, 4.6);
  plane.add(banner);

  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), new THREE.MeshBasicMaterial({ color: 0x555555 }));
  line.rotation.x = Math.PI / 2;
  line.position.z = 1.25;
  plane.add(line);

  plane.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });

  return { plane, banner, prop };
}

// Procedural Birds
function makeBirdsFlock(): { group: THREE.Group; wings: THREE.Mesh[] } {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
  const wings: THREE.Mesh[] = [];

  const offsets = [
    [0, 0, 0],
    [1.4, 0.3, 1.1],
    [-1.2, -0.2, 1.5],
    [0.5, 0.5, 2.6],
  ];

  for (const [bx, by, bz] of offsets) {
    const bird = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat);
    body.scale.set(1, 0.8, 1.8);
    bird.add(body);

    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.22), mat);
      wing.position.x = 0.32 * side;
      (wing as any).userData.side = side;
      bird.add(wing);
      wings.push(wing);
    }
    bird.position.set(bx, by, bz);
    group.add(bird);
  }
  return { group, wings };
}

// Realistic VIP Executive Helicopter with Suspended Boarding Ladder
function makeRealisticHelicopter(): {
  chopper: THREE.Group;
  mainRotor: THREE.Group;
  tailRotor: THREE.Mesh;
  ladder: THREE.Group;
} {
  const chopper = new THREE.Group();
  const glossBlackMat = new THREE.MeshStandardMaterial({
    color: 0x181a20,
    roughness: 0.22,
    metalness: 0.65,
  });
  const orangeStripeMat = new THREE.MeshStandardMaterial({
    color: 0xff6b1a,
    roughness: 0.35,
    metalness: 0.2,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.45,
    metalness: 0.85,
  });
  const cockpitGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x050811,
    roughness: 0.08,
    metalness: 0.1,
    transmission: 0.75,
    transparent: true,
    opacity: 0.85,
  });

  // Main Cabin Body
  const cabinGeo = new THREE.CapsuleGeometry(0.52, 1.4, 8, 16);
  const cabin = new THREE.Mesh(cabinGeo, glossBlackMat);
  cabin.rotation.x = Math.PI / 2;
  cabin.scale.set(1.0, 1.1, 0.9);
  chopper.add(cabin);

  // Cockpit Glass Canopy Front Windshield
  const glassGeo = new THREE.SphereGeometry(0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const cockpit = new THREE.Mesh(glassGeo, cockpitGlassMat);
  cockpit.rotation.x = Math.PI / 2;
  cockpit.position.set(0, 0.05, -0.68);
  cockpit.scale.set(0.96, 0.96, 0.9);
  chopper.add(cockpit);

  // Left & Right Side Cabin Windows with Chrome Frames
  const windowGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x050914,
    roughness: 0.1,
    transmission: 0.8,
    transparent: true,
    opacity: 0.88,
  });
  const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.3, metalness: 0.8 });

  for (const sx of [-0.52, 0.52]) {
    // Side window pane
    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.62), windowGlassMat);
    sideWin.position.set(sx, 0.06, 0.08);
    chopper.add(sideWin);

    // Side window outer frame
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.37, 0.65), windowFrameMat);
    winFrame.position.set(sx * 1.01, 0.06, 0.08);
    chopper.add(winFrame);
  }

  // --- Cockpit Driving Controls & Avionics Dashboard in Front of Windows ---
  const cockpitControlsGroup = new THREE.Group();

  // Avionics Dashboard Console
  const dashMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.4, metalness: 0.3 });
  const dashboard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 0.28), dashMat);
  dashboard.position.set(0, -0.06, -0.52);
  dashboard.rotation.x = 0.22;
  cockpitControlsGroup.add(dashboard);

  // Glowing Digital Flight HUD Screens on Dashboard
  const hudScreenMat1 = new THREE.MeshStandardMaterial({
    color: 0x001122,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const hudScreenMat2 = new THREE.MeshStandardMaterial({
    color: 0x002211,
    emissive: 0x10b981,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const hudScreenMat3 = new THREE.MeshStandardMaterial({
    color: 0x221100,
    emissive: 0xff7a00,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  const pfdScreen = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.01), hudScreenMat1);
  pfdScreen.position.set(-0.2, 0.02, -0.48);
  pfdScreen.rotation.x = -0.15;
  cockpitControlsGroup.add(pfdScreen);

  const mfdScreen = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.01), hudScreenMat2);
  mfdScreen.position.set(0, 0.02, -0.5);
  mfdScreen.rotation.x = -0.15;
  cockpitControlsGroup.add(mfdScreen);

  const engScreen = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.01), hudScreenMat3);
  engScreen.position.set(0.2, 0.02, -0.48);
  engScreen.rotation.x = -0.15;
  cockpitControlsGroup.add(engScreen);

  // Dual Flight Cyclic Control Sticks (Left & Right Pilot Controls)
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.85 });
  for (const sx of [-0.2, 0.2]) {
    // Control stick shaft
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), stickMat);
    stick.position.set(sx, -0.1, -0.34);
    stick.rotation.x = -0.18;
    cockpitControlsGroup.add(stick);

    // Ergonomic flight grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 0.04), stickMat);
    grip.position.set(sx, 0.02, -0.36);
    cockpitControlsGroup.add(grip);
  }

  // Dual Pilot Bucket Seats with Headrests
  const pilotSeatMat = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.5 });
  for (const sx of [-0.2, 0.2]) {
    // Seat base
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.26), pilotSeatMat);
    seat.position.set(sx, -0.16, -0.14);
    cockpitControlsGroup.add(seat);

    // Seat back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.05), pilotSeatMat);
    back.position.set(sx, 0.02, -0.02);
    back.rotation.x = 0.12;
    cockpitControlsGroup.add(back);

    // Headrest
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.05), pilotSeatMat);
    headrest.position.set(sx, 0.22, 0.01);
    cockpitControlsGroup.add(headrest);
  }

  chopper.add(cockpitControlsGroup);

  // Turbine Engine Cowling (Top)
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 1.1), orangeStripeMat);
  engine.position.set(0, 0.42, 0.1);
  chopper.add(engine);

  // Twin Turbine Exhaust Ports
  for (const ex of [-0.18, 0.18]) {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 8), darkMetalMat);
    exhaust.rotation.x = Math.PI / 3;
    exhaust.position.set(ex, 0.44, 0.66);
    chopper.add(exhaust);
  }

  // Tail Boom
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 2.2, 8), glossBlackMat);
  tail.rotation.x = Math.PI / 2;
  tail.position.set(0, 0.12, 1.7);
  chopper.add(tail);

  // Vertical Fin / Stabilizer
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.75, 0.38), orangeStripeMat);
  fin.position.set(0, 0.38, 2.7);
  fin.rotation.x = -0.2;
  chopper.add(fin);

  // Horizontal Stabilizer
  const hStab = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.03, 0.22), glossBlackMat);
  hStab.position.set(0, 0.18, 2.45);
  chopper.add(hStab);

  // Main Rotor Assembly (4 Blades)
  const mainRotor = new THREE.Group();
  const rotorMast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 8), darkMetalMat);
  rotorMast.position.y = 0.58;
  chopper.add(rotorMast);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), darkMetalMat);
  mainRotor.add(hub);

  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.4 });
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 1.8), bladeMat);
    blade.position.set(0, 0, 0.9);
    blade.rotation.y = (b * Math.PI) / 2;
    blade.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), (b * Math.PI) / 2);
    mainRotor.add(blade);
  }
  mainRotor.position.y = 0.72;
  chopper.add(mainRotor);

  // Tail Rotor (2 Blades)
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.65, 0.08), darkMetalMat);
  tailRotor.position.set(0.08, 0.46, 2.76);
  chopper.add(tailRotor);

  // Landing Skids
  const skidMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.85 });
  for (const sx of [-0.44, 0.44]) {
    const skidTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 8), skidMat);
    skidTube.rotation.x = Math.PI / 2;
    skidTube.position.set(sx, -0.62, 0);
    chopper.add(skidTube);

    // Front curved tip
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8), skidMat);
    tip.position.set(sx, -0.52, -1.1);
    tip.rotation.x = Math.PI / 4;
    chopper.add(tip);

    // Support struts
    for (const sz of [-0.45, 0.45]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), skidMat);
      strut.position.set(sx * 0.65, -0.42, sz);
      strut.rotation.z = sx > 0 ? 0.35 : -0.35;
      chopper.add(strut);
    }
  }

  // Suspended Boarding Ladder firmly attached to helicopter side cabin door
  const ladder = new THREE.Group();
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a7356, roughness: 0.85 });
  const rungMat = new THREE.MeshStandardMaterial({ color: 0xd4d8de, roughness: 0.3, metalness: 0.7 });
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.3, metalness: 0.85 });

  const ladderHeight = 3.6;
  const numRungs = 12;

  // Solid steel anchor bracket bar on cabin door sill
  const mountBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.46), bracketMat);
  mountBar.position.set(0, 0, 0);
  ladder.add(mountBar);

  for (const side of [-0.18, 0.18]) {
    // Heavy duty steel mounting eyelet / shackle
    const eyelet = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 8, 12), bracketMat);
    eyelet.position.set(0, -0.02, side);
    eyelet.rotation.y = Math.PI / 2;
    ladder.add(eyelet);

    // Suspension rope extending directly down from the eyelet
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, ladderHeight, 6), ropeMat);
    rope.position.set(0, -ladderHeight / 2 - 0.04, side);
    ladder.add(rope);
  }

  for (let r = 0; r < numRungs; r++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 6), rungMat);
    rung.position.set(0, -0.22 - r * (ladderHeight / numRungs), 0);
    ladder.add(rung);
  }

  // Anchor ladder directly to the right cabin door floor sill
  ladder.position.set(0.44, -0.15, 0);
  chopper.add(ladder);

  chopper.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return { chopper, mainRotor, tailRotor, ladder };
}

// Animated Character: Descends from Helicopter ➔ Drinks at Juice Stall ➔ Climbs Back
function makeJuiceDrinkerCharacter(): {
  group: THREE.Group;
  armGroup: THREE.Group;
  glassMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const suitMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xff6b1a, roughness: 0.4 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfa37a, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1610, roughness: 0.8 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xff8c1a, // Fresh orange juice!
    roughness: 0.1,
    transmission: 0.85,
    transparent: true,
    opacity: 0.9,
  });

  // Torso / Suit Jacket
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.2), suitMat);
  body.position.y = 0.52;
  body.castShadow = true;
  group.add(body);

  // Orange shirt & collar
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.02), shirtMat);
  shirt.position.set(0, 0.62, 0.105);
  group.add(shirt);

  // Head & Hair
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), skinMat);
  head.position.set(0, 0.84, 0);
  group.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
  hair.position.set(0, 0.86, 0);
  group.add(hair);

  // Legs / Trousers
  for (const lx of [-0.08, 0.08]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.14), suitMat);
    leg.position.set(lx, 0.21, 0);
    leg.castShadow = true;
    group.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.18), new THREE.MeshStandardMaterial({ color: 0x050505 }));
    shoe.position.set(lx, 0.03, 0.03);
    group.add(shoe);
  }

  // Left Arm (Relaxed)
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.08), suitMat);
  leftArm.position.set(-0.21, 0.48, 0);
  group.add(leftArm);

  // Right Arm (Drinking motion pivot)
  const armGroup = new THREE.Group();
  armGroup.position.set(0.21, 0.64, 0);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.08), suitMat);
  rightArm.position.set(0, -0.17, 0.06);
  armGroup.add(rightArm);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), skinMat);
  hand.position.set(0, -0.34, 0.08);
  armGroup.add(hand);

  // Juice Glass / Smoothie Cup with straw
  const glassMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.12, 12), glassMat);
  glassMesh.position.set(0, -0.32, 0.14);
  armGroup.add(glassMesh);

  // Straw
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.16, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  straw.position.set(0.01, -0.24, 0.14);
  straw.rotation.z = 0.2;
  armGroup.add(straw);

  group.add(armGroup);
  group.scale.setScalar(0.95);

  return { group, armGroup, glassMesh };
}

// Procedural Spectator / Tech Entrepreneur looking UP at the high-floor startups
function makeLookingUpPerson(opts: {
  suitColor: number;
  pantColor: number;
  skinColor: number;
  hairColor: number;
  hasPhone?: boolean;
  isPointing?: boolean;
  tiltAngle?: number;
}): { person: THREE.Group; headGroup: THREE.Group } {
  const person = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: opts.skinColor, roughness: 0.8 });
  const suitMat = new THREE.MeshStandardMaterial({ color: opts.suitColor, roughness: 0.55 });
  const pantMat = new THREE.MeshStandardMaterial({ color: opts.pantColor, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: opts.hairColor, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });

  // Legs & Shoes
  for (const lx of [-0.08, 0.08]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.1), pantMat);
    leg.position.set(lx, 0.24, 0);
    person.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.16), shoeMat);
    shoe.position.set(lx, 0.03, 0.02);
    person.add(shoe);
  }

  // Torso / Jacket
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.2), suitMat);
  torso.position.set(0, 0.66, 0);
  person.add(torso);

  // Upper Body / Neck & Head looking UP at the skyscraper
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skinMat);
  neck.position.set(0, 0.88, 0);
  person.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.94, 0);

  // Head tilted BACK / UPWARDS (watching the startups at the top!)
  const tilt = opts.tiltAngle ?? (0.75 + Math.random() * 0.25);
  headGroup.rotation.x = -tilt;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), skinMat);
  head.position.set(0, 0.08, 0);
  headGroup.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.08, 0.21), hairMat);
  hair.position.set(0, 0.18, -0.01);
  headGroup.add(hair);

  person.add(headGroup);

  // Arms
  if (opts.hasPhone) {
    // Both arms raised taking photo of the tower with glowing smartphone
    const phoneMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: 0x00d2ff,
      emissiveIntensity: 0.9,
    });
    for (const ax of [-0.16, 0.16]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.36, 0.075), suitMat);
      arm.position.set(ax, 0.72, 0.12);
      arm.rotation.x = -1.35;
      person.add(arm);
    }
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.01), phoneMat);
    phone.position.set(0, 0.88, 0.28);
    phone.rotation.x = -0.85;
    person.add(phone);
  } else if (opts.isPointing) {
    // Right arm pointing UP at #1 top floor startup
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.44, 0.075), suitMat);
    rightArm.position.set(0.18, 0.76, 0.14);
    rightArm.rotation.x = -1.45;
    rightArm.rotation.z = -0.15;
    person.add(rightArm);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.38, 0.075), suitMat);
    leftArm.position.set(-0.18, 0.62, 0);
    person.add(leftArm);
  } else {
    // Natural standing posture gazing up in awe
    for (const ax of [-0.18, 0.18]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.38, 0.075), suitMat);
      arm.position.set(ax, 0.62, 0);
      person.add(arm);
    }
  }

  person.scale.setScalar(0.95);
  torso.castShadow = true;
  head.castShadow = true;

  return { person, headGroup };
}

function createPitchDeckTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Tech dashboard background
  ctx.fillStyle = "#0c1322";
  ctx.fillRect(0, 0, 512, 256);

  // Top header bar
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, 512, 38);
  ctx.fillStyle = "#ff6b1a";
  ctx.fillRect(16, 12, 14, 14);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px 'Bricolage Grotesque', sans-serif";
  ctx.fillText("BHARAT HUNT • EXECUTIVE BOARDROOM", 40, 26);

  // Big MRR Growth Metric
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 28px 'Bricolage Grotesque', sans-serif";
  ctx.fillText("₹4.8 Cr ARR  ▲ +340%", 24, 76);

  // Target label
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px 'Bricolage Grotesque', sans-serif";
  ctx.fillText("Q3 STRATEGIC ROADMAP & VALUATION PITCH", 24, 98);

  // Growth Chart line
  ctx.strokeStyle = "#ff6b1a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(24, 205);
  ctx.lineTo(100, 180);
  ctx.lineTo(180, 190);
  ctx.lineTo(260, 145);
  ctx.lineTo(340, 125);
  ctx.lineTo(420, 95);
  ctx.lineTo(488, 65);
  ctx.stroke();

  // Chart fill
  ctx.lineTo(488, 220);
  ctx.lineTo(24, 220);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 107, 26, 0.15)";
  ctx.fill();

  // Grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let y = 120; y <= 210; y += 30) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(488, y);
    ctx.stroke();
  }

  // Footer status
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 13px 'Bricolage Grotesque', sans-serif";
  ctx.fillText("● LIVE: 58 FLOORS CLAIMED • 192K VIEWS", 24, 244);

  return makeCanvasTexture(canvas);
}

function makeExecutiveChair(): THREE.Group {
  const chair = new THREE.Group();
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.45 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d8de, roughness: 0.2, metalness: 0.85 });

  // Seat cushion
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.38), leatherMat);
  seat.position.y = 0.38;
  chair.add(seat);

  // Ergonomic curved backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.05), leatherMat);
  back.position.set(0, 0.62, -0.17);
  chair.add(back);

  // Armrests
  for (const sx of [-0.2, 0.2]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.18, 0.28), leatherMat);
    arm.position.set(sx, 0.48, -0.04);
    chair.add(arm);
  }

  // Central pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), chromeMat);
  pole.position.y = 0.18;
  chair.add(pole);

  // 5-star swivel base
  for (let a = 0; a < 5; a++) {
    const rad = (a * Math.PI * 2) / 5;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), chromeMat);
    leg.rotation.z = Math.PI / 2;
    leg.rotation.y = rad;
    leg.position.set(Math.cos(rad) * 0.11, 0.02, Math.sin(rad) * 0.11);
    chair.add(leg);
  }

  chair.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return chair;
}

function makeLaptop(): THREE.Group {
  const laptop = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b303c, roughness: 0.3, metalness: 0.8 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x38bdf8, emissiveIntensity: 0.4 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.18), bodyMat);
  laptop.add(base);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.012), screenMat);
  lid.position.set(0, 0.08, -0.09);
  lid.rotation.x = -0.28;
  laptop.add(lid);

  return laptop;
}

export interface CreateTowerOptions {
  onFloorHover?: (data: { listing: Listing; rank: number } | null) => void;
  theme?: "dark" | "sunset";
}

export function createTower(container: HTMLElement, options?: CreateTowerOptions): TowerHandle {
  const onFloorHover = options?.onFloorHover;
  let currentTheme: "dark" | "sunset" = options?.theme || "dark";
  const disposables: (THREE.Material | THREE.BufferGeometry | THREE.Texture | { dispose: () => void })[] = [];

  const isMobileDevice = typeof window !== "undefined" && window.innerWidth < 768;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileDevice ? 1.5 : 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  // Environment reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = roomTex;
  scene.environmentIntensity = 0.6;
  disposables.push(pmremGenerator, roomTex);

  // Tower Geometry Parameters
  const listings: Listing[] = [...INITIAL_LISTINGS].reverse();
  const floorCount = listings.length; // 58 floors
  const BASE_HEIGHT = 2.4;
  const FLOOR_PITCH = 2.45;
  const SLAB_HEIGHT = 0.45;
  const BODY_HEIGHT = 2.0;
  const TOWER_WIDTH = 10.0;
  const totalHeight = BASE_HEIGHT + (floorCount + 1) * FLOOR_PITCH;
  const penthouseY = BASE_HEIGHT + floorCount * FLOOR_PITCH;
  const roofY = totalHeight;

  // Lights
  const hemi = new THREE.HemisphereLight(0x1e293b, 0x0a0f1d, 0.45);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xd6e5ff, 1.35);
  sun.position.set(24, totalHeight + 20, 16);
  sun.castShadow = true;
  const shadowResolution = isMobileDevice ? 1024 : 1536;
  sun.shadow.mapSize.set(shadowResolution, shadowResolution);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = totalHeight * 3 + 80;
  const shadowBound = 22;
  sun.shadow.camera.left = -shadowBound;
  sun.shadow.camera.right = shadowBound;
  sun.shadow.camera.top = totalHeight + 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Roof Directional Light
  const roofLight = new THREE.DirectionalLight(0xffe2b8, 1.5);
  const re = (55 * Math.PI) / 180;
  const rt = (45 * Math.PI) / 180;
  roofLight.position.set(Math.cos(re) * Math.cos(rt) * 40, roofY + 40 * Math.sin(rt), Math.sin(re) * Math.cos(rt) * 40);
  roofLight.target.position.set(0, roofY, 0);
  scene.add(roofLight, roofLight.target);

function createStarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.35, "rgba(225, 240, 255, 0.85)");
  grad.addColorStop(0.7, "rgba(180, 215, 255, 0.25)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  return makeCanvasTexture(canvas);
}

function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.5, "#fffbee");
  grad.addColorStop(0.85, "#faeac4");
  grad.addColorStop(1, "#eed496");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = "rgba(180, 155, 110, 0.14)";
  for (let i = 0; i < 20; i++) {
    const cx = 40 + Math.random() * 176;
    const cy = 40 + Math.random() * 176;
    const cr = 8 + Math.random() * 20;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }
  return makeCanvasTexture(canvas);
}

  // Penthouse Interior Warm Glow Light
  const penthouseInteriorLight = new THREE.PointLight(0xffb84d, 3.5, 30);
  penthouseInteriorLight.position.set(0, penthouseY + 1.2, 0);
  scene.add(penthouseInteriorLight);

  // Rooftop Cafe Warm Glow Light
  const cafeInteriorLight = new THREE.PointLight(0xffa834, 2.5, 18);
  cafeInteriorLight.position.set(3.4, roofY + 1.2, 0.4);
  scene.add(cafeInteriorLight);

  // Ground Lobby Warm Light
  const lobbyLight = new THREE.PointLight(0xffaa33, 2.0, 15);
  lobbyLight.position.set(0, BASE_HEIGHT / 2, 5.5);
  scene.add(lobbyLight);

  // Starfield in Night Sky
  const starCount = 550;
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 140 + Math.random() * 80;
    const theta = Math.random() * Math.PI * 2;
    const phi = 0.08 + Math.random() * 0.42;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi) + 20;
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const starTex = createStarTexture();
  disposables.push(starTex);
  const starMat = new THREE.PointsMaterial({
    size: 2.2,
    map: starTex,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const starField = new THREE.Points(starGeo, starMat);
  starField.visible = currentTheme === "dark";
  scene.add(starField);
  disposables.push(starGeo, starMat);

  // Realistic Glowing 3D Moon with Soft Lunar Atmosphere
  const moonGroup = new THREE.Group();
  const moonGeo = new THREE.SphereGeometry(2.4, 32, 32);
  const moonTex = createMoonTexture();
  disposables.push(moonTex);
  const moonMat = new THREE.MeshStandardMaterial({
    map: moonTex,
    emissive: 0xfff3c4,
    emissiveIntensity: 0.95,
    roughness: 0.8,
  });
  const moonMesh = new THREE.Mesh(moonGeo, moonMat);
  moonGroup.add(moonMesh);

  // Soft Moon Glow Aura
  const moonGlowMat = new THREE.SpriteMaterial({
    map: starTex,
    color: 0xfffae0,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
  });
  const moonGlow = new THREE.Sprite(moonGlowMat);
  moonGlow.scale.set(12, 12, 1);
  moonGroup.add(moonGlow);
  disposables.push(moonGlowMat);

  moonGroup.position.set(-42, totalHeight + 18, -35);
  moonGroup.visible = currentTheme === "dark";
  scene.add(moonGroup);
  disposables.push(moonGeo, moonMat);

  // 1. Ground & Plaza & Base Podium
  const groundGeo = new THREE.CircleGeometry(30, 64);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x8cc472, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  disposables.push(groundGeo, groundMat);

  const plazaGeo = new THREE.PlaneGeometry(20, 20);
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.85 });
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  scene.add(plaza);
  disposables.push(plazaGeo, plazaMat);

  // Base Podium Building
  const podiumGeo = new THREE.BoxGeometry(13, BASE_HEIGHT, 13);
  const podiumMat = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.6 });
  const podium = new THREE.Mesh(podiumGeo, podiumMat);
  podium.position.y = BASE_HEIGHT / 2;
  podium.castShadow = true;
  podium.receiveShadow = true;
  scene.add(podium);
  disposables.push(podiumGeo, podiumMat);

  // 4 Full-Scale Rectangular Image Placeholders for Branding (covering 4 basement walls with 0.15-0.2 breathing margin)
  const brandingGroup = new THREE.Group();
  const brandPanelGeo = new THREE.BoxGeometry(12.6, 2.1, 0.08);
  disposables.push(brandPanelGeo);
  const brandFrameMat = new THREE.MeshStandardMaterial({
    color: 0x161b22,
    roughness: 0.35,
    metalness: 0.8,
  });
  disposables.push(brandFrameMat);

  const brandingSides = [
    // 1. Front Facade (South, +Z)
    { x: 0, y: 1.2, z: 6.55, rotY: 0, spot: 1 },
    // 2. Right Facade (East, +X)
    { x: 6.55, y: 1.2, z: 0, rotY: Math.PI / 2, spot: 2 },
    // 3. Back Facade (North, -Z)
    { x: 0, y: 1.2, z: -6.55, rotY: Math.PI, spot: 3 },
    // 4. Left Facade (West, -X)
    { x: -6.55, y: 1.2, z: 0, rotY: -Math.PI / 2, spot: 4 },
  ];

  for (const bSide of brandingSides) {
    const brandTex = createBrandingPlaceholderTexture(bSide.spot);
    disposables.push(brandTex);
    const brandScreenMat = new THREE.MeshStandardMaterial({
      map: brandTex,
      roughness: 0.3,
      metalness: 0.15,
    });
    disposables.push(brandScreenMat);

    const panel = new THREE.Mesh(brandPanelGeo, [
      brandFrameMat,
      brandFrameMat,
      brandFrameMat,
      brandFrameMat,
      brandScreenMat, // Front display face
      brandFrameMat,
    ]);
    panel.position.set(bSide.x, bSide.y, bSide.z);
    panel.rotation.y = bSide.rotY;
    panel.castShadow = true;
    panel.receiveShadow = true;
    brandingGroup.add(panel);
  }
  scene.add(brandingGroup);



  // Plaza Trees
  const treeCoords = [
    [-13, 6, 1.5],
    [-11, -8, 1.1],
    [12.5, 7.5, 1.4],
    [14, -5, 1],
    [4, 13.5, 1.2],
    [-4, -13.5, 1.1],
  ];
  for (const [tx, tz, ts] of treeCoords) {
    scene.add(makeLowPolyTree(tx, tz, ts));
  }

  // 2. Tower Slabs & Instanced Meshes
  const slabGeo = new THREE.BoxGeometry(TOWER_WIDTH + 0.3, SLAB_HEIGHT, TOWER_WIDTH + 0.3);
  const slabMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.45, metalness: 0.55 });
  const slabInstMesh = new THREE.InstancedMesh(slabGeo, slabMat, floorCount + 2);
  slabInstMesh.castShadow = true;
  slabInstMesh.receiveShadow = true;

  const placeholderGeo = new THREE.BoxGeometry(TOWER_WIDTH, BODY_HEIGHT, TOWER_WIDTH);
  const placeholderMat = new THREE.MeshPhysicalMaterial({ color: 0x386b9f, roughness: 0.75, metalness: 0.05 });
  const placeholderInstMesh = new THREE.InstancedMesh(placeholderGeo, placeholderMat, floorCount);
  placeholderInstMesh.castShadow = true;
  placeholderInstMesh.receiveShadow = true;

  const dummyMatrix = new THREE.Matrix4();
  for (let i = 0; i < floorCount; i++) {
    const y = BASE_HEIGHT + FLOOR_PITCH * i;
    dummyMatrix.makeTranslation(0, y + SLAB_HEIGHT / 2, 0);
    slabInstMesh.setMatrixAt(i, dummyMatrix);

    dummyMatrix.makeTranslation(0, y + SLAB_HEIGHT + BODY_HEIGHT / 2, 0);
    placeholderInstMesh.setMatrixAt(i, dummyMatrix);
  }
  // Penthouse & Roof slabs
  dummyMatrix.makeTranslation(0, penthouseY + SLAB_HEIGHT / 2, 0);
  slabInstMesh.setMatrixAt(floorCount, dummyMatrix);
  dummyMatrix.makeTranslation(0, roofY + 0.2, 0);
  slabInstMesh.setMatrixAt(floorCount + 1, dummyMatrix);

  slabInstMesh.instanceMatrix.needsUpdate = true;
  placeholderInstMesh.instanceMatrix.needsUpdate = true;
  scene.add(slabInstMesh, placeholderInstMesh);
  disposables.push(slabGeo, slabMat, placeholderGeo, placeholderMat);

  // 3. Dynamic Active Floor Pool (Optimized for 60fps scrolling across mobile and desktop)
  const POOL_SIZE = isMobileDevice ? 16 : 20;
  const CANVAS_SCALE = isMobileDevice ? 1.5 : 2;
  const activeFloors: {
    mesh: THREE.Mesh;
    canvas: HTMLCanvasElement;
    texture: THREE.CanvasTexture;
    hiringBadge: THREE.Group;
    floorIndex: number;
    listing: Listing | null;
  }[] = [];

  const topBottomMat = new THREE.MeshStandardMaterial({ color: 0xc8cdd3, roughness: 0.7 });
  const hiringTex = createHiringTexture();
  const hiringMat = new THREE.MeshStandardMaterial({ map: hiringTex, roughness: 0.35, metalness: 0.15 });
  const hiringBackMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const hiringCordMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  disposables.push(topBottomMat, hiringTex, hiringMat, hiringBackMat, hiringCordMat);

  const logoImagesCache = new Map<string, HTMLImageElement>();

  function getOrLoadLogo(urlOrDomain: string, onLoaded?: () => void): HTMLImageElement | null {
    if (logoImagesCache.has(urlOrDomain)) return logoImagesCache.get(urlOrDomain)!;
    const clean = urlOrDomain.replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./, "");
    if (!AVAILABLE_LOGOS.has(clean)) {
      return null;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => onLoaded?.();
    img.src = `/company-logos/${clean}.jpg`;
    logoImagesCache.set(urlOrDomain, img);
    return img;
  }

  for (let p = 0; p < POOL_SIZE; p++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(1280 * CANVAS_SCALE);
    canvas.height = Math.round(256 * CANVAS_SCALE);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), isMobileDevice ? 2 : 4);
    disposables.push(texture);

    const sideMat = new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: 0.24,
      metalness: 0.35,
      envMapIntensity: 0.9,
    });
    disposables.push(sideMat);

    const floorMesh = new THREE.Mesh(placeholderGeo, [
      sideMat,
      sideMat,
      topBottomMat,
      topBottomMat,
      sideMat,
      sideMat,
    ]);
    floorMesh.castShadow = true;
    floorMesh.receiveShadow = true;
    floorMesh.visible = false;
    scene.add(floorMesh);

    // 3D Hanging HIRING Badge - Single clean front-facing rectangular sign
    const hiringBadge = new THREE.Group();
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.7, 0.04),
      [hiringBackMat, hiringBackMat, hiringBackMat, hiringBackMat, hiringMat, hiringMat]
    );
    sign.castShadow = true;
    for (const side of [-1, 1]) {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.94, 5), hiringCordMat);
      cord.position.set(0.36 * side, 0.65, 0);
      cord.rotation.z = side * Math.atan2(0.72, 0.6);
      hiringBadge.add(cord);
    }
    hiringBadge.add(sign);
    hiringBadge.position.set(2.4, 0, 5.18);
    hiringBadge.visible = false;
    scene.add(hiringBadge);

    activeFloors.push({
      mesh: floorMesh,
      canvas,
      texture,
      hiringBadge,
      floorIndex: -1,
      listing: null,
    });
  }

  // 4. Floor #0 Penthouse (Claim Top Floor Glass Office)
  const penthouseGridTex = createGlassGridTexture();
  disposables.push(penthouseGridTex);
  const penthouseGlassMat = new THREE.MeshPhysicalMaterial({
    map: penthouseGridTex,
    transparent: true,
    roughness: 0.55,
    metalness: 0.1,
    transmission: 0.9,
    thickness: 0.5,
    ior: 1.5,
    opacity: 0.42,
  });
  disposables.push(penthouseGlassMat);

  const penthouseMesh = new THREE.Mesh(placeholderGeo, [
    penthouseGlassMat,
    penthouseGlassMat,
    topBottomMat,
    topBottomMat,
    penthouseGlassMat,
    penthouseGlassMat,
  ]);
  penthouseMesh.position.y = penthouseY + SLAB_HEIGHT + BODY_HEIGHT / 2;
  scene.add(penthouseMesh);

  // Executive CEO Boardroom Conference Table
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x181a22, roughness: 0.25, metalness: 0.25 });
  const tableLegMat = new THREE.MeshStandardMaterial({ color: 0xd4d8de, roughness: 0.2, metalness: 0.85 });
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.8), tableMat);
  tableTop.position.set(0, penthouseY + SLAB_HEIGHT + 0.68, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  scene.add(tableTop);
  disposables.push(tableMat, tableLegMat);

  for (const lx of [-1.2, 1.2]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.64, 12), tableLegMat);
    leg.position.set(lx, penthouseY + SLAB_HEIGHT + 0.32, 0);
    leg.castShadow = true;
    scene.add(leg);
  }

  // Open Laptops on Boardroom Table
  const laptopPositions = [
    { x: -1.0, z: -0.4, rotY: Math.PI },
    { x: 0.8, z: -0.4, rotY: Math.PI },
    { x: -0.6, z: 0.4, rotY: 0 },
    { x: 1.0, z: 0.4, rotY: 0 },
  ];
  for (const lp of laptopPositions) {
    const laptop = makeLaptop();
    laptop.position.set(lp.x, penthouseY + SLAB_HEIGHT + 0.72, lp.z);
    laptop.rotation.y = lp.rotY;
    scene.add(laptop);
  }

  // Executive Boardroom Swivel Chairs
  const chairPositions = [
    { x: -2.1, z: 0, rotY: Math.PI / 2 },
    { x: 2.1, z: 0, rotY: -Math.PI / 2 },
    { x: -0.9, z: -1.2, rotY: 0 },
    { x: 0.9, z: -1.2, rotY: 0 },
    { x: -0.9, z: 1.2, rotY: Math.PI },
    { x: 0.9, z: 1.2, rotY: Math.PI },
  ];
  for (const cp of chairPositions) {
    const chair = makeExecutiveChair();
    chair.position.set(cp.x, penthouseY + SLAB_HEIGHT, cp.z);
    chair.rotation.y = cp.rotY;
    scene.add(chair);
  }

  // Digital Startup Presentation Display (Growth Metrics & Pitch Deck)
  const pitchDeckTex = createPitchDeckTexture();
  disposables.push(pitchDeckTex);
  const screenMat = new THREE.MeshBasicMaterial({ map: pitchDeckTex });
  const screenFrameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
  const screenBoard = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 0.06), [
    screenFrameMat,
    screenFrameMat,
    screenFrameMat,
    screenFrameMat,
    screenMat,
    screenFrameMat,
  ]);
  screenBoard.position.set(0, penthouseY + SLAB_HEIGHT + 1.15, -3.8);
  screenBoard.castShadow = true;
  scene.add(screenBoard);

  // Modern LED Pendant Chandelier
  const pendantMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });
  const pendantLight = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.04, 0.7), pendantMat);
  pendantLight.position.set(0, penthouseY + SLAB_HEIGHT + 1.85, 0);
  scene.add(pendantLight);

  // Penthouse 16:9 Brand Video Placeholder Displays (Centered Vertically & Horizontally on 4 sides)
  const videoTex = createVideoPlaceholderTexture();
  disposables.push(videoTex);
  const videoBoardMat = new THREE.MeshStandardMaterial({ map: videoTex, roughness: 0.35 });
  disposables.push(videoBoardMat);
  const videoFrameMat = new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.4, metalness: 0.8 });
  disposables.push(videoFrameMat);

  // 16:9 Aspect Ratio Display: Width 4.0, Height 2.25, centered vertically (leaving 0.475m breathing space top and bottom)
  const videoGeo = new THREE.BoxGeometry(4.0, 2.25, 0.08);
  disposables.push(videoGeo);

  for (let r = 0; r < 4; r++) {
    const boardGroup = new THREE.Group();
    boardGroup.rotation.y = r * (Math.PI / 2);
    const board = new THREE.Mesh(videoGeo, [
      videoFrameMat,
      videoFrameMat,
      videoFrameMat,
      videoFrameMat,
      videoBoardMat, // Front video display screen
      videoFrameMat,
    ]);
    board.position.set(0, penthouseY + SLAB_HEIGHT + 1.6, 5.12);
    board.castShadow = true;
    boardGroup.add(board);
    scene.add(boardGroup);
  }

  // 5. Rooftop Deck, Helipad & Billboards
  const helipadTex = createHelipadTexture();
  disposables.push(helipadTex);
  const helipadGeo = new THREE.CylinderGeometry(2.6, 2.6, 0.1, 48);
  const helipadMat = new THREE.MeshStandardMaterial({ map: helipadTex, roughness: 0.9 });
  const helipad = new THREE.Mesh(helipadGeo, [
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }),
    helipadMat,
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }),
  ]);
  helipad.position.set(0, roofY + 0.45, 0);
  helipad.receiveShadow = true;
  scene.add(helipad);
  disposables.push(helipadGeo, helipadMat);

  // Large Top Billboard (Perfect Center with Flush Attached Structural Steel Supports)
  const billboardTex = createBillboardTexture();
  disposables.push(billboardTex);
  const billboardMat = new THREE.MeshStandardMaterial({ map: billboardTex, roughness: 0.5 });
  const billboardGeo = new THREE.BoxGeometry(7.6, 1.6, 0.16);
  const billboard = new THREE.Mesh(billboardGeo, [
    hiringBackMat,
    hiringBackMat,
    hiringBackMat,
    hiringBackMat,
    billboardMat,
    billboardMat,
  ]);
  billboard.position.set(0, roofY + 1.65, 4.6);
  billboard.rotation.y = 0;
  billboard.castShadow = true;
  scene.add(billboard);
  disposables.push(billboardGeo, billboardMat);

  // Heavy Structural Steel Billboard Support Posts & Bracing (Firmly attached to billboard frame)
  const legMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.35, metalness: 0.8 });
  for (const lx of [-2.8, 2.8]) {
    // Vertical structural steel column extending from roof deck directly into billboard bottom frame
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.2), legMat);
    leg.position.set(lx, roofY + 0.95, 4.6);
    leg.castShadow = true;
    scene.add(leg);

    // Diagonal rear reinforcement brace anchoring to roof slab
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), legMat);
    brace.position.set(lx, roofY + 0.95, 4.15);
    brace.rotation.x = 0.55;
    brace.castShadow = true;
    scene.add(brace);
  }

  // Structural crossbar connecting the posts on the back of the billboard
  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.12, 0.12), legMat);
  crossBar.position.set(0, roofY + 1.15, 4.54);
  scene.add(crossBar);

  // 6. Height Ruler Strip (Left Side)
  const rulerGroup = new THREE.Group();
  const rulerStripMat = new THREE.MeshStandardMaterial({ color: 0xf0c419, roughness: 0.55 });
  const rulerStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, totalHeight, 0.05), rulerStripMat);
  rulerStrip.position.set(-7.9, totalHeight / 2, 0);
  rulerStrip.castShadow = true;
  rulerGroup.add(rulerStrip);

  const rulerFlagGeo = new THREE.BoxGeometry(0.75, 0.34, 0.05);
  for (let i = 0; i < floorCount; i++) {
    const ry = BASE_HEIGHT + FLOOR_PITCH * i;
    const ft = 731 - (floorCount - 1 - i) * 12;
    const flagTex = createRulerLabelTexture(`${ft} FT`);
    disposables.push(flagTex);
    const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.5 });
    const flag = new THREE.Mesh(rulerFlagGeo, flagMat);
    flag.position.set(-8.45, ry + 1.0, 0);
    flag.castShadow = true;
    rulerGroup.add(flag);
  }
  scene.add(rulerGroup);

  // 7. Aerial Vehicles & Props
  const bannerTex = createBannerTexture();
  disposables.push(bannerTex);

  // Airplanes orbiting
  const airplane1 = makeAirplaneBanner(bannerTex);
  const airplane2 = makeAirplaneBanner(bannerTex);
  scene.add(airplane1.plane, airplane2.plane);

  // Flocks of birds
  const birdsFlock = makeBirdsFlock();
  scene.add(birdsFlock.group);

  // Realistic VIP Executive Helicopter hovering above helipad with suspended ladder
  const chopperObj = makeRealisticHelicopter();
  chopperObj.chopper.position.set(0, roofY + 3.8, 0);
  chopperObj.chopper.scale.setScalar(1.2);
  scene.add(chopperObj.chopper);

  // Animated Passenger: Descends from Helicopter ➔ Drinks Juice at Cafe ➔ Returns to Helicopter
  const juiceDrinker = makeJuiceDrinkerCharacter();
  juiceDrinker.group.position.set(0.44, roofY + 3.65, 0);
  scene.add(juiceDrinker.group);

  // 8. GLTF Model Loader (Asynchronously populate rich GLB models with exact dimensions)
  const gltfLoader = new GLTFLoader();
  const animMixers: THREE.AnimationMixer[] = [];

  // Rooftop Juice & Pizza Hut Cafe Pavilion (Rotated 90 deg clockwise with door facing helipad)
  gltfLoader.load(
    "/models/pizza-restaurant.glb",
    (gltf) => {
      const model = fitModelHeight(gltf.scene, 2.6);
      model.position.set(3.6, roofY + 0.4, -2.4);
      model.rotation.y = -Math.PI / 2;
      scene.add(model);
    },
    undefined,
    () => {}
  );

  // Penthouse Executive Team & Luxury Furnishings
  const interiorDefs = [
    // 1. CEO Presenting at Head of Conference Table
    { url: "/models/businessman.glb", height: 0.86, x: -2.0, z: 0, rotY: Math.PI / 2 },
    // 2. Executive / Board Member at North Side of Table
    { url: "/models/businessman.glb", height: 0.82, x: 0.9, z: -1.25, rotY: 0 },
    // 3. Partner / Co-Founder at South Side of Table
    { url: "/models/businessman.glb", height: 0.82, x: -0.9, z: 1.25, rotY: Math.PI },
    // 4. Lead Founder with Panoramic Skyline View
    { url: "/models/businessman.glb", height: 0.85, x: 3.5, z: -3.2, rotY: -Math.PI / 4 },
    // 5. Executive in VIP Discussion Area
    { url: "/models/businessman.glb", height: 0.82, x: -3.3, z: 2.6, rotY: -Math.PI / 3 },

    // Corner Executive Desk Suite
    { url: "/models/desk.glb", height: 0.55, x: 3.4, z: 2.8, rotY: -Math.PI / 2 },

    // Executive VIP Lounge Area
    { url: "/models/sofa.glb", height: 0.5, x: -3.2, z: 2.2, rotY: Math.PI / 2 },
    { url: "/models/tv.glb", height: 0.5, x: -1.7, z: 2.2, rotY: -Math.PI / 2 },

    // Lush Office Architecture Plants
    { url: "/models/plant-fiddle.glb", height: 0.7, x: 4.1, z: 4.1, rotY: 0 },
    { url: "/models/plant-house.glb", height: 0.5, x: -4.1, z: -4.1, rotY: 0.6 },
    { url: "/models/plant-orchid.glb", height: 0.45, x: 4.1, z: -4.1, rotY: 0 },
    { url: "/models/plant-house.glb", height: 0.5, x: -4.1, z: 4.1, rotY: 0 },
  ];

  for (const def of interiorDefs) {
    gltfLoader.load(
      def.url,
      (gltf) => {
        const model = fitModelHeight(gltf.scene, def.height);
        model.position.set(def.x, penthouseY + SLAB_HEIGHT, def.z);
        model.rotation.y = def.rotY;
        scene.add(model);
      },
      undefined,
      () => {}
    );
  }

  // Ground Plaza Crowd Watching Top Floor Companies with Lifted Heads
  const crowdGroup = new THREE.Group();
  const crowdHeads: THREE.Group[] = [];

  const crowdSpecs = [
    // --- 1. Front Plaza Gathering (Watching #1 and Top Startups) ---
    { x: -3.6, z: 8.8, suit: 0x1f2937, pant: 0x111827, skin: 0xdfa37a, hair: 0x1e1610, hasPhone: true },
    { x: -2.4, z: 9.4, suit: 0xff6b1a, pant: 0x374151, skin: 0xfcd34d, hair: 0x451a03, isPointing: true },
    { x: -1.2, z: 8.6, suit: 0x1e3a8a, pant: 0x1f2937, skin: 0xd97706, hair: 0x18181b },
    { x: 0.2, z: 9.2, suit: 0x047857, pant: 0x111827, skin: 0xfde047, hair: 0x78350f, hasPhone: true },
    { x: 1.4, z: 8.5, suit: 0x7f1d1d, pant: 0x374151, skin: 0xb45309, hair: 0x09090b, isPointing: true },
    { x: 2.6, z: 9.4, suit: 0x475569, pant: 0x1e293b, skin: 0xdfa37a, hair: 0x292524 },
    { x: 3.8, z: 8.8, suit: 0xff8c42, pant: 0x111827, skin: 0xfcd34d, hair: 0x1e1610, hasPhone: true },
    { x: -2.0, z: 7.8, suit: 0x2563eb, pant: 0x1f2937, skin: 0xd97706, hair: 0x3f3f46 },
    { x: -0.6, z: 7.6, suit: 0xe2e8f0, pant: 0x111827, skin: 0xdfa37a, hair: 0x1c1917, isPointing: true },
    { x: 0.8, z: 7.6, suit: 0x5b21b6, pant: 0x374151, skin: 0xfde047, hair: 0x451a03 },
    { x: 2.2, z: 7.8, suit: 0x059669, pant: 0x111827, skin: 0xb45309, hair: 0x18181b, hasPhone: true },

    // --- 2. Left Plaza Walkway (Founders & Spectators Gazing Up) ---
    { x: -8.8, z: 3.6, suit: 0x1e3a8a, pant: 0x111827, skin: 0xfcd34d, hair: 0x1e1610, hasPhone: true },
    { x: -8.4, z: 2.0, suit: 0xff6b1a, pant: 0x374151, skin: 0xdfa37a, hair: 0x451a03, isPointing: true },
    { x: -8.8, z: 0.2, suit: 0x047857, pant: 0x1f2937, skin: 0xd97706, hair: 0x18181b },
    { x: -8.4, z: -1.6, suit: 0x7f1d1d, pant: 0x111827, skin: 0xfde047, hair: 0x78350f, hasPhone: true },
    { x: -8.8, z: -3.4, suit: 0x475569, pant: 0x374151, skin: 0xb45309, hair: 0x09090b },
    { x: -7.5, z: 2.8, suit: 0x2563eb, pant: 0x1e293b, skin: 0xdfa37a, hair: 0x292524, isPointing: true },
    { x: -7.5, z: -0.6, suit: 0xe2e8f0, pant: 0x111827, skin: 0xfcd34d, hair: 0x1e1610 },
    { x: -7.5, z: -2.4, suit: 0x5b21b6, pant: 0x374151, skin: 0xd97706, hair: 0x3f3f46, hasPhone: true },

    // --- 3. Right Plaza Walkway (Audience & Visitors Looking Up) ---
    { x: 8.8, z: 3.6, suit: 0xff8c42, pant: 0x111827, skin: 0xdfa37a, hair: 0x1c1917, isPointing: true },
    { x: 8.4, z: 2.0, suit: 0x1f2937, pant: 0x374151, skin: 0xfde047, hair: 0x451a03, hasPhone: true },
    { x: 8.8, z: 0.2, suit: 0x1e3a8a, pant: 0x1f2937, skin: 0xb45309, hair: 0x18181b },
    { x: 8.4, z: -1.6, suit: 0x047857, pant: 0x111827, skin: 0xfcd34d, hair: 0x78350f, isPointing: true },
    { x: 8.8, z: -3.4, suit: 0x7f1d1d, pant: 0x374151, skin: 0xd97706, hair: 0x09090b },
    { x: 7.5, z: 2.8, suit: 0x059669, pant: 0x1e293b, skin: 0xdfa37a, hair: 0x292524, hasPhone: true },
    { x: 7.5, z: -0.6, suit: 0x2563eb, pant: 0x111827, skin: 0xfde047, hair: 0x1e1610 },
    { x: 7.5, z: -2.4, suit: 0xff6b1a, pant: 0x374151, skin: 0xb45309, hair: 0x3f3f46, isPointing: true },

    // --- 4. Plaza Corner Clusters ---
    { x: -5.8, z: 7.8, suit: 0x475569, pant: 0x111827, skin: 0xdfa37a, hair: 0x1c1917, hasPhone: true },
    { x: 5.8, z: 7.8, suit: 0x5b21b6, pant: 0x1f2937, skin: 0xfcd34d, hair: 0x451a03 },
    { x: -5.8, z: -6.8, suit: 0x1e3a8a, pant: 0x374151, skin: 0xd97706, hair: 0x18181b, isPointing: true },
    { x: 5.8, z: -6.8, suit: 0x047857, pant: 0x111827, skin: 0xb45309, hair: 0x78350f, hasPhone: true },
  ];

  for (const spec of crowdSpecs) {
    const targetAngle = Math.atan2(-spec.x, -spec.z);
    const distToCenter = Math.hypot(spec.x, spec.z);
    const tiltAngle = Math.min(1.15, Math.max(0.72, 1.4 - distToCenter * 0.05));

    const { person, headGroup } = makeLookingUpPerson({
      suitColor: spec.suit,
      pantColor: spec.pant,
      skinColor: spec.skin,
      hairColor: spec.hair,
      hasPhone: spec.hasPhone,
      isPointing: spec.isPointing,
      tiltAngle: tiltAngle,
    });

    person.position.set(spec.x, 0, spec.z);
    person.rotation.y = targetAngle + (Math.random() - 0.5) * 0.2;
    crowdGroup.add(person);
    crowdHeads.push(headGroup);
  }
  scene.add(crowdGroup);

  // 9. Camera & Controls Setup
  const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  function calculateZoomDist(aspect: number): number {
    const t = Math.tan((38 * Math.PI) / 360);
    return Math.min(48, Math.max(10, 5 + Math.max(15.925 / (2 * t), 12 / (2 * t * aspect))));
  }

  let zoomDist = calculateZoomDist(container.clientWidth / container.clientHeight);
  let zoomDistTarget = zoomDist;

  function calculateRestingTargetY(): number {
    const h = container.clientHeight || 900;
    const isMobile = window.innerWidth < 768;
    return totalHeight + 4.4 - (0.5 - Math.min(0.45, (isMobile ? 210 : 295) / h)) * (2 * zoomDist * Math.tan((38 * Math.PI) / 360));
  }

  const restingTargetY = calculateRestingTargetY();
  let travelY = 1.32; // ground base elevation for intro
  let travelYTarget = restingTargetY;
  const initialAzimuth = -45 * (Math.PI / 180);
  const restingTilt = 8.9 * (Math.PI / 180); // 6.4 deg + 2.5 deg elevation tilt

  // Position camera at start
  const targetVec = new THREE.Vector3(0, travelY, 0);
  controls.target.copy(targetVec);
  camera.position.setFromSphericalCoords(zoomDist, 0.5 * Math.PI - restingTilt, initialAzimuth).add(targetVec);
  controls.minPolarAngle = 0.5 * Math.PI - restingTilt;
  controls.maxPolarAngle = 0.5 * Math.PI - restingTilt;
  controls.update();

  const applyTheme = (newTheme: "dark" | "sunset") => {
    currentTheme = newTheme;
    starField.visible = newTheme === "dark";
    moonGroup.visible = newTheme === "dark";

    if (newTheme === "dark") {
      hemi.color.setHex(0x1e293b);
      hemi.groundColor.setHex(0x0a0f1d);
      hemi.intensity = 0.45;
      sun.color.setHex(0xd6e5ff);
      sun.intensity = 1.35;
      roofLight.color.setHex(0xffe2b8);
      roofLight.intensity = 1.5;
      penthouseInteriorLight.intensity = 3.5;
      cafeInteriorLight.intensity = 2.5;
      lobbyLight.intensity = 2.0;
    } else {
      hemi.color.setHex(0xffedd5);
      hemi.groundColor.setHex(0xd4a373);
      hemi.intensity = 0.85;
      sun.color.setHex(0xffe8cc);
      sun.intensity = 2.6;
      roofLight.color.setHex(0xfffaed);
      roofLight.intensity = 1.2;
      penthouseInteriorLight.intensity = 0.8;
      cafeInteriorLight.intensity = 0.5;
      lobbyLight.intensity = 0.4;
    }

    // Repaint all visible floor tiles in the pool
    for (const slot of activeFloors) {
      if (slot.floorIndex >= 0 && slot.listing) {
        const ctx = slot.canvas.getContext("2d")!;
        const rank = floorCount - slot.floorIndex;
        const logoImg = getOrLoadLogo(slot.listing.url_or_handle);
        paintFloorTexture(ctx, CANVAS_SCALE, slot.listing, rank, slot.floorIndex, logoImg, currentTheme);
        slot.texture.needsUpdate = true;
      }
    }
  };

  // Set initial theme lighting
  applyTheme(currentTheme);

  // Update visible active floors window based on camera elevation
  function updateFloorWindow() {
    const centerFloor = Math.round((travelY - BASE_HEIGHT) / FLOOR_PITCH);
    const halfWindow = Math.floor(POOL_SIZE / 2);
    const minFloor = Math.max(0, centerFloor - halfWindow);
    const maxFloor = Math.min(floorCount - 1, centerFloor + halfWindow);

    const neededFloors: number[] = [];
    for (let i = minFloor; i <= maxFloor; i++) neededFloors.push(i);

    const freeSlots = activeFloors.filter((af) => !neededFloors.includes(af.floorIndex));

    for (const fIdx of neededFloors) {
      let slot = activeFloors.find((af) => af.floorIndex === fIdx);
      if (!slot && freeSlots.length > 0) {
        slot = freeSlots.pop()!;
        slot.floorIndex = fIdx;
        const listing = listings[fIdx];
        slot.listing = listing;
        const fy = BASE_HEIGHT + FLOOR_PITCH * fIdx;
        slot.mesh.position.y = fy + SLAB_HEIGHT + BODY_HEIGHT / 2;
        slot.mesh.visible = true;

        // Hide corresponding placeholder instance
        dummyMatrix.makeScale(0, 0, 0);
        placeholderInstMesh.setMatrixAt(fIdx, dummyMatrix);

        const ctx = slot.canvas.getContext("2d")!;
        const rank = floorCount - fIdx;
        const logoImg = getOrLoadLogo(listing.url_or_handle, () => {
          paintFloorTexture(ctx, CANVAS_SCALE, listing, rank, fIdx, logoImg, currentTheme);
          slot!.texture.needsUpdate = true;
        });
        paintFloorTexture(ctx, CANVAS_SCALE, listing, rank, fIdx, logoImg, currentTheme);
        slot.texture.needsUpdate = true;

        if (listing.hiring) {
          slot.hiringBadge.position.y = fy + SLAB_HEIGHT + BODY_HEIGHT - 0.85;
          slot.hiringBadge.visible = true;
        } else {
          slot.hiringBadge.visible = false;
        }
      }
    }

    // Restore hidden placeholder instances for non-active floors
    for (const slot of freeSlots) {
      if (slot.floorIndex >= 0) {
        const oldIdx = slot.floorIndex;
        const fy = BASE_HEIGHT + FLOOR_PITCH * oldIdx;
        dummyMatrix.makeTranslation(0, fy + SLAB_HEIGHT + BODY_HEIGHT / 2, 0);
        placeholderInstMesh.setMatrixAt(oldIdx, dummyMatrix);
        slot.floorIndex = -1;
        slot.mesh.visible = false;
        slot.hiringBadge.visible = false;
      }
    }
    placeholderInstMesh.instanceMatrix.needsUpdate = true;
  }

  updateFloorWindow();

  // Wheel interaction for floor ride
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.metaKey || e.ctrlKey) {
      zoomDistTarget = THREE.MathUtils.clamp(zoomDistTarget + e.deltaY * 0.05, 12, 48);
    } else {
      travelYTarget = THREE.MathUtils.clamp(travelYTarget - e.deltaY * 0.015, 1.32, roofY);
    }
  };
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

  // Hand grabbing cursor on rotate / drag
  const onPointerDown = () => {
    renderer.domElement.style.cursor = "grabbing";
    if (typeof document !== "undefined") document.body.classList.add("is-dragging");
  };
  const onPointerUp = () => {
    renderer.domElement.style.cursor = "grab";
    if (typeof document !== "undefined") document.body.classList.remove("is-dragging");
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);

  // Raycast hover detection for floor product card
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let currentHoveredFloor = -1;

  const onPointerMoveHover = (e: MouseEvent) => {
    if (inIntro) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let foundFloor = -1;
    for (const hit of intersects) {
      if (hit.point.y >= BASE_HEIGHT && hit.point.y < roofY) {
        const fIdx = Math.floor((hit.point.y - BASE_HEIGHT) / FLOOR_PITCH);
        if (fIdx >= 0 && fIdx < floorCount) {
          foundFloor = fIdx;
          break;
        }
      }
    }

    if (foundFloor !== currentHoveredFloor) {
      currentHoveredFloor = foundFloor;
      if (foundFloor >= 0) {
        const rank = floorCount - foundFloor;
        const listing = listings[foundFloor];
        if (listing && onFloorHover) {
          onFloorHover({ listing, rank });
        }
      } else {
        if (onFloorHover) onFloorHover(null);
      }
    }
  };

  const onPointerLeaveHover = () => {
    if (currentHoveredFloor !== -1) {
      currentHoveredFloor = -1;
      if (onFloorHover) onFloorHover(null);
    }
  };

  window.addEventListener("pointermove", onPointerMoveHover);
  window.addEventListener("pointerleave", onPointerLeaveHover);

  // Intro Animation State
  let inIntro = true;
  const introStartTime = performance.now();
  const INTRO_DURATION = 4000; // 4.0 seconds smooth ascent

  const clock = new THREE.Clock();
  let raf = 0;
  let isTabVisible = true;
  const onVisibilityChange = () => {
    isTabVisible = !document.hidden;
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  function renderFrame(now: number) {
    raf = requestAnimationFrame(renderFrame);
    if (!isTabVisible) return;
    const dt = Math.min(clock.getDelta(), 0.05);

    // Animation Mixers
    for (const mixer of animMixers) mixer.update(dt);

    // Orbiting Aircraft & Birds
    const t = now * 0.001;
    const a1 = t * 0.18;
    airplane1.plane.position.set(Math.cos(a1) * 22, roofY - 8 + Math.sin(t * 0.8) * 0.5, Math.sin(a1) * 22);
    airplane1.plane.rotation.y = -a1 + Math.PI;
    airplane1.prop.rotation.z += 30 * dt;

    const a2 = -t * 0.12;
    airplane2.plane.position.set(Math.cos(a2) * 28, roofY - 24 + Math.sin(t * 0.6) * 0.8, Math.sin(a2) * 28);
    airplane2.plane.rotation.y = -a2;
    airplane2.prop.rotation.z += 30 * dt;

    const aBirds = t * 0.22;
    birdsFlock.group.position.set(Math.cos(aBirds) * 34, roofY - 14 + Math.sin(t * 0.5) * 2.0, Math.sin(aBirds) * 34);
    birdsFlock.group.rotation.y = -aBirds;
    for (let b = 0; b < birdsFlock.wings.length; b++) {
      const w = birdsFlock.wings[b];
      const side = (w as any).userData.side || 1;
      w.rotation.z = side * Math.sin(t * 12 + b) * 0.5;
    }

    // Realistic Helicopter Rotors & Atmospheric Hover
    chopperObj.mainRotor.rotation.y += 28 * dt;
    chopperObj.tailRotor.rotation.x += 36 * dt;

    const chopperHoverY = roofY + 3.8 + Math.sin(t * 1.8) * 0.08;
    chopperObj.chopper.position.y = chopperHoverY;
    chopperObj.chopper.position.x = Math.sin(t * 1.1) * 0.04;
    chopperObj.chopper.rotation.z = Math.sin(t * 1.4) * 0.015;
    chopperObj.chopper.rotation.x = Math.cos(t * 1.2) * 0.012;

    // Suspended Ladder breeze sway
    chopperObj.ladder.rotation.z = Math.sin(t * 2.2) * 0.035;

    // Animated Passenger Helicopter-to-Juice-Stall Loop (24 second periodic cycle)
    const cycleDuration = 24.0;
    const loopT = (now * 0.001) % cycleDuration;

    const helipadLadderTopY = chopperHoverY - 0.15;
    const helipadDeckY = roofY + 0.45;
    const ladderX = 0.44;
    const ladderZ = 0.0;
    const pizzaDoorX = 2.4;
    const pizzaDoorZ = -1.6; // Right in front of Pizza Hut front entrance door & patio tables

    if (loopT < 4.5) {
      // Phase 1: Climbing down the ladder from the helicopter door to helipad deck
      const p = loopT / 4.5;
      juiceDrinker.group.position.set(ladderX, helipadLadderTopY - p * (helipadLadderTopY - helipadDeckY), ladderZ);
      juiceDrinker.group.rotation.y = -Math.PI / 2;
      juiceDrinker.armGroup.rotation.x = Math.sin(loopT * 10) * 0.45 - 0.3;
      juiceDrinker.armGroup.rotation.y = 0;
      juiceDrinker.armGroup.rotation.z = 0;
    } else if (loopT < 9.5) {
      // Phase 2: Walking directly across helipad straight to the Pizza Hut front door
      const p = (loopT - 4.5) / 5.0;
      const currentX = ladderX + (pizzaDoorX - ladderX) * p;
      const currentZ = ladderZ + (pizzaDoorZ - ladderZ) * p;
      const targetHeading = Math.atan2(pizzaDoorX - ladderX, pizzaDoorZ - ladderZ);

      const walkBob = Math.abs(Math.sin(loopT * 14)) * 0.04;
      juiceDrinker.group.position.set(currentX, helipadDeckY + walkBob, currentZ);
      juiceDrinker.group.rotation.y = targetHeading;
      juiceDrinker.armGroup.rotation.x = Math.sin(loopT * 10) * 0.35;
      juiceDrinker.armGroup.rotation.y = 0;
      juiceDrinker.armGroup.rotation.z = 0;
    } else if (loopT < 16.5) {
      // Phase 3: Sitting directly in front of the Pizza Hut front door enjoying juice
      juiceDrinker.group.position.set(pizzaDoorX, helipadDeckY - 0.05, pizzaDoorZ);
      juiceDrinker.group.rotation.y = Math.PI / 4; // Facing doorway & patio

      // Periodic sipping motion
      const sipCycle = (loopT - 9.5) % 3.2;
      if (sipCycle < 1.8) {
        // Lift juice glass to mouth
        const sipProgress = Math.sin((sipCycle / 1.8) * Math.PI);
        juiceDrinker.armGroup.rotation.x = -1.45 * sipProgress;
        juiceDrinker.armGroup.rotation.y = 0.35 * sipProgress;
        juiceDrinker.armGroup.rotation.z = -0.2 * sipProgress;
      } else {
        // Lower glass, enjoy drink
        juiceDrinker.armGroup.rotation.x = -0.4;
        juiceDrinker.armGroup.rotation.y = 0.1;
        juiceDrinker.armGroup.rotation.z = 0;
      }
    } else if (loopT < 20.5) {
      // Phase 4: Walking back from Pizza Hut front door straight to helipad ladder
      const p = (loopT - 16.5) / 4.0;
      const currentX = pizzaDoorX + (ladderX - pizzaDoorX) * p;
      const currentZ = pizzaDoorZ + (ladderZ - pizzaDoorZ) * p;
      const targetHeading = Math.atan2(ladderX - pizzaDoorX, ladderZ - pizzaDoorZ);

      const walkBob = Math.abs(Math.sin(loopT * 14)) * 0.04;
      juiceDrinker.group.position.set(currentX, helipadDeckY + walkBob, currentZ);
      juiceDrinker.group.rotation.y = targetHeading;
      juiceDrinker.armGroup.rotation.x = Math.sin(loopT * 10) * 0.35;
      juiceDrinker.armGroup.rotation.y = 0;
      juiceDrinker.armGroup.rotation.z = 0;
    } else {
      // Phase 5: Climbing back up the ladder into the helicopter
      const p = (loopT - 20.5) / 3.5;
      juiceDrinker.group.position.set(ladderX, helipadDeckY + p * (helipadLadderTopY - helipadDeckY), ladderZ);
      juiceDrinker.group.rotation.y = -Math.PI / 2;
      juiceDrinker.armGroup.rotation.x = Math.sin(loopT * 10) * 0.45 - 0.3;
      juiceDrinker.armGroup.rotation.y = 0;
      juiceDrinker.armGroup.rotation.z = 0;
    }

    if (inIntro) {
      const elapsed = now - introStartTime;
      const progress = Math.min(1, elapsed / INTRO_DURATION);
      // Smooth cubic bezier easing
      const eased = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      travelY = 1.32 + (restingTargetY - 1.32) * eased;
      travelYTarget = travelY;
      const currentAzimuth = initialAzimuth + 2 * Math.PI * eased;

      controls.target.set(0, travelY, 0);
      camera.position.setFromSphericalCoords(zoomDist, 0.5 * Math.PI - restingTilt, currentAzimuth).add(controls.target);
      camera.lookAt(controls.target);

      updateFloorWindow();

      if (progress >= 1) {
        inIntro = false;
        controls.enabled = true;
      }
    } else {
      // Smooth travelY & zoom interpolation
      const dy = (travelYTarget - travelY) * 0.1;
      if (Math.abs(dy) > 0.001) {
        travelY += dy;
        controls.target.y += dy;
        camera.position.y += dy;
        updateFloorWindow();
      }

      const dz = (zoomDistTarget - zoomDist) * 0.12;
      if (Math.abs(dz) > 0.001) {
        zoomDist += dz;
        const diff = camera.position.clone().sub(controls.target);
        diff.multiplyScalar(zoomDist / diff.length());
        camera.position.copy(controls.target).add(diff);
      }

      controls.update();
    }

    // Update home-tower-scrolled state for natural cloud fade
    const isScrolled = travelY < restingTargetY - 0.5;
    if (typeof document !== "undefined" && document.body.classList.contains("home-tower-scrolled") !== isScrolled) {
      document.body.classList.toggle("home-tower-scrolled", isScrolled);
    }

    renderer.render(scene, camera);
  }

  renderFrame(performance.now());

  // Window Resize
  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (!inIntro) {
      zoomDistTarget = calculateZoomDist(w / h);
    }
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  return {
    zoom(dir) {
      zoomDistTarget = THREE.MathUtils.clamp(zoomDistTarget + (dir === 1 ? -4 : 4), 12, 48);
    },
    reset() {
      zoomDistTarget = calculateZoomDist(container.clientWidth / container.clientHeight);
      travelYTarget = calculateRestingTargetY();
      controls.target.set(0, travelYTarget, 0);
      camera.position.setFromSphericalCoords(zoomDistTarget, 0.5 * Math.PI - restingTilt, initialAzimuth).add(controls.target);
      controls.autoRotate = true;
      inIntro = false;
    },
    jumpToTop() {
      inIntro = false;
      travelYTarget = calculateRestingTargetY();
      zoomDistTarget = calculateZoomDist(container.clientWidth / container.clientHeight);
    },
    jumpToBase() {
      inIntro = false;
      travelYTarget = 1.32;
    },
    nudgeRotate(dir) {
      controls.autoRotate = false;
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      spherical.theta += dir * 0.4;
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    },
    moveFloors(dir) {
      travelYTarget = THREE.MathUtils.clamp(travelYTarget + dir * FLOOR_PITCH * 2, 1.32, roofY);
    },
    toggleRotate() {
      controls.autoRotate = !controls.autoRotate;
      return controls.autoRotate;
    },
    toggleRuler() {
      rulerGroup.visible = !rulerGroup.visible;
      return rulerGroup.visible;
    },
    toggleTheme() {
      const nextTheme = currentTheme === "dark" ? "sunset" : "dark";
      applyTheme(nextTheme);
      return nextTheme;
    },
    setTheme(theme) {
      applyTheme(theme);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMoveHover);
      window.removeEventListener("pointerleave", onPointerLeaveHover);
      if (typeof document !== "undefined") document.body.classList.remove("is-dragging");
      controls.dispose();
      renderer.dispose();
      for (const d of disposables) {
        if ("dispose" in d && typeof d.dispose === "function") d.dispose();
      }
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
