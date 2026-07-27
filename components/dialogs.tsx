"use client"

import { useEffect, useState } from "react"
import { Download, Github, Smartphone, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { adjustCents, DEFAULT_TIER, formatCents } from "@/lib/economics"
import { PRESET_COLORS } from "@/lib/presets"
import { groupShared } from "@/lib/share"
import { plural } from "@/lib/text"
import type { Preset, ShareData } from "@/lib/types"

// ─── Shared list / demo ───────────────────────────────────────────────────────

export function SharedListDialog({
  data,
  isDemo,
  onSave,
  onDismiss,
}: {
  data: ShareData
  isDemo: boolean
  onSave: () => void
  onDismiss: () => void
}) {
  const groups = groupShared(data)
  const total = data.i.reduce((s, item) => s + item.q, 0)

  // Priced at the standard tier: this is someone else's list, and their supermarket is
  // not a fact we know. The recipient's own tier applies once they save it.
  const totalCents = data.i.reduce(
    (sum, item) => sum + (item.p != null ? adjustCents(item.p, { tier: DEFAULT_TIER }) * item.q : 0),
    0,
  )

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onDismiss()}
      title={
        <span className="flex items-center gap-2">
          {data.n}
          {isDemo && (
            <span className="bg-primary/15 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
              demo
            </span>
          )}
        </span>
      }
      description={
        isDemo
          ? "This is what receiving a shared list looks like. Save it, or start from scratch."
          : `${total} ${plural(total, "item")} across ${groups.length} ${plural(groups.length, "group")}${
              totalCents > 0 ? ` · about ${formatCents(totalCents)}` : ""
            }.`
      }
      footer={
        <div className="flex flex-col gap-2">
          <Button onClick={onSave} className="h-11 w-full">
            {isDemo ? "Use this list" : "Save & start tapping"}
          </Button>
          <Button onClick={onDismiss} variant="ghost" className="h-11 w-full">
            {isDemo ? "Start from scratch" : "Dismiss"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.name}>
            <p
              className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase"
              style={group.color ? { color: group.color } : undefined}
            >
              {group.color && (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: group.color }}
                  aria-hidden="true"
                />
              )}
              {group.name}
            </p>
            <ul className="space-y-0.5 pl-3.5">
              {group.items.map((item, i) => (
                <li key={i} className="flex items-baseline gap-2 text-[14px]">
                  <span aria-hidden="true">{item.e}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {item.l}
                    {item.u && (
                      <span data-numeric className="text-muted-foreground text-[11px]">
                        {" "}
                        {item.u}
                      </span>
                    )}
                  </span>
                  {item.p != null && (
                    <span data-numeric className="text-muted-foreground text-[12px]">
                      {formatCents(adjustCents(item.p, { tier: DEFAULT_TIER }) * item.q)}
                    </span>
                  )}
                  <span data-numeric className="text-muted-foreground">
                    ×{item.q}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ResponsiveDialog>
  )
}

// ─── Incoming preset template ─────────────────────────────────────────────────

export function PresetTemplateDialog({
  preset,
  onSave,
  onDismiss,
}: {
  preset: Preset
  onSave: () => void
  onDismiss: () => void
}) {
  const itemCount = preset.categories.reduce((s, c) => s + c.items.length, 0)
  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onDismiss()}
      title="Preset template"
      description={
        <>
          Someone shared the <strong>{preset.name}</strong> template — {itemCount}{" "}
          {plural(itemCount, "item")}, nothing pre-selected.
        </>
      }
      footer={
        <div className="flex flex-col gap-2">
          <Button onClick={onSave} className="h-11 w-full">
            Add to my presets
          </Button>
          <Button onClick={onDismiss} variant="ghost" className="h-11 w-full">
            Dismiss
          </Button>
        </div>
      }
    >
      <ul className="space-y-1">
        {preset.categories.map((cat) => (
          <li key={cat.id} className="flex items-center gap-2 text-[14px]">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: cat.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate font-medium">{cat.name}</span>
            <span data-numeric className="text-muted-foreground text-[12px]">
              {cat.items.length}
            </span>
          </li>
        ))}
      </ul>
    </ResponsiveDialog>
  )
}

// ─── Quantity ─────────────────────────────────────────────────────────────────

export function QuantityDialog({
  itemName,
  qty,
  onSubmit,
  onClose,
}: {
  itemName: string
  qty: number
  onSubmit: (qty: number) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(String(qty || 1))

  useEffect(() => setValue(String(qty || 1)), [qty, itemName])

  const commit = () => {
    const parsed = Number.parseInt(value, 10)
    onSubmit(Number.isFinite(parsed) ? parsed : 0)
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`How many ${itemName}?`}
      footer={
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-muted-foreground hover:text-destructive h-11 flex-1"
            onClick={() => onSubmit(0)}
          >
            Remove
          </Button>
          <Button className="h-11 flex-[2]" onClick={commit}>
            Set quantity
          </Button>
        </div>
      }
    >
      <div className="flex items-center gap-2 py-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`Quantity for ${itemName}`}
          className="h-14 text-center text-[22px] font-semibold"
          autoFocus
        />
        <div className="flex gap-1">
          {[1, 2, 3, 6, 12].map((n) => (
            <button
              key={n}
              type="button"
              data-numeric
              onClick={() => setValue(String(n))}
              className="bg-surface-2 hover:bg-border flex size-11 items-center justify-center rounded-sm text-[14px] font-semibold transition-colors"
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </ResponsiveDialog>
  )
}

// ─── Confirm ──────────────────────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onOpenChange,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-destructive text-destructive-foreground h-11 flex-1 hover:opacity-90"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="h-1" />
    </ResponsiveDialog>
  )
}

// ─── Text prompt (new preset / new category) ──────────────────────────────────

export function NewPresetDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void
}) {
  const [name, setName] = useState("")

  const submit = () => {
    if (!name.trim()) return
    onCreate(name.trim())
    setName("")
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setName("")
        onOpenChange(next)
      }}
      title="New preset"
      description="A preset is a reusable template — a set of categories and items you tap from."
      footer={
        <Button className="h-11 w-full" onClick={submit} disabled={!name.trim()}>
          Create preset
        </Button>
      }
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="e.g. 🎂 Birthday Party"
        aria-label="Preset name"
        className="h-11"
        autoFocus
      />
    </ResponsiveDialog>
  )
}

export function NewCategoryDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, color: string) => void
}) {
  const [name, setName] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])

  const submit = () => {
    if (!name.trim()) return
    onCreate(name.trim(), color)
    setName("")
    setColor(PRESET_COLORS[0])
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setName("")
        onOpenChange(next)
      }}
      title="New category"
      description="Categories group items and give them their colour in your list."
      footer={
        <Button className="h-11 w-full" onClick={submit} disabled={!name.trim()}>
          Add category
        </Button>
      }
    >
      <div className="space-y-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. Spices, Frozen Foods…"
          aria-label="Category name"
          className="h-11"
          autoFocus
        />
        <fieldset>
          <legend className="text-muted-foreground mb-2 text-[12px]">Colour</legend>
          <div className="flex flex-wrap gap-1">
            {PRESET_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setColor(option)}
                aria-label={`Colour ${option}`}
                aria-pressed={color === option}
                className="flex size-11 items-center justify-center rounded-sm"
              >
                <span
                  className="block size-7 rounded-full transition-transform"
                  style={{
                    backgroundColor: option,
                    outline: color === option ? `2px solid ${option}` : "none",
                    outlineOffset: "3px",
                  }}
                />
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </ResponsiveDialog>
  )
}

// ─── Preset manager ───────────────────────────────────────────────────────────

export function PresetManagerDialog({
  open,
  onOpenChange,
  presets,
  currentId,
  onDelete,
  onShareTemplate,
  onRestoreDefaults,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  presets: Preset[]
  currentId: string | null
  onDelete: (id: string) => void
  onShareTemplate: (id: string) => void
  onRestoreDefaults: () => void
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Manage presets"
      description="Share a preset as a reusable template, or remove ones you don't use."
      footer={
        <Button variant="outline" className="h-11 w-full" onClick={onRestoreDefaults}>
          Restore default presets
        </Button>
      }
    >
      <ul className="space-y-0.5">
        {presets.map((preset) => (
          <li
            key={preset.id}
            className="hover:bg-surface-2 flex items-center gap-2 rounded-sm py-1 pr-0.5 pl-2 transition-colors"
          >
            <span className="flex min-w-0 flex-1 flex-col py-0.5">
              <span
                className={`truncate text-[14px] ${preset.id === currentId ? "font-semibold" : ""}`}
              >
                {preset.name}
              </span>
              {preset.persona && (
                <span className="text-muted-foreground truncate text-[11px] leading-4">
                  {preset.persona.who}
                </span>
              )}
            </span>
            <span data-numeric className="text-muted-foreground text-[12px]">
              {preset.categories.reduce((s, c) => s + c.items.length, 0)}
            </span>
            <button
              type="button"
              onClick={() => onShareTemplate(preset.id)}
              aria-label={`Share ${preset.name} as a template`}
              className="text-muted-foreground hover:text-foreground flex size-10 items-center justify-center rounded-md transition-colors"
            >
              <Upload className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(preset.id)}
              disabled={presets.length <= 1}
              aria-label={`Delete ${preset.name}`}
              className="text-muted-foreground hover:text-destructive flex size-10 items-center justify-center rounded-md transition-colors disabled:opacity-30"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </ResponsiveDialog>
  )
}

// ─── Overflow menu / about ────────────────────────────────────────────────────

export function MenuSheet({
  open,
  onOpenChange,
  canInstall,
  onInstall,
  onExport,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  canInstall: boolean
  onInstall: () => void
  onExport: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="TapTap">
      <div className="space-y-1">
        {canInstall && (
          <MenuRow icon={<Smartphone className="size-4" />} onClick={onInstall}>
            Install as an app
          </MenuRow>
        )}
        <MenuRow icon={<Download className="size-4" />} onClick={onExport}>
          Export presets
        </MenuRow>
        <label className="hover:bg-surface-2 flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-[14px] transition-colors">
          <span className="text-muted-foreground">
            <Upload className="size-4" />
          </span>
          Import presets
          <input type="file" accept=".json,application/json" onChange={onImport} className="sr-only" />
        </label>
        <a
          href="https://github.com/7nolikov/tap-tap"
          target="_blank"
          rel="noreferrer noopener"
          className="hover:bg-surface-2 flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-[14px] transition-colors"
        >
          <span className="text-muted-foreground">
            <Github className="size-4" />
          </span>
          Source code
        </a>
      </div>

      <div className="text-muted-foreground mt-4 border-t pt-4 text-[13px] leading-5">
        <p className="text-foreground mb-1 font-medium">Where your data lives</p>
        <p>
          Your presets stay in this browser. Nothing is sent to a server — a shared list is
          encoded entirely inside the link, so whoever opens it gets the list and nothing else.
        </p>
      </div>
    </ResponsiveDialog>
  )
}

function MenuRow({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-surface-2 flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-[14px] transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </button>
  )
}
