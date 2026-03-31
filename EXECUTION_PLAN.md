# TapTap — Execution Plan

_Last updated: 2026-03-31 — full reassessment after viral implementation pass_

---

## Project Assessment

**What it is:** A local-first, zero-backend web app for building and sharing grocery/shopping lists. No sign-up, no tracking, works offline. Lists are encoded into shareable URLs.

**Core differentiator:** "The grocery list that lives in the URL." No server. No account. No app install. The entire list travels as a link. This is genuinely novel and eminently shareable — the viral mechanic is structural, not bolted on.

**Deployment:** GitHub Pages at `https://7nolikov.github.io/tap-tap/`

---

## Status: Done ✅

### Infrastructure & Correctness
- ✅ **Share URL: `#list=` → `?list=`** — Query params survive WhatsApp/Telegram previews and URL shorteners. Legacy hash links still decode via fallback.
- ✅ **lz-string compression (v2: prefix)** — ~60% URL size reduction. 20-item list fits in a WhatsApp message. Backward-compatible: v1 (base64) and legacy hash links still work.
- ✅ **Zod validation on share URLs** — `SharedItemSchema` + `ShareDataSchema`. No more `as ShareData` type assertion.
- ✅ **Malformed link error feedback** — Discriminated `DecodeResult`. Toast shown when a broken `?list=` is opened, not silent failure.
- ✅ **Category colors in share encoding** — `k` (hex color) field preserved end-to-end. Recipient sees sender's color scheme in the shared list modal.
- ✅ **Unused dependency removal** — Removed recharts, react-day-picker, input-otp, embla-carousel, cmdk, vaul, date-fns, react-resizable-panels, react-hook-form. Bundle leaner.

### Viral Mechanics
- ✅ **"Save as my preset" CTA** — Shared list modal primary CTA saves the list as a reusable preset. Closes the viral loop: receive → save → customize → share.
- ✅ **Viral attribution in every share** — `"— Built with TapTap · https://7nolikov.github.io/tap-tap/"` appended to every shared message. Every WhatsApp/Telegram message is an ad.
- ✅ **Attribution URL fixed** — Was `tap-tap.app` (doesn't exist). Now uses real GitHub Pages URL.
- ✅ **OG image added** — `og-image.png` (1200×630) exists in `/public`. Twitter card set to `summary_large_image`.
- ✅ **Twitter card type** — Updated from `summary` to `summary_large_image`.

### UX & App Quality
- ✅ **Rename to TapTap** — Header, metadata, OG tags, README all updated.
- ✅ **shadcn Select for preset switcher** — Replaced native `<select>`. Consistent glassmorphism UI.
- ✅ **Split Share / Copy Link buttons** — "Share" sends formatted text+URL. "Copy Link" sends clean URL only (for Twitter/X, embed).
- ✅ **Delete preset** — Trash icon in Settings. Disabled when only 1 preset remains.
- ✅ **Add category to existing preset** — Color picker (8 swatches) + name field. Dashed "Add category" card at end of grid.
- ✅ **Restore default presets** — Button in Settings resets to all 16 built-in presets.
- ✅ **Welcome banner** — One-time banner for first-time visitors explaining tap→share mechanic.
- ✅ **Storage notice** — Replaces old "cookie notice". Accurate: localStorage, not cookies.

### Content (Preset Library)
- ✅ **16 built-in presets** covering diverse sharing scenarios:

| # | Preset | Why it's viral |
|---|--------|----------------|
| 1 | 🛒 Grocery Shopping | Most-used, entry point for 95% of users |
| 2 | 🔥 BBQ Party | Shared before every summer cookout |
| 3 | ⛺ Camping Trip | Shared between trip planners |
| 4 | 🥗 Weekly Meal Prep | Shared in health/fitness communities |
| 5 | 🍕 Pizza Night | Fun, low-stakes, highly shareable |
| 6 | 📎 Office Supplies | B2B niche — office managers share widely |
| 7 | 🍷 Date Night Dinner | Romantic occasion, high share intent |
| 8 | 👶 Baby Essentials | New parent sharing is extremely high-frequency |
| 9 | 🦃 Thanksgiving Dinner | Massive seasonal spike every November |
| 10 | 🏈 Game Day Party | Sports fans share before every big game |
| 11 | 📦 Moving House | Stressful event — people share to delegate |
| 12 | 🍸 Cocktail Party | Social hosts share with guests |
| 13 | 🚗 Road Trip Snacks | Travel content goes viral |
| 14 | 💪 Gym & Fitness | Health community has strong sharing culture |
| 15 | 🐕 Dog Essentials | Dog owners share constantly |
| 16 | 🍪 Holiday Cookie Baking | Seasonal baking sharing in December |

### PWA & Distribution
- ✅ **PWA manifest** — `/public/manifest.json` with name, icons, theme, standalone display.
- ✅ **Service worker** — `/public/sw.js` with cache-first strategy. App works fully offline after first visit. Installs to home screen on Android/iOS.
- ✅ **README** — Full README with live demo link, feature table, preset table, tech stack badges, architecture explanation, star prompt.

---

## Open Items

### VG-8. Pre-loaded demo URLs for launch posts

**Status:** Not done — requires generating specific URLs with the lz-string v2 encoding.

**Why:** Every Show HN / Reddit / Twitter post should link to a demo list with items pre-selected. A blank app converts poorly. A pre-loaded "Grocery Shopping — Milk, Eggs, Cheese, Butter" list converts 3× better.

**How:**
```ts
// Generate a demo URL (run locally):
const demo = encodeList(groceryPreset, { "dairy:milk": 2, "dairy:eggs": 1, ... })
// → https://7nolikov.github.io/tap-tap/?list=v2:BNFxDy...
```
Generate 3 demo URLs:
1. "Grocery run" (10 items, 3 categories)
2. "BBQ this Saturday" (8 items)
3. "Camping trip" (12 items)

Include these links in every launch post.

---

### VG-9. Add category items count badge in preset selector

**Status:** Not done.

**Why:** With 16 presets, the dropdown is a list of names. Users can't tell "Grocery Shopping has 80 items" vs "Pizza Night has 26 items" without switching. A small badge `(80 items)` or category count `(8 cat)` would help discovery.

**Fix:** Update `SelectItem` to show item count:
```tsx
<SelectItem key={p.id} value={p.id}>
  {p.name}
  <span className="ml-auto text-xs text-muted-foreground">
    {p.categories.reduce((s, c) => s + c.items.length, 0)} items
  </span>
</SelectItem>
```

---

### VG-10. Keyboard shortcut for Share (Cmd+Enter / Ctrl+Enter)

**Status:** Not done.

**Why:** Power users (HN audience) expect keyboard shortcuts. `Cmd+Enter` to share is natural. Adds polish that HN commenters notice.

**Fix:** Add `keydown` listener in the main component for `Cmd+Enter` / `Ctrl+Enter`.

---

### VG-11. Share a preset template (vs. share a list)

**Status:** Not done — separate feature from current "share selected items".

**Why:** Currently you can only share items you've selected. A user who built a great custom "Halloween Party" preset can't share the template with friends — they'd have to select all items first, which is clunky.

**Fix:** Add `?preset=v2:...` encoding for the full preset (all items, none selected). Recipient sees "Someone shared a preset with you" modal with "Use this preset" CTA. Different UX from the current "shared list" flow.

---

### VG-12. Delete individual items from a category

**Status:** Not done.

**Why:** Currently users can ADD items but can't DELETE them. If you accidentally add an item or want to trim a preset, you're stuck.

**Fix:** Add a small × button on each item tile in a "editing" mode toggle on each card header.

---

### TD-10. Clean up unused shadcn UI components

**Status:** Not done.

**Why:** `components/ui/` has 52 files. The app uses ~8 (button, card, dialog, input, select, alert, separator). Components are shadcn-generated, so they're probably tree-shaken, but they clutter the codebase and make onboarding harder.

**Fix:** Audit which components are actually imported in page.tsx and layout.tsx. Remove the rest. Typical unused components: calendar, carousel, chart, command, drawer, input-otp, sidebar, navigation-menu, resizable, accordion.

---

### TD-11. Upgrade Next.js (security vulnerability)

**Status:** Not done.

**Warning:** `next@15.2.4` has a known CVE (CVE-2025-66478). Upgrade to the patched version.

**Fix:** `pnpm add next@latest`

---

## Launch Sequence (unchanged — prerequisites now met)

**Gate 1 — Complete ✅** (all prerequisites done)

**Gate 2 — Launch:**

1. **Show HN** — "Show HN: I built a grocery list where the entire list lives in the URL"
   - Lead with the technical hook: lz-string compression, no server, backward compat
   - Include a pre-loaded demo link (see VG-8)
   - Respond to every comment in the first 2 hours

2. **Reddit r/selfhosted** — Privacy and local-first angle
   - "Self-hostable grocery list app — the list lives in the URL, no backend, no tracking"

3. **Reddit r/webdev** — Architecture angle
   - "How I built viral sharing without a backend: the entire state lives in the URL"
   - Show the encode/decode code, lz-string compression stats

4. **Twitter/X thread:**
   ```
   I built a grocery list app with one constraint:
   No backend. No database. No auth.
   The entire list lives in the URL.

   Here's how it works 🧵
   ```

5. **Product Hunt** — After HN/Reddit validates messaging
   - Tagline: "The grocery list that lives in the URL"
   - Gallery: GIF of tap → share → receive flow

**Distribution after launch:**
- r/privacy, r/frugal, r/personalfinance, r/mealplanning, r/selfhosted, r/webdev

---

## Architecture Constraints (never violate)

- **No backend.** All state is localStorage. All sharing is URL-encoded.
- **No authentication.** Zero friction is a feature.
- **Static export only.** GitHub Pages. No server-side features.
- **Backward compatibility.** v2 lz-string links, v1 base64 links, and legacy `#list=` hash links all decode correctly. Never break existing shared URLs.

---

## Priority Table — Current

| # | Item | Type | Impact | Effort | Status |
|---|------|------|--------|--------|--------|
| 1 | Pre-loaded demo URLs for launch | VG-8 | CRITICAL for launch | Trivial | 🔲 |
| 2 | Item count badge in preset selector | VG-9 | Medium | Trivial | 🔲 |
| 3 | Delete items from category | VG-12 | Medium | Low | 🔲 |
| 4 | Share preset template | VG-11 | High | Medium | 🔲 |
| 5 | Keyboard shortcut (Cmd+Enter) | VG-10 | Low | Trivial | 🔲 |
| 6 | Clean up unused shadcn components | TD-10 | Low | Low | 🔲 |
| 7 | Upgrade Next.js (security) | TD-11 | High | Low | 🔲 |
| 8 | Launch: Show HN | VG-7 | CRITICAL | Medium | 🔲 |
| 9 | Launch: Reddit r/webdev + r/selfhosted | VG-7 | High | Low | 🔲 |
| 10 | Launch: Twitter/X thread | VG-7 | High | Low | 🔲 |
| 11 | Launch: Product Hunt | VG-7 | High | High | 🔲 |
