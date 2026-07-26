import { z } from "zod"

// ─── Domain ───────────────────────────────────────────────────────────────────

export interface Item {
  id: string
  name: string
  emoji: string
}

export interface Category {
  id: string
  name: string
  color: string
  items: Item[]
}

export interface Preset {
  id: string
  name: string
  categories: Category[]
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
}

export interface ShareData {
  /** preset name */ n: string
  /** items */ i: SharedItem[]
}

// ─── Validation ───────────────────────────────────────────────────────────────

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
})

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  items: z.array(ItemSchema),
})

export const PresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  categories: z.array(CategorySchema),
})

export const PresetsSchema = z.array(PresetSchema)

export const SharedItemSchema = z.object({
  c: z.string(),
  e: z.string(),
  l: z.string(),
  q: z.number(),
  k: z.string().optional(),
})

export const ShareDataSchema = z.object({
  n: z.string(),
  i: z.array(SharedItemSchema),
})

// ─── Keys ─────────────────────────────────────────────────────────────────────

/** Composite key prevents collisions when two categories reuse an item id string. */
export const k = (catId: string, itemId: string) => `${catId}:${itemId}`
