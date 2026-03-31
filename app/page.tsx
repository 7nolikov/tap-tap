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

const ATTRIBUTION = "\n\n— Built with TapTap · tap-tap.app\nNo sign-up. No server. Your list travels as a link."
const APP_URL = "https://7nolikov.github.io/tap-tap/"

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
    id: "grocery",
    name: "Grocery Shopping",
    categories: [
      {
        id: "dairy",
        name: "Dairy & Eggs",
        color: "#3b82f6",
        items: [
          { id: "milk", name: "Milk", emoji: "🥛" },
          { id: "cheese", name: "Cheese", emoji: "🧀" },
          { id: "eggs", name: "Eggs", emoji: "🥚" },
          { id: "butter", name: "Butter", emoji: "🧈" },
          { id: "yogurt", name: "Yogurt", emoji: "🍶" },
          { id: "sour-cream", name: "Sour Cream", emoji: "🥛" },
          { id: "cottage-cheese", name: "Cottage Cheese", emoji: "🧀" },
        ],
      },
      {
        id: "produce",
        name: "Fruits & Vegetables",
        color: "#10b981",
        items: [
          { id: "apples", name: "Apples", emoji: "🍎" },
          { id: "bananas", name: "Bananas", emoji: "🍌" },
          { id: "carrots", name: "Carrots", emoji: "🥕" },
          { id: "cucumbers", name: "Cucumbers", emoji: "🥒" },
          { id: "tomatoes", name: "Tomatoes", emoji: "🍅" },
          { id: "onions", name: "Onions", emoji: "🧅" },
          { id: "potatoes", name: "Potatoes", emoji: "🥔" },
          { id: "broccoli", name: "Broccoli", emoji: "🥦" },
          { id: "garlic", name: "Garlic", emoji: "🧄" },
          { id: "mushrooms", name: "Mushrooms", emoji: "🍄" },
          { id: "oranges", name: "Oranges", emoji: "🍊" },
          { id: "lemons", name: "Lemons", emoji: "🍋" },
          { id: "bell-peppers", name: "Bell Peppers", emoji: "🫑" },
          { id: "cabbage", name: "Cabbage", emoji: "🥬" },
          { id: "spinach", name: "Spinach", emoji: "🥬" },
          { id: "avocado", name: "Avocado", emoji: "🥑" },
        ],
      },
      {
        id: "meat",
        name: "Meat & Seafood",
        color: "#ef4444",
        items: [
          { id: "chicken", name: "Chicken Fillet", emoji: "🍗" },
          { id: "pork", name: "Pork", emoji: "🥩" },
          { id: "ground-beef", name: "Ground Beef", emoji: "🥩" },
          { id: "salmon", name: "Salmon Fillet", emoji: "🐟" },
          { id: "shrimp", name: "Shrimp", emoji: "🦐" },
          { id: "bacon", name: "Bacon", emoji: "🥓" },
          { id: "cod", name: "Cod Fillet", emoji: "🐠" },
          { id: "turkey", name: "Turkey", emoji: "🦃" },
        ],
      },
      {
        id: "canned",
        name: "Canned & Frozen",
        color: "#78350f",
        items: [
          { id: "corn", name: "Canned Corn", emoji: "🌽" },
          { id: "peas", name: "Green Peas", emoji: "🫛" },
          { id: "beans", name: "Canned Beans", emoji: "🫘" },
          { id: "fish", name: "Canned Fish", emoji: "🐟" },
          { id: "stew", name: "Canned Stew", emoji: "🍖" },
          { id: "frozen-veg", name: "Frozen Vegetables", emoji: "🧊" },
          { id: "dumplings", name: "Dumplings", emoji: "🥟" },
          { id: "sausages", name: "Sausages", emoji: "🌭" },
        ],
      },
      {
        id: "pantry",
        name: "Pantry & Grains",
        color: "#d97706",
        items: [
          { id: "white-bread", name: "White Bread", emoji: "🍞" },
          { id: "rye-bread", name: "Rye Bread", emoji: "🍞" },
          { id: "rice", name: "Rice", emoji: "🍚" },
          { id: "pasta", name: "Pasta", emoji: "🍝" },
          { id: "buckwheat", name: "Buckwheat", emoji: "🥣" },
          { id: "oats", name: "Rolled Oats", emoji: "🥣" },
          { id: "olive-oil", name: "Olive Oil", emoji: "🫒" },
          { id: "salt", name: "Salt", emoji: "🧂" },
          { id: "sugar", name: "Sugar", emoji: "🍚" },
          { id: "flour", name: "Flour", emoji: "🌾" },
          { id: "tea", name: "Tea", emoji: "🍵" },
          { id: "coffee", name: "Coffee", emoji: "☕" },
          { id: "honey", name: "Honey", emoji: "🍯" },
          { id: "soy-sauce", name: "Soy Sauce", emoji: "🫙" },
        ],
      },
      {
        id: "snacks",
        name: "Snacks & Sweets",
        color: "#ec4899",
        items: [
          { id: "chips", name: "Chips", emoji: "🍟" },
          { id: "chocolate", name: "Chocolate", emoji: "🍫" },
          { id: "cookies", name: "Cookies", emoji: "🍪" },
          { id: "nuts", name: "Nuts", emoji: "🌰" },
          { id: "crackers", name: "Crackers", emoji: "🍘" },
          { id: "ice-cream", name: "Ice Cream", emoji: "🍦" },
          { id: "candy", name: "Candy", emoji: "🍬" },
          { id: "biscuits", name: "Biscuits", emoji: "🥨" },
          { id: "popcorn", name: "Popcorn", emoji: "🍿" },
        ],
      },
      {
        id: "beverages",
        name: "Beverages",
        color: "#8b5cf6",
        items: [
          { id: "water", name: "Water", emoji: "💧" },
          { id: "juice", name: "Juice", emoji: "🧃" },
          { id: "soda", name: "Soda", emoji: "🥤" },
          { id: "kefir", name: "Kefir", emoji: "🥛" },
          { id: "beer", name: "Beer", emoji: "🍺" },
          { id: "wine", name: "Wine", emoji: "🍷" },
          { id: "sparkling-water", name: "Sparkling Water", emoji: "💧" },
          { id: "energy-drink", name: "Energy Drink", emoji: "⚡" },
        ],
      },
      {
        id: "household",
        name: "Household Goods",
        color: "#06b6d4",
        items: [
          { id: "toilet-paper", name: "Toilet Paper", emoji: "🧻" },
          { id: "dish-soap", name: "Dish Soap", emoji: "🧽" },
          { id: "laundry", name: "Laundry Detergent", emoji: "🧴" },
          { id: "toothpaste", name: "Toothpaste", emoji: "🦷" },
          { id: "shampoo", name: "Shampoo", emoji: "🧴" },
          { id: "paper-towels", name: "Paper Towels", emoji: "🧻" },
          { id: "hand-soap", name: "Hand Soap", emoji: "🧼" },
          { id: "trash-bags", name: "Trash Bags", emoji: "🗑️" },
          { id: "sponges", name: "Sponges", emoji: "🧽" },
          { id: "aluminum-foil", name: "Aluminum Foil", emoji: "🫙" },
        ],
      },
    ],
  },
  {
    id: "bbq-party",
    name: "BBQ Party",
    categories: [
      {
        id: "bbq-meat",
        name: "Meats & Skewers",
        color: "#ef4444",
        items: [
          { id: "burgers", name: "Burger Patties", emoji: "🍔" },
          { id: "ribs", name: "Pork Ribs", emoji: "🥩" },
          { id: "chicken-wings", name: "Chicken Wings", emoji: "🍗" },
          { id: "hot-dogs", name: "Hot Dogs", emoji: "🌭" },
          { id: "shrimp-skewers", name: "Shrimp Skewers", emoji: "🦐" },
          { id: "steak", name: "Steak", emoji: "🥩" },
          { id: "chicken-thighs", name: "Chicken Thighs", emoji: "🍗" },
          { id: "lamb-chops", name: "Lamb Chops", emoji: "🥩" },
        ],
      },
      {
        id: "bbq-sides",
        name: "Sides & Salads",
        color: "#10b981",
        items: [
          { id: "corn-cob", name: "Corn on the Cob", emoji: "🌽" },
          { id: "coleslaw", name: "Coleslaw Mix", emoji: "🥬" },
          { id: "baked-beans", name: "Baked Beans", emoji: "🫘" },
          { id: "potato-salad", name: "Potato Salad", emoji: "🥔" },
          { id: "watermelon", name: "Watermelon", emoji: "🍉" },
          { id: "burger-buns", name: "Burger Buns", emoji: "🍞" },
          { id: "pita-bread", name: "Pita Bread", emoji: "🫓" },
        ],
      },
      {
        id: "bbq-sauces",
        name: "Sauces & Condiments",
        color: "#f59e0b",
        items: [
          { id: "bbq-sauce", name: "BBQ Sauce", emoji: "🫙" },
          { id: "ketchup", name: "Ketchup", emoji: "🍅" },
          { id: "mustard", name: "Mustard", emoji: "🌭" },
          { id: "mayo", name: "Mayonnaise", emoji: "🫙" },
          { id: "hot-sauce", name: "Hot Sauce", emoji: "🌶️" },
          { id: "pickles", name: "Pickles", emoji: "🥒" },
        ],
      },
      {
        id: "bbq-drinks",
        name: "Drinks & Ice",
        color: "#8b5cf6",
        items: [
          { id: "beer-case", name: "Beer (case)", emoji: "🍺" },
          { id: "lemonade", name: "Lemonade", emoji: "🍋" },
          { id: "ice", name: "Bag of Ice", emoji: "🧊" },
          { id: "soda-cans", name: "Soda Cans", emoji: "🥤" },
          { id: "sparkling", name: "Sparkling Water", emoji: "💧" },
        ],
      },
      {
        id: "bbq-supplies",
        name: "BBQ Supplies",
        color: "#78350f",
        items: [
          { id: "charcoal", name: "Charcoal", emoji: "🪵" },
          { id: "lighter-fluid", name: "Lighter Fluid", emoji: "🔥" },
          { id: "skewers", name: "Skewers", emoji: "🍢" },
          { id: "foil", name: "Aluminum Foil", emoji: "🫙" },
          { id: "napkins", name: "Napkins", emoji: "🧻" },
          { id: "plates", name: "Disposable Plates", emoji: "🍽️" },
          { id: "cups", name: "Disposable Cups", emoji: "🥤" },
        ],
      },
    ],
  },
  {
    id: "camping-trip",
    name: "Camping Trip",
    categories: [
      {
        id: "camp-food",
        name: "Camp Food",
        color: "#d97706",
        items: [
          { id: "instant-noodles", name: "Instant Noodles", emoji: "🍜" },
          { id: "canned-soup", name: "Canned Soup", emoji: "🍲" },
          { id: "trail-mix", name: "Trail Mix", emoji: "🌰" },
          { id: "granola-bars", name: "Granola Bars", emoji: "🍫" },
          { id: "jerky", name: "Beef Jerky", emoji: "🥩" },
          { id: "instant-oatmeal", name: "Instant Oatmeal", emoji: "🥣" },
          { id: "peanut-butter", name: "Peanut Butter", emoji: "🫙" },
          { id: "crackers-camp", name: "Crackers", emoji: "🍘" },
          { id: "dried-fruit", name: "Dried Fruit", emoji: "🍇" },
          { id: "energy-bars", name: "Energy Bars", emoji: "⚡" },
          { id: "marshmallows", name: "Marshmallows", emoji: "🍬" },
          { id: "hot-dogs-camp", name: "Hot Dogs", emoji: "🌭" },
          { id: "eggs-camp", name: "Eggs", emoji: "🥚" },
          { id: "bacon-camp", name: "Bacon", emoji: "🥓" },
        ],
      },
      {
        id: "camp-drinks",
        name: "Drinks",
        color: "#06b6d4",
        items: [
          { id: "water-bottles", name: "Water Bottles", emoji: "💧" },
          { id: "instant-coffee", name: "Instant Coffee", emoji: "☕" },
          { id: "hot-cocoa", name: "Hot Cocoa Mix", emoji: "🍫" },
          { id: "electrolytes", name: "Electrolyte Packets", emoji: "⚡" },
          { id: "juice-boxes", name: "Juice Boxes", emoji: "🧃" },
        ],
      },
      {
        id: "camp-gear",
        name: "Camp Supplies",
        color: "#10b981",
        items: [
          { id: "fire-starters", name: "Fire Starters", emoji: "🔥" },
          { id: "matches", name: "Waterproof Matches", emoji: "🪵" },
          { id: "biodegradable-soap", name: "Biodegradable Soap", emoji: "🧼" },
          { id: "bug-spray", name: "Bug Spray", emoji: "🪲" },
          { id: "sunscreen", name: "Sunscreen", emoji: "☀️" },
          { id: "toilet-paper-camp", name: "Toilet Paper", emoji: "🧻" },
          { id: "trash-bags-camp", name: "Trash Bags", emoji: "🗑️" },
          { id: "paper-plates", name: "Paper Plates", emoji: "🍽️" },
          { id: "zip-bags", name: "Zip-Lock Bags", emoji: "🫙" },
        ],
      },
    ],
  },
  {
    id: "weekly-meal-prep",
    name: "Weekly Meal Prep",
    categories: [
      {
        id: "meal-prep-proteins",
        name: "Proteins",
        color: "#ef4444",
        items: [
          { id: "chicken-breast", name: "Chicken Breast", emoji: "🍗" },
          { id: "ground-turkey", name: "Ground Turkey", emoji: "🦃" },
          { id: "canned-tuna", name: "Canned Tuna", emoji: "🐟" },
          { id: "tofu", name: "Tofu", emoji: "🫙" },
          { id: "lentils", name: "Lentils", emoji: "🫘" },
          { id: "black-beans", name: "Black Beans", emoji: "🫘" },
          { id: "eggs-prep", name: "Eggs", emoji: "🥚" },
          { id: "salmon-prep", name: "Salmon", emoji: "🐟" },
        ],
      },
      {
        id: "meal-prep-carbs",
        name: "Carbs & Grains",
        color: "#f59e0b",
        items: [
          { id: "brown-rice", name: "Brown Rice", emoji: "🍚" },
          { id: "quinoa", name: "Quinoa", emoji: "🥣" },
          { id: "sweet-potato", name: "Sweet Potatoes", emoji: "🍠" },
          { id: "whole-wheat-pasta", name: "Whole Wheat Pasta", emoji: "🍝" },
          { id: "oats-prep", name: "Rolled Oats", emoji: "🥣" },
          { id: "whole-wheat-bread", name: "Whole Wheat Bread", emoji: "🍞" },
        ],
      },
      {
        id: "meal-prep-veggies",
        name: "Vegetables",
        color: "#10b981",
        items: [
          { id: "broccoli-prep", name: "Broccoli", emoji: "🥦" },
          { id: "spinach-prep", name: "Spinach", emoji: "🥬" },
          { id: "bell-pepper-prep", name: "Bell Peppers", emoji: "🫑" },
          { id: "zucchini", name: "Zucchini", emoji: "🥒" },
          { id: "cherry-tomatoes-prep", name: "Cherry Tomatoes", emoji: "🍅" },
          { id: "kale", name: "Kale", emoji: "🥬" },
          { id: "cucumber-prep", name: "Cucumbers", emoji: "🥒" },
          { id: "carrots-prep", name: "Carrots", emoji: "🥕" },
          { id: "mushrooms-prep", name: "Mushrooms", emoji: "🍄" },
          { id: "asparagus", name: "Asparagus", emoji: "🌿" },
        ],
      },
      {
        id: "meal-prep-sauces",
        name: "Sauces & Seasonings",
        color: "#8b5cf6",
        items: [
          { id: "olive-oil-prep", name: "Olive Oil", emoji: "🫒" },
          { id: "soy-sauce-prep", name: "Soy Sauce", emoji: "🫙" },
          { id: "hot-sauce-prep", name: "Hot Sauce", emoji: "🌶️" },
          { id: "garlic-prep", name: "Garlic", emoji: "🧄" },
          { id: "lemon-prep", name: "Lemons", emoji: "🍋" },
          { id: "greek-yogurt", name: "Greek Yogurt", emoji: "🥛" },
          { id: "hummus", name: "Hummus", emoji: "🫙" },
        ],
      },
    ],
  },
  {
    id: "pizza-night",
    name: "Pizza Night",
    categories: [
      {
        id: "pizza-dough",
        name: "Dough & Base",
        color: "#d97706",
        items: [
          { id: "pizza-dough", name: "Pizza Dough", emoji: "🫓" },
          { id: "flour-pizza", name: "Flour", emoji: "🌾" },
          { id: "yeast", name: "Dry Yeast", emoji: "🫙" },
          { id: "tomato-sauce", name: "Tomato Sauce", emoji: "🍅" },
          { id: "olive-oil-pizza", name: "Olive Oil", emoji: "🫒" },
        ],
      },
      {
        id: "pizza-cheese",
        name: "Cheese",
        color: "#f59e0b",
        items: [
          { id: "mozzarella", name: "Mozzarella", emoji: "🧀" },
          { id: "parmesan", name: "Parmesan", emoji: "🧀" },
          { id: "ricotta", name: "Ricotta", emoji: "🧀" },
          { id: "gouda", name: "Gouda", emoji: "🧀" },
        ],
      },
      {
        id: "pizza-toppings",
        name: "Toppings",
        color: "#ef4444",
        items: [
          { id: "pepperoni", name: "Pepperoni", emoji: "🍕" },
          { id: "mushrooms-pizza", name: "Mushrooms", emoji: "🍄" },
          { id: "bell-peppers-pizza", name: "Bell Peppers", emoji: "🫑" },
          { id: "olives-pizza", name: "Olives", emoji: "🫒" },
          { id: "onion-pizza", name: "Red Onion", emoji: "🧅" },
          { id: "basil", name: "Fresh Basil", emoji: "🌿" },
          { id: "jalapeños", name: "Jalapeños", emoji: "🌶️" },
          { id: "prosciutto", name: "Prosciutto", emoji: "🥩" },
          { id: "pineapple", name: "Pineapple", emoji: "🍍" },
          { id: "anchovies", name: "Anchovies", emoji: "🐟" },
        ],
      },
      {
        id: "pizza-sides",
        name: "Sides & Drinks",
        color: "#10b981",
        items: [
          { id: "garlic-bread", name: "Garlic Bread", emoji: "🍞" },
          { id: "caesar-salad", name: "Caesar Salad Kit", emoji: "🥬" },
          { id: "wine-pizza", name: "Wine", emoji: "🍷" },
          { id: "soda-pizza", name: "Soda", emoji: "🥤" },
          { id: "tiramisu", name: "Tiramisu", emoji: "🍮" },
        ],
      },
    ],
  },
  {
    id: "office-supplies",
    name: "Office Supplies",
    categories: [
      {
        id: "office-writing",
        name: "Writing & Paper",
        color: "#3b82f6",
        items: [
          { id: "pens", name: "Pens", emoji: "✏️" },
          { id: "pencils", name: "Pencils", emoji: "✏️" },
          { id: "markers", name: "Markers", emoji: "🖊️" },
          { id: "highlighters", name: "Highlighters", emoji: "🖊️" },
          { id: "notebooks", name: "Notebooks", emoji: "📓" },
          { id: "sticky-notes", name: "Sticky Notes", emoji: "📝" },
          { id: "printer-paper", name: "Printer Paper", emoji: "📄" },
          { id: "index-cards", name: "Index Cards", emoji: "📋" },
        ],
      },
      {
        id: "office-org",
        name: "Organization",
        color: "#f59e0b",
        items: [
          { id: "folders", name: "Folders", emoji: "📁" },
          { id: "binders", name: "Binders", emoji: "📚" },
          { id: "stapler", name: "Stapler", emoji: "📎" },
          { id: "staples", name: "Staples", emoji: "📎" },
          { id: "paper-clips", name: "Paper Clips", emoji: "🖇️" },
          { id: "rubber-bands", name: "Rubber Bands", emoji: "🗂️" },
          { id: "scissors", name: "Scissors", emoji: "✂️" },
          { id: "tape", name: "Tape", emoji: "🗃️" },
          { id: "envelopes", name: "Envelopes", emoji: "✉️" },
        ],
      },
      {
        id: "office-tech",
        name: "Tech & Accessories",
        color: "#8b5cf6",
        items: [
          { id: "batteries", name: "Batteries", emoji: "🔋" },
          { id: "usb-cable", name: "USB Cable", emoji: "🔌" },
          { id: "mouse-pad", name: "Mouse Pad", emoji: "🖥️" },
          { id: "headphones", name: "Headphones", emoji: "🎧" },
          { id: "webcam", name: "Webcam", emoji: "📷" },
        ],
      },
      {
        id: "office-snacks",
        name: "Desk Snacks",
        color: "#10b981",
        items: [
          { id: "coffee-pods", name: "Coffee Pods", emoji: "☕" },
          { id: "tea-bags", name: "Tea Bags", emoji: "🍵" },
          { id: "nuts-office", name: "Mixed Nuts", emoji: "🌰" },
          { id: "granola-bars-office", name: "Granola Bars", emoji: "🍫" },
          { id: "fruit-office", name: "Fruit", emoji: "🍎" },
        ],
      },
    ],
  },
  {
    id: "date-night",
    name: "Date Night Dinner",
    categories: [
      {
        id: "date-main",
        name: "Main Course",
        color: "#ef4444",
        items: [
          { id: "filet-mignon", name: "Filet Mignon", emoji: "🥩" },
          { id: "salmon-date", name: "Salmon Fillet", emoji: "🐟" },
          { id: "lobster-tail", name: "Lobster Tail", emoji: "🦞" },
          { id: "scallops", name: "Scallops", emoji: "🦪" },
          { id: "rack-of-lamb", name: "Rack of Lamb", emoji: "🥩" },
          { id: "duck-breast", name: "Duck Breast", emoji: "🍗" },
        ],
      },
      {
        id: "date-sides",
        name: "Sides",
        color: "#10b981",
        items: [
          { id: "asparagus-date", name: "Asparagus", emoji: "🌿" },
          { id: "truffle-pasta", name: "Pasta", emoji: "🍝" },
          { id: "mashed-potatoes", name: "Potatoes", emoji: "🥔" },
          { id: "mixed-greens", name: "Mixed Greens", emoji: "🥬" },
          { id: "roasted-tomatoes", name: "Cherry Tomatoes", emoji: "🍅" },
          { id: "garlic-bread-date", name: "Garlic Bread", emoji: "🍞" },
        ],
      },
      {
        id: "date-wine",
        name: "Wine & Drinks",
        color: "#8b5cf6",
        items: [
          { id: "red-wine", name: "Red Wine", emoji: "🍷" },
          { id: "white-wine", name: "White Wine", emoji: "🥂" },
          { id: "champagne", name: "Champagne", emoji: "🍾" },
          { id: "sparkling-date", name: "Sparkling Water", emoji: "💧" },
          { id: "craft-beer", name: "Craft Beer", emoji: "🍺" },
        ],
      },
      {
        id: "date-dessert",
        name: "Dessert",
        color: "#ec4899",
        items: [
          { id: "dark-chocolate", name: "Dark Chocolate", emoji: "🍫" },
          { id: "strawberries", name: "Strawberries", emoji: "🍓" },
          { id: "whipped-cream", name: "Whipped Cream", emoji: "🍦" },
          { id: "creme-brulee", name: "Crème Brûlée Kit", emoji: "🍮" },
          { id: "macarons", name: "Macarons", emoji: "🍪" },
          { id: "ice-cream-date", name: "Ice Cream", emoji: "🍨" },
        ],
      },
      {
        id: "date-ambience",
        name: "Ambience",
        color: "#f59e0b",
        items: [
          { id: "candles", name: "Candles", emoji: "🕯️" },
          { id: "flowers", name: "Flowers", emoji: "💐" },
          { id: "table-cloth", name: "Table Cloth", emoji: "🍽️" },
          { id: "tea-lights", name: "Tea Lights", emoji: "🕯️" },
        ],
      },
    ],
  },
  {
    id: "baby-essentials",
    name: "Baby Essentials",
    categories: [
      {
        id: "baby-feeding",
        name: "Feeding",
        color: "#ec4899",
        items: [
          { id: "formula", name: "Baby Formula", emoji: "🍼" },
          { id: "baby-food", name: "Baby Food Jars", emoji: "🫙" },
          { id: "puree-pouches", name: "Puree Pouches", emoji: "🥤" },
          { id: "rice-cereal", name: "Rice Cereal", emoji: "🥣" },
          { id: "baby-snacks", name: "Puffs / Snacks", emoji: "🍪" },
          { id: "bibs", name: "Bibs", emoji: "🧷" },
          { id: "bottles", name: "Baby Bottles", emoji: "🍼" },
          { id: "breast-pads", name: "Breast Pads", emoji: "🧴" },
        ],
      },
      {
        id: "baby-diapering",
        name: "Diapering",
        color: "#3b82f6",
        items: [
          { id: "diapers", name: "Diapers", emoji: "🧷" },
          { id: "wipes", name: "Baby Wipes", emoji: "🧻" },
          { id: "rash-cream", name: "Diaper Rash Cream", emoji: "🧴" },
          { id: "changing-pads", name: "Changing Pads", emoji: "🛏️" },
          { id: "diaper-bags", name: "Diaper Bags", emoji: "🗑️" },
        ],
      },
      {
        id: "baby-bath",
        name: "Bath & Care",
        color: "#06b6d4",
        items: [
          { id: "baby-shampoo", name: "Baby Shampoo", emoji: "🧴" },
          { id: "baby-lotion", name: "Baby Lotion", emoji: "🧴" },
          { id: "baby-wash", name: "Baby Wash", emoji: "🧼" },
          { id: "cotton-balls", name: "Cotton Balls", emoji: "☁️" },
          { id: "baby-towels", name: "Baby Towels", emoji: "🧺" },
          { id: "thermometer", name: "Thermometer", emoji: "🌡️" },
          { id: "nail-clippers", name: "Baby Nail Clippers", emoji: "✂️" },
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
