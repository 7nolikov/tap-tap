# TapTap — Grocery Lists That Live in a Link

> Tap items → Share a link → Recipient opens it instantly. No sign-up. No server. No tracking.

**[▶ Try the live demo](https://7nolikov.github.io/tap-tap/)**

| Pre-loaded demos | |
|---|---|
| 🎄 Christmas Dinner | [Open demo](https://7nolikov.github.io/tap-tap/?list=v2:N4IgdiBcIMIBYCcCWBnALgWwIYoAQBEkwwBTBXQHg3AQ-ZABoQkoBtUAYyhABU4TcBZLEVwBRAG4kkaOiBIdAfBuBg3ekAbDgHU4Ae2W9OAVwQBrEgE9pARygBGeoY4BiEgDMALG5cgAvrTYduvASExCSl6WWgKQFp9lQ54JAAHbSw0LFwAZSw9FCwAcxIUCygAJlsHZ3cPb19of35BMBFxSWlwkDlAZV2Y6DS0BBIsQxNcACEsVk0IektIGxA7aEdXdy8fEHZoADUSPJSAIx0CsPlAM12ukGGELJQSZTw0+IRNPTRDkGmSuYcrAAZdgE4ABxWFbVEBbHZYfb5FryQCqu2cAApYBAoMAJV7TWbzED2H7-IEgtYccEkPYHGHQOSAFV2zgAlTQ4NBEHK4BGaFJoTTQqZQADMpQWeMBwKqROgCL0ABNJczcAAyAjIMCGV6tCiAO32zvBkOhsHgJdLmYUZgKcQDdgBWVhOABshPWIANMrALIV+CVKopbUA5rtnPhEVi8BFIblvaym+zmq22+0cJ2yt0e1UcCiAd33EZoEGhcGoiLIeSbPgso9a7aKHRk9IG8ArhAAPXo4L0UQCR+1rEKhMDhcDAEGNjCjjViHE4LX8SL8vABdTxAA) |
| 🔥 BBQ This Saturday | [Open demo](https://7nolikov.github.io/tap-tap/?list=v2:N4IgdiBcIEIwigAgCoAsCWBnRBlAhgC4CuATgCZ4CeigvBuCkuyADQjpQDaoAxlCALICmhbADJEAcRLoANlMxMQ-HoB4NwLT78qTwEkA5kX4AvXHiKY82-nOYBHKACZmAax4BifgDMALF48gAvoy5NQQIRcUkZSwUeQD4NwE1d9R4AGTwAWwAjRABpAHs3AjxIm0gARkcXd28ff0DoASFEUQlpWXlFaGjAAd2E6AAJPBlsohTWazsy6FdPbz8AkG5oABF0AAdQ-CJOC1blQDZ9wHg-7pA+yUxTRAAFAoJFUZLxkGc3AFYATn4ABjSZmpAl1YajBstsw2iBooAlXcOyH0hH06AcIxARVKICcE2eb0+3zmPBw6DIFgB+CkeDIkVB0UAy3uHc7oAj5RAwEiCMjyIr2VEuYqfF4ADmK2Pmv0kYAc5OUgHd9w4AJWymAAl4gAOroMA3JFjTkTXlpJ6cNwANkFPAWIrF22gSkAXvuHADC+P4JDZUAAzPdnDq9Ya-ABdXxAA) |
| 🥗 Weekly Meal Prep | [Open demo](https://7nolikov.github.io/tap-tap/?list=v2:N4IgdiBcIOoKZwNYBsCeACAsnAhs9ACgE5wAO6gfBuDquyADQgCWUA2qAMZQjED2ALnAzABnOiDidAPBuB1fdHJOAYQAWDNojhh0AIRI4hvUQEcoAJnqJOAYjgAzACz3bIAL612nHv0Ej646BUBau7KcAKIA5qHeIEaQAIxmljYOji5u0B4CwqK+IBSAm3tB0ACKAK44ROb00aYg5tBWdg7OriAc0ADiRDhe6ABk6PJlAEaR2RKAWvsFINrcAO4aAEoq4pVQcTWW1gCsAJxwAAyDTakgHV3Cvf1DI5KAfPuTJYLcOIar8XVbuwdHLZyn3X0DIjDLKcCiAY13JvNuMhkHAACboADyOF4kWia1qIAsH32hxSP2gADU4KE4LwcINYdc-IAzXcm0zYbGhTBWkGqmIsMQO2wAHDFvq0QMTSeTKXBqSAJIADfcmAGUZgheIQ+CjuOKXpAAMxvLFcwa8-n4wXCskUqkgvyAJV3JvJuMUiCL+Br2ZY9QaBZwTaLzT5QYAbXfpFIwstIghwbEUGoxru5fI90AAErhkLxFBhggAPXidCUUQBLe5NEcgGAA3OBIhhyVnRuo8wabNjWABs8ZASbwqfTWZzFslgGl9yYAGTgAFtuJlqzqLHWG83nABdJxAA) |

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

You can also share **preset templates** (`?preset=v2:...`) — recipients get your full preset with all items, nothing pre-selected, ready to customise.

---

## Features

- **Tap to add** — tap once to add, tap again to increase quantity, tap − to decrease
- **16 built-in presets** — European-family focused (Christmas Dinner, Football Match Night, BBQ Party, and more)
- **Share as a link** — list encoded in URL, works on WhatsApp, Telegram, iMessage, Slack, email
- **Share preset templates** — share blank preset templates via `?preset=v2:...` links
- **Short Link** — via is.gd (third-party, opt-in with disclosure); full URL always available
- **Save received list** — recipients save a shared list as their own preset in one tap
- **First-run demo** — new visitors see a demo shared list to experience the mechanic immediately
- **Edit mode** — pencil icon on each category to delete items
- **Add items / categories** — extend any preset with custom items and colour-coded categories
- **Custom presets** — create your own for any shopping scenario
- **Offline-first** — PWA service worker, works after first load, installs to home screen
- **Keyboard shortcut** — `Cmd/Ctrl+Enter` to share when items are selected
- **Dark mode** — system preference + manual toggle
- **Export / Import** — backup your presets as JSON
- **Zero tracking** — no analytics, no cookies, no server, nothing leaves your device

---

## Built-in Presets (16)

| Preset | Viral scenario |
|--------|---------------|
| 🛒 Grocery Shopping | Entry point for 95% of users |
| 🔥 BBQ Party | Shared before every summer cookout |
| ⛺ Camping Trip | Shared between trip planners |
| 🥗 Weekly Meal Prep | Shared in health/fitness communities |
| 🍕 Pizza Night | Fun, low-stakes, highly shareable |
| 📎 Office Supplies | Office managers share widely |
| 🍷 Date Night Dinner | High share intent |
| 👶 Baby Essentials | New parents share constantly |
| 🎄 Christmas Dinner | Massive seasonal spike in December |
| ⚽ Football Match Night | Sports fans share before every big game |
| 📦 Moving House | High-stress — people share to delegate |
| 🍸 Cocktail Party | Social hosts share with guests |
| 🚗 Road Trip Snacks | Travel content goes viral |
| 💪 Gym & Fitness | Health community has strong sharing culture |
| 🐕 Dog Essentials | Dog owners share constantly |
| 🍪 Holiday Cookie Baking | Seasonal baking sharing in December |

---

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-6%20components-black)
![lz-string](https://img.shields.io/badge/lz--string-compression-green)
![Zod](https://img.shields.io/badge/Zod-validation-3068b7)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-static-222?logo=github)

- **Framework:** Next.js 16 (static export)
- **Storage:** `localStorage` only — no database, no backend
- **Sharing:** URL query params — `?list=v2:...` (selected items) or `?preset=v2:...` (full template)
- **Compression:** lz-string (~60% reduction over raw base64)
- **Validation:** Zod schemas on all localStorage and URL data
- **Deployment:** GitHub Pages — zero infra cost, infinite scale
- **PWA:** Service worker with cache-first for `_next/static/` + network-first for shell

---

## Self-hosting / Forking

```bash
git clone https://github.com/7nolikov/tap-tap
cd tap-tap
pnpm install
pnpm dev
```

To deploy to GitHub Pages:
```bash
pnpm build   # outputs to /out
# push /out to your gh-pages branch, or use the included GitHub Actions workflow
```

To change the base path, update `basePath` and `assetPrefix` in `next.config.mjs`.

---

## Architecture

The core constraint: **no backend, ever.**

- All state is `localStorage`. Lists persist between sessions without a server.
- All sharing is URL-encoded. `encodeList()` → `LZString.compressToEncodedURIComponent()` → `?list=v2:...`
- Preset template sharing: `encodePreset()` → `?preset=v2:...` — full preset, no selection state.
- All incoming URLs are Zod-validated. Malformed links show an error toast, not a silent crash.
- Backward compatibility: old `#list=` hash links and uncompressed `?list=` links still decode correctly.

---

## Contributing

PRs welcome. Before opening one:
1. Keep the zero-backend constraint — no server-side logic
2. Shared URLs must remain backward-compatible (never break existing links)
3. Use `pnpm`, not `npm` — the CI lockfile is `pnpm-lock.yaml`

---

If TapTap is useful to you, please ⭐ star the repo. It helps others find it.
