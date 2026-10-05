import { defineConfig } from "vite";
import { resolve } from "path";

/**
 * Vite 5.4.21 -- the newest release whose `engines.node` admits Node 21
 * (`^18.0.0 || >=20.0.0`). Vite 6, 7 and 8 all declare
 * `^20.19.0 || >=22.12.0`, which enumerates even LTS majors only and skips 21
 * outright. So this runtime, newer than Node 20, gets a Vite THREE majors
 * older than the Node 20 repos do. Nothing warns; the install simply resolves
 * to 5.x.
 *
 * This is a Node service, not a browser app, so the SSR build path is used:
 * Rollup links the graph and Vite's bundled esbuild (^0.21.x) does the
 * TypeScript transform. That is what the sheet means by
 * "Vite (built as esbuild)".
 *
 * Runtime dependencies stay external -- bundling lodash, axios, node-fetch and
 * tar would hide the planted vulnerable pins from the SBOM and from Grype.
 *
 * The file is `.mts`, not `.ts`. These projects are CommonJS, and Vite 5 loads
 * a `.ts` config through its CJS Node API, which emits
 * "The CJS build of Vite's Node API is deprecated". The explicit ESM extension
 * makes Vite load the ESM API instead. Vite bundles the config before
 * evaluating it and injects `__dirname`/`__filename` shims, so the CommonJS
 * globals below resolve even though the file is ESM.
 */
export default defineConfig({
  build: {
    ssr: resolve(__dirname, "src/index.ts"),
    outDir: "build",
    target: "node24",
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
