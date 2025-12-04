import { copyFileSync, existsSync } from "fs";
import { join } from "path";

const src = join("dist", "index.html");
const dest = join("dist", "404.html");

if (!existsSync(src)) {
  console.error("dist/index.html not found. Run `npm run build` first.");
  process.exit(1);
}

copyFileSync(src, dest);
console.log("Copied dist/index.html -> dist/404.html for SPA routing.");
