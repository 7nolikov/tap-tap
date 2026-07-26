"use client"

import { ChevronUp, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DistributionBar } from "@/components/list-panel"
import { plural } from "@/lib/text"
import type { CategoryTally } from "@/hooks/use-selection"

/**
 * Compact/Medium bottom bar. Persistent answer to "what have I picked so far?" —
 * previously the app showed no count at all.
 */
export function ListBar({
  tallies,
  total,
  onExpand,
  onShare,
}: {
  tallies: CategoryTally[]
  total: number
  onExpand: () => void
  onShare: () => void
}) {
  if (total === 0) return null

  return (
    <div
      data-taptap-sheet
      data-state="open"
      className="bg-surface/95 shadow-e3 pb-safe fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onExpand}
          aria-label={`Show your list, ${total} ${plural(total, "item")}`}
          className="hover:bg-surface-2 -mx-1.5 flex min-h-11 flex-1 flex-col justify-center gap-1.5 rounded-md px-1.5 text-left transition-colors"
        >
          <DistributionBar tallies={tallies} total={total} height="h-1.5" />
          <span className="flex items-center gap-1 text-[13px] font-medium">
            <span data-numeric>{total}</span> {plural(total, "item")}
            <span className="text-muted-foreground">
              · {tallies.length} {plural(tallies.length, "group")}
            </span>
            <ChevronUp className="text-muted-foreground ml-0.5 size-3.5" aria-hidden="true" />
          </span>
        </button>

        <Button onClick={onShare} className="h-11 shrink-0 gap-2 px-5">
          <Share2 className="size-4" />
          Share
        </Button>
      </div>
    </div>
  )
}
