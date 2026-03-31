# TapTap — Grocery Lists That Live in a Link

> Tap items → Share a link → Recipient opens it instantly. No sign-up. No server. No tracking.

**[▶ Try the live demo](https://7nolikov.github.io/tap-tap/)**

---

## What is TapTap?

TapTap is a local-first grocery list app with a weird architectural constraint: **the entire list lives in the URL**.

When you tap items and hit Share, your list is compressed and encoded into a single URL. The recipient opens it, sees your list instantly, and can save it as their own preset — no account, no app install, no backend involved.

Every shared list is a referral. This is the entire growth mechanic.

---

## How it works

```
You tap items → Hit Share → URL is generated
↓
https://7nolikov.github.io/tap-tap/?list=v2:BNF...

Recipients open the link → See your list → Save as their preset → Share their own
```

The list is encoded using [lz-string](https://github.com/pieroxy/lz-string) compression + base64. A 20-item list fits comfortably in a WhatsApp message. No server ever sees your data.

---

## Features

- **Tap to add** — tap once to add, tap again to increase quantity, tap − to decrease
- **8 built-in presets** — Grocery Shopping, BBQ Party, Camping Trip, Weekly Meal Prep, Pizza Night, Office Supplies, Date Night Dinner, Baby Essentials
- **Custom presets** — create your own for any shopping scenario
- **Share as a link** — full list encoded in URL, works on WhatsApp, Telegram, iMessage, Slack, email
- **Copy Link** — clean URL only, perfect for Twitter/X or embedding
- **Save received list** — recipients can save a shared list as their own preset in one tap
- **Offline-first** — works without internet after first load
- **PWA-ready** — install on your home screen (Android/iOS)
- **Dark mode** — system preference + manual toggle
- **Export / Import** — backup your presets as JSON
- **Delete presets** — clean up presets you no longer need
- **Zero tracking** — no analytics, no cookies, no server, nothing leaves your device

---

## Built-in Presets

| Preset | Categories | Items |
|--------|-----------|-------|
| 🛒 Grocery Shopping | 8 categories | 80+ items |
| 🔥 BBQ Party | 5 categories | 35+ items |
| ⛺ Camping Trip | 3 categories | 33+ items |
| 🥗 Weekly Meal Prep | 4 categories | 35+ items |
| 🍕 Pizza Night | 4 categories | 26+ items |
| 📎 Office Supplies | 4 categories | 27+ items |
| 🍷 Date Night Dinner | 5 categories | 30+ items |
| 👶 Baby Essentials | 3 categories | 20+ items |

---

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-latest-black)
![lz-string](https://img.shields.io/badge/lz--string-compression-green)
![Zod](https://img.shields.io/badge/Zod-validation-3068b7)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-static-222?logo=github)

- **Framework:** Next.js 15 (static export)
- **Storage:** `localStorage` only — no database, no backend
- **Sharing:** URL query parameter (`?list=v2:...`) — survives WhatsApp, Telegram, link shorteners
- **Compression:** lz-string (~60% reduction over raw base64)
- **Validation:** Zod schemas for both localStorage and shared link parsing
- **Deployment:** GitHub Pages — zero infra cost, infinite scale
- **Fonts:** Geist Sans

---

## Self-hosting / Forking

```bash
git clone https://github.com/7nolikov/tap-tap
cd tap-tap
npm install
npm run dev
```

To deploy to GitHub Pages:
```bash
npm run build   # outputs to /out
# push /out to your gh-pages branch
```

To change the base path, update `basePath` and `assetPrefix` in `next.config.mjs`.

---

## Architecture

The core constraint: **no backend, ever.**

- All state is `localStorage`. Lists persist between sessions without a server.
- All sharing is URL-encoded. `encodeList()` → `LZString.compressToEncodedURIComponent()` → `?list=v2:...`
- All incoming links are Zod-validated. Malformed URLs show an error toast, not a silent crash.
- Backward compatibility: old `#list=` hash links and uncompressed `?list=` links still decode correctly.

Adding categories, custom items, or new presets doesn't require a server. Everything lives in the browser.

---

## Contributing

PRs welcome. Before opening one:
1. Keep the zero-backend constraint — no server-side logic
2. Shared URLs must remain backward-compatible (never break existing links)
3. Keep bundle lean — check `npm run build` output before adding dependencies

---

If TapTap is useful to you, please ⭐ star the repo. It helps others find it.
