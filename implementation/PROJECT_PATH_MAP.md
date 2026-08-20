# Project Path Map for Cursor

Inspect these first.

## Frontend routing/navigation
- `frontend/src/App.tsx`
- `frontend/src/components/Navbar.tsx`
- `frontend/src/App.css`
- `frontend/src/index.css`

## Trips/events
- `frontend/src/components/EventCountdown.tsx`
- corresponding backend event routes/controller/model

## Shared costs / trip fund
- `frontend/src/components/SharedAccounts.tsx`
- `frontend/src/components/SharedAccountDetail.tsx`
- `backend/controllers/sharedAccountController.js`
- shared-account routes/model files
- finance controller/routes/model files

## Invitations
- `frontend/src/components/Invitations.tsx`
- `backend/controllers/inviteController.js`
- invite routes/model files

## Payment coordination
- `GROUP_PAYMENT_IMPLEMENTATION.md`
- `LEGAL_WARNING_GROUP_PAYMENTS.md`
- group-payment controller/routes/model/service files
- `backend/controllers/paymentRequestController.js`
- payment-request routes/model files
- PayPal/Stripe integration files only as required to determine real money flow

## Secondary features
- `frontend/src/components/Calendar.tsx`
- `frontend/src/components/Accommodations.tsx`
- `frontend/src/components/SharedGallery.tsx`
- `frontend/src/components/EventMap.tsx`
- recommendation components/routes if present

## Generic finance to de-emphasise
- `frontend/src/components/FinancialRecords.tsx`
- `frontend/src/components/PersonalFinance.tsx`

## Authentication/security — preserve
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/components/ProtectedRoute.tsx`
- authentication middleware/controllers/routes
- `SECURITY.md`

Cursor: paths may vary slightly between root/backend duplicates. Inspect repository tree before editing and prefer the files actually used by the deployed app.
