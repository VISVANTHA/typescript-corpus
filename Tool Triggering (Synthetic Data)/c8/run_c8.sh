#!/usr/bin/env bash
# c8 (V8 coverage, primary) runner -- branch TS-162 (Node 22, npm, Microservices).
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

echo "[c8] version:"; node_modules/.bin/c8 --version
node_modules/.bin/c8 --config tools/c8/.c8rc.json \
  node_modules/.bin/mocha --config tools/mocha/.mocharc.cjs
echo
echo "[c8] gate G2 -- coverage must be non-zero"
node -e "
  const s = require('./coverage/coverage-summary.json').total;
  console.log('[c8] stmts', s.statements.pct + '%', '| branch', s.branches.pct + '%', '| funcs', s.functions.pct + '%');
  if (!(s.statements.pct > 0)) { console.error('[c8] FAIL: zero coverage -- the FlintAtlas/WillowBrook defect'); process.exit(1); }
  console.log('[c8] OK -- non-zero');
"
