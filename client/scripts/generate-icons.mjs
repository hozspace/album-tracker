// One-off script: rasterizes icon-src/vinyl.svg into the PWA icon PNGs
// checked into public/icons/. Re-run manually (`npm run icons -w client`)
// if the source SVG ever changes — this is not part of the build, the
// icon doesn't change often enough to justify rendering it on every build.
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SVG_PATH = join(__dirname, '..', 'icon-src', 'vinyl.svg')
const OUT_DIR = join(__dirname, '..', 'public', 'icons')
const SIZES = [180, 192, 512]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  for (const size of SIZES) {
    const outPath = join(OUT_DIR, `icon-${size}.png`)
    await sharp(SVG_PATH).resize(size, size).png().toFile(outPath)
    console.log(`wrote ${outPath}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
