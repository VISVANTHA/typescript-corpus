#!/usr/bin/env bash
# Lizard runner -- branch TS-137 (Node 21, npm, Monolith).
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

# Lizard is a Python tool:  pip install lizard
# CAVEAT (carried into the metric sheet): Lizard is a tokeniser, not a type
# checker. It under-reports function counts on generic-heavy TypeScript, and it
# does NOT emit fan-out for this language -- which is why FlintAtlas declared a
# QA Resource Allocation metric it could not compute. Fan-out here is assigned
# to madge and dependency-cruiser instead.
if ! command -v lizard >/dev/null 2>&1; then
  echo "[lizard] SKIP -- lizard not installed (pip install lizard)"; exit 0
fi
echo "[lizard] version: $(lizard --version 2>&1 | head -1)"
lizard -l typescript src --csv > reports/lizard.csv || true
python3 - <<'PY'
import csv, io, os
rows = list(csv.reader(open("reports/lizard.csv", encoding="utf-8"))) if os.path.exists("reports/lizard.csv") else []
if not rows:
    print("[lizard] no rows"); raise SystemExit
ccn = [int(r[1]) for r in rows if len(r) > 1 and r[1].isdigit()]
print("[lizard] functions counted:", len(ccn))
if ccn:
    print("[lizard] max CCN:", max(ccn), "| mean CCN:", round(sum(ccn)/len(ccn), 2))
PY
