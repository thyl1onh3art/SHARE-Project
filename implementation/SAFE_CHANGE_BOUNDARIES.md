# Safe Change Boundaries

## Green — safe focus for this implementation
- Navigation and information architecture
- User-facing labels and explanations
- Default route
- Trip-oriented empty states and examples
- Responsive layout
- Contribution/target visual hierarchy
- Invite sharing UX using existing invite capability
- Read-only computed summaries from existing data
- Non-custodial close-out summary

## Amber — inspect deeply before changing
- `transfer`, `withdraw`, `pay`, `balance` actions
- PayPal and Stripe flows
- Finance record semantics
- Shared-account ownership and permissions
- Payment request state transitions
- Group-payment status and merchant payment creation

For amber areas, first determine whether the action is virtual ledger activity, real provider payment activity, or mixed. Preserve actual behaviour and make wording precise.

## Red — do not implement in this pack
- Holding pooled customer funds
- E-money/wallet custody
- Individual virtual/physical cards
- FX conversion service
- Automatic return of real remaining funds
- Credit/overdraft
- Claims of regulatory approval/protection
- Subscription paywall
- International multi-regulatory launch

## Legal/compliance note
Existing repository documents contain legal interpretations. Treat them as historical project notes, not as verified legal advice. This implementation must avoid introducing new regulatory claims. Any future live-money launch should be separately reviewed by appropriate specialists and providers.
