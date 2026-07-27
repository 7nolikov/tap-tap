import LZString from "lz-string"
import { LINK_BUDGET } from "@/lib/config"
import { formatCents } from "@/lib/economics"
import { PRESET_COLORS } from "@/lib/presets"
import {
  k,
  PresetSchema,
  ShareDataSchema,
  ShareDataV3Schema,
  type Preset,
  type Selection,
  type ShareData,
  type ShareDataV3,
  type SharedItem,
} from "@/lib/types"

export type DecodeResult = { ok: true; data: ShareData } | { ok: false; broken: boolean }

// ─── Lists ────────────────────────────────────────────────────────────────────

/**
 * Emits v3: categories declared once, items as positional tuples.
 *
 * Price and unit ride along because the recipient has no database to look the item up
 * in — without them a received list is words, and a total is impossible on their side.
 * Prices go over at *baseline*, never tier-adjusted: where the sender shops is a fact
 * about the sender, not about the list.
 */
export function encodeList(preset: Preset, sel: Selection): string {
  const selected = preset.categories
    .map((cat) => ({
      cat,
      items: cat.items.filter((item) => (sel[k(cat.id, item.id)] ?? 0) > 0),
    }))
    .filter((group) => group.items.length > 0)

  const payload: ShareDataV3 = {
    n: preset.name,
    c: selected.map((group) => [group.cat.name, group.cat.color]),
    i: selected.flatMap((group, index) =>
      group.items.map(
        (item) =>
          [
            index,
            item.emoji,
            item.name,
            sel[k(group.cat.id, item.id)],
            item.cents ?? 0,
            item.unit ?? "",
          ] as [number, string, string, number, number, string],
      ),
    ),
  }
  return "v3:" + LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

/** v3 tuples → the keyed shape the rest of the app already speaks. */
function fromV3(data: ShareDataV3): ShareData {
  return {
    n: data.n,
    i: data.i.map(([catIndex, emoji, label, qty, cents, unit]) => {
      const category = data.c[catIndex]
      return {
        c: category?.[0] ?? "Items",
        e: emoji,
        l: label,
        q: qty,
        ...(category?.[1] ? { k: category[1] } : {}),
        ...(cents > 0 ? { p: cents } : {}),
        ...(unit ? { u: unit } : {}),
      }
    }),
  }
}

/**
 * Decodes a shared list. Four formats must keep working forever:
 *   `?list=v3:<lz-string>` (current), `?list=v2:<lz-string>`, `?list=<base64>` (v1),
 *   `#list=<base64>` (legacy). Links already sent outlive every format change.
 */
export function decodeList(search: string, hash: string): DecodeResult {
  const raw = new URLSearchParams(search).get("list") ?? (hash.startsWith("#list=") ? hash.slice(6) : null)
  if (!raw) return { ok: false, broken: false }
  try {
    if (raw.startsWith("v3:")) {
      const json = LZString.decompressFromEncodedURIComponent(raw.slice(3))
      if (!json) return { ok: false, broken: true }
      const parsed = ShareDataV3Schema.safeParse(JSON.parse(json))
      return parsed.success
        ? { ok: true, data: fromV3(parsed.data) }
        : { ok: false, broken: true }
    }
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
        ...(item.p != null ? { cents: item.p } : {}),
        ...(item.u ? { unit: item.u } : {}),
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

/** `totalCents` is omitted for lists where nothing carries a price. */
export function buildShareText(
  preset: Preset,
  total: number,
  url: string,
  totalCents?: number,
): string {
  const name = stripLeadingEmoji(preset.name)
  const cost = totalCents && totalCents > 0 ? ` · about ${formatCents(totalCents)}` : ""
  return [
    `🛒 ${name} — ${total} item${total !== 1 ? "s" : ""} ready to tick off${cost}`,
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
