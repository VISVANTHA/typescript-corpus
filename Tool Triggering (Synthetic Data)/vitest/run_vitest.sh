#!/usr/bin/env bash
# vitest + @vitest/coverage-v8 runner -- branch TS-181 (Node 24, pnpm, Monolith).
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

# vitest 0.34.6 -- newest release supporting Node 16 (>=14.18.0).
# vitest 1.x needs ^18||>=20; 4.x needs ^20||^22||>=24.
#
# vitest does NOT replace mocha. It runs the SAME spec files as an independent
# second runner, so the suite stays identical across every Node version in the
# corpus -- including the Node 12 repos, where vitest cannot run at all. It also
# yields a third coverage number alongside c8 and nyc.
echo "[vitest] version: $(pkgver vitest)"
node_modules/.bin/vitest run --config vitest.config.ts --coverage 2>&1 | tail -25
node -e "
  const s = require('./coverage-vitest/coverage-summary.json').total;
  console.log('[vitest] stmts', s.statements.pct + '%', '| branch', s.branches.pct + '%', '| funcs', s.functions.pct + '%');
  if (!(s.statements.pct > 0)) { console.error('[vitest] FAIL: zero coverage'); process.exit(1); }
  console.log('[vitest] OK -- non-zero, and independent of both c8 and nyc');
"
