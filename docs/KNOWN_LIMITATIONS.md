# Known limitations

Honest limits of the current SHARE prototype. This list is for reviewers, not a roadmap.

## Money

- The prototype **does not hold, custody, or transfer real money**.
- There is **no regulated payment-provider integration** on the live Shared Account path.
- Tracked totals are MongoDB records. They are not bank balances, e-money, or FSCS-protected funds.
- Shared Account **contribution plans** are agreed prototype schedules (weekly / every 2 weeks / monthly). They do not create bank Direct Debits, automatic transfers, or automatic FinanceRecords. Future regulated payment integration may execute those amounts.
- Stripe / PayPal setup documents in `docs/archive/` are historical design notes. They are not live product behaviour.

## Shared Account behaviour

- **Sole-account final-payment approval:** a one-member account cannot complete the same multi-member approval path as a group account. The organiser still records activity and can close the account; do not describe this as a fully independent approval workflow.
- Soft-archive is the normal close/delete path. Unarchive / restore is not a customer feature.
- Public tokenised invite links are not implemented. Invites go to registered users.
- Invitation accept does not yet collect a member’s own contribution plan. The data model supports a different frequency per user; invite-time agreement is not implemented so SHARE does not invent consent for another member.

## Data compatibility

- Recovered and older databases may contain Events without a linked Shared Account, and Shared Accounts without an Event.
- The UI keeps those records reachable. It does not auto-link or rewrite them.
- Internal field names (`tripMoney`, Event collection) remain for compatibility.

## Secondary features

- Accommodations search can fall back to demonstration data.
- Calendar sharing settings may be unavailable if the optional endpoint is not present.
- Email verification is implemented but currently disabled / unmounted.

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
