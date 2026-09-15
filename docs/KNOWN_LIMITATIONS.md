# Known limitations

Honest limits of the current SHARE prototype. This list is for reviewers, not a roadmap.

## Money

- The prototype **does not hold, custody, or transfer real money**.
- There is **no regulated payment-provider integration** on the live Shared Account path.
- Tracked totals are MongoDB records. They are not bank balances, e-money, or FSCS-protected funds.
- Shared Account **contribution plans** are agreed prototype schedules (weekly / every 2 weeks / monthly). After agreement, SHARE can record **simulated automatic contributions** on due dates. These are ordinary `FinanceRecord` inputs with `source: "automatic"`. They are not bank Direct Debits, Open Banking payments, card charges, or regulated money movement.
- The prototype scheduler is **opt-in and best-effort**. The in-process interval starts only when `ENABLE_PROTOTYPE_AUTOMATIC_CONTRIBUTIONS=true` (never in `NODE_ENV=test` or on Vercel). Railway does not set this flag, so production stays off unless it is added later on purpose. The authenticated non-production process endpoint is independent of the scheduler. Idempotency (`processorKey`) makes repeated checks safe.
- Stripe / PayPal setup documents in `docs/archive/` are historical design notes. They are not live product behaviour.

## Shared Account behaviour

- **Sole-owner final payment:** if the organiser is the only accepted participant, Pay now can complete using the existing PaymentRequest path with `requiredApprovals: 0` and no self-approval. Pending invites do not count as members. One accepted second member restores the normal approval workflow. This is still a prototype ledger record, not a real payout.
- **Create Shared Account fields:** customer create no longer collects Location or Type. Existing Event documents may still store those values and can still render them on the list. New combined creates omit `location` and omit `category`; the Event schema default (`social`) applies internally. No migration.
- Soft-archive is the normal close/delete path. Unarchive / restore is not a customer feature.
- Public tokenised invite links (`/invite/<token>`) are implemented as one-use shareable links. They still do not move money. Used or invalid tokens show a customer-facing “link is no longer valid” state.
- Invitation accept adds membership only. It does not invent a contribution plan or copy the organiser’s frequency. After accept, and on Shared Account detail, a member without an agreed plan can optionally set one up. **Not now** leaves them as a member who can still contribute manually.
- A completed contribution plan cannot be restarted from Shared Account detail. A cancelled plan can be replaced later with a new explicit agreement; previous contributions stay in history. Members can still contribute manually in every plan state.

## Data compatibility

- Recovered and older databases may contain Events without a linked Shared Account, and Shared Accounts without an Event.
- The UI keeps those records reachable. It does not auto-link or rewrite them.
- Internal field names (`tripMoney`, Event collection) remain for compatibility.

## Authentication

- **Password reset** is implemented (hashed tokens, expiry, atomic consume, generic unknown-email responses, JWT invalidation after a successful reset). It is still a prototype flow: production SMTP is not configured in this repository, and the product should not be treated as production-secure authentication merely because these controls exist.
- Browser cache/history hardening (`Cache-Control: no-store` on reset-related API responses, replace-navigation off the used token URL) reduces accidental reuse/exposure. The backend remains the authority for whether a token is valid.
- `developmentResetUrl` is development-only. Production API responses never include the raw token or reset URL.
- Testers should use disposable/test passwords, not passwords reused elsewhere.
- Successful password reset increments per-user `authVersion` and existing JWTs for that user are rejected. Tokens for other users are unaffected. This is not a global revocation list or refresh-token system; JWTs still expire after 7 days.
- Real production email delivery remains a deployment requirement (`EMAIL_USER` / `EMAIL_PASS` / SMTP host). Production without those credentials fails closed for sending mail and still returns the generic forgot-password message.

## Secondary features

- `/gallery`, `/map`, and `/accommodations` redirect to Shared Accounts. The old Photos / Map / Places to stay screens are not in primary navigation.
- Calendar sharing settings may be unavailable if the optional endpoint is not present.
- Email verification is implemented but currently disabled / unmounted.
- Password reset reuses the existing nodemailer helper. Railway/production SMTP is still unconfigured, so public production forgot-password email delivery will not work until those credentials are set as a deployment step.

## Tests

- Frontend tests are Jest + Testing Library and do not require MongoDB.
- Backend tests require a local MongoDB (or `MONGO_URI_TEST`) and use a dedicated test database.
- The backend `.npmrc` sets `omit=dev`, so Jest is not installed unless you run `npm install --include=dev`.
- Running the full backend suite in parallel often hits the WAF rate limiter (429). The reliable Shared Account tests pass when run serially (`npx jest --runInBand …`).
- `backend/tests/user.test.js` and `backend/tests/sharedAccount.test.js` are older files: they expect a `success` field the live user API does not return, and they log in through `/users/login` in a way that does not match the current user model. Treat those failures as pre-existing.
- Some mounted routes (gallery, accommodations, 2FA) have little or no backend coverage.
- The GitHub workflow under `backend/.github` currently continues on lint/test errors; treat a red local run as the source of truth.

## Repository shape

- A legacy API tree remains at the repository root (`controllers/`, `models/`, `routes/`, root `app.js`). The live service is `backend/`.
- `implementation/IMPLEMENTATION_NOTES.md` is a chronological development log. Prefer this file and `docs/ARCHITECTURE.md` for current state.
