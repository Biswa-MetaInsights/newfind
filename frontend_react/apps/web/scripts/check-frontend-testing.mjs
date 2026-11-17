// DEV ONLY. NEVER DELETE. — guard for the in-app frontend testing files.
//
// Run first by `pnpm --filter @eventmind/web type-check` (and so by every
// agent and every phase). Fails, before tsc even starts, when:
//   1. an in-app testing file is missing;
//   2. a feature flag reads an environment variable outside development;
//   3. another source file reads a dev-only environment variable directly.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const inApp = join(webRoot, "src", "frontend_testing");
const flagsFile = join(inApp, "dev-flags.ts");

const required = [
  flagsFile,
  join(inApp, "BypassStrip.tsx"),
  join(inApp, "DevBanner.tsx"),
  ...["events.ts", "organizer.ts", "communities.ts"].map((f) => join(inApp, "fixtures", f)),
];

const problems = [];
const rel = (p) => relative(webRoot, p).replaceAll("\\", "/");

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
  console.error("Restore the required in-app testing files and development-only flag checks.");
  process.exit(1);
}
console.log("check-frontend-testing: ok");
