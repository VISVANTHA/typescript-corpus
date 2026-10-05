#!/usr/bin/env node
/* ts-morph runner -- branch TS-111.
 * Type-aware inventory: one row per function with parameter count, statement
 * count and maximum block depth. This is the primary structural source; Lizard
 * is the tokeniser cross-check, and the two are expected to disagree on
 * generic-heavy code (Lizard under-counts).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { Project, SyntaxKind } = require("ts-morph");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const pkgver = (n) => { try { return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "node_modules", n, "package.json"), "utf8")).version; } catch (e) { return "unresolved"; } };
console.log("[ts-morph] version:", pkgver("ts-morph"),
            "| bundled TypeScript:", require("ts-morph").ts.version);

const project = new Project({ tsConfigFilePath: path.join(REPO_ROOT, "tsconfig.json") });

function maxDepth(node, depth) {
  let best = depth;
  node.forEachChild((child) => {
    const isBlock = child.getKind() === SyntaxKind.Block;
    const d = maxDepth(child, depth + (isBlock ? 1 : 0));
    if (d > best) best = d;
  });
  return best;
}

const rows = [];
for (const sf of project.getSourceFiles()) {
  const rel = path.relative(REPO_ROOT, sf.getFilePath());
  if (rel.startsWith("node_modules") || rel.startsWith("dist")) continue;

  const callables = [
    ...sf.getFunctions(),
    ...sf.getClasses().flatMap((c) => [...c.getMethods(), ...c.getGetAccessors()]),
  ];
  for (const fn of callables) {
    const name = typeof fn.getName === "function" ? fn.getName() : "(anonymous)";
    const body = fn.getBody();
    rows.push({
      file: rel,
      name: name || "(anonymous)",
      line: fn.getStartLineNumber(),
      params: fn.getParameters().length,
      statements: body && body.getStatements ? body.getStatements().length : 0,
      depth: maxDepth(fn, 0),
      isGeneric: fn.getTypeParameters ? fn.getTypeParameters().length > 0 : false,
    });
  }
}

fs.mkdirSync(path.join(REPO_ROOT, "reports"), { recursive: true });
fs.writeFileSync(path.join(REPO_ROOT, "reports", "ts-morph.json"), JSON.stringify(rows, null, 2));

console.log("[ts-morph] callables inventoried:", rows.length);
const deepest = rows.slice().sort((a, b) => b.depth - a.depth)[0];
const widest = rows.slice().sort((a, b) => b.params - a.params)[0];
if (deepest) console.log("[ts-morph] deepest:", deepest.name, "depth", deepest.depth, "in", deepest.file);
if (widest) console.log("[ts-morph] most parameters:", widest.name, widest.params, "in", widest.file);
console.log("[ts-morph] generic callables:", rows.filter((r) => r.isGeneric).length);
if (rows.length === 0) {
  console.error("[ts-morph] FAIL: no callables found");
  process.exit(1);
}
