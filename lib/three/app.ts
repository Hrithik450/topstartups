import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { INITIAL_LISTINGS, type Listing } from "./listings";

export type TowerHandle = {
  zoom: (dir: 1 | -1) => void;
  reset: () => void;
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createClaimButtonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 176;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1024, 176);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 1014, 166);
  ctx.fillStyle = "#111111";
  ctx.font = "800 88px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Claim top floor", 512, 94);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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

// Bounding box helper: fit model to exact target length
function fitModelLength(scene: THREE.Object3D, targetLength: number, rotateY = 0): THREE.Group {
  const root = new THREE.Group();
  root.add(scene);
  scene.rotation.y = rotateY;
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.z);
  const scale = targetLength / (maxDim || 1);
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

  // Suspended Boarding Ladder descending towards roof helipad
  const ladder = new THREE.Group();
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a7356, roughness: 0.85 });
  const rungMat = new THREE.MeshStandardMaterial({ color: 0xd4d8de, roughness: 0.3, metalness: 0.7 });

  const ladderHeight = 3.4;
  const numRungs = 12;
  for (const side of [-0.18, 0.18]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, ladderHeight, 6), ropeMat);
    rope.position.set(side, -ladderHeight / 2, 0);
    ladder.add(rope);
  }
  for (let r = 0; r < numRungs; r++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 6), rungMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, -0.2 - r * (ladderHeight / numRungs), 0);
    ladder.add(rung);
  }
  ladder.position.set(0.48, -0.35, 0);
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

  return new THREE.CanvasTexture(canvas);
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

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = totalHeight * 3 + 80;
  const shadowBound = 22;
  sun.shadow.camera.left = -shadowBound;
  sun.shadow.camera.right = shadowBound;
  sun.shadow.camera.top = totalHeight + 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.bias = -0.0004;
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
  return new THREE.CanvasTexture(canvas);
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
  return new THREE.CanvasTexture(canvas);
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

  // Entrance Canopy
  const canopyGroup = new THREE.Group();
  const canopyGlass = new THREE.Mesh(
    new THREE.BoxGeometry(5, 0.06, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xbbdddd, roughness: 0.5 })
  );
  canopyGlass.castShadow = true;
  canopyGroup.add(canopyGlass);

  const canopyFrameMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
  for (const z of [-1.1, 1.1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(5.14, 0.08, 0.08), canopyFrameMat);
    f.position.set(0, 0, z);
    canopyGroup.add(f);
  }
  for (const x of [-2.53, 2.53]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.28), canopyFrameMat);
    f.position.set(x, 0, 0);
    canopyGroup.add(f);
  }
  canopyGroup.position.set(0, 1.9, 7.5);
  scene.add(canopyGroup);

  // Entrance Glass Doors
  const doorsGroup = new THREE.Group();
  const doorGlassMat = new THREE.MeshStandardMaterial({ color: 0x9fc9cc, roughness: 0.35, metalness: 0.1 });
  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
  for (const x of [-0.615, 0.615]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.85, 0.05), doorGlassMat);
    door.position.set(x, 0.925, 0);
    door.castShadow = true;
    doorsGroup.add(door);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.04), doorFrameMat);
    handle.position.set(x + 0.4 * Math.sign(x), 0.925, 0.05);
    doorsGroup.add(handle);
  }
  const centerFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.85, 0.08), doorFrameMat);
  centerFrame.position.set(0, 0.925, 0);
  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.08, 0.08), doorFrameMat);
  topFrame.position.set(0, 1.85, 0);
  doorsGroup.add(centerFrame, topFrame);
  doorsGroup.position.set(0, 0, 6.53);
  scene.add(doorsGroup);

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

  // 3. Dynamic Active Floor Pool (24 Reusable Canvases / Meshes)
  const POOL_SIZE = 24;
  const CANVAS_SCALE = 2; // retina resolution
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
    canvas.width = 1280 * CANVAS_SCALE;
    canvas.height = 256 * CANVAS_SCALE;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
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

  // Penthouse "Claim top floor" Boards on 4 sides
  const claimTex = createClaimButtonTexture();
  disposables.push(claimTex);
  const claimBoardMat = new THREE.MeshStandardMaterial({ map: claimTex, roughness: 0.4 });
  disposables.push(claimBoardMat);
  for (let r = 0; r < 4; r++) {
    const boardGroup = new THREE.Group();
    boardGroup.rotation.y = r * (Math.PI / 2);
    const board = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 0.1), [
      hiringBackMat,
      hiringBackMat,
      hiringBackMat,
      hiringBackMat,
      claimBoardMat,
      hiringBackMat,
    ]);
    board.position.set(0, penthouseY + SLAB_HEIGHT + 0.5, 5.12);
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
  juiceDrinker.group.position.set(0.48, roofY + 3.4, 0);
  scene.add(juiceDrinker.group);

  // 8. GLTF Model Loader (Asynchronously populate rich GLB models with exact dimensions)
  const gltfLoader = new GLTFLoader();
  const animMixers: THREE.AnimationMixer[] = [];

  // Rooftop Juice & Cafe Pavilion (Cleaned, with outdoor dining tables & chairs)
  gltfLoader.load(
    "/models/pizza-restaurant.glb",
    (gltf) => {
      const model = fitModelHeight(gltf.scene, 2.6);
      model.position.set(3.9, roofY + 0.4, -2.6);
      model.rotation.y = Math.PI / 2;
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

  // Ground Plaza Luxury Vehicle Fleet (Front Driveway & Both Sides)
  const carDefs = [
    // Front Plaza Driveway
    { url: "/models/police-car.glb", length: 1.95, x: 0, z: 8.8, rotY: Math.PI },
    { url: "/models/car.glb", length: 1.95, x: 3.8, z: 8.8, rotY: Math.PI + 0.04 },
    { url: "/models/range-rover.glb", length: 2.1, x: -3.8, z: 8.8, rotY: Math.PI - 0.04 },

    // Left Plaza Side (Range Rovers / G-Wagons & Luxury Sedans)
    { url: "/models/range-rover.glb", length: 2.1, x: -8.6, z: 3.2, rotY: -Math.PI / 2 + 0.05 },
    { url: "/models/car.glb", length: 1.95, x: -8.6, z: 0.0, rotY: -Math.PI / 2 },
    { url: "/models/range-rover.glb", length: 2.1, x: -8.6, z: -3.2, rotY: -Math.PI / 2 - 0.05 },

    // Right Plaza Side (Mercedes / Audi Luxury Sedans & Range Rovers)
    { url: "/models/car.glb", length: 1.95, x: 8.6, z: 3.2, rotY: Math.PI / 2 - 0.05 },
    { url: "/models/range-rover.glb", length: 2.1, x: 8.6, z: 0.0, rotY: Math.PI / 2 },
    { url: "/models/car.glb", length: 1.95, x: 8.6, z: -3.2, rotY: Math.PI / 2 + 0.05 },
  ];
  for (const def of carDefs) {
    gltfLoader.load(
      def.url,
      (gltf) => {
        const model = fitModelLength(gltf.scene, def.length, def.rotY);
        model.position.set(def.x, 0, def.z);
        scene.add(model);
      },
      undefined,
      () => {}
    );
  }

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
  const initialAzimuth = 42 * (Math.PI / 180);
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

  function renderFrame(now: number) {
    raf = requestAnimationFrame(renderFrame);
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

    // Animated Passenger Helicopter-to-Juice-Stall Loop (22 second periodic cycle)
    const cycleDuration = 22.0;
    const loopT = (now * 0.001) % cycleDuration;

    const helipadLadderTopY = chopperHoverY - 0.4;
    const helipadDeckY = roofY + 0.45;
    const ladderX = 0.48;
    const ladderZ = 0.0;
    const juiceDoorX = 2.4;
    const juiceDoorZ = -1.1; // Right in front of Pizza Hut entrance door & patio

    if (loopT < 4.0) {
      // Phase 1: Climbing down the ladder from the helicopter
      const p = loopT / 4.0;
      juiceDrinker.group.position.set(ladderX, helipadLadderTopY - p * (helipadLadderTopY - helipadDeckY), ladderZ);
      juiceDrinker.group.rotation.y = -Math.PI / 2;
      juiceDrinker.armGroup.rotation.x = Math.sin(loopT * 10) * 0.45 - 0.3;
      juiceDrinker.armGroup.rotation.y = 0;
      juiceDrinker.armGroup.rotation.z = 0;
    } else if (loopT < 8.0) {
      // Phase 2: Walking across helipad to the Pizza Hut front entrance door
      const p = (loopT - 4.0) / 4.0;
      const currentX = ladderX + (juiceDoorX - ladderX) * p;
      const currentZ = ladderZ + (juiceDoorZ - ladderZ) * p;
      const walkBob = Math.abs(Math.sin(loopT * 14)) * 0.04;
      juiceDrinker.group.position.set(currentX, helipadDeckY + walkBob, currentZ);
      juiceDrinker.group.rotation.y = Math.atan2(juiceDoorX - ladderX, juiceDoorZ - ladderZ);
      juiceDrinker.armGroup.rotation.x = Math.sin(loopT * 10) * 0.35;
      juiceDrinker.armGroup.rotation.y = 0;
      juiceDrinker.armGroup.rotation.z = 0;
    } else if (loopT < 15.5) {
      // Phase 3: At Pizza Hut door counter & patio drinking juice
      juiceDrinker.group.position.set(juiceDoorX, helipadDeckY - 0.05, juiceDoorZ);
      juiceDrinker.group.rotation.y = Math.PI / 4;

      // Periodic sipping motion
      const sipCycle = (loopT - 8.0) % 3.0;
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
    } else if (loopT < 19.0) {
      // Phase 4: Walking back to the Helipad Ladder
      const p = (loopT - 15.5) / 3.5;
      const currentX = juiceDoorX + (ladderX - juiceDoorX) * p;
      const currentZ = juiceDoorZ + (ladderZ - juiceDoorZ) * p;
      const walkBob = Math.abs(Math.sin(loopT * 14)) * 0.04;
      juiceDrinker.group.position.set(currentX, helipadDeckY + walkBob, currentZ);
      juiceDrinker.group.rotation.y = Math.atan2(ladderX - juiceDoorX, ladderZ - juiceDoorZ);
      juiceDrinker.armGroup.rotation.x = Math.sin(loopT * 10) * 0.35;
      juiceDrinker.armGroup.rotation.y = 0;
      juiceDrinker.armGroup.rotation.z = 0;
    } else {
      // Phase 5: Climbing back up the ladder into the helicopter
      const p = (loopT - 19.0) / 3.0;
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
