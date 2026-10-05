import { defineConfig } from "vitest/config";

/**
 * vitest 2.1.9 -- newest whose engines admit Node 21
 * (`^18.0.0 || >=20.0.0`). vitest 3 and 4 declare
 * `^20.0.0 || ^22.0.0 || >=24.0.0` and skip 21, so this runtime runs vitest 2
 * while the Node 20 repos run vitest 4. @vitest/coverage-v8 must track the
 * runner's exact version -- it peers `vitest@2.1.9` -- so it drops with it.
 *
 * It runs the SAME spec files as mocha rather than replacing it. Two
 * independent runners over one suite keeps the test suite identical across
 * every Node version in the corpus (the Node 12 repos cannot run vitest at
 * all), and gives coverage a third independent number next to c8 and nyc.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage-vitest",
      include: ["src/**/*.ts"],
      exclude: ["src/analysis/**", "tests/**", "tools/**"],
    },
  },
});
