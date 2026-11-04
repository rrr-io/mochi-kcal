# Mochi Kcal 🌸

A personal, kawaii, pastel calorie-tracking PWA. React + Vite on the frontend, Fastify + SQLite on the backend, on rio-server behind Caddy.

## What it does

- **Today**: ring with the kcal left, macros, water in 150 ml glasses, the week, meals.
- **Add**: natural-language search with AI (Gemini, free tier), **barcode** (Open Food Facts), **photo** of the plate with a per-food breakdown or of the label, saved foods, quick add.
- **Weight**: weigh-ins with a chart, a plan using Mifflin-St Jeor and a goal date, with safety limits (minimum 1200/1500 kcal, a warning above ~1% of body weight per week, no number below BMI 18.5).
- **Water reminders** via push, every hour from 7 to 20, only if the goal is not reached yet, with "Drank +150 ml" right in the notification.
- Offline: the app opens without a network and shows the last data it read.

## Structure

```
backend/   Fastify + SQLite built into Node 22 (TypeScript)
  src/routes/data.ts     days, foods, weight, profile, water
  src/routes/ai.ts       search, label, plate (Gemini API, free tier)
  src/routes/barcode.ts  Open Food Facts proxy with cache
  src/routes/push.ts     VAPID web push + water reminders
frontend/  React + Vite + vite-plugin-pwa (service worker in src/sw.ts)
deploy/    server docker-compose and the Caddyfile block
```

The backend uses `node:sqlite`, so it has no native modules: in CI it becomes a single `app.mjs` file that runs the same on the server's arm64, with the stock `node:22-alpine` image and a 160 MB limit.

## Deploy

Pushing to `main` builds, tests and deploys to `mochi.rrriooo.com`, the same way as my-race-engineer:

1. **frontend** job: `npm ci`, `npm test`, `npm run build` → `dist` artifact
2. **backend** job: `npm ci`, `npm test`, bundle → `app.mjs` artifact
3. **deploy** job: writes `.env` from the secrets, copies `app.mjs`, `docker-compose.yml` and `.env` to `/opt/mochi-kcal/`, recreates the `mochi-backend` container on the `web` network, then `rsync`s the frontend to `/srv/mochi-kcal/`

A red test stops the release. The **Tests** workflow runs the same tests on pull requests and on demand.

### GitHub secrets

| Secret | What |
|---|---|
| `SSH_HOST`, `SSH_USER`, `SSH_KEY` | the same as in the other repos |
| `APP_PASSWORD` | the password to sign in to the app |
| `COOKIE_SECRET` | a random string: `openssl rand -hex 32` |
| `GEMINI_API_KEY` | from Google AI Studio, for search, labels and plate photos |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | from `npx web-push generate-vapid-keys` |

Without a Gemini key the app still works: search and photos answer with a clear message. Without VAPID keys push stays off.

### AI with Gemini

Search by name uses `gemini-3.5-flash-lite`, labels and plate photos use `gemini-3.8-flash`: both have a free tier with daily limits. If Google renames them, add `MODEL_QUICK` / `MODEL_VISION` to the container environment. When the daily limit is reached the app says so, and barcode, Saved and Quick still work.

On the free tier Google may use the content sent (texts and meal photos) to improve its products.

### Once on the server

```bash
sudo mkdir -p /opt/mochi-kcal /srv/mochi-kcal && sudo chown ubuntu: /opt/mochi-kcal /srv/mochi-kcal
```

Then add `deploy/Caddyfile.snippet` to `/srv/caddy/Caddyfile` and reload: `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`. The `mochi.rrriooo.com` DNS record must point to the server.

## Local development

```bash
cd backend && npm install
APP_PASSWORD=test COOKIE_SECRET=$(openssl rand -hex 32) GEMINI_API_KEY=... npm run dev
# in another terminal
cd frontend && npm install && npm run dev   # /api is proxied to :3000
```

Tests: `npm test` in `backend/` and in `frontend/`.

## On the phone

Open `https://mochi.rrriooo.com` in Safari → Share → **Add to Home Screen**. From the installed app tap the target at the top right → **Water reminders → Turn on**. On iPhone, push only works from the app added to the Home Screen (iOS 16.4+).

## Backup

The data lives in the `mochi-data` Docker volume (`/data/mochi.db` in the container):

```bash
docker cp mochi-backend:/data/. ~/mochi-backup-$(date +%F)/
```
