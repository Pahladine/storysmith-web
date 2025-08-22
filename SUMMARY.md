# StorySmith — Project Summary (Starter)

## What this is (one paragraph for any AI)
StorySmith is a Next.js 14 + TypeScript + Tailwind web app that lets users create simple storybook pages and render them publicly. The app will roll out in 4 milestones: M1 Lite (no auth), M2 Assets Library, M3 Auth (single provider), M4 Themes & Preview. All changes must arrive as GitHub PRs and pass CI (typecheck, lint, build, boot, smoke tests) before merge.

## Folder map (key only)
- `src/app` — App Router pages and routes
- `src/components` — Reusable UI
- `src/lib` — Utilities (auth, prisma, etc.)
- `prisma/schema.prisma` — DB schema (changes require Schema PR)
- `public/` — Static assets

## Routes (snapshot)
*(Agents: keep this list fresh each PR; add new routes with 1-line description)*
- `/` — Home
- `/dashboard` — Editor home (guarded in M3+)
- `/p/[slug]` — Public render of a page

## Contracts
- Tech baseline frozen unless a dedicated proposal PR
- Asset uploads must validate extension + MIME; block double-extensions (e.g., `file.php.jpg`)
- Prisma changes by **Schema PR** with migration plan

## CI Definition of Green
Install (frozen) → Typecheck → Lint → Build → Boot on :3001 → Playwright smokes → Generate REVIEW_KIT.json
