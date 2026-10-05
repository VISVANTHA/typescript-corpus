#!/usr/bin/env bash
# GitHub API (repos + releases) runner -- branch TS-170 (Node 24, npm, Microservices).
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

# GitHub API metadata for the upstream project this corpus mirrors.
# NOTE: the npm downloads API (api.npmjs.org) is NOT reachable from this
# environment -- it returns 403 at the egress proxy -- so the download-count
# half of this metric is unavailable and is not declared.
REPO="${UPSTREAM_REPO:-nestjs/nest}"
AUTH=()
if [ -n "${GITHUB_TOKEN:-}" ]; then AUTH=(-H "authorization: Bearer $GITHUB_TOKEN"); fi
curl -sS -m 20 "${AUTH[@]}" "https://api.github.com/repos/$REPO" > reports/upstream-repo.json
curl -sS -m 20 "${AUTH[@]}" "https://api.github.com/repos/$REPO/releases/latest" > reports/upstream-release.json
node -e "
  const r = require('./reports/upstream-repo.json');
  const rel = require('./reports/upstream-release.json');
  console.log('[github] repo      :', r.full_name);
  console.log('[github] stars     :', r.stargazers_count, '| forks:', r.forks_count, '| open issues:', r.open_issues_count);
  console.log('[github] latest tag:', rel.tag_name, '(' + String(rel.published_at).slice(0,10) + ')');
  require('fs').writeFileSync('reports/upstream.json', JSON.stringify({
    repo: r.full_name, stars: r.stargazers_count, forks: r.forks_count,
    openIssues: r.open_issues_count, latestTag: rel.tag_name, publishedAt: rel.published_at,
    npmDownloads: null, npmDownloadsNote: 'api.npmjs.org unreachable from this environment (403 at egress proxy)'
  }, null, 2));
"
