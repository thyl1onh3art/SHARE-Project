# SHARE implementation notes

This file is a chronological development log. It is not the current product brief.

**Current customer product (Task 10+):** Shared Accounts, not trip-only. Navigation is Shared Accounts · Notifications · More. Home is `/`. The live API is `backend/`.

**Read first:**
- [README.md](../README.md) — what SHARE is
- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) — technical structure
- [docs/KNOWN_LIMITATIONS.md](../docs/KNOWN_LIMITATIONS.md) — honest limits

The Phase 0 snapshot below is historical. Later sections record subsequent work.

---

# Historical log (from Phase 0)

**Phase:** 0 complete (baseline / no product reframe yet)
**Date:** 2026-08-20
**Scope followed:** Inspect docs + live code; classify KEEP/CHANGE/HIDE/BUILD LATER; record virtual vs provider-backed actions; baseline tests. **No financial UI wording changes in Phase 0.**

---

## 1. What was inspected

### Pack / rules
- `START_HERE_CURSOR.md`
- `.cursor/rules/share-product-marketing-alignment.mdc`
- All files under `implementation/` (`MASTER_IMPLEMENTATION_PLAN.md`, `TASKS.md`, `COPY_AND_TERMINOLOGY.md`, `SAFE_CHANGE_BOUNDARIES.md`, `PROJECT_PATH_MAP.md`, `FEATURE_CLASSIFICATION.json`, `ACCEPTANCE_CRITERIA.md`, `CURSOR_EXECUTION_PROMPT.md`)

### Product / legal docs (repo root)
- `GROUP_PAYMENT_IMPLEMENTATION.md` â€” describes a **virtual commitment** model; PayPal used only as merchant payment path; SHARE must not hold money
- `LEGAL_WARNING_GROUP_PAYMENTS.md` â€” warns that custodial pooled wallets need licensing; recommends virtual tracking + provider facilitation
- Root `README.md` â€” presents SHARE as **social event planning + financial management** (not trip-first)
- `SECURITY.md` (present; not modified)

### Live backend (used by app under `backend/`)
- Models: `SharedAccount.js`, `FinanceRecord.js`, `PaymentRequest.js`
- Controllers: `sharedAccountController.js`, `financeController.js`, `paymentRequestController.js`
- Routes: `sharedAccountRoutes.js`, `financeRoutes.js`, `paymentRequestRoutes.js`
- Mounting in `backend/app.js`: `/api/shared-accounts`, `/api/finance`, `/api/payment-requests` (no `/api/group-payments` mounted)
- Access helper: `backend/utils/sharedAccountAccess.js`

### Live frontend
- `frontend/src/App.tsx` â€” authenticated default `/` â†’ `/financial-records`
- `frontend/src/components/Navbar.tsx` â€” Finance, Shared Accounts, Messages, Friends, Events, Calendar, Gallery, Map, Accommodations; brand **SHARE Project**
- Shared cost UI: `SharedAccounts.tsx`, `SharedAccountDetail.tsx` (transfer / withdraw / pay / balance language)
- Invitations UI now lives at `/messages` via `Invitations.tsx`
- Trips/events: `EventCountdown.tsx` (categories include `holiday`; budget + accommodation fields exist)
- Secondary: Calendar, Gallery, Map, Accommodations, PersonalFinance, FinancialRecords

### Docs vs code gap
- Root docs describe **group-payment** APIs (`/api/group-payments/...`, PayPal create-payment).
- **Those controllers/routes are not present** in the live `backend/` tree and are **not mounted** in `app.js`.
- `paypal-rest-sdk` appears under `backend/node_modules`, but no active controller path was found calling PayPal/Stripe for shared-account transfer/withdraw/pay.

---

## 2. Virtual ledger vs provider-backed real payments

| User-facing action (current UI) | What the code actually does | Classification |
|---|---|---|
| Add personal money / expense (`POST /finance`) | Creates a `FinanceRecord` (`input`/`output`) in MongoDB | **Virtual ledger only** |
| Transfer personal â†’ shared | Two `FinanceRecord` creates: personal `output` + shared `input` | **Virtual ledger only** |
| Shared account â€œbalanceâ€ | Sum of shared `FinanceRecord` inputs âˆ’ outputs | **Tracked / virtual** â€” not a bank balance |
| Payment request approve | On enough approvals, creates shared `output` `FinanceRecord` (and for withdrawals also a personal `input`) | **Virtual ledger only** |
| Withdraw request | Same as above â€” ledger moves, no PSP call | **Virtual ledger only** |
| Soft / permanent delete shared account | Soft flag or hard delete + archive name on records | Non-money lifecycle |
| Transfer ownership / admin | Updates `owner` / `members` | Non-money lifecycle |
| Group PayPal merchant payment (docs) | Documented only; **not implemented in live routes** | **Not live** |
| Stripe / PayPal checkout in shared-account flow | Not found in live shared-account / payment-request controllers | **Not live in this path** |

**Phase 0 conclusion:** All primary â€œmoneyâ€ actions currently shipping in shared accounts / finance / payment-requests are **virtual commitment / ledger records**. UI words like *transfer funds*, *withdraw*, *personal balance*, *pay balance* **overstate custody** relative to behaviour. Future Phase 3+ copy must say coordinate / record / commit unless a real provider call is proven.

---

## 3. KEEP / CHANGE / HIDE / BUILD LATER vs current product

| Pack classification | Current state | Phase recommendation |
|---|---|---|
| **KEEP** Events/trips | `/events` + `EventCountdown` with holiday/budget/accommodation | Keep; reframe as Trips in Phase 1 |
| **KEEP** Invitations | `/messages` (redirect from `/invitations`) | Keep primary; pack says â€œInvitationsâ€ â€” current label is Messages |
| **KEEP_REFRAME** Shared accounts | Full CRUD + targets + members + ledger | Keep APIs/models; reframe UI as Trip Fund / Shared Trip Costs (Phase 3) |
| **KEEP** Contribution / targets / payment requests | Present | Keep; make progress the hero (Phase 4) |
| **KEEP_SIMPLIFY** Financial records | Default post-login route | De-emphasise; do not delete (Phases 1 & 6) |
| **SECONDARY** Calendar / Map / Accommodations | Top-nav primary items | Move under More (Phase 2) |
| **HIDE_FROM_CORE_PITCH** Gallery | Top-nav | De-emphasise (Phase 2) |
| **HIDE_FROM_PRIMARY_JOURNEY** Personal finance | Top-nav â€œFinanceâ€ + default financial-records home | Remove from primary journey (Phases 1â€“2, 6) |
| **CAREFUL** PayPal/Stripe | Docs + unused dependency; not in live shared-money path | Do not claim; describe only if wired later |
| **BUILD_LATER** Custodial wallet / cards / FX / auto refunds | Not implemented | Do **not** implement in this pack |

---

## 4. Conflicts between current SHARE code and the marketing plan

1. **Default authenticated experience is accounting-first** (`/` â†’ `/financial-records`), not trip-first. Pack wants Trips first.
2. **Navbar is finance/lifestyle-heavy** (Finance, Shared Accounts, Messages, Friends, Events, Calendar, Gallery, Map, Accommodations) vs pack primary set (Trips, Shared Costs/Trip Money, Invitations).
3. **Custodial-sounding UI copy** on virtual ledger actions (transfer / withdraw / balance / pay).
4. **Brand label** is `SHARE Project` in navbar; pack prefers customer-facing `SHARE`.
5. **Product README framing** is â€œsocial event planning and financial management,â€ not â€œgroup-trip money coordination.â€
6. **Invitations renamed to Messages** in UI â€” pack still says Invitations; need a deliberate label decision in Phase 2/5 (Messages can stay as route if copy says Invites/Approvals).
7. **Friends** is a useful invite helper but not in pack primary nav â€” treat as secondary or invite support, not core pitch.
8. **Documented group-payment / PayPal flow is not live** â€” marketing must not claim PayPal merchant settlement until implemented.
9. **Events model is general** (social/work/holiday etc.) â€” pack wants trip beachhead in UI while keeping model compatibility (aligned with Phase 1 guidance).
10. **Repo layout noise:** project root mixes backend-style files with `backend/` + `frontend/` packages. Live app paths used for this baseline are `backend/` and `frontend/`.

---

## 5. Baseline test / build results (pre-existing; not fixed in Phase 0)

### Backend (`cd backend && npm test`)
- **Suites:** 5 failed, 1 passed (6 total)
- **Tests:** 25 failed, 47 passed (72 total)
- Notable areas:
  - `phase2.test.js` â€” recommendations endpoints returning **404** (route/expectation mismatch)
  - `sharedAccount.test.js` â€” some list assertions returning empty arrays / other failures mixed with earlier known owner-populate assertion style issues
  - `invite.test.js`, `friends.test.js`, `user.test.js` â€” failures present (environment/data/setup or API drift)
- **Not fixed in Phase 0** (per pack: record baseline without fixing unrelated issues)

### Frontend production build (`CI=true npm run build`)
- **Failed** because CI treats ESLint warnings as errors:
  - `src/components/Profile.tsx` â€” unused `user`; `useEffect` missing `fetchProfile` dependency
- Without CI, prior local `npm start` compiled with warnings only.

### Frontend unit tests (`CI=true npm test -- --watchAll=false`)
- **Failed to run** `src/App.test.tsx`: `Cannot find module 'react-router-dom'` from Jest resolver (dependency/install or test env issue)

Artifacts captured under:
- `implementation/_baseline_backend_test.txt`
- `implementation/_baseline_frontend_build.txt`
- `implementation/_baseline_frontend_test.txt`

---

## 6. What Phase 0 changed

- Added this file: `implementation/IMPLEMENTATION_NOTES.md`
- Updated Phase 0 checkboxes in `implementation/TASKS.md`
- **No application code, API, schema, or customer-facing copy changes**

---

## 7. Recommended next (Phase 1 â€” awaiting approval)

Per pack order, after approval:

1. Change default authenticated route away from `/financial-records` toward `/events` (trip-oriented).
2. Reframe Events UI copy as **Trips** without breaking `/api/events` or the Event model.
3. Update empty states / examples toward friend-group travel (4â€“8 friends, overseas leisure).

Do **not** start Phase 2+ until Phase 1 is approved after delivery.

---

## 8. Assumptions / open questions

- Confirm whether â€œMessagesâ€ should remain the primary invite label or revert to â€œInvitationsâ€ / â€œTrip invitesâ€ while keeping `/messages` route.
- Confirm preferred customer term for shared pots: **Trip Fund** vs **Shared Trip Costs** (pack allows either with transparency note).
- Confirm whether root-level duplicate controllers (if any outside `backend/`) are legacy and should be ignored for all future edits â€” Phase 0 treated **`backend/` + `frontend/`** as source of truth.
- Legal docs claim â€œlegal without licenceâ€ for virtual tracking; pack says treat legal docs as historical notes, not verified advice â€” customer copy must avoid regulatory claims either way.

---

## 9. Baseline Stabilisation (preâ€“Phase 1)

**Purpose:** Make frontend CI build + Jest reliable before marketing-alignment UI work. Not Phase 1. No product/marketing copy changes.

### Root causes

1. **Frontend CI build (`CI=true npm run build`)**
   - ESLint treated as errors under CI.
   - `Profile.tsx`: unused `user` from `useAuth()`, and `react-hooks/exhaustive-deps` warning on mount-only `useEffect`.

2. **Frontend Jest (`Cannot find module 'react-router-dom'`)**
   - Dependency **is installed** (`react-router-dom@7.9.1`).
   - CRA 5 / Jest 27 does not fully honour modern `package.json` `exports`.
   - Package `"main": "./dist/main.js"` points to a **missing file**; usable CJS entry is `dist/index.js`.
   - After mapping, cascading issues: `react-router/dom` export path, missing `TextEncoder` in jsdom, and axios ESM not transformed by default.
   - Default CRA `App.test.tsx` still asserted â€œlearn reactâ€, which this app never rendered.

### Files changed

- `frontend/src/components/Profile.tsx`
- `frontend/package.json` (Jest `moduleNameMapper` + `transformIgnorePatterns` only)
- `frontend/src/setupTests.ts`
- `frontend/src/App.test.tsx`
- `implementation/IMPLEMENTATION_NOTES.md` (this section)
- Capture logs: `implementation/_baseline_stab_frontend_build.txt`, `implementation/_baseline_stab_frontend_test.txt`

### Exact fixes

1. Remove unused `user` destructure; keep intentional mount-only `useEffect` with a one-line `eslint-disable-next-line react-hooks/exhaustive-deps`.
2. Map Jest modules to concrete CJS files:
   - `react-router-dom` â†’ `dist/index.js`
   - `react-router/dom` â†’ `dist/development/dom-export.js`
   - `react-router` â†’ `dist/development/index.js`
3. Allow Babel transform for `axios|react-router|react-router-dom` via `transformIgnorePatterns`.
4. Polyfill `TextEncoder` / `TextDecoder` from Node `util` in `setupTests.ts`.
5. Replace obsolete CRA smoke test with unauthenticated shell check (Login button + SHARE text).

### Results after stabilisation

| Check | Result |
|--------|--------|
| `CI=true npm run build` (frontend) | **PASS** â€” compiled successfully |
| `CI=true npm test -- --watchAll=false` (frontend) | **PASS** â€” `1` suite / `1` test |
| Backend `npm test` | **Not re-fixed** â€” Phase 0 baseline remains **25 failed / 47 passed** (72 total). Frontend changes did not target backend. |

### Remaining known failures

- Backend suites still failing from Phase 0 baseline (`phase2` recommendations 404s, sharedAccount/invite/friends/user drift). Left for a later pass; not blocking Phase 1 marketing copy/IA work if frontend CI is green.
- Browserslist / baseline-browser-mapping npm warnings remain (noise only).

---

## 10. Phase 1 â€” Trips as primary product entry

**Branch:** `marketing-alignment` (from `e971ec9`)
**Pre-work:** Unrelated WIP stashed as `stash@{0}: WIP: unrelated pre-Phase1 feature work (friends, payments, shared-account deletes, diagnostics)` â€” not included in this commit.

### Files inspected
- `frontend/src/App.tsx`, `Login.tsx`, `Navbar.tsx`, `ProtectedRoute.tsx`
- `frontend/src/components/EventCountdown.tsx` (primary Trips UI)
- Existing `/api/events` usage (GET/POST/DELETE) â€” left unchanged
- Confirmed no suitable alternate trip dashboard beyond `/events`

### Files changed
- `frontend/src/App.tsx` â€” default `/` â†’ `/events`
- `frontend/src/components/Login.tsx` â€” post-login navigate â†’ `/events`
- `frontend/src/components/Navbar.tsx` â€” nav label `Events` â†’ `Trips` (path still `/events`)
- `frontend/src/components/EventCountdown.tsx` â€” trip-oriented headings, empty states, form copy, examples, category labels
- `frontend/src/contexts/AuthContext.tsx` â€” added missing `refreshUser` so Profile (from stabilisation) typechecks after stash restored clean AuthContext
- `implementation/TASKS.md`, `implementation/IMPLEMENTATION_NOTES.md`

### Visible behaviour before â†’ after
| Before | After |
|--------|--------|
| `/` and login landed on financial records | `/` and login land on Trips (`/events`) |
| Navbar said â€œEventsâ€; page â€œEvent Countdownsâ€ | Navbar/page say **Trips** |
| Empty state: â€œNo events yetâ€¦â€ | Empty state invites Amsterdam weekend / Ibiza / ski / stag-hen / group holiday |
| Form placeholders birthday-party style | Trip name, destination, trip type, group-cost framing |

### Terminology changed (customer-facing only)
Events â†’ Trips; Add Event â†’ Add trip; Location â†’ Destination; Category labels reframed for travel; countdown/stats copy trip-oriented.

### Internal event terminology deliberately retained
- Route `/events`, API `/api/events`
- Component name `EventCountdown`, interface `Event`, fields `eventDate` / `eventTime`
- Category **values** (`holiday`, `travel`, `social`, â€¦) unchanged â€” only labels/order/default (`holiday`)

### Out of scope (left for Phase 2+)
- Full nav simplification / More menu
- Shared Accounts â†’ Trip Fund wording
- Personal Finance removal from primary journey beyond not being the default landing
- Messages rename, pooled funds, cards, FX, PayPal group payments

### Build / test results
- `CI=true npm run build` â€” **PASS**
- `CI=true npm test -- --watchAll=false` â€” **PASS** (1/1)

### Phase 2 should address
- Primary nav: Trips, Shared Costs/Trip Money, Invitations; move Calendar/Gallery/Map/Accommodations under More
- Brand label `SHARE Project` â†’ `SHARE`
- De-emphasise Finance in primary nav without deleting it

---

## 11. Phase 2 (user) / Phase 3 (pack) â€” Trip Money terminology

**Branch:** `marketing-alignment`
**Mapping:** User-approved â€œPhase 2â€ = pack **Phase 3** (reframe Shared Accounts into trip money coordination). Pack Phase 2 (nav redesign) was **not** started.

**Stash:** `stash@{0}` left untouched.

### Objective
Make customer-facing group-money UX describe virtual contribution / commitment / ledger tracking â€” not custody or banking.

### Customer-facing terms changed

| Before | After |
|--------|--------|
| Shared Accounts (nav) | Trip Money |
| Shared Account(s) (primary group screens) | Shared trip costs / Trip Money |
| Balance (group pot) | Recorded total |
| Target / account limit | Contribution target |
| Transfer / Transfer Funds | Record contribution |
| Withdraw / Withdrawal | Reverse recorded contribution |
| Available to withdraw | Available to reverse (recorded) |
| Pay Full Balance | Request settlement record |
| Pending payment approvals | Pending settlement approvals |
| Personal account balance (in contribution UI) | Personal tracked total |
| Insufficient fundsâ€¦ | Amount exceeds your personal tracked total |
| Transfer would exceed the account limitâ€¦ | Contribution would exceed the targetâ€¦ |

### Transparency note (added on list + detail)
> SHARE records and coordinates group contributions. It does not hold this tracked amount in a SHARE bank account.

### BEFORE â†’ AFTER examples
- Navbar: **Shared Accounts** â†’ **Trip Money** (route still `/shared-accounts`)
- List H1: accounting shared-account framing â†’ **Trip Money** + intro about shared trip costs / contribution targets
- Action: **Transfer Funds** â†’ **Record contribution** (still posts two `FinanceRecord`s)
- Action: **Withdraw** â†’ **Reverse recorded contribution** (still payment-request / ledger path)
- Action: **Pay** â†’ **Request settlement record** + explicit â€œSHARE does not send bank paymentsâ€
- Empty state: create shared account â†’ set up shared trip costs / pot for accommodation deposit, tickets, holiday costs

### Files changed
- `frontend/src/components/Navbar.tsx`
- `frontend/src/components/SharedAccounts.tsx`
- `frontend/src/components/SharedAccountDetail.tsx`
- `frontend/src/components/FinancialRecords.tsx` (Trip Money section + empty state)
- `frontend/src/components/Invitations.tsx` (invite target label only)
- `implementation/TASKS.md` (pack Phase 3 checkboxes)
- `implementation/IMPLEMENTATION_NOTES.md` (this section)

### Misleading money language intentionally left unchanged (and why)
- **Internal** names: `sharedAccount`, `/shared-accounts`, `transferForm`, `showWithdrawModal`, `personalBalance`, API paths, Mongo models â€” Phase 2 is UX/copy only.
- **Personal Finance** page (`PersonalFinance.tsx`) and Financial Records **Total Balance** card â€” personal ledger summary, secondary to trip journey; full de-emphasis is pack Phase 6.
- **Gallery filter â€œShared Accountâ€** â€” secondary lifestyle feature; pack Phase 6/8.
- **Dashboard.tsx â€œShared Accountsâ€ / Net Balance** â€” not in current `App.tsx` routes; left alone.
- Word **â€œdepositâ€** in empty-state example (â€œaccommodation depositâ€) â€” means a real-world trip cost type, not a SHARE bank deposit.
- **â€œTransfer ownershipâ€** â€” means admin rights, not money movement.

### Confirmation: no real-money functionality added
- No Stripe / PayPal settlement, cards, FX, wallets, withdrawals of real funds, or pooled custody.
- Existing MongoDB ledger behaviour preserved; only customer-facing labels and help text changed.

### Build / test results
| Check | Result |
|--------|--------|
| `CI=true npm run build` (frontend) | **PASS** |
| `CI=true npm test -- --watchAll=false` (frontend) | **PASS** (1/1) |

### Recommendations for next approved phase (pack Phase 2 or Phase 4)
1. **Pack Phase 2 â€” nav:** Trips, Trip Money, Invitations primary; More for Calendar/Gallery/Map/Accommodations; brand `SHARE`; demote Finance.
2. **Pack Phase 4 â€” progress hero:** visual priority for target / recorded / remaining / member progress on list+detail.
3. Later: invitation share UX (Phase 5), de-emphasise Personal Finance (Phase 6), non-custodial close-out summary (Phase 7).

**STOP:** Do not start pack Phase 2/4 without explicit approval.

---

## 12. Pack Phase 2 â€” Simplify primary navigation

**Branch:** `marketing-alignment`
**Stash:** `stash@{0}` left untouched.
**Preserved:** Trips reframe (user Phase 1) and Trip Money terminology (user Phase 2 / pack Phase 3).

### Navigation before â†’ after

| Before | After |
|--------|--------|
| Brand: `SHARE Project` | Brand: `SHARE` |
| Flat primary row: Finance, Trip Money, Invitations, Trips, Calendar, Gallery, Map, Accommodations + profile | Primary: **Trips**, **Trip Money**, **Invitations** + **More** + profile |
| Many links likely overflow on narrow screens | â‰¤768px: hamburger + full-height secondary panel; desktop More dropdown |

### Primary items
1. Trips â†’ `/events`
2. Trip Money â†’ `/shared-accounts`
3. Invitations â†’ `/invitations`

### More / secondary items
- Personal Finance â†’ `/personal-finance`
- Financial Records â†’ `/financial-records`
- Calendar â†’ `/calendar`
- Gallery â†’ `/gallery`
- Map â†’ `/map`
- Accommodations â†’ `/accommodations`

### Account (profile menu desktop; Account section on mobile)
- Edit Profile â†’ `/profile`
- Settings â†’ `/settings`
- Logout

### Files changed
- `frontend/src/components/Navbar.tsx`
- `frontend/src/App.css` (`.share-nav*` styles + mobile breakpoints)
- `implementation/TASKS.md`
- `implementation/IMPLEMENTATION_NOTES.md`

### Mobile behaviour
- At `max-width: 768px`, desktop primary/More/profile cluster is hidden.
- Hamburger toggles a panel with Primary, More, and Account sections (no horizontal overflow of many buttons).
- Routes and feature pages unchanged; nothing deleted.

### Build / test results
| Check | Result |
|--------|--------|
| `CI=true npm run build` (frontend) | **PASS** |
| `CI=true npm test -- --watchAll=false` (frontend) | **PASS** (1/1) |

### Recommendations for next phase
1. Pack Phase 4 â€” contribution progress as the hero on Trip Money list/detail.
2. Pack Phase 5 â€” invitation share/copy for messaging apps.
3. Pack Phase 6 â€” further de-emphasise Personal Finance / Financial Records copy journey.

**STOP:** Do not start the next pack phase without approval.

---

## 13. Pack Phase 4 â€” Contribution progress as visual hero

**Branch:** `marketing-alignment`
**Stash:** `stash@{0}` left untouched.
**Preserved:** Trips-first journey, Trip Money terminology, primary nav (Trips / Trip Money / Invitations / More), APIs/models unchanged.

### Trip Money BEFORE â†’ AFTER
| Before | After |
|--------|--------|
| Detail: flat â€œsummaryâ€ grid (recorded total, target, travellers) | Detail: contribution **progress hero** (purpose, bar, %, target/recorded/remaining, organiser next step) |
| Members listed as emails under owner | **Traveller contributions** scannable rows with recorded / suggested share / remaining / complete status |
| List: recorded total + traveller count | List: progress bar + remaining + % when target exists |
| Primary actions mixed | **Record contribution** primary; Invite / Edit target / Settlement secondary |
| Transaction History title | Group spending record (last 24 hours) |

### Progress information now visible
- Contribution target, recorded total, remaining to contribute, % complete, progress bar
- Target date (when present)
- Suggested equal share from `perPersonAmount` (or target Ã· travellers) â€” labelled illustrative/not mandatory

### Member contribution information now visible
- Name, organiser/traveller role, recorded net contribution
- Suggested share + remaining vs share + Complete / Still to contribute / Tracking (no target)
- Empty: invite CTA when only the organiser is present

### Primary actions
- Record contribution (primary)
- Invite traveller â†’ `/invitations?account=â€¦`
- Set contribution target / Edit details (organiser; when no target)
- Request settlement; Reverse recorded contribution (secondary)

### Empty-state changes
- No target â†’ explain + Set contribution target
- No contributions â†’ explain next record action
- No other travellers â†’ Invite traveller
- List empty â†’ explain pot setup + link to Invitations
- Activity empty â†’ Record contribution CTA

### Files changed
- `frontend/src/components/SharedAccountDetail.tsx`
- `frontend/src/components/SharedAccounts.tsx`
- `frontend/src/App.css`
- `implementation/TASKS.md`
- `implementation/IMPLEMENTATION_NOTES.md`

### Data that could NOT be displayed (backend does not store it)
- **Per-person mandatory allocations / custom splits** â€” only equal-share `perPersonAmount` (computed from target Ã· participants) exists; shown as guidance only
- **Committed-but-unrecorded promises** separate from ledger inputs â€” only `FinanceRecord` input/output amounts
- **Real bank settlement status** â€” not applicable; settlement remains virtual ledger approvals

### Confirmation: no real-money functionality added
- No Stripe/PayPal/cards/FX/wallets/withdrawals/transfers of real funds
- Existing virtual ledger actions preserved; UI prioritises progress clarity only

### Desktop / mobile behaviour
- Progress stats wrap via CSS grid; action buttons stack full-width under 768px
- Member rows stack status pill under name on narrow widths
- List progress bar uses full card width

### Build / test results
| Check | Result |
|--------|--------|
| `CI=true npm run build` (frontend) | **PASS** |
| `CI=true npm test -- --watchAll=false` (frontend) | **PASS** (1/1) |

### Recommendations for next phase (Pack Phase 5)
1. Strengthen invitations for group travel (named trip context, share/copy for WhatsApp).
2. Pack Phase 6 â€” keep Personal Finance out of the primary conversion journey (already under More).

**Note:** SharedAccount schema alignment for target fields was completed in Phase 4.5 below.

**STOP:** Do not start Pack Phase 5 without approval.

---

## 14. Phase 4.5 â€” Data integrity (targets + settlement wording)

**Branch:** `marketing-alignment`
**Stash:** `stash@{0}` left untouched.
**Scope:** Persistence integrity for Trip Money progress hero; settlement copy accuracy. No Pack Phase 5.

### What was inspected
- `backend/models/SharedAccount.js` vs `backend/controllers/sharedAccountController.js` create/update/list/detail
- `backend/routes/sharedAccountRoutes.js`
- `backend/models/FinanceRecord.js` + `paymentRequestController.js` approve path (creates `FinanceRecord` output only â€” no PayPal/Stripe)
- Frontend progress math in `SharedAccountDetail.tsx` / list remaining in `SharedAccounts.tsx`

### Mismatch found
**Yes.** Controller wrote `description`, `targetAmount`, `targetDate`, and `perPersonAmount`, but the live Mongoose schema only declared `owner`, `members`, `name`, `financeRecords`. Under default strict mode those target fields were stripped on save, so the Phase 4 hero could not reliably persist/reload targets.

### Exact fix made
Added optional schema paths (no redesign, no migration, no required flags):

```js
description: String
targetAmount: Number
targetDate: Date
perPersonAmount: Number
```

Existing documents without these fields continue to load; missing/zero target remains a safe â€œno targetâ€ UI state.

### Settlement wording decision
Payment-request create/approve only writes MongoDB ledger / approval state â€” **not** real money movement.

| Surface | BEFORE | AFTER |
|---------|--------|--------|
| Detail primary secondary button | Request settlement | **Request settlement record** |
| Detail/list modals | Request settlement record | unchanged (already accurate) |
| Pending approve/reject | Approve settlement / Reject settlement | **Approve/Reject settlement record** |

### Persistence / calculation checks
| Check | Result |
|--------|--------|
| Schema retains description/targetAmount/targetDate/perPersonAmount on document construct | **PASS** (node verification) |
| Target / target date survive save once schema includes paths | **PASS** (mismatch removed; no DB migration needed) |
| Recorded total from ledger inputs âˆ’ outputs | Unchanged; detail uses `/finance?sharedAccount=` once |
| Progress % clamped 0â€“100; remaining `Math.max(0, target âˆ’ recorded)` | Confirmed in Phase 4 UI code |
| Missing/zero target â†’ no progress bar / empty target panel | Confirmed |
| Equal share labelled illustrative / not mandatory | Confirmed |
| Member totals: one pass per user over transactions (no double-count of same record) | Confirmed |
| Existing SharedAccounts without target fields | Compatible (optional fields) |

### Test / build results
| Check | Result |
|--------|--------|
| Backend `npm test -- --testPathPattern=sharedAccount` | **Could not complete meaningfully in this environment** â€” MongoDB connect failed (`Topology is closed` / `process.exit(1)`). Same class of env/baseline failure as Phase 0; **not attributed to Phase 4.5 schema change**. No new assertion failures isolated to this change. |
| `CI=true npm run build` (frontend) | **PASS** |
| Frontend tests | **PASS** (1/1) |

### Remaining limitations
- Root/legacy `models/SharedAccount.js` (outside `backend/`) still minimal â€” live app uses `backend/models/`.
- Custom per-person mandatory splits still not stored.
- Settlement remains virtual ledger only.
- Backend shared-account suite needs a working Mongo test env to re-run end-to-end.

### Confirmation
No real-money / PSP / wallet / withdrawal / pooled-funds functionality added.

### Pack Phase 5
**Safe to begin** after approval (invitation share UX). Schema integrity for targets is addressed.

**STOP:** Do not start Pack Phase 5 in this turn.

---

## 15. Pack Phase 5 â€” Strengthen invitations for group travel

**Branch:** `marketing-alignment`
**Stash:** `stash@{0}` left untouched.
**Not pushed.**

### Invitations BEFORE â†’ AFTER
| Before | After |
|--------|--------|
| Generic â€œInvitations / Send Invitation / Shared accountâ€ | **Trip invitations**, **Invite travellers**, trip-pot context |
| Flat list; Accept+Cancel on every pending row | Split **Pending for you** vs **Invitations you sent**; role-correct actions |
| No share/copy | **Copy invite**, **WhatsApp**, optional **Web Share** with login URL (not a forged invite token) |
| Frontend called missing `/invites/send-bulk` | Sequential `/invites/send` (existing route) |
| Owner often blocked from inviting (`members.includes` only) | Owner **or** member may send invites |
| Sender not populated on list | Sender populated (`firstName`/`lastName`/`name`/`email`) |

### Trip context shown
- Pot/trip name from `sharedAccount.name`
- Inviter name when receiving
- Invitee email/phone when sent
- Status + expiry
- Organiser entry: Trip Money **Invite traveller** (`?account=`), Trips page links to Invitations

### Organiser invite journey
1. Trip Money detail â†’ Invite traveller (preselects pot) **or** Invitations â†’ Invite travellers
2. Add emails/phones â†’ Send trip invitation(s)
3. Optionally Copy invite / WhatsApp / Shareâ€¦ with trip-specific text + `/login` URL

### WhatsApp / share / copy
- **No genuine public invite-accept URL/token exists** in the Invite model or routes.
- Share message includes real `origin/login` only; recipient must log in and accept under Invitations (email match).
- Documented backend need for true shareable links: signed/random token + authenticated or validated accept endpoint + no guessable IDs.

### Messages vs Invitations
- App route is `/invitations` only; primary nav already **Invitations**. No separate person-to-person Messages product surface â€” left as Invitations / trip invitations (no global Messages rename conflict).

### Empty states
- No Trip Money pots â†’ Set up Trip Money
- No pending received â†’ explanation
- Nobody invited yet â†’ Invite travellers CTA

### Files changed
- `frontend/src/components/Invitations.tsx`
- `frontend/src/components/EventCountdown.tsx`
- `frontend/src/App.css`
- `backend/controllers/inviteController.js`
- `implementation/TASKS.md`
- `implementation/IMPLEMENTATION_NOTES.md`

### Security considerations
- Did not invent public invite URLs or expose accept-by-ID without auth/email match
- Accept still requires logged-in user whose email matches `recipientEmail`
- Cancel still sender-only
- Share text does not embed private invite Mongo IDs

### Backend limitations discovered
- No invite token / public join URL
- Invites attach to **SharedAccount** (Trip Money), not Event/Trip documents (no schema link)
- `/invites/send-bulk` was referenced by UI but **never existed** (fixed client-side)
- Email/SMS delivery still depends on env credentials (unchanged)

### Desktop / mobile
- Share/action buttons wrap; invite cards stack actions full-width under 768px

### Build / tests
| Check | Result |
|--------|--------|
| `CI=true npm run build` | **PASS** |
| Frontend tests | **PASS** (1/1) |
| Backend `invite` tests | **Not runnable here** â€” Mongo `Topology is closed` / process exit (existing env baseline; not repaired) |

### Confirmation
No real-money / wallet / PSP functionality added.

### Next phase recommendation
Pack Phase 6 â€” further de-emphasise Personal Finance / secondary lifestyle framing in page copy (nav already under More).

**STOP:** Do not start Pack Phase 6 without approval.

---

## 16. Pack Phase 6 â€” De-emphasise secondary finance and lifestyle features

**Branch:** `marketing-alignment`
**Stash:** `stash@{0}` left untouched.
**Not pushed.** Backend unchanged (copy/presentation only).

### Hierarchy protected
Primary remains **Trips â†’ Trip Money â†’ Invitations** (nav + post-login `/events`). Secondary tools stay under **More** with trip-oriented labels and page intros that point back to the core journey.

### Per-feature changes

| Feature | Change |
|---------|--------|
| **Personal Finance** | Reframed as **Personal tracking**; secondary badge; tracked-total wording; links to Trips/Trip Money/Invitations; empty state points to Trip Money |
| **Financial Records** | **Activity history**; personal tracked total; Record personal activity; transparency note; core links; form labels de-banked |
| **Gallery** | **Trip photos**; Trip Money pot filters/labels; empty state â†’ Trips |
| **Calendar** | **Trip calendar**; trip-date framing; core links; Trip countdown button |
| **Map** | **Trip map**; search trips; empty â†’ Add a trip |
| **Accommodation** | **Places to stay**; select trip; Trip Money/Invitations links |
| **More menu** | Labels: Personal tracking, Activity history, Trip calendar/photos/map, Places to stay |
| **Login/Register** | SHARE branding + trip coordination tagline on login |

### BEFORE â†’ AFTER examples
- Personal Financial Records / Total Balance â†’ **Personal tracking** / **Personal tracked total**
- My Accounts / Add Money â†’ **Activity history** / **Record personal activity**
- Shared Gallery / Shared Account â†’ **Trip photos** / **Trip Money pot**
- Event Locations Map â†’ **Trip map**
- Accommodations Recommendations â†’ **Places to stay**

### Deliberately left unchanged
- Feature routes, APIs, models, ledger behaviour
- Dashboard.tsx (not mounted in App.tsx)
- Card-input UI in Financial Records (existing prototype UI; not expanded)
- Mock accommodation search behaviour
- Primary nav structure from Phase 2

### Confirmation
- Nothing deleted
- No real-money / PSP / wallet functionality added

### Desktop / mobile
Secondary headers wrap; core links remain text links; More menu labels shorter/clearer on narrow screens.

### Build / tests
| Check | Result |
|--------|--------|
| `CI=true npm run build` | **PASS** |
| Frontend tests | **PASS** (1/1) |

### Recommendation for Pack Phase 7
Prototype non-custodial **Trip Close-out** summary from existing shared-account/ledger data (no automatic refunds; no claim of returning real bank balances).

**STOP:** Do not start Pack Phase 7 without approval.

---

## 17. Pack Phase 7 â€” Non-custodial Trip Close-out summary

**Branch:** `marketing-alignment`
**Stash:** `stash@{0}` left untouched.
**Not pushed.** No backend schema/API redesign.

### Trip Close-out BEFORE â†’ AFTER
| Before | After |
|--------|--------|
| No end-of-trip reconciliation view | **Trip Close-out** section at bottom of Trip Money detail |
| Target/progress only in hero | Group reconciliation + readiness status + traveller positions + pending settlement visibility |

### Data used
- `targetAmount`, `targetDate`, `perPersonAmount` (optional)
- Ledger via `/finance?sharedAccount=` (inputs/outputs)
- Owner + members for traveller list
- Pending settlement requests from `GET /payment-requests` filtered to this pot

### Calculations
- `recordedTotal` = sum(input) âˆ’ sum(output)
- `remaining = max(0, target âˆ’ recordedTotal)`
- `amountAboveTarget = max(0, recordedTotal âˆ’ target)` labelled **Recorded above target** (not refundable)
- `%` clamped 0â€“100
- Equal-share delta: above / below / matches suggested share (illustrative only)

### Readiness statuses
- **No target set**
- **Still collecting**
- **Ready to review** (target reached on ledger â‰  real-world settled)
- **Review difference** (recorded above target)

### Settlement-record behaviour
Surfaces **Pending review** requests only (current API limitation). Explains approvals record ledger settlement, not bank movement. No fake Close account.

### Organiser next actions (existing only)
Set/edit target, Record contribution, Request settlement record, scroll to traveller list / activity.

### Files changed
- `frontend/src/components/SharedAccountDetail.tsx`
- `frontend/src/App.css`
- `implementation/TASKS.md`
- `implementation/IMPLEMENTATION_NOTES.md`

### Data limitations
- Ledger does **not** reliably separate trip spend vs member-to-member repayments â†’ **no profit/loss invented**
- Historical approved/rejected settlement requests not listed by `GET /payment-requests` (pending only)
- No SharedAccount archive/close state â€” not fabricated
- Invites/Trips not linked to SharedAccount for â€œtrip finishedâ€ event date beyond optional `targetDate`

### Deliberately NOT implemented
Automatic refunds, residue distribution, PSP payouts, wallets, withdrawals, Close account button, binding debt language.

### Build / tests
| Check | Result |
|--------|--------|
| `CI=true npm run build` | **PASS** |
| Frontend tests | **PASS** (1/1) |
| Backend tests | **Not run** â€” no backend behaviour change |

### Recommendation for Pack Phase 8
Copy consistency pass across primary screens (`COPY_AND_TERMINOLOGY.md`), including strategic line only where adjacent copy stays non-custodial.

**STOP:** Do not start Pack Phase 8 without approval.

---

## 19. Pack Phase 8 â€” Copy consistency pass

**Branch:** `marketing-alignment`
**Stash:** `stash@{0}` left untouched.
**Not pushed.** No APIs/models/routes renamed.

### Terminology standardised (customer-facing)
| Theme | Prefer |
|--------|--------|
| Travel | Trip / Trips / Create trip / Travellers |
| Money | Trip Money / shared trip costs / Record contribution / settlement record / Trip Close-out |
| Secondary | Personal tracking / Activity history / Trip photos / calendar / map / Places to stay |
| Brand | **SHARE** (not SHARE Project / React App) |
| Positioning | â€œFund the trip together. Spend together. Finish square.â€ on Login + Trips intro |

### BEFORE â†’ AFTER (examples)
- Add trip â†’ **Create trip**
- Participants â†’ **Travellers**
- Filter by Event / All Events â†’ **Filter by trip / All trips**
- User (activity table) â†’ **Traveller**
- Register interest â€œFinanceâ€ â†’ travel-oriented interests
- Mock accommodation note â†’ accurate â€œsample results for planningâ€
- HTML title React App â†’ **SHARE**

### Remaining customer-facing â€œEventâ€
- Largely removed from labels; internal Event types/routes remain
- Unmounted `Dashboard.tsx` still says Event/Shared Accounts (not in App routes) â€” left alone

### Remaining â€œShared Accountâ€
- Customer UI largely uses Trip Money / trip pot
- Internal `sharedAccount` props/APIs/variable names unchanged

### Remaining banking-like wording (intentional)
- **Personal tracked total** / **Recorded total** (ledger tracking, not bank balance)
- **Transfer creator rights** (ownership handoff, not money)
- **Accommodation deposit** as a real-world cost example
- Transparency sentences retained where custody misunderstanding is likely

### CTA consistency
Create trip Â· Save trip Â· Record contribution Â· Invite travellers Â· Request settlement record Â· Reverse recorded contribution

### Auth / branding
Login + Register intro copy; document title/manifest SHARE

### Deliberately unchanged
- Component names (`EventCountdown`, `SharedAccounts`, â€¦)
- `/events`, `/shared-accounts`, finance API fields
- `Dashboard.tsx` (unmounted)
- Backend error strings (out of scope for large rewrite)

### Confirmation
No new product functionality added â€” copy/presentation only.

### Build / tests
| Check | Result |
|--------|--------|
| `CI=true npm run build` | **PASS** |
| Frontend tests | **PASS** (1/1) |

### Recommendation for Pack Phase 9
Quality and regression: manual journey Trips â†’ Trip Money â†’ Invitations â†’ Close-out; mobile widths; confirm More-menu secondary features; record any remaining copy edge cases.

**STOP:** Do not start Pack Phase 9 without approval.

---

## 20. Pack Phase 9 â€” Quality, regression and release readiness

**Branch:** `marketing-alignment`
**Stash:** `stash@{0}` left untouched (and `stash@{1}` also present; neither restored).
**Not pushed. Not merged.**

### Claim fix in this phase
Live Login + Trips intro no longer use **â€œFund the trip together. Spend together. Finish square.â€** as current-product copy.
Replaced with: **â€œPlan the trip together. Track shared costs. Finish square.â€**
Strategic line remains in pack docs (`START_HERE_CURSOR.md`) as future/marketing direction.

### Docs status notes added
- `GROUP_PAYMENT_IMPLEMENTATION.md` â€” not live PayPal/group-payments API
- `LEGAL_WARNING_GROUP_PAYMENTS.md` â€” still valid warning; live product is non-custodial ledger
- Root `README.md` â€” trip-first / non-custodial current-status banner

### Dashboard.tsx
Confirmed **unmounted** (not imported in `App.tsx`). Stale Event/Shared Accounts copy remains as dormant tech debt.

---

## Marketing Alignment â€” Final Release Readiness

### Branch / commits
- **Branch:** `marketing-alignment`
- **Merge-base with main (approx):** `e971ec9` (frontend CI/Jest stabilisation); pack install `c9464b0` precedes UI work
- **Marketing UI sequence (chronological):**
  1. `c9464b0` â€” Add marketing alignment pack and Phase 0 baseline notes
  2. `e971ec9` â€” Stabilize frontend CI build and Jest baseline
  3. `abda1eb` â€” Reframe authenticated entry around Trips for group travel
  4. `0e3e84a` â€” Reframe group money UI as Trip Money virtual tracking
  5. `45ad8a1` â€” Simplify primary navigation around Trips, Trip Money, and Invitations
  6. `c4f3292` â€” Make Trip Money contribution progress the visual hero
  7. `7f6e029` â€” Fix SharedAccount schema so contribution targets persist
  8. `6fad8f7` â€” Strengthen trip invitations with clear context and safe sharing
  9. `040a31d` â€” De-emphasise secondary finance and lifestyle surfaces around the trip core
  10. `46ba195` â€” Add a non-custodial Trip Close-out summary on Trip Money detail
  11. `42e47bb` â€” Standardise SHARE customer-facing copy around trips and Trip Money
  12. *(Phase 9 commit)* â€” Final quality: truthful positioning, doc status notes, readiness

### Core product positioning (live)
SHARE is a **group-trip coordination prototype**: plan trips, invite travellers, record shared-cost activity, review close-out.
It does **not** hold pooled money, run PayPal/Stripe group settlement, or provide bank accounts/cards.

### Major changes (summary)
Trips-first default; Trip Money terminology + progress hero + close-out; primary nav Trips / Trip Money / Invitations / More; trip invitations with safe share (login URL only); SharedAccount target fields persisted; secondary tools de-emphasised; copy consistency; non-custodial transparency retained.

### Test results
| Check | Result |
|--------|--------|
| Frontend `CI=true npm run build` | **PASS** (compiled successfully) |
| Frontend tests | **PASS** â€” 1 suite, 1 test (`App.test.tsx`) |
| Backend `npm test` | **Environment failure** â€” Mongo `Topology is closed` / `process.exit(1)`; suites fail to run meaningfully (0 tests executed in this environment). Historical Phase 0 baseline when Mongo worked: **25 failed / 47 passed**. No evidence marketing-alignment introduced new backend assertion failures; invite/schema changes are additive and not covered by a green local suite here. |

### Security sanity (targeted)
- Invite accept still requires auth + matching `recipientEmail`
- Invite send requires owner or member
- Share message uses `/login` only â€” no public invite token
- No secrets added in branch files reviewed
- Ledger modify actions remain authenticated API calls

### Non-custodial confirmation
No pooled funds, custody, PayPal/Stripe settlement, bank transfers, cards, FX, automatic refunds/payouts, FSCS/safeguarding claims implemented by this branch.

### Known technical debt
- Unmounted `Dashboard.tsx` stale copy
- Backend Jest/Mongo test harness flaky/broken in this environment
- Historical ~25 backend test failures when suite previously ran
- `GET /payment-requests` returns pending only
- No Eventâ†”SharedAccount schema link
- No public invite tokens
- Root README still largely backend/event-finance oriented beneath the status banner
- `BankAccount.ts` util unused-sounding banking vocabulary (not customer UI)

### Deferred capabilities
Real money movement, public invite links, automatic close-out refunds, full settlement history API, schema link Tripsâ†”Trip Money, backend test-env repair.

### Regulatory / product limitations
Prototype coordinates and records; organisers settle real money outside SHARE.

### Release decision
| Question | Answer |
|----------|--------|
| Ready to **PUSH** `marketing-alignment` to remote? | **Yes**, after human approval (frontend green; docs status noted; stash not included) |
| Ready to **MERGE** into `main`? | **Conditionally yes** â€” merge after push + PR review; do **not** treat backend suite as green; consider follow-up for Mongo test env and dormant Dashboard |
| Conditions before merge | Confirm no secret/.env in PR; reviewer accepts non-custodial positioning; decide whether to ignore or ticket backend test debt |

### Recommended next Git action
1. Human reviews Phase 9 commit + notes
2. `git push -u origin marketing-alignment` (only when approved)
3. Open PR into `main` (do not merge until reviewed)
4. Leave `stash@{0}` unrestored unless a separate task requests it

**STOP:** Do not push or merge in this agent turn.

---

## Integration 1 â€” Friends (pre-marketing recovery into marketing-aligned SHARE)

**Branch:** `integrate-pre-marketing-features`
**Source inspected:** `pre-marketing-wip` (behaviours extracted; branch not merged; commit `7282078` not cherry-picked; `stash@{0}` not restored)

### Recovered behaviours
- List current userâ€™s friends (`GET /api/friends`)
- Add a registered SHARE user by email (`POST /api/friends`)
- Remove a friend by id (`DELETE /api/friends/:friendId`)
- Prevent self-add and duplicate friendships
- Frontend Friends page under **More** (secondary)
- `friendService` helpers (`rememberFriend`, `rememberFriendByEmail`, `rememberFriendsMutual`) shipped for later invite auto-friend use â€” **not wired** into invite/shared-account controllers in this integration

### Files migrated / changed
| Area | Path |
|------|------|
| Added | `backend/services/friendService.js` |
| Added | `backend/controllers/friendController.js` |
| Added | `backend/routes/friendRoutes.js` |
| Added | `backend/tests/friends.test.js` |
| Added | `frontend/src/components/Friends.tsx` |
| Edited (surgical) | `backend/app.js` â€” mount `/api/friends`; skip `startServer()` when `NODE_ENV=test`; list friends on root endpoint map |
| Edited (surgical) | `backend/middleware/validation.js` â€” **only** `validateAddFriend` (Trip Money target fields remain optional) |
| Edited (surgical) | `frontend/src/App.tsx` â€” protected `/friends` route; `/` still â†’ `/events` |
| Edited (surgical) | `frontend/src/components/Navbar.tsx` â€” Friends in `moreLinks` only |

### Adaptations for current main
- Friends is **not** a primary nav item; primary remains Trips / Trip Money / Invitations / More
- Copy reframed for group travel; explicit that friendship â‰  Trip / Trip Money access
- Links go to `/invitations` (not WIP `/messages`)
- Secondary Â· More menu framing aligned with Personal tracking / Activity history
- Responsive flex-wrap on friend rows and header actions
- Invalid `friendId` on DELETE returns 400
- Add uses `$addToSet` via `rememberFriend` after duplicate checks

### Deliberately deferred
- Auto-friend on invite send/accept (would touch `inviteController` / Invitations UX) â†’ **Invitation Helpers** integration
- InviteRecipientsForm friend picker
- Payment requests, soft-delete SharedAccount, Messages rename, finance UI regressions
- Genericising the â€œNo SHARE account found with that emailâ€ enumeration message (kept prototype wording for API/test compatibility; safer generic copy can be considered later without expanding Integration 1)

### Security notes
- All Friends routes require `auth`; mutations use `req.user.userId` only (cannot edit another userâ€™s list)
- Remove does not delete User documents
- Friendship grants **no** Trip Money membership or permissions
- Email add still reveals whether an account exists (same as recovered prototype)

### Tests / results
| Check | Result |
|--------|--------|
| `NODE_ENV=test npx jest tests/friends.test.js --forceExit` | **PASS** â€” 8 tests (list, unauth GET, add, self, duplicate, unauth POST, remove, invalid id) |
| Frontend `CI=true npm run build` | **PASS** |
| Frontend `npm test -- --watchAll=false` | **PASS** â€” 1 suite / 1 test |
| First Friends run without test `startServer` guard | **Environment failure** (`Topology is closed` / `process.exit(1)` on app import) â€” distinguished from Friends logic; minimal guard applied |

### Regression (code-checked)
- `/` â†’ `/events` preserved
- Primary nav unchanged
- Trip Money progress hero + Trip Close-out still present in `SharedAccountDetail.tsx`
- Invitations route/component unchanged
- No custodial banking wording introduced by Friends copy

### Next
Integration 2 â€” Auth user shape is safe to begin (does not depend on unfinished Friends work).
**Do not push** this commit unless separately requested.

---

## Integration 2 â€” Auth user shape (pre-marketing recovery into marketing-aligned SHARE)

**Branch:** `integrate-pre-marketing-features`
**Source inspected:** `pre-marketing-wip` (formatter/mapping behaviours extracted only; branch not merged; stash not restored)

### User shape BEFORE â†’ AFTER

| Flow | Before | After |
|------|--------|--------|
| Login `user` | `{ id, name: user.name, email }` â€” `name` usually missing (schema uses firstName/lastName) | `{ id, firstName, lastName, name (computed), email, age, interests, createdAt }` |
| `GET /users/me` | Raw mongoose doc minus password (could include `friends`, `calendarSettings`, `_id`) | Same formatted client shape as login |
| Profile update response | Raw doc (and previously wrote non-schema `name` field) | Formatted client shape; `name` input splits into `firstName`/`lastName` |
| AuthContext init/login/refresh | Ad-hoc mapping; init wrongly read `user.userId` | Shared `mapUserFromApi` with id/name/firstName/lastName/email fallbacks |

### Backend formatter (`formatUserForClient`)
- Builds display `name` from legacy `user.name` if present, else `firstName` + `lastName`, else `'User'`
- Applied to login, getProfile, updateProfile
- Profile updates accept `name` and/or `firstName`/`lastName` and persist to schema fields

### Frontend mapping (`mapUserFromApi`)
- Resolves `id` from `id` | `_id` | `userId`
- Resolves `name` from `name` | first+last | `'User'`
- Optional `firstName` / `lastName` on AuthContext `User`
- Used by initAuth, login, refreshUser, updateProfile

### Fields exposed to frontend (auth/profile user payload)
`id`, `firstName`, `lastName`, `name`, `email`, `age`, `interests`, `createdAt`

### Fields deliberately excluded
`password` / hash, `friends`, `calendarSettings`, tokens, reset/verification secrets, other internal mongoose metadata (`__v`, etc.)

### Name fallback behaviour
Backend and frontend both prefer an explicit name string when present, then concatenate first/last, then `'User'`. Friends list naming remains via `friendController` (`firstName`/`lastName` â†’ `name`, else email).

### Tests / results
| Check | Result |
|--------|--------|
| Friends `tests/friends.test.js` | **PASS** â€” 8/8 |
| `tests/user.test.js` | **FAIL (pre-existing / unrelated)** â€” expects `success` envelope not returned by controllers; asserts DB `user.name` though schema uses firstName/lastName; registration/login rate-limited (429) when suites run back-to-back. Not introduced by Integration 2 formatter. |
| Frontend `CI=true npm run build` | **PASS** |
| Frontend tests | **PASS** â€” 1 suite / 1 test |

### Regression (code-checked)
- `/` â†’ `/events`; primary nav Trips / Trip Money / Invitations; Friends under More
- Trip Close-out unchanged; token localStorage + axios Authorization flow unchanged
- Login/logout/refresh/updateProfile still present and use normalised user mapping

### Deferred / out of scope
SharedAccount access helper, soft delete, payment requests, invitation helpers, ParticipantCount, finance changes

### Next
Integration 3 â€” SharedAccount access helper is safe to begin.
**Do not push** unless separately requested.

---

## Integration 3 â€” SharedAccount historical read access

**Branch:** `integrate-pre-marketing-features`
**Source inspected:** `pre-marketing-wip` `backend/utils/sharedAccountAccess.js` (behaviours extracted; not merged wholesale)

### Access model BEFORE â†’ AFTER

| | Before | After |
|--|--------|--------|
| Read `GET /shared-accounts/:id` | Owner or current member only | Owner/member **or** former participant with own `FinanceRecord` on that pot |
| Read `GET /finance?sharedAccount=` | Owner or current member only | Same historical-read rule |
| Mutations (update/delete/transfer/withdraw/create linked finance) | Owner and/or member (varied) | **Current participant only**; historical activity never grants write |
| Create finance with `sharedAccount` | No membership check (gap) | Requires current participant |

### Exact historical-access rule
DB check: `FinanceRecord.exists({ sharedAccount: account._id, user: requestingUserId })`
plus current `owner` / `members` membership. Client-supplied ownership is never trusted.

### Read vs write distinction
- `canReadSharedAccount` â€” participant **or** historical finance activity
- `canMutateSharedAccount` / `isAccountParticipant` â€” owner or current member **only**

### Controllers / routes affected
| Read | Write (explicitly not broadened) |
|------|----------------------------------|
| `GET /api/shared-accounts/:id` | `PUT /api/shared-accounts/:id` (owner) |
| `GET /api/finance?sharedAccount=` | `DELETE`, transfer-ownership, withdraw |
| | `POST /api/finance` when `sharedAccount` set |
| | `PUT/DELETE /api/finance/:id` when record is Trip Moneyâ€“linked |

### Files
- Added: `backend/utils/sharedAccountAccess.js`
- Added: `backend/tests/sharedAccountAccess.test.js`
- Changed: `sharedAccountController.js`, `financeController.js`
- Fixed require path only: `backend/tests/sharedAccount.test.js` (`models/User`)

### Security tests
`sharedAccountAccess.test.js` â€” **12/12 PASS** (owner/member/unrelated/historical/no-record/wrong-account/malformed/unauth + mutation denials + finance ledger read)

### Limitations
- Historical readers are **not** added back to `GET /shared-accounts` list (ID-based read only)
- Historical read of a pot returns the **group ledger** for that SharedAccount (not other usersâ€™ personal unscoped finance)
- Soft delete / permanent delete / invite helpers / payment requests **not** integrated
- Pre-existing withdraw error copy may still say â€œInsufficient fundsâ€ (unchanged this integration)

### Next
Integration 4 â€” soft delete/admin is safe to begin (access helper is in place for reads).
**Do not push** unless separately requested.

---

## Integration 4 â€” Trip Money archive / organiser admin

**Branch:** `integrate-pre-marketing-features`
**Source:** behaviours extracted from `pre-marketing-wip` (not merged wholesale)

### Administration BEFORE â†’ AFTER
| Before | After |
|--------|--------|
| Hard `DELETE` removed pot + unset finance refs | Default **Archive Trip Money** (`isDeleted` / `deletedAt`) |
| No archived list | Active list excludes archived; `?archived=true` + Show archived toggle |
| Ownership transfer existed with â€œownerâ€ wording | **Transfer organiser role** (current member only; blocked when archived) |
| Permanent delete + â€œfundsâ€ gate in WIP | Permanent delete only after archive; stamps `archivedAccountName`; no fictional funds check |

### Archive semantics
- Organiser-only `DELETE /api/shared-accounts/:id` soft-archives
- Leaves active list; history remains readable via `canReadSharedAccount`
- Mutations rejected (contributions, target edits, invites, settlements, transfer, withdraw)
- `canMutateSharedAccount` returns false when archived

### Permanent delete
- `DELETE /api/shared-accounts/:id/permanent` â€” organiser only, **must already be archived**
- Preserves FinanceRecords with `archivedAccountName`; unsets `sharedAccount`
- Deletes invites (+ payment requests when model available)
- No â€œbalance/fundsâ€ precondition (prototype is non-custodial)

### Organiser transfer
- Current organiser â†’ current member only
- Not historical-only readers; not archived pots
- Does not alter ledger history

### Files
Models: `SharedAccount.js`, `FinanceRecord.js`
Utils: `sharedAccountAccess.js` (`isArchivedSharedAccount`)
Controllers: `sharedAccountController.js`, `inviteController.js`, `paymentRequestController.js`
Routes: `sharedAccountRoutes.js`
FE: surgical `SharedAccounts.tsx`, `SharedAccountDetail.tsx`
Tests: `sharedAccountArchive.test.js`

### Tests
| Suite | Result |
|-------|--------|
| `sharedAccountArchive.test.js` | **16/16 PASS** |
| `sharedAccountAccess.test.js` | **12/12 PASS** |
| `friends.test.js` | **8/8 PASS** |
| Frontend build / App.test | **PASS** |

### Deferred
Payment-request UX extensions; invite helpers; ParticipantCount; full restore of WIP delete UI; un-archive flow.

### Next
Integration 5 â€” Payment Request extensions is safe to begin.
**Do not push** unless separately requested.

---

## Integration 4.5 â€” Permanent delete history check

**Branch:** `integrate-pre-marketing-features`

### What PaymentRequest represents
Group **settlement-record approval workflow** for Trip Money: pending approvals among travellers; on full approval it can execute a ledger output FinanceRecord. Customer UI calls these settlement records, not bank payments.

### Classification
| Status | Nature | Permanent-delete policy |
|--------|--------|-------------------------|
| `pending` | Actionable workflow | **Cancel** (`cancelled`) + stamp `archivedAccountName` + unset `sharedAccount` |
| `approved` / `rejected` / `executed` / `cancelled` | Meaningful settlement history | **Preserve** with `archivedAccountName` + unset `sharedAccount` |

Deleting all PaymentRequests on permanent delete was **not safe** â€” it would destroy approved/rejected/executed settlement history.

### Invitations
Pending invites for a deleted pot must not remain actionable â†’ **delete** invites for that SharedAccount (accepted membership already applied; no product need to keep invite rows).

### Insufficient funds wording
Withdraw/reverse path customer message:
**Before:** `Insufficient funds. You can withdraw up toâ€¦`
**After:** `Cannot reverse more than your recorded contribution. You can reverse up toâ€¦ (recorded contributionsâ€¦ already reversedâ€¦)`

### Files
- `backend/models/PaymentRequest.js` â€” `sharedAccount` optional; `archivedAccountName`
- `backend/controllers/sharedAccountController.js` â€” preserve/cancel settlement rows; reverse wording
- `backend/controllers/paymentRequestController.js` â€” guard approve/reject when pot link missing
- `backend/tests/sharedAccountArchive.test.js` â€” pending/approved/rejected/invite integrity cases

### Tests
Archive+integrity, access, Friends: **39 passed**; frontend build/tests **PASS**.

### Next
Integration 5 is safe to begin (settlement history no longer wiped on permanent delete).
**Do not push** unless separately requested.

---

## Integration 5 â€” Trip Money settlement record workflow

**Branch:** `integrate-pre-marketing-features`
**Source inspected:** `pre-marketing-wip` (no merge / no wholesale cherry-pick / stash not restored)

### PaymentRequest lifecycle (current)

| Status | Meaning | Mutability |
|--------|---------|------------|
| `pending` | Open settlement-record approval among travellers | Approve / reject / cancel (rules below) |
| `approved` | Legacy/compat status; completion path sets `executed` | No further ledger execution |
| `rejected` | A traveller rejected; no ledger output | Historical only |
| `executed` | Ledger `FinanceRecord` output written once | Historical only |
| `cancelled` | Requester cancelled, expired, or pot permanently deleted while pending | Historical only |

`archivedAccountName` + optional `sharedAccount` from Integration 4.5 remain intact.

### Features recovered / adapted

| Feature | Decision |
|---------|----------|
| Cancel pending | **Recovered** â€” requester only; pending only; history retained as `cancelled`; blocked on archived pots |
| Actionable count | **Adapted** â€” `GET /payment-requests/unread-count` counts pending requests where the auth user has not approved/rejected and is not the requester (per-user derivation) |
| Shared `readAt` | **Skipped** â€” unsafe for multi-recipient notifications; not implemented |
| Approve / reject | **Hardened** â€” status guards; archived pot blocks mutations; atomic `pending`â†’`executed` claim before ledger write |
| Duplicate execution | **Guarded** â€” cannot approve executed/approved/cancelled/rejected; concurrent claim prevents double FinanceRecord |
| UI actions | Trip Money list + Trip Close-out settlement section; Trip Money nav badge for actionable count |
| Invitations / Messages | **Unchanged** â€” no rename; no PaymentRequestMessages hub |

### requestType / withdrawal

- Schema keeps `requestType: payment | withdrawal` for WIP compatibility (default `payment`).
- Create API **rejects** non-`payment` types with ledger-accurate messaging.
- Customer-facing **withdrawal request** deferred â€” recovered path implied custodial fund release; contribution reversal remains the existing Trip Money reverse-recorded-contribution flow.

### Read / unread design

- Not a single shared `readAt`.
- â€œUnreadâ€ = **actionable settlement approvals** for the authenticated user only.
- Badge on **Trip Money** primary nav (not Invitations).

### Cancellation rules

- Requester only
- Status must be `pending`
- Cannot rewrite approved / rejected / executed as cancelled via this endpoint
- Archived pot â†’ 400 (read-only)
- Document is not deleted

### Idempotency / duplicate ledger protection

- Approve rejects non-pending terminal states
- Execution uses `findOneAndUpdate({ status: 'pending' }, { status: 'executed' })` so only one concurrent approver can write the FinanceRecord

### Archive / permanent-delete compatibility

- Archived: no create / approve / reject / cancel
- Permanent delete (I4.5): pending â†’ cancelled + `archivedAccountName`; completed/rejected/cancelled history preserved

### Customer wording

| Before (risk) | After |
|---------------|--------|
| Cancel payment / withdraw request | Cancel settlement request |
| Payment approved / funds | Approve / Reject settlement record; ledger recording disclaimer |
| Withdrawal request type | Not exposed; deferred |

### Files

- `backend/models/PaymentRequest.js`
- `backend/controllers/paymentRequestController.js`
- `backend/routes/paymentRequestRoutes.js`
- `backend/tests/paymentRequestSettlement.test.js`
- `frontend/src/components/SharedAccountDetail.tsx`
- `frontend/src/components/SharedAccounts.tsx`
- `frontend/src/components/Navbar.tsx` (Trip Money badge only)

### Tests

| Suite | Result |
|-------|--------|
| `paymentRequestSettlement.test.js` | **16/16 PASS** |
| `sharedAccountArchive.test.js` | **PASS** (incl. settlement history preservation) |
| `sharedAccountAccess.test.js` | **12/12 PASS** |
| `friends.test.js` | **8/8 PASS** |
| Frontend build | **PASS** |
| Frontend `App.test.tsx` | **1/1 PASS** |

Combined archive + access + friends: **39/39 PASS**.

### Deliberately skipped

- PaymentRequestMessages as Messages product
- Invitations rename / wholesale Navbar replace
- Shared `readAt` multi-user semantics
- Customer-facing withdrawal requestType
- Stripe / PayPal / wallets / real payouts

### Remaining risks

- List endpoint still returns **pending** requests only (full historical status list not a separate API)
- Solo-traveller pots with `requiredApprovals: 0` still do not auto-execute on create (pre-existing)
- Actionable badge polls `/unread-count` (path-change refresh + 60s interval)

### Next

Integration 6 â€” Invitation helpers is **safe to begin** after this commit.
**Do not push** unless separately requested.

---

## Integration 6 â€” Trip invitation helpers

**Branch:** `integrate-pre-marketing-features`
**Source inspected:** `pre-marketing-wip` (no merge / no wholesale cherry-pick / stash not restored)

### Current invitation lifecycle (unchanged core)

| State | Representation |
|-------|----------------|
| Created/sent | `status: pending`, `expiresAt` (~7 days) |
| Pending | Listed while not expired |
| Accepted | `status: accepted`; user added to pot members |
| Cancelled | Document **deleted** by sender (not a status enum value) |
| Expired | `expiresAt` in the past; accept rejected; list filter excludes expired |
| Resend | Sender-only; pending + active (non-archived) pot; re-notifies email/SMS |

Each Invite belongs to **one** recipient (`recipientEmail` / optional phone).

### Features recovered / adapted

| Feature | Decision |
|---------|----------|
| Friend picker (`InviteRecipientsForm`) | **Recovered/adapted** into current Invitations form â€” convenience only |
| Multi-recipient | **Keep sequential** `/invites/send` via `sendInvitesForAccount` |
| Bulk `/send-bulk` | **Deferred** â€” sequential already returns clear per-recipient failures; avoids a second write path |
| `readAt` | **Added** â€” safe because one recipient per Invite |
| Unread count + mark-read | **Added** â€” recipient-owned pending unread only |
| Invitations navbar badge | **Added** (blue) â€” separate from Trip Money settlement badge (amber) |
| Auto-friend on send | **Deferred** â€” surprising one-sided contact from a mere send |
| Auto-friend on accept | **Implemented** â€” `rememberFriendsMutual(sender, accepter)` after successful accept |
| `messageNotifications.ts` Messages hub | **Not migrated** |
| Public invite tokens | **Deferred** â€” keep login URL + authenticated accept |

### Friend picker

- Organiser can pick from `/friends` and/or enter email
- Friendship does **not** grant Trip Money access
- Existing invite auth rules still apply

### Sequential vs bulk

Kept sequential sends because the current product already multi-sends this way with mixed success/failure messaging. Bulk would only reimplement the same loop server-side without transactional multi-document guarantees worth the extra surface.

### Read / unread

- `readAt` optional on Invite
- Unread = pending + not expired + `readAt` null/missing + matches authenticated recipient
- `GET /invites/unread-count`, `POST /invites/mark-read`, `POST /invites/:inviteId/mark-read`
- Sender cannot mark recipient read state
- Accepted/expired not actionable as unread

### Auto-friend semantics

Friends remain **one-way saved contact lists** (`User.friends` + `$addToSet`).
On **accepted** trip invitation only: both parties are added to each otherâ€™s lists (mutual convenience for future pickers).
Rejected/cancelled/expired/send-only paths do **not** add friends.
Friendship still grants **no** Trip Money membership.

### Share / WhatsApp preserved

- Trip-specific copy + WhatsApp + Web Share
- Real `/login` link only
- No public invitation tokens

### Security notes

- Auth required on invite APIs
- Sender must be current owner/member; archived pot blocks send/resend/accept
- Recipient identity resolved server-side (DB email), not client-supplied authority
- Historical-only readers still cannot invite

### Files

- `backend/models/Invite.js`
- `backend/controllers/inviteController.js`
- `backend/routes/inviteRoutes.js`
- `backend/tests/inviteHelpers.test.js`
- `frontend/src/components/InviteRecipientsForm.tsx` (new)
- `frontend/src/utils/inviteHelpers.ts` (new)
- `frontend/src/components/Invitations.tsx` (surgical)
- `frontend/src/components/Navbar.tsx` (Invitations badge)

### Tests

| Suite | Result |
|-------|--------|
| `inviteHelpers.test.js` | **19/19 PASS** |
| `friends.test.js` | **8/8 PASS** |
| `paymentRequestSettlement.test.js` | **16/16 PASS** |
| `sharedAccountArchive.test.js` | **PASS** |
| `sharedAccountAccess.test.js` | **12/12 PASS** |
| Combined above | **74/74 PASS** |
| Frontend build | **PASS** |
| Frontend `App.test.tsx` | **1/1 PASS** |

### Deferred

- `/invites/send-bulk`
- Tokenised public invite links
- Auto-friend on send
- Generic Messages / PaymentRequestMessages product
- Invitations rename

### Next

Integration 7 â€” ParticipantCount / archived finance UI is **safe to begin**.
**Do not push** unless separately requested.

---

## Integration 7 â€” Participant count decision + archived activity history

**Branch:** `integrate-pre-marketing-features`
**Source inspected:** `pre-marketing-wip` (no merge / no wholesale cherry-pick / stash not restored)

### ParticipantCount decision: **SKIPPED**

Recovered `ParticipantCount.tsx` is a tooltip/modal â€œN members / Participantsâ€ control.

Current product already shows traveller counts on Trip Money list cards and detail (`getParticipantCount` â†’ â€œN travellersâ€), plus contribution progress hero and Close-out traveller rows.

Migrating the component would add clutter and regress wording (â€œmembersâ€ / â€œParticipantsâ€). No new component was added.

### Archived vs permanently deleted

| State | SharedAccount | FinanceRecord | Where to view |
|-------|---------------|---------------|---------------|
| Soft-archived | Exists (`isDeleted`) | May have `archivedAccountName` **and** still linked `sharedAccount` | Trip Money â†’ Archived (read-only) |
| Permanently deleted | Removed | `archivedAccountName` set; `sharedAccount` unset | Activity history â†’ Archived Trip Money history |

### Archived activity endpoint

`GET /api/finance/archived` (auth required)

Authorisation rule:

- `user: req.user.userId` only (no client-supplied user id)
- `archivedAccountName` present and non-empty
- `sharedAccount` null/missing (permanently deleted history only)

Sorted newest first. Soft-archived linked rows are **excluded** (still belong to archived Trip Money views).

Mutations: update/delete of permanently deleted history rows return **400** (historical only).

### UI placement

`FinancialRecords.tsx` (Activity history under More):

- **Current activity** â€” personal tracked rows (excludes permanently deleted history from personal totals)
- **Archived Trip Money history** â€” preserved rows with pot name; no `/shared-accounts/...` links; no mutation actions

Personal Finance: **unchanged** (no duplicate archive section).

### Files

- `backend/controllers/financeController.js`
- `backend/routes/financeRoutes.js`
- `backend/tests/archivedFinanceHistory.test.js`
- `frontend/src/components/FinancialRecords.tsx`
- `implementation/IMPLEMENTATION_NOTES.md`

### Tests

| Suite | Result |
|-------|--------|
| `archivedFinanceHistory.test.js` | **5/5 PASS** |
| `inviteHelpers.test.js` | **19/19 PASS** |
| `friends.test.js` | **8/8 PASS** |
| `paymentRequestSettlement.test.js` | **16/16 PASS** |
| `sharedAccountArchive` + `sharedAccountAccess` | **PASS** |
| Combined above | **79/79 PASS** |
| Frontend build | **PASS** |
| Frontend `App.test.tsx` | **1/1 PASS** |

### Deferred

- Migrating `ParticipantCount.tsx`
- Duplicating archived history into Personal Finance
- Group-wide archive endpoints (would leak other travellersâ€™ personal rows)

### Next

Integration 8 â€” documentation consolidation / final integration review is **safe to begin**.
**Do not push** unless separately requested.

---

## Integration 8 â€” Final integration review + documentation consolidation

**Branch:** `integrate-pre-marketing-features`
**Base:** `main` @ `b4964d2`
**No merge / cherry-pick of `pre-marketing-wip`; stash@{0} retained as backup; no push.**

### Commit series since main (expected + present)

| Commit | Integration |
|--------|-------------|
| `a9fb01b` | 1 â€” Friends |
| `f2f9dec` | 2 â€” Auth user shape |
| `9f6edd1` | 3 â€” Historical Trip Money read |
| `35f276d` | 4 â€” Archive / organiser controls |
| `a7cf12c` | 4.5 â€” Settlement history preservation |
| `6c14dfb` | 5 â€” Settlement workflow |
| `4981ef3` | 6 â€” Invitation helpers |
| `8cd961a` | 7 â€” Archived activity history |
| *(this commit)* | 8 â€” Final review / docs |

No unexpected feature commits beyond this series.

### Diff classification (`main` â†’ branch)

- **Friends:** friendController/routes/service, Friends.tsx, App route, Navbar More
- **Auth:** formatUserForClient / AuthContext mapUserFromApi
- **Trip Money access:** sharedAccountAccess.js, finance/sharedAccount guards, access tests
- **Archive/admin:** soft archive, transfer, permanent delete, archive tests
- **Settlement:** PaymentRequest model/controller/routes, settlement tests, Trip Money UI
- **Invitations:** invite controller/routes, InviteRecipientsForm, inviteHelpers, badges
- **Archived activity:** GET /finance/archived, FinancialRecords section, history tests
- **Tests / docs:** new suites + IMPLEMENTATION_NOTES + docs/DEPLOYMENT.md + README

`backend/tests/sharedAccount.test.js` path fix only (User model import) â€” belongs with access/archive hygiene.

### FINAL INTEGRATION SUMMARY (1â€“7)

1. **Friends** â€” contact list under More; no Trip Money permission
2. **Auth shape** â€” `id`, names, email, age, interests, createdAt; no password
3. **Historical read** â€” former participants with own FinanceRecord can read; mutate denied
4. **Archive/admin** â€” organiser archive; transfer to current member; permanent delete archive-first
4.5 **Settlement history** â€” preserve PaymentRequest history; cancel pending; stamp archivedAccountName
5. **Settlement workflow** â€” cancel pending; actionable count; approve/reject guards; no withdrawal requestType
6. **Invitation helpers** â€” Friends picker; sequential multi-send; readAt/unread; mutual friend on accept; no public tokens
7. **Archived activity** â€” personal permanently-deleted history in Activity history; ParticipantCount skipped

### Deliberately not recovered

- Messages hub / Invitations rename
- PaymentRequestMessages product
- ParticipantCount component
- `/invites/send-bulk`
- Auto-friend on invite **send**
- Customer-facing withdrawal requestType
- Public invite tokens
- Finance-first Dashboard as landing
- Real Stripe/PayPal/wallet/card/FX money movement
- Bulk Railway troubleshooting markdown dump

### Security model (integrated)

- Auth on Friends / Trip Money / invites / finance / settlements
- Own friend list only; friendship â‰  membership
- `canRead` â‰  `canMutate`; archived â‡’ no mutate
- Settlement: participant + terminal-state + atomic execute claim
- Invites: recipient-only accept; sender cancel/resend; archived pot blocks
- Archived finance history: `user = req.user.userId` only

### Non-custodial prototype limitation

SHARE is a **coordination/tracking** prototype. Ledger totals are recorded activity, not held bank balances. Settlement â€œapprovalâ€ records ledger outputs; it does not send bank payments.

### Customer-facing copy fixes in Integration 8

- README rewritten to trip-first / non-custodial prototype positioning
- `RAILWAY_DEPLOYMENT.md` credential-looking Mongo URI redacted to placeholders
- Misleading SharedAccounts JSDoc (â€œTransfers moneyâ€¦â€) corrected to ledger wording
- Activity history code comments updated (Total Balance / Shared Accounts â†’ tracked total / Trip Money)

### Railway / deployment documentation decision

Created **`docs/DEPLOYMENT.md`**: root directories (`backend` / `frontend`), env vars (no secrets), smoke checks.
Did **not** import the bulk Railway incident dump. Root README now points here.

### Product deferred

- Real-money payment provider / regulated pooled money
- Group cards, FX, FSCS/safeguarding claims
- Public tokenised invite links
- Full settlement-history API feed (pending-only list remains)
- Unarchive/restore Trip Money
- Solo pot `requiredApprovals: 0` auto-execute on create

### Technical debt

- Legacy backend suites / rate-limit flakiness when run in parallel
- Email-enumeration messaging on Friends add
- Unused `Dashboard.tsx` still contains â€œShared Accountsâ€ (not routed)
- Internal API paths `/shared-accounts`, `/events` vs customer Trips / Trip Money
- Root Railway markdown remains historical; prefer `docs/DEPLOYMENT.md`

### Stash

`stash@{0}` was **not** restored and **not** dropped.

### Next

Branch is ready for a later GitHub push + PR into `main` when explicitly requested.
**Do not push / do not open PR from this integration task.**

---

## Trip Money create surface restored (main)

**Cause:** `POST /api/shared-accounts` still worked, but `SharedAccounts.tsx` on marketing-aligned `main` had no create control (empty state incorrectly sent users to Invitations). Create UI still existed on `pre-marketing-wip` only.

**Fix (smallest):** Restored a **Set up Trip Money** button (header + list + empty state) and a create modal posting `name`, `description`, `targetAmount`, `targetDate` to the existing endpoint. Optional `?name=` prefill supported. No Event↔SharedAccount schema link. No stash/WIP merge.

**Manual check:** Trip Money → Set up Trip Money → create pot → lands on detail page.

---

## Trip Money close-out progressive UI (main)

**Cause:** Reaching the contribution target only changed Close-out copy. Collection actions stayed primary, and archive lived only in organiser settings — no clear finish-square close.

**Fix (frontend only):** When Close-out status is `ready_to_review` or `review_difference` and the pot is not archived:

- Banner: **Contribution target reached** (or above-target wording). No paid/payout language.
- Primary: **Review Trip Close-out** (scroll/focus existing section).
- Optional: **Request settlement record** — documents a ledger adjustment; not required to close; execution semantics unchanged.
- Finish: **Close Trip Money** reuses existing organiser archive (`DELETE /api/shared-accounts/:id`). Modal: Close Trip Money? / Keep open. No new schema or close endpoint.
- Collection actions (record contribution, invite, reverse, edit) sit under **More actions**.
- Organiser transfer demoted under **More organiser actions**.
- Closed pots show **This Trip Money is closed** (read-only history). Admin settings may still say Archived.

**Deliberately unchanged:** PaymentRequest execute still writes a ledger `output` (can reduce recorded total). Separate design later. No auto-settlement, no auto-archive, no real-money action.

---

## Task 1 — Trip as central container (Trip ↔ Trip Money)

**Purpose:** One Trip is the container. Its Trip Money is reached from inside that Trip.

**Relationship chosen:** optional `SharedAccount.event` → `Event` (sparse unique). Event documents are unchanged. Existing/recovered pots without `event` stay fully usable and unlinked. No destructive migration; no auto-linking by name.

**Behaviour:**
- `GET /events` and `GET /events/:id` attach `tripMoney: { _id, name, isDeleted } | null`
- `POST /shared-accounts` accepts optional `eventId` (must be caller’s trip; rejects a second pot for the same trip)
- Trip cards: **Set up Trip Money** or **Open Trip Money** / **View closed Trip Money**
- `/shared-accounts?event=&name=` prefills create and posts `eventId`; if already linked, opens that pot
- Top-level Trip Money nav remains for unlinked/legacy pots

**Files:** `backend/models/SharedAccount.js`, `backend/controllers/sharedAccountController.js`, `backend/controllers/eventController.js`, `frontend/src/components/EventCountdown.tsx`, `frontend/src/components/SharedAccounts.tsx`, new trip-link tests.

**Tests:** frontend build PASS; frontend 9/9 PASS; `tripEventLink` 5/5 PASS; archive + access + inviteHelpers 50/50 PASS. No Event suite existed previously.

**Risks:** unique index is created on next app start; recovered data is not rewritten. Deleting a Trip does not delete its pot (pot may keep a dangling `event` id). One pot per trip — archived linked pot still occupies the slot until permanently deleted.

**Not in this task:** equal split, approvals redesign, chat, map, gallery, nav removal of standalone Trip Money.

---

## Task 2 — Simplify Trip Home

**Purpose:** After Task 1 linked Trip → Trip Money, the trip list was still a busy event card (description, date, destination, budget, accommodation, live countdown, stats). Users needed a calm Trip Home that answers: which trip, how long until it, how the pot is doing, who is in the group, and what to do next.

**Trip Home before:** There was no `/events/:id` page. `/events` (`EventCountdown.tsx`) was both create-trip and a dense card per trip. Members were not shown. Money was only a Set up / Open / View closed button with explanatory copy. Countdown was `Xd Xh Xm Xs` (or “Trip has passed”).

**Trip Home after / correction:** `/events` is an index (name, countdown, optional money line, clickable card, secondary Remove trip). Card clicks go **directly** to Trip Money, Set up Trip Money, or the closed pot. `/events/:id` is a redirect only. Budget/accommodation blocks, stats, and list-level Trip Money buttons are gone.

**Trip card navigation polish:** The whole card is the entry point (`role="link"`, Enter/Space, hover/focus). Clicks on Remove trip do not navigate. Open / Review / View closed Trip Money buttons are not on the list.

**Trip Home step removed:** Card clicks go directly to the linked pot, the Set up Trip Money flow (`?event=&name=`), or the closed pot. `/events/:id` no longer renders a working page; it redirects with `replace` to the same destination. Countdown/group helpers remain in `frontend/src/utils/tripHome.ts` for later reuse. No duplicate Trip UI.

**Countdown:** Uses the Trip `eventDate` (not the contribution deadline). Future → `42 days to go`; same calendar day → `Today`; past → `Trip completed`. Shared helper `tripCountdownLabel` (no second live ticker).

**Money summary:** Reuses existing ledger math on attached Trip Money (`inputs − outputs` for `recordedTotal`; current user’s `input` sum for `yourContribution`). Shows `£X of £Y contributed` plus optional “Your contribution” and contribution deadline. Does **not** show personal remaining / equal share (Task 3). Closed pot: **Trip Money closed**, still links to read-only details.

**Primary-action lifecycle:**
- No linked pot → Set up Trip Money
- Active + target not reached → Open Trip Money
- Active + recorded ≥ target → Review Trip Money
- Archived/closed → View closed Trip Money

**Group:** Organiser (`Event.user`) + `sharedWith` + linked pot owner/members, de-duplicated. Initial letter chip + first name + Organiser pill. No new avatar/profile infrastructure.

**Supporting links:** Existing `/gallery` and `/map` only. No Chat. No Next-up planner (no trip-scoped plan items exist).

**Organiser/admin:** Remove trip stays on the list as a secondary control. Delete / transfer / history / reverse contribution stay inside Trip Money.

**Deliberately deferred:** equal split, contribution overrides, saving guidance, lock-after-first-contribution, approval mode, supplier payment, chat, recommendations, voting, new gallery/map, real money.

**Backend change:** `attachTripMoneyToEvents` now includes `targetAmount`, `targetDate`, `recordedTotal`, `yourContribution`, `owner`, `members`. Events populate `user` and `sharedWith` for names. No schema change.

**Tests:** frontend build PASS. Frontend 7 suites / 23 tests PASS (was 5/9 before this task; added Trip Home + helper tests, no regressions). `tripEventLink` 6/6 PASS (was 5; added recorded-total assertion). SharedAccount suites not re-run — create/archive controllers were not changed.

**Risks:** Group on recovered trips may only show the organiser if `sharedWith` and pot `members` are empty. List still has a money CTA (same lifecycle as home) so Task 1 one-click Open remains. Photos/Map are global, not trip-filtered.

---

## Task 3 — Equal share and your remaining

**Purpose:** After Task 2, users could see group recorded vs target, but not a safe personal remaining figure. Task 3 adds equal per-member share and **Your remaining** from existing Trip Money membership only.

**Behaviour:**
- Participants = unique pot `owner` + `members` (not Event.sharedWith, not invented travellers).
- Equal share = target ÷ participant count, rounded to 2 decimals. No target or no participants → no share and no remaining.
- Your remaining = max(0, equal share − your recorded contribution). Never negative. Never faked.
- Shown on Trip Money detail (working experience) and as compact text on the trip card when a live pot has enough data.
- Copy: guidance only; unequal contributions still allowed. Not a binding debt.

**Not in this task:** individual overrides, saving guidance, lock-after-first-contribution, approval mode, schema changes, relinking recovered pots.

**Files:** `frontend/src/utils/tripHome.ts`, `SharedAccountDetail.tsx`, `EventCountdown.tsx`, focused tests, these notes.

**Backend/schema/data:** unchanged. Existing `perPersonAmount` field is not written by this task; the UI calculates live from current members.

**Tests:** frontend 8 suites / 28 tests PASS (was 7/23). `tripEventLink` 6/6 PASS. Frontend production build PASS.

---

## Task 4 — Direct prototype contribution (Pay account)

**Why Personal Account was a prerequisite:** “Record contribution” posted a personal `FinanceRecord` `output` and a Trip Money `input`, then blocked if the personal tracked total was too low. Backend `POST /api/finance` never required a personal balance — only auth, amount > 0, and `canMutateSharedAccount` (current member, not archived).

**After:** Trip Money **Pay account** posts a single pot `input`. No personal output. No personal-balance check. Personal Account pages remain but are not required for this journey.

**Journey:** Trip Money → Pay account → enter amount (partial or full remaining allowed) → ledger input. Context: Your share / Already contributed / Remaining (Task 3 helpers).

**Wording:** customer action **Pay account**. Disclaimer: “Prototype: this records your contribution for testing. No money is transferred.” No card/deposit/held-by-SHARE/safeguarding claims.

**Kept:** auth, membership, archived read-only, contribution history, target progress, Task 3 remaining. Frontend still refuses contributions that would exceed the **group target** (existing rule; reported, not removed). Equal share is not a hard cap.

**Deferred:** debit cards, saved payment methods, Stripe/PayPal/wallets. SHARE must never store PAN/CVV.

**Schema/data:** unchanged. Recovered Mongo data not modified.

**Tests:** frontend 9 suites / 34 tests PASS (was 8/28). Frontend build PASS. `directContribution` 4/4; `tripEventLink` 6/6; `sharedAccountArchive` 19/19; `sharedAccountAccess` included in that 41/41 combined run. No new regressions. Legacy `sharedAccount.test.js` not run (known flaky; unchanged).

**Activity history follow-up:** `GET /finance?sharedAccount=` now populates `user` (`firstName lastName email`). The detail page no longer calls non-existent `GET /users/:id` (that produced “Unknown User”). Activity rows use name, or email as fallback. Frontend still maps a string user id to pot owner/members if history is not populated.

---

## Task 5 — Pay single payment

**Wording:** customer action **Request settlement record** → **Pay single payment**. Related copy uses payment request / payment approval / payment history. Internal model remains `PaymentRequest`.

**Availability:** only when Trip Money is active and `recordedTotal >= targetAmount`. Below target: disabled button plus “Available once the contribution target is reached.” No target: hidden. Archived: hidden. Backend `POST /api/payment-requests` rejects below-target, no-target, and archived creates.

**Amount:** always the contribution `targetAmount`, not a user-entered figure and not the current recorded total. Frontend posts that amount; backend rejects any other amount (pence-rounded). Above-target pots can still create a request, but the amount stays the target.

**Form:** Amount (read-only), Supplier / payee, Reference, optional note. Primary action **Create payment request**. Disclaimer: “Prototype: this records the group’s proposed final payment. No money is transferred.” Payee/reference are stored in `description` (no schema change).

**Personal Account:** removed from this flow. Detail page no longer fetches `/finance` personal records or blocks on personal tracked total.

**Lifecycle unchanged:** statuses still pending / approved / rejected / executed / cancelled. Approve/reject/cancel rules unchanged. Duplicate-execution protection unchanged.

**Execution-semantics conflict (reported, not changed):** when the last required approval is recorded, the server still writes a pot `FinanceRecord` `output` for the request amount and that reduces `recordedTotal`. That does not match the future “pay the supplier the full target and then close the pot” product vision. This task does not invent a new completion state or auto-archive.

**Archive:** still read-only; payment requests cannot be created or mutated.

**Not in this task:** real supplier payments, full extra approval UX beyond existing votes, auto close/archive (Task 6).

**Files:** `paymentRequestController.js`, `SharedAccountDetail.tsx`, `SharedAccounts.tsx`, `Navbar.tsx`, `tripHome.ts`, focused tests, these notes.

**Schema/data:** unchanged. Recovered Mongo data not modified.

**Status colour polish:** below target the control is red/`btn-danger`, disabled, and labelled “Target not reached”. At/above target it is green/`btn-success`, enabled, and labelled “Ready to pay”. Colour is not the only cue.

**Pay now CTA:** when the target is reached on an active pot, a prominent green **Pay now** button is the first action on the detail page and on matching `/shared-accounts` cards. List **Pay now** navigates to `/shared-accounts/:id?pay=now`, which opens the existing Pay single payment form (fixed target amount, payee, reference, prototype disclaimer). It does not execute a payment. Hidden below target, with no target, and when archived. Card click still opens the pot; Pay now uses stopPropagation.

**Tests:** frontend 11 suites / 47 tests PASS (was 9/34). Frontend production build PASS. Combined backend `paymentRequestSettlement` + `directContribution` + `sharedAccountArchive` + `sharedAccountAccess`: 4 suites / 56 tests PASS (`paymentRequestSettlement` 21/21; `directContribution` 4/4; `sharedAccountArchive` 19/19; `sharedAccountAccess` 12/12). Legacy `sharedAccount.test.js` not run (known flaky; unchanged).

---

## Task 6 — Payment approval + completion lifecycle

**Purpose:** Make the final-payment approval flow understandable, and stop completed payments from wiping contribution history. Do not build real payments. Do not auto-archive (Task 7).

**Contribution history vs payment completion:** These are separate. Contribution progress is how much the group recorded toward the event (example: £2,000 of £2,000, 100% funded). Final payment status is a `PaymentRequest` (example: £2,000 to Example Hotel, completed). Completing the payment must not erase or reduce the funding total.

**Previous broken behaviour:** The last required approval set `PaymentRequest.status` to `executed` and created a pot `FinanceRecord` `output`. Funding progress was `inputs − outputs`, so a fully funded pot could fall to £0 of £2,000. Individual input totals were already input-only, so “Your remaining” stayed correct while the progress bar was wrong.

**Chosen fix (smallest, backward compatible):**
- New completions do **not** create a FinanceRecord output. The executed `PaymentRequest` is the completed-payment record.
- Contribution progress uses `contributionProgressTotal`: inputs minus outputs, except outputs that match a completed PaymentRequest (`executed` / `approved`) by amount + description. Genuine contribution reversals still reduce funding.
- Internal status remains `executed`. Customer copy uses **Payment completed**.
- A second final payment is blocked while a pending or completed request exists for the pot.
- `GET /payment-requests?sharedAccount=` returns full history so completed payments stay visible. Default list GET includes pending plus executed/approved so list cards can hide **Pay now**. Unread-count stays pending-only.

**Backward compatibility:** No schema rename, no destructive migration, recovered Mongo documents not rewritten. Legacy executed requests that already have matching outputs remain readable; those outputs are skipped in contribution progress. New completions do not create that output.

**Approval wording:** Approve payment / Reject payment / Cancel payment request. Status: Waiting for approval. Approvals display counts the proposer in the customer total (example 1 of 2, then 2 of 2) without changing the rule: the proposer cannot approve their own request; `requiredApprovals` is still other current travellers.

**Completed-payment wording:** Payment completed, with supplier/payee, amount, reference, and one prototype note: “Prototype payment record — no real money was transferred.” After completion, **Pay now** is hidden and **Close Trip Money** is the primary next action. The pot is not auto-archived.

**Tests:** frontend 12 suites / 60 tests PASS (was 11/47). Frontend production build PASS. Combined backend `paymentRequestSettlement` + `directContribution` + `sharedAccountArchive` + `sharedAccountAccess`: 4 suites / 63 tests PASS (`paymentRequestSettlement` 28/28; `directContribution` 4/4; `sharedAccountArchive` 19/19; `sharedAccountAccess` 12/12). Legacy `sharedAccount.test.js` not run (known flaky; unchanged).

**Remaining risks:**
- Solo pots (`requiredApprovals === 0`) still do not auto-complete on create (pre-existing).
- Activity history may still show a legacy settlement output as a cost/reverse row; it is historical and is not deleted.
- Matching legacy outputs to payments uses amount + description; an unrelated output with the same amount and description would also be ignored in progress (unlikely).

---

## Task 7 — Close Trip Money after payment completed

**Purpose:** Make Close → Archive the normal successful end of the Trip Money lifecycle after a completed final payment. Do not build real payments, chat, or Task 8 work.

**Lifecycle:** Payment completed → Close Trip Money → archived (soft). Closing is not permanent deletion. History stays readable.

**Primary close rule:** **Close Trip Money** is the primary next action only when the pot is active and has a completed/executed final payment. Target reached still leads to **Pay now**. Admin **Archive Trip Money** remains available under More / organiser settings before payment completion (same soft-archive endpoint). No permissions redesign.

**After close:** `DELETE /api/shared-accounts/:id` still sets `isDeleted` + `deletedAt` and stamps `archivedAccountName` on FinanceRecords. It does not unlink `event`, delete FinanceRecords, or delete PaymentRequests. The UI then returns to `/shared-accounts?archived=1` (active list no longer includes the pot; archived section opens).

**Read-only:** Existing mutate guards remain. No Pay account, Pay now, approvals, invites, target edits, or new contributions on archived pots. Permanent delete stays secondary on already-archived pots only.

**Archived list:** Existing “Show archived Trip Money” filter. Cards show **Closed** and open the read-only detail.

**Permanent delete:** Unchanged. Requires archive first. Distinct wording. Preserves settlement/payment history with `archivedAccountName`.

**Schema/data:** unchanged. Recovered Mongo data not modified.

**Tests:** frontend 12 suites / 64 tests PASS (was 12/60). Frontend production build PASS. Backend `sharedAccountArchive` + `sharedAccountAccess` + `paymentRequestSettlement` + `directContribution` + `tripEventLink`: 5 suites / 69 tests PASS (`sharedAccountArchive` 19/19; `sharedAccountAccess` 12/12; `paymentRequestSettlement` 28/28; `directContribution` 4/4; `tripEventLink` 6/6). Legacy `sharedAccount.test.js` not run (known flaky; unchanged).

**Remaining risks:**
- Organiser can still admin-archive before payment completion via Archive Trip Money (intentional).
- Solo pots still do not auto-complete a final payment (pre-existing), so the primary Close path may not appear without another traveller’s approval.
- Task 8 not started.

---

## Task 8 — Simplify SHARE wording and remove UI clutter

**Purpose:** Make the existing Trip Money journey clearer for a first-time user. Copy, headings, and hierarchy only. Do not change contribution math, Pay now gating, PaymentRequest lifecycle, archive backend, schema, or recovered data. Task 9 not started.

**Customer-language simplification:** SHARE should sound simple and collaborative, not like accounting software. Internal names (`SharedAccount`, `FinanceRecord`, `PaymentRequest.status === 'executed'`, `pendingSettlementRequests`) stay in code.

**Major BEFORE → AFTER wording**

| Surface | Before | After |
|---|---|---|
| Trip Money list | Your shared trip costs; £X of £Y recorded; Remaining; Recorded total; Payment pending | Your Trip Money; contributed; Still needed; Contributed so far; Waiting for approval |
| Detail hero | Shared trip costs; Contribution target; Recorded total; Remaining to contribute; Equal share | Trip name + purpose; Target; Contributed; Still needed; Each person |
| Personal | Equal share is guidance… (plus reverse available line) | Your contribution / Your remaining; one equal-split guide line |
| Travellers | Traveller contributions; Recorded; Suggested share; Remaining (vs share) | Who has contributed; Contributed; Share; Remaining; Done / Still to go |
| Activity | Group spending record (last 24 hours); Type table | Recent activity; “Sam contributed £100” |
| Final payment | Pay single payment competing with Pay now; red disabled control below target | Pay now at 100%; form title Final payment; “Final payment unlocks at 100%.” below target |
| Approval | (status labels already customer-facing) | Waiting for approval; Approvals N of M; Approve / Reject / Cancel payment |
| Close | Trip Close-out; End of trip review; settlement/ledger copy; duplicate Close | Payment completed → Close Trip Money; archived: Trip Money closed / Read-only history |
| Invitations | shared trip costs | Trip Money |

**Duplicated content removed:** second target/traveller totals in Trip Close-out; repeated equal-share explanations; hero bank-account disclaimer (kept one on the list page and one in Pay account / Final payment forms); Organiser next steps duplicating Pay account; Review Trip Close-out; second Close Trip Money block; red disabled Pay single payment; extra Pay account in empty activity.

**Primary-action hierarchy**
- Below target: **Pay account** (Invite / Edit secondary; reverse under **More**)
- 100%: **Pay now** (other actions under **More**)
- Pending: **Waiting for approval**
- Payment completed: **Close Trip Money**
- Closed: no active action

**Disclaimers retained (once each, not repeated through the page)**
- Pay account: “Prototype: this records your contribution for testing. No money is transferred.”
- Final payment form: “Prototype: this records the group’s proposed final payment. No money is transferred.”
- Completed payment: “Prototype payment record — no real money was transferred.”

**Functionality deliberately unchanged:** contribution totals, equal-share math, Personal Account behaviour, Pay now gating, PaymentRequest create/approve/reject/cancel/execute, archive `DELETE`, one-pot-per-trip, schema, database data.

**Colour / accessibility:** existing traveller Done (green) / Still to go (amber) pills and named amounts kept. Progress bar gradient unchanged. Waiting for approval uses warning red; Payment completed stays green. Colour is not the only identifier.

**Tests:** frontend 12 suites / 65 tests PASS (was 12/64). Frontend production build PASS. Backend not run (no backend files touched).

**Remaining risks:**
- SharedAccounts still contains a leftover list-page Final payment modal that is not opened by the current Pay now path (detail `?pay=now` is used instead). Copy was cleaned; behaviour unchanged.
- Recent activity still shows only the last 24 hours; older history is not listed in that section.
- Personal Finance / Financial Records still use older “recorded / settlement” wording; they are outside the primary Trip Money journey and were not rewritten.
- Task 9 not started.

---

## Task 9 — End-to-end regression and demo polish

**Purpose:** Final pre-demo quality pass for the two-user Trip Money lifecycle. No new product features. No chat, map, gallery, recommendations, voting, real banking, cards, FX, or supplier payments. Task 10 not started.

### Demo script (two users)

**USER A — organiser**

1. **Create a Trip** on `/events` → **Create trip** → name, date, time → **Save trip**.  
   Expected: trip card appears. Clicking it opens Trip Money setup (`/shared-accounts?event=…`).
2. **Set up Trip Money** → name, what it is for, target, target date → **Create Trip Money**.  
   Expected: opens `/shared-accounts/:id` with Target / Contributed / Still needed. One pot per trip.
3. **Set target** is already done at create. Edit details only if you need to change it.
4. **Invite User B** → **Invite traveller** → email matching User B’s SHARE login → **Send trip invitation(s)**.  
   Expected: invitation shows as pending. User B must log in with that email.

**USER B — invited traveller**

5. Open **Invitations** → **Accept invitation**.  
   Expected: User B is taken into the linked Trip Money. They now count in Travellers / Each person.

**BOTH**

6. Confirm **Each person** = target ÷ (organiser + travellers). Equal split is a guide; amounts can differ.
7. Each uses **Pay account** to record a contribution. Prototype note: no money is transferred.
8. When **Contributed** equals **Target**, the bar is **100%** and **Pay now** is the primary action.

**USER A**

9. **Pay now**.
10. Enter **Supplier** and **Reference** → **Create payment request**.  
    Expected: amount is the target; **Waiting for approval**. Duplicate Pay now is blocked.

**USER B**

11. **Approve payment**.  
    Expected: Approvals 2 of 2. Status becomes **Payment completed**. Progress stays **£target of £target / 100%**. No contribution history is wiped.

**USER A**

12. See **Payment completed** and **Close Trip Money** as the next action.
13. **Close Trip Money** → confirm.  
    Expected: soft archive. Redirect to `/shared-accounts?archived=1`. Active list no longer shows the pot.
14. Open **Archived Trip Money**.
15. Confirm **Trip Money closed**, read-only history, target/contributions/final payment still visible. No Pay account / Pay now.

### Changes in this pass
- Accept invitation now opens the linked Trip Money (avoids a dead-end on Invitations).
- Payment request success uses an in-page notice instead of `alert()`.
- Double-submit guards on Pay account, final payment, approve/reject/cancel, close, accept, create trip.
- Demo errors mapped away from Axios/Mongo/`Shared account` wording where they reached the UI.
- Narrow screens: contribution stats stack to two columns; primary/invite buttons get a larger tap target.
- Tests added for create trip, accept→open pot, close→`archived=1`, duplicate pending payment, and customer error mapping.

### Functionality unchanged
Contribution math, Pay now gating, PaymentRequest lifecycle, archive backend, one-pot-per-trip, schema, recovered Mongo data.

**Tests:** frontend 14 suites / 70 tests PASS (was 12/65). Frontend production build PASS. Backend lifecycle suites PASS: `paymentRequestSettlement`, `directContribution`, `sharedAccountArchive`, `sharedAccountAccess`, `tripEventLink`, `inviteHelpers`, `archivedFinanceHistory`, `friends` (8 suites; includes new duplicate-pending payment test). Combined run with `user.test.js`: 9 suites, 112 tests, **6 failed / 106 passed**. The 6 failures are in `user.test.js` only (register response shape `success` undefined; one 429 rate-limit). Those tests were not changed in Task 9. Legacy `sharedAccount.test.js` not run (known flaky; unchanged).

**Readiness:** B — DEMO READY WITH MINOR KNOWN ISSUES

**Remaining risks:**
- Solo pots still cannot complete final payment (proposer cannot self-approve; `requiredApprovals` is 0). Demo must use two travellers.
- Over-target contributions are blocked in the UI, not in `POST /finance`. Do not demo API bypass.
- Recent activity still shows only the last 24 hours; older rows remain in Who has contributed.
- Leftover unused list-page Final payment modal in `SharedAccounts.tsx` is not on the current Pay now path.
- Invitations still require a matching registered email; there is no public invite token link.
- Trip list contribution totals refresh on load, not live.
- Personal Finance / Financial Records still use older recorded/settlement wording (outside the demo path).

---

## Task 10 — Home balance + unified Trip creation

**Purpose:** Show the user’s personal tracked balance on Home, and create linked Trip Money in the same Create Trip flow. No Task 11 work. No recovered Mongo edits.

### 10A — Personal balance on Home

**Source of truth:** `GET /api/finance` FinanceRecords, same formula as Activity history (`FinancialRecords.tsx`): personal inputs minus outputs, excluding rows with `sharedAccount` and permanently deleted Trip Money history (`archivedAccountName` without `sharedAccount`). There is no backend balance endpoint. Helper: `frontend/src/utils/personalBalance.ts`.

**Home:** `EventCountdown` (`/events`, logged-in landing) now shows a **Your balance** card. Informational only. Does **not** gate Pay account, contributions, invites, or final payment.

**Wording:** `Prototype balance — no real money is held.` £0.00 is shown when there are no personal records. Fetch failure keeps trips usable and does not show raw Axios/Mongo errors.

### 10B — Unified Trip + Trip Money creation

**Before:** `POST /events` then a separate **Set up Trip Money** step (`POST /shared-accounts` with `eventId`).

**After:** Create Trip form includes Target. Submit calls `POST /api/events/with-trip-money`, which creates the Event then a linked SharedAccount and returns both. The UI navigates straight to `/shared-accounts/:id`. No Set up Trip Money step for new trips.

**Architecture:** Event and SharedAccount models are unchanged. Link remains `SharedAccount.event`. One-pot-per-trip unique sparse index unchanged. `POST /events` and `POST /shared-accounts` remain for legacy/setup fallback.

**Partial failure:** If pot save fails after Event save, the new Event is deleted (`Event.deleteOne` for that id/owner only). No Mongo transactions (not used in this app).

**Legacy:** Trips without a pot still use Set up Trip Money. Unlinked SharedAccounts appear in a secondary **Shared Accounts** section on Trips (wording updated in 10D). Closed linked pots still open archived/read-only history from the trip card.

### 10C — Trips is the single main entry point

Primary nav is **Trips · Notifications · More** (Notifications label from 10D; route remains `/invitations`). The standalone **Trip Money** nav item is gone. `/shared-accounts` and `/shared-accounts/:id` stay routed for setup fallback and deep links.

**Access:**
- Active linked pot: trip card → `/shared-accounts/:id`
- Closed linked pot: trip card → archived/read-only pot
- No-pot trip: trip card → setup fallback
- Unlinked/legacy pots: shown only when they exist, as **Shared Accounts** at the bottom of Trips (active + archived lists, `event` unset). Not auto-linked. No fake Event created.

**Back:** Trip Money detail uses **Back to Trips** (`/events`). Close/archive/leave/delete also return to Trips.

**Tests:** Navbar has no Trip Money link; trip-card and create-flow tests remain; unlinked pots stay reachable; Home balance and unified create still pass.

**Validation:** target must be > 0; trip name/date/time remain required. Double-submit guarded with a ref + disabled button. Errors go through `userFacingError`.

**Target date:** pot `targetDate` is the trip date at 23:59 if still in the future, otherwise tomorrow. Not a new user-facing field.

### Tests / remaining risks

Frontend: Home balance, unified create, existing trip-card navigation, Pay account, close/archive. Backend: `tripEventLink` combined create, £0 target, pot-failure rollback; existing archive/access/contribution/payment/invite suites.

**Remaining risks:** Two overlapping Create Trip requests from two tabs can still create two trips. Solo pots still cannot complete final payment. Personal budget planner on the create form is unchanged secondary UI. Task 11 not started.

### 10D — Customer-facing wording: Shared Accounts + Notifications

Wording/UI-label only. Routes, APIs, SharedAccount model, invitations backend, and component filenames are unchanged.

**Shared Accounts:**
- List heading **Your Trip Money** → **Shared Accounts** (`SharedAccounts.tsx`). Nearby empty copy is **No shared accounts yet**.
- The unlinked-pot collection on Trips (**Older Trip Money**) is also labelled **Shared Accounts**. Supporting line: older shared accounts not linked to a trip.
- Per-trip wording kept: Close Trip Money, Trip Money closed, Set up Trip Money, Trip Money target, etc. No `SharedAccount` without a space.

**Notifications:**
- Primary nav label **Invitations** → **Notifications**. Route still `/invitations`.
- Screen heading **Trip invitations** → **Notifications**, with supporting line **Trip invitations and updates**.
- Invitation-specific actions kept: Accept invitation, Invitations you sent, Invite travellers.
- Payment-request badges stay on Trips (10C). No new notification backend.

**Tests / build:** Frontend `18` suites / `91` tests passed. Production build compiled successfully. Backend files not touched for 10D.

No commit / no push / stash@{0} untouched. Task 11 not started.

### 10E — Generalise SHARE beyond trips

SHARE is now presented as a general shared-money product. The customer-facing object is **Shared Account**, not Trip / Trip Money.

**Customer language:**
- Nav: **Shared Accounts · Notifications · More**. Route `/events` unchanged.
- Main page heading is **Shared Accounts** (one heading). Supporting: “Create and manage the accounts you share with other people.”
- Create: **Create Shared Account**, **Account name**, **Target**, **Date**, **Location**. Type labels generalised (Holiday, Birthday, Festival / tickets, Other). Location remains optional.
- Members replace travellers. Invite member. Notifications say Shared Account invitation.
- Lifecycle: Close Shared Account → Shared Account closed → Archived Shared Accounts. Sole-owner delete: Delete Shared Account? Soft-archive behaviour unchanged.
- Legacy unlinked pots: **Older Accounts** (only if any exist). Not auto-linked.
- Your balance (10A) unchanged. Pay account / Pay now / approval language unchanged.

**Internal architecture retained:** Event + SharedAccount models, `/api/events`, `/events/with-trip-money`, `/shared-accounts`, Mongo collections, and component filenames. No schema or recovered-data migration.

**Conflict noted:** Pack slogan still says “Fund the trip together.” Customer UI no longer uses Trip as a product category. Login tagline is now “Create Shared Accounts. Contribute together. Finish square.”

**Tests / build:** Frontend `18` suites / `91` tests passed. Production build compiled successfully. No additional backend changes for 10E.

No commit / no push / stash@{0} untouched. Task 11 not started. Recovered DB untouched.

### 10F — Separate Home from Shared Accounts

Home is the personal overview. Shared Accounts is the group-account list. They no longer share one screen.

**Routing:** `/` now renders `Home` (protected). SHARE logo and the Home nav item go to `/`. Shared Accounts stays at `/events` (`EventCountdown`). Login lands on `/`. Backend `/api/events` and `/shared-accounts/:id` unchanged.

**Home:** heading Home, **Your balance**, prototype disclaimer. Optional **Active Shared Accounts: N** with a link to `/events`. No account cards. No Create Shared Account. Balance formula unchanged from 10A.

**Shared Accounts:** heading Shared Accounts, Create Shared Account (10B unified create), **Active Shared Accounts** cards. No Your balance. Closed linked accounts sit behind **Show archived accounts**. Unlinked pots remain **Older Accounts** on this page only.

**Tests / build:** Frontend `19` suites / `92` tests passed. Production build compiled successfully. No backend changes for 10F.

No commit / no push / stash@{0} untouched. Task 11 not started.

### 10G — SHARE logo is Home

Visible **Home** nav item removed. Primary nav is **Shared Accounts · Notifications · More**.

The SHARE brand link still goes to `/` (Home from 10F). Accessible name: **SHARE — Home**. It remains a semantic `Link`. Keyboard focus-visible outline added on the brand because none existed.

Routes unchanged: `/` Home, `/events` Shared Accounts, `/invitations` Notifications. Login still lands on Home. No backend changes.

**Tests / build:** Frontend `19` suites / `93` tests passed. Production build compiled successfully. No backend changes for 10G.

No commit / no push / stash@{0} untouched. Task 11 not started.


### Sole-owner accidental Trip Money delete (demo bugfix)

Root cause: the header × “Leave Trip Money” path always required ownership transfer for organisers, and disabled Remove when `account.members.length === 0`. Pending invites are not members, so a sole owner had nobody to transfer to.

Fix: if the current user is organiser and there are no other accepted travellers (`members` empty), × confirms **Delete Trip Money?** and uses the existing soft-archive `DELETE /shared-accounts/:id`. Transfer remains required only when another accepted traveller exists. £0 accepted travellers still count. Close Trip Money → archive after payment completion is unchanged. Permanent delete remains archive-first.

No commit / no push / stash@{0} untouched.

### Task 11 — Professional codebase + repository cleanup

Repository hygiene only. No new product features.

- Audited the tracked tree before deletion. Removed only confirmed-unused frontend files, unused backend middleware, empty root stub, diagnostic/baseline artifacts, and a tracked local env file.
- Historical Railway incident notes and payment-provider setup guides moved to `docs/archive/`.
- Current docs: root README, `docs/ARCHITECTURE.md`, `docs/KNOWN_LIMITATIONS.md`, updated `docs/DEPLOYMENT.md`.
- Removed a hardcoded MongoDB credential fallback from `backend/services/mongodb.js` (and the legacy root copy). Connection now requires an environment variable.
- Customer-facing leftover Trip / Traveller / settlement wording cleaned on secondary screens. Internal Event + SharedAccount names unchanged.

The legacy root API tree (`controllers/`, `models/`, `routes/`, root `app.js`) was **kept** as REVIEW — the live service is `backend/`, but the root tree is still referenced by older scripts and tests.

No commit / no push / stash@{0} untouched. Recovered DB untouched.

### Task 11 — Professional codebase + repository cleanup

Repository hygiene only. No new product features.

- Audited the tracked tree before deletion. Removed only confirmed-unused frontend files, unused backend middleware, empty root stub, diagnostic/baseline artifacts, and a tracked local env file.
- Historical Railway incident notes and payment-provider setup guides moved to `docs/archive/`.
- Current docs: root README, `docs/ARCHITECTURE.md`, `docs/KNOWN_LIMITATIONS.md`, updated `docs/DEPLOYMENT.md`.
- Removed a hardcoded MongoDB credential fallback from `backend/services/mongodb.js` (and the legacy root copy). Connection now requires an environment variable. Values not recorded here.
- Customer-facing leftover Trip / Traveller / settlement wording cleaned on secondary screens. Internal Event + SharedAccount names unchanged.
- Unused npm packages removed from `backend` and `@paypal/react-paypal-js` from `frontend` after import checks.

The legacy root API tree (`controllers/`, `models/`, `routes/`, root `app.js`) was **kept** as REVIEW — Railway/docs say the live service is `backend/`, but the root tree is still referenced by older scripts and tests.

No commit / no push / stash@{0} untouched. Recovered DB untouched.


