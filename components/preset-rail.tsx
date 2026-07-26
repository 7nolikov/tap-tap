"use client"

import { useEffect, useRef } from "react"
import { Plus, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Preset } from "@/lib/types"

/**
 * Replaces the 16-entry `<select>`. Switching preset is the app's most common
 * navigation action; on mobile the native picker made it a two-tap full-screen
 * context switch.
 */
export function PresetRail({
  presets,
  currentId,
  presetTotals,
  onSelect,
  onNew,
  onManage,
}: {
  presets: Preset[]
  currentId: string | null
  /** Selected-item count per preset, so nothing is silently lost when switching. */
  presetTotals: Record<string, number>
  onSelect: (id: string) => void
  onNew: () => void
  onManage: () => void
}) {
  const railRef = useRef<HTMLDivElement>(null)

  // Keep the active chip on screen when the preset changes from elsewhere
  useEffect(() => {
    const active = railRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    active?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [currentId])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const index = presets.findIndex((p) => p.id === currentId)
    if (index === -1) return
    let next = index
    if (e.key === "ArrowRight") next = Math.min(presets.length - 1, index + 1)
    else if (e.key === "ArrowLeft") next = Math.max(0, index - 1)
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = presets.length - 1
    else return
    e.preventDefault()
    onSelect(presets[next].id)
  }

  return (
    <div className="flex items-center gap-2">
      <div
        ref={railRef}
        role="tablist"
        aria-label="Presets"
        onKeyDown={onKeyDown}
        className="hide-scrollbar -mx-1 flex flex-1 gap-1.5 overflow-x-auto scroll-smooth px-1 py-1.5 [scroll-snap-type:x_proximity]"
      >
        {presets.map((preset) => {
          const active = preset.id === currentId
          const selected = presetTotals[preset.id] ?? 0
          const itemCount = preset.categories.reduce((s, c) => s + c.items.length, 0)
          return (
            <button
              key={preset.id}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(preset.id)}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 rounded-sm border px-3 text-[13px] font-medium whitespace-nowrap transition-colors [scroll-snap-align:center]",
                active
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-surface hover:bg-surface-2 border-border",
              )}
            >
              {preset.name}
              <span
                data-numeric
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                  selected > 0 && !active && "bg-primary text-primary-foreground",
                  selected > 0 && active && "bg-black/20",
                  selected === 0 && (active ? "bg-black/15" : "bg-surface-2 text-muted-foreground"),
                )}
                aria-label={
                  selected > 0 ? `${selected} selected of ${itemCount} items` : `${itemCount} items`
                }
              >
                {selected > 0 ? selected : itemCount}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onManage}
          aria-label="Manage presets"
          className="border-border bg-surface hover:bg-surface-2 flex size-11 items-center justify-center rounded-sm border transition-colors"
        >
          <SlidersHorizontal className="size-4" />
        </button>
        <button
          type="button"
          onClick={onNew}
          aria-label="New preset"
          className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-sm transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}
