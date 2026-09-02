# GeTopFloor 🏢🚀

> **The World's Most Interactive 3D Skyscraper Directory & Outbid Platform for Startups.**  
> Outbid your rivals, claim the penthouse floor (#1), and put your company on the global stage.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-blue?style=flat&logo=three.js)](https://threejs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-C5F74F?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![Dodo Payments](https://img.shields.io/badge/Dodo_Payments-Merchant_of_Record-FF5722?style=flat)](https://dodopayments.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Key Features

### 🏢 1. Real-Time 3D Skyscraper Experience
- **Interactive Skyscraper**: A 50-story skyscraper with architectural glass, ambient night sky, starfield, procedural city skyline, and elevator altitude ruler.
- **Rooftop Observations & Animations**:
  - Helipad with hovering helicopter and rotating rotor blades.
  - Animated passenger descending from chopper to the rooftop Pizza Hut cafe.
  - Rooftop Pizza Hut cafe pavilion with vibrant sRGB textures and filtered physics colliders.
  - Penthouse executive conference boardroom featuring CEO, co-founders, modern desks, lounge sofas, and lush office flora.
- **Camera & Gesture Controls**: Smooth mouse drag rotation, elevator wheel scroll, touch gestures for mobile, and altitude camera zoom.
- **Dual Lighting Themes**: Switch seamlessly between **Cyber Dark** and **Sunset Light** modes with custom UI styling.

### 💰 2. Atomic Outbidding & Rank Shift Engine
- **Rank 1 Penthouse Claiming**: Founders can claim the top floor by completing checkout.
- **Atomic Rank Shifting**: When a new company claims Rank 1, existing floors shift down automatically (`rank = rank + 1`) in an atomic database transaction.
- **Idempotency Safeguard**: Dual-check payment processing ensures no double rank shifts occur even if webhooks retry.
- **Clean 50-Floor Boundary**: The tower maintains an active 50 floors, gracefully pruning placeholder slots.

### 💳 3. Dodo Payments Integration
- **Merchant of Record**: Built-in support for INR (₹) transactions via UPI, Credit/Debit Cards, and NetBanking.
- **Customer Information Capture**: Collects founder name, verified email, and contact phone number.
- **Instant Webhook Reconciliation**: Cryptographically verified webhooks (`webhook-signature`) immediately activate claims.

### 🔐 4. Passwordless Email OTP & Floor Management
- **Zero-Token Architecture**: No cumbersome tokens for users to copy or lose.
- **Brevo (Sendinblue) OTP**: 6-digit numeric verification code sent directly to the founder's email (valid for 10 minutes, with server console fallback in dev mode).
- **Product Selector Dropdown**: Once verified, founders can view all their claimed skyscraper floors in a unified modal to update company name, tagline, description, logo URL, or vacate floors.

### 📊 5. Protected Admin Portal (`/admin`)
- **Password-Protected Authentication**: Admin login protected by `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env` using timing-safe HMAC validation.
- **High-Level Metrics**: Live counters for total registered founders, claimed floors, available slots, and total revenue in ₹.
- **Searchable Founder Table**: Filter founders by name, email, phone number, or company name, complete with product badges showing ranks and prices paid.

### 🛡️ 6. Enterprise-Grade Security
- **Content Security Policy (CSP)**: Strict headers allowing Three.js WebGL blobs, fonts, styles, and payment gateway connections.
- **CORS & Framing Protections**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and restricted permissions policy.
- **Timing-Safe Comparison**: Prevents timing attacks on admin passwords and management session tokens.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend & SSR** | [Next.js 14](https://nextjs.org/) (App Router, Server Components & Route Handlers) |
| **3D Graphics Engine** | [Three.js](https://threejs.org/) (WebGL, GLTFLoader, PCFShadowMap, ACESFilmicToneMapping) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) (100% Type-Safe SQL queries) |
| **Database** | PostgreSQL (Tested with [Supabase](https://supabase.com/) & self-hosted VPS PostgreSQL) |
| **Payments** | [Dodo Payments](https://dodopayments.com/) (Merchant of Record with UPI & Cards) |
| **Transactional Email** | [Brevo (Sendinblue)](https://www.brevo.com/) REST API |
| **Styling** | Modern CSS Variables, Custom Theme Switching, Responsive Layouts |

---

## 📂 Project Structure

```
outbid/
├── app/
│   ├── admin/                    # 📊 Admin Dashboard & Login Gate (/admin)
│   ├── api/                      # ⚡ REST API Endpoints
│   │   ├── admin/                # Admin login, logout, and founder queries
│   │   ├── auth/                 # Send & verify Brevo Email OTPs
│   │   ├── checkout/             # Dodo payment session creation & verification
│   │   ├── floors/               # Active skyscraper floors & founder CRUD
│   │   └── webhooks/dodo/        # Cryptographically verified Dodo webhook handler
│   ├── globals.css               # Theme styling (Dark & Sunset themes)
│   ├── layout.tsx                # Metadata, OpenGraph, JSON-LD schema, and analytics
│   ├── page.tsx                  # Skyscraper landing page
│   ├── robots.txt/sitemap.xml    # Automated SEO crawlers
│
├── components/
│   ├── Experience.tsx            # Three.js canvas mount & UI state synchronizer
│   ├── Hero.tsx                  # Navigation header, payment celebration banner, claim modal
│   ├── FloorHoverCard.tsx        # 3D raycast hover card with startup preview & visit CTA
│   ├── ManageFloorModal.tsx      # Brevo OTP login & multi-product management modal
│   └── BuildingLoader.tsx        # 3D building initialization progress indicator
│
├── lib/
│   ├── db/
│   │   ├── config/               # ⚙️ Infrastructure & Configuration
│   │   │   ├── client.ts         # Lazy connection pooler compatible with Supabase & VPS
│   │   │   ├── schema.ts         # Drizzle schemas (users, floors, claims, email_otps)
│   │   │   ├── pool-config.ts    # Multi-tier connection pooler (:5432 & :6543)
│   │   │   ├── ssl.ts            # Auto-detecting SSL for VPS, Docker & Cloud
│   │   │   └── seed.ts           # 50-floor skyscraper database seeder
│   │   ├── floors.ts             # Skyscraper business logic & queries (pure Drizzle)
│   │   ├── users.ts              # Founder accounts & directory queries (pure Drizzle)
│   │   └── index.ts              # Clean DB barrel export
│   ├── email/
│   │   └── brevo.ts              # Brevo transactional email sender
│   ├── three/
│   │   ├── app.ts                # Complete Three.js 3D Skyscraper engine
│   │   └── listings.ts           # Client-side placeholder definitions
│   ├── admin-auth.ts             # Admin authentication & timing-safe token helpers
│   └── dodo.ts                   # Dodo Payments SDK client & webhook validator
│
├── public/models/                # Optimized GLB 3D models (Pizza Hut, Chopper, Team)
├── drizzle.config.ts             # Drizzle Kit migration configuration
├── Dockerfile                    # Multi-stage standalone production Dockerfile
└── next.config.mjs               # Standalone output & CSP security headers
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` (for local development) or `.env` (for production):

```bash
cp .env.example .env.local
```

| Variable | Description | Example / Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Supabase or VPS) | `postgresql://postgres:postgres@127.0.0.1:5432/outbid` |
| `DATABASE_DIRECT_URL` | Direct port 5432 connection for migrations & seeding | `postgresql://postgres:postgres@127.0.0.1:5432/outbid` |
| `DATABASE_SSL` | Force SSL on/off (`false` for VPS/Docker, `true` for Cloud) | `false` |
| `DODO_PAYMENTS_API_KEY` | Dodo Payments API key (leave empty for mock sandbox mode) | `test_...` |
| `DODO_PAYMENTS_WEBHOOK_SECRET` | Webhook verification secret from Dodo Dashboard | `whsec_...` |
| `DODO_PAYMENTS_ENVIRONMENT` | Gateway environment (`test` or `live`) | `test` |
| `DODO_PAYMENTS_PRODUCT_ID` | Product ID configured in Dodo Dashboard | `pdt_...` |
| `BREVO_API_KEY` | Brevo API key for transactional OTP emails (console fallback if empty) | `xkeysib-...` |
| `BREVO_SENDER_EMAIL` | Sender email address registered in Brevo | `notifications@getopfloor.com` |
| `BREVO_SENDER_NAME` | Sender name displayed on emails | `GeTopFloor` |
| `SESSION_SECRET` | Cryptographic secret for signing founder management sessions | `your_random_secret_here` |
| `ADMIN_EMAIL` | Admin portal login email address | `admin@getopfloor.com` |
| `ADMIN_PASSWORD` | Admin portal login password | `your_secure_admin_password` |
| `PORT` | Node.js web server port | `3000` |

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database & Seed 50 Floors
Ensure PostgreSQL is running locally or provide a Supabase URL in `.env.local`:
```bash
# Push schema to database
npm run db:push

# Seed the 50 skyscraper floors
npm run db:seed
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the 3D Skyscraper.  
Open [http://localhost:3000/admin](http://localhost:3000/admin) to access the Admin Portal.

---

## 🖥️ VPS & Self-Hosted Deployment

GeTopFloor is fully optimized for **self-hosted VPS deployment** (Ubuntu/Debian, Docker, PM2, Dokku, Coolify, CapRover) as well as cloud platforms.

### Option A: Using Docker (Recommended for VPS)

```bash
# 1. Build Docker image
docker build -t getopfloor:latest .

# 2. Run container with your environment variables
docker run -d \
  -p 3000:3000 \
  --name getopfloor \
  --restart always \
  -e DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/outbid" \
  -e DATABASE_SSL="false" \
  -e ADMIN_EMAIL="admin@getopfloor.com" \
  -e ADMIN_PASSWORD="your_admin_password" \
  -e SESSION_SECRET="your_session_secret" \
  getopfloor:latest
```

### Option B: Using Node.js & PM2 on VPS

```bash
# 1. Build production standalone bundle
npm run build

# 2. Start process manager
pm2 start npm --name "getopfloor" -- start
```

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/floors` | Fetch the 50 skyscraper floors (Rank 1 to 50) | Public |
| `GET` | `/api/floors/manage` | Fetch claimed floors owned by an authenticated founder | HMAC Session Token |
| `PATCH` | `/api/floors/manage` | Update claimed startup details (title, url, tagline, logo) | HMAC Session Token |
| `DELETE` | `/api/floors/manage` | Vacate/reset a floor back to an available slot | HMAC Session Token |
| `POST` | `/api/auth/send-otp` | Generate & send 6-digit Brevo verification code | Public |
| `POST` | `/api/auth/verify-otp` | Verify 6-digit code and issue session token | Public |
| `POST` | `/api/checkout` | Create Dodo Payments checkout session | Public |
| `POST` | `/api/checkout/verify` | Verify payment status and atomically claim top floor | Public |
| `POST` | `/api/webhooks/dodo` | Receive and process payment webhook events | Dodo Signature |
| `POST` | `/api/admin/login` | Authenticate admin against `.env` credentials | Public |
| `POST` | `/api/admin/logout` | Clear admin authentication cookie | Admin Cookie |
| `GET` | `/api/admin/users` | List all registered founders, contacts, and products | Admin Session |

---

## 📄 License

MIT © [Hrithik](https://github.com/Hrithik450)
