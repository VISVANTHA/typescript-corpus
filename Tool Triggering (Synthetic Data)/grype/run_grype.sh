#!/usr/bin/env bash
# Grype runner -- branch TS-214 (Node 26, pnpm, Microservices).
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

# Grype is a standalone Go binary, not an npm package. Install note:
#   curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh \
#     | sh -s -- -b "$HOME/.local/bin" v0.110.0
if ! command -v grype >/dev/null 2>&1; then
  echo "[grype] SKIP -- grype v0.110.0 is not on PATH. See the install note in this script."
  exit 0
fi
echo "[grype] version:"; grype version
test -f reports/sbom.json || bash tools/cdxgen/run_cdxgen.sh
grype "sbom:reports/sbom.json" -o json > reports/grype.json || true
node -e "
  const r = require('./reports/grype.json');
  const m = r.matches || [];
  const bySev = {};
  m.forEach(x=>{const s=(x.vulnerability||{}).severity||'Unknown'; bySev[s]=(bySev[s]||0)+1;});
  console.log('[grype] matches:', m.length, JSON.stringify(bySev));
"
