import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { INITIAL_LISTINGS, type Listing } from "./listings";

export interface TowerHandle {
  setFloor: (index: number) => void;
  moveFloors: (delta: number) => void;
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleRuler: () => boolean;
  toggleSound: () => boolean;
  toggleAutoRotate: () => boolean;
  dispose: () => void;
}

const AVAILABLE_LOGOS = new Set([
  "befailproof.ai",
  "japanpr.me",
  "slopfolio.com",
  "jointracks.ai",
  "partners.smashbyte.com",
  "ezugc.ai",
  "coachfit.health",
  "screensnap.pro",
  "x.com",
  "coreloop.team",
  "propgear.io",
  "tryrankwise.com",
  "ownpx.com",
  "itshemp.in",
  "smit.net",
  "outrank.world",
]);

const HELIPAD_DECK_HEX = "#f3db47";
const HELIPAD_MARK_HEX = "#0b0c0e";

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "...").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "...";
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 52%)`;
}

function paintFloorTexture(
  ctx: CanvasRenderingContext2D,
  listing: Listing,
  rank: number,
  logoImg: HTMLImageElement | null
) {
  ctx.clearRect(0, 0, 1280, 256);

  // Burj Khalifa reflective vision glass facade with horizontal stainless spandrels
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 256);
  bgGrad.addColorStop(0, "#3b6d9c");
  bgGrad.addColorStop(0.3, "#214a72");
  bgGrad.addColorStop(0.7, "#173656");
  bgGrad.addColorStop(1, "#0f253d");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1280, 256);

  // Reflective sheen lines
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(0, 0, 1280, 8);
  ctx.fillRect(0, 248, 1280, 8);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(0, 124, 1280, 4);

  // Logo Badge
  const lx = 48;
  const ly = 32;
  const lw = 192;
  const lh = 192;
  const lr = 28;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(lx, ly, lw, lh, lr);
  ctx.clip();

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(lx, ly, lw, lh);
    ctx.drawImage(logoImg, lx, ly, lw, lh);
  } else {
    const bg = stringToColor(listing.title || listing.url_or_handle);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 76px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((listing.title.trim().charAt(0) || "?").toUpperCase(), 144, 128);
  }
  ctx.restore();

  // Logo Border
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(lx, ly, lw, lh, lr);
  ctx.stroke();
  ctx.restore();

  // Title / Domain
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
  ctx.font = "700 64px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";

  const domain = listing.url_or_handle.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const titleText = truncateText(ctx, domain, 700);
  ctx.fillText(titleText, 260, 108);

  // Subtitle / Description
  ctx.globalAlpha = 0.8;
  ctx.font = "500 36px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.fillText(truncateText(ctx, listing.description || listing.title, 700), 260, 186);
  ctx.restore();

  // Rank and Price in Indian Rupees
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
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
  ctx.fillStyle = "rgba(80, 140, 210, 0.15)";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = "rgba(180, 210, 245, 0.45)";
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

function createRulerLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 100;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f0c419";
  ctx.fillRect(0, 0, 240, 100);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 234, 94);
  ctx.fillStyle = "#111111";
  ctx.font = "800 40px 'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 120, 52);
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
  ctx.fillText("BharatHunt • Burj Khalifa Tower", 768, 192);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function fitModelHeight(scene: THREE.Object3D, targetHeight: number): THREE.Group {
  const root = new THREE.Group();
  root.add(scene);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetHeight / (size.y || 1);
  root.scale.setScalar(scale);

  const updatedBox = new THREE.Box3().setFromObject(root);
  const center = updatedBox.getCenter(new THREE.Vector3());
  root.position.x = -center.x;
  root.position.y = -updatedBox.min.y;
  root.position.z = -center.z;

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

function fitModelLength(scene: THREE.Object3D, targetLength: number, rotY: number = 0): THREE.Group {
  const root = new THREE.Group();
  root.add(scene);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxHoriz = Math.max(size.x, size.z) || 1;
  const scale = targetLength / maxHoriz;
  root.scale.setScalar(scale);

  const updatedBox = new THREE.Box3().setFromObject(root);
  const center = updatedBox.getCenter(new THREE.Vector3());
  root.position.x = -center.x;
  root.position.y = -updatedBox.min.y;
  root.position.z = -center.z;
  root.rotation.y = rotY;

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

export interface CreateTowerOptions {
  onFloorHover?: (data: { listing: Listing; rank: number } | null) => void;
}

export function createTower(container: HTMLElement, options?: CreateTowerOptions): TowerHandle {
  const onFloorHover = options?.onFloorHover;
  const disposables: (THREE.Material | THREE.BufferGeometry | THREE.Texture | { dispose: () => void })[] = [];

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = roomTex;
  scene.environmentIntensity = 0.75;
  disposables.push(pmremGenerator, roomTex);

  // Burj Khalifa Architectural Parameters
  const listings: Listing[] = [...INITIAL_LISTINGS].reverse();
  const floorCount = listings.length; // 58 floors
  const BASE_HEIGHT = 2.4;
  const FLOOR_PITCH = 2.45;
  const SLAB_HEIGHT = 0.42;
  const BODY_HEIGHT = 2.03;
  const TOWER_CORE_WIDTH = 8.6;
  const totalHeight = BASE_HEIGHT + (floorCount + 1) * FLOOR_PITCH;
  const penthouseY = BASE_HEIGHT + floorCount * FLOOR_PITCH;
  const roofY = totalHeight;

  // Lights
  const hemi = new THREE.HemisphereLight(0xe4f2ff, 0xb0c4d8, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff6e8, 2.6);
  sun.position.set(28, totalHeight + 35, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = totalHeight * 3 + 120;
  const d = 36;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const fillLight = new THREE.DirectionalLight(0xd0e8ff, 1.1);
  fillLight.position.set(-24, totalHeight / 2, -18);
  scene.add(fillLight);

  // Burj Khalifa Materials: Anodized aluminum spandrels, reflective glass & stainless steel fins
  const slabMat = new THREE.MeshStandardMaterial({
    color: 0xdde3ea,
    roughness: 0.25,
    metalness: 0.78,
  });
  const steelMullionMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.15,
    metalness: 0.92,
  });
  const wingGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e3a5f,
    roughness: 0.18,
    metalness: 0.55,
    transmission: 0.3,
    ior: 1.5,
    clearcoat: 0.8,
  });
  const setbackRoofMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.45,
    metalness: 0.6,
  });
  const waterPoolMat = new THREE.MeshStandardMaterial({
    color: 0x0f4c81,
    roughness: 0.08,
    metalness: 0.85,
  });
  disposables.push(slabMat, steelMullionMat, wingGlassMat, setbackRoofMat, waterPoolMat);

  // 1. Burj Khalifa Fountain & Y-Podium Plaza
  const groundGroup = new THREE.Group();

  // Dubai Lake Fountain Reflective Pool
  const poolGeo = new THREE.CylinderGeometry(20, 21, 0.3, 48);
  const pool = new THREE.Mesh(poolGeo, waterPoolMat);
  pool.position.y = 0.15;
  pool.receiveShadow = true;
  groundGroup.add(pool);

  // Grand Y-shaped Entrance Podium Base
  const podiumGeo = new THREE.CylinderGeometry(13, 15, BASE_HEIGHT, 6);
  const podiumMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.65 });
  const podium = new THREE.Mesh(podiumGeo, podiumMat);
  podium.position.y = BASE_HEIGHT / 2;
  podium.receiveShadow = true;
  podium.castShadow = true;
  groundGroup.add(podium);

  // 3 Curved glass entrance canopies radiating out at 120°
  for (let w = 0; w < 3; w++) {
    const angle = w * ((2 * Math.PI) / 3);
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.28, 3.6),
      steelMullionMat
    );
    canopy.position.set(Math.sin(angle) * 8.2, BASE_HEIGHT - 0.2, Math.cos(angle) * 8.2);
    canopy.rotation.y = angle;
    canopy.castShadow = true;
    groundGroup.add(canopy);
  }
  scene.add(groundGroup);
  disposables.push(poolGeo, podiumGeo, podiumMat);

  // 2. Continuous Burj Khalifa Floor Slabs with Bullnose Edges
  const slabGeo = new THREE.BoxGeometry(TOWER_CORE_WIDTH + 0.35, SLAB_HEIGHT, TOWER_CORE_WIDTH + 0.35);
  disposables.push(slabGeo);

  for (let i = 0; i <= floorCount; i++) {
    const y = BASE_HEIGHT + FLOOR_PITCH * i;
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.y = y + SLAB_HEIGHT / 2;
    slab.castShadow = true;
    slab.receiveShadow = true;
    scene.add(slab);
  }

  // 3. Burj Khalifa Tri-Wing Helical Spiral Setback System (26 Stepping Tiers)
  // Each wing spirals and steps back as the tower ascends
  const setbackGroup = new THREE.Group();
  for (let f = 0; f < floorCount; f++) {
    const fy = BASE_HEIGHT + FLOOR_PITCH * f;
    const tierProgress = f / floorCount;

    // 3 Wings at 0°, 120°, 240°
    for (let w = 0; w < 3; w++) {
      const wingAngle = w * ((2 * Math.PI) / 3);
      // Wing length decreases based on helical setback schedule
      const setbackOffset = ((f + w * 2) % 6) / 6;
      const wingLength = Math.max(0, (4.8 - tierProgress * 4.6) * (1 - setbackOffset * 0.15));

      if (wingLength > 0.4) {
        const wingWidth = Math.max(2.2, 3.4 * (1 - tierProgress * 0.5));
        const wingGeo = new THREE.BoxGeometry(wingWidth, BODY_HEIGHT, wingLength);
        const wing = new THREE.Mesh(wingGeo, wingGlassMat);
        const centerDist = TOWER_CORE_WIDTH / 2 + wingLength / 2 - 0.2;
        wing.position.set(
          Math.sin(wingAngle) * centerDist,
          fy + SLAB_HEIGHT + BODY_HEIGHT / 2,
          Math.cos(wingAngle) * centerDist
        );
        wing.rotation.y = wingAngle;
        wing.castShadow = true;
        wing.receiveShadow = true;
        setbackGroup.add(wing);

        // Cylindrical Bullnose Nose on wing tip
        const noseGeo = new THREE.CylinderGeometry(wingWidth / 2, wingWidth / 2, BODY_HEIGHT, 16);
        const nose = new THREE.Mesh(noseGeo, steelMullionMat);
        nose.position.set(
          Math.sin(wingAngle) * (TOWER_CORE_WIDTH / 2 + wingLength),
          fy + SLAB_HEIGHT + BODY_HEIGHT / 2,
          Math.cos(wingAngle) * (TOWER_CORE_WIDTH / 2 + wingLength)
        );
        nose.castShadow = true;
        setbackGroup.add(nose);

        // Step-down terrace roof capping
        if (f % 2 === 0) {
          const terraceRoof = new THREE.Mesh(
            new THREE.BoxGeometry(wingWidth + 0.1, 0.15, wingLength + 0.1),
            setbackRoofMat
          );
          terraceRoof.position.set(
            Math.sin(wingAngle) * centerDist,
            fy + SLAB_HEIGHT + BODY_HEIGHT + 0.08,
            Math.cos(wingAngle) * centerDist
          );
          terraceRoof.rotation.y = wingAngle;
          setbackGroup.add(terraceRoof);
        }
      }
    }
  }
  scene.add(setbackGroup);

  // 4. Dynamic Floor Pool for Visible Listings on Front Vision Facade
  const POOL_SIZE = 24;
  const CANVAS_SCALE = 2;
  const placeholderGeo = new THREE.BoxGeometry(TOWER_CORE_WIDTH, BODY_HEIGHT, TOWER_CORE_WIDTH);
  disposables.push(placeholderGeo);

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
  function getOrLoadLogo(urlOrDomain: string, onLoaded: () => void): HTMLImageElement | null {
    if (logoImagesCache.has(urlOrDomain)) return logoImagesCache.get(urlOrDomain)!;
    const clean = urlOrDomain.replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./, "");
    if (!AVAILABLE_LOGOS.has(clean)) return null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => onLoaded();
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
      roughness: 0.18,
      metalness: 0.5,
      envMapIntensity: 1.0,
      clearcoat: 0.6,
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

    // 3D Hanging HIRING Badge - Front rectangular hanging sign
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
    hiringBadge.position.set(2.4, 0, TOWER_CORE_WIDTH / 2 + 0.18);
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

  // 5. Penthouse (Observation Lounge - "At The Top")
  const penthouseGridTex = createGlassGridTexture();
  disposables.push(penthouseGridTex);
  const penthouseGlassMat = new THREE.MeshPhysicalMaterial({
    map: penthouseGridTex,
    transparent: true,
    roughness: 0.35,
    metalness: 0.3,
    transmission: 0.92,
    thickness: 0.6,
    ior: 1.5,
    opacity: 0.45,
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

  // Penthouse "Claim top floor" boards
  const claimBtnTex = createClaimButtonTexture();
  disposables.push(claimBtnTex);
  const claimMat = new THREE.MeshStandardMaterial({ map: claimBtnTex, roughness: 0.4 });
  disposables.push(claimMat);

  for (let face = 0; face < 4; face++) {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 1.4, 0.08),
      [hiringBackMat, hiringBackMat, hiringBackMat, hiringBackMat, claimMat, claimMat]
    );
    const angle = face * (Math.PI / 2);
    board.position.set(
      Math.sin(angle) * (TOWER_CORE_WIDTH / 2 + 0.15),
      penthouseY + SLAB_HEIGHT + BODY_HEIGHT / 2,
      Math.cos(angle) * (TOWER_CORE_WIDTH / 2 + 0.15)
    );
    board.rotation.y = angle;
    board.castShadow = true;
    scene.add(board);
  }

  // 6. Rooftop Helipad & Deck
  const helipadTex = createHelipadTexture();
  disposables.push(helipadTex);
  const helipadMat = new THREE.MeshStandardMaterial({ map: helipadTex, roughness: 0.5 });
  const helipadGeo = new THREE.CylinderGeometry(3.6, 3.6, 0.12, 32);
  const helipad = new THREE.Mesh(helipadGeo, [
    hiringBackMat,
    helipadMat,
    hiringBackMat,
  ]);
  helipad.position.set(0, roofY + 0.45, 1.2);
  helipad.receiveShadow = true;
  scene.add(helipad);
  disposables.push(helipadGeo, helipadMat);

  // Large Top Billboard
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
  billboard.position.set(-1.8, roofY + 1.9, 4.4);
  billboard.rotation.y = 0.12;
  billboard.castShadow = true;
  scene.add(billboard);
  disposables.push(billboardGeo, billboardMat);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  for (const lx of [-2.8, 2.8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.8, 0.16), legMat);
    leg.position.set(-1.8 + lx, roofY + 0.7, 4.4);
    leg.rotation.y = 0.12;
    leg.castShadow = true;
    scene.add(leg);
  }

  // 7. Burj Khalifa Iconic Telescoping Stainless Steel Spire
  const spireGroup = new THREE.Group();
  spireGroup.position.set(0, 0, -1.0);

  const spireTier1Geo = new THREE.CylinderGeometry(0.7, 1.2, 5.0, 16);
  const spireTier1 = new THREE.Mesh(spireTier1Geo, steelMullionMat);
  spireTier1.position.y = roofY + 2.5;
  spireTier1.castShadow = true;
  spireGroup.add(spireTier1);

  const spireTier2Geo = new THREE.CylinderGeometry(0.35, 0.7, 6.0, 16);
  const spireTier2 = new THREE.Mesh(spireTier2Geo, steelMullionMat);
  spireTier2.position.y = roofY + 8.0;
  spireTier2.castShadow = true;
  spireGroup.add(spireTier2);

  const pinnacleGeo = new THREE.CylinderGeometry(0.04, 0.35, 8.0, 12);
  const pinnacle = new THREE.Mesh(pinnacleGeo, steelMullionMat);
  pinnacle.position.y = roofY + 15.0;
  pinnacle.castShadow = true;
  spireGroup.add(pinnacle);

  // Flashing Red Aviation Beacon Light at Pinnacle
  const beaconGeo = new THREE.SphereGeometry(0.18, 12, 12);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.y = roofY + 19.2;
  spireGroup.add(beacon);

  const beaconLight = new THREE.PointLight(0xff1100, 3, 20);
  beaconLight.position.copy(beacon.position);
  spireGroup.add(beaconLight);

  scene.add(spireGroup);
  disposables.push(spireTier1Geo, spireTier2Geo, pinnacleGeo, beaconGeo, beaconMat);

  // 8. Height Ruler Strip (Left Side) - 2,722 FT Burj Khalifa Height
  const rulerGroup = new THREE.Group();
  const rulerStripMat = new THREE.MeshStandardMaterial({ color: 0xf0c419, roughness: 0.55 });
  const rulerStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, totalHeight, 0.05), rulerStripMat);
  rulerStrip.position.set(-8.4, totalHeight / 2, 0);
  rulerStrip.castShadow = true;
  rulerGroup.add(rulerStrip);

  const rulerFlagGeo = new THREE.BoxGeometry(0.85, 0.34, 0.05);
  for (let i = 0; i < floorCount; i++) {
    const ry = BASE_HEIGHT + FLOOR_PITCH * i;
    const ft = 2722 - (floorCount - 1 - i) * 44;
    const flagTex = createRulerLabelTexture(`${ft} FT`);
    disposables.push(flagTex);
    const flagMat = new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.5 });
    const flag = new THREE.Mesh(rulerFlagGeo, flagMat);
    flag.position.set(-9.05, ry + 1.0, 0);
    flag.castShadow = true;
    rulerGroup.add(flag);
  }
  scene.add(rulerGroup);

  // 9. Aerial Vehicles
  const gltfLoader = new GLTFLoader();
  const animMixers: THREE.AnimationMixer[] = [];

  function createAirplane(label: string) {
    const group = new THREE.Group();
    const planeMesh = new THREE.Group();
    const propMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.04), legMat);
    propMesh.position.set(0, 0, 1.2);

    gltfLoader.load(
      "/models/airplane.glb",
      (gltf) => {
        const model = fitModelHeight(gltf.scene, 1.8);
        planeMesh.add(model);
      },
      undefined,
      () => {}
    );
    planeMesh.add(propMesh);
    group.add(planeMesh);

    const bTex = createBannerTexture();
    disposables.push(bTex);
    const bMat = new THREE.MeshStandardMaterial({ map: bTex, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.55), bMat);
    banner.position.set(0, 0, -4.6);
    group.add(banner);

    scene.add(group);
    return { plane: group, prop: propMesh };
  }

  const airplane1 = createAirplane("BharatHunt");

  // Chopper
  const chopperObj = (() => {
    const group = new THREE.Group();
    const rotorGroup = new THREE.Group();
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 3.2), legMat);
    rotor.position.set(0, 0.9, 0);
    rotorGroup.add(rotor);

    gltfLoader.load(
      "/models/helicopter.glb",
      (gltf) => {
        const model = fitModelHeight(gltf.scene, 1.5);
        group.add(model);
      },
      undefined,
      () => {}
    );
    group.add(rotorGroup);
    group.position.set(2.2, roofY + 3.2, 0);
    scene.add(group);
    return { chopper: group, rotor: rotorGroup };
  })();

  // Rooftop Businessman
  gltfLoader.load(
    "/models/businessman.glb",
    (gltf) => {
      const model = fitModelHeight(gltf.scene, 0.85);
      model.position.set(0.2, roofY + 0.45, 0.1);
      scene.add(model);
      if (gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(gltf.scene);
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
        animMixers.push(mixer);
      }
    },
    undefined,
    () => {}
  );

  // Penthouse Interior Models
  const interiorDefs = [
    { url: "/models/sofa.glb", height: 0.5, x: -2.3, z: -1.5, rotY: Math.PI / 2 },
    { url: "/models/tv.glb", height: 0.5, x: -0.9, z: -1.5, rotY: -Math.PI / 2 },
    { url: "/models/desk.glb", height: 0.55, x: 3.8, z: 3.8, rotY: 0 },
    { url: "/models/toilet-paper.glb", height: 0.25, x: -2, z: -0.45, rotY: Math.PI / 2 },
    { url: "/models/plant-fiddle.glb", height: 0.65, x: 3.5, z: 0, rotY: 0 },
    { url: "/models/plant-house.glb", height: 0.45, x: -3.5, z: 0, rotY: 0.6 },
    { url: "/models/plant-orchid.glb", height: 0.5, x: 0, z: -3.5, rotY: 0 },
    { url: "/models/cleaner-man.glb", height: 0.8, x: 0, z: 0, rotY: 0 },
    { url: "/models/vacuum.glb", height: 0.4, x: 2.2, z: 1.8, rotY: Math.PI / 5 },
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

  // Ground Plaza Luxury Vehicles on Both Sides
  const carDefs = [
    // Front Plaza
    { url: "/models/police-car.glb", length: 1.95, x: 0, z: 9.6, rotY: Math.PI },
    { url: "/models/car.glb", length: 1.95, x: 4.2, z: 9.6, rotY: Math.PI + 0.04 },
    { url: "/models/range-rover.glb", length: 2.1, x: -4.2, z: 9.6, rotY: Math.PI - 0.04 },

    // Left Plaza Side (3 Luxury Cars)
    { url: "/models/range-rover.glb", length: 2.1, x: -9.2, z: 3.5, rotY: -Math.PI / 2 + 0.05 },
    { url: "/models/car.glb", length: 1.95, x: -9.2, z: 0.0, rotY: -Math.PI / 2 },
    { url: "/models/range-rover.glb", length: 2.1, x: -9.2, z: -3.5, rotY: -Math.PI / 2 - 0.05 },

    // Right Plaza Side (3 Luxury Cars)
    { url: "/models/car.glb", length: 1.95, x: 9.2, z: 3.5, rotY: Math.PI / 2 - 0.05 },
    { url: "/models/range-rover.glb", length: 2.1, x: 9.2, z: 0.0, rotY: Math.PI / 2 },
    { url: "/models/car.glb", length: 1.95, x: 9.2, z: -3.5, rotY: Math.PI / 2 + 0.05 },
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

  // Camera & Controls Setup
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
  let travelY = 1.32;
  let travelYTarget = restingTargetY;
  const initialAzimuth = 42 * (Math.PI / 180);
  const restingTilt = 8.9 * (Math.PI / 180);

  const targetVec = new THREE.Vector3(0, travelY, 0);
  controls.target.copy(targetVec);
  camera.position.setFromSphericalCoords(zoomDist, 0.5 * Math.PI - restingTilt, initialAzimuth).add(targetVec);
  controls.minPolarAngle = 0.5 * Math.PI - restingTilt;
  controls.maxPolarAngle = 0.5 * Math.PI - restingTilt;
  controls.update();

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
        slot.hiringBadge.position.y = fy + SLAB_HEIGHT + BODY_HEIGHT / 2 + 0.15;
        slot.mesh.visible = true;

        const rank = floorCount - fIdx;
        const ctx = slot.canvas.getContext("2d")!;
        const logo = getOrLoadLogo(listing.url_or_handle, () => {
          if (slot!.floorIndex === fIdx) {
            paintFloorTexture(ctx, listing, rank, logo);
            slot!.texture.needsUpdate = true;
          }
        });
        paintFloorTexture(ctx, listing, rank, logo);
        slot.texture.needsUpdate = true;
        slot.hiringBadge.visible = Boolean(listing.hiring);
      }
    }

    for (const slot of activeFloors) {
      if (!neededFloors.includes(slot.floorIndex)) {
        slot.mesh.visible = false;
        slot.hiringBadge.visible = false;
        slot.floorIndex = -1;
      }
    }
  }

  updateFloorWindow();

  // Manual wheel interaction for vertical floor scrolling & zooming
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.metaKey || e.ctrlKey) {
      zoomDistTarget = THREE.MathUtils.clamp(zoomDistTarget + e.deltaY * 0.05, 12, 48);
    } else {
      travelYTarget = THREE.MathUtils.clamp(travelYTarget - e.deltaY * 0.015, 1.32, restingTargetY);
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

  let inIntro = true;
  let introStartTime = performance.now();
  const INTRO_DURATION = 4200;
  let raf = 0;
  const clock = new THREE.Clock();

  function renderFrame(now: number) {
    raf = requestAnimationFrame(renderFrame);
    const dt = Math.min(clock.getDelta(), 0.05);

    for (const mixer of animMixers) mixer.update(dt);

    const t = now * 0.001;
    const a1 = t * 0.18;
    airplane1.plane.position.set(Math.cos(a1) * 24, roofY - 8 + Math.sin(t * 0.8) * 0.5, Math.sin(a1) * 24);
    airplane1.plane.rotation.y = -a1 + Math.PI;
    airplane1.prop.rotation.z += 30 * dt;

    chopperObj.rotor.rotation.y += 24 * dt;

    // Beacon blink
    beaconLight.intensity = Math.sin(t * 5) > 0 ? 3.5 : 0.2;
    (beacon.material as THREE.MeshBasicMaterial).color.setHex(Math.sin(t * 5) > 0 ? 0xff1100 : 0x550000);

    if (inIntro) {
      const elapsed = now - introStartTime;
      const progress = Math.min(1, elapsed / INTRO_DURATION);
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

    const isScrolled = travelY < restingTargetY - 0.5;
    if (typeof document !== "undefined" && document.body.classList.contains("home-tower-scrolled") !== isScrolled) {
      document.body.classList.toggle("home-tower-scrolled", isScrolled);
    }

    renderer.render(scene, camera);
  }

  raf = requestAnimationFrame(renderFrame);

  function handleResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    zoomDist = calculateZoomDist(w / h);
    zoomDistTarget = zoomDist;
  }

  window.addEventListener("resize", handleResize);

  return {
    setFloor(index: number) {
      const clamped = Math.max(0, Math.min(floorCount, index));
      if (clamped === 0) {
        travelYTarget = restingTargetY;
      } else {
        const floorIdx = floorCount - clamped;
        travelYTarget = BASE_HEIGHT + FLOOR_PITCH * floorIdx + 1.2;
      }
    },
    moveFloors(delta: number) {
      travelYTarget = Math.max(
        BASE_HEIGHT + 1.2,
        Math.min(restingTargetY, travelYTarget + delta * FLOOR_PITCH)
      );
    },
    reset() {
      travelYTarget = restingTargetY;
      zoomDistTarget = calculateZoomDist(container.clientWidth / container.clientHeight);
    },
    zoomIn() {
      zoomDistTarget = Math.max(12, zoomDistTarget - 4.5);
    },
    zoomOut() {
      zoomDistTarget = Math.min(48, zoomDistTarget + 4.5);
    },
    toggleRuler() {
      rulerGroup.visible = !rulerGroup.visible;
      return rulerGroup.visible;
    },
    toggleSound() {
      return true;
    },
    toggleAutoRotate() {
      controls.autoRotate = !controls.autoRotate;
      return controls.autoRotate;
    },
    dispose() {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMoveHover);
      window.removeEventListener("pointerleave", onPointerLeaveHover);
      if (typeof document !== "undefined") document.body.classList.remove("is-dragging");
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      for (const d of disposables) {
        if ("dispose" in d) d.dispose();
      }
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    },
  };
}
