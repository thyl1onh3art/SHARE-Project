# SHARE deployment notes

Concise Railway deployment guidance for the current monorepo.
Does **not** include secrets, credentials, or session-specific incident notes.

## Services

| Service | Railway Root Directory | Start |
|---------|------------------------|--------|
| Backend API | `backend` | `node app.js` (see `backend/railway.json`) |
| Frontend | `frontend` | `npx serve -s build -l $PORT` (see `frontend/railway.json`) |

Set each service’s **Root Directory** in Railway service settings. Deploying from the repo root without a root directory usually fails for this monorepo.

## Environment variables

### Backend (Railway Variables)

Required:

- `MONGO_URI` — MongoDB connection string (set only in Railway; never commit)
- `JWT_SECRET` — long random secret (set only in Railway; never commit)
- `NODE_ENV=production`
- `PORT` — usually provided by Railway

Optional:

- `CORS_ORIGIN` — frontend origin
- `EMAIL_USER` / `EMAIL_PASS` — invite email notifications
- Twilio vars — SMS invite / 2FA if used

### Frontend

- `REACT_APP_API_URL` — backend API base including `/api`
  Example shape: `https://<your-backend>.up.railway.app/api`

## Verify a deploy

1. Backend health: `GET /health` should return HTTP 200.
2. Confirm the Railway deployment matches the intended Git commit.
3. Open the frontend, log in, and smoke-check:
   - `/` opens Home
   - `/events` opens Shared Accounts
   - Notifications load
   - API calls hit the Railway backend (network tab)

## Product constraint (prototype)

SHARE records financial activity for testing. It does **not** hold pooled customer money or execute real bank/card payouts. Do not configure or advertise live payment-provider settlement as if it were live product behaviour unless the codebase and compliance posture actually support it.

## What this doc deliberately omits

Obsolete troubleshooting dumps (builder cache incidents, one-off navbar cache issues, interactive rebase notes, temporary diagnostics). Those files now live under `docs/archive/`. Prefer `implementation/IMPLEMENTATION_NOTES.md` for product/integration history.
