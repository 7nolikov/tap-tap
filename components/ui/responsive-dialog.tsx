"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsExpanded } from "@/hooks/use-media-query"

/**
 * One modal primitive for the whole app: a bottom sheet on phones, a centred dialog
 * from 1024px up. Both are the same Radix dialog, so focus trapping, escape handling
 * and labelling behave identically.
 */

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  /** Rendered under the title and wired as the accessible description. */
  description?: React.ReactNode
  /** Pinned below the scrolling body — actions live here so they stay reachable. */
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Force sheet presentation regardless of breakpoint. */
  forceSheet?: boolean
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
  forceSheet = false,
}: ResponsiveDialogProps) {
  const isExpanded = useIsExpanded()
  const asSheet = forceSheet || !isExpanded

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-taptap-overlay
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
        />
        <DialogPrimitive.Content
          data-taptap-sheet={asSheet ? "" : undefined}
          data-taptap-dialog={asSheet ? undefined : ""}
          className={cn(
            "bg-surface text-foreground fixed z-50 flex flex-col border shadow-e2 outline-none",
            asSheet
              ? "inset-x-0 bottom-0 max-h-[88vh] rounded-t-xl border-b-0 pb-safe"
              : "top-1/2 left-1/2 w-[min(32rem,calc(100vw-3rem))] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-lg",
            className,
          )}
        >
          {asSheet && (
            /* Drag affordance — signals dismissibility even though dismissal is by tap */
            <div className="flex justify-center pt-2.5 pb-1" aria-hidden="true">
              <div className="bg-border-strong h-1 w-9 rounded-full" />
            </div>
          )}

          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-[18px] leading-6 font-semibold tracking-[-0.01em]">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-muted-foreground mt-1.5 text-[13px] leading-5">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                /* Radix warns when a dialog has no description; an empty one is enough */
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="text-muted-foreground hover:bg-surface-2 hover:text-foreground -mt-1 -mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>

          {footer && <div className="border-t px-5 py-3.5">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
