#!/usr/bin/env bash
# @cyclonedx/cdxgen runner -- branch TS-144 (Node 21, bun, Microservices).
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

echo "[cdxgen] version: $(pkgver @cyclonedx/cdxgen)"
FETCH_LICENSE=false node_modules/.bin/cdxgen -t nodejs -o reports/sbom.json . || true
node -e "
  const s = require('./reports/sbom.json');
  console.log('[cdxgen] format:', s.bomFormat, s.specVersion, '| components:', (s.components||[]).length);
  if (!(s.components||[]).length) { console.error('[cdxgen] FAIL: empty SBOM'); process.exit(1); }
"
