import { defineConfig } from "vite";
import { resolve } from "path";

/**
 * Vite 2.9.18 -- the newest release whose `engines.node` admits Node 12
 * (`>=12.2.0`). Vite 3 and 4 require `^14.18 || >=16`; Vite 5+ require
 * `^18 || >=20`. None of them can run here.
 *
 * This is a Node service, not a browser app, so the SSR build path is used:
 * Rollup links the graph and Vite's bundled esbuild (^0.14.27) does the
 * TypeScript transform. That is what the sheet means by
 * "Vite (built as esbuild)".
 *
 * Runtime dependencies stay external -- bundling lodash, axios, node-fetch and
 * tar would hide the planted vulnerable pins from the SBOM and from Grype.
 *
 * The file is `.mts`, not `.ts`. These projects are CommonJS, and Vite 6 loads
 * a `.ts` config through its CJS Node API, which emits
 * "The CJS build of Vite's Node API is deprecated". The explicit ESM extension
 * makes Vite load the ESM API instead. Vite 2 and 4 (the Node 12/14/16 repos)
 * do not care either way.
 */
export default defineConfig({
  build: {
    ssr: resolve(__dirname, "packages/domain/src/index.ts"),
    outDir: "build",
    target: "node20",
    minify: false,
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      external: [
        "lodash", "lodash/cloneDeep", "minimist", "axios", "node-fetch", "tar",
        "@opentelemetry/api", "@opentelemetry/sdk-node", "@opentelemetry/sdk-trace-base",
        "fs", "path", "crypto", "child_process", "util", "os", "events", "stream",
      ],
      output: { entryFileNames: "bundle.cjs", format: "cjs", exports: "named" },
    },
  },
});
