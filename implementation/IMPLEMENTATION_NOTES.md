# SHARE Marketing Alignment — Implementation Notes

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
- `GROUP_PAYMENT_IMPLEMENTATION.md` — describes a **virtual commitment** model; PayPal used only as merchant payment path; SHARE must not hold money
- `LEGAL_WARNING_GROUP_PAYMENTS.md` — warns that custodial pooled wallets need licensing; recommends virtual tracking + provider facilitation
- Root `README.md` — presents SHARE as **social event planning + financial management** (not trip-first)
- `SECURITY.md` (present; not modified)

### Live backend (used by app under `backend/`)
- Models: `SharedAccount.js`, `FinanceRecord.js`, `PaymentRequest.js`
- Controllers: `sharedAccountController.js`, `financeController.js`, `paymentRequestController.js`
- Routes: `sharedAccountRoutes.js`, `financeRoutes.js`, `paymentRequestRoutes.js`
- Mounting in `backend/app.js`: `/api/shared-accounts`, `/api/finance`, `/api/payment-requests` (no `/api/group-payments` mounted)
- Access helper: `backend/utils/sharedAccountAccess.js`

### Live frontend
- `frontend/src/App.tsx` — authenticated default `/` → `/financial-records`
- `frontend/src/components/Navbar.tsx` — Finance, Shared Accounts, Messages, Friends, Events, Calendar, Gallery, Map, Accommodations; brand **SHARE Project**
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
| Transfer personal → shared | Two `FinanceRecord` creates: personal `output` + shared `input` | **Virtual ledger only** |
| Shared account “balance” | Sum of shared `FinanceRecord` inputs − outputs | **Tracked / virtual** — not a bank balance |
| Payment request approve | On enough approvals, creates shared `output` `FinanceRecord` (and for withdrawals also a personal `input`) | **Virtual ledger only** |
| Withdraw request | Same as above — ledger moves, no PSP call | **Virtual ledger only** |
| Soft / permanent delete shared account | Soft flag or hard delete + archive name on records | Non-money lifecycle |
| Transfer ownership / admin | Updates `owner` / `members` | Non-money lifecycle |
| Group PayPal merchant payment (docs) | Documented only; **not implemented in live routes** | **Not live** |
| Stripe / PayPal checkout in shared-account flow | Not found in live shared-account / payment-request controllers | **Not live in this path** |

**Phase 0 conclusion:** All primary “money” actions currently shipping in shared accounts / finance / payment-requests are **virtual commitment / ledger records**. UI words like *transfer funds*, *withdraw*, *personal balance*, *pay balance* **overstate custody** relative to behaviour. Future Phase 3+ copy must say coordinate / record / commit unless a real provider call is proven.

---

## 3. KEEP / CHANGE / HIDE / BUILD LATER vs current product

| Pack classification | Current state | Phase recommendation |
|---|---|---|
| **KEEP** Events/trips | `/events` + `EventCountdown` with holiday/budget/accommodation | Keep; reframe as Trips in Phase 1 |
| **KEEP** Invitations | `/messages` (redirect from `/invitations`) | Keep primary; pack says “Invitations” — current label is Messages |
| **KEEP_REFRAME** Shared accounts | Full CRUD + targets + members + ledger | Keep APIs/models; reframe UI as Trip Fund / Shared Trip Costs (Phase 3) |
| **KEEP** Contribution / targets / payment requests | Present | Keep; make progress the hero (Phase 4) |
| **KEEP_SIMPLIFY** Financial records | Default post-login route | De-emphasise; do not delete (Phases 1 & 6) |
| **SECONDARY** Calendar / Map / Accommodations | Top-nav primary items | Move under More (Phase 2) |
| **HIDE_FROM_CORE_PITCH** Gallery | Top-nav | De-emphasise (Phase 2) |
| **HIDE_FROM_PRIMARY_JOURNEY** Personal finance | Top-nav “Finance” + default financial-records home | Remove from primary journey (Phases 1–2, 6) |
| **CAREFUL** PayPal/Stripe | Docs + unused dependency; not in live shared-money path | Do not claim; describe only if wired later |
| **BUILD_LATER** Custodial wallet / cards / FX / auto refunds | Not implemented | Do **not** implement in this pack |

---

## 4. Conflicts between current SHARE code and the marketing plan

1. **Default authenticated experience is accounting-first** (`/` → `/financial-records`), not trip-first. Pack wants Trips first.
2. **Navbar is finance/lifestyle-heavy** (Finance, Shared Accounts, Messages, Friends, Events, Calendar, Gallery, Map, Accommodations) vs pack primary set (Trips, Shared Costs/Trip Money, Invitations).
3. **Custodial-sounding UI copy** on virtual ledger actions (transfer / withdraw / balance / pay).
4. **Brand label** is `SHARE Project` in navbar; pack prefers customer-facing `SHARE`.
5. **Product README framing** is “social event planning and financial management,” not “group-trip money coordination.”
6. **Invitations renamed to Messages** in UI — pack still says Invitations; need a deliberate label decision in Phase 2/5 (Messages can stay as route if copy says Invites/Approvals).
7. **Friends** is a useful invite helper but not in pack primary nav — treat as secondary or invite support, not core pitch.
8. **Documented group-payment / PayPal flow is not live** — marketing must not claim PayPal merchant settlement until implemented.
9. **Events model is general** (social/work/holiday etc.) — pack wants trip beachhead in UI while keeping model compatibility (aligned with Phase 1 guidance).
10. **Repo layout noise:** project root mixes backend-style files with `backend/` + `frontend/` packages. Live app paths used for this baseline are `backend/` and `frontend/`.

---

## 5. Baseline test / build results (pre-existing; not fixed in Phase 0)

### Backend (`cd backend && npm test`)
- **Suites:** 5 failed, 1 passed (6 total)
- **Tests:** 25 failed, 47 passed (72 total)
- Notable areas:
  - `phase2.test.js` — recommendations endpoints returning **404** (route/expectation mismatch)
  - `sharedAccount.test.js` — some list assertions returning empty arrays / other failures mixed with earlier known owner-populate assertion style issues
  - `invite.test.js`, `friends.test.js`, `user.test.js` — failures present (environment/data/setup or API drift)
- **Not fixed in Phase 0** (per pack: record baseline without fixing unrelated issues)

### Frontend production build (`CI=true npm run build`)
- **Failed** because CI treats ESLint warnings as errors:
  - `src/components/Profile.tsx` — unused `user`; `useEffect` missing `fetchProfile` dependency
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

## 7. Recommended next (Phase 1 — awaiting approval)

Per pack order, after approval:

1. Change default authenticated route away from `/financial-records` toward `/events` (trip-oriented).
2. Reframe Events UI copy as **Trips** without breaking `/api/events` or the Event model.
3. Update empty states / examples toward friend-group travel (4–8 friends, overseas leisure).

Do **not** start Phase 2+ until Phase 1 is approved after delivery.

---

## 8. Assumptions / open questions

- Confirm whether “Messages” should remain the primary invite label or revert to “Invitations” / “Trip invites” while keeping `/messages` route.
- Confirm preferred customer term for shared pots: **Trip Fund** vs **Shared Trip Costs** (pack allows either with transparency note).
- Confirm whether root-level duplicate controllers (if any outside `backend/`) are legacy and should be ignored for all future edits — Phase 0 treated **`backend/` + `frontend/`** as source of truth.
- Legal docs claim “legal without licence” for virtual tracking; pack says treat legal docs as historical notes, not verified advice — customer copy must avoid regulatory claims either way.

---

## 9. Baseline Stabilisation (pre–Phase 1)

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
   - Default CRA `App.test.tsx` still asserted “learn react”, which this app never rendered.

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
   - `react-router-dom` → `dist/index.js`
   - `react-router/dom` → `dist/development/dom-export.js`
   - `react-router` → `dist/development/index.js`
3. Allow Babel transform for `axios|react-router|react-router-dom` via `transformIgnorePatterns`.
4. Polyfill `TextEncoder` / `TextDecoder` from Node `util` in `setupTests.ts`.
5. Replace obsolete CRA smoke test with unauthenticated shell check (Login button + SHARE text).

### Results after stabilisation

| Check | Result |
|--------|--------|
| `CI=true npm run build` (frontend) | **PASS** — compiled successfully |
| `CI=true npm test -- --watchAll=false` (frontend) | **PASS** — `1` suite / `1` test |
| Backend `npm test` | **Not re-fixed** — Phase 0 baseline remains **25 failed / 47 passed** (72 total). Frontend changes did not target backend. |

### Remaining known failures

- Backend suites still failing from Phase 0 baseline (`phase2` recommendations 404s, sharedAccount/invite/friends/user drift). Left for a later pass; not blocking Phase 1 marketing copy/IA work if frontend CI is green.
- Browserslist / baseline-browser-mapping npm warnings remain (noise only).

---

## 10. Phase 1 — Trips as primary product entry

**Branch:** `marketing-alignment` (from `e971ec9`)  
**Pre-work:** Unrelated WIP stashed as `stash@{0}: WIP: unrelated pre-Phase1 feature work (friends, payments, shared-account deletes, diagnostics)` — not included in this commit.

### Files inspected
- `frontend/src/App.tsx`, `Login.tsx`, `Navbar.tsx`, `ProtectedRoute.tsx`
- `frontend/src/components/EventCountdown.tsx` (primary Trips UI)
- Existing `/api/events` usage (GET/POST/DELETE) — left unchanged
- Confirmed no suitable alternate trip dashboard beyond `/events`

### Files changed
- `frontend/src/App.tsx` — default `/` → `/events`
- `frontend/src/components/Login.tsx` — post-login navigate → `/events`
- `frontend/src/components/Navbar.tsx` — nav label `Events` → `Trips` (path still `/events`)
- `frontend/src/components/EventCountdown.tsx` — trip-oriented headings, empty states, form copy, examples, category labels
- `frontend/src/contexts/AuthContext.tsx` — added missing `refreshUser` so Profile (from stabilisation) typechecks after stash restored clean AuthContext
- `implementation/TASKS.md`, `implementation/IMPLEMENTATION_NOTES.md`

### Visible behaviour before → after
| Before | After |
|--------|--------|
| `/` and login landed on financial records | `/` and login land on Trips (`/events`) |
| Navbar said “Events”; page “Event Countdowns” | Navbar/page say **Trips** |
| Empty state: “No events yet…” | Empty state invites Amsterdam weekend / Ibiza / ski / stag-hen / group holiday |
| Form placeholders birthday-party style | Trip name, destination, trip type, group-cost framing |

### Terminology changed (customer-facing only)
Events → Trips; Add Event → Add trip; Location → Destination; Category labels reframed for travel; countdown/stats copy trip-oriented.

### Internal event terminology deliberately retained
- Route `/events`, API `/api/events`
- Component name `EventCountdown`, interface `Event`, fields `eventDate` / `eventTime`
- Category **values** (`holiday`, `travel`, `social`, …) unchanged — only labels/order/default (`holiday`)

### Out of scope (left for Phase 2+)
- Full nav simplification / More menu
- Shared Accounts → Trip Fund wording
- Personal Finance removal from primary journey beyond not being the default landing
- Messages rename, pooled funds, cards, FX, PayPal group payments

### Build / test results
- `CI=true npm run build` — **PASS**
- `CI=true npm test -- --watchAll=false` — **PASS** (1/1)

### Phase 2 should address
- Primary nav: Trips, Shared Costs/Trip Money, Invitations; move Calendar/Gallery/Map/Accommodations under More
- Brand label `SHARE Project` → `SHARE`
- De-emphasise Finance in primary nav without deleting it

---

## 11. Phase 2 (user) / Phase 3 (pack) — Trip Money terminology

**Branch:** `marketing-alignment`  
**Mapping:** User-approved “Phase 2” = pack **Phase 3** (reframe Shared Accounts into trip money coordination). Pack Phase 2 (nav redesign) was **not** started.

**Stash:** `stash@{0}` left untouched.

### Objective
Make customer-facing group-money UX describe virtual contribution / commitment / ledger tracking — not custody or banking.

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
| Insufficient funds… | Amount exceeds your personal tracked total |
| Transfer would exceed the account limit… | Contribution would exceed the target… |

### Transparency note (added on list + detail)
> SHARE records and coordinates group contributions. It does not hold this tracked amount in a SHARE bank account.

### BEFORE → AFTER examples
- Navbar: **Shared Accounts** → **Trip Money** (route still `/shared-accounts`)
- List H1: accounting shared-account framing → **Trip Money** + intro about shared trip costs / contribution targets
- Action: **Transfer Funds** → **Record contribution** (still posts two `FinanceRecord`s)
- Action: **Withdraw** → **Reverse recorded contribution** (still payment-request / ledger path)
- Action: **Pay** → **Request settlement record** + explicit “SHARE does not send bank payments”
- Empty state: create shared account → set up shared trip costs / pot for accommodation deposit, tickets, holiday costs

### Files changed
- `frontend/src/components/Navbar.tsx`
- `frontend/src/components/SharedAccounts.tsx`
- `frontend/src/components/SharedAccountDetail.tsx`
- `frontend/src/components/FinancialRecords.tsx` (Trip Money section + empty state)
- `frontend/src/components/Invitations.tsx` (invite target label only)
- `implementation/TASKS.md` (pack Phase 3 checkboxes)
- `implementation/IMPLEMENTATION_NOTES.md` (this section)

### Misleading money language intentionally left unchanged (and why)
- **Internal** names: `sharedAccount`, `/shared-accounts`, `transferForm`, `showWithdrawModal`, `personalBalance`, API paths, Mongo models — Phase 2 is UX/copy only.
- **Personal Finance** page (`PersonalFinance.tsx`) and Financial Records **Total Balance** card — personal ledger summary, secondary to trip journey; full de-emphasis is pack Phase 6.
- **Gallery filter “Shared Account”** — secondary lifestyle feature; pack Phase 6/8.
- **Dashboard.tsx “Shared Accounts” / Net Balance** — not in current `App.tsx` routes; left alone.
- Word **“deposit”** in empty-state example (“accommodation deposit”) — means a real-world trip cost type, not a SHARE bank deposit.
- **“Transfer ownership”** — means admin rights, not money movement.

### Confirmation: no real-money functionality added
- No Stripe / PayPal settlement, cards, FX, wallets, withdrawals of real funds, or pooled custody.
- Existing MongoDB ledger behaviour preserved; only customer-facing labels and help text changed.

### Build / test results
| Check | Result |
|--------|--------|
| `CI=true npm run build` (frontend) | **PASS** |
| `CI=true npm test -- --watchAll=false` (frontend) | **PASS** (1/1) |

### Recommendations for next approved phase (pack Phase 2 or Phase 4)
1. **Pack Phase 2 — nav:** Trips, Trip Money, Invitations primary; More for Calendar/Gallery/Map/Accommodations; brand `SHARE`; demote Finance.
2. **Pack Phase 4 — progress hero:** visual priority for target / recorded / remaining / member progress on list+detail.
3. Later: invitation share UX (Phase 5), de-emphasise Personal Finance (Phase 6), non-custodial close-out summary (Phase 7).

**STOP:** Do not start pack Phase 2/4 without explicit approval.

---

## 12. Pack Phase 2 — Simplify primary navigation

**Branch:** `marketing-alignment`  
**Stash:** `stash@{0}` left untouched.  
**Preserved:** Trips reframe (user Phase 1) and Trip Money terminology (user Phase 2 / pack Phase 3).

### Navigation before → after

| Before | After |
|--------|--------|
| Brand: `SHARE Project` | Brand: `SHARE` |
| Flat primary row: Finance, Trip Money, Invitations, Trips, Calendar, Gallery, Map, Accommodations + profile | Primary: **Trips**, **Trip Money**, **Invitations** + **More** + profile |
| Many links likely overflow on narrow screens | ≤768px: hamburger + full-height secondary panel; desktop More dropdown |

### Primary items
1. Trips → `/events`
2. Trip Money → `/shared-accounts`
3. Invitations → `/invitations`

### More / secondary items
- Personal Finance → `/personal-finance`
- Financial Records → `/financial-records`
- Calendar → `/calendar`
- Gallery → `/gallery`
- Map → `/map`
- Accommodations → `/accommodations`

### Account (profile menu desktop; Account section on mobile)
- Edit Profile → `/profile`
- Settings → `/settings`
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
1. Pack Phase 4 — contribution progress as the hero on Trip Money list/detail.
2. Pack Phase 5 — invitation share/copy for messaging apps.
3. Pack Phase 6 — further de-emphasise Personal Finance / Financial Records copy journey.

**STOP:** Do not start the next pack phase without approval.
