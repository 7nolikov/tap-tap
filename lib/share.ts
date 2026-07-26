import LZString from "lz-string"
import { LINK_BUDGET } from "@/lib/config"
import { PRESET_COLORS } from "@/lib/presets"
import {
  k,
  PresetSchema,
  ShareDataSchema,
  type Preset,
  type Selection,
  type ShareData,
  type SharedItem,
} from "@/lib/types"

export type DecodeResult = { ok: true; data: ShareData } | { ok: false; broken: boolean }

// ─── Lists ────────────────────────────────────────────────────────────────────

export function encodeList(preset: Preset, sel: Selection): string {
  const items: SharedItem[] = preset.categories.flatMap((cat) =>
    cat.items
      .filter((item) => (sel[k(cat.id, item.id)] ?? 0) > 0)
      .map((item) => ({
        c: cat.name,
        e: item.emoji,
        l: item.name,
        q: sel[k(cat.id, item.id)],
        k: cat.color,
      })),
  )
  return "v2:" + LZString.compressToEncodedURIComponent(JSON.stringify({ n: preset.name, i: items }))
}

/**
 * Decodes a shared list. Three formats must keep working forever:
 *   `?list=v2:<lz-string>` (current), `?list=<base64>` (v1), `#list=<base64>` (legacy).
 */
export function decodeList(search: string, hash: string): DecodeResult {
  const raw = new URLSearchParams(search).get("list") ?? (hash.startsWith("#list=") ? hash.slice(6) : null)
  if (!raw) return { ok: false, broken: false }
  try {
    const json = raw.startsWith("v2:")
      ? LZString.decompressFromEncodedURIComponent(raw.slice(3))
      : decodeURIComponent(atob(raw))
    if (!json) return { ok: false, broken: true }
    const parsed = ShareDataSchema.safeParse(JSON.parse(json))
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, broken: true }
  } catch {
    return { ok: false, broken: true }
  }
}

/** Rebuilds a saveable Preset from a received list. */
export function sharedToPreset(data: ShareData): Preset {
  const groups: Record<string, { items: SharedItem[]; color?: string }> = {}
  data.i.forEach((item) => {
    if (!groups[item.c]) groups[item.c] = { items: [], color: item.k }
    groups[item.c].items.push(item)
  })
  const ts = Date.now()
  return {
    id: `preset-${ts}`,
    name: data.n,
    categories: Object.entries(groups).map(([name, { items, color }], idx) => ({
      id: `cat-${ts}-${idx}`,
      name,
      color: color ?? PRESET_COLORS[idx % PRESET_COLORS.length],
      items: items.map((item, iIdx) => ({
        id: `item-${ts}-${idx}-${iIdx}`,
        name: item.l,
        emoji: item.e,
      })),
    })),
  }
}

/** Groups a received list by category, preserving first-seen order. */
export function groupShared(data: ShareData): Array<{ name: string; color?: string; items: SharedItem[] }> {
  const order: string[] = []
  const groups: Record<string, { name: string; color?: string; items: SharedItem[] }> = {}
  data.i.forEach((item) => {
    if (!groups[item.c]) {
      groups[item.c] = { name: item.c, color: item.k, items: [] }
      order.push(item.c)
    }
    groups[item.c].items.push(item)
  })
  return order.map((name) => groups[name])
}

// ─── Preset templates ─────────────────────────────────────────────────────────

export function encodePreset(preset: Preset): string {
  const json = JSON.stringify({ id: preset.id, name: preset.name, categories: preset.categories })
  return "preset:v1:" + LZString.compressToEncodedURIComponent(json)
}

export function decodePreset(search: string): Preset | null {
  const raw = new URLSearchParams(search).get("preset")
  if (!raw || !raw.startsWith("preset:v1:")) return null
  try {
    const json = LZString.decompressFromEncodedURIComponent(raw.slice(10))
    if (!json) return null
    const parsed = PresetSchema.safeParse(JSON.parse(json))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

// ─── Share text ───────────────────────────────────────────────────────────────

/** Strips a leading emoji from a preset name so share text does not double up. */
export function stripLeadingEmoji(name: string): string {
  return name.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, "").trim() || name
}

export function buildShareText(preset: Preset, total: number, url: string): string {
  const name = stripLeadingEmoji(preset.name)
  return [
    `🛒 ${name} — ${total} item${total !== 1 ? "s" : ""} ready to tick off`,
    `👉 Open & tap to build yours: ${url}`,
    `\nBuilt with TapTap · No sign-up, works on any phone`,
  ].join("\n")
}

// ─── Link budget ──────────────────────────────────────────────────────────────

export type LinkStatus = "safe" | "caution" | "warn"

export interface LinkBudget {
  chars: number
  status: LinkStatus
  /** 0–1, for the gauge. */
  ratio: number
  label: string
}

export function linkBudget(chars: number): LinkBudget {
  const ratio = Math.min(1, chars / LINK_BUDGET.max)
  if (chars <= LINK_BUDGET.safe) {
    return { chars, ratio, status: "safe", label: "Sends anywhere" }
  }
  if (chars <= LINK_BUDGET.caution) {
    return { chars, ratio, status: "caution", label: "Getting long" }
  }
  return { chars, ratio, status: "warn", label: "Some apps may cut this link" }
}
