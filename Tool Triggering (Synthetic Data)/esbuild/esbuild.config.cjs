"use strict";
/* esbuild bundle. Gate 11: the bundle must be emitted AND must run -- the
 * TypeScript analogue of the Python family building the wheel, which is what
 * exposed two empty leftover packages that compile, import and tests all
 * missed. */
const path = require("path");
const esbuild = require("esbuild");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

// Runtime dependencies stay EXTERNAL, matching the vite and rollup configs.
// Inlining lodash, axios, node-fetch and tar would hide the planted vulnerable
// pins from the SBOM and from Grype, and would make bundle-size comparisons
// across the three bundlers meaningless -- one would be measuring node_modules.
const EXTERNAL = [
  "lodash", "lodash/cloneDeep", "minimist", "axios", "node-fetch", "tar",
  "@opentelemetry/api", "@opentelemetry/sdk-node", "@opentelemetry/sdk-trace-base",
];

esbuild
  .build({
    entryPoints: [path.join(REPO_ROOT, "packages/domain/src", "index.ts")],
    outfile: path.join(REPO_ROOT, "build", "bundle.cjs"),
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    external: EXTERNAL,
    sourcemap: true,
    metafile: true,
    logLevel: "info",
  })
  .then((result) => {
    const fs = require("fs");
    fs.mkdirSync(path.join(REPO_ROOT, "reports"), { recursive: true });
    fs.writeFileSync(
      path.join(REPO_ROOT, "reports", "esbuild-meta.json"),
      JSON.stringify(result.metafile, null, 2),
    );
    const out = Object.values(result.metafile.outputs)[0];
    console.log("[esbuild] bundled", Object.keys(result.metafile.inputs).length,
                "inputs ->", out.bytes, "bytes");
  })
  .catch((error) => {
    console.error("[esbuild] build failed:", error.message);
    process.exit(1);
  });
