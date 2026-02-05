import fs from "fs";
import path from "path";

const outDir = path.join(process.cwd(), ".open-next");
const workerSrc = path.join(outDir, "worker.js");
const workerDst = path.join(outDir, "_worker.js");

if (!fs.existsSync(outDir)) {
  console.error("Missing .open-next output directory:", outDir);
  process.exit(1);
}

if (!fs.existsSync(workerSrc)) {
  console.error("Missing worker.js in .open-next:", workerSrc);
  process.exit(1);
}

// Cloudflare Pages expects _worker.js
fs.copyFileSync(workerSrc, workerDst);
console.log("Copied worker.js -> _worker.js");

// Optional: ensure _routes.json exists in output
const routesSrc = path.join(process.cwd(), "_routes.json");
const routesDst = path.join(outDir, "_routes.json");

if (fs.existsSync(routesSrc) && !fs.existsSync(routesDst)) {
  fs.copyFileSync(routesSrc, routesDst);
  console.log("Copied _routes.json -> .open-next/_routes.json");
}
