"use client"

import { useEffect, useState } from "react"

/**
 * Announces selection and search changes to screen readers. Debounced so rapid
 * tapping produces one settled announcement rather than a stream of interruptions.
 */
export function LiveRegion({ message }: { message: string }) {
  const [announced, setAnnounced] = useState("")

  useEffect(() => {
    const id = setTimeout(() => setAnnounced(message), 400)
    return () => clearTimeout(id)
  }, [message])

  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announced}
    </p>
  )
}
