#!/usr/bin/env bash
# biome runner -- branch TS-148 (Node 22, yarn (Berry), Microservices).
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

# biome 2.5.11 -- engines >=14.21.3. A Rust binary with its own parser: it never
# loads tsc, so it is independent of the TypeScript version in a way eslint is not.
#
# Formatter and import-assist are DISABLED in biome.json. Style is owned by
# .editorconfig and eslint; enabling biome's formatter too would mean two tools
# disagreeing over import order, and real source must lint clean so that only
# the planted fixtures carry findings.
echo "[biome] version:"; node_modules/.bin/biome --version
echo
echo "[biome] 1/2 real source -- expect clean"
node_modules/.bin/biome check packages/domain/src/models packages/domain/src/services || true
echo
echo "[biome] 2/2 planted fixtures -- expect findings"
node_modules/.bin/biome check packages/domain/src/analysis --reporter=json > reports/biome.json 2>/dev/null || true
node -e "
  let r; try { r = require('./reports/biome.json'); } catch (e) { console.log('[biome] no JSON report'); process.exit(0); }
  const byRule = {};
  (r.diagnostics || []).forEach(d => { const k = d.category || 'unknown'; byRule[k] = (byRule[k]||0)+1; });
  Object.entries(byRule).slice(0,12).forEach(([k,v]) => console.log('[biome]', k, '->', v));
  const n = (r.diagnostics || []).length;
  console.log('[biome] total diagnostics:', n);
  if (n === 0) { console.error('[biome] FAIL: planted fixtures produced no findings'); process.exit(1); }
"
