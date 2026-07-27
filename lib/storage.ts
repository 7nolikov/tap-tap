import { DEFAULTS_VERSION } from "@/lib/presets"
import { STORE_TIERS, DEFAULT_TIER, type StoreTierId } from "@/lib/economics"
import { PresetsSchema, type Preset, type Selection } from "@/lib/types"

const KEYS = {
  presets: "tap-tap-share-presets",
  currentPreset: "tap-tap-share-current-preset",
  demoSeen: "tap-tap-demo-seen",
  hintDismissed: "tap-tap-hint-dismissed",
  collapsed: "tap-tap-collapsed",
  selection: "tap-tap-selection",
  defaultsVersion: "tap-tap-defaults-version",
  tier: "tap-tap-store-tier",
  measure: "tap-tap-measure",
} as const

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // Safari private mode and locked-down enterprise profiles throw on access
    return null
  }
}

function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Quota exceeded or storage disabled — the app stays usable, just not persistent
  }
}

// ─── Presets ──────────────────────────────────────────────────────────────────

/**
 * Fingerprint of the v1 built-ins: preset id → item count.
 *
 * `loadPresets` returns whatever is in storage whenever anything is there, so a returning
 * visitor would otherwise never see a change to the defaults — they would be pinned to
 * the shipped-once dataset forever. Comparing against this fingerprint distinguishes
 * "these are the old built-ins, untouched" from "this person has edited or added
 * things", which is the difference between a safe replace and destroying someone's work.
 */
const V1_DEFAULTS: Record<string, number> = {
  "grocery-shopping": 46,
  "bbq-party": 21,
  "camping-trip": 18,
  "weekly-meal-prep": 21,
  "pizza-night": 16,
  "office-supplies": 15,
  "date-night": 17,
  "baby-essentials": 14,
  "christmas-dinner": 19,
  "football-night": 15,
  "moving-house": 17,
  "cocktail-party": 19,
  "road-trip": 17,
  "gym-fitness": 18,
  "dog-essentials": 12,
  "holiday-baking": 20,
}

const itemCount = (preset: Preset) =>
  preset.categories.reduce((sum, cat) => sum + cat.items.length, 0)

/** True when every stored preset is a v1 built-in that nobody has edited. */
const isPristineV1 = (presets: Preset[]) =>
  presets.every((preset) => V1_DEFAULTS[preset.id] === itemCount(preset))

export interface LoadedPresets {
  presets: Preset[]
  /**
   * Set when the stored presets predate the current defaults but could not be replaced
   * safely, because they contain the user's own work. The caller offers rather than acts.
   */
  upgradeAvailable: boolean
}

export function loadPresets(fallback: Preset[]): LoadedPresets {
  const raw = readLocal(KEYS.presets)
  if (!raw) return { presets: fallback, upgradeAvailable: false }

  let stored: Preset[]
  try {
    const result = PresetsSchema.safeParse(JSON.parse(raw))
    if (!result.success || result.data.length === 0) {
      return { presets: fallback, upgradeAvailable: false }
    }
    stored = result.data
  } catch {
    return { presets: fallback, upgradeAvailable: false }
  }

  const storedVersion = Number(readLocal(KEYS.defaultsVersion) ?? "1")
  if (storedVersion >= DEFAULTS_VERSION) return { presets: stored, upgradeAvailable: false }

  if (isPristineV1(stored)) return { presets: fallback, upgradeAvailable: false }
  return { presets: stored, upgradeAvailable: true }
}

export function savePresets(presets: Preset[]): void {
  if (presets.length === 0) return
  writeLocal(KEYS.presets, JSON.stringify(presets))
  writeLocal(KEYS.defaultsVersion, String(DEFAULTS_VERSION))
}

/** Validates an imported preset file. Returns null when the shape is wrong. */
export function parsePresets(value: unknown): Preset[] | null {
  const result = PresetsSchema.safeParse(value)
  return result.success && result.data.length > 0 ? result.data : null
}

export const loadCurrentPresetId = () => readLocal(KEYS.currentPreset)
export const saveCurrentPresetId = (id: string) => writeLocal(KEYS.currentPreset, id)

// ─── Money view ───────────────────────────────────────────────────────────────
//
// Where someone shops does not change between sessions, so neither should the setting.

export function loadTier(): StoreTierId {
  const raw = readLocal(KEYS.tier)
  return STORE_TIERS.some((tier) => tier.id === raw) ? (raw as StoreTierId) : DEFAULT_TIER
}

export const saveTier = (tier: StoreTierId) => writeLocal(KEYS.tier, tier)

export const loadMeasure = (): "count" | "cost" =>
  readLocal(KEYS.measure) === "cost" ? "cost" : "count"

export const saveMeasure = (measure: "count" | "cost") => writeLocal(KEYS.measure, measure)

// ─── First-run flags ──────────────────────────────────────────────────────────

export const hasSeenDemo = () => readLocal(KEYS.demoSeen) === "1"
export const markDemoSeen = () => writeLocal(KEYS.demoSeen, "1")

export const hasDismissedHint = () => readLocal(KEYS.hintDismissed) === "1"
export const markHintDismissed = () => writeLocal(KEYS.hintDismissed, "1")

// ─── Collapsed categories ─────────────────────────────────────────────────────

export function loadCollapsed(): Record<string, boolean> {
  const raw = readLocal(KEYS.collapsed)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

export const saveCollapsed = (state: Record<string, boolean>) =>
  writeLocal(KEYS.collapsed, JSON.stringify(state))

// ─── Selection ────────────────────────────────────────────────────────────────
//
// Kept per preset and in sessionStorage: switching presets to check something should
// not silently destroy the list you were building, but a fresh tab should start clean.

type SelectionMap = Record<string, Selection>

export function loadSelections(): SelectionMap {
  try {
    const raw = sessionStorage.getItem(KEYS.selection)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? (parsed as SelectionMap) : {}
  } catch {
    return {}
  }
}

export function saveSelections(map: SelectionMap): void {
  try {
    sessionStorage.setItem(KEYS.selection, JSON.stringify(map))
  } catch {
    // non-fatal
  }
}
