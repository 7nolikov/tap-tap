import { z } from "zod"

// ─── Domain ───────────────────────────────────────────────────────────────────

export interface Item {
  id: string
  name: string
  emoji: string
  /**
   * The pack you actually put in the trolley — "1 L", "500 g", "10-pack".
   *
   * Without it a quantity is uninterpretable: "Milk 2" could be two cartons or two
   * litres, and it certainly cannot be costed. Optional because user-created items
   * have no unit and must keep working.
   */
  unit?: string
  /**
   * Shelf price for exactly one `unit`, in euro **cents**, at `PRICE_BASELINE`.
   *
   * Integer cents rather than a float: money that gets summed, scaled by a store
   * multiplier and then compared against a budget should not accumulate binary
   * rounding error on the way.
   */
  cents?: number
  /**
   * Set on goods whose price has moved far enough above their own recent norm that a
   * shopper notices it at the shelf. Surfaced as a marker so the basket total is not
   * the only place economics shows up. See `PRICE_NOTES` in `lib/economics.ts`.
   */
  trend?: "spike"
}

export interface Category {
  id: string
  name: string
  color: string
  items: Item[]
}

/**
 * Who a built-in preset is for.
 *
 * The presets are deliberately archetypes at the edges of the spending distribution,
 * not average shoppers — the point is that the gap between them is legible. Absent on
 * user-created and received presets, which belong to a real person rather than a type.
 */
export interface Persona {
  /** One line of "this is me", shown under the preset rail. */
  who: string
  /** Mouths this basket feeds. Drives the per-person figures. */
  household: number
  /** What this household spends on a normal week, in euro cents at `PRICE_BASELINE`. */
  weeklyBudgetCents: number
}

export interface Preset {
  id: string
  name: string
  categories: Category[]
  persona?: Persona
}

/** Quantity per item, keyed by `categoryId:itemId`. */
export type Selection = Record<string, number>

// ─── Wire format ──────────────────────────────────────────────────────────────
// Single-letter keys keep the encoded URL short — the list travels in the link.

export interface SharedItem {
  /** category name */ c: string
  /** emoji */ e: string
  /** label */ l: string
  /** quantity */ q: number
  /** category colour (hex) */ k?: string
  /** unit price in euro cents at baseline, pre store-tier */ p?: number
  /** pack size, e.g. "1 L" */ u?: string
}

export interface ShareData {
  /** preset name */ n: string
  /** items */ i: SharedItem[]
}

/**
 * v3 wire format — the same list, normalised.
 *
 * v2 repeats the category name and its hex colour on every single item, which on a
 * 20-item list is the same two strings written eight times. Declaring categories once
 * and referencing them by index, and writing items as positional tuples rather than
 * keyed objects, cuts an encoded link by about 30 %. That is what buys room for the
 * price and unit data: a v3 link *carrying* prices is shorter than a v2 link without
 * them. Decoding v2 and v1 is kept forever; only what we emit changes.
 *
 * Every slot is always written — `0` for no price, `""` for no unit — so the tuple has
 * a fixed shape. The filler repeats and therefore compresses to almost nothing.
 */
export interface ShareDataV3 {
  /** preset name */ n: string
  /** categories, as [name, hex colour] */ c: Array<[string, string]>
  /** items, as [categoryIndex, emoji, label, qty, cents, unit] */
  i: Array<[number, string, string, number, number, string]>
}

// ─── Validation ───────────────────────────────────────────────────────────────

// Every field added after v1 is optional. Presets already sitting in someone's
// localStorage, and links already sent, predate all of them.

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  unit: z.string().optional(),
  cents: z.number().int().nonnegative().optional(),
  trend: z.literal("spike").optional(),
})

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  items: z.array(ItemSchema),
})

export const PersonaSchema = z.object({
  who: z.string(),
  household: z.number().int().positive(),
  weeklyBudgetCents: z.number().int().positive(),
})

export const PresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  categories: z.array(CategorySchema),
  persona: PersonaSchema.optional(),
})

export const PresetsSchema = z.array(PresetSchema)

export const SharedItemSchema = z.object({
  c: z.string(),
  e: z.string(),
  l: z.string(),
  q: z.number(),
  k: z.string().optional(),
  p: z.number().int().nonnegative().optional(),
  u: z.string().optional(),
})

export const ShareDataSchema = z.object({
  n: z.string(),
  i: z.array(SharedItemSchema),
})

export const ShareDataV3Schema = z.object({
  n: z.string(),
  c: z.array(z.tuple([z.string(), z.string()])),
  i: z.array(z.tuple([z.number(), z.string(), z.string(), z.number(), z.number(), z.string()])),
})

// ─── Keys ─────────────────────────────────────────────────────────────────────

/** Composite key prevents collisions when two categories reuse an item id string. */
export const k = (catId: string, itemId: string) => `${catId}:${itemId}`
