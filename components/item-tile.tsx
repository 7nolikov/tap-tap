"use client"

import { useCallback, useRef } from "react"
import { Minus, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { readableOn, tint } from "@/lib/color"
import { SpikeMark } from "@/components/list-panel"
import { adjustCents, formatCents, type StoreTierId } from "@/lib/economics"

const LONG_PRESS_MS = 500

/** Short confirmation pulse. Silently absent on desktop and iOS Safari. */
function haptic(ms: number) {
  if (typeof navigator === "undefined") return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  navigator.vibrate?.(ms)
}

interface ItemTileProps {
  name: string
  emoji: string
  color: string
  qty: number
  editing: boolean
  /** Pack size, e.g. "1 L". Absent on user-created items. */
  unit?: string
  /** Baseline price in cents; adjusted for `tier` here so the tile and the panel agree. */
  cents?: number
  tier: StoreTierId
  trend?: "spike"
  /** Highlights the first tile for first-time visitors. */
  hint?: boolean
  /** Search term to highlight inside the label. */
  highlight?: string
  onIncrement: () => void
  onDecrement: () => void
  onDelete: () => void
  onEditQuantity: () => void
}

export function ItemTile({
  name,
  emoji,
  color,
  qty,
  editing,
  unit,
  cents,
  tier,
  trend,
  hint = false,
  highlight,
  onIncrement,
  onDecrement,
  onDelete,
  onEditQuantity,
}: ItemTileProps) {
  const selected = qty > 0
  const fg = selected ? readableOn(color) : undefined
  const priced = cents != null ? formatCents(adjustCents(cents, { tier })) : null

  // A long press must not also register as a tap when the finger lifts
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const startLongPress = useCallback(() => {
    if (editing) return
    longPressFired.current = false
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      haptic(12)
      onEditQuantity()
    }, LONG_PRESS_MS)
  }, [editing, onEditQuantity])

  const handleActivate = useCallback(() => {
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    haptic(8)
    onIncrement()
  }, [onIncrement])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "-" || e.key === "Backspace") {
        e.preventDefault()
        onDecrement()
      }
    },
    [onDecrement],
  )

  // The unit is part of the item's identity, not decoration — "2 Milk" is ambiguous in
  // a way "2 × 1 L Milk" is not, and a screen reader user has no tile to read it off.
  const meta = [unit, priced].filter(Boolean).join(", ")
  const label = [selected ? `${name}, ${qty} selected` : `Add ${name}`, meta]
    .filter(Boolean)
    .join(", ")

  return (
    <div
      className={cn(
        "relative flex min-h-[128px] flex-col rounded-md border transition-[background-color,border-color,transform] duration-[120ms]",
        hint && "pulse-hint",
      )}
      style={
        selected
          ? { backgroundColor: color, borderColor: color, color: fg }
          : { backgroundColor: tint(color, 8), borderColor: tint(color, 24) }
      }
    >
      {/* Full-tile hit layer. Kept as a sibling of the visuals rather than a wrapper so
          the steppers are never nested inside another button. */}
      <button
        type="button"
        aria-pressed={selected}
        aria-label={label}
        disabled={editing}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "absolute inset-0 z-0 rounded-md",
          "active:scale-[0.97] motion-reduce:active:scale-100",
          "transition-transform duration-[120ms]",
          // Hover only where a real pointer exists — on touch it leaves a stuck state
          "[@media(hover:hover)_and_(pointer:fine)]:hover:brightness-[0.97]",
        )}
      />

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col gap-1 p-2.5 pb-0">
        <div className="flex items-start justify-between gap-1">
          <span className="text-[22px] leading-[26px]" aria-hidden="true">
            {emoji}
          </span>
          {selected && (
            <span
              data-numeric
              className="rounded-full px-1.5 py-0.5 text-[11px] leading-4 font-semibold"
              style={{ backgroundColor: tint(fg ?? "#ffffff", 22) }}
              aria-hidden="true"
            >
              {qty}
            </span>
          )}
        </div>
        <span
          className={cn(
            "line-clamp-2 text-[13px] leading-4 font-medium",
            !selected && "text-foreground",
          )}
        >
          {highlight ? <Highlighted text={name} term={highlight} /> : name}
        </span>

        {/* Opacity rather than a muted colour token: the tile's background flips to the
            raw category colour when selected, where a fixed grey stops being legible. */}
        {(unit || priced) && (
          <span
            className={cn(
              "mt-auto flex items-center gap-1 text-[11px] leading-4 opacity-70",
              !selected && "text-muted-foreground opacity-100",
            )}
            aria-hidden="true"
          >
            {unit && <span data-numeric className="truncate">{unit}</span>}
            {unit && priced && <span aria-hidden="true">·</span>}
            {priced && (
              <span data-numeric className="font-semibold">
                {priced}
              </span>
            )}
            {trend === "spike" && <SpikeMark className="shrink-0" />}
          </span>
        )}
      </div>

      {/* Reserved 44px strip. Present at qty 0 too, so tapping never reflows the grid.
          pointer-events-none keeps the empty strip from masking the tile's own hit
          layer underneath; the steppers re-enable events for themselves. */}
      <div className="pointer-events-none relative z-20 flex h-11 items-center justify-between px-0.5">
        {selected ? (
          <>
            <StepperButton
              label={`Remove one ${name}`}
              onClick={() => {
                haptic(4)
                onDecrement()
              }}
              fg={fg}
            >
              <Minus className="size-3.5" strokeWidth={3} />
            </StepperButton>

            <button
              type="button"
              data-numeric
              onClick={onEditQuantity}
              aria-label={`Set quantity for ${name}, currently ${qty}`}
              className="pointer-events-auto rounded px-1 text-[15px] leading-none font-bold"
            >
              {qty}
            </button>

            <StepperButton
              label={`Add one ${name}`}
              onClick={() => {
                haptic(8)
                onIncrement()
              }}
              fg={fg}
            >
              <Plus className="size-3.5" strokeWidth={3} />
            </StepperButton>
          </>
        ) : null}
      </div>

      {editing && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${name}`}
          className="bg-destructive text-destructive-foreground shadow-e1 absolute -top-2 -right-2 z-30 flex size-8 items-center justify-center rounded-full transition-transform active:scale-90"
        >
          <X className="size-4" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

function StepperButton({
  label,
  onClick,
  fg,
  children,
}: {
  label: string
  onClick: () => void
  fg?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // 44x44 hit area, 28px visual — the target is the button, not the circle
      className="pointer-events-auto flex size-11 items-center justify-center rounded-full transition-transform active:scale-90"
    >
      <span
        className="flex size-7 items-center justify-center rounded-full"
        style={{ backgroundColor: tint(fg ?? "#ffffff", 24) }}
      >
        {children}
      </span>
    </button>
  )
}

/** Marks the matching substring so search results are scannable. */
function Highlighted({ text, term }: { text: string; term: string }) {
  const index = text.toLowerCase().indexOf(term.toLowerCase())
  if (index === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-bold underline decoration-2 underline-offset-2">
        {text.slice(index, index + term.length)}
      </mark>
      {text.slice(index + term.length)}
    </>
  )
}
