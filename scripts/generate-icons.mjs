/**
 * Generates branded PWA icons for TapTap.
 * Amber background (#d97706) with a white shopping cart symbol.
 * Run: node scripts/generate-icons.mjs
 */

import sharp from "sharp"
import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, "..", "public")

/**
 * Build an SVG icon at the given pixel size.
 * White shopping cart on amber rounded-rect background.
 */
function buildSvg(size) {
  const r = Math.round(size * 0.18)   // corner radius
  const pad = Math.round(size * 0.18) // padding from edge to cart
  const cartW = size - pad * 2
  const cartH = size - pad * 2

  // Cart geometry (all relative to the cart bounding box, then offset by pad)
  const ox = pad
  const oy = pad

  // Handle arc
  const handleRx = cartW * 0.28
  const handleRy = cartH * 0.22
  const handleCx = ox + cartW * 0.5
  const handleCy = oy + cartH * 0.14

  // Body
  const bodyX = ox + cartW * 0.04
  const bodyY = oy + cartH * 0.3
  const bodyW = cartW * 0.92
  const bodyH = cartH * 0.38

  // Wheel params
  const wheelR = cartH * 0.1
  const wheelY = oy + cartH * 0.83
  const wheelLx = ox + cartW * 0.28
  const wheelRx2 = ox + cartW * 0.68

  // Stroke width scales with size
  const sw = Math.max(2, Math.round(size * 0.045))

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#d97706"/>

  <!-- Shopping cart outline (white, stroke-only so it looks clean at any size) -->
  <g fill="none" stroke="white" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
    <!-- Handle -->
    <path d="M ${handleCx - handleRx} ${handleCy + handleRy}
             A ${handleRx} ${handleRy} 0 0 1 ${handleCx + handleRx} ${handleCy + handleRy}" />
    <!-- Body (rectangle with slightly rounded corners) -->
    <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="${Math.round(sw * 1.2)}" ry="${Math.round(sw * 1.2)}"/>
    <!-- Wheels -->
    <circle cx="${wheelLx}" cy="${wheelY}" r="${wheelR}" fill="white" stroke="none"/>
    <circle cx="${wheelRx2}" cy="${wheelY}" r="${wheelR}" fill="white" stroke="none"/>
  </g>
</svg>`
}

async function generate(size, filename) {
  const svg = buildSvg(size)
  const svgBuf = Buffer.from(svg)
  await sharp(svgBuf)
    .png()
    .toFile(join(publicDir, filename))
  console.log(`  ✓ ${filename} (${size}×${size})`)
}

console.log("Generating TapTap PWA icons…")
await generate(192, "icon-192.png")
await generate(512, "icon-512.png")
console.log("Done.")
