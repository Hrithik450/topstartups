# GeTopFloor 🏢🚀

> **The World's Most Interactive 3D Skyscraper Directory & Outbid Platform for Startups.**  
> Outbid your rivals, claim the penthouse floor (#1), and put your company on the global stage.  
> *Backed by [BharatHunt](https://bharathunt.org)*

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-blue?style=flat&logo=three.js)](https://threejs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-C5F74F?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![Google OAuth 2.0](https://img.shields.io/badge/Auth-Google_OAuth_2.0-4285F4?style=flat&logo=google)](https://developers.google.com/identity/protocols/oauth2)
[![Dodo Payments](https://img.shields.io/badge/Dodo_Payments-Merchant_of_Record-FF5722?style=flat)](https://dodopayments.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Key Features

### 🏢 1. Real-Time 3D Skyscraper Experience
- **Interactive Skyscraper**: A 50-story interactive 3D skyscraper featuring architectural glass, night sky with twinkling starfield, procedural city skyline, and real-time altitude ruler.
- **Rooftop Observations & Animations**:
  - Helipad with hovering helicopter and rotating rotor blades.
  - Animated passenger descending from chopper to the rooftop cafe.
  - Rooftop cafe pavilion with vibrant sRGB textures and filtered physics colliders.
  - Penthouse executive conference boardroom featuring CEO, co-founders, modern desks, lounge sofas, and office flora.
- **Camera & Gesture Controls**: Smooth mouse drag rotation, elevator wheel scroll, touch gestures for mobile, and altitude camera zoom.
- **Dual Lighting Themes**: Switch seamlessly between **Cyber Dark** and **Sunset Light** modes with custom UI styling.

### 💰 2. Atomic Outbidding & Rank Shift Engine
- **Rank 1 Penthouse Claiming**: Founders can claim the top floor by completing checkout.
- **Atomic Rank Shifting**: When a new company claims Rank 1, existing floors shift down automatically (`rank = rank + 1`) in an atomic PostgreSQL transaction using pure Drizzle ORM.
- **Idempotency Safeguard**: Dual-check payment processing (`payment_id` and `checkout_session_id`) ensures no double rank shifts occur even if webhooks or redirects retry.
- **Clean 50-Floor Boundary**: The tower maintains an active 50 floors, gracefully pruning placeholder slots.

### 🔐 3. Direct Google OAuth 2.0 (Zero External Auth Libraries)
- **Zero Heavy Dependencies**: Built with direct native OpenID Connect / OAuth 2.0 communication (`accounts.google.com`, `oauth2.googleapis.com`, `www.googleapis.com/oauth2/v3/userinfo`).
- **Cross-Device Session Continuity**: Founders can sign in from mobile, tablet, or desktop Chrome/Safari and instantly access and manage all their claimed startup floors.
- **Tamper-Proof HMAC Sessions**: Issues signed HTTP-only `user_session` cookies valid for 30 days with constant-time cryptographic verification.
- **Zero-Intermediate Screen Claim Flow**:
  - Unauthenticated users clicking "Claim top floor" are taken straight to Google Account Selection, then directly to Dodo checkout.
  - Authenticated users go straight to payment with pre-filled verified credentials.

### 🛡️ 4. Live Domain & SSL Security Verification
- **Strict HTTPS Enforcement**: Rejects insecure `http://` URLs and raw IP addresses.
- **Anti-Spam & Demo Filter**: Blocks placeholder domains (`test.com`, `example.com`, `dummy.com`, `localhost`, etc.).
- **Live Reachability Check**: Server-side network and SSL handshake verification checks that entered URLs are live and secure before checkout is created.

### 📊 5. 100% Real Live Statistics Engine
- **Real Online Users**: Computed from active tab heartbeats: `WHERE last_seen_at > NOW() - INTERVAL '2 minutes'`.
- **Tab-Session Views**: Real view counting based on browser tab sessions (`sessionStorage`), preventing heartbeat pings from inflating view metrics.
- **Distinct Visitor Countries**: `COUNT(DISTINCT country_code)` ensuring unique geographical metrics.
- **Claimed Floors**: Real-time count of active startup claims on the tower.

### ⚙️ 6. Clean "Manage" UI & Owner Controls
- **Owner-Only Hover Controls**: Public visitors only see "Visit Website" or "Claim Floor"; only verified floor owners see `👑 Edit Floor`.
- **Dedicated Manage Drawer**: Single modal for updating company name, website URL, category, tagline, description, or vacating floors.
- **0-Products Empty State**: Clear feedback with a 1-click **"Claim Top Floor Now"** action when a user has no active floors.

### 📊 7. Protected Admin Portal (`/admin`)
- **Password-Protected Authentication**: Admin login protected by `ADMIN_EMAIL` and `ADMIN_PASSWORD` using timing-safe HMAC validation.
- **High-Level Metrics**: Live counters for total registered founders, claimed floors, available slots, and total revenue in ₹.
- **Searchable Founder Directory**: Filter founders by name, email, phone number, or company name, complete with product badges showing ranks and prices paid.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend & SSR** | [Next.js 14](https://nextjs.org/) (App Router, Server Components & Route Handlers) |
| **3D Graphics Engine** | [Three.js](https://threejs.org/) (WebGL, GLTFLoader, PCFSoftShadowMap, ACESFilmicToneMapping, Antialiasing) |
| **Asset Storage & CDN** | [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob) (Automatic logo CDN caching & custom file uploads) |
| **Web Metadata Crawler** | [Firecrawl](https://firecrawl.dev/) + High-Performance Direct OpenGraph/HTML Parser |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) (100% Type-Safe SQL queries) |
| **Database** | PostgreSQL (Compatible with [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Supabase](https://supabase.com/), [Neon](https://neon.tech/), & self-hosted VPS) |
| **Payments** | [Dodo Payments](https://dodopayments.com/) (Merchant of Record with UPI & Cards) |
| **Authentication** | Direct Google OAuth 2.0 (Zero external auth libraries) |
| **Styling** | Modern CSS Variables, Custom Theme Switching, Responsive Layouts |

---

## 📂 Project Structure

```
outbid/
├── app/
│   ├── admin/                    # 📊 Admin Dashboard & Login Gate (/admin)
│   ├── api/                      # ⚡ REST API Endpoints
│   │   ├── admin/                # Admin login, logout, and founder queries
│   │   ├── auth/                 # Direct Google OAuth 2.0 (url, callback, me, logout)
│   │   ├── checkout/             # Dodo payment session creation, verification & lock release
│   │   ├── floors/               # Active skyscraper floors & founder CRUD
│   │   ├── stats/                # Real-time live statistics ping & session metrics
│   │   ├── upload/               # ☁️ Vercel Blob Storage logo upload endpoint
│   │   └── webhooks/dodo/        # Cryptographically verified Dodo webhook handler
│   ├── globals.css               # Theme styling (Dark & Sunset themes)
│   ├── layout.tsx                # Metadata, OpenGraph, JSON-LD schema, and UserAuthProvider
│   ├── page.tsx                  # Skyscraper landing page
│   ├── robots.txt/sitemap.xml    # Automated SEO crawlers
│
├── components/
│   ├── Experience.tsx            # Three.js canvas mount & UI state synchronizer
│   ├── Hero.tsx                  # Interactive claim form & direct Google payment flow
│   ├── FloorHoverCard.tsx        # 3D raycast hover card with startup preview & owner controls
│   ├── StatChips.tsx             # Real-time live metrics & Manage button
│   ├── ManageFloorModal.tsx      # Google-authenticated multi-product management drawer with Logo Uploader
│   └── BuildingLoader.tsx        # 3D building initialization progress indicator
│
├── lib/
│   ├── auth/                     # 🔐 Direct Google OAuth 2.0 & Session Management
│   │   ├── google.ts             # Direct Google OAuth 2.0 token exchange & userinfo fetch
│   │   ├── session.ts            # Tamper-proof HMAC user session tokens
│   │   └── use-user-auth.tsx     # Client auth provider & user hook
│   ├── crawler/                  # 🕷️ Firecrawl & HTML Favicon/Logo Metadata Scraper
│   │   └── metadata.ts           # Multi-tier website metadata & logo extractor
│   ├── storage/                  # ☁️ Vercel Blob Storage Client
│   │   └── blob.ts               # Direct file upload, external image CDN persistence & deletion
│   ├── db/
│   │   ├── config/               # ⚙️ Infrastructure & Configuration ONLY
│   │   │   ├── client.ts         # Lazy connection pooler compatible with Vercel, Supabase & VPS
│   │   │   ├── schema.ts         # Drizzle schemas (users, floors, claims, floor_locks, site_stats)
│   │   │   ├── pool-config.ts    # Multi-tier connection pooler (:5432 & :6543)
│   │   │   ├── ssl.ts            # Auto-detecting SSL for VPS, Docker & Cloud
│   │   │   └── seed.ts           # 50-floor skyscraper database seeder
│   │   ├── floors.ts             # Skyscraper business logic & queries (pure Drizzle)
│   │   ├── locks.ts              # Floor concurrency locking & auto-expiration engine
│   │   ├── users.ts              # Founder accounts & directory queries (pure Drizzle)
│   │   └── stats.ts              # Real-time live statistics queries (pure Drizzle)
│   ├── three/
│   │   ├── app.ts                # Complete Three.js 3D Skyscraper engine
│   │   └── listings.ts           # Client-side placeholder definitions
│   ├── validation/               # 🛡️ Live domain & SSL security reachability checker
│   ├── admin-auth.ts             # Admin authentication & timing-safe token helpers
│   └── dodo.ts                   # Dodo Payments SDK client & webhook validator
│
├── public/models/                # Optimized GLB 3D models (Pizza Hut, Chopper, Team)
├── drizzle.config.ts             # Drizzle Kit migration configuration
├── Dockerfile                    # Multi-stage standalone production Dockerfile
└── next.config.mjs               # Standalone output, CSP security headers & webhook routing
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` (for local development) or configure in Vercel / VPS:

```bash
cp .env.example .env.local
```

| Variable | Description | Example / Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Vercel Postgres, Supabase, Neon, or VPS) | `postgresql://postgres:postgres@127.0.0.1:5432/outbid` |
| `DATABASE_DIRECT_URL` | Direct port 5432 connection for migrations & seeding | `postgresql://postgres:postgres@127.0.0.1:5432/outbid` |
| `DATABASE_SSL` | Force SSL on/off (`false` for local/Docker, `true` for Cloud) | `false` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Storage token for permanent logo CDN storage | `vercel_blob_rw_...` |
| `FIRECRAWL_API_KEY` | Optional: Firecrawl API key for AI web metadata & favicon scraping | `fc-...` |
| `DODO_PAYMENTS_API_KEY` | Dodo Payments API key (leave empty for mock sandbox mode) | `test_...` |
| `DODO_PAYMENTS_WEBHOOK_SECRET` | Webhook verification secret from Dodo Dashboard | `whsec_...` |
| `DODO_PAYMENTS_ENVIRONMENT` | Gateway environment (`test` or `live`) | `test` |
| `DODO_PAYMENTS_PRODUCT_ID` | Product ID configured in Dodo Dashboard (min. ₹50 or $0.50) | `pdt_...` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID from Google Cloud Console | `your_client_id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret from Google Cloud Console | `GOCSPX-...` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`| Public Google Client ID | `your_client_id.apps.googleusercontent.com` |
| `SESSION_SECRET` | Cryptographic secret for signing user HMAC sessions | `your_random_secret_here` |
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
Ensure PostgreSQL is running locally or provide a connection URL in `.env.local`:
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
  -e GOOGLE_CLIENT_ID="your_google_client_id" \
  -e GOOGLE_CLIENT_SECRET="your_google_client_secret" \
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

### Option C: Deploying to Vercel (Cloud Serverless)

1. **Deploy Repository**: Import your Git repository into [Vercel](https://vercel.com).
2. **Connect Vercel Blob**:
   - In Vercel Project Settings $\rightarrow$ **Storage** $\rightarrow$ **Create Database** $\rightarrow$ select **Blob**.
   - Connect the Blob store to your project (Vercel automatically sets `BLOB_READ_WRITE_TOKEN`).
3. **Connect Database**: Add your PostgreSQL / Neon / Supabase `DATABASE_URL` under **Environment Variables**.
4. **Configure Google OAuth & Dodo Payments**: Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DODO_PAYMENTS_API_KEY`, etc.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/floors` | Fetch the 50 skyscraper floors & active concurrency locks | Public |
| `GET` | `/api/floors/manage` | Fetch claimed floors owned by an authenticated founder | User Session |
| `PATCH` | `/api/floors/manage` | Update claimed startup details (title, URL, tagline, logo) | User Session |
| `DELETE` | `/api/floors/manage` | Vacate/reset a floor back to an available slot | User Session |
| `POST` | `/api/upload` | Upload custom startup logo to Vercel Blob Storage CDN | User Session |
| `GET` | `/api/auth/google/url` | Generate Google OAuth 2.0 authorization URL | Public |
| `GET` | `/api/auth/google/callback` | Exchange Google code for tokens & set user session cookie | Public |
| `GET` | `/api/auth/me` | Fetch active user profile and owned skyscraper floors | User Session |
| `POST` | `/api/auth/logout` | Clear authenticated user session cookie | Public |
| `GET` | `/api/stats` | Retrieve live skyscraper metrics (online, views, countries) | Public |
| `POST` | `/api/stats` | Record tab-session view and heartbeat ping | Public |
| `POST` | `/api/checkout` | Create Dodo Payments checkout session with domain verification | Public / Optional User Session |
| `GET` | `/api/checkout/verify` | Verify payment status and atomically claim top floor | Public |
| `POST` | `/api/checkout/release-lock` | Release active floor concurrency lock on navigation back | Public / User Session |
| `POST` | `/api/webhooks/dodo` | Receive and process payment webhook events | Dodo Signature |
| `POST` | `/api/admin/login` | Authenticate admin against `.env` credentials | Public |
| `POST` | `/api/admin/logout` | Clear admin authentication cookie | Admin Cookie |
| `GET` | `/api/admin/users` | List all registered founders, contacts, and products | Admin Session |

---

## 📄 License

MIT © [Hrithik](https://github.com/Hrithik450)
