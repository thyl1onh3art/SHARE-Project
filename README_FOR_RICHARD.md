# How to use this pack in Cursor

1. Extract this ZIP.
2. Copy the extracted contents into the **root of your `SHARE-Project-main` project**. The `.cursor` folder must sit at the project root.
3. Open the project in Cursor.
4. Open Cursor Agent.
5. Paste the prompt from `implementation/CURSOR_EXECUTION_PROMPT.md`.
6. Let Cursor first inspect the repo and complete Phase 0 before it edits financial wording.
7. Review the changes in Git before deploying.

The pack is designed so Cursor has the classification, product direction, safety boundaries, exact task order, copy rules, likely code paths and acceptance criteria in machine-readable and human-readable form.

Cursor still needs an Agent command to start execution; placing files in the repo gives it persistent project instructions but does not safely auto-execute code changes by itself.
