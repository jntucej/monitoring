const sharp = require("sharp");
const path = require("path");
const PUB = "public/brand";
const NAVY = { r: 13, g: 20, b: 34, alpha: 1 };

async function tile(out, size, logoFrac = 0.74) {
  const logoBuf = await sharp(path.join(PUB, "logo.png"))
    .resize(Math.round(size * logoFrac), Math.round(size * logoFrac), {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("wrote", out, size + "x" + size);
}

async function main() {
  await tile(path.join(PUB, "icon-192.png"), 192);
  await tile(path.join(PUB, "icon-512.png"), 512);
  await tile(path.join(PUB, "apple-touch-icon.png"), 180);
  // maskable 512 with extra padding (safe zone)
  await tile(path.join(PUB, "icon-maskable-512.png"), 512, 0.5);
  console.log("done");
}
main().catch((e) => { console.error(e); process.exit(1); });
