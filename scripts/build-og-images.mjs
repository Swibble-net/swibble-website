// Renders the share images of the landing pages (public/og/<slug>.png, 1200 × 630) by
// screenshotting the local-only route /og-preview/<slug> with headless Chrome.
//
// Run after changing a page's `og` text or hero graphic:
//   1. OG_PREVIEW=1 pnpm dev --port 3111
//   2. node scripts/build-og-images.mjs http://localhost:3111
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// sharp ships with next, it is not a direct dependency.
const require = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
const sharp = require("sharp");

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const base = (process.argv[2] ?? "http://localhost:3111").replace(/\/+$/, "");
const WIDTH = 1200;
const HEIGHT = 630;

if (!existsSync(CHROME)) {
  throw new Error(`Chrome not found at ${CHROME} – set CHROME_PATH.`);
}

// The slugs live in a TypeScript file; read them without a TS toolchain.
const slugs = [
  ...readFileSync("lib/landing/links.ts", "utf8").matchAll(/slug: "([a-z0-9-]+)"/g),
].map((match) => match[1]);

mkdirSync("public/og", { recursive: true });

for (const slug of slugs) {
  const raw = join(tmpdir(), `og-${slug}.png`);
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${WIDTH},${HEIGHT}`,
      // Lets fonts and images finish loading before the capture.
      "--virtual-time-budget=8000",
      `--screenshot=${raw}`,
      `${base}/og-preview/${slug}`,
    ],
    { stdio: "ignore" },
  );
  const { size } = await sharp(raw)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "top" })
    .png({ compressionLevel: 9, palette: true, quality: 90, colours: 256 })
    .toFile(`public/og/${slug}.png`);
  rmSync(raw);
  console.log(`public/og/${slug}.png  ${(size / 1024).toFixed(0)} KB`);
}
