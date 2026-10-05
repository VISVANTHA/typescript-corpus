#!/usr/bin/env bash
# dependency-cruiser runner -- branch TS-173 (Node 24, pnpm, Monolith).
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

echo "[depcruise] version:"; node_modules/.bin/depcruise --version
# TRAP: dependency-cruiser 11.18.0 given a bare DIRECTORY resolves only its
# default (JavaScript) extensions, finds no .ts, and reports
# "no dependency violations found (0 modules, 0 dependencies cruised)" -- with
# exit code 0. A glob is required. `options.extensions` is not a valid v11
# option and makes the whole config fail schema validation.
node_modules/.bin/depcruise --config tools/dependency-cruiser/.dependency-cruiser.cjs \
  --output-type json 'src/**/*.ts' > reports/depcruise.json || true
node_modules/.bin/depcruise --config tools/dependency-cruiser/.dependency-cruiser.cjs \
  --output-type err 'src/**/*.ts' || true
node -e "
  const r = require('./reports/depcruise.json');
  const s = r.summary || {};
  if ((r.modules||[]).length === 0) { console.error('[depcruise] FAIL: 0 modules cruised'); process.exit(1); }
  console.log('[depcruise] modules:', (r.modules||[]).length, '| violations:', (s.violations||[]).length);
  console.log('[depcruise] error:', s.error||0, 'warn:', s.warn||0, 'info:', s.info||0);
"
