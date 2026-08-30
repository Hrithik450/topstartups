# BharatHunt (Top Floor) 🏢🚀

A high-performance, real-time 3D interactive bidding skyscraper and directory built with **Next.js 14**, **Three.js**, and **Tailwind CSS**.

---

## ✨ Features

- **3D Skyscraper Architecture**: Procedural multi-tier tower with 58 dynamically rendered floors, reflective architectural glass, and custom elevation rulers.
- **Burj Khalifa Edition (`/v2`)**: Dedicated route featuring authentic tri-wing helical spiral setbacks, 2,722 FT pinnacle spire, and reflective Dubai fountain pool plaza.
- **Dynamic Floor Pooling**: 60 FPS GPU-accelerated rendering utilizing high-DPI canvas textures and frustum pooling.
- **Interactive Floor Cards**: Real-time 3D raycasting with rich bottom-right hover product cards (featuring domain logos, pricing in ₹, categories, locations, and hiring badges).
- **Smooth Navigation**: Custom hand-grabbing cursor controls, wheel scrolling, flight intro ascent animations, and manual floor ride controls.
- **Luxury Plaza Fleet**: Detailed supercars, range rovers, and police cruisers stationed across the plaza grounds.
- **Rooftop Experience**: Active observation lounge, helipad, hovering helicopter with spinning rotor blades, and billboard branding.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **3D Engine**: [Three.js](https://threejs.org/) (GLTFLoader, OrbitControls, PMREM RoomEnvironment)
- **Styling**: CSS Variables & Modern CSS animations
- **Typography**: [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the Standard Tower or [http://localhost:3000/v2](http://localhost:3000/v2) for the Burj Khalifa Tower.

---

## 📦 Production Build

```bash
npm run build
npm start
```
