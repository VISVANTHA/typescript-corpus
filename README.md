# TypeScript Order Platform -- Monolith (TS_V24_VITE_PNPM_MONO)

Tool-evaluation repository for **Node 24**, bundled with **vite**,
managed with **pnpm**, in a **Monolith** layout.

This is branch **TS_V24_VITE_PNPM_MONO** of the consolidated `typescript-corpus` repository, which holds all 216 TypeScript branches across every Node version, bundler, package manager and architecture combination in this corpus.

## Project type

- **Language:** TypeScript 5.9.3
- **Runtime:** Node 24 (verified against 24.20.0)
- **Scenario:** 1 - Monolithic
- **Architecture:** Monolith
- **Module layout:** flat
- **Bundler:** Vite 2.9.18 (Rollup linker + its own esbuild 0.14.54 transform)
- **Package manager:** pnpm 12.2.1
- **Source root:** `src`

Node 12 is end-of-life, and that is deliberate: it pins the entire toolchain to
the last release of each tool that still supports it. Every version in this
repository was resolved against the live npm registry and then executed on a
real Node 24.20.0 interpreter. None was written from memory.

## Supported tools

26 tool families are wired. Each has a folder under `Tool Triggering (Synthetic Data)/` containing a
`trigger.yaml` manifest, a runner, and its configuration.

| Family | Pinned | Family | Pinned |
|---|---|---|---|
| TypeScript (tsc) | 5.0.4 | ts-morph | 18.0.0 |
| vite | 8.2.2 | ts-prune | 0.10.3 |
| mocha | 9.2.2 | madge | 5.0.2 |
| c8 (coverage, primary) | 8.0.1 | dependency-cruiser | 11.18.0 |
| nyc + ts-node (cross-check) | 15.1.0 | Stryker | 5.6.1 |
| eslint | 8.57.1 | fast-check | 4.9.0 |
| @typescript-eslint | 5.62.0 | cdxgen | 8.6.3 |
| eslint-plugin-sonarjs | 0.15.0 | ORT (cdxgen licence proxy) | n/a |
| eslint-plugin-security | 2.1.1 | npm-check-updates | 12.5.12 |
| eslint-scope | 7.2.2 | pnpm audit / ls | 12.2.1 |
| jscpd | 3.2.1 | OpenTelemetry sdk-node | 0.29.2 |
| Grype | v0.110.0 (binary) | Lizard | pip |
| pydriller | pip | GitHub Advisories + API | REST |

### Tools deliberately NOT wired

Skipping these is a finding, not an omission. See [`dataset.json`](dataset.json).

| Tool | Reason |
|---|---|
| knip | no published version supports Node 12 |
| vitest + @vitest/coverage-v8 | no published version supports Node 12 |
| @biomejs/biome | oldest published version already requires Node >=14.21.3 |
| OSV-Scanner | `api.osv.dev` unreachable -- 403 at the egress proxy |
| npm downloads API | `api.npmjs.org` unreachable -- 403 at the egress proxy |
| npm-check-updates 19.6.6 | requires Node >=18; 12.5.12 is pinned instead |

Declaring any of these would have produced a metric that cannot be computed.

## Build

```bash
npm i -g pnpm@6.35.1
pnpm install --frozen-lockfile
make build
```

`make build` type-checks with `tsc --noEmit`, emits CommonJS + declarations to
`dist/`, then bundles with **Vite 2.9.18 (Rollup linker + its own esbuild 0.14.54 transform)** and **executes the bundle**.
Emitting is not proof; running it is.

## Run

```bash
node dist/src/index.js
```

## Test

```bash
make test        # mocha over tests/
make coverage    # c8 (primary) AND nyc + ts-node (cross-check)
```

Both coverage tools must report non-zero. They deliberately disagree: c8 reads
V8 coverage of the emitted output and remaps it, while nyc instruments the
TypeScript AST directly through `ts-node/register`. Identical numbers would mean
one of them is not an independent second opinion.

`nyc` here never reports through a source-map remap. Doing so silently yields
0% -- the file is remapped to `.ts`, an `--include` written against `dist/**`
stops matching, and the report empties while the process still exits 0.

## Architecture

**Monolith.** One deployable package. `package.json` declares **no**
`workspaces` field, the module tree under `src/` is flat, and there is no
`services/` directory. Those are exactly the properties an auditor reads to
classify a repository, so they are the ones held true here.

```
src/
  index.ts            public surface + sample runner
  models/             domain records and tax table (leaf layer)
  services/           pricing rules, order service, the duplicate pair
  platform/           integrations that use the planted dependency pins
  analysis/           planted fixtures -- never imported by real code
```

`dependency-cruiser` enforces the layering: `models/` may not import
`services/`, and nothing outside `analysis/` may import `analysis/`.


## Planted fixtures

Nothing in `src/analysis/` is production code. Each file exists so exactly one
tool family has something real to find, **using the committed configuration,
with no extra flags**.

| Fixture | Found by |
|---|---|
| `src/services/retail-order-processor.ts` + `wholesale-order-processor.ts` | jscpd -- a duplicate pair, at default thresholds |
| [`src/analysis/complexity-sample.ts`](src/analysis/complexity-sample.ts) | eslint + sonarjs -- cyclomatic 27, cognitive 74 |
| [`src/analysis/sast-fixture.ts`](src/analysis/sast-fixture.ts) | eslint-plugin-security |
| [`src/analysis/taint-fixture.ts`](src/analysis/taint-fixture.ts) | 4 taint flows + 1 sanitised control |
| [`src/analysis/dead-code.ts`](src/analysis/dead-code.ts) | ts-prune, eslint-scope |
| [`src/analysis/call-graph-sample.ts`](src/analysis/call-graph-sample.ts) | madge, dependency-cruiser -- depth 5, fan-out 6 |
| Five pinned dependencies | npm audit, Grype, GitHub Advisories -- see [`Tool Triggering (Synthetic Data)/grype/PLANTED-CVES.md`](<Tool Triggering (Synthetic Data)/grype/PLANTED-CVES.md>) |

The duplicate pair sits in real service code, not in `analysis/`, because
duplication inside a fixtures folder is trivially dismissed.


## Tool test-data folders

Three sibling folders sit at the repo root, alongside this branch's own
`Tool Triggering (Synthetic Data)/` (above).

### `Tool Triggering (Tool Github Test data)/`
Each of the 33 tool subfolders is that tool's own real upstream code and test
suite, pulled as-is from its actual GitHub project -- not generated. `covgate/`
is the clearest case: it's genuinely Rust, not TypeScript -- `cli_interface.rs`,
`coverage_parse.rs`, `gate.rs`, `git_module.rs`, `metrics.rs`,
`render_console.rs`, `render_markdown.rs` plus its own `fixtures/`, `helpers/`
and `support/` test directories, straight from the covgate project. `ESLint/`,
`StrykerJS/`, `Opengrep/`, `pydriller/` and the rest are each that project's
own real test suite. A correct run finds whatever that upstream project's own
tests genuinely contain.

### `Tool Clean (Synthetic Data)/`
Most of the 33 tools each carry 5 generated fixture packages, one per Node
family (12, 14, 20, 24, 26), engineered to be clean so the tool should report
zero findings: the **Tool Clean (100% pass)** condition. `covgate` is the
exception within the exception: because it builds a native binary per Node
family, each of its 5 node-version folders (`node12/`...`node26/`) is itself a
full self-contained package with its own git history, plus a 6th git history
at the `covgate/` root -- 6 separate repositories in total. `diff-cover` and
`pydriller` operate on git history rather than language syntax, so each
carries one real git repository's worth of history instead of 5 per-version
copies. All 8 of these git histories (6 covgate + diff-cover + pydriller) are
restored from `_git-bundles/` via `restore-git.ps1` rather than kept as live
`.git` folders, so a plain file copy never silently drops their content as a
submodule-style gitlink.

### `Tool Invalid (Synthetic Data)/`
Same shape as Clean -- 33 tools, the same 5-Node-version pattern, and the same
covgate exception -- but engineered so every fixture makes the tool flag or
fail rather than pass: the **Tool Invalid** condition. Only covgate's 6 git
histories needed bundling here (`_git-bundles/` + `restore-git.ps1`, alongside
an earlier `restore-covgate-git.ps1` left in place from a prior pass);
`diff-cover`'s and `pydriller`'s Invalid fixtures were already plain,
git-free copies.

## Tool entry points

```bash
ts-node "Tool Triggering (Synthetic Data)/tool_integration.ts"             # wiring banner
ts-node "Tool Triggering (Synthetic Data)/tool_integration.ts" --list      # machine-readable list
ts-node "Tool Triggering (Synthetic Data)/tool_integration.ts" --verify    # folder + manifest + runner for every tool
ts-node "Tool Triggering (Synthetic Data)/tool_integration.ts" --run jscpd # one tool
ts-node "Tool Triggering (Synthetic Data)/tool_integration.ts" --run-all   # every tool, in order
ts-node "Tool Triggering (Synthetic Data)/full_check.ts"                   # cross-file consistency audit
```

Every tool can also be run directly: `bash "Tool Triggering (Synthetic Data)/<tool>/run_<tool>.sh"`.

CI runs **every one of these runners** and uploads their output as artifacts.
A CI file that only installs and tests would leave the declared tools unproven.

## Layout

```
typescript-corpus/  (TS_V24_VITE_PNPM_MONO)
|-- .github/  (1 files)
|-- src/  (16 files)
|-- tests/  (6 files)
|-- Tool Triggering (Synthetic Data)/  (68 files)
|-- .editorconfig
|-- .gitignore
|-- .jscpd.json
|-- .madgerc
|-- .npmrc
|-- .nvmrc
|-- Makefile
|-- biome.json
|-- dataset.json
|-- eslint.config.mjs
|-- knip.json
|-- package.json
|-- pnpm-workspace.yaml
|-- tsconfig.build.json
|-- tsconfig.json
|-- vite.config.mts
|-- vitest.config.ts
```

## Verification

Every claim in this README is checked by `ts-node "Tool Triggering (Synthetic Data)/full_check.ts"`, which
reads its expectations **from the repository** rather than from a hard-coded
list -- including that `.nvmrc`, `package.json` engines, `dataset.json`, the CI
workflow and all 26 `trigger.yaml` manifests agree on the Node version, the
branch, and the architecture.
