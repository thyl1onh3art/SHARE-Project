# SHARE

SHARE is a shared-account prototype. Groups can create an account, invite members, contribute toward a target, approve a final payment, and keep a clear history.

It is not only a travel product. A Shared Account can be used for a hotel deposit, tickets, a birthday, or any other group cost.

**The current prototype records financial activity for testing. It does not hold or transfer real money.**

## Current prototype

What works today:

- **Home** — personal overview and tracked personal balance
- **Shared Accounts** — create an account with a target, invite members, record contributions
- **Notifications** — Shared Account invitations and updates
- **Pay Now / approval** — when the target is reached, request and approve a final payment record
- **Close / archive** — close a Shared Account and keep read-only history
- **Secondary tools** under **More** — calendar, photos, map, friends, personal activity

SHARE records coordination and activity. It does not provide wallets, held balances, cards, FX, or real payouts.

## Shared Account lifecycle

Create Shared Account
→ Invite Members
→ Contribute
→ Reach Target
→ Pay Now
→ Approval
→ Payment Completed
→ Close Shared Account

## Tech stack

Monorepo:

- `frontend/` — React 19, TypeScript, Create React App
- `backend/` — Node.js, Express, MongoDB / Mongoose, JWT
- MongoDB — source of truth for users, events, Shared Accounts, finance records, invitations, and payment requests

The live API is `backend/`. Deploy as two Railway services (`backend` and `frontend`). See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Environment variables

Do not commit secrets. Set these locally or in the host’s variable store.

### Backend (`backend/`)

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `NODE_ENV` | `development`, `production`, or `test` |
| `PORT` | Server port (default `5000`) |
| `CORS_ORIGIN` | Optional frontend origin |

Optional: email (`EMAIL_USER` / `EMAIL_PASS`) and Twilio variables for invite notifications.

Copy `backend/.env.example` to `backend/.env` and fill in local values.

### Frontend (`frontend/`)

| Variable | Purpose |
|---|---|
| `REACT_APP_API_URL` | Backend API base, including `/api` |

Example shape: `http://localhost:5000/api`

## Run locally

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend development server typically runs on port 3000 and proxies API calls to the backend.

Windows helpers `start-servers.bat` and `stop-servers.bat` can start both processes together.

## Tests

### Frontend

```bash
cd frontend
npm test -- --watchAll=false
```

### Backend

The backend `.npmrc` omits devDependencies by default (production installs). For tests:

```bash
cd backend
npm install --include=dev
npm test
```

Backend tests expect a local MongoDB instance (or `MONGO_URI_TEST`). They use a dedicated test database, not production data.

## Prototype limitations

- SHARE does **not** hold, custody, or transfer real money.
- There is no regulated payment-provider integration in the live Shared Account path.
- UI balances are tracked totals, not bank balances.
- Some secondary screens (for example accommodations) still use demonstration data.

See [docs/KNOWN_LIMITATIONS.md](./docs/KNOWN_LIMITATIONS.md) for the current list.

## Repository structure

```
/
  README.md
  frontend/          Customer UI
  backend/           Live API (deploy this)
  docs/              Architecture, deployment, limitations
  implementation/    Product brief and implementation notes
  .gitignore
```

Additional root folders (`controllers/`, `models/`, `routes/`, `app.js`) are a **legacy API tree**. Prefer `backend/` for all new work. Do not assume the root tree is the deployed service.

## Further reading

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — how the system is structured
- [docs/KNOWN_LIMITATIONS.md](./docs/KNOWN_LIMITATIONS.md) — honest current limits
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — Railway setup
- [implementation/IMPLEMENTATION_NOTES.md](./implementation/IMPLEMENTATION_NOTES.md) — development history
- [START_HERE_CURSOR.md](./START_HERE_CURSOR.md) — Cursor implementation brief
- [LEGAL_WARNING_GROUP_PAYMENTS.md](./LEGAL_WARNING_GROUP_PAYMENTS.md) — non-custodial legal guardrail
