#!/usr/bin/env bash
# nyc + ts-node (coverage cross-check) runner -- branch TS-128 (Node 21, bun, Microservices).
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

echo "[nyc] version:"; node_modules/.bin/nyc --version
# NOTE: nyc instruments the TypeScript DIRECTLY via ts-node/register.
# Reporting compiled output through a source-map remap silently yields 0%:
# the file is remapped to .ts, an --include written against dist/** stops
# matching, and the report empties while the process still exits 0.
# See TOOLCHAIN-VERIFICATION.md, Finding 1.
TS_NODE_PROJECT=tsconfig.json node_modules/.bin/nyc --nycrc-path tools/nyc/.nycrc.json \
  node_modules/.bin/mocha --config tools/mocha/.mocharc.cjs
echo
node -e "
  const s = require('./coverage-nyc/coverage-summary.json').total;
  console.log('[nyc] stmts', s.statements.pct + '%', '| branch', s.branches.pct + '%', '| funcs', s.functions.pct + '%');
  if (!(s.statements.pct > 0)) { console.error('[nyc] FAIL: zero coverage'); process.exit(1); }
  console.log('[nyc] OK -- non-zero, and independent of c8');
"
