/**
 * Codama IDL → TypeScript codegen pipeline for orbit-dlmm.
 *
 * Usage:  node codama.mjs
 * Output: src/generated/  (accounts, instructions, types, errors, index.ts)
 *
 * The IDL at src/idl/orbit_finance.json is Anchor v0.30+ format (spec "0.1.0").
 * rootNodeFromAnchor auto-detects V01 and parses it correctly.
 */

import { createFromRoot } from "codama";
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { renderVisitor } from "@codama/renderers-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const idlPath = resolve(__dirname, "src/idl/orbit_finance.json");

// renderVisitor(packageFolder, opts) appends opts.generatedFolder (default
// "src/generated") to packageFolder, so pass the SDK root here.
const packageRoot = __dirname;

const idl = JSON.parse(readFileSync(idlPath, "utf-8"));

console.log(
  `Codama: reading IDL → ${idl.metadata?.name ?? "orbit_finance"} v${idl.metadata?.version ?? "?"}`
);
console.log(`  ${(idl.instructions ?? []).length} instructions`);
console.log(`  ${(idl.accounts ?? []).length} accounts`);
console.log(`  ${(idl.types ?? []).length} types`);
console.log(`  ${(idl.errors ?? []).length} errors`);
console.log(`Output: ${packageRoot}/src/generated\n`);

const codama = createFromRoot(rootNodeFromAnchor(idl));

await codama.accept(
  renderVisitor(packageRoot, {
    // Keep files inside src/generated/ (Codama default).
    generatedFolder: "src/generated",
    // Do NOT touch our existing package.json — generated code targets
    // @solana/kit (web3.js v2); the rest of the SDK uses @solana/web3.js v1.
    syncPackageJson: false,
  })
);

console.log("Done. Re-run with: node codama.mjs");
