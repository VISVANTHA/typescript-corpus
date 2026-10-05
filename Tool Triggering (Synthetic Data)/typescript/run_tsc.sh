#!/usr/bin/env bash
# TypeScript compiler (tsc) runner -- branch TS-113 (Node 20, npm, Monolith).
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

echo "[tsc] version:"; node_modules/.bin/tsc --version
echo "[tsc] 1/2 type-check the whole project (expect zero diagnostics)"
node_modules/.bin/tsc -p tsconfig.json --noEmit
echo "[tsc] 2/2 emit CommonJS + declarations + source maps to dist/"
node_modules/.bin/tsc -p tsconfig.build.json
test -f dist/src/index.js || { echo "[tsc] FAIL: no emit"; exit 1; }
echo "[tsc] OK"
