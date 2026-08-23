# SHARE architecture

Short technical overview of the live prototype. The deployed API lives in `backend/`. The customer UI lives in `frontend/`.

## Frontend

React 19 + TypeScript (Create React App). Axios talks to `/api` (via `REACT_APP_API_URL` in production).

Primary routes:

| Route | Screen |
|---|---|
| `/` | Home — personal overview |
| `/events` | Shared Accounts list and create flow |
| `/events/:eventId` | Redirect shim to the linked Shared Account |
| `/shared-accounts` | Legacy / setup list (deep links, archived pots, create-from-event) |
| `/shared-accounts/:accountId` | Shared Account detail |
| `/invitations` | Notifications |
| `/login`, `/register` | Authentication |

Secondary screens (Calendar, Photos, Map, Friends, personal activity) sit under **More**.

## Backend

Express app: `backend/app.js`. JWT auth in `backend/middleware/auth.js`. MongoDB via Mongoose.

Mounted APIs include:

- `/api/users`
- `/api/events`
- `/api/shared-accounts`
- `/api/finance`
- `/api/invites`
- `/api/payment-requests`
- `/api/friends`
- `/api/gallery`
- `/api/accommodations`
- `/api/recommendations`
- `/api/two-factor`

## MongoDB

Collections used by the live product include `users`, `events`, `sharedaccounts`, `financerecords`, `invites`, `paymentrequests`, plus gallery and 2FA collections.

There is no separate money-movement store. Recorded amounts are documents, not held funds.

## Authentication

Users register and log in. The API issues a JWT. The frontend stores the token and sends `Authorization: Bearer`. Protected React routes use `ProtectedRoute`.

Email verification exists in code but is currently unmounted / disabled. Two-factor routes are mounted.

## Event + SharedAccount

Internally SHARE still has two models:

- **Event** — date, location, type, optional link to a Shared Account (`tripMoney`)
- **SharedAccount** — target, members, owner, finance records, archive flags

Customers see **one Shared Account experience**. Creating a Shared Account from `/events` uses `POST /events/with-trip-money`, which creates both records and links them. Older unlinked Shared Accounts remain reachable from the list and from `/shared-accounts/:id`.

This split is retained for recovered and historical data. Do not collapse the models without a migration plan.

## FinanceRecord

A `FinanceRecord` is a tracked input or output against a user and optionally a Shared Account. Personal Home balance is derived from personal records. Shared Account progress is derived from records on that account.

These rows are a coordination history, not a bank ledger of custodied funds.

## PaymentRequest lifecycle

When a Shared Account target is reached, a member can start **Pay Now**. That creates a `PaymentRequest`. Other members approve. On sufficient approval the API records a completed payment (`FinanceRecord` output) and the account can be closed.

This records the group decision. It does not execute a card, bank, or wallet payout.

## Soft archive

Closing or deleting a Shared Account (for a sole owner) typically **soft-archives** it (`isDeleted`). History remains readable. Permanent delete is a separate, guarded path. Archived accounts stay available from the Shared Accounts archived list and from direct URLs.

## Legacy compatibility

Keep support for:

- unlinked Shared Accounts recovered from earlier data
- archived historical accounts
- `/shared-accounts/:id` deep links
- the Event ↔ SharedAccount relationship
- invitation and authentication flows

The root-level `app.js` / `controllers/` / `models/` tree is an older copy of the API. New work should use `backend/`.
