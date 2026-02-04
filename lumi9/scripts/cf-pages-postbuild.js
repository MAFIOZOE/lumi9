/*
  Cloudflare Pages postbuild for OpenNext:
  
  1. Copy worker.js -> _worker.js (Pages entrypoint)
  2. Copy static assets from assets/ to root of .open-next/
  3. Create _routes.json to exclude static assets from worker
*/

const fs = require("fs");
const path = require("path");

const outDir = path.join(process.cwd(), ".open-next");
const assetsDir = path.join(outDir, "assets");

// 1. Copy worker.js -> _worker.js
const workerSrc = path.join(outDir, "worker.js");
const workerDest = path.join(outDir, "_worker.js");

if (!fs.existsSync(workerSrc)) {
  console.error(`[cf-pages-postbuild] Missing ${workerSrc}. Did build run?`);
  process.exit(1);
}

fs.copyFileSync(workerSrc, workerDest);
console.log(`[cf-pages-postbuild] Copied worker.js -> _worker.js`);

// 2. Copy assets folder contents to root of .open-next
function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursiveSync(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

if (fs.existsSync(assetsDir)) {
  const entries = fs.readdirSync(assetsDir);
  for (const entry of entries) {
    copyRecursiveSync(path.join(assetsDir, entry), path.join(outDir, entry));
    console.log(`[cf-pages-postbuild] Copied assets/${entry} -> ${entry}`);
  }
}

// 3. Create _routes.json to exclude static paths from worker
const routesJson = {
  version: 1,
  include: ["/*"],
  exclude: [
    "/_next/static/*",
    "/favicon.ico",
    "/file.svg",
    "/globe.svg",
    "/next.svg",
    "/vercel.svg",
    "/window.svg",
    "/BUILD_ID"
  ]
};

fs.writeFileSync(
  path.join(outDir, "_routes.json"),
  JSON.stringify(routesJson, null, 2)
);
console.log(`[cf-pages-postbuild] Created _routes.json`);
