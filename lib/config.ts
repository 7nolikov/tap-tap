/**
 * Single source of truth for the deployed origin.
 *
 * Imported by both the server-rendered metadata in `app/layout.tsx` and the client
 * share helpers. Previously duplicated in both files, which drifted (one had a
 * trailing slash, one did not).
 *
 * When a custom domain is registered, this constant and `basePath` in
 * `next.config.mjs` are the only two places that change. See EXECUTION_PLAN.md L2.
 */
export const APP_URL = "https://7nolikov.github.io/tap-tap"

/**
 * The whole list is encoded into the URL, so link length is a product constraint.
 * Chat clients and link previewers start truncating well before the browser limit,
 * so the budget is deliberately conservative.
 */
export const LINK_BUDGET = {
  /** Sends anywhere without truncation. */
  safe: 900,
  /** Works in most places; worth flagging. */
  caution: 1600,
  /** Hard ceiling used for the gauge's full scale. */
  max: 2000,
} as const
