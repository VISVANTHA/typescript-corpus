#!/usr/bin/env bash
# TypeScript compiler (tsc) runner -- branch TS-155 (Node 22, yarn (Berry), Monolith).
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

# Resolve the compiler through Node's resolver rather than node_modules/.bin.
#
# node_modules/.bin/tsc is NOT guaranteed to be the typescript this package.json
# pins. @cyclonedx/cdxgen depends on @appthreat/atom-parsetools, which depends on
# @typescript/typescript6, which depends on "@typescript/old": "npm:typescript@^6"
# -- an aliased TypeScript that declares its own `tsc` bin. npm, yarn and pnpm
# give the DIRECT dependency's bin priority; **bun does not**, and links the
# transitive TypeScript 6.0.3 over the declared 5.9.3.
#
# The result is a repo where `require('typescript')` is 5.9.3 (so
# typescript-eslint, ts-morph, madge and ts-node all see 5.9.3) while every shell
# runner that calls .bin/tsc compiles with 6.0.3. Nothing warns. On these repos it
# surfaces as TS5107 (`moduleResolution=node10` is deprecated) -- a diagnostic
# that the declared compiler does not emit at all.
TSC="$(node -e "const p=require('path');console.log(p.join(p.dirname(require.resolve('typescript')),'..','bin','tsc'))")"
echo "[tsc] binary: $TSC"
echo "[tsc] version:"; node "$TSC" --version
echo "[tsc] 1/2 type-check the whole project (expect zero diagnostics)"
node "$TSC" -p tsconfig.json --noEmit
echo "[tsc] 2/2 emit CommonJS + declarations + source maps to dist/"
node "$TSC" -p tsconfig.build.json
test -f dist/src/index.js || { echo "[tsc] FAIL: no emit"; exit 1; }
echo "[tsc] OK"
