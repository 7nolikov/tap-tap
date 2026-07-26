"use client"

import { ArrowRight, Hand, ListChecks, Send, X } from "lucide-react"

/**
 * The whole onboarding, in one line. Replaces a 30-word paragraph nobody read plus
 * two competing first-run interruptions.
 */
export function HintStrip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="border-primary/25 bg-primary/8 mb-3 flex items-center gap-2 rounded-md border px-3 py-2">
      <ol className="flex flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium">
        <Step icon={<Hand className="size-3.5" />} label="Tap items" />
        <ArrowRight className="text-muted-foreground size-3" aria-hidden="true" />
        <Step icon={<ListChecks className="size-3.5" />} label="See your list" />
        <ArrowRight className="text-muted-foreground size-3" aria-hidden="true" />
        <Step icon={<Send className="size-3.5" />} label="Send a link" />
      </ol>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss hint"
        className="text-muted-foreground hover:text-foreground -mr-1 flex size-9 shrink-0 items-center justify-center rounded-md transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function Step({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="text-primary" aria-hidden="true">
        {icon}
      </span>
      {label}
    </li>
  )
}
