"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { AppBar } from "@/components/app-bar"
import { CategorySection } from "@/components/category-section"
import { HintStrip } from "@/components/hint-strip"
import { ListBar } from "@/components/list-bar"
import {
  ListPanel,
  ListPanelActions,
  ListPanelBody,
  type Measure,
} from "@/components/list-panel"
import { LiveRegion } from "@/components/live-region"
import { PersonaStrip } from "@/components/persona-strip"
import { PresetRail } from "@/components/preset-rail"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import {
  ConfirmDialog,
  MenuSheet,
  NewCategoryDialog,
  NewPresetDialog,
  PresetManagerDialog,
  PresetTemplateDialog,
  QuantityDialog,
  SharedListDialog,
} from "@/components/dialogs"

import { useSelection } from "@/hooks/use-selection"
import { basketCost, formatCents, DEFAULT_TIER, type StoreTierId } from "@/lib/economics"
import { DEMO_LIST, PRESET_COLORS, defaultPresets } from "@/lib/presets"
import {
  buildShareText,
  decodeList,
  decodePreset,
  encodeList,
  encodePreset,
  sharedToPreset,
} from "@/lib/share"
import * as storage from "@/lib/storage"
import { fold, plural } from "@/lib/text"
import { k, type Category, type Item, type Preset, type ShareData } from "@/lib/types"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export default function TapTap() {
  const [mounted, setMounted] = useState(false)
  const [presets, setPresets] = useState<Preset[]>(defaultPresets)
  // Seeded with the first default so the static export paints a usable grid before
  // hydration; the mount effect swaps in whatever is actually stored.
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(
    defaultPresets[0]?.id ?? null,
  )

  const [tier, setTier] = useState<StoreTierId>(DEFAULT_TIER)
  const [measure, setMeasure] = useState<Measure>("count")

  const [search, setSearch] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editingCat, setEditingCat] = useState<string | null>(null)

  const [listSheetOpen, setListSheetOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)
  const [newPresetOpen, setNewPresetOpen] = useState(false)
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [pendingDeletePreset, setPendingDeletePreset] = useState<string | null>(null)
  const [quantityTarget, setQuantityTarget] = useState<{ catId: string; itemId: string } | null>(null)

  const [sharedList, setSharedList] = useState<ShareData | null>(null)
  const [isDemoList, setIsDemoList] = useState(false)
  const [sharedPreset, setSharedPreset] = useState<Preset | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  const currentPreset = useMemo(
    () => presets.find((p) => p.id === currentPresetId) ?? null,
    [presets, currentPresetId],
  )

  const { sel, total, presetTotals, tap, dec, setQty, removeKey, clear, undoClear, forgetPreset, tallyFor } =
    useSelection(currentPresetId)

  const tallies = useMemo(() => tallyFor(currentPreset), [tallyFor, currentPreset])
  const cost = useMemo(() => basketCost(tallies, { tier }), [tallies, tier])

  // ── Boot ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true)

    const { presets: loaded, upgradeAvailable } = storage.loadPresets(defaultPresets)
    setPresets(loaded)
    const savedId = storage.loadCurrentPresetId()
    setCurrentPresetId(loaded.find((p) => p.id === savedId)?.id ?? loaded[0]?.id ?? null)
    setCollapsed(storage.loadCollapsed())
    setTier(storage.loadTier())
    setMeasure(storage.loadMeasure())

    // Their own presets are in here, so the new defaults are offered, never forced
    if (upgradeAvailable) {
      toast("New built-in presets", {
        description: "Ten shoppers with real prices, replacing the old occasion lists.",
        action: {
          label: "Add them",
          onClick: () => setPresets((prev) => [...defaultPresets, ...prev]),
        },
        duration: 10000,
      })
    }

    // Onboarding queue — at most one blocking surface (docs/DESIGN.md §6.9)
    const incomingPreset = decodePreset(window.location.search)
    if (incomingPreset) {
      setSharedPreset(incomingPreset)
      window.history.replaceState(null, "", window.location.pathname)
    } else {
      const result = decodeList(window.location.search, window.location.hash)
      if (result.ok) {
        setSharedList(result.data)
        setIsDemoList(false)
        window.history.replaceState(null, "", window.location.pathname)
      } else if (result.broken) {
        toast.error("This share link appears to be broken.")
        window.history.replaceState(null, "", window.location.pathname)
      } else if (!storage.hasSeenDemo()) {
        storage.markDemoSeen()
        setSharedList(DEMO_LIST)
        setIsDemoList(true)
      }
    }

    setShowHint(!storage.hasDismissedHint())

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/tap-tap/sw.js").catch(() => {
        /* not served in dev */
      })
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall)
  }, [])

  useEffect(() => {
    if (mounted) storage.savePresets(presets)
  }, [presets, mounted])

  useEffect(() => {
    if (mounted && currentPresetId) storage.saveCurrentPresetId(currentPresetId)
  }, [currentPresetId, mounted])

  useEffect(() => {
    if (mounted) storage.saveCollapsed(collapsed)
  }, [collapsed, mounted])

  useEffect(() => {
    if (mounted) storage.saveTier(tier)
  }, [tier, mounted])

  useEffect(() => {
    if (mounted) storage.saveMeasure(measure)
  }, [measure, mounted])

  // ── Search ─────────────────────────────────────────────────────────────────

  const { visibleByCategory, matchCount } = useMemo(() => {
    const term = fold(search)
    if (!term || !currentPreset) return { visibleByCategory: null, matchCount: null }
    const map = new Map<string, Set<string>>()
    let count = 0
    for (const cat of currentPreset.categories) {
      const matches = cat.items.filter((item) => fold(item.name).includes(term))
      if (matches.length > 0) {
        map.set(cat.id, new Set(matches.map((item) => item.id)))
        count += matches.length
      }
    }
    return { visibleByCategory: map, matchCount: count }
  }, [search, currentPreset])

  const visibleCategories = useMemo(() => {
    if (!currentPreset) return []
    if (!visibleByCategory) return currentPreset.categories
    return currentPreset.categories.filter((cat) => visibleByCategory.has(cat.id))
  }, [currentPreset, visibleByCategory])

  // ── Share ──────────────────────────────────────────────────────────────────

  const shareUrl = useMemo(() => {
    if (!mounted || !currentPreset || total === 0) return ""
    return `${window.location.origin}${window.location.pathname}?list=${encodeList(currentPreset, sel)}`
  }, [mounted, currentPreset, sel, total])

  const handleShare = useCallback(async () => {
    if (!currentPreset || !shareUrl) return
    const text = buildShareText(currentPreset, total, shareUrl, cost.totalCents)
    if (navigator.share) {
      try {
        await navigator.share({ title: `${currentPreset.name} list`, text, url: shareUrl })
      } catch {
        /* user cancelled */
      }
      return
    }
    // Desktop: the URL alone is what people paste; the full blob is for social posts
    await navigator.clipboard.writeText(shareUrl).catch(() => {})
    toast.success("Link copied", {
      description: "Paste it anywhere — or post it on X",
      action: {
        label: "Post on X",
        onClick: () =>
          window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, "_blank"),
      },
    })
  }, [currentPreset, shareUrl, total, cost.totalCents])

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Link copied")
    } catch {
      toast.error("Could not copy the link.")
    }
  }, [shareUrl])

  const handleShareTemplate = useCallback(
    async (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId)
      if (!preset) return
      const url = `${window.location.origin}${window.location.pathname}?preset=${encodePreset(preset)}`
      const text = `I'm using this "${preset.name}" list template on TapTap. Tap to add it — no sign-up.\n\n${url}`
      try {
        if (navigator.share) {
          await navigator.share({ title: `${preset.name} — TapTap preset`, text, url })
          return
        }
      } catch {
        /* fall through to clipboard */
      }
      await navigator.clipboard.writeText(url).catch(() => {})
      toast.success("Template link copied")
    },
    [presets],
  )

  // Cmd/Ctrl+Enter shares. Registered once; reads live values through a ref.
  const shareRef = useRef(handleShare)
  shareRef.current = handleShare
  const totalRef = useRef(total)
  totalRef.current = total

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && totalRef.current > 0) {
        shareRef.current()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // ── Preset & content mutations ─────────────────────────────────────────────

  const updateCurrentPreset = useCallback(
    (fn: (preset: Preset) => Preset) => {
      setPresets((prev) => prev.map((p) => (p.id === currentPresetId ? fn(p) : p)))
    },
    [currentPresetId],
  )

  const handleAddItem = useCallback(
    (catId: string, emoji: string, name: string) => {
      const item: Item = { id: `item-${Date.now()}`, name, emoji }
      updateCurrentPreset((preset) => ({
        ...preset,
        categories: preset.categories.map((cat) =>
          cat.id === catId ? { ...cat, items: [...cat.items, item] } : cat,
        ),
      }))
    },
    [updateCurrentPreset],
  )

  const handleDeleteItem = useCallback(
    (catId: string, itemId: string) => {
      updateCurrentPreset((preset) => ({
        ...preset,
        categories: preset.categories.map((cat) =>
          cat.id === catId ? { ...cat, items: cat.items.filter((i) => i.id !== itemId) } : cat,
        ),
      }))
      removeKey(k(catId, itemId))
    },
    [updateCurrentPreset, removeKey],
  )

  const handleAddCategory = useCallback(
    (name: string, color: string) => {
      const category: Category = { id: `cat-${Date.now()}`, name, color, items: [] }
      updateCurrentPreset((preset) => ({ ...preset, categories: [...preset.categories, category] }))
      setNewCategoryOpen(false)
      toast.success(`"${name}" added — tap + to add items.`)
    },
    [updateCurrentPreset],
  )

  const handleCreatePreset = useCallback((name: string) => {
    const ts = Date.now()
    const preset: Preset = {
      id: `preset-${ts}`,
      name,
      categories: [{ id: `cat-${ts}`, name: "Items", color: PRESET_COLORS[0], items: [] }],
    }
    setPresets((prev) => [...prev, preset])
    setCurrentPresetId(preset.id)
    setNewPresetOpen(false)
    toast.success(`"${name}" created — add your first items.`)
  }, [])

  const handleDeletePreset = useCallback(
    (id: string) => {
      setPresets((prev) => {
        if (prev.length <= 1) {
          toast.error("You need at least one preset.")
          return prev
        }
        const next = prev.filter((p) => p.id !== id)
        if (currentPresetId === id) setCurrentPresetId(next[0]?.id ?? null)
        return next
      })
      forgetPreset(id)
    },
    [currentPresetId, forgetPreset],
  )

  const handleSaveSharedList = useCallback(() => {
    if (!sharedList) return
    const preset = sharedToPreset(sharedList)
    setPresets((prev) => [...prev, preset])
    setCurrentPresetId(preset.id)
    setSharedList(null)
    toast.success(`"${preset.name}" saved — tap items to build your list.`)
  }, [sharedList])

  const handleSaveSharedPreset = useCallback(() => {
    if (!sharedPreset) return
    const ts = Date.now()
    const adopted: Preset = {
      ...sharedPreset,
      id: `preset-${ts}`,
      categories: sharedPreset.categories.map((cat, ci) => ({
        ...cat,
        id: `cat-${ts}-${ci}`,
        items: cat.items.map((item, ii) => ({ ...item, id: `item-${ts}-${ci}-${ii}` })),
      })),
    }
    setPresets((prev) => [...prev, adopted])
    setCurrentPresetId(adopted.id)
    setSharedPreset(null)
    toast.success(`"${adopted.name}" added to your presets.`)
  }, [sharedPreset])

  const handleRestoreDefaults = useCallback(() => {
    setPresets(defaultPresets)
    setCurrentPresetId(defaultPresets[0].id)
    setManagerOpen(false)
    toast.success("Presets restored to defaults.")
  }, [])

  const handleClear = useCallback(() => {
    clear()
    setListSheetOpen(false)
    toast.success("List cleared", {
      action: {
        label: "Undo",
        onClick: () => {
          if (undoClear()) toast.success("List restored")
        },
      },
      duration: 6000,
    })
  }, [clear, undoClear])

  // ── Import / export ────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "taptap-presets.json"
    a.click()
    URL.revokeObjectURL(url)
    setMenuOpen(false)
  }, [presets])

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed: unknown = JSON.parse(ev.target?.result as string)
        const result = storage.parsePresets(parsed)
        if (!result) {
          toast.error("Invalid preset file — please check the format.")
          return
        }
        setPresets(result)
        setCurrentPresetId(result[0]?.id ?? null)
        setMenuOpen(false)
        toast.success("Presets imported.")
      } catch {
        toast.error("Could not read that file.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [])

  // ── Derived ────────────────────────────────────────────────────────────────

  const quantityItem = useMemo(() => {
    if (!quantityTarget || !currentPreset) return null
    const cat = currentPreset.categories.find((c) => c.id === quantityTarget.catId)
    const item = cat?.items.find((i) => i.id === quantityTarget.itemId)
    return item ? { name: item.name, qty: sel[k(cat!.id, item.id)] ?? 0 } : null
  }, [quantityTarget, currentPreset, sel])

  const hintItemId =
    showHint && total === 0 && !search ? (currentPreset?.categories[0]?.items[0]?.id ?? null) : null

  const announcement =
    matchCount !== null
      ? `${matchCount} matching ${plural(matchCount, "item")}`
      : total > 0
        ? `${total} ${plural(total, "item")} in your list${
            cost.totalCents > 0 ? `, ${formatCents(cost.totalCents)}` : ""
          }`
        : ""

  const panelProps = {
    tallies,
    total,
    tier,
    onTierChange: setTier,
    measure,
    onMeasureChange: setMeasure,
    persona: currentPreset?.persona,
    onIncrement: tap,
    onDecrement: dec,
    onRemove: removeKey,
    urlLength: shareUrl.length,
    onShare: handleShare,
    onCopy: handleCopy,
    onClear: () => setConfirmClearOpen(true),
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ "--stack-top": "3.5rem" } as React.CSSProperties}>
      <LiveRegion message={announcement} />

      <AppBar
        search={search}
        onSearchChange={setSearch}
        searchOpen={searchOpen}
        onSearchOpenChange={(open) => {
          setSearchOpen(open)
          if (!open) setSearch("")
        }}
        matchCount={matchCount}
        onOpenMenu={() => setMenuOpen(true)}
      />

      <div className="mx-auto max-w-3xl px-4 lg:grid lg:max-w-[75rem] lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:gap-6 lg:px-6">
        <main className="min-w-0 pb-28 lg:pb-10">
          <div className="py-2">
            <PresetRail
              presets={presets}
              currentId={currentPresetId}
              presetTotals={presetTotals}
              onSelect={setCurrentPresetId}
              onNew={() => setNewPresetOpen(true)}
              onManage={() => setManagerOpen(true)}
            />
          </div>

          {!search && currentPreset?.persona && (
            <PersonaStrip name={currentPreset.name} persona={currentPreset.persona} />
          )}

          {showHint && (
            <HintStrip
              onDismiss={() => {
                storage.markHintDismissed()
                setShowHint(false)
              }}
            />
          )}

          {search && matchCount === 0 && (
            <p className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-[14px]">
              No items match “{search}” in {currentPreset?.name ?? "this preset"}.
            </p>
          )}

          {visibleCategories.map((cat, index) => (
            <CategorySection
              key={cat.id}
              category={cat}
              visibleItemIds={visibleByCategory?.get(cat.id) ?? null}
              sel={sel}
              tier={tier}
              collapsed={!search && !!collapsed[cat.id]}
              editing={editingCat === cat.id}
              searchTerm={search}
              // Only the very first tile gets the pulse — item ids can repeat across
              // categories within a preset
              hintItemId={index === 0 ? hintItemId : null}
              onToggleCollapse={() =>
                setCollapsed((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
              }
              onToggleEditing={() => setEditingCat((prev) => (prev === cat.id ? null : cat.id))}
              onIncrement={(itemId) => tap(cat.id, itemId)}
              onDecrement={(itemId) => dec(cat.id, itemId)}
              onDeleteItem={(itemId) => handleDeleteItem(cat.id, itemId)}
              onEditQuantity={(itemId) => setQuantityTarget({ catId: cat.id, itemId })}
              onAddItem={(emoji, name) => handleAddItem(cat.id, emoji, name)}
            />
          ))}

          {!search && currentPreset && (
            <button
              type="button"
              onClick={() => setNewCategoryOpen(true)}
              className="text-muted-foreground hover:text-foreground hover:border-border-strong flex min-h-14 w-full items-center justify-center gap-2 rounded-md border border-dashed text-[14px] transition-colors"
            >
              <Plus className="size-4" />
              Add category
            </button>
          )}
        </main>

        {/* Expanded: the list is permanently on screen, so there is no bottom bar */}
        <div className="hidden lg:block">
          <div className="sticky top-[calc(var(--stack-top)+1rem)] py-2">
            <ListPanel {...panelProps} />
          </div>
        </div>
      </div>

      <ListBar
        tallies={tallies}
        total={total}
        tier={tier}
        measure={measure}
        onExpand={() => setListSheetOpen(true)}
        onShare={handleShare}
      />

      {/* Compact: same panel, hosted in a sheet */}
      <ResponsiveDialog
        open={listSheetOpen}
        onOpenChange={setListSheetOpen}
        forceSheet
        title="Your list"
        description={`${total} ${plural(total, "item")} across ${tallies.length} ${plural(tallies.length, "group")}${
          cost.totalCents > 0 ? ` · ${formatCents(cost.totalCents)}` : ""
        }`}
        footer={<ListPanelActions {...panelProps} />}
      >
        <ListPanelBody {...panelProps} />
      </ResponsiveDialog>

      {sharedList && (
        <SharedListDialog
          data={sharedList}
          isDemo={isDemoList}
          onSave={handleSaveSharedList}
          onDismiss={() => setSharedList(null)}
        />
      )}

      {sharedPreset && (
        <PresetTemplateDialog
          preset={sharedPreset}
          onSave={handleSaveSharedPreset}
          onDismiss={() => setSharedPreset(null)}
        />
      )}

      {quantityTarget && quantityItem && (
        <QuantityDialog
          itemName={quantityItem.name}
          qty={quantityItem.qty}
          onSubmit={(next) => {
            setQty(quantityTarget.catId, quantityTarget.itemId, next)
            setQuantityTarget(null)
          }}
          onClose={() => setQuantityTarget(null)}
        />
      )}

      <NewPresetDialog
        open={newPresetOpen}
        onOpenChange={setNewPresetOpen}
        onCreate={handleCreatePreset}
      />

      <NewCategoryDialog
        open={newCategoryOpen}
        onOpenChange={setNewCategoryOpen}
        onCreate={handleAddCategory}
      />

      <PresetManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        presets={presets}
        currentId={currentPresetId}
        onDelete={setPendingDeletePreset}
        onShareTemplate={handleShareTemplate}
        onRestoreDefaults={handleRestoreDefaults}
      />

      <MenuSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        canInstall={!!installPrompt}
        onInstall={async () => {
          if (!installPrompt) return
          await installPrompt.prompt()
          const { outcome } = await installPrompt.userChoice
          if (outcome === "accepted") setInstallPrompt(null)
          setMenuOpen(false)
        }}
        onExport={handleExport}
        onImport={handleImport}
      />

      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Clear your list?"
        description={`This removes all ${total} ${plural(total, "item")}. You can undo straight after.`}
        confirmLabel="Clear list"
        onConfirm={handleClear}
      />

      <ConfirmDialog
        open={pendingDeletePreset !== null}
        onOpenChange={(open) => !open && setPendingDeletePreset(null)}
        title="Delete this preset?"
        description={`"${presets.find((p) => p.id === pendingDeletePreset)?.name ?? ""}" and its items will be removed from this browser. This cannot be undone.`}
        confirmLabel="Delete preset"
        onConfirm={() => {
          if (pendingDeletePreset) handleDeletePreset(pendingDeletePreset)
          setPendingDeletePreset(null)
        }}
      />

      <footer className="text-muted-foreground mx-auto max-w-3xl px-4 pb-24 text-center text-[12px] lg:max-w-[75rem] lg:pb-8">
        Your lists stay in this browser. Shared lists travel inside the link — nothing is
        stored on a server.
      </footer>
    </div>
  )
}
