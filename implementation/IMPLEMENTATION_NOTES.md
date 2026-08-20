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

---

## 13. Pack Phase 4 — Contribution progress as visual hero

**Branch:** `marketing-alignment`  
**Stash:** `stash@{0}` left untouched.  
**Preserved:** Trips-first journey, Trip Money terminology, primary nav (Trips / Trip Money / Invitations / More), APIs/models unchanged.

### Trip Money BEFORE → AFTER
| Before | After |
|--------|--------|
| Detail: flat “summary” grid (recorded total, target, travellers) | Detail: contribution **progress hero** (purpose, bar, %, target/recorded/remaining, organiser next step) |
| Members listed as emails under owner | **Traveller contributions** scannable rows with recorded / suggested share / remaining / complete status |
| List: recorded total + traveller count | List: progress bar + remaining + % when target exists |
| Primary actions mixed | **Record contribution** primary; Invite / Edit target / Settlement secondary |
| Transaction History title | Group spending record (last 24 hours) |

### Progress information now visible
- Contribution target, recorded total, remaining to contribute, % complete, progress bar
- Target date (when present)
- Suggested equal share from `perPersonAmount` (or target ÷ travellers) — labelled illustrative/not mandatory

### Member contribution information now visible
- Name, organiser/traveller role, recorded net contribution
- Suggested share + remaining vs share + Complete / Still to contribute / Tracking (no target)
- Empty: invite CTA when only the organiser is present

### Primary actions
- Record contribution (primary)
- Invite traveller → `/invitations?account=…`
- Set contribution target / Edit details (organiser; when no target)
- Request settlement; Reverse recorded contribution (secondary)

### Empty-state changes
- No target → explain + Set contribution target
- No contributions → explain next record action
- No other travellers → Invite traveller
- List empty → explain pot setup + link to Invitations
- Activity empty → Record contribution CTA

### Files changed
- `frontend/src/components/SharedAccountDetail.tsx`
- `frontend/src/components/SharedAccounts.tsx`
- `frontend/src/App.css`
- `implementation/TASKS.md`
- `implementation/IMPLEMENTATION_NOTES.md`

### Data that could NOT be displayed (backend does not store it)
- **Per-person mandatory allocations / custom splits** — only equal-share `perPersonAmount` (computed from target ÷ participants) exists; shown as guidance only
- **Committed-but-unrecorded promises** separate from ledger inputs — only `FinanceRecord` input/output amounts
- **Real bank settlement status** — not applicable; settlement remains virtual ledger approvals

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
2. Pack Phase 6 — keep Personal Finance out of the primary conversion journey (already under More).

**Note:** SharedAccount schema alignment for target fields was completed in Phase 4.5 below.

**STOP:** Do not start Pack Phase 5 without approval.

---

## 14. Phase 4.5 — Data integrity (targets + settlement wording)

**Branch:** `marketing-alignment`  
**Stash:** `stash@{0}` left untouched.  
**Scope:** Persistence integrity for Trip Money progress hero; settlement copy accuracy. No Pack Phase 5.

### What was inspected
- `backend/models/SharedAccount.js` vs `backend/controllers/sharedAccountController.js` create/update/list/detail
- `backend/routes/sharedAccountRoutes.js`
- `backend/models/FinanceRecord.js` + `paymentRequestController.js` approve path (creates `FinanceRecord` output only — no PayPal/Stripe)
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

Existing documents without these fields continue to load; missing/zero target remains a safe “no target” UI state.

### Settlement wording decision
Payment-request create/approve only writes MongoDB ledger / approval state — **not** real money movement.

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
| Recorded total from ledger inputs − outputs | Unchanged; detail uses `/finance?sharedAccount=` once |
| Progress % clamped 0–100; remaining `Math.max(0, target − recorded)` | Confirmed in Phase 4 UI code |
| Missing/zero target → no progress bar / empty target panel | Confirmed |
| Equal share labelled illustrative / not mandatory | Confirmed |
| Member totals: one pass per user over transactions (no double-count of same record) | Confirmed |
| Existing SharedAccounts without target fields | Compatible (optional fields) |

### Test / build results
| Check | Result |
|--------|--------|
| Backend `npm test -- --testPathPattern=sharedAccount` | **Could not complete meaningfully in this environment** — MongoDB connect failed (`Topology is closed` / `process.exit(1)`). Same class of env/baseline failure as Phase 0; **not attributed to Phase 4.5 schema change**. No new assertion failures isolated to this change. |
| `CI=true npm run build` (frontend) | **PASS** |
| Frontend tests | **PASS** (1/1) |

### Remaining limitations
- Root/legacy `models/SharedAccount.js` (outside `backend/`) still minimal — live app uses `backend/models/`.
- Custom per-person mandatory splits still not stored.
- Settlement remains virtual ledger only.
- Backend shared-account suite needs a working Mongo test env to re-run end-to-end.

### Confirmation
No real-money / PSP / wallet / withdrawal / pooled-funds functionality added.

### Pack Phase 5
**Safe to begin** after approval (invitation share UX). Schema integrity for targets is addressed.

**STOP:** Do not start Pack Phase 5 in this turn.

---

## 15. Pack Phase 5 — Strengthen invitations for group travel

**Branch:** `marketing-alignment`  
**Stash:** `stash@{0}` left untouched.  
**Not pushed.**

### Invitations BEFORE → AFTER
| Before | After |
|--------|--------|
| Generic “Invitations / Send Invitation / Shared account” | **Trip invitations**, **Invite travellers**, trip-pot context |
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
1. Trip Money detail → Invite traveller (preselects pot) **or** Invitations → Invite travellers  
2. Add emails/phones → Send trip invitation(s)  
3. Optionally Copy invite / WhatsApp / Share… with trip-specific text + `/login` URL

### WhatsApp / share / copy
- **No genuine public invite-accept URL/token exists** in the Invite model or routes.
- Share message includes real `origin/login` only; recipient must log in and accept under Invitations (email match).
- Documented backend need for true shareable links: signed/random token + authenticated or validated accept endpoint + no guessable IDs.

### Messages vs Invitations
- App route is `/invitations` only; primary nav already **Invitations**. No separate person-to-person Messages product surface — left as Invitations / trip invitations (no global Messages rename conflict).

### Empty states
- No Trip Money pots → Set up Trip Money  
- No pending received → explanation  
- Nobody invited yet → Invite travellers CTA  

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
| Backend `invite` tests | **Not runnable here** — Mongo `Topology is closed` / process exit (existing env baseline; not repaired) |

### Confirmation
No real-money / wallet / PSP functionality added.

### Next phase recommendation
Pack Phase 6 — further de-emphasise Personal Finance / secondary lifestyle framing in page copy (nav already under More).

**STOP:** Do not start Pack Phase 6 without approval.

---

## 16. Pack Phase 6 — De-emphasise secondary finance and lifestyle features

**Branch:** `marketing-alignment`  
**Stash:** `stash@{0}` left untouched.  
**Not pushed.** Backend unchanged (copy/presentation only).

### Hierarchy protected
Primary remains **Trips → Trip Money → Invitations** (nav + post-login `/events`). Secondary tools stay under **More** with trip-oriented labels and page intros that point back to the core journey.

### Per-feature changes

| Feature | Change |
|---------|--------|
| **Personal Finance** | Reframed as **Personal tracking**; secondary badge; tracked-total wording; links to Trips/Trip Money/Invitations; empty state points to Trip Money |
| **Financial Records** | **Activity history**; personal tracked total; Record personal activity; transparency note; core links; form labels de-banked |
| **Gallery** | **Trip photos**; Trip Money pot filters/labels; empty state → Trips |
| **Calendar** | **Trip calendar**; trip-date framing; core links; Trip countdown button |
| **Map** | **Trip map**; search trips; empty → Add a trip |
| **Accommodation** | **Places to stay**; select trip; Trip Money/Invitations links |
| **More menu** | Labels: Personal tracking, Activity history, Trip calendar/photos/map, Places to stay |
| **Login/Register** | SHARE branding + trip coordination tagline on login |

### BEFORE → AFTER examples
- Personal Financial Records / Total Balance → **Personal tracking** / **Personal tracked total**
- My Accounts / Add Money → **Activity history** / **Record personal activity**
- Shared Gallery / Shared Account → **Trip photos** / **Trip Money pot**
- Event Locations Map → **Trip map**
- Accommodations Recommendations → **Places to stay**

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

## 17. Pack Phase 7 — Non-custodial Trip Close-out summary

**Branch:** `marketing-alignment`  
**Stash:** `stash@{0}` left untouched.  
**Not pushed.** No backend schema/API redesign.

### Trip Close-out BEFORE → AFTER
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
- `recordedTotal` = sum(input) − sum(output)
- `remaining = max(0, target − recordedTotal)`
- `amountAboveTarget = max(0, recordedTotal − target)` labelled **Recorded above target** (not refundable)
- `%` clamped 0–100
- Equal-share delta: above / below / matches suggested share (illustrative only)

### Readiness statuses
- **No target set**
- **Still collecting**
- **Ready to review** (target reached on ledger ≠ real-world settled)
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
- Ledger does **not** reliably separate trip spend vs member-to-member repayments → **no profit/loss invented**
- Historical approved/rejected settlement requests not listed by `GET /payment-requests` (pending only)
- No SharedAccount archive/close state — not fabricated
- Invites/Trips not linked to SharedAccount for “trip finished” event date beyond optional `targetDate`

### Deliberately NOT implemented
Automatic refunds, residue distribution, PSP payouts, wallets, withdrawals, Close account button, binding debt language.

### Build / tests
| Check | Result |
|--------|--------|
| `CI=true npm run build` | **PASS** |
| Frontend tests | **PASS** (1/1) |
| Backend tests | **Not run** — no backend behaviour change |

### Recommendation for Pack Phase 8
Copy consistency pass across primary screens (`COPY_AND_TERMINOLOGY.md`), including strategic line only where adjacent copy stays non-custodial.

**STOP:** Do not start Pack Phase 8 without approval.

---

## 19. Pack Phase 8 — Copy consistency pass

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
| Positioning | “Fund the trip together. Spend together. Finish square.” on Login + Trips intro |

### BEFORE → AFTER (examples)
- Add trip → **Create trip**
- Participants → **Travellers**
- Filter by Event / All Events → **Filter by trip / All trips**
- User (activity table) → **Traveller**
- Register interest “Finance” → travel-oriented interests
- Mock accommodation note → accurate “sample results for planning”
- HTML title React App → **SHARE**

### Remaining customer-facing “Event”
- Largely removed from labels; internal Event types/routes remain
- Unmounted `Dashboard.tsx` still says Event/Shared Accounts (not in App routes) — left alone

### Remaining “Shared Account”
- Customer UI largely uses Trip Money / trip pot
- Internal `sharedAccount` props/APIs/variable names unchanged

### Remaining banking-like wording (intentional)
- **Personal tracked total** / **Recorded total** (ledger tracking, not bank balance)
- **Transfer creator rights** (ownership handoff, not money)
- **Accommodation deposit** as a real-world cost example
- Transparency sentences retained where custody misunderstanding is likely

### CTA consistency
Create trip · Save trip · Record contribution · Invite travellers · Request settlement record · Reverse recorded contribution

### Auth / branding
Login + Register intro copy; document title/manifest SHARE

### Deliberately unchanged
- Component names (`EventCountdown`, `SharedAccounts`, …)
- `/events`, `/shared-accounts`, finance API fields
- `Dashboard.tsx` (unmounted)
- Backend error strings (out of scope for large rewrite)

### Confirmation
No new product functionality added — copy/presentation only.

### Build / tests
| Check | Result |
|--------|--------|
| `CI=true npm run build` | **PASS** |
| Frontend tests | **PASS** (1/1) |

### Recommendation for Pack Phase 9
Quality and regression: manual journey Trips → Trip Money → Invitations → Close-out; mobile widths; confirm More-menu secondary features; record any remaining copy edge cases.

**STOP:** Do not start Pack Phase 9 without approval.

---

## 20. Pack Phase 9 — Quality, regression and release readiness

**Branch:** `marketing-alignment`  
**Stash:** `stash@{0}` left untouched (and `stash@{1}` also present; neither restored).  
**Not pushed. Not merged.**

### Claim fix in this phase
Live Login + Trips intro no longer use **“Fund the trip together. Spend together. Finish square.”** as current-product copy.  
Replaced with: **“Plan the trip together. Track shared costs. Finish square.”**  
Strategic line remains in pack docs (`START_HERE_CURSOR.md`) as future/marketing direction.

### Docs status notes added
- `GROUP_PAYMENT_IMPLEMENTATION.md` — not live PayPal/group-payments API
- `LEGAL_WARNING_GROUP_PAYMENTS.md` — still valid warning; live product is non-custodial ledger
- Root `README.md` — trip-first / non-custodial current-status banner

### Dashboard.tsx
Confirmed **unmounted** (not imported in `App.tsx`). Stale Event/Shared Accounts copy remains as dormant tech debt.

---

## Marketing Alignment — Final Release Readiness

### Branch / commits
- **Branch:** `marketing-alignment`
- **Merge-base with main (approx):** `e971ec9` (frontend CI/Jest stabilisation); pack install `c9464b0` precedes UI work
- **Marketing UI sequence (chronological):**
  1. `c9464b0` — Add marketing alignment pack and Phase 0 baseline notes
  2. `e971ec9` — Stabilize frontend CI build and Jest baseline
  3. `abda1eb` — Reframe authenticated entry around Trips for group travel
  4. `0e3e84a` — Reframe group money UI as Trip Money virtual tracking
  5. `45ad8a1` — Simplify primary navigation around Trips, Trip Money, and Invitations
  6. `c4f3292` — Make Trip Money contribution progress the visual hero
  7. `7f6e029` — Fix SharedAccount schema so contribution targets persist
  8. `6fad8f7` — Strengthen trip invitations with clear context and safe sharing
  9. `040a31d` — De-emphasise secondary finance and lifestyle surfaces around the trip core
  10. `46ba195` — Add a non-custodial Trip Close-out summary on Trip Money detail
  11. `42e47bb` — Standardise SHARE customer-facing copy around trips and Trip Money
  12. *(Phase 9 commit)* — Final quality: truthful positioning, doc status notes, readiness

### Core product positioning (live)
SHARE is a **group-trip coordination prototype**: plan trips, invite travellers, record shared-cost activity, review close-out.  
It does **not** hold pooled money, run PayPal/Stripe group settlement, or provide bank accounts/cards.

### Major changes (summary)
Trips-first default; Trip Money terminology + progress hero + close-out; primary nav Trips / Trip Money / Invitations / More; trip invitations with safe share (login URL only); SharedAccount target fields persisted; secondary tools de-emphasised; copy consistency; non-custodial transparency retained.

### Test results
| Check | Result |
|--------|--------|
| Frontend `CI=true npm run build` | **PASS** (compiled successfully) |
| Frontend tests | **PASS** — 1 suite, 1 test (`App.test.tsx`) |
| Backend `npm test` | **Environment failure** — Mongo `Topology is closed` / `process.exit(1)`; suites fail to run meaningfully (0 tests executed in this environment). Historical Phase 0 baseline when Mongo worked: **25 failed / 47 passed**. No evidence marketing-alignment introduced new backend assertion failures; invite/schema changes are additive and not covered by a green local suite here. |

### Security sanity (targeted)
- Invite accept still requires auth + matching `recipientEmail`
- Invite send requires owner or member
- Share message uses `/login` only — no public invite token
- No secrets added in branch files reviewed
- Ledger modify actions remain authenticated API calls

### Non-custodial confirmation
No pooled funds, custody, PayPal/Stripe settlement, bank transfers, cards, FX, automatic refunds/payouts, FSCS/safeguarding claims implemented by this branch.

### Known technical debt
- Unmounted `Dashboard.tsx` stale copy
- Backend Jest/Mongo test harness flaky/broken in this environment
- Historical ~25 backend test failures when suite previously ran
- `GET /payment-requests` returns pending only
- No Event↔SharedAccount schema link
- No public invite tokens
- Root README still largely backend/event-finance oriented beneath the status banner
- `BankAccount.ts` util unused-sounding banking vocabulary (not customer UI)

### Deferred capabilities
Real money movement, public invite links, automatic close-out refunds, full settlement history API, schema link Trips↔Trip Money, backend test-env repair.

### Regulatory / product limitations
Prototype coordinates and records; organisers settle real money outside SHARE.

### Release decision
| Question | Answer |
|----------|--------|
| Ready to **PUSH** `marketing-alignment` to remote? | **Yes**, after human approval (frontend green; docs status noted; stash not included) |
| Ready to **MERGE** into `main`? | **Conditionally yes** — merge after push + PR review; do **not** treat backend suite as green; consider follow-up for Mongo test env and dormant Dashboard |
| Conditions before merge | Confirm no secret/.env in PR; reviewer accepts non-custodial positioning; decide whether to ignore or ticket backend test debt |

### Recommended next Git action
1. Human reviews Phase 9 commit + notes  
2. `git push -u origin marketing-alignment` (only when approved)  
3. Open PR into `main` (do not merge until reviewed)  
4. Leave `stash@{0}` unrestored unless a separate task requests it  

**STOP:** Do not push or merge in this agent turn.

---

## Integration 1 — Friends (pre-marketing recovery into marketing-aligned SHARE)

**Branch:** `integrate-pre-marketing-features`  
**Source inspected:** `pre-marketing-wip` (behaviours extracted; branch not merged; commit `7282078` not cherry-picked; `stash@{0}` not restored)

### Recovered behaviours
- List current user’s friends (`GET /api/friends`)
- Add a registered SHARE user by email (`POST /api/friends`)
- Remove a friend by id (`DELETE /api/friends/:friendId`)
- Prevent self-add and duplicate friendships
- Frontend Friends page under **More** (secondary)
- `friendService` helpers (`rememberFriend`, `rememberFriendByEmail`, `rememberFriendsMutual`) shipped for later invite auto-friend use — **not wired** into invite/shared-account controllers in this integration

### Files migrated / changed
| Area | Path |
|------|------|
| Added | `backend/services/friendService.js` |
| Added | `backend/controllers/friendController.js` |
| Added | `backend/routes/friendRoutes.js` |
| Added | `backend/tests/friends.test.js` |
| Added | `frontend/src/components/Friends.tsx` |
| Edited (surgical) | `backend/app.js` — mount `/api/friends`; skip `startServer()` when `NODE_ENV=test`; list friends on root endpoint map |
| Edited (surgical) | `backend/middleware/validation.js` — **only** `validateAddFriend` (Trip Money target fields remain optional) |
| Edited (surgical) | `frontend/src/App.tsx` — protected `/friends` route; `/` still → `/events` |
| Edited (surgical) | `frontend/src/components/Navbar.tsx` — Friends in `moreLinks` only |

### Adaptations for current main
- Friends is **not** a primary nav item; primary remains Trips / Trip Money / Invitations / More
- Copy reframed for group travel; explicit that friendship ≠ Trip / Trip Money access
- Links go to `/invitations` (not WIP `/messages`)
- Secondary · More menu framing aligned with Personal tracking / Activity history
- Responsive flex-wrap on friend rows and header actions
- Invalid `friendId` on DELETE returns 400
- Add uses `$addToSet` via `rememberFriend` after duplicate checks

### Deliberately deferred
- Auto-friend on invite send/accept (would touch `inviteController` / Invitations UX) → **Invitation Helpers** integration
- InviteRecipientsForm friend picker
- Payment requests, soft-delete SharedAccount, Messages rename, finance UI regressions
- Genericising the “No SHARE account found with that email” enumeration message (kept prototype wording for API/test compatibility; safer generic copy can be considered later without expanding Integration 1)

### Security notes
- All Friends routes require `auth`; mutations use `req.user.userId` only (cannot edit another user’s list)
- Remove does not delete User documents
- Friendship grants **no** Trip Money membership or permissions
- Email add still reveals whether an account exists (same as recovered prototype)

### Tests / results
| Check | Result |
|--------|--------|
| `NODE_ENV=test npx jest tests/friends.test.js --forceExit` | **PASS** — 8 tests (list, unauth GET, add, self, duplicate, unauth POST, remove, invalid id) |
| Frontend `CI=true npm run build` | **PASS** |
| Frontend `npm test -- --watchAll=false` | **PASS** — 1 suite / 1 test |
| First Friends run without test `startServer` guard | **Environment failure** (`Topology is closed` / `process.exit(1)` on app import) — distinguished from Friends logic; minimal guard applied |

### Regression (code-checked)
- `/` → `/events` preserved
- Primary nav unchanged
- Trip Money progress hero + Trip Close-out still present in `SharedAccountDetail.tsx`
- Invitations route/component unchanged
- No custodial banking wording introduced by Friends copy

### Next
Integration 2 — Auth user shape is safe to begin (does not depend on unfinished Friends work).  
**Do not push** this commit unless separately requested.

---

## Integration 2 — Auth user shape (pre-marketing recovery into marketing-aligned SHARE)

**Branch:** `integrate-pre-marketing-features`  
**Source inspected:** `pre-marketing-wip` (formatter/mapping behaviours extracted only; branch not merged; stash not restored)

### User shape BEFORE → AFTER

| Flow | Before | After |
|------|--------|--------|
| Login `user` | `{ id, name: user.name, email }` — `name` usually missing (schema uses firstName/lastName) | `{ id, firstName, lastName, name (computed), email, age, interests, createdAt }` |
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
Backend and frontend both prefer an explicit name string when present, then concatenate first/last, then `'User'`. Friends list naming remains via `friendController` (`firstName`/`lastName` → `name`, else email).

### Tests / results
| Check | Result |
|--------|--------|
| Friends `tests/friends.test.js` | **PASS** — 8/8 |
| `tests/user.test.js` | **FAIL (pre-existing / unrelated)** — expects `success` envelope not returned by controllers; asserts DB `user.name` though schema uses firstName/lastName; registration/login rate-limited (429) when suites run back-to-back. Not introduced by Integration 2 formatter. |
| Frontend `CI=true npm run build` | **PASS** |
| Frontend tests | **PASS** — 1 suite / 1 test |

### Regression (code-checked)
- `/` → `/events`; primary nav Trips / Trip Money / Invitations; Friends under More
- Trip Close-out unchanged; token localStorage + axios Authorization flow unchanged
- Login/logout/refresh/updateProfile still present and use normalised user mapping

### Deferred / out of scope
SharedAccount access helper, soft delete, payment requests, invitation helpers, ParticipantCount, finance changes

### Next
Integration 3 — SharedAccount access helper is safe to begin.  
**Do not push** unless separately requested.


