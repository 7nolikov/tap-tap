# TapTap — Execution Plan

_Last updated: 2026-07-26 — UI/UX rework_

Companion to [`docs/DESIGN.md`](docs/DESIGN.md). Audit finding IDs (`A1`…`A35`) refer to
§2 of that document.

---

## Status summary

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Design specification | ✅ Done |
| 1 | Foundations — tokens, colour utilities, dead code | ✅ Done |
| 2 | Domain extraction out of `page.tsx` | ✅ Done |
| 3 | Component layer | ✅ Done |
| 4 | Page recomposition + responsive layout | ✅ Done |
| 5 | Accessibility & input correctness | ✅ Done |
| 6 | Verification | ✅ Done |
| 7 | Launch items (owner action) | ⏸ Blocked on owner |

---

## Phase 1 — Foundations

### T1.1 — Rebuild the token layer ✅
`app/globals.css`

- Replace the amber theme with the OKLCH surface/foreground/border scale from DESIGN §4.1.
- Add `--surface-2`, `--border-strong`, elevation `--e1..--e3`, motion `--dur-*`/`--ease`.
- Remove the three-stop page gradient (A19) and the amber `--border` (A20).
- Add a global `prefers-reduced-motion` block (A26).
- Add `.focus-ring`, `.tabular`, `.hide-scrollbar`, safe-area helpers.

**Accept:** no `font-serif` anywhere; dark-mode item tints visible; `pnpm build` clean.

### T1.2 — Colour utilities ✅
`lib/color.ts`

- `tint(hex, pct)` → `color-mix(in oklab, hex pct%, transparent)` (A18).
- `readableOn(hex)` → WCAG-luminance-derived `#fff` / `#1a1a1a` (A17).
- `mixWith(hex, other, pct)` for borders.

**Accept:** white text never rendered on amber/lime/emerald tiles.

### T1.3 — Fix the category palette ✅
`lib/presets.ts`

- Replace duplicate `#d97706` with `#84cc16` in `PRESET_COLORS` (A21).

### T1.4 — Delete dead code ✅

- `hooks/use-toast.ts` (A31), `hooks/use-mobile.ts` (A31)
- `styles/globals.css` (A32)
- `tailwind.config.js` (A33 — inert under Tailwind v4)
- `components/ui/{card,alert,dialog,select}.tsx` — unreferenced after the rework
- `@radix-ui/react-select` dependency (its only consumer was the preset dropdown)
- `types/dom-fix.d.ts` — obsolete once T6.1 fixed the real cause
- `docs/htmx/` — removed on the assumption it was a vendored dependency. It was not:
  `/docs` is gitignored local reference material. Not recoverable from git; re-clone
  from `https://github.com/bigskysoftware/htmx` if it is still wanted. The other
  reference checkouts under `/docs` were left alone.

**Accept:** ✅ `grep -r "use-toast\|use-mobile\|ui/select\|ui/card\|ui/alert\|ui/dialog"`
over `app/ components/ lib/ hooks/` returns nothing; build and typecheck pass.

---

## Phase 2 — Domain extraction

`app/page.tsx` was 1,923 lines with data, schemas, encoding, and every view inline.

### T2.1 — `lib/types.ts` ✅
`Item`, `Category`, `Preset`, `SharedItem`, `ShareData`, `Selection`, and the Zod
schemas. Single source of truth for validation.

### T2.2 — `lib/presets.ts` ✅
`PRESET_COLORS`, `defaultPresets` (16), `DEMO_LIST`.

### T2.3 — `lib/share.ts` ✅
`APP_URL` (one constant, imported by both `layout.tsx` and the app — fixes the historic
duplication), `encodeList`, `decodeList`, `encodePreset`, `decodePreset`,
`sharedToPreset`, `buildShareText`, `linkBudget()` for the size meter (A4).

**Accept:** `?list=v2:`, legacy `?list=<base64>` and `#list=` all still decode.

### T2.4 — `lib/storage.ts` ✅
Namespaced keys, schema-validated read, quota-safe write, and per-preset selection
persistence in `sessionStorage` (DESIGN §7.2).

### T2.5 — `hooks/use-selection.ts` ✅
Selection state machine: `tap`, `dec`, `setQty`, `remove`, `clear`, `restore`,
derived `total`, `byCategory`, `presetTotals`. Owns the undo snapshot.

### T2.6 — `hooks/use-media-query.ts` ✅
SSR-safe `useMediaQuery` for the Compact/Expanded switch.

---

## Phase 3 — Component layer

| Task | Component | Fixes | Status |
|------|-----------|-------|--------|
| T3.1 | `AppBar` — wordmark, search toggle, theme, overflow menu | A8, A24 | ✅ |
| T3.2 | `PresetRail` — snap-scrolling chip tablist with per-preset badges | A5 | ✅ |
| T3.3 | `SearchBar` — live cross-category filter with match highlighting | A6 | ✅ |
| T3.4 | `CategorySection` — collapsible section, selected-count pill, empty state | A3, A7, A30 | ✅ |
| T3.5 | `ItemTile` — `<button aria-pressed>`, 44 px steppers, long-press quantity, haptics, pointer-guarded hover | A9–A14, A22, A25 | ✅ |
| T3.6 | `ListPanel` — grouped selection, distribution bar, link meter, actions | A1, A2, A4 | ✅ |
| T3.7 | `ListBar` — bottom summary with safe-area inset | A2, A27 | ✅ |
| T3.8 | `ResponsiveDialog` — sheet on Compact, dialog on Expanded | — | ✅ |
| T3.9 | `SharedListDialog`, `PresetTemplateDialog`, `QuantityDialog`, `ConfirmDialog`, `AboutSheet`, `PresetManagerDialog` | A15, A28 | ✅ |
| T3.10 | `Onboarding` — single-interruption queue + hint strip + first-tile pulse | A28, A29 | ✅ |
| T3.11 | `LiveRegion` — debounced polite announcements | A23 | ✅ |

---

## Phase 4 — Page recomposition

### T4.1 — Responsive shell ✅
- Compact/Medium: single column + `ListBar` + expandable `ListPanel` sheet.
- Expanded (≥1024 px): two-pane grid, 360 px sticky `ListPanel`, no bottom bar.
- Content max-width 720 px below Expanded, 1200 px above.

### T4.2 — Wire state ✅
Selection hook, search, collapse state, onboarding queue, share handlers, preset CRUD,
import/export, PWA install prompt.

**Accept:** `app/page.tsx` reduced to composition; no data or encoding logic left in it.

---

## Phase 5 — Accessibility & input correctness

| Task | Fix | Status |
|------|-----|--------|
| T5.1 | Tiles keyboard-operable, `aria-pressed`, descriptive labels | A22 | ✅ |
| T5.2 | Live region for count + search results | A23 | ✅ |
| T5.3 | `aria-label` on every icon-only control | A24 | ✅ |
| T5.4 | Count badge so selection is not colour-only | A25 | ✅ |
| T5.5 | Global reduced-motion handling | A26 | ✅ |
| T5.6 | `env(safe-area-inset-bottom)` on the bottom bar | A27 | ✅ |
| T5.7 | Clear/delete confirmation + 6 s undo | A15 | ✅ |
| T5.8 | Emoji input uses grapheme-safe truncation (`Intl.Segmenter`) | A14 | ✅ |
| T5.9 | Direct quantity entry (long-press / badge tap) | A10 | ✅ |
| T5.10 | Toast placement per breakpoint, clear of the action bar | — | ✅ |
| T5.11 | Focus ring on all interactive elements | — | ✅ |

---

## Phase 6 — Verification

### T6.1 — Restore real type checking ✅

The diagnosis recorded in `next.config.mjs` was wrong. It blamed a "known `@types/node`
vs DOM lib conflict" and worked around it with `types/dom-fix.d.ts` plus
`typescript.ignoreBuildErrors: true`.

The actual cause: `tsconfig.json` had `include: ["**/*.ts", "**/*.tsx"]` and excluded
only `node_modules`. `/docs` is a gitignored folder of local reference checkouts
(supabase, tailwindcss.com, telegram-apps — several GB), and one of them,
`docs/supabase/apps/studio/public/deno/lib.deno.d.ts`, begins with:

```
/// <reference no-default-lib="true" />
```

That directive strips the default libraries from the **entire** program, so `lib.dom`
was never loaded — confirmed with `tsc --listFiles`. Every DOM symbol then fell back to
the empty stub interfaces in `@types/react/global.d.ts`, which is why the errors looked
like `Property 'focus' does not exist on type 'HTMLInputElement'` and
`Cannot find name 'document'`.

**Fix:** add `docs`, `out` and `.next` to `tsconfig.json`'s `exclude`. With that one
line, all errors disappear; `types/dom-fix.d.ts` and `ignoreBuildErrors` were both
deleted as unnecessary.

**Accept:** ✅ `pnpm typecheck` passes with zero errors and no suppression.

### T6.2 — Build ✅
`pnpm build` produces a clean static export with TypeScript checking enabled, and no CSS
warnings. (An earlier arbitrary-variant typo, `[@media(hover:hover)and(pointer:fine)]`,
emitted malformed CSS; fixed to `_and_`.)

### T6.3 — Behavioural verification ✅
`scripts/verify.mjs`, run via `pnpm verify`. 37 assertions, all passing, covering:

- v2 round-trip preserves name, item count, quantities and category colours
- legacy `?list=<base64>` and `#list=<base64>` still decode
- malformed and wrong-shape payloads report `broken` rather than throwing
- `?preset=` templates encode/decode, and a list payload is rejected as a preset
- `sharedToPreset` regenerates unique category and item ids
- link budget thresholds
- **every palette colour reaches ≥4.5:1 against the foreground `readableOn()` picks**
- grapheme-safe emoji truncation and diacritic-insensitive search folding

This check caught a defect in the rework itself: the first `readableOn()` used a 0.45
luminance threshold, but the true white/dark crossover is ≈0.204, so amber tiles kept
their unreadable white text. It also showed `#8b5cf6` is unfixable — at luminance 0.198
neither foreground reaches AA — so the default violet became `#a78bfa`.

### T6.4 — Rendered-output pass ✅
Dev server checked: 46 item tiles and 16 preset tabs render server-side with
`aria-pressed` and descriptive `aria-label`s intact, and the compiled CSS contains the
`(hover: hover) and (pointer: fine)` guard, `safe-area-inset-bottom`,
`prefers-reduced-motion`, and the sheet/dialog keyframes.

**Not verified:** no browser automation was available in this environment, so gesture
behaviour (long-press quantity, drag-dismiss, haptics) and real-device rendering have
not been exercised. Worth a manual pass on a phone before deploying.

---

## Phase 7 — Launch (owner action, unchanged)

| # | Item | Status |
|---|------|--------|
| L1 | Register `taptap.app` / `taptap.link`; the GitHub Pages subdirectory URL reads as a phishing link in WhatsApp attribution | ⏸ owner |
| L2 | On domain acquisition: `public/CNAME`, `APP_URL` in `lib/share.ts`, `metadataBase`, `manifest.json` `start_url`/`scope`, `sw.js` cache paths, drop `basePath`/`assetPrefix` | ⏸ blocked on L1 |
| L3 | Show HN — "a grocery list where the entire list lives in the URL" | ⏸ after deploy |
| L4 | Reddit r/selfhosted, r/mealplanning | ⏸ after L3 |
| L5 | Product Hunt | ⏸ after L3 |
| L6 | Privacy-safe analytics (Plausible) — decision pending | ❌ |
| L7 | Auto-increment `CACHE_VERSION` in `sw.js` at build time | ❌ |

---

## Architecture constraints (never violate)

- **No backend.** All state is localStorage/sessionStorage. All sharing is URL-encoded.
- **No authentication.** Zero friction is the feature.
- **Static export only.** GitHub Pages.
- **Backward compatibility.** `v2:` lz-string links, v1 base64 links and legacy `#list=`
  links must all keep decoding.
- **Use pnpm, not npm.** CI uses `pnpm-lock.yaml`.
