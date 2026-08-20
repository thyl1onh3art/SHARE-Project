# Prompt to paste into Cursor Agent

Copy the text below into Cursor Agent after extracting this pack into the root of `SHARE-Project-main`.

---

Read `START_HERE_CURSOR.md`, `.cursor/rules/share-product-marketing-alignment.mdc`, and every file in `implementation/` before making changes.

Then inspect the actual SHARE repository and implement `implementation/TASKS.md` sequentially from Phase 0 onward.

Important rules:
- Preserve the current non-custodial/virtual-commitment boundary unless the source proves a specific provider-backed real payment action.
- Do not create a pooled wallet, card issuance, FX, automatic real-money refunds, credit, or regulatory/protection claims.
- Do not rename backend APIs/models purely for marketing language; prefer user-facing copy changes.
- Reuse existing components/routes before creating new architecture.
- Keep secondary features working but de-emphasise them.
- Run tests/build after each meaningful phase.
- Update the checkboxes in `implementation/TASKS.md` as you complete them.
- Create and maintain `implementation/IMPLEMENTATION_NOTES.md` with baseline findings, changed files, assumptions, blockers, and test results.
- If code behaviour contradicts the implementation brief, do not guess. Document the conflict and use the most accurate customer wording supported by the code.

Begin now with Phase 0. Continue through all safe phases without asking for approval for ordinary reversible code changes. Stop only if a task would require regulated money movement, credentials/secrets, destructive data migration, or a major architecture choice not covered by the brief.

---
