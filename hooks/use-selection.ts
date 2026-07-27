"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { loadSelections, saveSelections } from "@/lib/storage"
import { k, type Preset, type Selection } from "@/lib/types"

const MAX_QTY = 99

export interface TalliedItem {
  id: string
  name: string
  emoji: string
  qty: number
  key: string
  /** Carried through so the cost view reads from the same structure as the count view. */
  unit?: string
  cents?: number
  trend?: "spike"
}

export interface CategoryTally {
  id: string
  name: string
  color: string
  count: number
  items: TalliedItem[]
}

/**
 * Owns the per-preset selection.
 *
 * Selections are kept for every preset at once (in sessionStorage) so switching
 * presets to look something up does not wipe the list being built.
 */
export function useSelection(presetId: string | null) {
  const [selections, setSelections] = useState<Record<string, Selection>>({})
  const [hydrated, setHydrated] = useState(false)
  const undoRef = useRef<{ presetId: string; selection: Selection } | null>(null)

  useEffect(() => {
    setSelections(loadSelections())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveSelections(selections)
  }, [selections, hydrated])

  const sel: Selection = useMemo(
    () => (presetId ? (selections[presetId] ?? {}) : {}),
    [selections, presetId],
  )

  const update = useCallback(
    (fn: (prev: Selection) => Selection) => {
      if (!presetId) return
      setSelections((prev) => ({ ...prev, [presetId]: fn(prev[presetId] ?? {}) }))
    },
    [presetId],
  )

  const setQty = useCallback(
    (catId: string, itemId: string, qty: number) =>
      update((prev) => {
        const key = k(catId, itemId)
        const next = { ...prev }
        const clamped = Math.min(MAX_QTY, Math.max(0, Math.round(qty)))
        if (clamped <= 0) delete next[key]
        else next[key] = clamped
        return next
      }),
    [update],
  )

  const tap = useCallback(
    (catId: string, itemId: string) =>
      update((prev) => {
        const key = k(catId, itemId)
        const next = Math.min(MAX_QTY, (prev[key] ?? 0) + 1)
        return { ...prev, [key]: next }
      }),
    [update],
  )

  const dec = useCallback(
    (catId: string, itemId: string) =>
      update((prev) => {
        const key = k(catId, itemId)
        const count = (prev[key] ?? 0) - 1
        if (count <= 0) {
          const next = { ...prev }
          delete next[key]
          return next
        }
        return { ...prev, [key]: count }
      }),
    [update],
  )

  const removeKey = useCallback(
    (key: string) =>
      update((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      }),
    [update],
  )

  /** Clears the active preset's selection and stashes it for a single undo. */
  const clear = useCallback(() => {
    if (!presetId) return
    undoRef.current = { presetId, selection: sel }
    update(() => ({}))
  }, [presetId, sel, update])

  const undoClear = useCallback(() => {
    const snapshot = undoRef.current
    if (!snapshot) return false
    setSelections((prev) => ({ ...prev, [snapshot.presetId]: snapshot.selection }))
    undoRef.current = null
    return true
  }, [])

  /** Drops a preset's selection entirely — used when a preset is deleted. */
  const forgetPreset = useCallback((id: string) => {
    setSelections((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const total = useMemo(() => Object.values(sel).reduce((s, v) => s + v, 0), [sel])

  const presetTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const [id, selection] of Object.entries(selections)) {
      const sum = Object.values(selection).reduce((s, v) => s + v, 0)
      if (sum > 0) totals[id] = sum
    }
    return totals
  }, [selections])

  /** Builds the grouped view the list panel and distribution bar both render from. */
  const tallyFor = useCallback(
    (preset: Preset | null): CategoryTally[] => {
      if (!preset) return []
      return preset.categories
        .map((cat) => {
          const items = cat.items
            .map((item) => ({
              id: item.id,
              name: item.name,
              emoji: item.emoji,
              qty: sel[k(cat.id, item.id)] ?? 0,
              key: k(cat.id, item.id),
              unit: item.unit,
              cents: item.cents,
              trend: item.trend,
            }))
            .filter((item) => item.qty > 0)
          return {
            id: cat.id,
            name: cat.name,
            color: cat.color,
            count: items.reduce((s, item) => s + item.qty, 0),
            items,
          }
        })
        .filter((cat) => cat.count > 0)
    },
    [sel],
  )

  return {
    sel,
    total,
    presetTotals,
    tap,
    dec,
    setQty,
    removeKey,
    clear,
    undoClear,
    forgetPreset,
    tallyFor,
    hydrated,
  }
}
