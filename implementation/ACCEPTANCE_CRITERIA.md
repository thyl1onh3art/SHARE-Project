# Overall Acceptance Criteria

The implementation is complete only when all applicable statements are true.

## Proposition clarity
- A first-time tester can identify SHARE as a group-trip/shared-cost coordination product within ~5 seconds of the main authenticated experience.
- The main journey is Trips → Shared Costs/Trip Money → Invite → Contribution status.
- Generic personal finance is not the dominant experience.

## Accuracy and trust
- No customer-facing screen falsely presents a virtual ledger as a SHARE-held bank balance.
- No new claim says SHARE is a joint account, bank, regulated wallet, FSCS-protected product, safeguarded account, guaranteed service, or instant-refund service.
- Real PayPal/Stripe/provider activity, if present, is described specifically rather than as SHARE custody.

## UX
- Primary navigation is concise and trip-focused.
- Secondary travel features remain reachable but de-emphasised.
- Contribution target, progress and remaining amount are prominent.
- Invitation flow is understandable on mobile.
- Narrow viewport navigation does not overflow.

## Functional regression
- Authentication still works.
- Existing trips/events still load/create/edit according to current functionality.
- Existing shared-account records still load.
- Existing invitation workflow still functions.
- Existing allowed shared-account/payment-request actions still function.
- No schema-breaking rename was introduced solely for copy purposes.

## Engineering
- Frontend production build passes, or pre-existing failure is documented precisely.
- Relevant tests pass, or pre-existing failures are separated from new failures.
- No secrets are committed.
- Changed-file summary and unresolved questions are written to `implementation/IMPLEMENTATION_NOTES.md`.
