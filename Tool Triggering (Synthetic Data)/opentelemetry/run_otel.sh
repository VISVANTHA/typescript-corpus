#!/usr/bin/env bash
# @opentelemetry/sdk-node runner -- branch TS-190 (Node 24, pnpm, Microservices).
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

echo "[otel] sdk-node: $(pkgver @opentelemetry/sdk-node)"
test -f dist/packages/domain/src/index.js || bash tools/typescript/run_tsc.sh
node -r ./tools/opentelemetry/otel-bootstrap.js -e "require('./dist/packages/domain/src/index.js').run()"
node -e "
  const s = require('./reports/otel-spans.json');
  console.log('[otel] spans captured:', s.length);
  s.slice(0,8).forEach(x=>console.log('   ', x.name, x.durationMs.toFixed(3)+'ms'));
  if (!s.length) { console.error('[otel] FAIL: no spans emitted'); process.exit(1); }
"
