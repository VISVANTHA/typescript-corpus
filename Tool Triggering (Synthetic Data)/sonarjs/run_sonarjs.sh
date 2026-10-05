#!/usr/bin/env bash
# eslint-plugin-sonarjs runner -- branch TS-191 (Node 24, bun, Monolith).
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

echo "[sonarjs] eslint-plugin-sonarjs $(pkgver eslint-plugin-sonarjs)"
echo "[sonarjs] cognitive complexity limit is 15 (eslint.config.mjs)"
node_modules/.bin/eslint src/analysis/complexity-sample.ts --no-inline-config --format json > reports/sonarjs.json || true
node -e "
  const m = (require('./reports/sonarjs.json')[0]||{}).messages||[];
  const cc = m.filter(x=>x.ruleId==='sonarjs/cognitive-complexity');
  const cx = m.filter(x=>x.ruleId==='complexity');
  cc.forEach(x=>console.log('[sonarjs] cognitive:', x.message));
  cx.forEach(x=>console.log('[sonarjs] cyclomatic:', x.message));
  if (cc.length === 0) { console.error('[sonarjs] FAIL: planted complexity fixture did not fire'); process.exit(1); }
  console.log('[sonarjs] OK -- fixture fires at shipped settings');
"
