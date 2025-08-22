# Project Brief — StorySmith (One Page)

**Purpose:** A simple, friendly site that lets a user create story pages (title, text, image placeholders) and render them publicly as a shareable link.

**Non-Negotiable Baseline:** Next.js 14 (App Router) + TypeScript + Tailwind. Prisma allowed but schema changes require a dedicated Schema PR with a migration plan.

**Milestones:**
- **M1 Lite:** Pages Editor (Hero + Content blocks), public render route. No auth.
- **M2 Assets:** Asset Library + secure upload (MIME + extension), AssetPicker wired to editor.
- **M3 Auth:** NextAuth single provider; session guards for dashboard.
- **M4 Themes/Preview:** Theme primitives + preview route.

**Delivery Rules:** PR-only. Each PR must be green in CI and include:
1) Change Summary (≤10 lines) 2) Rollback Note 3) Risks 4) Updated `SUMMARY.md` and `review-kit/REVIEW_KIT.json`.

**Out of Scope for Now:** Multi-tenant, payments, complex roles, theme marketplaces.
