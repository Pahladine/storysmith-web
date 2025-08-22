Param(
  [string]$RepoPath = ".",
  [string]$Branch = "chore/ci-guardrails",
  [switch]$UseNpm,
  [string]$GitHubRepo,      # owner/repo
  [switch]$CreatePR,
  [string]$Base = "main"
)

$ErrorActionPreference = "Stop"

function Write-FileLines {
  param([string]$Path, [string[]]$Lines)
  $dir = Split-Path $Path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Set-Content -Path $Path -Value $Lines -Encoding UTF8
  Write-Host "✓ Wrote $Path"
}

function Read-Json([string]$Path) { if (Test-Path $Path) { (Get-Content $Path -Raw) | ConvertFrom-Json -Depth 50 } else { $null } }
function Write-Json([string]$Path, $Object) { $Object | ConvertTo-Json -Depth 50 | Set-Content -Path $Path -Encoding UTF8 }

function Ensure-Tooling {
  if ($UseNpm) { return }
  try { node --version | Out-Null } catch { throw "Node.js 20.x required." }
  try { pnpm --version | Out-Null } catch {
    Write-Host "• Enabling pnpm via corepack..."
    corepack enable | Out-Null
    corepack prepare pnpm@9 --activate | Out-Null
    pnpm --version | Out-Null
    Write-Host "✓ pnpm ready"
  }
}

function Merge-PackageJson {
  $pkgPath = Join-Path $RepoPath "package.json"
  $pkg = Read-Json $pkgPath
  if (-not $pkg) { throw "No package.json found at $pkgPath" }

  if (-not $pkg.scripts) { $pkg | Add-Member scripts (@{}) }
  if (-not $pkg.devDependencies) { $pkg | Add-Member devDependencies (@{}) }

  $scriptsToAdd = @{
    "dev"           = "next dev -p 3001";
    "build"         = "next build";
    "start"         = "next start -p 3001";
    "tsc"           = "tsc";
    "lint"          = "eslint . --ext .ts,.tsx --max-warnings=0";
    "test:smoke"    = "playwright test -c playwright.config.ts";
    "test:smoke:ci" = "start-server-and-test start http://localhost:3001 'playwright test -c playwright.config.ts'";
    "review:kit"    = "tsx scripts/generateReviewKit.ts";
    "review:kit:ci" = "tsx scripts/generateReviewKit.ts --ci";
  }
  foreach ($k in $scriptsToAdd.Keys) { if (-not $pkg.scripts.PSObject.Properties.Name -contains $k) { $pkg.scripts.$k = $scriptsToAdd[$k] } }

  $devs = @{
    "@playwright/test"      = "^1.47.0";
    "eslint"                = "^9.9.0";
    "next"                  = "^14.2.5";
    "start-server-and-test" = "^2.0.0";
    "tsx"                   = "^4.15.7";
    "typescript"            = "^5.5.4";
    "typescript-eslint"     = "^8.0.0"
  }
  foreach ($k in $devs.Keys) { if (-not $pkg.devDependencies.PSObject.Properties.Name -contains $k) { $pkg.devDependencies.$k = $devs[$k] } }

  if (-not $UseNpm -and -not $pkg.PSObject.Properties.Name -contains "packageManager") { $pkg | Add-Member packageManager "pnpm@9" }

  Write-Json $pkgPath $pkg
  return $pkg
}

function Write-DropIns {
  # CI workflow (2025-safe: explicit playwright browsers install)
  $ci = @(
    'name: CI',
    'on:',
    '  pull_request:',
    '    branches: [ main, master ]',
    '  push:',
    '    branches: [ ci-test ]',
    'env:',
    '  NODE_VERSION: "20.x"',
    '  PORT: "3001"',
    '  CI: "true"',
    'jobs:',
    '  build-and-test:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: Checkout',
    '        uses: actions/checkout@v4',
    '      - name: Use Node',
    '        uses: actions/setup-node@v4',
    '        with:',
    '          node-version: ${{ env.NODE_VERSION }}',
    ('          cache: ' + ($(if ($UseNpm) { 'npm' } else { 'pnpm' }))),
    ($(if ($UseNpm) { '# npm path' } else { '      - name: Install pnpm' })),
    ($(if ($UseNpm) { '# npm path' } else { '        uses: pnpm/action-setup@v4' })),
    ($(if ($UseNpm) { '# npm path' } else { '        with:' })),
    ($(if ($UseNpm) { '# npm path' } else { '          version: 9' })),
    ($(if ($UseNpm) { '# npm path' } else { '          run_install: false' })),
    '      - name: Install dependencies (frozen)',
    ($(if ($UseNpm) { '        run: npm ci' } else { '        run: pnpm install --frozen-lockfile' })),
    '      - name: Install Playwright browsers',
    '        run: npx playwright install --with-deps',
    '      - name: Typecheck (no emit)',
    ($(if ($UseNpm) { '        run: npm run tsc -- --noEmit' } else { '        run: pnpm tsc --noEmit' })),
    '      - name: Lint',
    ($(if ($UseNpm) { '        run: npm run lint' } else { '        run: pnpm lint' })),
    '      - name: Build',
    ($(if ($UseNpm) { '        run: npm run build' } else { '        run: pnpm build' })),
    '      - name: Start app & run Playwright smokes',
    ($(if ($UseNpm) { '        run: npm run test:smoke:ci' } else { '        run: pnpm test:smoke:ci' })),
    '      - name: Generate REVIEW_KIT.json',
    ($(if ($UseNpm) { '        run: npm run review:kit:ci' } else { '        run: pnpm review:kit:ci' })),
    '      - name: Upload Playwright report (html)',
    '        if: always()',
    '        uses: actions/upload-artifact@v4',
    '        with:',
    '          name: playwright-report',
    '          path: playwright-report',
    '          if-no-files-found: ignore',
    '          retention-days: 7',
    '      - name: Upload REVIEW_KIT.json',
    '        if: always()',
    '        uses: actions/upload-artifact@v4',
    '        with:',
    '          name: review-kit',
    '          path: review-kit/REVIEW_KIT.json',
    '          if-no-files-found: ignore',
    '          retention-days: 7'
  )
  Write-FileLines -Path (Join-Path $RepoPath ".github/workflows/ci.yml") -Lines $ci

  # Playwright config
  $playwrightCfg = @(
    'import { defineConfig } from "@playwright/test";',
    'export default defineConfig({',
    '  testDir: "tests",',
    '  outputDir: "test-results",',
    '  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],',
    '  use: { baseURL: process.env.BASE_URL || "http://localhost:3001", trace: "retain-on-failure" },',
    '  timeout: 60000',
    '});'
  )
  Write-FileLines -Path (Join-Path $RepoPath "playwright.config.ts") -Lines $playwrightCfg

  # Smoke tests
  $smokes = @(
    'import { test, expect } from "@playwright/test";',
    'test("home page renders", async ({ page }) => {',
    '  await page.goto("/");',
    '  await expect(page).toHaveTitle(/StorySmith|Next\.js/i);',
    '  await expect(page.locator("body")).toBeVisible();',
    '});',
    'test("dashboard route responds (if present)", async ({ page }) => {',
    '  const res = await page.goto("/dashboard");',
    '  expect([200, 302, 401, 403, 404]).toContain(res?.status() ?? 0);',
    '});',
    'test("public render route shape (if present)", async ({ page }) => {',
    '  const res = await page.goto("/p/test-page");',
    '  expect([200, 302, 404]).toContain(res?.status() ?? 0);',
    '});'
  )
  Write-FileLines -Path (Join-Path $RepoPath "tests/smoke.spec.ts") -Lines $smokes

  # REVIEW_KIT generator
  $review = @(
    '/** Generates review-kit/REVIEW_KIT.json */',
    'import fs from "node:fs";',
    'import path from "node:path";',
    'import { execSync } from "node:child_process";',
    'type ReviewKit = {',
    '  meta: { generatedAt: string; ci: boolean; node: string; };',
    '  package?: { name?: string; version?: string; scripts?: Record<string,string>; dependencies?: Record<string,string>; devDependencies?: Record<string,string>; };',
    '  routes: { route: string; file: string }[];',
    '  envAudit: { exampleOnly: string[]; missingInExample: string[]; presentInBoth: string[]; };',
    '  prisma?: { schemaPath?: string | null; schema?: string | null; };',
    '  git?: { ref?: string; changedFiles?: string[]; };',
    '};',
    'const repoRoot = process.cwd();',
    'const outDir = path.join(repoRoot, "review-kit");',
    'const outFile = path.join(outDir, "REVIEW_KIT.json");',
    'function safeRead(p:string){try{return fs.readFileSync(p,"utf8")}catch{return null}}',
    'function scanRoutes(){',
    '  const appDir = path.join(repoRoot,"src","app");',
    '  const results: {route:string;file:string}[] = [];',
    '  const walk=(d:string)=>{let es:string[]=[];try{es=fs.readdirSync(d)}catch{return};for(const n of es){const f=path.join(d,n);const s=fs.statSync(f);if(s.isDirectory())walk(f); else if(n==="page.tsx"||n==="page.ts"){const rel=f.split(path.sep).slice(f.split(path.sep).indexOf("app")+1,-1); const r="/"+rel.join("/").replace(/\/page$/,""); results.push({route:r||"/",file:path.relative(repoRoot,f)})}}};',
    '  walk(appDir); return results.sort((a,b)=>a.route.localeCompare(b.route));',
    '}',
    'function envAudit(){',
    '  const env=safeRead(path.join(repoRoot,".env")); const ex=safeRead(path.join(repoRoot,".env.example"));',
    '  const keys=(c:string|null)=> (c??"").split(/\r?\n/).map(l=>l.trim()).filter(l=>l && !l.startsWith("#") && l.includes("=")).map(l=>l.split("=")[0].trim());',
    '  const real=new Set(keys(env)); const exs=new Set(keys(ex));',
    '  const exampleOnly=[...exs].filter(k=>!real.has(k)).sort();',
    '  const missingInExample=[...real].filter(k=>!exs.has(k)).sort();',
    '  const presentInBoth=[...exs].filter(k=>real.has(k)).sort();',
    '  return {exampleOnly,missingInExample,presentInBoth};',
    '}',
    'function prismaSnapshot(){',
    '  const p=path.join(repoRoot,"prisma","schema.prisma"); const s=safeRead(p);',
    '  return {schemaPath: fs.existsSync(p) ? "prisma/schema.prisma" : null, schema: s ?? null};',
    '}',
    'function gitInfo(){',
    '  const info:any={};',
    '  try{info.ref=execSync("git rev-parse --short HEAD").toString().trim()}catch{}',
    '  try{const base=(process.env.GITHUB_BASE_REF&&process.env.GITHUB_SHA)?`origin/${process.env.GITHUB_BASE_REF}`:"HEAD~1";',
    '      const diff=execSync(`git diff --name-only ${base}`).toString().trim().split("\n").filter(Boolean);',
    '      info.changedFiles=diff;',
    '  }catch{info.changedFiles=[]}',
    '  return info;',
    '}',
    'function main(){',
    '  const ci=!!process.env.CI; if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{recursive:true});',
    '  let pkg:any; try{pkg=JSON.parse(fs.readFileSync(path.join(repoRoot,"package.json"),"utf8"))}catch{pkg=undefined}',
    '  const kit:ReviewKit={',
    '    meta:{generatedAt:new Date().toISOString(),ci,node:process.version},',
    '    package: pkg ? {name:pkg.name,version:pkg.version,scripts:pkg.scripts,dependencies:pkg.dependencies,devDependencies:pkg.devDependencies} : undefined,',
    '    routes: scanRoutes(),',
    '    envAudit: envAudit(),',
    '    prisma: prismaSnapshot(),',
    '    git: gitInfo()',
    '  };',
    '  fs.writeFileSync(outFile, JSON.stringify(kit,null,2), "utf8");',
    '  console.log(`[review:kit] Wrote ${path.relative(repoRoot,outFile)}`);',
    '}',
    'main();'
  )
  Write-FileLines -Path (Join-Path $RepoPath "scripts/generateReviewKit.ts") -Lines $review

  # docs
  $summary = @(
    '# StorySmith — Project Summary (Starter)','',
    '## What this is (one paragraph for any AI)',
    'StorySmith is a Next.js 14 + TypeScript + Tailwind web app that lets users create simple storybook pages and render them publicly.',
    'The app will roll out in 4 milestones: M1 Lite (no auth), M2 Assets Library, M3 Auth (single provider), M4 Themes & Preview.',
    'All changes must arrive as GitHub PRs and pass CI (typecheck, lint, build, boot, smoke tests) before merge.','',
    '## Folder map (key only)',
    '- `src/app` — App Router pages and routes',
    '- `src/components` — Reusable UI',
    '- `src/lib` — Utilities (auth, prisma, etc.)',
    '- `prisma/schema.prisma` — DB schema (changes require Schema PR)',
    '- `public/` — Static assets','',
    '## Routes (snapshot)',
    '*(Agents: keep this list fresh each PR; add new routes with 1-line description)*',
    '- `/` — Home',
    '- `/dashboard` — Editor home (guarded in M3+)',
    '- `/p/[slug]` — Public render of a page','',
    '## Contracts',
    '- Tech baseline frozen unless a dedicated proposal PR',
    '- Asset uploads must validate extension + MIME; block double-extensions (e.g., `file.php.jpg`)',
    '- Prisma changes by **Schema PR** with migration plan','',
    '## CI Definition of Green',
    'Install (frozen) → Typecheck → Lint → Build → Boot on :3001 → Playwright smokes → Generate REVIEW_KIT.json'
  )
  Write-FileLines -Path (Join-Path $RepoPath "SUMMARY.md") -Lines $summary

  $brief = @(
    '# Project Brief — StorySmith (One Page)','',
    '**Purpose:** A simple, friendly site that lets a user create story pages (title, text, image placeholders) and render them publicly as a shareable link.','',
    '**Non-Negotiable Baseline:** Next.js 14 (App Router) + TypeScript + Tailwind. Prisma allowed but schema changes require a dedicated Schema PR with a migration plan.','',
    '**Milestones:**',
    '- **M1 Lite:** Pages Editor (Hero + Content blocks), public render route. No auth.',
    '- **M2 Assets:** Asset Library + secure upload (MIME + extension), AssetPicker wired to editor.',
    '- **M3 Auth:** NextAuth single provider; session guards for dashboard.',
    '- **M4 Themes/Preview:** Theme primitives + preview route.','',
    '**Delivery Rules:** PR-only. Each PR must be green in CI and include:',
    '1) Change Summary (≤10 lines) 2) Rollback Note 3) Risks 4) Updated `SUMMARY.md` and `review-kit/REVIEW_KIT.json`.','',
    '**Out of Scope for Now:** Multi-tenant, payments, complex roles, theme marketplaces.'
  )
  Write-FileLines -Path (Join-Path $RepoPath "PROJECT_BRIEF.md") -Lines $brief

  $ops = @(
    '# Operating Agreement — Agents Working This Repo','',
    '- Deliver **code only via GitHub Pull Requests**. No zip layers.',
    '- Every PR must pass CI: install (frozen), typecheck, lint, build, boot (3001), Playwright smoke tests, review-kit generation.',
    '- Include in PR:',
    '  - **Change Summary** (≤10 lines) explaining what changed and why',
    '  - **Rollback Note** (how to revert safely)',
    '  - **Risks**',
    '  - Update `SUMMARY.md` and generate `review-kit/REVIEW_KIT.json`',
    '- **Security:** For file uploads, block double-extension filenames (e.g., `file.php.jpg`), validate MIME and extension.',
    '- **Database:** Prisma schema changes must be a **Schema PR** with a migration and backfill plan.',
    '- If CI is red, the agent must diagnose and push a fix. Do not ask the user to patch locally.'
  )
  Write-FileLines -Path (Join-Path $RepoPath "OPERATING_AGREEMENT.md") -Lines $ops

  $log = @(
    '# Build Log (Append-Only)','',
    '## 2025-08-22 — Repo initialised with CI + smokes + review-kit',
    '- Added .github/workflows/ci.yml',
    '- Added Playwright config and basic smoke tests',
    '- Added review-kit generator',
    '- Added project guardrail docs (SUMMARY, BRIEF, AGREEMENT, LOG)'
  )
  Write-FileLines -Path (Join-Path $RepoPath "BUILD_LOG.md") -Lines $log
}

function Ensure-DependenciesInstalled {
  $pkg = Read-Json (Join-Path $RepoPath "package.json")
  $need = @()
  foreach ($p in @("@playwright/test","eslint","start-server-and-test","tsx","typescript","typescript-eslint")) {
    if (-not ($pkg.devDependencies.PSObject.Properties.Name -contains $p)) { $need += $p }
  }
  if ($need.Count -gt 0) {
    Write-Host "• Installing devDependencies: $($need -join ', ')"
    if ($UseNpm) { npm i -D @($need) | Out-Null } else { pnpm add -D @($need) | Out-Null }
  } else { Write-Host "• DevDependencies already satisfied" }
}

function Ensure-GitRepo {
  Push-Location $RepoPath
  $isRepo = $false
  try { git rev-parse --is-inside-work-tree | Out-Null; $isRepo = $true } catch {}
  if (-not $isRepo) { git init | Out-Null }
  # infer origin if missing
  $hasOrigin = $true
  try { git remote get-url origin | Out-Null } catch { $hasOrigin = $false }
  if (-not $hasOrigin) {
    if (-not $GitHubRepo) { throw "No Git remote. Provide -GitHubRepo owner/repo to set origin." }
    git remote add origin ("https://github.com/{0}.git" -f $GitHubRepo)
  }
  Pop-Location
}

function CommitPushPR {
  Push-Location $RepoPath
  $current = (git rev-parse --abbrev-ref HEAD).Trim()
  if ($current -ne $Branch) { git checkout -b $Branch | Out-Null }
  git add -A
  if ((git diff --cached --name-only)) {
    git commit -m "chore: add CI gate, smokes, review-kit, and guardrail docs" | Out-Null
    git push -u origin $Branch
  } else { Write-Host "• No changes to commit." }
  if ($CreatePR) {
    gh pr create --base $Base --head $Branch --title "CI gate + smokes + review-kit" --body "Adds CI (typecheck→lint→build→boot→Playwright smokes), review-kit generator, and guardrail docs." | Out-Null
    Write-Host "✓ PR opened."
  }
  Pop-Location
}

# ------------------- RUN -------------------
Push-Location $RepoPath
try {
  Ensure-Tooling
  $pkg = Merge-PackageJson
  Write-DropIns
  Ensure-DependenciesInstalled
  Ensure-GitRepo
  CommitPushPR
  Write-Host "`nALL SET. Open GitHub → Pull Requests and watch CI."
} finally { Pop-Location }
