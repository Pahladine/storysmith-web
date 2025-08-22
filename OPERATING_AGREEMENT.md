# Operating Agreement — Agents Working This Repo

- Deliver **code only via GitHub Pull Requests**. No zip layers.
- Every PR must pass CI: install (frozen), typecheck, lint, build, boot (3001), Playwright smoke tests, review-kit generation.
- Include in PR:
  - **Change Summary** (≤10 lines) explaining what changed and why
  - **Rollback Note** (how to revert safely)
  - **Risks**
  - Update `SUMMARY.md` and generate `review-kit/REVIEW_KIT.json`
- **Security:** For file uploads, block double-extension filenames (e.g., `file.php.jpg`), validate MIME and extension.
- **Database:** Prisma schema changes must be a **Schema PR** with a migration and backfill plan.
- If CI is red, the agent must diagnose and push a fix. Do not ask the user to patch locally.
