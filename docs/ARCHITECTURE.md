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
- **SharedAccount** — target, members, owner, finance records, optional `plannedContributors` (total expected contributors including the creator), per-user `contributionPlans` (frequency, explicit prototype agreement, and prototype automatic-payment state: `status`, `nextContributionDate`, pause/cancel timestamps; not a global Direct Debit), archive flags

Customers see **one Shared Account experience**. Creating a Shared Account from `/events` uses `POST /events/with-trip-money`, which creates both records and links them. Older unlinked Shared Accounts remain reachable from the list and from `/shared-accounts/:id`.

This split is retained for recovered and historical data. Do not collapse the models without a migration plan.

## FinanceRecord

A `FinanceRecord` is a tracked input or output against a user and optionally a Shared Account. Personal Home balance is derived from personal records. Shared Account progress is derived from records on that account.

Manual contributions and **prototype automatic contributions** use the same input rows. Automatic rows set `source: "automatic"`, `scheduledFor` (calendar date), `contributionPlanId`, and a unique `processorKey` (`sharedAccountId:userId:scheduledFor`). Transaction history labels those rows “Automatic contribution”; manual rows stay “Contributed”. These rows are a coordination history, not a bank ledger of custodied funds.

## Prototype automatic payments

`backend/services/automaticContributionService.js` finds due **active** per-user plans on non-archived Shared Accounts, calculates the amount on the server, creates one simulated contribution, advances the next calendar due date, and marks the plan completed when the personal share or account target is covered.

Amount at process time:

`amount = min(persisted plan.scheduledAmount or legacy remaining-days suggestion, remainingPersonal, overallRemaining)`

`scheduledAmount` is stored on the per-user plan when the plan is agreed and when frequency is intentionally changed. Advancing the due date does not recast the agreed instalment. Plans without the field keep the older remaining-days fallback. No production data migration.

Cadence is date-only (no Start time, no UTC midnight parse of `YYYY-MM-DD`): weekly +7 local days, every 2 weeks +14, monthly same calendar day next month (clamped to the last valid day). Pause freezes processing; resume recalculates the next date from the resume date. Cancel stops future automatic rows and keeps history. Archived/closed accounts cancel remaining active/paused plans.

There is no existing cron/worker framework. The in-process 60-second interval (`automaticContributionScheduler`) is **opt-in**: it starts only when `ENABLE_PROTOTYPE_AUTOMATIC_CONTRIBUTIONS=true`, and never when `NODE_ENV=test` or `VERCEL` is set. Railway does not set this flag, so deploying does not process existing plans. An authenticated `POST /api/shared-accounts/automatic-contributions/process` exists only when `NODE_ENV !== 'production'` and processes **the caller’s** due plans (optional body `now: YYYY-MM-DD` for demos). That development processor is independent of the scheduler flag. Repeated checks are safe because of `processorKey` uniqueness.

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
