#!/usr/bin/env node
/* eslint-scope runner -- branch TS-174.
 * Builds a scope tree over the planted dead-code fixture and reports, per
 * scope, how many variables are declared and how many are never referenced.
 * This is the structural counterpart to ts-prune's export-level view.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const escope = require("eslint-scope");
const espree = require("espree");
const ts = require("typescript");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TARGET = path.join(REPO_ROOT, "packages/domain/src", "analysis", "dead-code.ts");

const pkgver = (n) => { try { return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "node_modules", n, "package.json"), "utf8")).version; } catch (e) { return "unresolved"; } };
console.log("[eslint-scope] version:", pkgver("eslint-scope"));

// eslint-scope consumes an ESTree AST, so transpile the TypeScript away first.
const source = fs.readFileSync(TARGET, "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.ESNext },
}).outputText;

const ast = espree.parse(js, { ecmaVersion: 2019, sourceType: "module", range: true, loc: true });
const scopeManager = escope.analyze(ast, { ecmaVersion: 2019, sourceType: "module" });

const rows = [];
for (const scope of scopeManager.scopes) {
  const unused = scope.variables.filter((v) => v.references.length === 0 && v.name !== "arguments");
  rows.push({
    type: scope.type,
    block: scope.block.type,
    line: scope.block.loc ? scope.block.loc.start.line : null,
    declared: scope.variables.length,
    unreferenced: unused.length,
    names: unused.map((v) => v.name),
  });
}

fs.mkdirSync(path.join(REPO_ROOT, "reports"), { recursive: true });
fs.writeFileSync(path.join(REPO_ROOT, "reports", "eslint-scope.json"), JSON.stringify(rows, null, 2));

console.log("[eslint-scope] scopes analysed:", rows.length);
for (const r of rows) {
  if (r.unreferenced > 0) {
    console.log("   ", r.type, "scope @ line", r.line, "->", r.unreferenced, "unreferenced:", r.names.join(", "));
  }
}
const totalUnused = rows.reduce((a, r) => a + r.unreferenced, 0);
console.log("[eslint-scope] total unreferenced bindings:", totalUnused);
if (totalUnused === 0) {
  console.error("[eslint-scope] FAIL: planted dead code produced no unreferenced bindings");
  process.exit(1);
}
