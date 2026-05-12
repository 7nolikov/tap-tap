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

`?preset=v2:...` shares a full preset template (all items, nothing pre-selected). `?list=v2:...` shares the selected state.

## Features

- Tap to add, tap again to increase quantity, `−` to decrease
- 16 built-in presets (grocery, BBQ, camping, meal prep, etc.)
- Share via URL — works on WhatsApp, Telegram, iMessage, Slack, email
- Optional short link via is.gd (third-party, opt-in)
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
- **Sharing:** URL query params (`?list=v2:...`, `?preset=v2:...`)
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

To deploy to GitHub Pages, build and push `/out` to `gh-pages`, or use the included Actions workflow. Update `basePath` / `assetPrefix` in `next.config.mjs` if you change the path.

## Architecture notes

- No backend, ever.
- State lives in `localStorage`. Sharing is URL-encoded via `encodeList()` / `encodePreset()` → `LZString.compressToEncodedURIComponent()`.
- All incoming URLs are Zod-validated. Malformed links show a toast, not a crash.
- Backward compatible: old `#list=` hash links and uncompressed `?list=` links still decode.

## Contributing

PRs welcome. Keep the no-backend constraint. Don't break existing shared URLs. Use `pnpm` — the lockfile is `pnpm-lock.yaml`.
