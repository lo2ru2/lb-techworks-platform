# LB-Techworks Platform

Aplikacion full-stack e-commerce i ndërtuar si projekt grupi për lëndën **Lab Course 2** (UBT, viti akademik 2025/2026).

**Stack:** Node.js + NestJS · React + Vite · PostgreSQL (Prisma) · MongoDB · Redis · Socket.IO · Stripe

---

## Ekipi

| Anëtari | Emri | Përgjegjësia | GitHub |
|---------|------|--------------|--------|
| Anëtari 1 | Loren | Autentifikim & Databaza (JWT, Google OAuth, RBAC, Prisma, Users) | [@lo2ru2](https://github.com/lo2ru2) |
| Anëtari 2 | Blend | Produkte & Analitika (kërkim i avancuar, import/eksport, MongoDB analytics) | [@B13ndi](https://github.com/B13ndi) |
| Anëtari 3 | Denis | Porosi & Real-Time (checkout, Stripe, Socket.IO, njoftime, raporte) | [@Denis](https://github.com/Denis) |
| Anëtari 4 | Haris | Frontend & Panel Admin (9 faqe admin, layout, faqet publike) | [@Harisi20](https://github.com/Harisi20) |

**Profesori:** elton.boshnjaku@ubt-uni.net
**Menaxhimi i projektit:** [Trello Board](https://trello.com/b/JHEdVnAO/lb-techworks-platform)
**Repository:** https://github.com/lo2ru2/lb-techworks-platform

---

## Përmbajtja

- [Përshkrimi](#përshkrimi)
- [Stack teknologjik](#stack-teknologjik)
- [Kërkesat e sistemit](#kërkesat-e-sistemit)
- [Instalimi dhe konfigurimi](#instalimi-dhe-konfigurimi)
- [Struktura e projektit](#struktura-e-projektit)
- [Features kryesore](#features-kryesore)
- [Roli dhe lejet (RBAC)](#roli-dhe-lejet-rbac)
- [Kredencialet e parazgjedhura](#kredencialet-e-parazgjedhura)
- [Dokumentimi shtesë](#dokumentimi-shtesë)

---

## Përshkrimi

LB-Techworks Platform është një dyqan online (e-commerce) i plotë me:

- **Pjesë publike** — katalog produktesh, kërkim & filtra, shportë (edhe për vizitorë të palogaruar përmes `localStorage`), checkout me Stripe, llogari përdoruesi me historik porosish, chat live mbështetjeje.
- **Panel Admini** — menaxhim i plotë: produkte, kategori, stoqe, klientë, porosi, përdorues/role, raporte dinamike me eksport (CSV/Excel/JSON), chat mbështetjeje live.
- **Real-Time** — njoftime dhe chat mbështetjeje përmes Socket.IO (WebSocket).
- **Autentifikim** — regjistrim/login me email & fjalëkalim, Google OAuth 2.0, JWT (access + refresh token), RBAC me role dhe leje të personalizueshme.

---

## Stack teknologjik

| Shtresa | Teknologji |
|---------|-----------|
| Backend | Node.js 20 + NestJS 11 (TypeScript) |
| ORM / DB | Prisma 6 → PostgreSQL 16 |
| NoSQL | MongoDB 7 (Mongoose) — analitika: shikime produktesh, kërkime |
| Cache / Rate-limit | Redis 7 (ioredis) |
| Real-Time | Socket.IO 4 (WebSocket Gateway) |
| Pagesa | Stripe (Checkout, PaymentIntent, Webhook) |
| Auth | JWT (access 15 min + refresh 7 ditë) + Google OAuth 2.0 (Passport) |
| Frontend | React 19 + Vite 6 + React Router v7 |
| State management | Zustand |
| Stilizim | Bootstrap 5.3 + CSS i personalizuar |
| Dokumentim API | Swagger / OpenAPI (`/docs`) |
| Orkestrim | Docker Compose (PostgreSQL, Redis, MongoDB) |

---

## Kërkesat e sistemit

| Mjet | Versioni minimal |
|------|-----------------|
| Node.js | 20 LTS |
| npm | 9+ |
| PostgreSQL | 16+ |
| Redis | 7+ |
| MongoDB | 7+ |
| Docker (rekomandohet) | 24+ |

---

## Instalimi dhe konfigurimi

### 1. Klono repository-n

```bash
git clone https://github.com/lo2ru2/lb-techworks-platform.git
cd lb-techworks-platform
```

### 2. Instalo varësitë (monorepo — npm workspaces)

```bash
npm install
```

### 3. Nis infrastrukturën me Docker (PostgreSQL + Redis + MongoDB)

```bash
docker-compose up -d
```

### 4. Konfiguro variablat e mjedisit

Krijo `backend/.env` me përmbajtjen:

```env
BACKEND_PORT=3001
BACKEND_CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
API_PUBLIC_URL=http://localhost:3001

# Databaza PostgreSQL
DATABASE_URL=postgresql://lbtechworks:lbtechworks@localhost:5432/lbtechworks?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# MongoDB (analitika)
MONGODB_URI=mongodb://lbtechworks:lbtechworks@localhost:27017/lbtechworks_analytics?authSource=admin

# JWT — ndrysho në prodhim me sekrete të forta!
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=604800

# Google OAuth — krijo kredenciale në console.cloud.google.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Stripe (opsional — testim pagesash)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=

# Shtegu i imazheve legacy (opsional)
LEGACY_ASSETS_ROOT=
```

### 5. Apliko migrimet e databazës

```bash
cd backend
npx prisma migrate deploy
```

### 6. Popullo databazën me të dhëna fillestare (seed)

```bash
npm run seed
```

Seed-i krijon:
- Rolet: `ADMIN`, `MANAGER`, `USER`
- Lejet e aksesit (permissions) për RBAC
- Përdoruesin admin: `admin@lbtechworks.local` / `Admin123!`
- Konfigurimet globale të sistemit (Settings)
- Katalogun fillestar të produkteve

### 7. Nis aplikacionin (backend + frontend njëherësh)

```bash
cd ..      # kthehu te rrënja e monorepo-s
npm run dev
```

| Shërbimi | URL |
|----------|-----|
| Frontend (dyqani) | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Swagger / OpenAPI | http://localhost:3001/docs |
| Panel Admini | http://localhost:5173/admin/login |

---

## Struktura e projektit

```
lb-techworks-platform/
├── backend/
│   └── src/
│       ├── modules/
│       │   ├── auth/          # JWT, Google OAuth, RBAC guards
│       │   ├── users/         # Profili, role, leje
│       │   ├── products/      # CRUD, import/eksport, kërkim i avancuar
│       │   ├── categories/    # Kategori produktesh
│       │   ├── carts/         # Shportë (sesion + DB sync)
│       │   ├── orders/        # Checkout, Stripe, statuse
│       │   ├── customers/     # Menaxhim klientësh
│       │   ├── analytics/     # MongoDB — shikime & kërkime
│       │   ├── reports/       # Raporte dinamike + eksport
│       │   ├── notifications/ # WebSocket Gateway + Support Chat
│       │   └── prisma/        # Prisma service & schema
│       └── common/
│           ├── cache/         # Redis service
│           ├── export/        # CSV / JSON / Excel
│           └── rate-limit/    # Redis token-bucket
├── frontend/
│   └── src/ui/
│       ├── store/             # Zustand: authStore, NotificationContext
│       ├── admin/             # 9 faqe admin (porosi, produkte, raporte, ...)
│       ├── auth/              # Forma login/regjistrim/Google OAuth
│       ├── pages/             # Faqet publike (ballina, shop, checkout, llogaria)
│       ├── layout/            # Layout, shportë, navigim
│       └── components/        # SupportChatWidget, NotificationHost
├── docs/                      # ERD, Postman collection, dokumentim shtesë
├── infra/                     # Volumes Docker (postgres/redis/mongo data)
└── docker-compose.yml
```

Çdo modul backend ndjek shtresëzimin **Controller → Service → Repository**, ndërsa databaza menaxhohet me **Prisma** (PostgreSQL) dhe **Mongoose** (MongoDB për analitika).

---

## Features kryesore

| # | Feature | Përshkrim |
|---|---------|-----------|
| 1 | **Autentifikim & RBAC** | JWT (access + refresh), Google OAuth 2.0, role dhe leje të personalizueshme |
| 2 | **Pagesa Online** | Stripe Checkout, PaymentIntent, Webhook konfirmimi |
| 3 | **Shportë e qëndrueshme** | Sinkronizim me DB për përdorues të loguar + `localStorage` për vizitorë |
| 4 | **Kërkim i avancuar** | Full-text, filtra (kategori, çmim, stok), renditje |
| 5 | **Eksport/Import të dhënash** | CSV · Excel · JSON për produkte, porosi, klientë, raporte |
| 6 | **Raporte dinamike** | Filtra datash/statusi, cache me Redis, eksport |
| 7 | **Real-Time** | Njoftime live & chat mbështetjeje me Socket.IO |
| 8 | **Analitika** | Gjurmim shikimesh produktesh & kërkimesh në MongoDB |
| 9 | **Panel Admini i plotë** | 9 module: porosi, produkte, kategori, stoqe, klientë, përdorues, raporte, mbështetje |

---

## Roli dhe lejet (RBAC)

| Rol | Përshkrimi |
|-----|-----------|
| `ADMIN` | Akses i plotë në panelin e administrimit dhe të gjitha modulet |
| `MANAGER` | Akses i kufizuar sipas lejeve të caktuara (produkte, porosi, raporte) |
| `USER` | Klient i regjistruar — llogari, shportë, historik porosish |

Lejet (permissions) ruhen në databazë dhe verifikohen përmes `PermissionGuard` në backend.

---

## Kredencialet e parazgjedhura (vetëm zhvillim)

| Roli | Email | Fjalëkalimi |
|------|-------|------------|
| Admin | `admin@lbtechworks.local` | `Admin123!` |

> **Shënim sigurie:** Këto kredenciale dhe sekretet `.env` janë vetëm për zhvillim/testim lokal — ndrysho gjithçka para çdo deployment-i publik.

---

## Dokumentimi shtesë

- [Diagrami ERD](docs/erd.mmd) — struktura e databazës
- [Postman Collection](docs/postman-collection.json) — importo dhe vendos `baseUrl = http://localhost:3001`
- [Project Management](docs/PROJECT_MANAGEMENT.md) — plani i punës ditë-për-ditë
- [Trello Board](https://trello.com/b/JHEdVnAO/lb-techworks-platform) — gjurmimi i task-eve të ekipit
- [Swagger UI](http://localhost:3001/docs) — disponueshme kur backend-i është aktiv

---

## Ndërtimi për prodhim (Production Build)

```bash
# Backend
npm run build --workspace lb-techworks-backend

# Frontend
npm run build --workspace lb-techworks-frontend
```

Rezultati i frontend-it gjenerohet në `frontend/dist/` (skedarë statikë, gati për shërbim nga çdo web server).

---

*Projekt akademik — Lab Course 2, UBT, viti akademik 2025/2026.*