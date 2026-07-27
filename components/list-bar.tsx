"use client"

import { ChevronUp, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DistributionBar, countSegments, type Measure } from "@/components/list-panel"
import { basketCost, formatCents, type StoreTierId } from "@/lib/economics"
import { plural } from "@/lib/text"
import type { CategoryTally } from "@/hooks/use-selection"

/**
 * Compact/Medium bottom bar. Persistent answer to "what have I picked so far?" —
 * previously the app showed no count at all.
 *
 * Mirrors whichever measure the panel is set to, so the bar and the sheet never show
 * two different pictures of the same basket. The running total is always visible: on a
 * phone in an aisle it is the number that changes what you do next.
 */
export function ListBar({
  tallies,
  total,
  tier,
  measure,
  onExpand,
  onShare,
}: {
  tallies: CategoryTally[]
  total: number
  tier: StoreTierId
  measure: Measure
  onExpand: () => void
  onShare: () => void
}) {
  const cost = basketCost(tallies, { tier })
  const segments =
    measure === "cost" && cost.byCategory.length > 0
      ? cost.byCategory.map((cat) => ({ ...cat, value: cat.cents }))
      : countSegments(tallies)

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
          aria-label={`Show your list, ${total} ${plural(total, "item")}, ${formatCents(cost.totalCents)}`}
          className="hover:bg-surface-2 -mx-1.5 flex min-h-11 flex-1 flex-col justify-center gap-1.5 rounded-md px-1.5 text-left transition-colors"
        >
          <DistributionBar
            segments={segments}
            height="h-1.5"
            format={measure === "cost" ? formatCents : String}
          />
          <span className="flex items-center gap-1 text-[13px] font-medium">
            <span data-numeric>{total}</span> {plural(total, "item")}
            {cost.totalCents > 0 && (
              <span className="text-muted-foreground" data-numeric>
                · {formatCents(cost.totalCents)}
              </span>
            )}
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
