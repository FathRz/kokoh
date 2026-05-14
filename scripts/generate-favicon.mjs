import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";

const input = "public/kokoh-logo.png";

// favicon.ico (32x32) → app/favicon.ico
await sharp(input)
  .resize(32, 32, { fit: "contain", background: { r: 28, g: 42, b: 94, alpha: 1 } })
  .png()
  .toFile("public/favicon-32.png");

// 192x192 untuk PWA
await sharp(input)
  .resize(192, 192, { fit: "contain", background: { r: 28, g: 42, b: 94, alpha: 1 } })
  .png()
  .toFile("public/icons/icon-192x192.png");

// 512x512 untuk PWA
await sharp(input)
  .resize(512, 512, { fit: "contain", background: { r: 28, g: 42, b: 94, alpha: 1 } })
  .png()
  .toFile("public/icons/icon-512x512.png");

// apple-touch-icon 180x180
await sharp(input)
  .resize(180, 180, { fit: "contain", background: { r: 28, g: 42, b: 94, alpha: 1 } })
  .png()
  .toFile("public/apple-touch-icon.png");

// favicon.ico dari 32x32
const faviconBuf = await sharp(input)
  .resize(32, 32, { fit: "contain", background: { r: 28, g: 42, b: 94, alpha: 1 } })
  .png()
  .toBuffer();

// Copy ke src/app/favicon.ico (Next.js pakai ini)
writeFileSync("src/app/favicon.ico", faviconBuf);

console.log("Favicon dan icons berhasil digenerate:");
console.log("  src/app/favicon.ico (32x32)");
console.log("  public/icons/icon-192x192.png");
console.log("  public/icons/icon-512x512.png");
console.log("  public/apple-touch-icon.png");
