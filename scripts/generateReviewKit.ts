/**
 * Generates review-kit/REVIEW_KIT.json with:
 * - package meta
 * - route snapshot (scans src/app for page.ts/tsx)
 * - env audit (.env.example vs .env)
 * - prisma schema snapshot (if exists)
 * - git info (current ref, changed files if in CI)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

type ReviewKit = {
  meta: {
    generatedAt: string;
    ci: boolean;
    node: string;
  };
  package?: {
    name?: string;
    version?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  routes: { route: string; file: string }[];
  envAudit: {
    exampleOnly: string[];
    missingInExample: string[];
    presentInBoth: string[];
  };
  prisma?: {
    schemaPath?: string | null;
    schema?: string | null;
  };
  git?: {
    ref?: string;
    changedFiles?: string[];
  };
};

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, 'review-kit');
const outFile = path.join(outDir, 'REVIEW_KIT.json');

function safeRead(p: string): string | null {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function scanRoutes(): { route: string; file: string }[] {
  const appDir = path.join(repoRoot, 'src', 'app');
  const results: { route: string; file: string }[] = [];

  const walk = (dir: string) => {
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (name === 'page.tsx' || name === 'page.ts') {
        // Convert /src/app/a/[id]/page.tsx -> route /a/[id]
        const parts = full.split(path.sep);
        const appIdx = parts.indexOf('app');
        const rel = parts.slice(appIdx + 1, parts.length - 1);
        const route = '/' + rel.join('/').replace(/\/page$/, '');
        results.push({ route: route || '/', file: path.relative(repoRoot, full) });
      }
    }
  };

  walk(appDir);
  return results.sort((a, b) => a.route.localeCompare(b.route));
}

function envAudit(): ReviewKit['envAudit'] {
  const env = safeRead(path.join(repoRoot, '.env'));
  const envEx = safeRead(path.join(repoRoot, '.env.example'));

  const getKeys = (content: string | null) =>
    (content ?? '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => l.split('=')[0].trim());

  const real = new Set(getKeys(env));
  const ex = new Set(getKeys(envEx));

  const exampleOnly = [...ex].filter((k) => !real.has(k)).sort();
  const missingInExample = [...real].filter((k) => !ex.has(k)).sort();
  const presentInBoth = [...ex].filter((k) => real.has(k)).sort();

  return { exampleOnly, missingInExample, presentInBoth };
}

function prismaSnapshot() {
  const prismaPath = path.join(repoRoot, 'prisma', 'schema.prisma');
  const schema = safeRead(prismaPath);
  return { schemaPath: fs.existsSync(prismaPath) ? 'prisma/schema.prisma' : null, schema: schema ?? null };
}

function gitInfo() {
  const info: { ref?: string; changedFiles?: string[] } = {};
  try {
    info.ref = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {}

  try {
    const base =
      process.env.GITHUB_BASE_REF && process.env.GITHUB_SHA
        ? `origin/${process.env.GITHUB_BASE_REF}`
        : 'HEAD~1';
    const diff = execSync(`git diff --name-only ${base}`)
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
    info.changedFiles = diff;
  } catch {
    info.changedFiles = [];
  }
  return info;
}

function main() {
  const ci = !!process.env.CI;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let pkg: ReviewKit['package'];
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  } catch {
    pkg = undefined;
  }

  const kit: ReviewKit = {
    meta: {
      generatedAt: new Date().toISOString(),
      ci,
      node: process.version
    },
    package: pkg
      ? {
          name: (pkg as any).name,
          version: (pkg as any).version,
          scripts: (pkg as any).scripts,
          dependencies: (pkg as any).dependencies,
          devDependencies: (pkg as any).devDependencies
        }
      : undefined,
    routes: scanRoutes(),
    envAudit: envAudit(),
    prisma: prismaSnapshot(),
    git: gitInfo()
  };

  fs.writeFileSync(outFile, JSON.stringify(kit, null, 2), 'utf8');
  console.log(`[review:kit] Wrote ${path.relative(repoRoot, outFile)}`);
}

main();
