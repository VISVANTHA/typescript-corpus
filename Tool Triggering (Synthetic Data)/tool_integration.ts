#!/usr/bin/env ts-node
/**
 * Tool integration entry point -- branch TS-128.
 *
 * The direct analogue of the Python family's tools/tool_integration.py, which
 * is itself the ToolIntegration.targets analogue from the C# reference repo.
 * One command proves every tool is wired.
 *
 *   ts-node tools/tool_integration.ts            print the wiring banner
 *   ts-node tools/tool_integration.ts --list     machine-readable tool list
 *   ts-node tools/tool_integration.ts --verify   every tool has folder+manifest+runner
 *   ts-node tools/tool_integration.ts --run TOOL run one tool's runner
 *   ts-node tools/tool_integration.ts --run-all  run every runner in order
 *
 * FlintAtlas and WillowBrook had no equivalent of this file, no trigger
 * manifests and no runners; their CI ran `npm install && npm test` and invoked
 * none of their declared tools. Gate G6.
 */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "..");
const TOOLS_DIR = path.join(REPO_ROOT, "tools");

export const NODE_TARGET = "21";
export const TYPESCRIPT_VERSION = "5.9.3";
export const BUNDLER_NAME = "esbuild";
export const PACKAGE_MANAGER = "bun";
export const ARCHITECTURE = "Microservices";

interface Wiring {
  readonly dir: string;
  readonly label: string;
  readonly wiring: string;
}

export const TOOL_WIRING: readonly Wiring[] = [
  { dir: "typescript", label: "TypeScript compiler (tsc)", wiring: "pinned 5.0.4 -> type diagnostics (must be empty)" },
  { dir: "esbuild", label: "esbuild", wiring: "pinned 0.21.5 -> build/bundle.cjs + build/bundle.cjs.map, and the bundle is executed" },
  { dir: "mocha", label: "mocha", wiring: "pinned 10.8.2 -> test results (all must pass)" },
  { dir: "vitest", label: "vitest + @vitest/coverage-v8", wiring: "pinned 0.34.6 -> coverage-vitest/coverage-summary.json -- a THIRD independent coverage number, alongside c8 and nyc" },
  { dir: "biome", label: "biome", wiring: "pinned 2.5.10 -> planted findings expected" },
  { dir: "c8", label: "c8 (V8 coverage, primary)", wiring: "pinned 8.0.1 -> coverage/coverage-summary.json -- MUST be non-zero (gate G2)" },
  { dir: "nyc", label: "nyc + ts-node (coverage cross-check)", wiring: "pinned 15.1.0 -> coverage-nyc/coverage-summary.json -- instruments .ts directly, never via source-map remap" },
  { dir: "eslint", label: "eslint", wiring: "pinned 8.57.1 -> planted findings expected" },
  { dir: "sonarjs", label: "eslint-plugin-sonarjs", wiring: "pinned 0.15.0 -> planted findings expected" },
  { dir: "security", label: "eslint-plugin-security", wiring: "pinned 2.1.1 -> planted findings expected" },
  { dir: "eslint-scope", label: "eslint-scope", wiring: "pinned 7.2.2 -> scope/variable inventory per function" },
  { dir: "jscpd", label: "jscpd", wiring: "pinned 3.2.1 -> planted findings expected" },
  { dir: "ts-morph", label: "ts-morph", wiring: "pinned 18.0.0 -> per-function inventory: name, params, statements, depth" },
  { dir: "ts-prune", label: "ts-prune", wiring: "pinned 0.10.3 -> planted findings expected" },
  { dir: "knip", label: "knip", wiring: "pinned 2.43.0 -> reports/knip.json -- unused files, exports and dependencies" },
  { dir: "madge", label: "madge", wiring: "pinned 5.0.2 -> module graph, circular check, orphan list" },
  { dir: "dependency-cruiser", label: "dependency-cruiser", wiring: "pinned 11.18.0 -> dependency graph + rule violations + fan-in/fan-out" },
  { dir: "stryker", label: "@stryker-mutator/core", wiring: "pinned 5.6.1 -> reports/mutation/mutation.json -- mutation score" },
  { dir: "fast-check", label: "fast-check", wiring: "pinned 4.9.0 -> property-based test results, 200 runs per property" },
  { dir: "cdxgen", label: "@cyclonedx/cdxgen", wiring: "pinned 8.6.3 -> reports/sbom.json -- CycloneDX SBOM" },
  { dir: "ort", label: "OSS Review Toolkit (cdxgen license proxy)", wiring: "not an npm package -> reports/licenses.json -- license inventory derived from the cdxgen SBOM" },
  { dir: "ncu", label: "npm-check-updates", wiring: "pinned 12.5.12 -> reports/outdated.json -- available upgrades" },
  { dir: "npm-audit", label: "npm audit / npm ls", wiring: "not an npm package -> planted findings expected" },
  { dir: "opentelemetry", label: "@opentelemetry/sdk-node", wiring: "pinned 0.29.2 -> reports/otel-spans.json -- spans emitted by an instrumented run" },
  { dir: "grype", label: "Grype", wiring: "not an npm package -> planted findings expected" },
  { dir: "lizard", label: "Lizard", wiring: "not an npm package -> reports/lizard.csv -- CCN and token counts. See the caveat in the README" },
  { dir: "pydriller", label: "pydriller", wiring: "not an npm package -> reports/history.json -- churn, coupling and ownership" },
  { dir: "github-advisories", label: "Dependabot / GitHub Security Advisories API", wiring: "not an npm package -> planted findings expected" },
  { dir: "github-api", label: "GitHub API (repos + releases)", wiring: "not an npm package -> reports/upstream.json -- repo metadata and latest release" },
];

function runnerFor(dir: string): string | null {
  const folder = path.join(TOOLS_DIR, dir);
  if (!fs.existsSync(folder)) return null;
  const found = fs
    .readdirSync(folder)
    .filter((f) => /^run_.*\.(sh|js|py|ts)$/.test(f))
    .sort();
  return found.length > 0 ? path.join(folder, found[0]) : null;
}

function banner(): number {
  console.log(
    `=== Tool integration -- branch TS-128 ` +
      `(Node ${NODE_TARGET} / TypeScript ${TYPESCRIPT_VERSION} / ` +
      `${BUNDLER_NAME} / ${PACKAGE_MANAGER} / ${ARCHITECTURE}) ===`,
  );
  for (const t of TOOL_WIRING) {
    console.log(`[${t.label}] ${t.wiring}`);
  }
  console.log(`=== ${TOOL_WIRING.length} tools wired ===`);
  return 0;
}

function list(): number {
  for (const t of TOOL_WIRING) console.log(`${t.dir}\t${t.label}`);
  return 0;
}

function verify(): number {
  const problems: string[] = [];
  for (const t of TOOL_WIRING) {
    const folder = path.join(TOOLS_DIR, t.dir);
    if (!fs.existsSync(folder)) {
      problems.push(`${t.label}: missing folder tools/${t.dir}`);
      continue;
    }
    if (!fs.existsSync(path.join(folder, "trigger.yaml"))) {
      problems.push(`${t.label}: missing tools/${t.dir}/trigger.yaml`);
    }
    if (runnerFor(t.dir) === null) {
      problems.push(`${t.label}: no runner script in tools/${t.dir}`);
    }
  }
  if (problems.length > 0) {
    console.log("FAILED");
    for (const p of problems) console.log(`  - ${p}`);
    return 1;
  }
  console.log(`OK -- all ${TOOL_WIRING.length} tools have a folder, a manifest and a runner.`);
  return 0;
}

function invoke(runner: string): void {
  const ext = path.extname(runner);
  const rel = path.relative(REPO_ROOT, runner);
  if (ext === ".sh") execFileSync("bash", [rel], { cwd: REPO_ROOT, stdio: "inherit" });
  else if (ext === ".js") execFileSync("node", [rel], { cwd: REPO_ROOT, stdio: "inherit" });
  else if (ext === ".py") execFileSync("python3", [rel], { cwd: REPO_ROOT, stdio: "inherit" });
  else execFileSync("node_modules/.bin/ts-node", [rel], { cwd: REPO_ROOT, stdio: "inherit" });
}

function run(name: string): number {
  const match = TOOL_WIRING.find((t) => t.dir.toLowerCase() === name.toLowerCase());
  if (match === undefined) {
    console.error(`unknown tool: ${name}`);
    console.error("known tools: " + TOOL_WIRING.map((t) => t.dir).join(", "));
    return 2;
  }
  const runner = runnerFor(match.dir);
  if (runner === null) {
    console.error(`${match.label}: no runner script`);
    return 1;
  }
  invoke(runner);
  return 0;
}

function runAll(): number {
  const failed: string[] = [];
  for (const t of TOOL_WIRING) {
    const runner = runnerFor(t.dir);
    if (runner === null) { failed.push(t.dir); continue; }
    console.log(`\n========== ${t.label} ==========`);
    try {
      invoke(runner);
    } catch (error) {
      console.error(`[${t.label}] runner exited non-zero`);
      failed.push(t.dir);
    }
  }
  console.log(`\n=== ${TOOL_WIRING.length - failed.length}/${TOOL_WIRING.length} runners succeeded ===`);
  if (failed.length > 0) {
    console.log("failed: " + failed.join(", "));
    return 1;
  }
  return 0;
}

function main(argv: string[]): number {
  const [flag, value] = argv;
  if (flag === undefined) return banner();
  if (flag === "--list") return list();
  if (flag === "--verify") return verify();
  if (flag === "--run-all") return runAll();
  if (flag === "--run") {
    if (value === undefined) { console.error("--run needs a tool name"); return 2; }
    return run(value);
  }
  console.error(`unknown flag: ${flag}`);
  return 2;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
