#!/usr/bin/env bash
# esbuild runner -- branch TS-127 (Node 21, bun, Monolith).
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

echo "[esbuild] version:"; node_modules/.bin/esbuild --version
node tools/esbuild/esbuild.config.cjs
test -f build/bundle.cjs || { echo "[esbuild] FAIL: no bundle emitted"; exit 1; }
echo "[esbuild] bundle emitted -- now proving it RUNS (gate 11)"
node -e "
  const b = require('./build/bundle.cjs');
  const s = b.run();
  if (!s.priced || s.priced.length === 0) { console.error('[esbuild] FAIL: bundle produced no output'); process.exit(1); }
  console.log('[esbuild] bundle runs on', s.runtime, '-- priced', s.priced.length, 'orders');
"
