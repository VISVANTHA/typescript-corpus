"use strict";
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    { name: "no-orphans", severity: "warn",
      from: { orphan: true, pathNot: "\\.d\\.ts$|index\\.ts$" }, to: {} },
    { name: "models-must-not-import-services", severity: "error",
      comment: "The domain model layer is a leaf. Services depend on models, never the reverse.",
      from: { path: "packages/domain/src/models" }, to: { path: "packages/domain/src/services" } },
    { name: "no-analysis-in-production", severity: "error",
      comment: "analysis/ holds planted fixtures and must never be reachable from real code.",
      from: { path: "packages/domain/src", pathNot: "packages/domain/src/analysis" }, to: { path: "packages/domain/src/analysis" } },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(dist|build|reports|coverage)" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    reporterOptions: { text: { highlightFocused: true } },
  },
};
