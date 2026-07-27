"use client"

import { Copy, Minus, Plus, Share2, TrendingUp, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { tint } from "@/lib/color"
import { linkBudget, type LinkStatus } from "@/lib/share"
import { LINK_BUDGET } from "@/lib/config"
import { plural } from "@/lib/text"
import {
  ANNUAL_FOOD_INFLATION,
  PRICE_BASELINE,
  SPIKE_LABEL,
  STORE_TIERS,
  adjustCents,
  basketCost,
  formatCents,
  formatCentsShort,
  monthsSinceBaseline,
  readBudget,
  tierById,
  type StoreTierId,
} from "@/lib/economics"
import type { CategoryTally } from "@/hooks/use-selection"
import type { Persona } from "@/lib/types"

/** What the distribution bar and legend are measuring. */
export type Measure = "count" | "cost"

// ─── Distribution bar ─────────────────────────────────────────────────────────

export interface Segment {
  id: string
  name: string
  color: string
  value: number
}

/**
 * Stacked bar showing each category's share of the whole.
 *
 * Deliberately measure-agnostic. The same component draws "share of items" and "share
 * of spend", and the interesting thing about this app's data is that those two pictures
 * disagree — one pack of nappies is 5 % of the items and 30 % of the bill. A bar that
 * could only ever count would hide exactly the finding worth showing.
 */
export function DistributionBar({
  segments,
  className,
  height = "h-2",
  format = String,
  label = "Distribution",
}: {
  segments: Segment[]
  className?: string
  height?: string
  format?: (value: number) => string
  label?: string
}) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0)
  if (total === 0) return null

  // Slivers below 4% would be invisible, so they are clamped and the rest absorb it
  const raw = segments.map((seg) => Math.max(4, (seg.value / total) * 100))
  const sum = raw.reduce((s, v) => s + v, 0)

  return (
    <div
      className={cn("bg-surface-2 flex w-full overflow-hidden rounded-full", height, className)}
      role="img"
      aria-label={`${label}: ${segments.map((s) => `${s.name} ${format(s.value)}`).join(", ")}`}
    >
      {segments.map((seg, i) => (
        <div
          key={seg.id}
          className={cn("h-full", i > 0 && "border-l-2 border-[var(--surface)]")}
          style={{ width: `${(raw[i] / sum) * 100}%`, backgroundColor: seg.color }}
          title={`${seg.name}: ${format(seg.value)} of ${format(total)}`}
        />
      ))}
    </div>
  )
}

export const countSegments = (tallies: CategoryTally[]): Segment[] =>
  tallies.map((cat) => ({ id: cat.id, name: cat.name, color: cat.color, value: cat.count }))

// ─── Measure toggle ───────────────────────────────────────────────────────────

function MeasureToggle({
  measure,
  onChange,
}: {
  measure: Measure
  onChange: (next: Measure) => void
}) {
  return (
    <div
      role="group"
      aria-label="Measure the list by"
      className="bg-surface-2 flex shrink-0 rounded-full p-0.5"
    >
      {(["count", "cost"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={measure === option}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
            measure === option
              ? "bg-surface text-foreground shadow-e1"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option === "count" ? "Items" : "Cost"}
        </button>
      ))}
    </div>
  )
}

// ─── Store tier ───────────────────────────────────────────────────────────────

/**
 * Where you shop moves a grocery bill further than almost anything you can change
 * inside the basket, so it is a first-class control rather than a setting. Flipping it
 * is the fastest way to see the economics move.
 */
export function StoreTierControl({
  tier,
  onChange,
}: {
  tier: StoreTierId
  onChange: (next: StoreTierId) => void
}) {
  const active = tierById(tier)
  const delta = Math.round((active.factor - 1) * 100)

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase">
          Where you shop
        </span>
        <span className="text-muted-foreground truncate text-[11px]">
          {active.example}
          {delta !== 0 && (
            <span data-numeric className={delta > 0 ? "text-caution" : "text-primary"}>
              {" "}
              {delta > 0 ? "+" : ""}
              {delta}%
            </span>
          )}
        </span>
      </div>
      <div role="group" aria-label="Store type" className="bg-surface-2 flex rounded-sm p-0.5">
        {STORE_TIERS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={tier === option.id}
            className={cn(
              "min-h-9 flex-1 rounded-[calc(var(--radius-sm)-2px)] text-[12px] font-medium transition-colors",
              tier === option.id
                ? "bg-surface text-foreground shadow-e1"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Basket meter ─────────────────────────────────────────────────────────────

const BUDGET_FILL = {
  under: "bg-primary",
  near: "bg-caution",
  over: "bg-destructive",
} as const

/**
 * The basket total against what this household actually has to spend.
 *
 * A total on its own is a number; a total against a budget is a decision. Presets that
 * carry no persona (yours, or one someone sent you) get the total without the gauge
 * rather than an invented budget to measure against.
 */
export function BasketMeter({
  totalCents,
  unpricedItems,
  persona,
}: {
  totalCents: number
  unpricedItems: number
  persona?: Persona
}) {
  const budget = persona ? readBudget(totalCents, persona.weeklyBudgetCents) : null

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase">
          Basket
        </span>
        <span data-numeric className="text-[17px] leading-6 font-semibold">
          {formatCents(totalCents)}
        </span>
      </div>

      {budget && (
        <>
          <div className="bg-surface-2 h-2 w-full overflow-hidden rounded-full">
            <div
              className={cn("h-full rounded-full transition-[width]", BUDGET_FILL[budget.status])}
              style={{ width: `${budget.ratio * 100}%` }}
              role="img"
              aria-label={`${Math.round(budget.share * 100)}% of a ${formatCents(budget.budgetCents)} weekly budget`}
            />
          </div>
          <div className="flex items-baseline justify-between gap-2 text-[12px]">
            <span
              className={cn(
                budget.status === "over" && "text-destructive",
                budget.status === "near" && "text-caution",
                budget.status === "under" && "text-muted-foreground",
              )}
            >
              {budget.status === "over" ? (
                <>
                  <span data-numeric>{formatCents(-budget.remainingCents)}</span> over budget
                </>
              ) : (
                <>
                  <span data-numeric>{formatCents(budget.remainingCents)}</span> left this week
                </>
              )}
            </span>
            <span data-numeric className="text-muted-foreground">
              {formatCentsShort(Math.round(totalCents / persona!.household))}/person
            </span>
          </div>
        </>
      )}

      {unpricedItems > 0 && (
        <p className="text-muted-foreground text-[11px]">
          <span data-numeric>{unpricedItems}</span>{" "}
          {plural(unpricedItems, "item has", "items have")} no price — not counted above.
        </p>
      )}
    </div>
  )
}

/** Says out loud how old the prices are, so nobody mistakes them for live data. */
export function PriceProvenance() {
  const months = monthsSinceBaseline()
  return (
    <p className="text-muted-foreground text-[11px] leading-4">
      {PRICE_BASELINE.region} prices, {PRICE_BASELINE.month}
      {months > 0 && (
        <>
          {" "}
          — aged forward <span data-numeric>{months}</span> {plural(months, "month")} at{" "}
          <span data-numeric>{(ANNUAL_FOOD_INFLATION * 100).toFixed(1)}%</span>/yr
        </>
      )}
      . Indicative only.
    </p>
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

export interface ListPanelBodyProps {
  tallies: CategoryTally[]
  total: number
  tier: StoreTierId
  onTierChange: (next: StoreTierId) => void
  measure: Measure
  onMeasureChange: (next: Measure) => void
  persona?: Persona
  onIncrement: (catId: string, itemId: string) => void
  onDecrement: (catId: string, itemId: string) => void
  onRemove: (key: string) => void
}

export function ListPanelBody({
  tallies,
  total,
  tier,
  onTierChange,
  measure,
  onMeasureChange,
  persona,
  onIncrement,
  onDecrement,
  onRemove,
}: ListPanelBodyProps) {
  const cost = basketCost(tallies, { tier })

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

  const costById = new Map(cost.byCategory.map((cat) => [cat.id, cat.cents]))
  const segments: Segment[] =
    measure === "cost"
      ? cost.byCategory.map((cat) => ({ ...cat, value: cat.cents }))
      : countSegments(tallies)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase">
            {measure === "cost" ? "Share of spend" : "Share of items"}
          </span>
          <MeasureToggle measure={measure} onChange={onMeasureChange} />
        </div>

        <DistributionBar
          segments={segments}
          format={measure === "cost" ? formatCents : String}
          label={measure === "cost" ? "Spend by category" : "Items by category"}
        />

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
                {measure === "cost" ? formatCents(costById.get(cat.id) ?? 0) : cat.count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <BasketMeter
          totalCents={cost.totalCents}
          unpricedItems={cost.unpricedItems}
          persona={persona}
        />
        <StoreTierControl tier={tier} onChange={onTierChange} />
        <PriceProvenance />
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
            <span data-numeric className="text-muted-foreground ml-auto font-normal">
              {cat.count} · {formatCents(costById.get(cat.id) ?? 0)}
            </span>
          </p>
          <ul className="space-y-0.5">
            {cat.items.map((item) => (
              <li
                key={item.key}
                className="hover:bg-surface-2 flex items-center gap-2 rounded-sm py-0.5 pr-0.5 pl-1.5 transition-colors"
              >
                <span aria-hidden="true">{item.emoji}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px]">{item.name}</span>
                  {item.cents != null && (
                    <span data-numeric className="text-muted-foreground text-[11px] leading-4">
                      {item.unit ? `${item.unit} · ` : ""}
                      {formatCents(adjustCents(item.cents, { tier }))}
                      {item.qty > 1 && ` × ${item.qty}`}
                    </span>
                  )}
                </span>

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

/** Marker for goods repriced by a supply shock rather than ones that are simply dear. */
export function SpikeMark({ className }: { className?: string }) {
  return (
    <span title={SPIKE_LABEL} aria-label={SPIKE_LABEL} className={cn("inline-flex", className)}>
      <TrendingUp className="size-3" strokeWidth={2.5} aria-hidden="true" />
    </span>
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
  const { total, tallies, tier } = props
  const cost = basketCost(tallies, { tier })
  return (
    <aside
      aria-label="Your list"
      className="bg-surface shadow-e1 flex max-h-[calc(100vh-var(--stack-top)-2rem)] flex-col rounded-lg border"
    >
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Your list</h2>
        <span data-numeric className="text-muted-foreground text-[13px]">
          {total} {plural(total, "item")}
          {cost.totalCents > 0 && ` · ${formatCents(cost.totalCents)}`}
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
