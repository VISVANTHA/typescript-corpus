# analysis/ -- planted fixtures

Nothing in this folder is production code. Each file exists so that exactly one
tool family has something real to find, **using the configuration committed in
`tools/`, with no extra flags**.

| File | Planted for | Must be reported by |
|---|---|---|
| `complexity-sample.ts` | high cyclomatic + cognitive complexity | eslint (sonarjs), ts-morph |
| `lint-violations.ts` | lint rule violations | eslint |
| `sast-fixture.ts` | insecure patterns | eslint-plugin-security |
| `taint-fixture.ts` | 4 taint flows + 1 sanitised control | eslint-plugin-security, ts-morph |
| `dead-code.ts` | unreachable + unreferenced exports | ts-prune, eslint |
| `call-graph-sample.ts` | call depth and fan-out | madge, dependency-cruiser |

The duplication fixture is **not** here -- it is the
`services/{retail,wholesale}-order-processor.ts` pair, deliberately placed in
real service code because duplication in a fixtures folder is trivially
dismissed.

Every expected finding is recorded under `tools/<tool>/expected/`. A build in
which a fixture stops firing is a failed build, not a quieter one.
