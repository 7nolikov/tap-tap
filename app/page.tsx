"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, Settings, Download, Upload, ChefHat, Share2, RotateCcw, Sun, Moon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
}

interface ShareData {
  n: string // preset name
  i: SharedItem[]
}

function encodeList(preset: Preset, sel: Record<string, number>): string {
  const items: SharedItem[] = preset.categories.flatMap((cat) =>
    cat.items
      .filter((item) => (sel[k(cat.id, item.id)] ?? 0) > 0)
      .map((item) => ({
        c: cat.name,
        e: item.emoji,
        l: item.name,
        q: sel[k(cat.id, item.id)],
      })),
  )
  return btoa(encodeURIComponent(JSON.stringify({ n: preset.name, i: items })))
}

/** Decode a shared list from URL search params (?list=...) with fallback to legacy hash fragment (#list=...) */
function decodeList(search: string, hash: string): ShareData | null {
  // Primary path: query parameter survives link shorteners, WhatsApp, Telegram previews
  const encoded = new URLSearchParams(search).get("list")
  if (encoded) {
    try {
      return JSON.parse(decodeURIComponent(atob(encoded))) as ShareData
    } catch {
      return null
    }
  }
  // Fallback: legacy hash fragment (old shared links still work)
  if (hash.startsWith("#list=")) {
    try {
      return JSON.parse(decodeURIComponent(atob(hash.slice(6)))) as ShareData
    } catch {
      return null
    }
  }
  return null
}

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
  return text
}

const PRESET_COLORS = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#d97706"]

/** Reconstruct a saveable Preset from a received shared list */
function sharedToPreset(data: ShareData): Preset {
  const groups: Record<string, SharedItem[]> = {}
  data.i.forEach((item) => {
    if (!groups[item.c]) groups[item.c] = []
    groups[item.c].push(item)
  })
  const ts = Date.now()
  return {
    id: `preset-${ts}`,
    name: data.n,
    categories: Object.entries(groups).map(([name, items], idx) => ({
      id: `cat-${ts}-${idx}`,
      name,
      color: PRESET_COLORS[idx % PRESET_COLORS.length],
      items: items.map((item, iIdx) => ({
        id: `item-${ts}-${idx}-${iIdx}`,
        name: item.l,
        emoji: item.e,
      })),
    })),
  }
}

// ─── Default preset ───────────────────────────────────────────────────────────

const defaultPreset: Preset = {
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
      ],
    },
    {
      id: "canned",
      name: "Canned & Prepared",
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
      id: "salad",
      name: "Salad Ingredients",
      color: "#f59e0b",
      items: [
        { id: "lettuce", name: "Lettuce", emoji: "🥬" },
        { id: "cherry-tomatoes", name: "Cherry Tomatoes", emoji: "🍅" },
        { id: "cucumbers", name: "Cucumbers", emoji: "🥒" },
        { id: "dressing", name: "Salad Dressing", emoji: "🍶" },
        { id: "olives", name: "Olives", emoji: "🫒" },
        { id: "feta", name: "Feta Cheese", emoji: "🧀" },
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
      ],
    },
  ],
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TapTapShare() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [presets, setPresets] = useState<Preset[]>([])
  const [currentPreset, setCurrentPreset] = useState<Preset | null>(null)
  const [sel, setSel] = useState<Record<string, number>>({})
  const [showCookieNotice, setShowCookieNotice] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newPresetName, setNewPresetName] = useState("")
  const [showNewPreset, setShowNewPreset] = useState(false)
  const [addingToCat, setAddingToCat] = useState<string | null>(null)
  const [newItemEmoji, setNewItemEmoji] = useState("")
  const [newItemName, setNewItemName] = useState("")
  const [sharedList, setSharedList] = useState<ShareData | null>(null)

  // Hydration guard for theme toggle
  useEffect(() => setMounted(true), [])

  // Load from localStorage + handle share hash on mount
  useEffect(() => {
    const raw = localStorage.getItem("tap-tap-share-presets")
    let loaded: Preset[] = [defaultPreset]
    if (raw) {
      try {
        const result = PresetsSchema.safeParse(JSON.parse(raw))
        if (result.success) loaded = result.data
      } catch {
        // corrupted storage — fall back to default
      }
    }
    setPresets(loaded)

    const savedId = localStorage.getItem("tap-tap-share-current-preset")
    setCurrentPreset(loaded.find((p) => p.id === savedId) ?? loaded[0] ?? null)

    if (localStorage.getItem("tap-tap-share-cookie-accepted") !== "true") {
      setShowCookieNotice(true)
    }

    // Decode shared list from URL (?list=... or legacy #list=...)
    const shared = decodeList(window.location.search, window.location.hash)
    if (shared) {
      setSharedList(shared)
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

  const handleShare = async () => {
    if (!currentPreset) return
    const hash = encodeList(currentPreset, sel)
    // Use query param (?list=) so the link survives WhatsApp/Telegram previews and URL shorteners
    const url = `${window.location.origin}${window.location.pathname}?list=${hash}`
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

  // ── Export / Import ────────────────────────────────────────────────────────

  const exportPresets = () => {
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "tap-tap-share-presets.json"
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
      {/* Shared-list modal — shown when URL contains a #list= hash */}
      {sharedList && (
        <Dialog open onOpenChange={() => setSharedList(null)}>
          <DialogContent className="bg-card/95 backdrop-blur-md border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-serif">🛒 {sharedList.n}</DialogTitle>
            </DialogHeader>
            <div className="max-h-64 overflow-y-auto space-y-3 text-sm">
              {(() => {
                const groups: Record<string, SharedItem[]> = {}
                sharedList.i.forEach((item) => {
                  if (!groups[item.c]) groups[item.c] = []
                  groups[item.c].push(item)
                })
                return Object.entries(groups).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide mb-1">
                      {cat}
                    </p>
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5">
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
            <h1 className="text-xl font-bold font-serif bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Tap-Tap-Share
            </h1>
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
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2 font-serif text-sm">Presets</h3>
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
        {/* Preset selector */}
        <div className="flex items-center gap-2 mb-6">
          <select
            value={currentPreset?.id ?? ""}
            onChange={(e) => switchPreset(e.target.value)}
            className="flex-1 bg-card/80 backdrop-blur-md border border-border rounded-lg px-3 py-2 text-card-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

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
                  {/* Items */}
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
              onClick={handleShare}
              size="sm"
              className="bg-primary hover:bg-primary/90 gap-2 flex-1 max-w-xs"
            >
              <Share2 className="w-4 h-4" />
              Share List ({totalCount} item{totalCount !== 1 ? "s" : ""})
            </Button>
          </div>
        </div>
      )}

      {/* Local-storage notice */}
      {showCookieNotice && (
        <Alert className="fixed bottom-20 left-4 right-4 z-50 bg-card/95 backdrop-blur-md border-border shadow-lg max-w-4xl mx-auto">
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-sm">This app saves your lists locally. No data ever leaves your device.</span>
            <Button
              onClick={() => {
                localStorage.setItem("tap-tap-share-cookie-accepted", "true")
                setShowCookieNotice(false)
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
