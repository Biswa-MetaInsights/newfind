// DEV ONLY. NEVER DELETE. — guard for the frontend testing folders.
//
// Run first by `pnpm --filter @eventmind/web type-check` (and so by every
// agent and every phase). Fails, before tsc even starts, when:
//   1. repo-root `frontend_testing/` or one of its required files is missing (README,
//      DO_NOT_DELETE, the seed entry point + reset, the demo fixtures + their checklist);
//   2. the in-app `apps/web/src/frontend_testing/` or one of its files is missing;
//   3. a flag in `src/frontend_testing/dev-flags.ts` reads an env var without the
//      `process.env.NODE_ENV === "development" &&` half;
//   4. a dev-only env var (`NEXT_PUBLIC_SKIP_*`, `NEXT_PUBLIC_DEV_*`) is read
//      anywhere in `src/` outside dev-flags.ts, which would sidestep rule 3.
// Plain Node, no dependencies. Rules: repo-root `frontend_testing/README.md`.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(webRoot, "..", "..", "..");
const inApp = join(webRoot, "src", "frontend_testing");
const flagsFile = join(inApp, "dev-flags.ts");

const required = [
  join(repoRoot, "frontend_testing", "README.md"),
  join(repoRoot, "frontend_testing", "DO_NOT_DELETE.md"),
  join(repoRoot, "frontend_testing", "seed", "seed.mjs"),
  join(repoRoot, "frontend_testing", "seed", "reset.mjs"),
  join(repoRoot, "frontend_testing", "fixtures", "demo-data.mjs"),
  join(repoRoot, "frontend_testing", "fixtures", "CHECKLIST.md"),
  flagsFile,
  join(inApp, "BypassStrip.tsx"),
  join(inApp, "DevBanner.tsx"),
  ...["events.ts", "organizer.ts", "communities.ts"].map((f) => join(inApp, "fixtures", f)),
];

const problems = [];
const rel = (p) => relative(repoRoot, p).replaceAll("\\", "/");

for (const p of required) {
  if (!existsSync(p)) problems.push(`missing ${rel(p)}`);
}

const DEV_HALF = /process\.env\.NODE_ENV\s*===\s*["']development["']\s*&&/;
if (existsSync(flagsFile)) {
  const src = readFileSync(flagsFile, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  for (const m of src.matchAll(/export\s+const\s+(\w+)\s*=([^;]*);/g)) {
    const [, name, init] = m;
    if (init.includes("process.env.") && !DEV_HALF.test(init)) {
      problems.push(`dev-flags.ts: ${name} lacks the NODE_ENV === "development" && half`);
    }
  }
}

const DEV_VAR = /process\.env\.NEXT_PUBLIC_(SKIP|DEV)_\w+/;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name) && p !== flagsFile) {
      const hit = readFileSync(p, "utf8").match(DEV_VAR);
      if (hit) problems.push(`${rel(p)} reads ${hit[0]} directly; import it from dev-flags.ts`);
    }
  }
}
walk(join(webRoot, "src"));

if (problems.length) {
  console.error("check-frontend-testing: FAILED");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("These folders are dev-only and must never be deleted; see frontend_testing/README.md.");
  process.exit(1);
}
console.log("check-frontend-testing: ok");
