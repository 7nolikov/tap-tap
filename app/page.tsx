"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, Settings, Download, Upload, ChefHat, Share2, RotateCcw, Sun, Moon, X, Copy, Trash2 } from "lucide-react"
import LZString from "lz-string"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { z } from "zod"
import { useTheme } from "next-themes"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Item {
  id: string
  name: string
  emoji: string
}

interface Category {
  id: string
  name: string
  color: string
  items: Item[]
}

interface Preset {
  id: string
  name: string
  categories: Category[]
}

// ─── Validation ───────────────────────────────────────────────────────────────

const ItemSchema = z.object({ id: z.string(), name: z.string(), emoji: z.string() })
const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  items: z.array(ItemSchema),
})
const PresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  categories: z.array(CategorySchema),
})
const PresetsSchema = z.array(PresetSchema)

const SharedItemSchema = z.object({
  c: z.string(), // category name
  e: z.string(), // emoji
  l: z.string(), // label
  q: z.number(), // quantity
  k: z.string().optional(), // category color (hex)
})
const ShareDataSchema = z.object({
  n: z.string(), // preset name
  i: z.array(SharedItemSchema),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Composite key prevents collisions when multiple categories share item id strings */
const k = (catId: string, itemId: string) => `${catId}:${itemId}`

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Share utilities ──────────────────────────────────────────────────────────

interface SharedItem {
  c: string // category name
  e: string // emoji
  l: string // label
  q: number // quantity
  k?: string // category color (hex)
}

interface ShareData {
  n: string // preset name
  i: SharedItem[]
}

type DecodeResult = { ok: true; data: ShareData } | { ok: false; broken: boolean }

function encodeList(preset: Preset, sel: Record<string, number>): string {
  const items: SharedItem[] = preset.categories.flatMap((cat) =>
    cat.items
      .filter((item) => (sel[k(cat.id, item.id)] ?? 0) > 0)
      .map((item) => ({
        c: cat.name,
        e: item.emoji,
        l: item.name,
        q: sel[k(cat.id, item.id)],
        k: cat.color,
      })),
  )
  const json = JSON.stringify({ n: preset.name, i: items })
  return "v2:" + LZString.compressToEncodedURIComponent(json)
}

/** Decode a shared list from URL search params (?list=...) with fallback to legacy hash fragment (#list=...) */
function decodeList(search: string, hash: string): DecodeResult {
  const raw = new URLSearchParams(search).get("list") ?? (hash.startsWith("#list=") ? hash.slice(6) : null)
  if (!raw) return { ok: false, broken: false }
  try {
    let json: string | null
    if (raw.startsWith("v2:")) {
      json = LZString.decompressFromEncodedURIComponent(raw.slice(3))
    } else {
      json = decodeURIComponent(atob(raw))
    }
    if (!json) return { ok: false, broken: true }
    const parsed = ShareDataSchema.safeParse(JSON.parse(json))
    if (!parsed.success) return { ok: false, broken: true }
    return { ok: true, data: parsed.data }
  } catch {
    return { ok: false, broken: true }
  }
}

const APP_URL = "https://7nolikov.github.io/tap-tap/"
const ATTRIBUTION = `\n\n— Built with TapTap · ${APP_URL}\nNo sign-up. No server. Your list travels as a link.`

function buildShareText(preset: Preset, sel: Record<string, number>, url: string): string {
  let text = `🛒 ${preset.name}:\n\n`
  preset.categories.forEach((cat) => {
    const items = cat.items.filter((item) => (sel[k(cat.id, item.id)] ?? 0) > 0)
    if (items.length > 0) {
      text += `${cat.name}:\n`
      items.forEach((item) => {
        text += `  ${item.emoji} ${item.name} ×${sel[k(cat.id, item.id)]}\n`
      })
      text += "\n"
    }
  })
  text += `📱 Open list: ${url}`
  text += ATTRIBUTION
  return text
}

const PRESET_COLORS = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#d97706"]

/** Reconstruct a saveable Preset from a received shared list */
function sharedToPreset(data: ShareData): Preset {
  const groups: Record<string, { items: SharedItem[]; color?: string }> = {}
  data.i.forEach((item) => {
    if (!groups[item.c]) groups[item.c] = { items: [], color: item.k }
    groups[item.c].items.push(item)
  })
  const ts = Date.now()
  return {
    id: `preset-${ts}`,
    name: data.n,
    categories: Object.entries(groups).map(([name, { items, color }], idx) => ({
      id: `cat-${ts}-${idx}`,
      name,
      color: color ?? PRESET_COLORS[idx % PRESET_COLORS.length],
      items: items.map((item, iIdx) => ({
        id: `item-${ts}-${idx}-${iIdx}`,
        name: item.l,
        emoji: item.e,
      })),
    })),
  }
}

// ─── Default presets ──────────────────────────────────────────────────────────

const defaultPresets: Preset[] = [
  {
    id: "grocery-shopping",
    name: "Grocery Shopping",
    categories: [
      {
        id: "dairy",
        name: "Dairy & Eggs",
        color: "#3b82f6",
        items: [
          { id: "milk", name: "Milk", emoji: "🥛" },
          { id: "cheese", name: "Cheddar Cheese", emoji: "🧀" },
          { id: "eggs", name: "Eggs", emoji: "🥚" },
          { id: "butter", name: "Butter", emoji: "🧈" },
          { id: "creme-fraiche", name: "Crème Fraîche", emoji: "🥛" },
          { id: "quark", name: "Quark", emoji: "🫙" },
          { id: "yogurt", name: "Natural Yogurt", emoji: "🍶" },
          { id: "double-cream", name: "Double Cream", emoji: "🥛" },
        ],
      },
      {
        id: "produce",
        name: "Fruits & Vegetables",
        color: "#10b981",
        items: [
          { id: "apples", name: "Apples", emoji: "🍎" },
          { id: "carrots", name: "Carrots", emoji: "🥕" },
          { id: "courgette", name: "Courgette", emoji: "🥒" },
          { id: "potatoes", name: "Potatoes", emoji: "🥔" },
          { id: "tomatoes", name: "Tomatoes", emoji: "🍅" },
          { id: "leeks", name: "Leeks", emoji: "🌿" },
          { id: "onions", name: "Onions", emoji: "🧅" },
          { id: "mushrooms", name: "Mushrooms", emoji: "🍄" },
          { id: "broccoli", name: "Broccoli", emoji: "🥦" },
          { id: "garlic", name: "Garlic", emoji: "🧄" },
          { id: "oranges", name: "Oranges", emoji: "🍊" },
          { id: "lemons", name: "Lemons", emoji: "🍋" },
          { id: "bell-peppers", name: "Bell Peppers", emoji: "🫑" },
          { id: "spinach", name: "Spinach", emoji: "🥬" },
          { id: "avocado", name: "Avocado", emoji: "🥑" },
        ],
      },
      {
        id: "meat",
        name: "Meat & Seafood",
        color: "#ef4444",
        items: [
          { id: "chicken", name: "Chicken Thighs", emoji: "🍗" },
          { id: "pork-sausages", name: "Pork Sausages", emoji: "🌭" },
          { id: "bacon", name: "Bacon Rashers", emoji: "🥓" },
          { id: "minced-beef", name: "Minced Beef", emoji: "🥩" },
          { id: "cod", name: "Cod Fillet", emoji: "🐟" },
          { id: "smoked-salmon", name: "Smoked Salmon", emoji: "🐠" },
        ],
      },
      {
        id: "bakery",
        name: "Bakery & Bread",
        color: "#f59e0b",
        items: [
          { id: "baguette", name: "Baguette", emoji: "🥖" },
          { id: "sourdough", name: "Sourdough Loaf", emoji: "🍞" },
          { id: "croissants", name: "Croissants", emoji: "🥐" },
          { id: "wholemeal-bread", name: "Wholemeal Bread", emoji: "🍞" },
        ],
      },
      {
        id: "cupboard",
        name: "Cupboard Essentials",
        color: "#8b5cf6",
        items: [
          { id: "passata", name: "Passata", emoji: "🫙" },
          { id: "tinned-tomatoes", name: "Tinned Tomatoes", emoji: "🥫" },
          { id: "olive-oil", name: "Extra Virgin Olive Oil", emoji: "🫒" },
          { id: "pasta", name: "Pasta", emoji: "🍝" },
          { id: "rice", name: "Rice", emoji: "🍚" },
          { id: "dijon-mustard", name: "Dijon Mustard", emoji: "🫙" },
          { id: "balsamic", name: "Balsamic Vinegar", emoji: "🍶" },
          { id: "sugar", name: "Sugar", emoji: "🫙" },
          { id: "plain-flour", name: "Plain Flour", emoji: "🌾" },
        ],
      },
      {
        id: "drinks",
        name: "Drinks",
        color: "#06b6d4",
        items: [
          { id: "oj", name: "Orange Juice", emoji: "🍊" },
          { id: "sparkling-water", name: "Sparkling Water", emoji: "💧" },
          { id: "tea-bags", name: "Tea Bags", emoji: "🫖" },
          { id: "coffee", name: "Ground Coffee", emoji: "☕" },
        ],
      },
    ],
  },
  {
    id: "bbq-party",
    name: "🔥 BBQ Party",
    categories: [
      {
        id: "bbq-meat",
        name: "Meats & Grills",
        color: "#ef4444",
        items: [
          { id: "merguez", name: "Merguez Sausages", emoji: "🌭" },
          { id: "lamb-koftas", name: "Lamb Koftas", emoji: "🥙" },
          { id: "chicken-thighs", name: "Chicken Thighs", emoji: "🍗" },
          { id: "halloumi", name: "Halloumi", emoji: "🧀" },
          { id: "pork-ribs", name: "Pork Ribs", emoji: "🥩" },
          { id: "burger-patties", name: "Burger Patties", emoji: "🍔" },
        ],
      },
      {
        id: "bbq-sides",
        name: "Sides & Salads",
        color: "#10b981",
        items: [
          { id: "pitta", name: "Pitta Bread", emoji: "🫓" },
          { id: "couscous", name: "Couscous", emoji: "🍚" },
          { id: "roasted-peppers", name: "Roasted Peppers", emoji: "🫑" },
          { id: "corn", name: "Corn on the Cob", emoji: "🌽" },
          { id: "coleslaw", name: "Coleslaw", emoji: "🥗" },
          { id: "potato-salad", name: "Potato Salad", emoji: "🥔" },
        ],
      },
      {
        id: "bbq-sauces",
        name: "Dips & Sauces",
        color: "#f59e0b",
        items: [
          { id: "harissa", name: "Harissa Paste", emoji: "🌶️" },
          { id: "tzatziki", name: "Tzatziki", emoji: "🥒" },
          { id: "hummus", name: "Hummus", emoji: "🫘" },
          { id: "chimichurri", name: "Chimichurri", emoji: "🌿" },
          { id: "bbq-sauce", name: "BBQ Sauce", emoji: "🫙" },
        ],
      },
      {
        id: "bbq-drinks",
        name: "Drinks",
        color: "#8b5cf6",
        items: [
          { id: "rose-wine", name: "Rosé Wine", emoji: "🍷" },
          { id: "cider", name: "Cider", emoji: "🍺" },
          { id: "lager", name: "Lager", emoji: "🍻" },
          { id: "sparkling-water", name: "Sparkling Water", emoji: "💧" },
        ],
      },
    ],
  },
  {
    id: "camping-trip",
    name: "⛺ Camping Trip",
    categories: [
      {
        id: "camp-food",
        name: "Camp Food",
        color: "#f59e0b",
        items: [
          { id: "porridge-oats", name: "Porridge Oats", emoji: "🥣" },
          { id: "instant-noodles", name: "Instant Noodles", emoji: "🍜" },
          { id: "tinned-beans", name: "Tinned Beans", emoji: "🥫" },
          { id: "crackers", name: "Crackers", emoji: "🍘" },
          { id: "trail-mix", name: "Trail Mix", emoji: "🥜" },
          { id: "dried-fruit", name: "Dried Fruit", emoji: "🍇" },
          { id: "peanut-butter", name: "Peanut Butter", emoji: "🥜" },
          { id: "tinned-fish", name: "Tinned Fish", emoji: "🐟" },
        ],
      },
      {
        id: "camp-drinks",
        name: "Drinks",
        color: "#06b6d4",
        items: [
          { id: "instant-coffee", name: "Instant Coffee", emoji: "☕" },
          { id: "herbal-tea", name: "Herbal Tea", emoji: "🫖" },
          { id: "squash", name: "Squash Concentrate", emoji: "🍋" },
          { id: "water", name: "Water Bottles", emoji: "💧" },
        ],
      },
      {
        id: "camp-supplies",
        name: "Camp Supplies",
        color: "#10b981",
        items: [
          { id: "firelighters", name: "Firelighters", emoji: "🔥" },
          { id: "foil", name: "Cooking Foil", emoji: "🫙" },
          { id: "matches", name: "Matches", emoji: "🔥" },
          { id: "zip-bags", name: "Zip-Lock Bags", emoji: "🛍️" },
          { id: "gas-canisters", name: "Gas Canisters", emoji: "⛽" },
          { id: "bin-bags", name: "Bin Bags", emoji: "🗑️" },
        ],
      },
    ],
  },
  {
    id: "weekly-meal-prep",
    name: "🥗 Weekly Meal Prep",
    categories: [
      {
        id: "meal-prep-proteins",
        name: "Proteins",
        color: "#ef4444",
        items: [
          { id: "chicken-breast", name: "Chicken Breast", emoji: "🍗" },
          { id: "eggs", name: "Eggs", emoji: "🥚" },
          { id: "tuna", name: "Tinned Tuna", emoji: "🐟" },
          { id: "tofu", name: "Firm Tofu", emoji: "🫘" },
          { id: "quark", name: "Quark", emoji: "🫙" },
          { id: "skyr", name: "Skyr", emoji: "🍶" },
        ],
      },
      {
        id: "meal-prep-carbs",
        name: "Grains & Carbs",
        color: "#f59e0b",
        items: [
          { id: "brown-rice", name: "Brown Rice", emoji: "🍚" },
          { id: "quinoa", name: "Quinoa", emoji: "🌾" },
          { id: "bulgur", name: "Bulgur Wheat", emoji: "🌾" },
          { id: "wholemeal-pasta", name: "Wholemeal Pasta", emoji: "🍝" },
          { id: "oats", name: "Rolled Oats", emoji: "🥣" },
        ],
      },
      {
        id: "meal-prep-veggies",
        name: "Vegetables",
        color: "#10b981",
        items: [
          { id: "broccoli", name: "Broccoli", emoji: "🥦" },
          { id: "sweet-potatoes", name: "Sweet Potatoes", emoji: "🍠" },
          { id: "courgette", name: "Courgette", emoji: "🥒" },
          { id: "spinach", name: "Baby Spinach", emoji: "🥬" },
          { id: "cherry-tomatoes", name: "Cherry Tomatoes", emoji: "🍅" },
          { id: "celeriac", name: "Celeriac", emoji: "🥔" },
        ],
      },
      {
        id: "meal-prep-extras",
        name: "Healthy Extras",
        color: "#8b5cf6",
        items: [
          { id: "olive-oil", name: "Olive Oil", emoji: "🫒" },
          { id: "mixed-herbs", name: "Mixed Herbs", emoji: "🌿" },
          { id: "lemons", name: "Lemons", emoji: "🍋" },
          { id: "avocado", name: "Avocados", emoji: "🥑" },
        ],
      },
    ],
  },
  {
    id: "pizza-night",
    name: "🍕 Pizza Night",
    categories: [
      {
        id: "pizza-dough",
        name: "Dough & Base",
        color: "#f59e0b",
        items: [
          { id: "strong-flour", name: "Strong Bread Flour", emoji: "🌾" },
          { id: "yeast", name: "Dried Yeast", emoji: "🫙" },
          { id: "olive-oil", name: "Olive Oil", emoji: "🫒" },
          { id: "semolina", name: "Semolina", emoji: "🌾" },
          { id: "passata", name: "Passata", emoji: "🫙" },
        ],
      },
      {
        id: "pizza-toppings",
        name: "Toppings",
        color: "#ef4444",
        items: [
          { id: "mozzarella", name: "Mozzarella", emoji: "🧀" },
          { id: "burrata", name: "Burrata", emoji: "🧀" },
          { id: "gorgonzola", name: "Gorgonzola", emoji: "🧀" },
          { id: "italian-ham", name: "Prosciutto", emoji: "🥩" },
          { id: "artichokes", name: "Artichoke Hearts", emoji: "🥗" },
          { id: "capers", name: "Capers", emoji: "🫙" },
          { id: "fresh-basil", name: "Fresh Basil", emoji: "🌿" },
          { id: "nduja", name: "Nduja", emoji: "🌶️" },
        ],
      },
      {
        id: "pizza-drinks",
        name: "Drinks",
        color: "#8b5cf6",
        items: [
          { id: "chianti", name: "Chianti", emoji: "🍷" },
          { id: "italian-lager", name: "Italian Lager", emoji: "🍺" },
          { id: "sparkling-water", name: "Sparkling Water", emoji: "💧" },
        ],
      },
    ],
  },
  {
    id: "office-supplies",
    name: "📎 Office Supplies",
    categories: [
      {
        id: "stationery",
        name: "Stationery",
        color: "#3b82f6",
        items: [
          { id: "a4-paper", name: "A4 Paper", emoji: "📄" },
          { id: "biros", name: "Biros", emoji: "✏️" },
          { id: "sticky-notes", name: "Sticky Notes", emoji: "📝" },
          { id: "sellotape", name: "Sellotape", emoji: "📦" },
          { id: "stapler", name: "Stapler & Staples", emoji: "📎" },
          { id: "folders", name: "Ring Binders", emoji: "📁" },
          { id: "envelopes", name: "Envelopes", emoji: "✉️" },
          { id: "highlighters", name: "Highlighters", emoji: "🖊️" },
        ],
      },
      {
        id: "printer",
        name: "Printer & Tech",
        color: "#8b5cf6",
        items: [
          { id: "ink-cartridges", name: "Ink Cartridges", emoji: "🖨️" },
          { id: "usb-sticks", name: "USB Sticks", emoji: "💾" },
        ],
      },
      {
        id: "office-kitchen",
        name: "Kitchen & Canteen",
        color: "#10b981",
        items: [
          { id: "washing-up-liquid", name: "Washing-Up Liquid", emoji: "🧴" },
          { id: "tea-bags", name: "Tea Bags", emoji: "🫖" },
          { id: "coffee", name: "Instant Coffee", emoji: "☕" },
          { id: "milk", name: "Milk", emoji: "🥛" },
          { id: "biscuits", name: "Biscuits", emoji: "🍪" },
        ],
      },
    ],
  },
  {
    id: "date-night",
    name: "🍷 Date Night Dinner",
    categories: [
      {
        id: "date-starter",
        name: "Starter",
        color: "#ec4899",
        items: [
          { id: "smoked-salmon", name: "Smoked Salmon", emoji: "🐠" },
          { id: "creme-fraiche", name: "Crème Fraîche", emoji: "🥛" },
          { id: "blinis", name: "Blinis", emoji: "🥞" },
          { id: "capers", name: "Capers", emoji: "🫙" },
          { id: "dill", name: "Fresh Dill", emoji: "🌿" },
        ],
      },
      {
        id: "date-main",
        name: "Main Course",
        color: "#ef4444",
        items: [
          { id: "duck-breast", name: "Duck Breast", emoji: "🦆" },
          { id: "sea-bass", name: "Sea Bass Fillet", emoji: "🐟" },
          { id: "asparagus", name: "Asparagus", emoji: "🌿" },
          { id: "new-potatoes", name: "New Potatoes", emoji: "🥔" },
          { id: "shallots", name: "Shallots", emoji: "🧅" },
          { id: "butter", name: "Unsalted Butter", emoji: "🧈" },
        ],
      },
      {
        id: "date-dessert",
        name: "Dessert & Drinks",
        color: "#8b5cf6",
        items: [
          { id: "dark-chocolate", name: "Dark Chocolate 70%", emoji: "🍫" },
          { id: "raspberries", name: "Raspberries", emoji: "🍓" },
          { id: "double-cream", name: "Double Cream", emoji: "🥛" },
          { id: "prosecco", name: "Prosecco", emoji: "🥂" },
          { id: "red-wine", name: "Red Wine", emoji: "🍷" },
          { id: "candles", name: "Dinner Candles", emoji: "🕯️" },
        ],
      },
    ],
  },
  {
    id: "baby-essentials",
    name: "👶 Baby Essentials",
    categories: [
      {
        id: "baby-nappies",
        name: "Nappies & Hygiene",
        color: "#f59e0b",
        items: [
          { id: "nappies", name: "Nappies", emoji: "🍼" },
          { id: "baby-wipes", name: "Baby Wipes", emoji: "🧻" },
          { id: "sudocrem", name: "Sudocrem", emoji: "🫙" },
          { id: "cotton-wool", name: "Cotton Wool Balls", emoji: "☁️" },
          { id: "baby-shampoo", name: "Baby Shampoo", emoji: "🧴" },
          { id: "nappy-bags", name: "Nappy Bags", emoji: "🛍️" },
        ],
      },
      {
        id: "baby-feeding",
        name: "Feeding",
        color: "#10b981",
        items: [
          { id: "formula", name: "Baby Formula", emoji: "🍼" },
          { id: "sterilising-tabs", name: "Sterilising Tablets", emoji: "💊" },
          { id: "food-pouches", name: "Food Pouches", emoji: "🥣" },
          { id: "weaning-spoons", name: "Weaning Spoons", emoji: "🥄" },
          { id: "bibs", name: "Bibs", emoji: "👕" },
        ],
      },
      {
        id: "baby-extras",
        name: "Extras",
        color: "#ec4899",
        items: [
          { id: "muslin-squares", name: "Muslin Squares", emoji: "🧣" },
          { id: "baby-detergent", name: "Baby Laundry Gel", emoji: "🧴" },
          { id: "nappy-rash-cream", name: "Nappy Rash Cream", emoji: "🫙" },
        ],
      },
    ],
  },
  {
    id: "christmas-dinner",
    name: "🎄 Christmas Dinner",
    categories: [
      {
        id: "xmas-main",
        name: "The Main Event",
        color: "#ef4444",
        items: [
          { id: "whole-turkey", name: "Whole Turkey", emoji: "🦃" },
          { id: "chipolatas", name: "Chipolata Sausages", emoji: "🌭" },
          { id: "streaky-bacon", name: "Streaky Bacon", emoji: "🥓" },
          { id: "stuffing-mix", name: "Stuffing Mix", emoji: "🫙" },
          { id: "goose-fat", name: "Goose Fat", emoji: "🫙" },
        ],
      },
      {
        id: "xmas-veg",
        name: "Vegetables",
        color: "#10b981",
        items: [
          { id: "brussels-sprouts", name: "Brussels Sprouts", emoji: "🥦" },
          { id: "parsnips", name: "Parsnips", emoji: "🥕" },
          { id: "carrots", name: "Carrots", emoji: "🥕" },
          { id: "roast-potatoes", name: "Roasting Potatoes", emoji: "🥔" },
          { id: "red-cabbage", name: "Red Cabbage", emoji: "🥬" },
        ],
      },
      {
        id: "xmas-condiments",
        name: "Sauces & Extras",
        color: "#f59e0b",
        items: [
          { id: "cranberry-sauce", name: "Cranberry Sauce", emoji: "🫙" },
          { id: "bread-sauce", name: "Bread Sauce Mix", emoji: "🫙" },
          { id: "gravy-granules", name: "Gravy Granules", emoji: "🫙" },
          { id: "xmas-crackers", name: "Christmas Crackers", emoji: "🎉" },
        ],
      },
      {
        id: "xmas-dessert",
        name: "Pudding & Drinks",
        color: "#8b5cf6",
        items: [
          { id: "xmas-pudding", name: "Christmas Pudding", emoji: "🍮" },
          { id: "brandy-butter", name: "Brandy Butter", emoji: "🧈" },
          { id: "mince-pies", name: "Mince Pies", emoji: "🥧" },
          { id: "port", name: "Port Wine", emoji: "🍷" },
          { id: "mulled-wine", name: "Mulled Wine Spices", emoji: "🍵" },
        ],
      },
    ],
  },
  {
    id: "football-night",
    name: "⚽ Football Match Night",
    categories: [
      {
        id: "football-snacks",
        name: "Snacks",
        color: "#f59e0b",
        items: [
          { id: "crisps", name: "Crisps", emoji: "🥔" },
          { id: "sausage-rolls", name: "Sausage Rolls", emoji: "🥐" },
          { id: "pork-pies", name: "Pork Pies", emoji: "🥧" },
          { id: "tortilla-chips", name: "Tortilla Chips", emoji: "🌮" },
          { id: "salted-peanuts", name: "Salted Peanuts", emoji: "🥜" },
          { id: "dips", name: "Salsa & Guacamole", emoji: "🥑" },
        ],
      },
      {
        id: "football-food",
        name: "Hot Food",
        color: "#ef4444",
        items: [
          { id: "hot-dogs", name: "Hot Dogs", emoji: "🌭" },
          { id: "baguettes", name: "Baguettes", emoji: "🥖" },
          { id: "pizza", name: "Frozen Pizza", emoji: "🍕" },
          { id: "chicken-wings", name: "Chicken Wings", emoji: "🍗" },
        ],
      },
      {
        id: "football-drinks",
        name: "Drinks",
        color: "#3b82f6",
        items: [
          { id: "lager", name: "Lager", emoji: "🍺" },
          { id: "cider", name: "Cider", emoji: "🍺" },
          { id: "non-alc-beer", name: "Alcohol-Free Beer", emoji: "🍺" },
          { id: "cola", name: "Cola", emoji: "🥤" },
          { id: "energy-drink", name: "Energy Drink", emoji: "⚡" },
        ],
      },
    ],
  },
  {
    id: "moving-house",
    name: "📦 Moving House",
    categories: [
      {
        id: "moving-packing",
        name: "Packing Supplies",
        color: "#f59e0b",
        items: [
          { id: "boxes", name: "Cardboard Boxes", emoji: "📦" },
          { id: "packing-tape", name: "Packing Tape", emoji: "🖊️" },
          { id: "bubble-wrap", name: "Bubble Wrap", emoji: "📦" },
          { id: "marker-pens", name: "Marker Pens", emoji: "✏️" },
          { id: "sellotape", name: "Sellotape", emoji: "📎" },
          { id: "labels", name: "Labels / Sticky Notes", emoji: "📝" },
        ],
      },
      {
        id: "moving-cleaning",
        name: "Cleaning Products",
        color: "#10b981",
        items: [
          { id: "bleach", name: "Bleach", emoji: "🧴" },
          { id: "washing-up-liquid", name: "Washing-Up Liquid", emoji: "🧼" },
          { id: "hoover-bags", name: "Hoover Bags", emoji: "🧹" },
          { id: "limescale", name: "Limescale Remover", emoji: "🫧" },
          { id: "bin-bags", name: "Bin Bags", emoji: "🗑️" },
          { id: "cloths", name: "Microfibre Cloths", emoji: "🧽" },
        ],
      },
      {
        id: "moving-essentials",
        name: "First-Night Kit",
        color: "#3b82f6",
        items: [
          { id: "tea-bags", name: "Tea Bags", emoji: "🫖" },
          { id: "biscuits", name: "Biscuits", emoji: "🍪" },
          { id: "toilet-roll", name: "Toilet Roll", emoji: "🧻" },
          { id: "kettle-descaler", name: "Kettle Descaler", emoji: "🫧" },
          { id: "light-bulbs", name: "Light Bulbs", emoji: "💡" },
        ],
      },
    ],
  },
  {
    id: "cocktail-party",
    name: "🍸 Cocktail Party",
    categories: [
      {
        id: "cocktail-spirits",
        name: "Spirits",
        color: "#8b5cf6",
        items: [
          { id: "gin", name: "Gin", emoji: "🍸" },
          { id: "vodka", name: "Vodka", emoji: "🍶" },
          { id: "aperol", name: "Aperol", emoji: "🍊" },
          { id: "campari", name: "Campari", emoji: "🍷" },
          { id: "rum", name: "White Rum", emoji: "🍸" },
          { id: "prosecco", name: "Prosecco", emoji: "🥂" },
        ],
      },
      {
        id: "cocktail-mixers",
        name: "Mixers",
        color: "#06b6d4",
        items: [
          { id: "elderflower-tonic", name: "Elderflower Tonic", emoji: "🌸" },
          { id: "ginger-beer", name: "Ginger Beer", emoji: "🫚" },
          { id: "cranberry-juice", name: "Cranberry Juice", emoji: "🍹" },
          { id: "soda-water", name: "Soda Water", emoji: "💧" },
          { id: "orange-juice", name: "Orange Juice", emoji: "🍊" },
        ],
      },
      {
        id: "cocktail-garnish",
        name: "Garnishes & Supplies",
        color: "#10b981",
        items: [
          { id: "lemons", name: "Lemons", emoji: "🍋" },
          { id: "limes", name: "Limes", emoji: "🍋" },
          { id: "fresh-mint", name: "Fresh Mint", emoji: "🌿" },
          { id: "cucumber", name: "Cucumber", emoji: "🥒" },
          { id: "olives", name: "Olives", emoji: "🫒" },
          { id: "ice", name: "Ice Bag", emoji: "🧊" },
          { id: "cocktail-sticks", name: "Cocktail Sticks", emoji: "🍡" },
          { id: "napkins", name: "Paper Napkins", emoji: "🧻" },
        ],
      },
    ],
  },
  {
    id: "road-trip",
    name: "🚗 Road Trip Snacks",
    categories: [
      {
        id: "road-snacks",
        name: "Snacks",
        color: "#f59e0b",
        items: [
          { id: "biltong", name: "Biltong", emoji: "🥩" },
          { id: "mixed-nuts", name: "Mixed Nuts", emoji: "🥜" },
          { id: "flapjacks", name: "Flapjacks", emoji: "🍫" },
          { id: "rice-cakes", name: "Rice Cakes", emoji: "🍘" },
          { id: "haribo", name: "Haribo Gummies", emoji: "🍬" },
          { id: "crisps", name: "Crisps", emoji: "🥔" },
          { id: "dark-chocolate", name: "Dark Chocolate", emoji: "🍫" },
        ],
      },
      {
        id: "road-drinks",
        name: "Drinks",
        color: "#06b6d4",
        items: [
          { id: "water-bottles", name: "Water Bottles", emoji: "💧" },
          { id: "squash", name: "Squash Concentrate", emoji: "🍋" },
          { id: "travel-mug-coffee", name: "Thermos Coffee", emoji: "☕" },
        ],
      },
      {
        id: "road-fresh",
        name: "Fresh Snacks",
        color: "#10b981",
        items: [
          { id: "apples", name: "Apples", emoji: "🍎" },
          { id: "grapes", name: "Grapes", emoji: "🍇" },
          { id: "carrot-sticks", name: "Carrot Sticks", emoji: "🥕" },
          { id: "hummus-pots", name: "Hummus Pots", emoji: "🫘" },
        ],
      },
      {
        id: "road-extras",
        name: "Essentials",
        color: "#8b5cf6",
        items: [
          { id: "wet-wipes", name: "Wet Wipes", emoji: "🧻" },
          { id: "sick-bags", name: "Sick Bags", emoji: "🛍️" },
          { id: "hand-gel", name: "Hand Sanitiser Gel", emoji: "🧴" },
        ],
      },
    ],
  },
  {
    id: "gym-fitness",
    name: "💪 Gym & Fitness",
    categories: [
      {
        id: "gym-protein",
        name: "Protein Sources",
        color: "#ef4444",
        items: [
          { id: "chicken-breast", name: "Chicken Breast", emoji: "🍗" },
          { id: "eggs", name: "Eggs", emoji: "🥚" },
          { id: "quark", name: "Quark", emoji: "🫙" },
          { id: "skyr", name: "Skyr Yogurt", emoji: "🍶" },
          { id: "tuna", name: "Tinned Tuna", emoji: "🐟" },
          { id: "protein-powder", name: "Protein Powder", emoji: "🥤" },
        ],
      },
      {
        id: "gym-carbs",
        name: "Energy & Carbs",
        color: "#f59e0b",
        items: [
          { id: "sweet-potatoes", name: "Sweet Potatoes", emoji: "🍠" },
          { id: "oats", name: "Rolled Oats", emoji: "🥣" },
          { id: "rice-cakes", name: "Rice Cakes", emoji: "🍘" },
          { id: "wholegrain-bread", name: "Wholegrain Bread", emoji: "🍞" },
          { id: "bananas", name: "Bananas", emoji: "🍌" },
        ],
      },
      {
        id: "gym-supplements",
        name: "Supplements",
        color: "#8b5cf6",
        items: [
          { id: "creatine", name: "Creatine", emoji: "💊" },
          { id: "vitamin-d", name: "Vitamin D3+K2", emoji: "☀️" },
          { id: "magnesium", name: "Magnesium", emoji: "💊" },
          { id: "omega-3", name: "Omega-3 Fish Oil", emoji: "🐟" },
        ],
      },
      {
        id: "gym-hydration",
        name: "Hydration",
        color: "#06b6d4",
        items: [
          { id: "water", name: "Water", emoji: "💧" },
          { id: "electrolytes", name: "Electrolyte Tablets", emoji: "⚡" },
          { id: "coconut-water", name: "Coconut Water", emoji: "🥥" },
        ],
      },
    ],
  },
  {
    id: "dog-essentials",
    name: "🐕 Dog Essentials",
    categories: [
      {
        id: "dog-food",
        name: "Food & Treats",
        color: "#f59e0b",
        items: [
          { id: "dry-kibble", name: "Dry Kibble", emoji: "🍖" },
          { id: "wet-food", name: "Wet Food Pouches", emoji: "🥩" },
          { id: "dental-chews", name: "Dental Chews", emoji: "🦷" },
          { id: "training-treats", name: "Training Treats", emoji: "🦴" },
        ],
      },
      {
        id: "dog-health",
        name: "Health & Hygiene",
        color: "#10b981",
        items: [
          { id: "flea-treatment", name: "Flea Treatment", emoji: "🩺" },
          { id: "worming-tabs", name: "Worming Tablets", emoji: "💊" },
          { id: "paw-balm", name: "Paw Balm", emoji: "🐾" },
          { id: "dog-shampoo", name: "Dog Shampoo", emoji: "🧴" },
          { id: "dog-towel", name: "Waterproof Dog Towel", emoji: "🧣" },
        ],
      },
      {
        id: "dog-accessories",
        name: "Accessories",
        color: "#8b5cf6",
        items: [
          { id: "poo-bags", name: "Poo Bags", emoji: "🛍️" },
          { id: "dog-lead", name: "Dog Lead", emoji: "🦮" },
          { id: "grooming-brush", name: "Grooming Brush", emoji: "🪮" },
        ],
      },
    ],
  },
  {
    id: "holiday-baking",
    name: "🍪 Holiday Cookie Baking",
    categories: [
      {
        id: "baking-basics",
        name: "Baking Basics",
        color: "#f59e0b",
        items: [
          { id: "plain-flour", name: "Plain Flour", emoji: "🌾" },
          { id: "caster-sugar", name: "Caster Sugar", emoji: "🫙" },
          { id: "icing-sugar", name: "Icing Sugar", emoji: "🫙" },
          { id: "butter", name: "Unsalted Butter", emoji: "🧈" },
          { id: "eggs", name: "Eggs", emoji: "🥚" },
          { id: "vanilla-extract", name: "Vanilla Extract", emoji: "🫙" },
          { id: "golden-syrup", name: "Golden Syrup", emoji: "🍯" },
        ],
      },
      {
        id: "baking-spices",
        name: "Spices & Flavourings",
        color: "#ef4444",
        items: [
          { id: "mixed-spice", name: "Mixed Spice", emoji: "🌶️" },
          { id: "cinnamon", name: "Ground Cinnamon", emoji: "🫙" },
          { id: "ground-ginger", name: "Ground Ginger", emoji: "🫚" },
          { id: "orange-zest", name: "Oranges (for zest)", emoji: "🍊" },
        ],
      },
      {
        id: "baking-decoration",
        name: "Decoration",
        color: "#ec4899",
        items: [
          { id: "glace-cherries", name: "Glacé Cherries", emoji: "🍒" },
          { id: "hundreds-thousands", name: "Hundreds & Thousands", emoji: "🌈" },
          { id: "marzipan", name: "Marzipan", emoji: "🍡" },
          { id: "royal-icing", name: "Royal Icing Sugar", emoji: "🫙" },
          { id: "edible-glitter", name: "Edible Glitter", emoji: "✨" },
        ],
      },
      {
        id: "baking-equipment",
        name: "Equipment",
        color: "#10b981",
        items: [
          { id: "baking-paper", name: "Baking Paper", emoji: "📄" },
          { id: "cookie-cutters", name: "Cookie Cutters", emoji: "⭐" },
          { id: "piping-bags", name: "Piping Bags", emoji: "🎂" },
          { id: "cooling-rack", name: "Cooling Rack", emoji: "🍪" },
        ],
      },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function TapTap() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [presets, setPresets] = useState<Preset[]>([])
  const [currentPreset, setCurrentPreset] = useState<Preset | null>(null)
  const [sel, setSel] = useState<Record<string, number>>({})
  const [showStorageNotice, setShowStorageNotice] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newPresetName, setNewPresetName] = useState("")
  const [showNewPreset, setShowNewPreset] = useState(false)
  const [addingToCat, setAddingToCat] = useState<string | null>(null)
  const [newItemEmoji, setNewItemEmoji] = useState("")
  const [newItemName, setNewItemName] = useState("")
  const [sharedList, setSharedList] = useState<ShareData | null>(null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0])

  // Hydration guard for theme toggle
  useEffect(() => setMounted(true), [])

  // Load from localStorage + handle share URL on mount
  useEffect(() => {
    const raw = localStorage.getItem("tap-tap-share-presets")
    let loaded: Preset[] = defaultPresets
    if (raw) {
      try {
        const result = PresetsSchema.safeParse(JSON.parse(raw))
        if (result.success) loaded = result.data
      } catch {
        // corrupted storage — fall back to defaults
      }
    }
    setPresets(loaded)

    const savedId = localStorage.getItem("tap-tap-share-current-preset")
    setCurrentPreset(loaded.find((p) => p.id === savedId) ?? loaded[0] ?? null)

    if (localStorage.getItem("tap-tap-storage-accepted") !== "true" &&
        localStorage.getItem("tap-tap-share-cookie-accepted") !== "true") {
      setShowStorageNotice(true)
    }

    if (!localStorage.getItem("tap-tap-welcome-seen")) {
      setShowWelcome(true)
      localStorage.setItem("tap-tap-welcome-seen", "true")
    }

    // Decode shared list from URL (?list=... or legacy #list=...)
    const result = decodeList(window.location.search, window.location.hash)
    if (result.ok) {
      setSharedList(result.data)
      window.history.replaceState(null, "", window.location.pathname)
    } else if (result.broken) {
      toast.error("This share link appears to be broken.")
      window.history.replaceState(null, "", window.location.pathname)
    }

    // Register service worker for PWA offline support
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/tap-tap/sw.js").catch(() => { /* ignore in dev */ })
    }
  }, [])

  // Persist presets whenever they change
  useEffect(() => {
    if (presets.length > 0) {
      localStorage.setItem("tap-tap-share-presets", JSON.stringify(presets))
    }
  }, [presets])

  // Persist active preset id
  useEffect(() => {
    if (currentPreset) {
      localStorage.setItem("tap-tap-share-current-preset", currentPreset.id)
    }
  }, [currentPreset])

  // ── Item tap handlers ──────────────────────────────────────────────────────

  const tap = (catId: string, itemId: string) =>
    setSel((prev) => ({ ...prev, [k(catId, itemId)]: (prev[k(catId, itemId)] ?? 0) + 1 }))

  const dec = (catId: string, itemId: string) =>
    setSel((prev) => {
      const count = (prev[k(catId, itemId)] ?? 0) - 1
      if (count <= 0) {
        const next = { ...prev }
        delete next[k(catId, itemId)]
        return next
      }
      return { ...prev, [k(catId, itemId)]: count }
    })

  const totalCount = Object.values(sel).reduce((s, v) => s + v, 0)

  // ── Share ──────────────────────────────────────────────────────────────────

  const getShareUrl = () => {
    if (!currentPreset) return ""
    const hash = encodeList(currentPreset, sel)
    return `${window.location.origin}${window.location.pathname}?list=${hash}`
  }

  const handleShare = async () => {
    if (!currentPreset) return
    const url = getShareUrl()
    const text = buildShareText(currentPreset, sel, url)
    try {
      if (navigator.share) {
        await navigator.share({ title: `${currentPreset.name} list`, text, url })
      } else {
        await navigator.clipboard.writeText(text)
        toast.success("List copied to clipboard!")
      }
    } catch {
      await navigator.clipboard.writeText(text)
      toast.success("List copied to clipboard!")
    }
  }

  const handleCopyLink = async () => {
    const url = getShareUrl()
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied!")
    } catch {
      toast.error("Could not copy link.")
    }
  }

  const saveSharedAsPreset = () => {
    if (!sharedList) return
    const newPreset = sharedToPreset(sharedList)
    setPresets((prev) => [...prev, newPreset])
    setCurrentPreset(newPreset)
    setSel({})
    setSharedList(null)
    toast.success(`"${newPreset.name}" saved — tap items to build your list!`)
  }

  // ── Add item to category ───────────────────────────────────────────────────

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !addingToCat || !currentPreset) return
    const newItem: Item = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      emoji: newItemEmoji.trim() || "📦",
    }
    const updated: Preset = {
      ...currentPreset,
      categories: currentPreset.categories.map((cat) =>
        cat.id === addingToCat ? { ...cat, items: [...cat.items, newItem] } : cat,
      ),
    }
    setPresets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setCurrentPreset(updated)
    setNewItemEmoji("")
    setNewItemName("")
    setAddingToCat(null)
  }

  // ── Presets ────────────────────────────────────────────────────────────────

  const createPreset = () => {
    if (!newPresetName.trim()) return
    const newPreset: Preset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      categories: [{ id: `cat-${Date.now()}`, name: "Items", color: "#6366f1", items: [] }],
    }
    setPresets((prev) => [...prev, newPreset])
    setCurrentPreset(newPreset)
    setSel({})
    setNewPresetName("")
    setShowNewPreset(false)
    toast.success(`"${newPreset.name}" created — tap + in any category to add items.`)
  }

  const switchPreset = (id: string) => {
    const preset = presets.find((p) => p.id === id)
    setCurrentPreset(preset ?? null)
    setSel({})
  }

  const restoreDefaults = () => {
    setPresets(defaultPresets)
    setCurrentPreset(defaultPresets[0])
    setSel({})
    toast.success("Presets restored to defaults.")
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim() || !currentPreset) return
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      color: newCategoryColor,
      items: [],
    }
    const updated: Preset = { ...currentPreset, categories: [...currentPreset.categories, newCat] }
    setPresets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setCurrentPreset(updated)
    setNewCategoryName("")
    setNewCategoryColor(PRESET_COLORS[0])
    setShowAddCategory(false)
    toast.success(`"${newCat.name}" added — tap + to add items.`)
  }

  const deletePreset = (id: string) => {
    if (presets.length <= 1) {
      toast.error("You need at least one preset.")
      return
    }
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id)
      if (currentPreset?.id === id) {
        setCurrentPreset(next[0] ?? null)
        setSel({})
      }
      return next
    })
    toast.success("Preset deleted.")
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  const exportPresets = () => {
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "taptap-presets.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const importPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed: unknown = JSON.parse(ev.target?.result as string)
        const result = PresetsSchema.safeParse(parsed)
        if (!result.success) {
          toast.error("Invalid preset file — please check the format.")
          return
        }
        setPresets(result.data)
        setCurrentPreset(result.data[0] ?? null)
        setSel({})
        toast.success("Presets imported!")
      } catch {
        toast.error("Could not read file.")
      }
    }
    reader.readAsText(file)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-foreground">
      {/* Shared-list modal */}
      {sharedList && (
        <Dialog open onOpenChange={() => setSharedList(null)}>
          <DialogContent className="bg-card/95 backdrop-blur-md border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-serif">🛒 {sharedList.n}</DialogTitle>
            </DialogHeader>
            <div className="max-h-64 overflow-y-auto space-y-3 text-sm">
              {(() => {
                const groups: Record<string, { items: SharedItem[]; color?: string }> = {}
                sharedList.i.forEach((item) => {
                  if (!groups[item.c]) groups[item.c] = { items: [], color: item.k }
                  groups[item.c].items.push(item)
                })
                return Object.entries(groups).map(([cat, { items, color }]) => (
                  <div key={cat}>
                    <p
                      className="font-semibold text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5"
                      style={color ? { color } : undefined}
                    >
                      {color && (
                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      )}
                      {cat}
                    </p>
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5 pl-3.5">
                        <span>{item.e}</span>
                        <span>{item.l}</span>
                        <span className="ml-auto text-muted-foreground">×{item.q}</span>
                      </div>
                    ))}
                  </div>
                ))
              })()}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={saveSharedAsPreset} className="w-full bg-primary hover:bg-primary/90">
                Save as my preset
              </Button>
              <Button onClick={() => setSharedList(null)} variant="outline" className="w-full border-border hover:bg-muted/70 bg-transparent">
                Build your own list
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Header */}
      <header className="bg-card/90 backdrop-blur-md border-b border-border/50 p-4 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-serif bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent leading-none">
                TapTap
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5 hidden sm:block">
                Tap items · Share a link · No sign-up
              </p>
            </div>
          </div>

          <div className="flex gap-1 items-center">
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-muted/50"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle dark mode"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            )}

            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-muted/50">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card/95 backdrop-blur-md border-border">
                <DialogHeader>
                  <DialogTitle className="font-serif">Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-5">
                  <div>
                    <h3 className="font-medium mb-3 font-serif text-sm">Manage Presets</h3>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {presets.map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
                          <span className={`text-sm ${p.id === currentPreset?.id ? "font-semibold" : ""}`}>{p.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deletePreset(p.id)}
                            disabled={presets.length <= 1}
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Button
                      onClick={restoreDefaults}
                      variant="outline"
                      size="sm"
                      className="w-full border-border hover:bg-muted/70 bg-transparent text-muted-foreground"
                    >
                      Restore default presets
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2 font-serif text-sm">Backup</h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={exportPresets}
                        variant="outline"
                        size="sm"
                        className="border-border hover:bg-muted/70 bg-transparent"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <label>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-border hover:bg-muted/70 bg-transparent cursor-pointer"
                        >
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Import
                          </span>
                        </Button>
                        <input type="file" accept=".json" onChange={importPresets} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-32">
        {/* Welcome banner — shown once to first-time visitors */}
        {showWelcome && (
          <Alert className="mb-5 bg-primary/5 border-primary/20">
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-sm">
                <strong>Tap items</strong> to add them to your list. Hit <strong>Share</strong> when done — your list travels as a link. No account. Nothing stored on our servers.
              </span>
              <Button
                onClick={() => setShowWelcome(false)}
                size="sm"
                variant="outline"
                className="shrink-0 border-primary/30 hover:bg-primary/10"
              >
                Got it
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Preset selector */}
        <div className="flex items-center gap-2 mb-6">
          <Select value={currentPreset?.id ?? ""} onValueChange={switchPreset}>
            <SelectTrigger className="flex-1 bg-card/80 backdrop-blur-md border-border focus:ring-2 focus:ring-primary/20">
              <SelectValue placeholder="Choose a preset…" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={showNewPreset} onOpenChange={setShowNewPreset}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-lg">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-md border-border">
              <DialogHeader>
                <DialogTitle className="font-serif">New Preset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="e.g. BBQ Party, Camping Trip…"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createPreset()}
                  className="bg-input border-border focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
                <Button onClick={createPreset} className="w-full bg-primary hover:bg-primary/90">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category grid */}
        {currentPreset && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentPreset.categories.map((cat) => (
              <Card
                key={cat.id}
                className="bg-card/80 backdrop-blur-md border-border/50 shadow-lg hover:shadow-xl transition-shadow"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-serif flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {cat.items.map((item) => {
                      const count = sel[k(cat.id, item.id)] ?? 0
                      const isSelected = count > 0
                      return (
                        <div
                          key={item.id}
                          className="relative p-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-105 h-20 flex flex-col justify-between select-none"
                          style={
                            isSelected
                              ? { backgroundColor: cat.color, color: "white" }
                              : {
                                  backgroundColor: hexToRgba(cat.color, 0.08),
                                  border: `1px solid ${hexToRgba(cat.color, 0.2)}`,
                                }
                          }
                          onClick={() => tap(cat.id, item.id)}
                        >
                          <div className="flex items-start gap-1.5 min-h-0">
                            <span className="text-xl flex-shrink-0">{item.emoji}</span>
                            <span className="text-xs font-medium leading-tight line-clamp-2">{item.name}</span>
                          </div>
                          <div className="flex items-center justify-center gap-2 h-7">
                            {isSelected ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    dec(cat.id, item.id)
                                  }}
                                  className="w-6 h-6 bg-white/25 rounded-full flex items-center justify-center text-sm font-bold hover:bg-white/40 transition-colors"
                                >
                                  −
                                </button>
                                <span className="text-sm font-bold min-w-[1rem] text-center">{count}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    tap(cat.id, item.id)
                                  }}
                                  className="w-6 h-6 bg-white/25 rounded-full flex items-center justify-center text-sm font-bold hover:bg-white/40 transition-colors"
                                >
                                  +
                                </button>
                              </>
                            ) : (
                              <div className="h-7" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Inline add-item form */}
                  {addingToCat === cat.id ? (
                    <form onSubmit={handleAddItem} className="flex gap-2 pt-1">
                      <Input
                        placeholder="🍎"
                        value={newItemEmoji}
                        onChange={(e) => setNewItemEmoji(e.target.value)}
                        className="w-14 text-center bg-input text-base"
                        maxLength={2}
                        autoFocus
                      />
                      <Input
                        placeholder="Item name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="flex-1 bg-input"
                      />
                      <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 px-2">
                        ✓
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAddingToCat(null)
                          setNewItemEmoji("")
                          setNewItemName("")
                        }}
                        className="px-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setAddingToCat(cat.id)}
                      className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add item
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Add category button */}
            <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
              <DialogTrigger asChild>
                <button className="border-2 border-dashed border-border/40 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors cursor-pointer">
                  <Plus className="w-5 h-5" />
                  <span className="text-sm">Add category</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-card/95 backdrop-blur-md border-border">
                <DialogHeader>
                  <DialogTitle className="font-serif">New Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="e.g. Spices, Frozen Foods…"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    className="bg-input border-border focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Color</p>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewCategoryColor(color)}
                          className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                          style={{
                            backgroundColor: color,
                            outline: newCategoryColor === color ? `3px solid ${color}` : "none",
                            outlineOffset: "2px",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleAddCategory} className="w-full bg-primary hover:bg-primary/90">
                    Add Category
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>

      {/* Bottom action bar — visible when items are selected */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 shadow-lg z-30">
          <div className="max-w-4xl mx-auto p-4 flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSel({})}
              className="border-border hover:bg-muted/70 bg-transparent gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <Button
              onClick={handleCopyLink}
              size="sm"
              variant="outline"
              className="border-border hover:bg-muted/70 bg-transparent gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
            <Button
              onClick={handleShare}
              size="sm"
              className="bg-primary hover:bg-primary/90 gap-2 flex-1 max-w-xs"
            >
              <Share2 className="w-4 h-4" />
              Share ({totalCount} item{totalCount !== 1 ? "s" : ""})
            </Button>
          </div>
        </div>
      )}

      {/* Local-storage notice */}
      {showStorageNotice && (
        <Alert className="fixed bottom-20 left-4 right-4 z-50 bg-card/95 backdrop-blur-md border-border shadow-lg max-w-4xl mx-auto">
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-sm">Your lists are saved locally in your browser. No data ever leaves your device.</span>
            <Button
              onClick={() => {
                localStorage.setItem("tap-tap-storage-accepted", "true")
                setShowStorageNotice(false)
              }}
              size="sm"
              className="bg-primary hover:bg-primary/90 shrink-0"
            >
              Got it
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
