"use client"

import { useMemo } from "react"
import { formatCentsShort } from "@/lib/economics"
import { defaultPresets } from "@/lib/presets"
import { plural } from "@/lib/text"
import type { Persona } from "@/lib/types"

/** Weekly spend per head — the axis the preset rail is ordered along. */
const perPerson = (p: Persona) => p.weeklyBudgetCents / p.household

/**
 * The spread the built-in presets cover, computed rather than hard-coded so adding a
 * new archetype cannot silently push the marker off the end of the track.
 */
function useSpectrum() {
  return useMemo(() => {
    const values = defaultPresets
      .map((preset) => preset.persona)
      .filter((persona): persona is Persona => persona != null)
      .map(perPerson)
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [])
}

/**
 * Says who a preset is for, and where they sit relative to the other nine.
 *
 * The presets are archetypes at the edges of the spending distribution, which is only
 * useful information if the edges are visible. A number on its own ("€36 per person")
 * means nothing without the range it sits in; the track supplies the range, so one
 * glance places this shopper against every other one in the app.
 */
export function PersonaStrip({ name, persona }: { name: string; persona: Persona }) {
  const { min, max } = useSpectrum()
  const value = perPerson(persona)
  const position = max > min ? (value - min) / (max - min) : 0.5

  return (
    <section
      aria-label="About this preset"
      className="bg-surface-2/60 mb-2 rounded-md px-3 py-2.5"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2 className="text-[14px] font-semibold tracking-[-0.005em]">{name}</h2>
        <p className="text-muted-foreground min-w-0 flex-1 text-[12px] leading-4">
          {persona.who}
        </p>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span data-numeric className="text-muted-foreground shrink-0 text-[11px]">
          {formatCentsShort(min)}
        </span>

        <div
          className="bg-surface-2 relative h-1.5 min-w-0 flex-1 rounded-full"
          role="img"
          aria-label={`${formatCentsShort(value)} per person per week — ${persona.household} ${plural(
            persona.household,
            "person",
            "people",
          )} on ${formatCentsShort(persona.weeklyBudgetCents)} a week. Range across presets: ${formatCentsShort(
            min,
          )} to ${formatCentsShort(max)}.`}
        >
          <span
            className="bg-primary absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${position * 100}%` }}
          />
        </div>

        <span data-numeric className="text-muted-foreground shrink-0 text-[11px]">
          {formatCentsShort(max)}
        </span>
      </div>

      <p className="text-muted-foreground mt-1.5 text-[11px] leading-4">
        <span data-numeric className="text-foreground font-semibold">
          {formatCentsShort(value)}
        </span>{" "}
        per person per week ·{" "}
        <span data-numeric>{persona.household}</span>{" "}
        {plural(persona.household, "person", "people")} on{" "}
        <span data-numeric>{formatCentsShort(persona.weeklyBudgetCents)}</span>
      </p>
    </section>
  )
}
