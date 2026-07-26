/**
 * Category colours arrive as hex — from the built-in presets, from a user's palette
 * pick, or from a shared link. Every derived value (tints, borders, readable
 * foregrounds) is therefore computed at runtime rather than hard-coded.
 */

/** Translucent tint that composites over whatever surface is beneath it, so a single
 *  value reads correctly in both light and dark themes. */
export function tint(hex: string, pct: number): string {
  return `color-mix(in oklab, ${hex} ${pct}%, transparent)`
}

function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const normalized = normalizeHex(hex)
  const r = srgbToLinear(parseInt(normalized.slice(1, 3), 16))
  const g = srgbToLinear(parseInt(normalized.slice(3, 5), 16))
  const b = srgbToLinear(parseInt(normalized.slice(5, 7), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const LIGHT_FG = "#ffffff"
const DARK_FG = "#1a1a1a"
const DARK_FG_LUMINANCE = luminance(DARK_FG)

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

/**
 * Foreground that stays legible on a solid category colour.
 *
 * The old implementation hard-coded white, which is 2.1:1 on amber (#f59e0b) — a
 * WCAG failure at any size. Category colours can also arrive from a shared link, so
 * this picks whichever of the two foregrounds actually has more contrast rather than
 * guessing from a threshold. (The crossover sits near luminance 0.204, not the 0.45
 * an eyeball estimate suggests, which is why amber and lime were being mis-assigned.)
 */
export function readableOn(hex: string): string {
  const bg = luminance(hex)
  return contrast(bg, DARK_FG_LUMINANCE) >= contrast(bg, 1) ? DARK_FG : LIGHT_FG
}

/** WCAG contrast ratio between a colour and the foreground `readableOn` would pick. */
export function bestContrast(hex: string): number {
  const bg = luminance(hex)
  return Math.max(contrast(bg, DARK_FG_LUMINANCE), contrast(bg, 1))
}

/** Expands #abc, tolerates a missing #, and falls back to a neutral on garbage input. */
export function normalizeHex(hex: string): string {
  const value = hex.trim().replace(/^#?/, "")
  if (/^[0-9a-f]{3}$/i.test(value)) {
    return `#${value[0]}${value[0]}${value[1]}${value[1]}${value[2]}${value[2]}`
  }
  if (/^[0-9a-f]{6}$/i.test(value)) return `#${value}`
  return "#6b7280"
}
