const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "public");
const svgPath = path.join(publicDir, "icon.svg");

if (!fs.existsSync(svgPath)) {
  console.error("public/icon.svg not found");
  process.exit(1);
}

async function generate() {
  const sizes = [192, 512];
  for (const size of sizes) {
    const outPath = path.join(publicDir, `icon-${size}x${size}.png`);
    await sharp(svgPath, { density: 144 })
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log("Generated", outPath);
  }
  console.log("PWA icons ready. Add to desktop / install prompt should work.");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
