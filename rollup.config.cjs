"use strict";
/**
 * Rollup 2.80.0 -- the newest release whose `engines.node` admits Node 12
 * (`>=10.0.0`). Rollup 3.x requires `>=14.18`; Rollup 4.x requires `>=18`.
 *
 * The transform here is **tsc**, not esbuild: @rollup/plugin-typescript 8.5.0
 * runs the real TypeScript compiler, so this bundler type-checks as it builds.
 * That is the substantive difference from the esbuild and Vite branches.
 *
 * A CommonJS config (`.cjs`) in a CommonJS package -- the same consistency rule
 * that WillowBrook broke by putting a CommonJS eslint rule file inside a
 * package declaring "type": "module".
 *
 * Runtime dependencies stay external: bundling lodash, axios, node-fetch and
 * tar would hide the planted vulnerable pins from the SBOM and from Grype.
 */
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");

const EXTERNAL = [
  "lodash", "lodash/cloneDeep", "minimist", "axios", "node-fetch", "tar",
  "@opentelemetry/api", "@opentelemetry/sdk-node", "@opentelemetry/sdk-trace-base",
  "fs", "path", "crypto", "child_process", "util", "os", "events", "stream", "tslib",
];

module.exports = {
  input: "packages/domain/src/index.ts",
  external: EXTERNAL,
  output: {
    file: "build/bundle.cjs",
    format: "cjs",
    sourcemap: true,
    exports: "named",
  },
  plugins: [
    nodeResolve({ preferBuiltins: true, extensions: [".ts", ".js", ".json"] }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      // Rollup needs ES modules in; the repo tsconfig emits CommonJS for Node.
      module: "ESNext",
      // Declarations and the dist/ outDir belong to `tsc`, not to the bundle.
      declaration: false,
      declarationMap: false,
      outDir: "build",
      rootDir: ".",
      sourceMap: true,
      include: ["packages/domain/src/**/*.ts"],
    }),
  ],
};
