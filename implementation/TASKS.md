# SHARE Implementation Tasks

Cursor: complete these in order. Update `[ ]` to `[x]` only after code is changed and validation passes.

## Phase 0 — Baseline and safety
- [x] Read repository `README.md`, `GROUP_PAYMENT_IMPLEMENTATION.md`, `LEGAL_WARNING_GROUP_PAYMENTS.md`, shared-account routes/controllers/models, finance routes/controllers/models, and payment-request flow.
- [x] Confirm which actions are purely virtual ledger changes versus provider-backed real payments.
- [x] Create `implementation/IMPLEMENTATION_NOTES.md` and record the findings before changing financial wording.
- [x] Run current frontend build/test and available backend tests; record baseline failures without fixing unrelated issues.

## Phase 1 — Reframe the product around Trips
- [x] Change authenticated default route in `frontend/src/App.tsx` away from `/financial-records` to the best existing trip-oriented route (prefer `/events` unless inspection identifies a better existing overview).
- [x] Reframe the user-facing Events experience as **Trips** where appropriate while preserving backend route/model compatibility.
- [x] Update primary headings, empty states, buttons and explanatory copy in the trip/event component so examples and language suit friend-group travel.
- [x] Keep non-travel event compatibility in the data model unless removing it is necessary; the launch UI can still prioritise trips.

### Acceptance
- First meaningful authenticated screen is trip-oriented.
- User does not land in an accounting ledger.
- Existing event data still loads.

## Phase 2 — Simplify navigation
- [ ] Refactor `frontend/src/components/Navbar.tsx` so primary navigation is limited to Trips, Shared Costs/Trip Money, and Invitations.
- [ ] Move Calendar, Gallery, Map and Accommodations into a secondary `More` menu or equivalent compact pattern.
- [ ] Remove Personal Finance from primary navigation; retain access secondarily if it remains functional.
- [ ] Make navigation responsive on narrow/mobile widths.
- [ ] Replace `SHARE Project` brand label with customer-facing `SHARE` unless repository branding requires otherwise.

### Acceptance
- Primary nav communicates the travel/shared-cost proposition in under 3–4 choices.
- Secondary features remain accessible.
- Mobile layout does not overflow horizontally.

## Phase 3 — Reframe Shared Accounts into trip money coordination
- [x] Audit `SharedAccounts.tsx` and `SharedAccountDetail.tsx` for custodial language.
- [x] Change visible `Shared Account(s)` wording to a consistent approved term such as **Trip Fund** or **Shared Trip Costs**. Prefer **Trip Fund** only if nearby copy clearly explains that SHARE itself is not holding a bank balance.
- [x] Change generic accounting labels to trip-specific labels: target, committed/recorded, remaining, contribution history, group members.
- [x] Preserve internal API endpoints and model names unless there is a compelling engineering reason to refactor.
- [x] Add a concise transparency note where a reasonable user could think SHARE is holding money.
- [x] If `transfer`, `withdraw`, or `pay` actions merely create virtual finance records, relabel them so the UI does not present them as real banking actions.
- [x] If any action genuinely triggers PayPal/Stripe/provider movement, describe exactly that movement and do not generalise it as SHARE custody.

### Acceptance
- No screen falsely implies a SHARE-held bank account.
- Existing shared-account data and actions still work.
- A tester can explain what is real vs tracked after reading the screen.

## Phase 4 — Make contribution progress the hero
- [ ] On list/detail views, visually prioritise: trip/cost name, target, amount committed/recorded, remaining amount, member progress, target date.
- [ ] Show per-person expected share where already supported (`perPersonAmount`) without presenting it as mandatory when unequal contributions are allowed.
- [ ] Make the main member action a clear contribution/commitment action.
- [ ] Make organiser controls secondary but discoverable.
- [ ] Preserve accessible labels and keyboard behaviour.

### Acceptance
- Contribution status is understandable without reading a finance ledger.
- The group target and remaining amount are visible immediately.

## Phase 5 — Strengthen invitations for group travel
- [ ] Audit `Invitations.tsx` and invite backend flow.
- [ ] Update invitation copy to include the named trip/context where supported.
- [ ] Provide a clear share/copy invitation action suitable for WhatsApp sharing if the repository already exposes or can safely construct an invite URL.
- [ ] Do not add WhatsApp API dependencies unless necessary; a normal share link or `wa.me`/Web Share action can be used only if safe and appropriate.
- [ ] Avoid claiming recipient app install is unnecessary unless the actual invite flow proves that.

### Acceptance
- Invite clearly says who invited the user and what trip/group it relates to when data allows.
- Mobile share/copy action is easy to find.

## Phase 6 — De-emphasise accounting and secondary lifestyle features
- [ ] Keep `PersonalFinance` and generic `FinancialRecords` functional, but remove them from the primary conversion journey.
- [ ] Do not delete Gallery, Map, Accommodation or Calendar.
- [ ] Ensure no secondary page becomes the default post-login route.
- [ ] Where easy, adjust page descriptions so they feel attached to a trip rather than a generic social network.

## Phase 7 — Add a prototype close-out summary (non-custodial)
- [ ] Inspect existing shared-account data to determine whether a reliable close-out summary can be computed without schema changes.
- [ ] If feasible, add a read-only or confirmation-based **Trip Close-out** section that shows target, recorded contributions, recorded shared costs, remaining tracked amount, and member contribution positions.
- [ ] Do **not** perform real automatic refunds.
- [ ] Do **not** claim a real-money balance is being returned.
- [ ] If reliable close-out cannot be computed from current data, document the blocker instead of inventing it.

### Acceptance
- Close-out helps test the “finish square” concept safely.
- No regulated money movement is added.

## Phase 8 — Copy consistency pass
- [ ] Apply `COPY_AND_TERMINOLOGY.md` across primary screens.
- [ ] Remove customer-facing terms that imply banking/custody unless genuinely accurate.
- [ ] Keep the strategic line **“Fund the trip together. Spend together. Finish square.”** only in marketing/intro contexts where adjacent copy does not falsely claim current functionality.
- [ ] Prefer concrete examples: trip, accommodation deposit, tickets, group costs, organiser, friend contribution.

## Phase 9 — Quality and regression
- [ ] Run frontend tests.
- [ ] Run frontend production build.
- [ ] Run relevant backend tests.
- [ ] Manually inspect login → trips → shared costs → invitations → contribution/detail → close-out journey.
- [ ] Check responsive/mobile layout at common narrow widths.
- [ ] Confirm Gallery/Map/Accommodation/Calendar remain reachable.
- [ ] Confirm no environment secrets were added or changed.
- [ ] Document changed files and unresolved issues in `implementation/IMPLEMENTATION_NOTES.md`.

## Explicitly out of scope
- [ ] DO NOT implement custodial pooled money.
- [ ] DO NOT implement card issuance.
- [ ] DO NOT implement FX.
- [ ] DO NOT implement real automatic refunds.
- [ ] DO NOT implement credit/overdraft.
- [ ] DO NOT add claims of FSCS/safeguarding/licensing status.
