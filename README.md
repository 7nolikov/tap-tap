# TapTap

A grocery list app where the entire list is encoded in the URL. Share a list by sharing a link — no account, no server, no backend.

Live: https://7nolikov.dev/tap-tap/

## Background

I work in backend / distributed systems (Go, Java). This was a Next.js + TypeScript learning project on the frontend side, built with AI assistance for the React idioms I didn't already know. The architectural constraint — no backend, ever — was the point: tight enough that every design decision (state, sharing, persistence, offline) had to fit inside the browser.

## How it works

```
Tap items → Share → URL is generated
↓
https://7nolikov.dev/tap-tap/?list=v3:BNF...

Recipient opens the link → sees the list → can save it as their own preset
```

The list is compressed with [lz-string](https://github.com/pieroxy/lz-string) and base64-encoded into a query param. A 12-item list is ~600 characters — comfortably inside a WhatsApp message. The server never sees the data.

`?preset=preset:v1:...` shares a full preset template (all items, nothing pre-selected).
`?list=v3:...` shares the selected state, including per-item price and pack size.

Because the list rides in the URL, link length is a real limit — the UI shows a gauge
for it rather than letting a chat client silently truncate the link. The v3 format
declares each category once and writes items as positional tuples instead of keyed
objects; that's ~30 % shorter than v2, which is what paid for carrying prices in the
link at all. v2, v1 and `#list=` links still decode, and `pnpm verify` asserts it.

## Presets are people

The ten built-in presets are archetypes at the edges of how households actually buy
food, not occasions. Weekly spend per person runs from €22.50 (four housemates pooling
a kitty) to €110 (a professional buying back an hour a day) — a 4.9× spread — and the
rail is ordered along that axis, so scrolling it is the distribution.

Every item carries a pack size and a euro price, which makes the app's central chart
switchable between *share of items* and *share of spend*. Those two pictures routinely
disagree, and the disagreement is the point: in the First-Year Parent basket, nappies
and formula are a quarter of the items and two thirds of the bill.

Prices are a hand-built, internally consistent snapshot of a mid-market eurozone
supermarket, dated in `lib/economics.ts` and aged forward at a blended food-inflation
rate. They are illustrative — good enough that the relationships are true, not good
enough to budget against — and the UI says so. Two real levers are exposed as controls:
where you shop (discounter / supermarket / premium, roughly a 1.7× spread end to end)
and each persona's weekly budget, which the basket total is gauged against.

## Features

- Tap to add, tap again to increase quantity, `−` to decrease, long-press to type a number
- A live list panel — pinned beside the grid on desktop, one tap up from the bottom bar on mobile — with a distribution bar (by items or by spend), a basket-vs-budget gauge and a link-size gauge
- Store-tier switch: flip to a discounter and watch the basket drop ~22 %
- Search across every item in a preset
- 10 built-in shopper archetypes on a swipeable rail, 4 categories × 6 items each
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
- **Sharing:** URL query params (`?list=v3:...`, `?preset=preset:v1:...`)
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
pnpm verify      # share encoding, legacy link formats, palette contrast,
                 # dataset invariants (grid shape, emoji uniqueness, price sanity),
                 # cost model, and link budget with prices attached
pnpm build       # static export to /out
```

To deploy to GitHub Pages, build and push `/out` to `gh-pages`, or use the included Actions workflow. Update `basePath` / `assetPrefix` in `next.config.mjs` and `APP_URL` in `lib/config.ts` if you change the path.

## Architecture notes

- No backend, ever.
- State lives in `localStorage`. Sharing is URL-encoded via `encodeList()` / `encodePreset()` → `LZString.compressToEncodedURIComponent()`.
- All incoming URLs are Zod-validated. Malformed links show a toast, not a crash.
- Backward compatible: `?list=v2:`, uncompressed `?list=` and old `#list=` hash links all still decode. `pnpm verify` asserts this.
- Prices live in the preset data, never in a service. Adding money to a zero-backend app means shipping a dated snapshot and being honest about its age, not pretending to a live feed.
- The defaults are versioned (`DEFAULTS_VERSION`). `loadPresets()` replaces built-ins that nobody has edited and only *offers* the new set to anyone with presets of their own — a returning visitor would otherwise be pinned to the dataset they first loaded.
- UI/UX decisions and their rationale live in [`docs/DESIGN.md`](docs/DESIGN.md); outstanding work is in [`EXECUTION_PLAN.md`](EXECUTION_PLAN.md).

> Note: `/docs` is gitignored and holds local reference checkouts of other projects. It is excluded from `tsconfig.json` — a vendored `lib.deno.d.ts` in there carries `/// <reference no-default-lib="true" />`, which silently strips `lib.dom` from the whole TypeScript program if the directory is in scope.

## Contributing

PRs welcome. Keep the no-backend constraint. Don't break existing shared URLs. Use `pnpm` — the lockfile is `pnpm-lock.yaml`.
