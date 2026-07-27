/**
 * The money model.
 *
 * Counting taps tells you a basket has 18 things in it. It does not tell you that four
 * of them are 60 % of the bill. This module turns the item data into euros so the app
 * can show the second thing, and it does so under a hard constraint: there is no
 * backend, so every price is a static snapshot that starts going stale the day it ships.
 *
 * The design follows from that. Rather than pretend the numbers are live, the snapshot
 * is dated, the two factors that move a real bill the most are exposed as controls, and
 * the app says out loud how old its prices are.
 */

import type { CategoryTally } from "@/hooks/use-selection"
import type { Item } from "@/lib/types"

// ─── The snapshot ─────────────────────────────────────────────────────────────

/**
 * Prices in `lib/presets.ts` are a hand-built, internally consistent picture of a
 * mid-market eurozone supermarket in this month — the kind of shelf you find at
 * Carrefour, Edeka, Albert Heijn or Mercadona.
 *
 * They are illustrative, not sourced from a price index. They are good enough to make
 * the *relationships* true — that olive oil dwarfs pasta, that nappies dwarf both — and
 * that is what the visualisation is for. They are not good enough to budget your actual
 * week against, and the UI says so.
 */
export const PRICE_BASELINE = {
  /** Month the prices describe. Everything ages from here. */
  month: "2026-07",
  /** Parsed once; `Date.UTC` avoids the local-timezone off-by-one on the 1st. */
  epoch: Date.UTC(2026, 6, 1),
  currency: "EUR",
  region: "Mid-market eurozone supermarket",
} as const

/**
 * Annualised food-price growth used to age the snapshot forward.
 *
 * A single blended rate, not a per-item forecast — the honest claim is "these prices are
 * N months old and food does not stand still", not "we know what butter costs today".
 */
export const ANNUAL_FOOD_INFLATION = 0.031

/**
 * Where you shop is the largest single lever on a grocery bill — larger than almost any
 * substitution within a basket, which is why it is a control and not a constant.
 *
 * The spread is the well-observed shape of European grocery retail: hard discounters
 * sit roughly a fifth below the mainstream on a like-for-like basket, and organic or
 * city-centre formats sit roughly a third above. Round indicative figures, not an index.
 */
export interface StoreTier {
  id: StoreTierId
  name: string
  /** Multiplier applied to every baseline price. */
  factor: number
  /** Shown under the control so the abstraction lands on something concrete. */
  example: string
}

export type StoreTierId = "discount" | "standard" | "premium"

export const STORE_TIERS: StoreTier[] = [
  { id: "discount", name: "Discounter", factor: 0.78, example: "hard-discount own brand" },
  { id: "standard", name: "Supermarket", factor: 1, example: "mainstream own brand" },
  { id: "premium", name: "Premium", factor: 1.34, example: "organic / city centre" },
]

export const DEFAULT_TIER: StoreTierId = "standard"

export const tierById = (id: StoreTierId): StoreTier =>
  STORE_TIERS.find((tier) => tier.id === id) ?? STORE_TIERS[1]

/**
 * Why some items carry `trend: "spike"`.
 *
 * These are goods where a supply shock — drought, disease, a bad harvest — has pushed
 * the shelf price well clear of its own recent norm, so the marker means "this one is
 * unusually expensive right now", not "this one is expensive". It is the difference
 * between a structurally pricey item (fillet steak) and a repriced one (olive oil).
 */
export const PRICE_NOTES: Record<string, string> = {
  "olive-oil": "Mediterranean drought cut the harvest",
  butter: "dairy fat costs pushed through to the shelf",
  coffee: "poor arabica and robusta crops",
  chocolate: "cocoa supply shortfall in West Africa",
  eggs: "avian influenza culls",
  "orange-juice": "citrus greening and storm losses in Brazil",
}

export const SPIKE_LABEL = "Priced well above its own recent norm"

// ─── Ageing ───────────────────────────────────────────────────────────────────

/** Whole months from the snapshot to `now`. Negative clamps to 0 — never age backwards. */
export function monthsSinceBaseline(now: number = Date.now()): number {
  const then = new Date(PRICE_BASELINE.epoch)
  const today = new Date(now)
  const months =
    (today.getUTCFullYear() - then.getUTCFullYear()) * 12 +
    (today.getUTCMonth() - then.getUTCMonth())
  return Math.max(0, months)
}

/** Compounds `ANNUAL_FOOD_INFLATION` over `months`. 1 when the snapshot is current. */
export function inflationFactor(months: number): number {
  return (1 + ANNUAL_FOOD_INFLATION) ** (months / 12)
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export interface PriceContext {
  tier: StoreTierId
  /** Defaults to now; injectable so the tests are not a function of the wall clock. */
  now?: number
}

/** Baseline cents → what this shopper pays today, in cents. */
export function adjustCents(cents: number, ctx: PriceContext): number {
  const factor = tierById(ctx.tier).factor * inflationFactor(monthsSinceBaseline(ctx.now))
  return Math.round(cents * factor)
}

export const itemCents = (item: Pick<Item, "cents">, ctx: PriceContext): number | null =>
  item.cents == null ? null : adjustCents(item.cents, ctx)

// ─── Aggregation ──────────────────────────────────────────────────────────────

export interface CategoryCost {
  id: string
  name: string
  color: string
  /** Adjusted cents for this category's selected quantities. */
  cents: number
}

export interface BasketCost {
  totalCents: number
  byCategory: CategoryCost[]
  /**
   * Selected items with no price — user-created ones, or ones from a link sent by an
   * older build. Counted rather than silently treated as free, because a total that
   * quietly omits things is worse than no total.
   */
  unpricedItems: number
}

/**
 * Costs the current selection.
 *
 * Takes the same `CategoryTally[]` the distribution bar renders from, so the count view
 * and the cost view are guaranteed to be describing the same basket.
 */
export function basketCost(tallies: CategoryTally[], ctx: PriceContext): BasketCost {
  let totalCents = 0
  let unpricedItems = 0
  const byCategory: CategoryCost[] = []

  for (const cat of tallies) {
    let catCents = 0
    for (const item of cat.items) {
      if (item.cents == null) {
        unpricedItems += 1
        continue
      }
      catCents += adjustCents(item.cents, ctx) * item.qty
    }
    totalCents += catCents
    if (catCents > 0) {
      byCategory.push({ id: cat.id, name: cat.name, color: cat.color, cents: catCents })
    }
  }

  return { totalCents, byCategory, unpricedItems }
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export type BudgetStatus = "under" | "near" | "over"

export interface BudgetReading {
  /** 0–1 for the gauge; saturates at 1 so an over-budget bar cannot overflow. */
  ratio: number
  /** Uncapped share of budget, for the percentage readout. */
  share: number
  status: BudgetStatus
  budgetCents: number
  /** Signed: positive means headroom left. */
  remainingCents: number
}

/** Within 10 % of the budget is "near" — close enough that the next few taps decide it. */
export function readBudget(totalCents: number, budgetCents: number): BudgetReading | null {
  if (budgetCents <= 0) return null
  const share = totalCents / budgetCents
  return {
    ratio: Math.min(1, share),
    share,
    status: share > 1 ? "over" : share >= 0.9 ? "near" : "under",
    budgetCents,
    remainingCents: budgetCents - totalCents,
  }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
})

const EUR_WHOLE = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

export const formatCents = (cents: number): string => EUR.format(cents / 100)

/** Cents lose a bar chart nothing and cost it a lot of width. */
export const formatCentsShort = (cents: number): string => EUR_WHOLE.format(cents / 100)
