/*
  Cloudflare Pages expects a Functions worker entrypoint at:
    <outputDir>/_worker.js

  @opennextjs/cloudflare build currently emits:
    .open-next/worker.js

  This script copies worker.js -> _worker.js so Pages can serve the app.
*/

const fs = require("fs");
const path = require("path");

const outDir = path.join(process.cwd(), ".open-next");
const src = path.join(outDir, "worker.js");
const dest = path.join(outDir, "_worker.js");

if (!fs.existsSync(src)) {
  console.error(`[cf-pages-postbuild] Missing ${src}. Did build run?`);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log(`[cf-pages-postbuild] Wrote ${dest}`);
