#!/usr/bin/env bash
# npm audit / npm ls runner -- branch TS-121 (Node 21, npm, Monolith).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
mkdir -p reports

# Read a dependency's version WITHOUT require()-ing its package.json.
# Modern packages declare an "exports" map that omits "./package.json", so
# require('<pkg>/package.json') throws ERR_PACKAGE_PATH_NOT_EXPORTED --
# @rollup/plugin-typescript 12.x is one. Reading the file directly works under
# every package manager, because these are all DIRECT dependencies.
pkgver() {
  node -e "try{console.log(JSON.parse(require('fs').readFileSync('node_modules/'+process.argv[1]+'/package.json','utf8')).version)}catch(e){console.log('unresolved')}" "$1"
}

# Gate G4: the committed lockfile must install frozen. WillowBrook shipped a
# 703-byte pnpm-lock.yaml stub with no packages: section, so --frozen-lockfile
# failed and audit ran against a freshly resolved graph instead of the
# committed one.
# bun is a standalone binary, not an npm package:
#   curl -fsSL https://bun.sh/install | bash          (or the GitHub release zip)
# It resolves npm packages exactly like the others; the project still RUNS on
# Node 12. bun does not enforce engines.node at install time.
echo "[audit] proving the committed lockfile installs frozen"
npm ci
echo
echo "[audit] dependency tree:"
npm ls --all --depth=1 || true
echo
echo "[audit] vulnerabilities against the committed graph:"
npm audit --json > reports/audit.json 2>/dev/null || true
node -e "
  let a; try { a = require('./reports/audit.json'); } catch (e) { console.log('[audit] no JSON report'); process.exit(0); }
  const m = (a.metadata && a.metadata.vulnerabilities) || {};
  console.log('[audit]', JSON.stringify(m));
  const total = typeof m.total === 'number' ? m.total
              : Object.values(m).reduce((x,y)=>x+y,0);
  if (total === 0) { console.error('[audit] FAIL: planted CVE pins produced no advisories'); process.exit(1); }
  console.log('[audit] OK --', total, 'advisories from the planted pins');
"
