# TapTap

A grocery list app where the entire list is encoded in the URL. Share a list by sharing a link — no account, no server, no backend.

Live: https://7nolikov.dev/tap-tap/

## Background

I work in backend / distributed systems (Go, Java). This was a Next.js + TypeScript learning project on the frontend side, built with AI assistance for the React idioms I didn't already know. The architectural constraint — no backend, ever — was the point: tight enough that every design decision (state, sharing, persistence, offline) had to fit inside the browser.

## How it works

```
Tap items → Share → URL is generated
↓
https://7nolikov.dev/tap-tap/?list=v2:BNF...

Recipient opens the link → sees the list → can save it as their own preset
```

The list is compressed with [lz-string](https://github.com/pieroxy/lz-string) and base64-encoded into a query param. A 20-item list fits in a WhatsApp message. The server never sees the data.

`?preset=preset:v1:...` shares a full preset template (all items, nothing pre-selected).
`?list=v2:...` shares the selected state.

Because the list rides in the URL, link length is a real limit — the UI shows a gauge
for it rather than letting a chat client silently truncate the link.

## Features

- Tap to add, tap again to increase quantity, `−` to decrease, long-press to type a number
- A live list panel — pinned beside the grid on desktop, one tap up from the bottom bar on mobile — with a category distribution bar and a link-size gauge
- Search across every item in a preset
- 16 built-in presets (grocery, BBQ, camping, meal prep, etc.) on a swipeable rail
- Share via URL — works on WhatsApp, Telegram, iMessage, Slack, email
- Save a received list as a preset in one tap
- First-run demo list so new users see the mechanic
- Edit mode, custom items, custom categories, custom presets
- Offline-first PWA — installs to home screen, works after first load
- Dark mode
- Export / import presets as JSON
- No analytics, no cookies, no tracking

## Tech stack

- **Framework:** Next.js 16 (static export)
- **Storage:** `localStorage` only
- **Sharing:** URL query params (`?list=v2:...`, `?preset=preset:v1:...`)
- **Compression:** lz-string (~60% reduction over raw base64)
- **Validation:** Zod on all `localStorage` and URL inputs
- **PWA:** service worker, cache-first for static, network-first for shell
- **Deploy:** GitHub Pages

## Self-hosting

```bash
git clone https://github.com/7nolikov/tap-tap
cd tap-tap
pnpm install
pnpm dev
```

```bash
pnpm typecheck   # tsc --noEmit
pnpm verify      # share encoding, legacy link formats, palette contrast
pnpm build       # static export to /out
```

To deploy to GitHub Pages, build and push `/out` to `gh-pages`, or use the included Actions workflow. Update `basePath` / `assetPrefix` in `next.config.mjs` and `APP_URL` in `lib/config.ts` if you change the path.

## Architecture notes

- No backend, ever.
- State lives in `localStorage`. Sharing is URL-encoded via `encodeList()` / `encodePreset()` → `LZString.compressToEncodedURIComponent()`.
- All incoming URLs are Zod-validated. Malformed links show a toast, not a crash.
- Backward compatible: old `#list=` hash links and uncompressed `?list=` links still decode. `pnpm verify` asserts this.
- UI/UX decisions and their rationale live in [`docs/DESIGN.md`](docs/DESIGN.md); outstanding work is in [`EXECUTION_PLAN.md`](EXECUTION_PLAN.md).

> Note: `/docs` is gitignored and holds local reference checkouts of other projects. It is excluded from `tsconfig.json` — a vendored `lib.deno.d.ts` in there carries `/// <reference no-default-lib="true" />`, which silently strips `lib.dom` from the whole TypeScript program if the directory is in scope.

## Contributing

PRs welcome. Keep the no-backend constraint. Don't break existing shared URLs. Use `pnpm` — the lockfile is `pnpm-lock.yaml`.
