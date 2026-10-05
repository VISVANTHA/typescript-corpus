#!/usr/bin/env bash
# madge runner -- branch TS-112 (Node 20, bun, Microservices).
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

echo "[madge] version:"; node_modules/.bin/madge --version
# TRAP: madge 5.0.2 has NO --config flag (it was added later). It auto-discovers
# .madgerc from the working directory, so the config lives at the repo root.
# Passing --config makes madge exit with "unknown option", which a runner that
# swallowed stderr would report as an empty graph rather than a failure.
node_modules/.bin/madge --ts-config tsconfig.json --json packages/domain/src > reports/madge-graph.json
echo "[madge] circular dependency check:"
node_modules/.bin/madge --ts-config tsconfig.json --circular packages/domain/src || true
echo "[madge] orphan modules:"
node_modules/.bin/madge --ts-config tsconfig.json --orphans packages/domain/src || true
node -e "
  const g = require('./reports/madge-graph.json');
  const files = Object.keys(g);
  const fanOut = files.map(f=>[f,(g[f]||[]).length]).sort((a,b)=>b[1]-a[1]);
  const fanIn = {}; files.forEach(f=>(g[f]||[]).forEach(d=>{fanIn[d]=(fanIn[d]||0)+1}));
  if (files.length === 0) { console.error('[madge] FAIL: empty graph'); process.exit(1); }
  console.log('[madge] modules:', files.length);
  console.log('[madge] max fan-out:', fanOut[0][0], '->', fanOut[0][1]);
  const topIn = Object.entries(fanIn).sort((a,b)=>b[1]-a[1])[0];
  if (topIn) console.log('[madge] max fan-in :', topIn[0], '<-', topIn[1]);
"
