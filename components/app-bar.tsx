"use client"

import { useEffect, useRef } from "react"
import { MoreHorizontal, Moon, Search, Sun, X } from "lucide-react"
import { useTheme } from "next-themes"
import { Input } from "@/components/ui/input"

export function AppBar({
  search,
  onSearchChange,
  searchOpen,
  onSearchOpenChange,
  matchCount,
  onOpenMenu,
}: {
  search: string
  onSearchChange: (value: string) => void
  searchOpen: boolean
  onSearchOpenChange: (open: boolean) => void
  /** null when no search is active. */
  matchCount: number | null
  onOpenMenu: () => void
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  // "/" focuses search, matching the convention users already know from other apps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target && /^(INPUT|TEXTAREA)$/.test(target.tagName)
      if (e.key === "/" && !typing) {
        e.preventDefault()
        onSearchOpenChange(true)
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onSearchOpenChange])

  const searchField = (
    <div className="relative w-full">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onSearchChange("")
            onSearchOpenChange(false)
          }
        }}
        type="search"
        placeholder="Search items…"
        aria-label="Search items"
        className="h-11 pr-9 pl-9"
      />
      {search && (
        <button
          type="button"
          onClick={() => onSearchChange("")}
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )

  return (
    <header className="bg-surface/92 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 lg:max-w-[75rem]">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-[20px] leading-6 font-bold tracking-[-0.02em]">TapTap</span>
          <span className="text-muted-foreground hidden text-[12px] md:inline">
            tap · see · send
          </span>
        </div>

        <div className="ml-auto hidden w-80 lg:block">{searchField}</div>

        <div className="ml-auto flex items-center gap-0.5 lg:ml-2">
          <button
            type="button"
            onClick={() => onSearchOpenChange(!searchOpen)}
            aria-label={searchOpen ? "Close search" : "Search items"}
            aria-expanded={searchOpen}
            className="hover:bg-surface-2 flex size-11 items-center justify-center rounded-md transition-colors lg:hidden"
          >
            {searchOpen ? <X className="size-[18px]" /> : <Search className="size-[18px]" />}
          </button>

          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle dark mode"
            className="hover:bg-surface-2 flex size-11 items-center justify-center rounded-md transition-colors"
          >
            {/* Swapped by CSS rather than by `resolvedTheme`, which is undefined on the
                server and would cause a hydration mismatch */}
            <Sun className="size-[18px] dark:hidden" />
            <Moon className="hidden size-[18px] dark:block" />
          </button>

          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="More options"
            className="hover:bg-surface-2 flex size-11 items-center justify-center rounded-md transition-colors"
          >
            <MoreHorizontal className="size-[18px]" />
          </button>
        </div>
      </div>

      {/* Compact search opens as its own row so the keyboard never covers the results */}
      {searchOpen && (
        <div className="mx-auto max-w-3xl px-4 pb-3 lg:hidden">
          {searchField}
          {matchCount !== null && (
            <p className="text-muted-foreground mt-1.5 text-[12px]">
              <span data-numeric>{matchCount}</span> matching {matchCount === 1 ? "item" : "items"}
            </p>
          )}
        </div>
      )}
    </header>
  )
}
