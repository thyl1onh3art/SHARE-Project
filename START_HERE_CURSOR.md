# SHARE — Cursor Product/Marketing Alignment Pack

## Purpose
This pack converts the SHARE product-to-marketing classification into an implementation specification for the existing `SHARE-Project-main` repository.

The objective is **not** to rebuild SHARE into a regulated wallet. The objective is to make the current prototype clearly present itself as a **group-trip money coordination product** while preserving the existing non-custodial/virtual-commitment boundary.

## Primary product proposition
**Fund the trip together. Spend together. Finish square.**

For the current prototype, treat that as the strategic direction, not permission to claim functionality that does not yet exist. Where the live product cannot actually pre-fund, custody, issue cards, perform FX, or auto-refund money, use accurate language such as **plan, contribute/commit, track, coordinate, settle, and close out**.

## Target user
Initial beachhead: UK residents organising an overseas leisure trip for approximately 4–8 friends.

Do not make couples, families, recurring households, clubs, subscriptions, or generic personal budgeting the central launch proposition.

## What Cursor should do
1. Read this file.
2. Read `.cursor/rules/share-product-marketing-alignment.mdc`.
3. Read every file in `implementation/`.
4. Inspect the existing repository before changing code.
5. Implement tasks in `implementation/TASKS.md` in order.
6. Keep changes incremental and compile/test after each phase.
7. Update the task checkboxes as work is completed.
8. Do **not** invent backend capabilities, financial custody, regulated claims, card issuance, FX, or refunds.

## Important product reality
The repository documentation describes the group-payment system as a **virtual account / commitment tracking system**. It says contributions are tracked as commitments rather than actual money held by SHARE. Preserve that operational boundary unless a future, separately approved regulated-provider integration changes it.

The existing code also contains UI language such as `Shared Accounts`, `transfer funds`, `withdraw`, `personal balance`, and `pay balance`. Some of this can imply real money custody more strongly than the current architecture supports. A core part of this implementation is to review and reframe those labels where appropriate **without breaking the underlying data model or API contracts**.

## Definition of success
A new user should understand within seconds that SHARE is for planning group trips and coordinating shared trip costs, without believing SHARE is already a bank, joint account, e-money wallet, or card issuer.

Start with `implementation/MASTER_IMPLEMENTATION_PLAN.md`.
