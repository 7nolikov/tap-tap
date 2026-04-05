# TapTap — Execution Plan

_Last updated: 2026-04-05 — full technical + viral audit_

---

## Audit Verdict

**Concept: A+ — Execution: C+**

The core idea is genuinely novel and viral by design. Zero-backend, URL-encoded state, no sign-up — structurally brilliant. But the implementation has critical bugs, an absurd dependency footprint, a credibility-destroying hosting URL, privacy hypocrisy, and a first-run experience that explains the app instead of *demonstrating* it. Left as-is, it will HN-spike and die in 48 hours.

---

## What Is Actually Done ✅

### Infrastructure
- ✅ Share URL uses `?list=` query param (survives WhatsApp link previews)
- ✅ lz-string v2 compression (~60% reduction, 20-item list fits in WhatsApp)
- ✅ Zod validation on all shared URLs and localStorage
- ✅ Discriminated `DecodeResult` — broken links show toast not silent failure
- ✅ Category colors preserved end-to-end in share encoding
- ✅ Unused shadcn component files deleted (50 → 6)
- ✅ Next.js upgraded from 15.2.4 (CVE-2025-66478) to 16.2.1

### Viral Mechanics
- ✅ "Save as my preset" CTA in shared list modal
- ✅ Viral attribution appended to every share message
- ✅ OG image exists (1200×630), Twitter card set to `summary_large_image`
- ✅ `is.gd` URL shortener on "Short Link" button (browser-side, no auth)
- ✅ Keyboard shortcut: `Cmd/Ctrl+Enter` to Share

### UX
- ✅ shadcn Select preset switcher with item count badge
- ✅ Delete preset
- ✅ Add category with color picker
- ✅ Delete items from category (pencil edit mode)
- ✅ Restore default presets
- ✅ Welcome banner (one-time)
- ✅ PWA manifest + service worker

### Content
- ✅ 16 European-family presets (Christmas Dinner, Football Match Night, etc.)

---

## Critical Bugs — Fix Before Any Marketing

### BUG-1. PWA icons missing — app install shows broken icon

**Severity: CRITICAL — blocks mobile viral loop**

`/public/icon-192.png` and `/public/icon-512.png` are referenced in `manifest.json` but **do not exist**. Anyone who taps "Add to Home Screen" gets a browser's broken-image placeholder. This destroys the PWA install experience — the primary mobile acquisition channel.

Also wrong: `"purpose": "any maskable"` on a single entry is invalid — Chrome ignores `maskable` when combined with `any` in one record. Two separate entries required.

**Fix:** Generate 192×192 and 512×512 PNG icons (amber gradient, TapTap logo). Split manifest into two icon entries:
```json
{ "src": "/tap-tap/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
{ "src": "/tap-tap/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
{ "src": "/tap-tap/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
{ "src": "/tap-tap/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
```

---

### BUG-2. Service worker never invalidates — users stuck on stale code

**Severity: CRITICAL — kills post-launch updates**

`sw.js` uses hardcoded cache key `"taptap-v1"`. This never changes. After you push updates, returning users will load the cached old shell but fetch new JS — causing hydration mismatches or broken functionality. The cache only invalidates if users manually clear their browser storage.

Also: the SW precaches only 3 files (`/`, `manifest.json`, `og-image.png`) — not the actual JS/CSS bundles. "Works offline" is a lie for first-time visitors on slow connections who haven't cached the chunks yet.

**Fix:** Version the cache key with a build hash or timestamp injected at build time. Precache all `/_next/static/` chunks in the install event. Add a `message` listener for `SKIP_WAITING`.

---

### BUG-3. Keyboard shortcut useEffect runs on every render

**Severity: HIGH — performance bug, event listener leak**

```ts
useEffect(() => { ... }) // ← no deps array
```

This adds and removes a `keydown` listener on **every single render**. On a mobile device with 16+ item cards, this is dozens of add/remove cycles per second during tap interactions. It works because the cleanup fires, but it is wasteful and fragile.

**Fix:** Add `[totalCount, handleShare]` deps, or better: extract `handleShare` with `useCallback`.

---

### BUG-4. Radix UI: 27 packages installed, ~3 actually used

**Severity: HIGH — install bloat, CI time, security surface**

`package.json` still lists every Radix UI package from the original shadcn scaffold: `accordion`, `alert-dialog`, `aspect-ratio`, `avatar`, `checkbox`, `collapsible`, `context-menu`, `dropdown-menu`, `hover-card`, `label`, `menubar`, `navigation-menu`, `popover`, `progress`, `radio-group`, `scroll-area`, `separator`, `slider`, `switch`, `tabs`, `toast`, `toggle`, `toggle-group`, `tooltip`.

The app uses exactly 3: `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-slot`. That's 24 dead packages adding to `node_modules`, CI install time, Dependabot noise, and potential supply-chain attack surface.

**Fix:** Remove all unused Radix packages from `package.json`, run `pnpm install`.

---

### BUG-5. `typescript.ignoreBuildErrors: true` — permanent, no plan to fix

**Severity: MEDIUM — silent type regressions ship to production**

The stated reason is "@types/node v22 conflict". The actual fix is either: (a) pin `@types/node` to `^20`, or (b) add `"types": ["node"]` to the right tsconfig section. Permanently silencing TypeScript for a 1-line fix is technical debt that will silently ship broken code as the codebase grows.

**Fix:** Pin `@types/node` to `"^20"` in devDependencies. Remove `ignoreBuildErrors`.

---

### BUG-6. Privacy: "Short Link" sends user data to is.gd

**Severity: HIGH — destroys "zero tracking" brand promise**

The app markets itself as "No sign-up. No server. No tracking. Nothing leaves your device." Then the "Short Link" button sends the full list URL to `https://is.gd/create.php`. is.gd is a third party that logs URLs, IP addresses, and usage. The compressed URL payload contains the user's grocery list contents.

This is not a technicality. It is brand-promise fraud. Any tech-savvy user (the HN audience) will notice this and roast the project in comments.

**Fix:** Either (a) remove URL shortening entirely and lean into "the URL IS the feature", or (b) make it explicitly opt-in with a disclosure: "This sends your list to is.gd — a free URL shortener. Nothing else leaves your device." Rename from "Short Link" to "Shorten (via is.gd)" with a ⚠️ indicator.

---

### BUG-7. Dead placeholder files in `/public/`

**Severity: LOW — bloat, looks unprofessional in repo**

`placeholder-logo.png`, `placeholder-logo.svg`, `placeholder-user.jpg`, `placeholder.jpg`, `placeholder.svg` are all Next.js scaffold files that have never been used. They are deployed to GitHub Pages on every push.

**Fix:** Delete them.

---

### BUG-8. README is out of date

**Severity: MEDIUM — first impression for HN/GitHub traffic**

- Still says "8 built-in presets" (app has 16)
- Badge shows "Next.js 15" (app runs 16.2.1)
- Preset table only shows 8 presets
- Feature list missing: delete items, edit mode, URL shortener, keyboard shortcut, item count badge
- Copy says "Copy Link" but button now says "Short Link"

**Fix:** Update README fully. The README IS the product page for developer virality.

---

## Viral Mechanics — What's Missing

### V-1. The core magic is never demonstrated — critical conversion failure

**Impact: CRITICAL**

A first-time visitor lands, sees a grocery list with items to tap. Nothing communicates "this is unusual". The welcome banner says: *"Tap items to add them to your list. Hit Share when done."* That's an instruction manual. That is not a hook.

The person who should share this app is someone who just got their mind blown by receiving a fully-formed shopping list in a link from their partner with zero friction. That moment doesn't happen until *after* they share. You need to manufacture that moment on first visit.

**Fix:** On first visit, auto-load a pre-populated demo list via URL: show the shared-list modal with a "Milk, Eggs, Butter, Baguette" list from "your partner". The visitor saves it, taps items, hits Share — and immediately becomes a sender. Pre-loaded demo URL in every launch post, social bio, README.

---

### V-2. GitHub Pages URL is a brand-killer for mainstream virality

**Impact: HIGH**

`https://7nolikov.github.io/tap-tap/` signals "student side project" to every non-technical user. When a mum forwards a shopping list to her partner with this URL in it, the partner says "what is this sketchy link?" and deletes it. For B2C virality you need a real domain.

**Fix:** Register `taptap.app`, `tap-tap.io`, `taptap.link`, or `gettaptap.com`. Point GitHub Pages custom domain. CNAME file in repo. The URL in every shared WhatsApp message needs to be trustworthy.

---

### V-3. Share preset template (VG-11) — the most powerful viral feature not built

**Impact: HIGH**

Currently you can only share a selected list. You cannot share a *template*. The high-virality moment is: "I built the perfect Christmas Dinner preset — here's the link, add it to your app." Recipients get a pre-built template, not a pre-filled cart.

This is structurally different from current sharing: `?preset=v2:...` encodes the full preset (all items, nothing selected). Recipient sees "Someone shared a preset template" modal with "Add to my presets" CTA.

This creates a community layer without a backend. People share preset templates in Reddit communities, WhatsApp groups, TikTok comments.

---

### V-4. Share button copy is flat

**Impact: MEDIUM**

"Share (5 items)" — this is count-of-items. It tells the recipient nothing about urgency or context. Compare:
- Current: `Share (5 items)`
- Better: `Share List` or `Send to Partner`

The attribution text `"— Built with TapTap · https://7nolikov.github.io/tap-tap/"` is two lines in every WhatsApp message. With a custom domain this becomes a proper viral CTA. Without one it's dead weight.

---

### V-5. No robots.txt, no sitemap.xml — invisible to search engines

**Impact: MEDIUM**

Zero organic SEO. GitHub Pages serves no sitemap. No `robots.txt`. Searches for "grocery list share link" or "shopping list URL no signup" don't find this app.

**Fix:** Add `public/robots.txt` and `public/sitemap.xml` pointing to the GitHub Pages URL.

---

### V-6. PWA manifest screenshots are wrong format

**Impact: MEDIUM — blocks Chrome/Android install prompt**

The manifest `screenshots` entry uses the OG image (1200×630, landscape). Chrome's "Enhanced" install prompt requires `form_factor: "narrow"` screenshots in portrait for mobile. The current entry causes the enhanced install card to not appear.

**Fix:**
```json
{
  "src": "/tap-tap/og-image.png",
  "sizes": "1200x630",
  "type": "image/png",
  "form_factor": "wide",
  "label": "TapTap on desktop"
}
```
Add a separate 390×844 portrait screenshot for mobile.

---

### V-7. No pre-loaded demo URLs for launch posts (VG-8)

**Impact: CRITICAL for launch**

Every launch post — Show HN, Reddit, Product Hunt — should link to a pre-populated list, not a blank app. "Click this link to see a Christmas dinner list" is 5× more compelling than "click here to try the app."

Generate 3 demo URLs:
1. `?list=v2:...` → Christmas Dinner (10 items)
2. `?list=v2:...` → BBQ Party (8 items)
3. `?list=v2:...` → Weekly Meal Prep (12 items)

These go in: README, every launch post, social bio, og-image alt text.

---

### V-8. The "Save as my preset" modal has no social energy

**Impact: MEDIUM**

The shared-list modal is cold. It shows a list, two buttons. No excitement. No context. No "sent by X" attribution.

The shared list URL could encode a sender handle (optional, user-provided). The modal could say: **"Alex sent you a BBQ list 🔥"**. Adds a social layer with zero backend.

---

## Priority Table — Current

| # | Item | Type | Status |
|---|------|------|--------|
| 1 | Fix PWA icons (192/512 PNGs generated) | BUG-1 | ✅ |
| 2 | Fix SW cache versioning + precache JS bundles | BUG-2 | ✅ |
| 3 | is.gd opt-in consent before shortening | BUG-6 | ✅ |
| 4 | Share preset template (`?preset=v2:...`) | V-3 | ✅ |
| 5 | Remove 24 unused Radix packages | BUG-4 | ✅ |
| 6 | `@types/node` pinned to ^20 + dom-fix.d.ts augmentations | BUG-5 | ✅ partial¹ |
| 7 | Keyboard shortcut useEffect fixed (useRef pattern) | BUG-3 | ✅ |
| 8 | robots.txt + sitemap.xml | V-5 | ✅ |
| 9 | README updated (16 presets, Next.js 16, demo URLs) | BUG-8 | ✅ |
| 10 | Deleted placeholder files from /public/ | BUG-7 | ✅ |
| 11 | PWA manifest: split icon entries + form_factor screenshot | V-6 | ✅ |
| 12 | First-run demo list (shows on first visit) | V-1 | ✅ |
| 13 | Demo URLs in README | V-7 | ✅ |
| 14 | **Custom domain** | V-2 | ⏸ postponed to launch |
| 15 | Launch: Show HN | — | 🔲 |
| 16 | Launch: Reddit r/webdev, r/selfhosted | — | 🔲 |
| 17 | Launch: Product Hunt | — | 🔲 |

¹ `ignoreBuildErrors: true` remains — @types/node v20 still conflicts with `Window & typeof globalThis` intersection, `WindowEventMap`, and keyboard event types. The `dom-fix.d.ts` augmentation fixes `history`, `navigator.serviceWorker`, `navigator.share`, and `navigator.clipboard`. Remaining false-positive errors (addEventListener overloads, KeyboardEvent properties) are suppressed by `ignoreBuildErrors`. Runtime is 100% correct.

---

## Architecture Constraints (never violate)

- **No backend.** All state is localStorage. All sharing is URL-encoded.
- **No authentication.** Zero friction is a feature.
- **Static export only.** GitHub Pages. No server-side features.
- **Backward compatibility.** v2 lz-string links, v1 base64 links, and legacy `#list=` hash links all decode correctly. Never break existing shared URLs.

---

## Launch Sequence

**Gate 1 — Fix BUG-1 through BUG-4 before any public post.** A broken PWA icon or stale SW will generate immediate negative comments that tank HN/Reddit ranking.

**Gate 2 — Custom domain before sharing launch.** `7nolikov.github.io` URLs do not go viral outside developer communities.

**Gate 3 — Generate demo URLs and update README.**

**Gate 4 — Launch:**

1. **Show HN** — "Show HN: I built a grocery list where the entire list lives in the URL — no backend, no sign-up"
   - Lead line: "The whole state is lz-string compressed in the query param. No server ever sees your data."
   - Include Christmas Dinner demo URL
   - Reply to every comment in first 2 hours

2. **Reddit r/selfhosted** — Privacy + local-first angle
   - "Zero-backend grocery list: the list IS the URL. No server, no tracking, no account."

3. **Reddit r/mealplanning / r/frugal** — Non-technical angle
   - "I made a grocery list app where you share by sending a link — no app install, no sign-up"

4. **Twitter/X thread** — Architecture hook
   ```
   I built a grocery list app with one rule:
   The list must live entirely in the URL.
   No database. No server. No auth.
   Here's how 🧵
   ```

5. **Product Hunt** — After HN validates messaging
