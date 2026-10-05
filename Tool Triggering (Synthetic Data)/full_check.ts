#!/usr/bin/env ts-node
/**
 * Cross-file consistency audit -- branch TS-183.
 *
 * The Python family's hard-won rule applies here verbatim: **read expected
 * values from the repository, never from a hard-coded list.** A hard-coded
 * expectation silently drifts from the manifest and then certifies the drift.
 * Every check below derives its expectation from a file in the repo.
 *
 * This is the check that would have caught FlintAtlas's Architecture MISMATCH:
 * the sheet said Microservices, and the repo's own README and dataset.json said
 * monolith. Nothing compared them.
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const problems: string[] = [];
const checks: string[] = [];

function fail(msg: string): void { problems.push(msg); }
function ok(msg: string): void { checks.push(msg); }
function read(rel: string): string { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function exists(rel: string): boolean { return fs.existsSync(path.join(ROOT, rel)); }
function readJson(rel: string): any { return JSON.parse(read(rel)); }

/** Minimal YAML reader for the flat trigger.yaml shape we emit. */
function readTrigger(rel: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of read(rel).split("\n")) {
    const m = /^([a-zA-Z_-]+):\s*(.*)$/.exec(line);
    if (m === null) continue;
    let v = m[2].trim();
    const hash = v.indexOf(" #");
    if (hash > -1) v = v.slice(0, hash).trim();
    out[m[1]] = v.replace(/^"(.*)"$/, "$1");
  }
  return out;
}

const pkg = readJson("package.json");
const dataset = readJson("dataset.json");
const nvmrc = read(".nvmrc").trim();

// ---------------------------------------------------------------- 1. versions
const nodeMajor = nvmrc.split(".")[0];
if (dataset.nodeVersion !== nodeMajor) {
  fail(`dataset.json nodeVersion ${dataset.nodeVersion} != .nvmrc major ${nodeMajor}`);
} else ok(`.nvmrc (${nvmrc}) agrees with dataset.json nodeVersion`);

// Derived from .nvmrc, NOT hard-coded. An earlier revision of this checker
// asserted `.includes("12")` literally, so every corpus after the Node 12
// family reported a spurious FAIL here -- a checker that is wrong about the
// thing it exists to check is the same silent-success class the corpus is
// built to expose, just inverted into a silent failure.
{
  const declared = String((pkg.engines && pkg.engines.node) || "");
  const want = new RegExp(`(^|[^0-9])${nodeMajor}([^0-9]|$)`);
  if (!want.test(declared)) {
    fail(`package.json engines.node (${declared}) does not target Node ${nodeMajor}`);
  } else ok(`package.json engines.node = ${declared} (targets Node ${nodeMajor})`);
}

const ci = exists(".github/workflows/ci.yml") ? read(".github/workflows/ci.yml") : "";
if (!ci.includes(nvmrc)) fail(`CI node-version does not pin ${nvmrc}`);
else ok(`CI pins node-version ${nvmrc}`);

// -------------------------------------------------- 2. package manager + arch
const declaredPm = String(pkg.packageManager || "");
if (!declaredPm.startsWith(String(dataset.packageManagerVersion ? dataset.packageManager : ""). replace(" (Berry)", ""))) {
  // tolerant: compare the manager name only
}
const pmName = declaredPm.split("@")[0];
if (!String(dataset.packageManager).toLowerCase().includes(pmName)) {
  fail(`packageManager "${declaredPm}" disagrees with dataset.json packageManager "${dataset.packageManager}"`);
} else ok(`packageManager ${declaredPm} agrees with dataset.json`);

const isMicro = dataset.architecture === "Microservices";
if (isMicro) {
  if (!Array.isArray(pkg.workspaces) || pkg.workspaces.length === 0) {
    fail("architecture is Microservices but package.json declares no workspaces");
  } else ok(`Microservices: workspaces = ${JSON.stringify(pkg.workspaces)}`);

  const units: string[] = dataset.deployableUnits || [];
  if (units.length < 3) fail(`Microservices needs >=3 deployable units, dataset lists ${units.length}`);
  for (const svc of units) {
    if (!exists(`services/${svc}/package.json`)) fail(`declared service ${svc} has no manifest`);
    if (!exists(`services/${svc}/src/index.ts`)) fail(`declared service ${svc} has no entry point`);
  }
  if (units.length >= 3) ok(`Microservices: ${units.length} deployable services, each with a manifest and an entry point`);
} else {
  if (Array.isArray(pkg.workspaces) && pkg.workspaces.length > 0) {
    fail("architecture is Monolith but package.json declares workspaces");
  } else ok("Monolith: one deployable package, no workspaces");
  if (exists("services")) fail("architecture is Monolith but a services/ directory exists");
}

// --------------------------------------------------------- 3. source root
const src: string = dataset.sourceRoot;
if (!exists(src)) fail(`dataset.json sourceRoot ${src} does not exist`);
else ok(`sourceRoot ${src} exists`);

// ------------------------------------------------------- 4. trigger manifests
const toolsDir = path.join(ROOT, "tools");
const toolDirs = fs.readdirSync(toolsDir).filter((d) => fs.statSync(path.join(toolsDir, d)).isDirectory());
let manifestCount = 0;
for (const dir of toolDirs) {
  const trigRel = `tools/${dir}/trigger.yaml`;
  if (!exists(trigRel)) { fail(`tools/${dir} has no trigger.yaml`); continue; }
  manifestCount += 1;
  const t = readTrigger(trigRel);

  if (t.node_version !== dataset.nodeVersion) {
    fail(`${trigRel}: node_version ${t.node_version} != dataset ${dataset.nodeVersion}`);
  }
  if (t.branch !== dataset.branchId) {
    fail(`${trigRel}: branch ${t.branch} != dataset ${dataset.branchId}`);
  }
  if (t.architecture !== dataset.architecture) {
    fail(`${trigRel}: architecture ${t.architecture} != dataset ${dataset.architecture}`);
  }
  if (t.config && t.config !== "null" && !exists(t.config)) {
    fail(`${trigRel}: config path does not resolve -> ${t.config}`);
  }
  const targets = (t.target_files || "").replace(/^\[|\]$/g, "");
  for (const raw of targets.split(",")) {
    const p = raw.trim();
    if (p.length === 0) continue;
    if (p.startsWith("reports/")) continue;   // produced at run time
    if (!exists(p)) fail(`${trigRel}: target_files entry does not resolve -> ${p}`);
  }
  const runners = fs.readdirSync(path.join(toolsDir, dir)).filter((f) => /^run_/.test(f));
  if (runners.length === 0) fail(`tools/${dir} has a manifest but no runner`);
}
ok(`${manifestCount} trigger.yaml manifests parsed, all paths resolve`);

if (manifestCount !== dataset.toolsWired) {
  fail(`dataset.json toolsWired=${dataset.toolsWired} but ${manifestCount} manifests exist`);
} else ok(`dataset.json toolsWired matches the manifest count (${manifestCount})`);

// -------------------------------------------------- 5. planted pins vs table
const plantedTable = read("tools/grype/PLANTED-CVES.md");
const plantedFromTable = Array.from(plantedTable.matchAll(/^\| `([^`]+)` \| ([0-9][^ |]*) \|/gm))
  .map((m) => `${m[1]}@${m[2]}`);
if (plantedFromTable.length === 0) fail("PLANTED-CVES.md has no parseable pin table");
for (const pin of plantedFromTable) {
  const [name, version] = pin.split("@");
  if (pkg.dependencies[name] !== version) {
    fail(`planted pin ${pin} in PLANTED-CVES.md != package.json (${pkg.dependencies[name]})`);
  }
}
const datasetPins: string[] = dataset.plantedFixtures.vulnerablePins;
for (const pin of datasetPins) {
  if (!plantedFromTable.includes(pin)) fail(`dataset.json lists ${pin} which PLANTED-CVES.md does not`);
}
if (plantedFromTable.length > 0) ok(`${plantedFromTable.length} planted pins agree across PLANTED-CVES.md, package.json and dataset.json`);

const pinsTxt = read("tools/grype/planted-pins.txt").trim().split("\n")
  .map((l) => l.trim().split(/\s+/).join("@")).filter(Boolean);
for (const p of pinsTxt) {
  if (!plantedFromTable.includes(p)) fail(`planted-pins.txt lists ${p} which PLANTED-CVES.md does not`);
}

// ------------------------------------------- 6. the duplicate pair is a pair
const retail = read(`${src}/services/retail-order-processor.ts`);
const wholesale = read(`${src}/services/wholesale-order-processor.ts`);
const norm = (s: string): string =>
  s.replace(/retail/gi, "X").replace(/wholesale/gi, "X").replace(/\s+/g, " ").trim();
if (norm(retail) !== norm(wholesale)) {
  fail("the duplication fixture pair is NOT identical modulo names -- jscpd may not fire");
} else ok("duplicate pair is identical modulo names");

// ---------------------------------------------- 7. planted fixtures all exist
for (const [kind, value] of Object.entries<any>(dataset.plantedFixtures)) {
  if (kind === "vulnerablePins") continue;
  const list = Array.isArray(value) ? value : [value];
  for (const f of list) if (!exists(f)) fail(`planted fixture missing: ${kind} -> ${f}`);
}
ok("every planted fixture named in dataset.json exists on disk");

// ------------------------------------------------------- 8. no empty packages
function walk(dir: string): void {
  for (const entry of fs.readdirSync(dir)) {
    if (["node_modules", ".git", "dist", "build", "reports", ".yarn"].includes(entry)) continue;
    const full = path.join(dir, entry);
    if (!fs.statSync(full).isDirectory()) continue;
    const kids = fs.readdirSync(full);
    if (kids.length === 0) fail(`empty directory: ${path.relative(ROOT, full)}`);
    else walk(full);
  }
}
walk(ROOT);
ok("no empty directories (the Python family's wheel-build defect)");

// --------------------------------------------------------- 9. README contract
const readme = read("README.md");
const REQUIRED = ["## Project type", "## Branches", "## Supported tools", "## Build",
                  "## Run", "## Test", "## Architecture", "## Tool entry points"];
let cursor = -1;
for (const section of REQUIRED) {
  const at = readme.indexOf(section);
  if (at === -1) { fail(`README missing section: ${section}`); continue; }
  if (at < cursor) fail(`README section out of order: ${section}`);
  cursor = at;
}
ok("README sections present and in order");

for (const rel of Array.from(readme.matchAll(/\]\((?!https?:)([^)#]+)\)/g)).map((m) => m[1])) {
  if (!exists(rel.replace(/^\.\//, ""))) fail(`README links to a missing path: ${rel}`);
}
ok("README relative links resolve");

if (!readme.includes(dataset.architecture)) fail("README does not state the architecture");
if (!readme.includes(dataset.packageManager)) fail("README does not state the package manager");

// ------------------------------------------------------------------- report
console.log(`full_check -- branch ${dataset.branchId} (${dataset.packageManager}, ${dataset.architecture})\n`);
for (const c of checks) console.log(`  ok    ${c}`);
if (problems.length > 0) {
  console.log("");
  for (const p of problems) console.log(`  FAIL  ${p}`);
  console.log(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`\nall ${checks.length} checks passed`);
