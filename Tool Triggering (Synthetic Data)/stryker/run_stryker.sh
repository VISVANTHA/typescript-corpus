#!/usr/bin/env bash
# @stryker-mutator/core runner -- branch TS-208 (Node 26, bun, Microservices).
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

echo "[stryker] version: $(pkgver @stryker-mutator/core)"
node_modules/.bin/stryker run tools/stryker/stryker.conf.json || true
if [ -f reports/mutation/mutation.json ]; then
  node -e "
    const r = require('./reports/mutation/mutation.json');
    let killed=0,total=0;
    Object.values(r.files||{}).forEach(f=>f.mutants.forEach(m=>{total++;if(m.status==='Killed')killed++;}));
    console.log('[stryker] mutants:', total, '| killed:', killed, '| score:', total? (100*killed/total).toFixed(2)+'%':'n/a');
  "
else
  echo "[stryker] no mutation report produced"
fi
