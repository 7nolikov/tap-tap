"use client"

import { useState } from "react"
import { Check, ChevronDown, Pencil, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ItemTile } from "@/components/item-tile"
import { cn } from "@/lib/utils"
import { firstGrapheme } from "@/lib/text"
import { k, type Category, type Selection } from "@/lib/types"

interface CategorySectionProps {
  category: Category
  /** Items after search filtering; may be a subset of `category.items`. */
  visibleItemIds: Set<string> | null
  sel: Selection
  collapsed: boolean
  editing: boolean
  searchTerm: string
  hintItemId: string | null
  onToggleCollapse: () => void
  onToggleEditing: () => void
  onIncrement: (itemId: string) => void
  onDecrement: (itemId: string) => void
  onDeleteItem: (itemId: string) => void
  onEditQuantity: (itemId: string) => void
  onAddItem: (emoji: string, name: string) => void
}

export function CategorySection({
  category,
  visibleItemIds,
  sel,
  collapsed,
  editing,
  searchTerm,
  hintItemId,
  onToggleCollapse,
  onToggleEditing,
  onIncrement,
  onDecrement,
  onDeleteItem,
  onEditQuantity,
  onAddItem,
}: CategorySectionProps) {
  const [adding, setAdding] = useState(false)
  const [emoji, setEmoji] = useState("")
  const [name, setName] = useState("")

  const items = visibleItemIds
    ? category.items.filter((item) => visibleItemIds.has(item.id))
    : category.items

  const selectedCount = category.items.reduce(
    (sum, item) => sum + (sel[k(category.id, item.id)] ?? 0),
    0,
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAddItem(firstGrapheme(emoji) || "📦", name.trim())
    setEmoji("")
    setName("")
  }

  const sectionId = `cat-panel-${category.id}`

  return (
    <section aria-labelledby={`cat-head-${category.id}`} className="scroll-mt-32" id={`section-${category.id}`}>
      <div className="bg-background/95 sticky top-[var(--stack-top)] z-10 flex items-center gap-1 py-1.5 backdrop-blur-sm">
        <button
          type="button"
          id={`cat-head-${category.id}`}
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-controls={sectionId}
          className="hover:bg-surface-2 flex min-h-11 flex-1 items-center gap-2 rounded-md px-1.5 text-left transition-colors"
        >
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
            aria-hidden="true"
          />
          <span className="flex-1 truncate text-[14px] font-semibold tracking-[-0.005em]">
            {category.name}
          </span>
          {selectedCount > 0 && (
            <span
              data-numeric
              className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[11px] font-semibold"
            >
              {selectedCount}
            </span>
          )}
          <span className="text-muted-foreground text-[12px]" data-numeric>
            {category.items.length}
          </span>
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform duration-[120ms]",
              collapsed && "-rotate-90",
            )}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={onToggleEditing}
          aria-pressed={editing}
          aria-label={editing ? `Finish editing ${category.name}` : `Edit items in ${category.name}`}
          className={cn(
            "hover:bg-surface-2 flex size-11 shrink-0 items-center justify-center rounded-md transition-colors",
            editing ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {editing ? <X className="size-4" /> : <Pencil className="size-4" />}
        </button>
      </div>

      {!collapsed && (
        <div id={sectionId} className="pt-1 pb-5">
          {items.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <ItemTile
                  key={item.id}
                  name={item.name}
                  emoji={item.emoji}
                  color={category.color}
                  qty={sel[k(category.id, item.id)] ?? 0}
                  editing={editing}
                  hint={hintItemId === item.id}
                  highlight={searchTerm || undefined}
                  onIncrement={() => onIncrement(item.id)}
                  onDecrement={() => onDecrement(item.id)}
                  onDelete={() => onDeleteItem(item.id)}
                  onEditQuantity={() => onEditQuantity(item.id)}
                />
              ))}
            </div>
          ) : (
            !searchTerm && (
              <p className="text-muted-foreground rounded-md border border-dashed px-3 py-5 text-center text-[13px]">
                No items yet — add your first below.
              </p>
            )
          )}

          {!searchTerm &&
            (adding ? (
              <form onSubmit={submit} className="mt-2 flex gap-2">
                <Input
                  value={emoji}
                  onChange={(e) => setEmoji(firstGrapheme(e.target.value))}
                  placeholder="🍎"
                  aria-label="Item emoji"
                  className="h-11 w-14 shrink-0 text-center text-base"
                  autoFocus
                />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Item name"
                  aria-label="Item name"
                  className="h-11 flex-1"
                />
                <Button type="submit" size="icon" className="size-11 shrink-0" aria-label="Save item">
                  <Check className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label="Cancel"
                  onClick={() => {
                    setAdding(false)
                    setEmoji("")
                    setName("")
                  }}
                >
                  <X className="size-4" />
                </Button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="text-muted-foreground hover:text-foreground hover:bg-surface-2 mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border border-dashed text-[13px] transition-colors"
              >
                <Plus className="size-3.5" />
                Add item to {category.name}
              </button>
            ))}
        </div>
      )}
    </section>
  )
}
