#!/usr/bin/env bash
# Vite (esbuild-backed) runner -- branch TS-130 (Node 21, npm, Microservices).
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

# Vite 2.9.18 -- the newest release whose engines admit Node 12 (>=12.2.0).
# Vite 3+ requires ^14.18 || >=16, Vite 5+ requires ^18 || >=20.
#
# "built as esbuild": Vite transforms TypeScript with esbuild (its own
# ^0.14.27, NOT the 0.21.5 the esbuild-bundler branches pin) and links the
# bundle with Rollup. Both facts are recorded in dataset.json.
echo "[vite] version: $(pkgver vite)"
# Resolve esbuild THROUGH vite. Under pnpm's strict (isolated) node_modules,
# esbuild is vite's transitive dependency and is not hoisted to the top level,
# so a bare require('esbuild/package.json') throws MODULE_NOT_FOUND. It happens
# to work under npm's flat layout -- which is exactly the kind of
# package-manager-dependent behaviour this corpus exists to surface.
# esbuild is vite's transitive dependency. npm hoists it to the top level;
# pnpm's strict layout does not, so resolve THROUGH vite as a fallback.
echo "[vite] internal esbuild: $(node -e "
const fs=require('fs'), path=require('path');
function read(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')).version; } catch(e){ return null; } }
let v = read('node_modules/esbuild/package.json');
if (!v) { try {
  const viteDir = path.dirname(require.resolve('vite/package.json', { paths: [process.cwd()] }));
  v = read(path.join(viteDir, 'node_modules', 'esbuild', 'package.json'));
} catch (e) {} }
console.log(v || 'unresolved');" 2>/dev/null)"
node_modules/.bin/vite build --config vite.config.mts
test -f build/bundle.cjs || { echo "[vite] FAIL: no bundle emitted"; exit 1; }
echo "[vite] bundle emitted -- now proving it RUNS (gate 11)"
node -e "
  const b = require('./build/bundle.cjs');
  const s = b.run();
  if (!s.priced || s.priced.length === 0) { console.error('[vite] FAIL: bundle produced no output'); process.exit(1); }
  console.log('[vite] bundle runs on', s.runtime, '-- priced', s.priced.length, 'orders');
"
