import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Nitro bundles PGLite but drops the sibling wasm/data files that
 * `new URL("./pglite.data", import.meta.url)` loads at runtime.
 * Copy them next to the bundled module after `vite build`.
 *
 * This stays out of the Nitro config so it cannot replace the Vercel
 * preset's `compiled` hook, which writes `.vercel/output/config.json`.
 */
const outputDir = join(process.cwd(), ".vercel", "output");
if (!existsSync(join(outputDir, "config.json"))) {
  console.error("[pglite] .vercel/output/config.json is missing. The Vercel build output was not generated.");
  process.exit(1);
}

const hits = [];
const walk = (dir) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (name === "electric-sql__pglite.mjs") hits.push(full);
    else if (!name.startsWith(".") && existsSync(full)) {
      try {
        if (readdirSync(full).length >= 0 && name !== "node_modules") walk(full);
      } catch {
        /* file */
      }
    }
  }
};
walk(outputDir);

const srcDir = join(process.cwd(), "node_modules/@electric-sql/pglite/dist");
for (const hit of hits) {
  const destDir = dirname(hit);
  for (const name of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
    const from = join(srcDir, name);
    if (!existsSync(from)) continue;
    copyFileSync(from, join(destDir, name));
  }
}
if (hits.length === 0) {
  console.error("[pglite] bundled module not found under", outputDir);
  process.exit(1);
}
console.log(`[pglite] copied runtime assets next to ${hits.length} bundle(s).`);
