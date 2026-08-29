# SeeSay 👁 — AI-Powered Voice Sight Assistant

> **Hackathon**: AI for Accessibility & Inclusion  
> **Tagline**: Point a camera. Hear what you see.

SeeSay is a voice-first sight assistant for blind and low-vision users. It lets you point any smartphone camera at a scene, tap one button, and hear a vivid spoken description powered by Claude AI — with no screen required.

---

## ✨ Features

- **Live camera view** with rear-camera preference
- **One-tap scene description** via Claude vision AI
- **Voice Q&A** — ask follow-up questions, hear answers spoken aloud
- **Google OAuth** sign-in, no password needed
- **History** — every exchange stored in Postgres, paginated
- **Accessibility-first**: Atkinson Hyperlegible font, aria-live regions, visible focus rings, `prefers-reduced-motion` support
- **Single deployable service** — Express serves both the REST API and built React frontend

---

## 🖥 Local Setup

### Prerequisites
- Node.js ≥ 18
- Git
- (Optional) PostgreSQL if you want to skip the SQLite fallback

### 1. Clone & install

```bash
git clone <your-repo-url>
cd seesay
npm install   # installs root + client + server
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com/account/keys](https://console.anthropic.com/account/keys) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Same as above |
| `SESSION_SECRET` | Run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `DATABASE_URL` | Leave blank for SQLite, or `postgres://...` for Postgres |
| `APP_URL` | `http://localhost:3001` for local dev |

### 3. Set up Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: **Web application**
4. Authorized redirect URIs: `http://localhost:3001/auth/google/callback`
5. Copy Client ID and Secret to `.env`

### 4. Run the database migration

```bash
npm run db:migrate
```

This creates tables in SQLite (`seesay.db`) locally, or Postgres if `DATABASE_URL` is set.

### 5. Start the app

**Option A — Development (two processes):**
```bash
# Terminal 1 — backend
npm run dev:server

# Terminal 2 — frontend (Vite dev server with proxy)
npm run dev:client
```
Open [http://localhost:5173](http://localhost:5173)

**Option B — Production preview:**
```bash
npm run build    # builds client into client/dist
npm start        # Express serves everything on port 3001
```
Open [http://localhost:3001](http://localhost:3001)

---

## 🌐 Deployment on Render

### Automated (render.yaml)

This repo includes a `render.yaml` file. On [render.com](https://render.com):
1. Connect your GitHub repo
2. Render auto-detects the `render.yaml` and creates:
   - A **Web Service** (Node.js)
   - A **PostgreSQL database** (free tier)
3. Set these environment variables in the Render dashboard:
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `SESSION_SECRET` (Render can auto-generate)
4. After first deploy, run the migration: Render Dashboard → your service → Shell → `npm run db:migrate`

### Manual Settings (if not using render.yaml)

| Setting | Value |
|---|---|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Node version** | 18+ |

**Environment variables to add:**
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `DATABASE_URL` (from Render Postgres → Internal Database URL)
- `APP_URL` = `https://your-slug.onrender.com`
- `NODE_ENV` = `production`

### After deploy

1. Note your Render URL: `https://your-slug.onrender.com`
2. Go back to Google Cloud Console → your OAuth credential
3. Add to **Authorized redirect URIs**: `https://your-slug.onrender.com/auth/google/callback`
4. Save — OAuth will now work in production

---

## 🎬 Demo Script for Judges

1. **Open the landing page** — read the WHO statistics on visual impairment
2. **Sign in with Google** — takes < 5 seconds
3. **Dashboard loads** — see stat cards (start at 0, they update live)
4. **Point camera at a scene** — click **"Describe what I see"** — hear Claude describe it aloud
5. **Click "Ask a question"** — speak "Is there text visible?" — hear the answer
6. **Scroll to History** — see the exchanges logged with timestamps
7. **Sign out** — confirm redirect to landing page

### Accessibility highlights to mention
- Uses **Atkinson Hyperlegible** typeface (Braille Institute designed)
- All interactive elements have **visible focus rings** (Tab through the page)
- **aria-live regions** — screen readers announce new descriptions automatically
- **prefers-reduced-motion** — animations disabled for users who prefer it
- **Large touch targets** (64px+ buttons)
- No screen required to use the core feature

---

## 🏗 Architecture

```
buildtoship/
├── client/          # React + Vite + TypeScript
│   └── src/
│       ├── pages/   Landing.tsx, Dashboard.tsx
│       ├── components/  PhoneMockup, StatusPill, TranscriptPanel, StatCard
│       ├── hooks/   useAuth, useCamera, useSpeech
│       └── api/     typed fetch wrappers
├── server/          # Express + TypeScript
│   └── src/
│       ├── db/      schema.sql, migrate.ts, index.ts (Pg/SQLite adapter)
│       ├── auth/    passport.ts (Google OAuth)
│       ├── middleware/  auth.ts
│       ├── routes/  api.ts (describe, ask, stats, history)
│       └── index.ts entry point
├── render.yaml      # Render IaC
└── .env.example     # Environment template
```

**Data flow for a "Describe" action:**
1. Client captures JPEG frame from `<video>` via canvas
2. POSTs multipart/form-data to `/api/describe`
3. Server calls Claude (`claude-sonnet-5`) with the image + prompt
4. Claude returns description text
5. Server stores it in `queries` table, returns JSON
6. Client speaks the answer via `SpeechSynthesis`

---

## 🔐 Security Notes

- `ANTHROPIC_API_KEY` lives only on the server — never sent to the browser
- Sessions use `httpOnly`, `secure` (in prod), and `sameSite: lax` cookies
- Auth guards on all `/api/*` routes and the `/dashboard` server route
