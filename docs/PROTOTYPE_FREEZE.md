# SHARE prototype freeze

**Date:** 16 September 2026  
**Product behaviour baseline:** `f0a5b3b2279e685a4764241253fdf50547fd5130` (`Harden password reset security`)  
**Purpose:** Freeze the current SHARE prototype for demonstration, research, and validation. New feature development is frozen pending validation findings.

This snapshot describes the **product code** at that baseline. Later freeze-documentation edits in this file (and related README/docs wording) do **not** change application behaviour, architecture, or production deployment.

## Customer journey (supported)

Create account → invite another user (email/phone invite and/or shareable one-use `/invite/<token>` link) → member accepts → optional contribution plan → contribute (manual, with contribution limits) → reach target → Pay now → approval if another accepted member exists (sole-owner completes without a second approver) → payment completed (ledger record) → organiser closes/archives the account → read-only history.

Supporting screens: Home dashboard, Shared Accounts list/detail, Notifications, organiser/member role badges, Account activity, prototype Pay with method choices (visual only), sticky/responsive navigation, personal tracking (secondary), password reset.

## Simulated / prototype-only

- SHARE does **not** hold, custody, or transfer real money.
- Tracked totals are MongoDB documents, not bank/e-money/FSCS-protected balances.
- Pay now, approvals, sole-owner completion, and “Pay with” choices record a group decision / UI choice. They do not run card, bank, Apple Pay, Google Pay, PayPal, or wallet payouts.
- Contribution plans and automatic contributions are agreed schedules that can write `FinanceRecord` rows with `source: "automatic"`. They are not Direct Debits or Open Banking payments. The in-process scheduler is opt-in (`ENABLE_PROTOTYPE_AUTOMATIC_CONTRIBUTIONS=true`) and is not enabled on Railway by this freeze.
- Invite links do not move money.

## Known technical limitations

See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) for the working list. Highlights at freeze:

- Production SMTP is not configured; public forgot-password email will not arrive until `EMAIL_USER` / `EMAIL_PASS` (and host) are set as a deployment step. Non-production may return `developmentResetUrl`.
- Password reset is implemented (hashed tokens, expiry, atomic consume, JWT `authVersion` invalidation) but remains a prototype auth flow.
- Email verification is implemented in code but disabled/unmounted.
- `/gallery`, `/map`, `/accommodations` redirect to Shared Accounts.
- Legacy root API tree (`controllers/`, `models/`, `routes/`, root `app.js`) is not the live service; `backend/` is.
- Recovered databases may still contain unlinked Events / Shared Accounts.
- `backend/.env.new` is a tracked localhost template (no production secrets) even though `.gitignore` lists `.env.new`.

## Known test debt

- `backend/tests/user.test.js` and `backend/tests/sharedAccount.test.js` are outdated: they expect a `success` field the live user API does not return, store plaintext passwords then call bcrypt login, and hit WAF register/login rate limits. Treat failures as pre-existing. Do not “green” them by changing live API behaviour.
- Full backend suite should be run serially (`npx jest --runInBand`) against an isolated test Mongo (`MONGO_URI_TEST`), not production.
- Frontend Jest + Testing Library does not need Mongo. Backend Jest is omitted unless `npm install --include=dev`.

## Production / deployment still required (not done by this freeze)

- Real SMTP for password-reset and invite email
- Confirm Railway `MONGO_URI`, `JWT_SECRET`, `REACT_APP_API_URL`, `CORS_ORIGIN` match the intended commit
- Do not enable custodial money movement, cards, FX, or real payouts without a separate approved programme

## Local development vs this demo machine

These two setups are **not** the same thing. The launcher configuration is a local convenience on one machine. It is **not** part of the SHARE application architecture and is **not** how production/Railway is deployed.

### Repository / default development configuration

Documented in the repo README and `.env.example` files:

- Frontend: port **3000** (`cd frontend && npm start`)
- Backend: port **5000** (`cd backend && npm start`)
- MongoDB: `mongodb://localhost:27017/share_project` unless `MONGO_URI` overrides it
- Copy `frontend/.env.example` → `frontend/.env` so `REACT_APP_API_URL=http://localhost:5000/api`. There is no CRA proxy; without that env file the UI defaults to the hosted Railway API.
- Copy `backend/.env.example` → `backend/.env` for `MONGO_URI` and `JWT_SECRET`.
- In-repo Windows helpers `start-servers.bat` / `stop-servers.bat` follow this default (frontend 3000, backend 5000).

### Current demo-machine launcher (local convenience only)

Outside this repository, this machine launches SHARE with **Start SHARE Local** (desktop shortcut). Scripts live at `C:\Users\rabro\SHARE-Local-Launcher` (`Start-SHARE.ps1`, `Stop-SHARE.ps1`). That launcher is not application source and is not a production path.

It currently uses:

- Frontend: **http://localhost:3001** (port 3001 on purpose because 3000 is already in use on this machine)
- Backend: **http://localhost:5000**
- Mongo Docker container name: `share-task15-mongo`
- Host mapping: `127.0.0.1:27018` → container port 27017
- Local demo database name: `share_task15_test`

Do not treat 3001 / 27018 / `share_task15_test` as repository defaults or as Railway/production settings.

## Freeze rule

Do not add product features, payments, invites, contribution, auth, or money-movement behaviour on top of this baseline unless a later validation task explicitly re-opens development.
