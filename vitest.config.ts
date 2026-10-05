import { defineConfig } from "vitest/config";

/**
 * vitest 0.34.6 -- newest supporting Node 16 (>=14.18.0).
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
