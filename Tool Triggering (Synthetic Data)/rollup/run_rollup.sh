#!/usr/bin/env bash
# Rollup (tsc-backed) runner -- branch TS-115 (Node 20, yarn (Berry), Monolith).
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

# Rollup 2.80.0 -- the newest release whose engines admit Node 12.
# Rollup 3.x requires >=14.18, Rollup 4.x requires >=18.
#
# Unlike the esbuild and Vite branches, the TypeScript transform here is
# **tsc 5.0.4** (via @rollup/plugin-typescript 8.5.0), not esbuild. Rollup only
# links. That makes this the one bundler in the corpus that type-checks while
# it builds.
echo "[rollup] version:"; node_modules/.bin/rollup --version
echo "[rollup] plugin-typescript: $(pkgver @rollup/plugin-typescript)"
echo "[rollup] transform performed by tsc: $(pkgver typescript)"
node_modules/.bin/rollup --config rollup.config.cjs
test -f build/bundle.cjs || { echo "[rollup] FAIL: no bundle emitted"; exit 1; }
echo "[rollup] bundle emitted -- now proving it RUNS (gate 11)"
node -e "
  const b = require('./build/bundle.cjs');
  const s = b.run();
  if (!s.priced || s.priced.length === 0) { console.error('[rollup] FAIL: bundle produced no output'); process.exit(1); }
  console.log('[rollup] bundle runs on', s.runtime, '-- priced', s.priced.length, 'orders');
"
