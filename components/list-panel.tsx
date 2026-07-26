"use client"

import { Copy, Minus, Plus, Share2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { tint } from "@/lib/color"
import { linkBudget, type LinkStatus } from "@/lib/share"
import { LINK_BUDGET } from "@/lib/config"
import { plural } from "@/lib/text"
import type { CategoryTally } from "@/hooks/use-selection"

// ─── Distribution bar ─────────────────────────────────────────────────────────

/**
 * Stacked bar showing each category's share of the total quantity. Answers "is this
 * shop balanced, or did I forget the vegetables?" at a glance — the one piece of real
 * data visualisation in the app.
 */
export function DistributionBar({
  tallies,
  total,
  className,
  height = "h-2",
}: {
  tallies: CategoryTally[]
  total: number
  className?: string
  height?: string
}) {
  if (total === 0) return null

  // Slivers below 4% would be invisible, so they are clamped and the rest absorb it
  const raw = tallies.map((cat) => Math.max(4, (cat.count / total) * 100))
  const sum = raw.reduce((s, v) => s + v, 0)

  return (
    <div
      className={cn("bg-surface-2 flex w-full overflow-hidden rounded-full", height, className)}
      role="img"
      aria-label={`Distribution: ${tallies.map((c) => `${c.name} ${c.count}`).join(", ")}`}
    >
      {tallies.map((cat, i) => (
        <div
          key={cat.id}
          className={cn("h-full", i > 0 && "border-l-2 border-[var(--surface)]")}
          style={{ width: `${(raw[i] / sum) * 100}%`, backgroundColor: cat.color }}
          title={`${cat.name}: ${cat.count} of ${total}`}
        />
      ))}
    </div>
  )
}

// ─── Link budget meter ────────────────────────────────────────────────────────

const STATUS_COLOR: Record<LinkStatus, string> = {
  safe: "bg-primary",
  caution: "bg-caution",
  warn: "bg-destructive",
}

const STATUS_TEXT: Record<LinkStatus, string> = {
  safe: "text-muted-foreground",
  caution: "text-caution",
  warn: "text-destructive",
}

/**
 * The whole list is encoded into the URL, so an over-long list is silently truncated
 * by some chat clients. Surfacing the budget turns an invisible cliff into a gauge.
 */
export function LinkMeter({ urlLength }: { urlLength: number }) {
  const budget = linkBudget(urlLength)
  const segments = 5
  const filled = Math.max(1, Math.ceil(budget.ratio * segments))

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground shrink-0 text-[11px] font-semibold tracking-[0.06em] uppercase">
        Link
      </span>
      <div className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn("h-1.5 w-3 rounded-full", i < filled ? STATUS_COLOR[budget.status] : "bg-surface-2")}
          />
        ))}
      </div>
      <span className={cn("truncate text-[12px]", STATUS_TEXT[budget.status])}>
        {budget.label}
      </span>
      <span data-numeric className="text-muted-foreground ml-auto shrink-0 text-[11px]">
        {urlLength}/{LINK_BUDGET.max}
      </span>
    </div>
  )
}

// ─── Panel body ───────────────────────────────────────────────────────────────

interface ListPanelBodyProps {
  tallies: CategoryTally[]
  total: number
  onIncrement: (catId: string, itemId: string) => void
  onDecrement: (catId: string, itemId: string) => void
  onRemove: (key: string) => void
}

export function ListPanelBody({
  tallies,
  total,
  onIncrement,
  onDecrement,
  onRemove,
}: ListPanelBodyProps) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
        <span className="mb-3 text-3xl" aria-hidden="true">
          🧺
        </span>
        <p className="text-[15px] font-medium">Nothing selected yet</p>
        <p className="text-muted-foreground mt-1 max-w-[26ch] text-[13px] leading-5">
          Tap any item to start your list. It travels inside the link you share — no
          account, nothing stored on a server.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <DistributionBar tallies={tallies} total={total} />
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {tallies.map((cat) => (
            <li key={cat.id} className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: cat.color }}
                aria-hidden="true"
              />
              {cat.name}
              <span data-numeric className="text-foreground font-semibold">
                {cat.count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {tallies.map((cat) => (
        <div key={cat.id}>
          <p
            className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase"
            style={{ color: cat.color }}
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: cat.color }}
              aria-hidden="true"
            />
            {cat.name}
            <span data-numeric className="text-muted-foreground ml-auto">
              {cat.count}
            </span>
          </p>
          <ul className="space-y-0.5">
            {cat.items.map((item) => (
              <li
                key={item.key}
                className="hover:bg-surface-2 flex items-center gap-2 rounded-sm py-0.5 pr-0.5 pl-1.5 transition-colors"
              >
                <span aria-hidden="true">{item.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-[14px]">{item.name}</span>

                <div className="flex items-center">
                  <MiniStep
                    label={`Remove one ${item.name}`}
                    color={cat.color}
                    onClick={() => onDecrement(cat.id, item.id)}
                  >
                    <Minus className="size-3" strokeWidth={3} />
                  </MiniStep>
                  <span data-numeric className="w-6 text-center text-[14px] font-semibold">
                    {item.qty}
                  </span>
                  <MiniStep
                    label={`Add one ${item.name}`}
                    color={cat.color}
                    onClick={() => onIncrement(cat.id, item.id)}
                  >
                    <Plus className="size-3" strokeWidth={3} />
                  </MiniStep>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(item.key)}
                  aria-label={`Remove ${item.name} from list`}
                  className="text-muted-foreground hover:text-destructive flex size-9 items-center justify-center rounded-md transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function MiniStep({
  label,
  color,
  onClick,
  children,
}: {
  label: string
  color: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full transition-transform active:scale-90"
    >
      <span
        className="flex size-6 items-center justify-center rounded-full"
        style={{ backgroundColor: tint(color, 18) }}
      >
        {children}
      </span>
    </button>
  )
}

// ─── Panel actions ────────────────────────────────────────────────────────────

interface ListPanelActionsProps {
  total: number
  urlLength: number
  onShare: () => void
  onCopy: () => void
  onClear: () => void
}

export function ListPanelActions({
  total,
  urlLength,
  onShare,
  onCopy,
  onClear,
}: ListPanelActionsProps) {
  if (total === 0) return null
  return (
    <div className="space-y-3">
      <LinkMeter urlLength={urlLength} />
      <div className="flex gap-2">
        <Button onClick={onShare} className="h-11 flex-1 gap-2">
          <Share2 className="size-4" />
          Share list
        </Button>
        <Button onClick={onCopy} variant="outline" size="icon" className="size-11" aria-label="Copy link">
          <Copy className="size-4" />
        </Button>
        <Button
          onClick={onClear}
          variant="outline"
          size="icon"
          className="text-muted-foreground hover:text-destructive size-11"
          aria-label="Clear list"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Composed panel (Expanded right rail) ─────────────────────────────────────

export function ListPanel(props: ListPanelBodyProps & Omit<ListPanelActionsProps, "total">) {
  const { total } = props
  return (
    <aside
      aria-label="Your list"
      className="bg-surface shadow-e1 flex max-h-[calc(100vh-var(--stack-top)-2rem)] flex-col rounded-lg border"
    >
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Your list</h2>
        <span data-numeric className="text-muted-foreground text-[13px]">
          {total} {plural(total, "item")}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <ListPanelBody {...props} />
      </div>
      {total > 0 && (
        <div className="border-t px-4 py-3">
          <ListPanelActions {...props} />
        </div>
      )}
    </aside>
  )
}
