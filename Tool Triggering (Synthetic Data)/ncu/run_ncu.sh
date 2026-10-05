#!/usr/bin/env bash
# npm-check-updates runner -- branch TS-184 (Node 24, bun, Microservices).
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

# The requested ncu 19.6.6 requires Node >= 18 and cannot run here.
# 12.5.12 is the newest release whose engines admit Node 12.
echo "[ncu] version: $(pkgver npm-check-updates)"
node_modules/.bin/ncu --jsonUpgraded > reports/outdated.json || true
node -e "
  const u = require('./reports/outdated.json');
  const n = Object.keys(u||{}).length;
  console.log('[ncu]', n, 'dependencies have newer releases than the pinned set');
  Object.entries(u||{}).slice(0,8).forEach(([k,v])=>console.log('   ', k, '->', v));
"
