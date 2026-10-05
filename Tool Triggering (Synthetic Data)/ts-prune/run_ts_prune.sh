#!/usr/bin/env bash
# ts-prune runner -- branch TS-179 (Node 24, yarn (Berry), Monolith).
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

echo "[ts-prune] version: $(pkgver ts-prune)"
node_modules/.bin/ts-prune -p tsconfig.json | tee reports/ts-prune.txt || true
grep -q "settleLegacyInvoice" reports/ts-prune.txt || {
  echo "[ts-prune] FAIL: planted unused export not reported"; exit 1; }
echo "[ts-prune] OK -- planted unused export detected"
