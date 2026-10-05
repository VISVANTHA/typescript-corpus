"use strict";
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    { name: "no-orphans", severity: "warn",
      from: { orphan: true, pathNot: "\\.d\\.ts$|index\\.ts$" }, to: {} },
    { name: "models-must-not-import-services", severity: "error",
      comment: "The domain model layer is a leaf. Services depend on models, never the reverse.",
      from: { path: "src/models" }, to: { path: "src/services" } },
    { name: "no-analysis-in-production", severity: "error",
      comment: "analysis/ holds planted fixtures and must never be reachable from real code.",
      from: { path: "src", pathNot: "src/analysis" }, to: { path: "src/analysis" } },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(dist|build|reports|coverage)" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    reporterOptions: { text: { highlightFocused: true } },
  },
};
