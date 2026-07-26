"use client"

import { useEffect, useState } from "react"

/**
 * SSR-safe media query. Always reports `false` on the first client render so the
 * markup matches the server output, then settles after hydration.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}

/** The two-pane breakpoint from docs/DESIGN.md §5.1. */
export const useIsExpanded = () => useMediaQuery("(min-width: 1024px)")
