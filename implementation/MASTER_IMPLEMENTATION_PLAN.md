# SHARE Product → Marketing Alignment — Master Implementation Plan

## 1. Objective
Transform the presentation and information architecture of the existing SHARE prototype so it supports validation of a **group travel money coordination** proposition.

This is a product-positioning implementation, not a regulated-finance launch.

## 2. Current codebase facts to preserve
Repository areas observed in the current source include:
- `frontend/src/App.tsx` — routing; currently defaults `/` to `/financial-records`.
- `frontend/src/components/Navbar.tsx` — exposes Finance, Shared Accounts, Invitations, Events, Calendar, Gallery, Map, Accommodations.
- `frontend/src/components/EventCountdown.tsx` — event/trip-like records including holiday category, budget and accommodation fields.
- `frontend/src/components/SharedAccounts.tsx` — group/shared account UI with target amount/date, balances, payment requests and transfer/pay actions.
- `frontend/src/components/SharedAccountDetail.tsx` — contribution/balance/withdraw/transfer/pay style interactions.
- `frontend/src/components/Invitations.tsx` — invitation flow.
- `frontend/src/components/FinancialRecords.tsx` and `PersonalFinance.tsx` — finance/accounting oriented experiences.
- `frontend/src/components/Accommodations.tsx`, `SharedGallery.tsx`, `EventMap.tsx` — useful secondary trip features.
- Backend shared-account, finance, invitation, event, payment-request and group-payment routes/controllers/models.
- `GROUP_PAYMENT_IMPLEMENTATION.md` — describes virtual commitments and says SHARE does not hold actual money.

## 3. Product classification

### KEEP — core to the travel proposition
- Events/trips
- Invitations
- Shared group cost/account concept
- Contribution commitments
- Group payment targets
- Payment requests/reminders
- Shared financial/activity record
- Trip budget planning

### KEEP + REFRAME
- `Shared Accounts` → user-facing language should favour **Trip Fund**, **Shared Trip Costs**, or **Trip Money** depending on the exact screen.
- `Financial Records` → user-facing language should favour **Trip Activity**, **Cost History**, or **Shared Activity** when scoped to a trip.
- `Transfer funds`, `withdraw`, `personal balance` → audit carefully. If they only modify virtual ledger records, label them as commitments/allocations/recorded contributions instead of real money movement.

### SECONDARY / DE-EMPHASISE
- Accommodation
- Calendar
- Map
- Gallery
- General recommendations

Keep these available where useful, but do not let them compete with the primary journey.

### HIDE FROM PRIMARY LAUNCH MESSAGE
- Generic personal finance
- Recurring household positioning
- Couples/family positioning
- General-purpose account/budgeting claims

Do not necessarily delete these features. Remove them from the first-run story and top navigation if that can be done safely.

### BUILD LATER — DO NOT IMPLEMENT IN THIS PASS
- Custodial pooled wallet
- Individual group payment cards
- Real automatic refund of unused money
- FX service
- Physical cards
- Credit/overdraft
- Subscription-first model
- AI financial assistant

## 4. Desired primary user journey

### A. Land / sign in
User immediately sees SHARE as a trip coordination product.

### B. Create a trip
Create a named trip with date, destination/location and optional overall target/budget.

### C. Set shared cost target(s)
Allow organiser to define what the group is contributing toward: accommodation, tickets, transport, etc.

### D. Invite friends
Make invitation the next obvious action. Prefer shareable invite language suited to WhatsApp or similar messaging apps.

### E. Commit / record contributions
Members can see target, their expected share, what has been committed/recorded and what remains.

### F. Track shared spending/activity
Show transparent group activity without implying SHARE custody if it is only a virtual ledger.

### G. Close out
For the current prototype, create a **close-out summary** rather than claiming automatic real-money return. The summary can show remaining virtual balance, unsettled items, member positions and the final record. Do not automate real refunds unless genuinely provider-backed.

## 5. Information architecture target

Suggested authenticated top navigation:
- **Trips** (primary)
- **Trip Money** or **Shared Costs** (primary)
- **Invitations** (primary)
- **More** → Calendar, Accommodation, Map, Gallery
- Profile/settings dropdown

Personal Finance should not be a primary navigation item during travel-beachhead validation. If retained, place it under More/Profile or clearly mark it as a separate personal tool.

## 6. Home/default route
Change the authenticated default away from `/financial-records`.

Preferred order:
1. If a suitable trip overview/dashboard already exists, use it.
2. Otherwise use `/events` and reframe Events as Trips.
3. Avoid creating a large new dashboard before reusing existing functionality.

## 7. Naming guidance
Use consistent customer language:
- Event → Trip where the context is travel
- Shared Account → Trip Fund / Shared Trip Costs
- Account target → Trip target / Cost target
- Contribution → Contribution / Commitment
- Balance → Tracked balance / Remaining target where needed
- Transaction → Activity / Cost record when no real transaction occurred
- Member → Traveller / Trip member where suitable

Keep internal model/API names unchanged unless a safe refactor is clearly warranted.

## 8. Trust and legal clarity
At any UI point that could be interpreted as money custody, display concise, plain-language context consistent with actual behaviour. Example direction:

> SHARE currently coordinates and records group contributions. It does not hold your money in a SHARE bank account.

Only use text that is true of the final implemented flow. Do not make legal-status claims such as “no licence required” in customer copy.

## 9. Mobile / invite-first requirement
The invite journey should work cleanly on mobile. Avoid desktop-only navigation or dense accounting tables. Prioritise:
- named trip
- organiser identity
- target / your share / remaining amount
- clear join/accept action
- no confusing app-install claim unless an install is actually required

## 10. Delivery phases
Implement in the exact order in `TASKS.md`.
