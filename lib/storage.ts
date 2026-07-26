import { PresetsSchema, type Preset, type Selection } from "@/lib/types"

const KEYS = {
  presets: "tap-tap-share-presets",
  currentPreset: "tap-tap-share-current-preset",
  demoSeen: "tap-tap-demo-seen",
  hintDismissed: "tap-tap-hint-dismissed",
  collapsed: "tap-tap-collapsed",
  selection: "tap-tap-selection",
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

export function loadPresets(fallback: Preset[]): Preset[] {
  const raw = readLocal(KEYS.presets)
  if (!raw) return fallback
  try {
    const result = PresetsSchema.safeParse(JSON.parse(raw))
    return result.success && result.data.length > 0 ? result.data : fallback
  } catch {
    return fallback
  }
}

export function savePresets(presets: Preset[]): void {
  if (presets.length > 0) writeLocal(KEYS.presets, JSON.stringify(presets))
}

/** Validates an imported preset file. Returns null when the shape is wrong. */
export function parsePresets(value: unknown): Preset[] | null {
  const result = PresetsSchema.safeParse(value)
  return result.success && result.data.length > 0 ? result.data : null
}

export const loadCurrentPresetId = () => readLocal(KEYS.currentPreset)
export const saveCurrentPresetId = (id: string) => writeLocal(KEYS.currentPreset, id)

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
