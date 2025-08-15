"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Settings, Download, Upload, ChefHat, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Item {
  id: string
  name: string
  emoji: string
  count: number
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

const defaultGroceryPreset: Preset = {
  id: "grocery-default",
  name: "Grocery Shopping",
  categories: [
    {
      id: "dairy",
      name: "Dairy & Eggs",
      color: "#3b82f6",
      items: [
        { id: "milk", name: "Milk", emoji: "🥛", count: 0 },
        { id: "cheese", name: "Cheese", emoji: "🧀", count: 0 },
        { id: "eggs", name: "Eggs", emoji: "🥚", count: 0 },
        { id: "butter", name: "Butter", emoji: "🧈", count: 0 },
        { id: "yogurt", name: "Greek Yogurt", emoji: "🍶", count: 0 },
        { id: "cream", name: "Heavy Cream", emoji: "🥛", count: 0 },
        { id: "mozzarella", name: "Mozzarella", emoji: "🧀", count: 0 },
        { id: "parmesan", name: "Parmesan", emoji: "🧀", count: 0 },
      ],
    },
    {
      id: "produce",
      name: "Fruits & Vegetables",
      color: "#10b981",
      items: [
        { id: "apples", name: "Apples", emoji: "🍎", count: 0 },
        { id: "bananas", name: "Bananas", emoji: "🍌", count: 0 },
        { id: "carrots", name: "Carrots", emoji: "🥕", count: 0 },
        { id: "lettuce", name: "Lettuce", emoji: "🥬", count: 0 },
        { id: "tomatoes", name: "Tomatoes", emoji: "🍅", count: 0 },
        { id: "onions", name: "Red Onions", emoji: "🧅", count: 0 },
        { id: "potatoes", name: "Potatoes", emoji: "🥔", count: 0 },
        { id: "broccoli", name: "Broccoli", emoji: "🥦", count: 0 },
        { id: "spinach", name: "Baby Spinach", emoji: "🌿", count: 0 },
        { id: "bell-peppers", name: "Bell Peppers", emoji: "🫑", count: 0 },
        { id: "cucumbers", name: "Cucumbers", emoji: "🥒", count: 0 },
        { id: "oranges", name: "Oranges", emoji: "🍊", count: 0 },
        { id: "grapes", name: "Grapes", emoji: "🍇", count: 0 },
        { id: "strawberries", name: "Strawberries", emoji: "🍓", count: 0 },
        { id: "avocados", name: "Avocados", emoji: "🥑", count: 0 },
        { id: "lemons", name: "Lemons", emoji: "🍋", count: 0 },
        { id: "garlic", name: "Garlic", emoji: "🧄", count: 0 },
        { id: "mushrooms", name: "Mushrooms", emoji: "🍄", count: 0 },
        { id: "zucchini", name: "Zucchini", emoji: "🥒", count: 0 },
        { id: "asparagus", name: "Asparagus", emoji: "🌱", count: 0 },
      ],
    },
    {
      id: "meat",
      name: "Meat & Seafood",
      color: "#ef4444",
      items: [
        { id: "chicken-breast", name: "Chicken Breast", emoji: "🍗", count: 0 },
        { id: "ground-beef", name: "Ground Beef", emoji: "🥩", count: 0 },
        { id: "salmon", name: "Salmon Fillet", emoji: "🐟", count: 0 },
        { id: "shrimp", name: "Shrimp", emoji: "🦐", count: 0 },
        { id: "bacon", name: "Bacon", emoji: "🥓", count: 0 },
        { id: "turkey", name: "Turkey Slices", emoji: "🦃", count: 0 },
        { id: "tuna", name: "Tuna", emoji: "🐟", count: 0 },
        { id: "lamb", name: "Lamb Chops", emoji: "🍖", count: 0 },
        { id: "sausages", name: "Sausages", emoji: "🌭", count: 0 },
        { id: "cod", name: "Cod Fillet", emoji: "🐠", count: 0 },
      ],
    },
    {
      id: "pantry",
      name: "Pantry & Grains",
      color: "#f59e0b",
      items: [
        { id: "bread", name: "Sourdough Bread", emoji: "🍞", count: 0 },
        { id: "rice", name: "Basmati Rice", emoji: "🍚", count: 0 },
        { id: "pasta", name: "Pasta", emoji: "🍝", count: 0 },
        { id: "olive-oil", name: "Olive Oil", emoji: "🫒", count: 0 },
        { id: "salt", name: "Sea Salt", emoji: "🧂", count: 0 },
        { id: "flour", name: "All-Purpose Flour", emoji: "🌾", count: 0 },
        { id: "sugar", name: "Cane Sugar", emoji: "🍯", count: 0 },
        { id: "oats", name: "Rolled Oats", emoji: "🥣", count: 0 },
        { id: "quinoa", name: "Quinoa", emoji: "🌾", count: 0 },
        { id: "canned-tomatoes", name: "Canned Tomatoes", emoji: "🥫", count: 0 },
        { id: "pasta-sauce", name: "Marinara Sauce", emoji: "🍅", count: 0 },
        { id: "vinegar", name: "Balsamic Vinegar", emoji: "🍶", count: 0 },
        { id: "honey", name: "Honey", emoji: "🍯", count: 0 },
        { id: "black-pepper", name: "Black Pepper", emoji: "🌶️", count: 0 },
        { id: "herbs", name: "Fresh Herbs", emoji: "🌿", count: 0 },
      ],
    },
    {
      id: "beverages",
      name: "Beverages",
      color: "#8b5cf6",
      items: [
        { id: "sparkling-water", name: "Sparkling Water", emoji: "💧", count: 0 },
        { id: "orange-juice", name: "Fresh Orange Juice", emoji: "🧃", count: 0 },
        { id: "coffee-beans", name: "Coffee Beans", emoji: "☕", count: 0 },
        { id: "green-tea", name: "Green Tea", emoji: "🍵", count: 0 },
        { id: "kombucha", name: "Kombucha", emoji: "🥤", count: 0 },
        { id: "craft-beer", name: "Craft Beer", emoji: "🍺", count: 0 },
        { id: "red-wine", name: "Red Wine", emoji: "🍷", count: 0 },
        { id: "almond-milk", name: "Almond Milk", emoji: "🥛", count: 0 },
        { id: "coconut-water", name: "Coconut Water", emoji: "🥥", count: 0 },
        { id: "herbal-tea", name: "Herbal Tea", emoji: "🫖", count: 0 },
      ],
    },
    {
      id: "snacks",
      name: "Snacks & Treats",
      color: "#ec4899",
      items: [
        { id: "dark-chocolate", name: "Dark Chocolate", emoji: "🍫", count: 0 },
        { id: "almonds", name: "Raw Almonds", emoji: "🥜", count: 0 },
        { id: "hummus", name: "Hummus", emoji: "🫘", count: 0 },
        { id: "crackers", name: "Whole Grain Crackers", emoji: "🍘", count: 0 },
        { id: "greek-yogurt", name: "Greek Yogurt", emoji: "🥛", count: 0 },
        { id: "berries", name: "Mixed Berries", emoji: "🫐", count: 0 },
        { id: "energy-bars", name: "Energy Bars", emoji: "🍫", count: 0 },
        { id: "olives", name: "Kalamata Olives", emoji: "🫒", count: 0 },
      ],
    },
    {
      id: "household",
      name: "Household & Personal Care",
      color: "#06b6d4",
      items: [
        { id: "toilet-paper", name: "Toilet Paper", emoji: "🧻", count: 0 },
        { id: "dish-soap", name: "Dish Soap", emoji: "🧽", count: 0 },
        { id: "laundry-detergent", name: "Laundry Detergent", emoji: "🧴", count: 0 },
        { id: "toothpaste", name: "Toothpaste", emoji: "🦷", count: 0 },
        { id: "shampoo", name: "Shampoo", emoji: "🧴", count: 0 },
        { id: "paper-towels", name: "Paper Towels", emoji: "🧻", count: 0 },
        { id: "hand-soap", name: "Hand Soap", emoji: "🧼", count: 0 },
        { id: "trash-bags", name: "Trash Bags", emoji: "🗑️", count: 0 },
      ],
    },
  ],
}

export default function TapTapShare() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [currentPreset, setCurrentPreset] = useState<Preset | null>(null)
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({})
  const [showCookieWarning, setShowCookieWarning] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [newPresetName, setNewPresetName] = useState("")
  const [showNewPreset, setShowNewPreset] = useState(false)
  const [showCopyNotification, setShowCopyNotification] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const savedPresets = localStorage.getItem("tap-tap-share-presets")
    const savedCookieWarning = localStorage.getItem("tap-tap-share-cookie-accepted")

    if (savedPresets) {
      const parsedPresets = JSON.parse(savedPresets)
      setPresets(parsedPresets)
      setCurrentPreset(parsedPresets[0] || null)
    } else {
      setPresets([defaultGroceryPreset])
      setCurrentPreset(defaultGroceryPreset)
    }

    if (savedCookieWarning === "true") {
      setShowCookieWarning(false)
    }
  }, [])

  const handleItemTap = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }))
  }

  const handleItemDecrease = (itemId: string) => {
    setSelectedItems((prev) => {
      const newCount = (prev[itemId] || 0) - 1
      if (newCount <= 0) {
        const { [itemId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [itemId]: newCount }
    })
  }

  const getSelectedItemsCount = () => {
    return Object.values(selectedItems).reduce((sum, count) => sum + count, 0)
  }

  const generateShareText = () => {
    if (!currentPreset) return ""

    let shareText = `🛒 ${currentPreset.name}:\n\n`

    currentPreset.categories.forEach((category) => {
      const categoryItems = category.items.filter((item) => selectedItems[item.id] > 0)
      if (categoryItems.length > 0) {
        shareText += `${category.name}:\n`
        categoryItems.forEach((item) => {
          shareText += `• ${item.emoji} ${item.name} x${selectedItems[item.id]}\n`
        })
        shareText += "\n"
      }
    })

    shareText += "Created with Tap-Tap-Share 🍽️"
    return shareText
  }

  const handleCopyToClipboard = async () => {
    const shareText = generateShareText()
    await navigator.clipboard.writeText(shareText)
    setShowCopyNotification(true)
    setTimeout(() => setShowCopyNotification(false), 2000)
  }

  const createNewPreset = () => {
    if (!newPresetName.trim()) return

    const newPreset: Preset = {
      id: `preset-${Date.now()}`,
      name: newPresetName,
      categories: [
        {
          id: `category-${Date.now()}`,
          name: "Items",
          color: "#6366f1",
          items: [],
        },
      ],
    }

    setPresets((prev) => [...prev, newPreset])
    setCurrentPreset(newPreset)
    setNewPresetName("")
    setShowNewPreset(false)
    setSelectedItems({})
  }

  const exportPresets = () => {
    const dataStr = JSON.stringify(presets, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "tap-tap-share-presets.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  const importPresets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importedPresets = JSON.parse(e.target?.result as string)
        setPresets(importedPresets)
        setCurrentPreset(importedPresets[0] || null)
        setSelectedItems({})
      } catch (error) {
        alert("Invalid file format")
      }
    }
    reader.readAsText(file)
  }

  const handleCookieAccept = () => {
    localStorage.setItem("tap-tap-share-cookie-accepted", "true")
    setShowCookieWarning(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 text-foreground">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur-md border-b border-border/50 p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold font-serif bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Tap-Tap-Share
            </h1>
          </div>
          <div className="flex gap-2">
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
                    <h3 className="font-medium mb-2 font-serif">Manage Presets</h3>
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
                          className="border-border hover:bg-muted/70 bg-transparent"
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
        {/* Preset Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <select
              value={currentPreset?.id || ""}
              onChange={(e) => {
                const preset = presets.find((p) => p.id === e.target.value)
                setCurrentPreset(preset || null)
                setSelectedItems({})
              }}
              className="flex-1 bg-card/80 backdrop-blur-md border border-border rounded-lg px-3 py-2 text-card-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
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
                  <DialogTitle className="font-serif">Create New Preset</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Preset name"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="bg-input border-border focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Button onClick={createNewPreset} className="w-full bg-primary hover:bg-primary/90">
                    Create Preset
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Categories and Items */}
        {currentPreset && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentPreset.categories.map((category) => (
              <Card
                key={category.id}
                className="bg-card/80 backdrop-blur-md border-border/50 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {category.items.map((item) => {
                      const count = selectedItems[item.id] || 0
                      const isSelected = count > 0

                      return (
                        <div
                          key={item.id}
                          className={`
                            relative p-3 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-105 
                            h-20 flex flex-col justify-between
                            ${
                              isSelected
                                ? `bg-gradient-to-br from-[${category.color}] to-[${category.color}]/80 text-white shadow-lg`
                                : `bg-gradient-to-br from-[${category.color}]/10 to-[${category.color}]/5 hover:from-[${category.color}]/20 hover:to-[${category.color}]/10 backdrop-blur-sm border border-[${category.color}]/20`
                            }`}
                          onClick={() => handleItemTap(item.id)}
                        >
                          <div className="flex items-start gap-2 min-h-0">
                            <span className="text-xl flex-shrink-0">{item.emoji}</span>
                            <span className="text-sm font-medium select-none leading-tight break-words overflow-hidden text-ellipsis line-clamp-2 flex-1">
                              {item.name}
                            </span>
                          </div>

                          {/* Controls row - always reserve space */}
                          <div className="flex items-center justify-center gap-2 h-7">
                            {isSelected ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleItemDecrease(item.id)
                                  }}
                                  className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold hover:bg-white/30 transition-colors select-none"
                                >
                                  -
                                </button>
                                <span className="text-base font-bold min-w-[1.5rem] text-center px-1 select-none">
                                  {count}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleItemTap(item.id)
                                  }}
                                  className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold hover:bg-white/30 transition-colors select-none"
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {getSelectedItemsCount() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 shadow-lg z-30">
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex gap-2 justify-center">
              <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-border hover:bg-muted/70 bg-transparent">
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card/95 backdrop-blur-md border-border max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-serif">List Preview</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg border border-border/30">
                      {generateShareText()}
                    </pre>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                onClick={handleCopyToClipboard}
                size="sm"
                className="bg-primary hover:bg-primary/90 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCopyNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-right">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4" />
            <span className="text-sm font-medium">Copied to clipboard!</span>
          </div>
        </div>
      )}

      {/* Privacy warning positioned above share area */}
      {showCookieWarning && (
        <Alert className="fixed bottom-20 left-4 right-4 z-50 bg-card/95 backdrop-blur-md border-border shadow-lg max-w-4xl mx-auto">
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="text-sm text-card-foreground">
              This app uses local storage to save your lists and preferences. No data is sent to external servers.
            </span>
            <Button onClick={handleCookieAccept} size="sm" className="bg-primary hover:bg-primary/90 shrink-0">
              Accept
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
