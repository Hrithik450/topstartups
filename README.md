# GeTopFloor 🏢🚀

> **The World's Most Interactive 3D Skyscraper Directory & Outbid Platform for Startups.**  
> Outbid your rivals, claim the penthouse floor (#1), and put your company on the global stage.  
> *Backed by [BharatHunt](https://bharathunt.org)*

[![Next.js](https://img.shields.io/badge/Next.js-15.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-blue?style=flat&logo=three.js)](https://threejs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-C5F74F?style=flat&logo=drizzle)](https://orm.drizzle.team/)
[![Auth.js](https://img.shields.io/badge/Auth.js-v5_(Beta)-black?style=flat&logo=auth0)](https://authjs.dev/)
[![Google OAuth 2.0](https://img.shields.io/badge/Auth-Google_OAuth_2.0-4285F4?style=flat&logo=google)](https://developers.google.com/identity/protocols/oauth2)
[![Dodo Payments](https://img.shields.io/badge/Dodo_Payments-Merchant_of_Record-FF5722?style=flat)](https://dodopayments.com/)
[![Zustand](https://img.shields.io/badge/State-Zustand_5-443e38?style=flat)](https://zustand.docs.pmnd.rs/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 Key Features

### 🏢 1. Real-Time 3D Skyscraper Experience
- **Interactive 50-Story Skyscraper**: Built with [Three.js](https://threejs.org/) featuring architectural glass materials, dynamic procedural city skyline, night sky with twinkling starfield, and real-time altitude ruler.
- **Rooftop Observations & 3D Animations**:
  - **Helipad & Chopper**: Hovering helicopter with animated spinning rotor blades.
  - **Rooftop Cafe Pavilion**: Vibrant sRGB-rendered cafe with physics colliders and animated descending passenger.
  - **Penthouse Executive Boardroom**: Modern conference suite featuring the CEO, co-founders, contemporary desks, lounge sofas, and office greenery.
- **Camera & Gesture Controls**: Smooth mouse drag rotation, elevator wheel scroll, touch gestures for mobile devices, and altitude zoom.
- **Dual Lighting Themes**: Switch seamlessly between **Cyber Dark** and **Sunset Light** modes with dynamic Three.js lighting and matching UI styling.
- **Sound & Audio Ambiance**: Custom sound toggle for ambient rooftop and elevator audio feedback.

### 💰 2. Atomic Outbidding & Dynamic Leaderboard Engine
- **Rank 1 Penthouse Claiming**: Founders can claim the top floor by completing checkout and setting a new highest price.
- **Dynamic Leaderboard Sorting**: Floor ranks are computed dynamically (`ORDER BY price_paid DESC, claimed_at ASC`), ensuring real-time positioning without race conditions.
- **Idempotency Safeguard**: Dual-check payment processing (`payment_id` and `checkout_session_id`) guarantees no duplicate rank shifts or charges occur even if webhooks or redirects retry.
- **Clean 50-Floor Boundary**: The tower maintains an active 50-floor layout, gracefully pruning placeholder slots as verified startups claim floors.
- **Standardized Lowercase Domains**: Normalized hostname branding (e.g., `mhrithik.com`, `yashnixai.tech`) ensures clean and consistent typography across the 3D tower and modals.

### 🔐 3. Modern Authentication with Auth.js (NextAuth v5) & Google OAuth
- **Auth.js v5 Beta + Drizzle Adapter**: Deeply integrated with PostgreSQL using `@auth/drizzle-adapter` (`users`, `accounts`, `sessions`, `verificationTokens`).
- **Google Account Selection**: `prompt: "select_account"` configuration for effortless multi-account switching.
- **Automatic Account Linking**: `allowDangerousEmailAccountLinking: true` ensures users claiming floors prior to logging in have their claims seamlessly linked upon Google sign-in.
- **Dynamic Profile Avatars**: Renders the authenticated Google user's profile avatar on the **Manage** button in the header and live chips.
- **Tamper-Proof JWT Sessions**: Secure HTTP-only 30-day session tokens with cryptographic verification.

### 🛡️ 4. Live Domain Verification & Automated Metadata Crawler
- **Strict HTTPS Enforcement**: Rejects insecure `http://` URLs and raw IP addresses.
- **Anti-Spam & Demo Filter**: Blocks placeholder and invalid test domains (`test.com`, `example.com`, `dummy.com`, `localhost`, etc.).
- **Live Reachability Check**: Server-side network and SSL handshake verification tests that submitted URLs are live and secure before checkout.
- **Multi-Tier Website Scraper**:
  - Primary scraper powered by [Firecrawl](https://firecrawl.dev/) for high-precision metadata and favicon extraction.
  - Resilient direct HTML/OpenGraph parser fallback.

### ☁️ 5. Vercel Blob CDN Asset Storage
- **Permanent Asset Pipeline**: Custom startup logos and scraped favicons are automatically stored and served via high-performance [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob) CDN.
- **Direct Logo Uploads**: Verified floor owners can upload custom brand logos directly within the Manage drawer.

### 📊 6. Real-Time Live Statistics Engine
- **Live Online Users**: Computed from active tab heartbeats (`WHERE last_seen_at > NOW() - INTERVAL '2 minutes'`).
- **Tab-Session Views**: Real view tracking based on browser tab sessions (`sessionStorage`), preventing heartbeat pings from inflating view metrics.
- **Distinct Visitor Countries**: `COUNT(DISTINCT country_code)` tracking geographical global reach with auto-detected IP headers (`x-vercel-ip-country`, `cf-ipcountry`).
- **Claimed Floors Counter**: Real-time counter of active startup claims on the tower.

### ⚙️ 7. Dynamic "Manage" Drawer & Owner Controls
- **Owner-Only Hover Controls**: Public visitors see "Visit Website" or "Claim Floor"; verified floor owners see `👑 Edit Floor`.
- **Multi-Product Management**: Dedicated drawer to update company name, website URL, category, tagline, description, custom logo, or vacate floors.
- **0-Products Empty State**: Clear feedback with a 1-click **"Claim Top Floor Now"** call to action when a user has no active floors.

### 📊 8. Protected Admin Portal (`/admin`)
- **Password-Protected Authentication**: Admin login protected by `ADMIN_EMAIL` and `ADMIN_PASSWORD` using timing-safe HMAC validation.
- **Platform Overview**: Live counters for total registered founders, claimed floors, available slots, and total revenue in ₹.
- **Searchable Founder Directory**: Filter founders by name, email, phone number, or company name, complete with product badges showing ranks and prices paid.

### 🌐 9. Comprehensive SEO & Structured Data
- **Structured JSON-LD**: Embedded `Organization`, `WebSite`, `SoftwareApplication`, and `FAQPage` schemas for enhanced search indexing.
- **Dynamic Sitemap & Robots**: Generated at runtime via `app/sitemap.ts` and `app/robots.ts`.
- **Rich Social Previews**: OpenGraph and Twitter cards configured for social sharing.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) | App Router, React 19 Server Components, Server Actions & Route Handlers |
| **Frontend UI** | [React 19](https://react.dev/) + [Lucide React](https://lucide.dev/) | High-performance UI components, icons, and modern React hooks |
| **3D Engine** | [Three.js](https://threejs.org/) (WebGL) | 50-floor procedural building, GLTF models, shaders, and raycast interactions |
| **State Management**| [Zustand 5](https://zustand.docs.pmnd.rs/) | Global state for floors, user profiles, modal states, and client error handling |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) | Type-safe SQL queries, migrations, indexes, and connection poolers |
| **Authentication** | [Auth.js v5](https://authjs.dev/) + Google OAuth 2.0 | NextAuth beta with Drizzle adapter, JWT session cookies, and Google Provider |
| **Payments** | [Dodo Payments](https://dodopayments.com/) | Merchant of Record with UPI, Cards, NetBanking, and cryptographically verified webhooks |
| **Storage & CDN** | [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob) | Permanent logo CDN caching & direct user uploads |
| **Metadata Scraper**| [Firecrawl](https://firecrawl.dev/) + HTML Parser | Automated title, description, and high-res favicon extraction |
| **Validation** | [Zod 4](https://zod.dev/) | Strict runtime input validation for actions, schemas, and API routes |
| **Styling** | Modern CSS Variables | Responsive layout, dark/sunset themes, glassmorphism, and custom animations |

---

## 📂 Project Structure

```
outbid/
├── actions/                      # ⚡ Server Actions & Business Logic
│   ├── auth/                     # Sign-in and sign-out server actions
│   ├── floors/                   # Floors service, model, and server actions
│   ├── stats/                    # Real-time statistics service and model
│   └── user/                     # User profile, owned floors, and session service
│
├── app/                          # 🌐 Next.js App Router
│   ├── admin/                    # 📊 Protected Admin Dashboard (/admin)
│   ├── api/                      # ⚡ REST API Endpoints
│   │   ├── admin/                # Admin login, logout, and founder queries
│   │   ├── auth/[...nextauth]/   # Auth.js / NextAuth v5 handler
│   │   ├── checkout/             # Dodo payment session creation, verify & mock-success
│   │   ├── stats/                # Real-time live statistics ping & session metrics
│   │   ├── upload/               # ☁️ Vercel Blob Storage logo upload endpoint
│   │   ├── validate-url/         # Live website URL & SSL security reachability checker
│   │   └── webhooks/dodo/        # Cryptographically verified Dodo webhook handler
│   ├── privacy/                  # Privacy policy page
│   ├── rules/                    # Skyscraper outbidding rules page
│   ├── terms/                    # Terms of service page
│   ├── globals.css               # Global theme styling (Dark & Sunset themes)
│   ├── layout-wrapper.tsx        # Client layout wrapper with user & stat stores
│   ├── layout.tsx                # Metadata, OpenGraph, JSON-LD schema, and font configs
│   ├── page.tsx                  # 3D Skyscraper landing page
│   ├── robots.ts                 # Dynamic robots.txt
│   └── sitemap.ts                # Dynamic sitemap.xml
│
├── components/                   # 🧩 Client & UI Components
│   ├── alerts/                   # Success and failure alert toast banners
│   ├── building-loader.tsx       # 3D building initialization progress indicator
│   ├── controls.tsx              # Three.js camera controls & theme toggles
│   ├── floor-hover-card.tsx      # 3D raycast hover card with startup preview & owner controls
│   ├── hero.tsx                  # Interactive claim form & direct payment flow
│   ├── icons.tsx                 # Brand and UI icon definitions
│   ├── main.tsx                  # Main client shell with header and sound controls
│   ├── manage-floor-modal.tsx    # Multi-product management drawer with Logo Uploader
│   ├── stat-chips.tsx            # Real-time live metrics & Manage button
│   └── tower-scene.tsx           # Dynamic Three.js canvas mount
│
├── lib/                          # 🛠️ Shared Libraries & Utilities
│   ├── auth/                     # Auth.js / NextAuth configuration with Google Provider
│   ├── crawler/                  # Firecrawl & HTML Favicon/Logo Metadata Scraper
│   ├── db/
│   │   └── config/               # PostgreSQL Connection Pool & Drizzle Schema
│   │       ├── client.ts         # Resilient connection pooler (with pool.on('error') safety)
│   │       ├── pool-config.ts    # Multi-tier connection pooler (:5432 & :6543)
│   │       ├── schema.ts         # Drizzle schemas (users, accounts, sessions, floors, claims, stats)
│   │       └── ssl.ts            # Auto-detecting SSL for VPS, Docker & Cloud
│   ├── drizzle/                  # Drizzle migration files and metadata snapshots
│   ├── storage/                  # Vercel Blob Storage client & image persistence
│   ├── three/                    # Complete Three.js 3D Skyscraper engine & models
│   ├── validation/               # Live domain & SSL security reachability checker
│   ├── admin-auth.ts             # Admin authentication & timing-safe token helpers
│   ├── categories.ts             # Startup category definitions
│   └── dodo.ts                   # Dodo Payments SDK client & webhook validator
│
├── store/                        # 🐻 Zustand State Stores
│   ├── error-store.ts            # Global error banner state
│   ├── floors-store.ts           # Skyscraper floors & active selection state
│   └── user-store.ts             # Authenticated user & owned floors state
│
├── scripts/                      # 📜 Database Management & Utility Scripts
│   ├── drop-legacy-columns.ts    # Clean up legacy database columns safely
│   ├── export-snapshot.ts        # Export database schema and table rows snapshot
│   └── migrate-safe.ts           # Safe schema migration runner
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
| `DATABASE_DIRECT_URL` | Direct connection (port 5432) for migrations & Drizzle Kit | `postgresql://postgres:postgres@127.0.0.1:5432/outbid` |
| `DATABASE_SSL` | Force SSL on/off (`false` for local/Docker, `true` for Cloud) | `false` |
| `AUTH_SECRET` / `SESSION_SECRET`| Secret key for signing Auth.js / NextAuth JWT sessions (`openssl rand -base64 32`) | `your_32_character_random_hmac_secret` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID from Google Cloud Console | `your_client_id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret from Google Cloud Console | `GOCSPX-xxxxxxxxxxxxxxxx` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Public Google Client ID | `your_client_id.apps.googleusercontent.com` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Storage token for permanent logo CDN storage | `vercel_blob_rw_...` |
| `BLOB_STORE_ID` | Vercel Blob Store unique identifier | `store_...` |
| `BLOB_WEBHOOK_PUBLIC_KEY` | Public key for verifying Vercel Blob upload event signatures | `...` |
| `FIRECRAWL_API_KEY` | Optional: Firecrawl API key for automated website metadata & favicon scraping | `fc-...` |
| `DODO_PAYMENTS_API_KEY` | Dodo Payments API key (leave empty for mock sandbox mode) | `test_...` |
| `DODO_PAYMENTS_WEBHOOK_SECRET` | Webhook verification secret from Dodo Payments Dashboard | `whsec_...` |
| `DODO_PAYMENTS_ENVIRONMENT` | Gateway environment (`test` or `live`) | `test` |
| `DODO_PAYMENTS_PRODUCT_ID` | Product ID configured in Dodo Dashboard (min. ₹50 or $0.50) | `pdt_...` |
| `ADMIN_EMAIL` | Admin portal login email address | `admin@getopfloor.com` |
| `ADMIN_PASSWORD` | Admin portal login password | `your_secure_admin_password` |
| `PORT` | Node.js web server port | `3000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **pnpm**: `v9.x` or higher
- **PostgreSQL**: Local PostgreSQL instance, Supabase, Neon, or Docker container

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Database Setup & Push Schema
Configure `.env.local` with your PostgreSQL database URL, then push the schema:
```bash
# Push Drizzle schema to database
pnpm run db:push

# (Optional) Open Drizzle Studio to inspect tables
pnpm run db:studio
```

### 4. Run Development Server
```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the 3D Skyscraper.  
Open [http://localhost:3000/admin](http://localhost:3000/admin) to access the Admin Portal.

---

## 📦 Production Build & Scripts

| Command | Description |
|---|---|
| `pnpm run dev` | Start Next.js development server with Hot Module Replacement |
| `pnpm run build` | Compile optimized Next.js 15 production build |
| `pnpm start` | Start production server |
| `pnpm run lint` | Run ESLint across the codebase |
| `pnpm run db:push` | Push Drizzle ORM schema changes directly to PostgreSQL |
| `pnpm run db:studio` | Launch Drizzle Studio web GUI for database inspection |
| `pnpm run db:snapshot`| Run script to inspect and snapshot current tables and columns |

---

## 🖥️ VPS & Self-Hosted Deployment

GeTopFloor is fully optimized for **self-hosted VPS deployment** (Ubuntu/Debian, Docker, PM2, Dokku, Coolify, CapRover) as well as cloud serverless platforms.

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
  -e AUTH_SECRET="your_random_secret_here" \
  -e GOOGLE_CLIENT_ID="your_google_client_id" \
  -e GOOGLE_CLIENT_SECRET="your_google_client_secret" \
  -e ADMIN_EMAIL="admin@getopfloor.com" \
  -e ADMIN_PASSWORD="your_admin_password" \
  getopfloor:latest
```

### Option B: Using Node.js & PM2 on VPS

```bash
# 1. Build production standalone bundle
pnpm run build

# 2. Start process manager
pm2 start pnpm --name "getopfloor" -- start
```

### Option C: Deploying to Vercel (Cloud Serverless)

1. **Deploy Repository**: Import your Git repository into [Vercel](https://vercel.com).
2. **Connect Vercel Blob**:
   - In Vercel Project Settings $\rightarrow$ **Storage** $\rightarrow$ **Create Database** $\rightarrow$ select **Blob**.
   - Connect the Blob store to your project (Vercel automatically sets `BLOB_READ_WRITE_TOKEN`).
3. **Connect Database**: Add your PostgreSQL / Neon / Supabase `DATABASE_URL` under **Environment Variables**.
4. **Configure OAuth & Payments**: Add `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DODO_PAYMENTS_API_KEY`, etc.

---

## 📡 REST API & Server Actions Reference

### REST Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/upload` | Upload custom startup logo to Vercel Blob Storage CDN | User Session |
| `GET` | `/api/validate-url?url=...` | Verify website reachability and SSL security handshake | Public |
| `GET` | `/api/stats` | Retrieve live skyscraper metrics (online, views, countries) | Public |
| `POST` | `/api/checkout` | Create Dodo Payments checkout session with domain validation | Public / User Session |
| `GET` | `/api/checkout/verify` | Verify payment status and dynamically register floor claim | Public |
| `POST` | `/api/checkout/mock-success` | Mock sandbox payment success verification (dev only) | Public |
| `POST` | `/api/webhooks/dodo` | Receive and process cryptographically verified payment webhooks | Dodo Signature |
| `POST` | `/api/admin/login` | Authenticate admin against `.env` credentials | Public |
| `POST` | `/api/admin/logout` | Clear admin authentication cookie | Admin Cookie |
| `GET` | `/api/admin/users` | List all registered founders, contacts, and products | Admin Session |

### Key Server Actions (`actions/`)

- **`FloorsService.getFloors()`**: Fetch all active skyscraper floors sorted by leaderboard rank.
- **`FloorsService.updateFloor(input)`**: Update company name, URL, tagline, description, category, or logo for an owned floor.
- **`FloorsService.vacateFloor(floorId)`**: Vacate or release a floor back to available status.
- **`UserService.getCurrentUser()`**: Fetch authenticated user profile, avatar URL, and owned floors list.
- **`StatsService.getStats()`**: Fetch live platform statistics (online count, total views, visitor countries).

---

## 📄 License

MIT © [Hrithik](https://github.com/Hrithik450)
