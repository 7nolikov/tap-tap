# Tap-Tap-Share — Execution Plan

_Last updated: 2026-03-30 — full project audit + viral strategy revision_

---

## Project Assessment

**What it is:** A local-first, zero-backend web app for building and sharing grocery/shopping lists. No sign-up, no tracking, works offline. Lists are encoded into shareable URLs.

**Core differentiator worth owning:** "The grocery list that lives in the URL." No server. No account. No app install. The entire list travels as a link. This is genuinely novel and eminently shareable as a concept — if the execution is tight.

**Honest strengths:**
- Instant value — no friction, no login, no install required
- Privacy story is genuine and marketable ("No data ever leaves your device")
- Viral mechanic is built-in: every shared list is a referral link
- Works on any device, any platform, including offline
- Static deployment on GitHub Pages — zero infra cost, scales infinitely

**Honest weaknesses (current state):**
- Page.tsx is 822 lines — monolithic, untestable, unmaintainable
- Zero automated tests — the most critical paths (encode/decode) are completely untested
- Silent failures everywhere — broken share link looks like a working app with no error
- Bundle bloated with unused dependencies (Recharts, Date Picker, Carousel, OTP input, cmdk, Vaul)
- No OG image — Twitter/X card is `summary` with no image, gets buried in feeds
- README contains two words — invisible to GitHub discovery, can't launch anywhere
- No PWA — mobile users who find value can't install it, return rate cratered
- URL compression still not done — large lists silently truncate on WhatsApp
- Category colors not in share encoding — visual identity breaks for every recipient
- "Cookie notice" copy is technically wrong — localStorage is not a cookie
- Native `<select>` for preset switching — only ugly element in an otherwise polished UI
- No viral attribution in shared text — every outbound share wastes a marketing touchpoint
- OG twitter card type is `summary` not `summary_large_image` — no image even if one is added
- No "delete preset" functionality — users accumulate junk presets with no escape
- No "add category" to an existing preset — only items can be added, categories are frozen
- Empty state for new presets is confusing — blank "Items" category with no explanation
- Type assertion `as ShareData` in `decodeList` bypasses type safety — should use Zod here
- basePath `/tap-tap/` is a discoverability penalty — github.io URLs look like dev toys, not products

---

## Status: Done

### ✅ Fix share URL: `#list=` → `?list=` (critical)

**Problem:** URL hash fragments (`#list=...`) are never included in HTTP requests by browser design. WhatsApp, Telegram, iMessage strip them from link previews. URL shorteners never see them and cannot preserve them. Every shared list was arriving broken for a significant portion of recipients.

**Fix:** Switched to query parameters (`?list=...`). GitHub Pages serves `index.html` for the base path regardless of query strings, so no server changes are required. Old `#list=` links still work via fallback for backward compatibility.

**Files:** `app/page.tsx` — `decodeList()`, `handleShare()`, mount `useEffect`

---

### ✅ Close the viral loop: "Save as my preset" button

**Problem:** The shared list modal had one CTA: "Build your own list" — which dismissed the shared list and opened a blank preset. The recipient lost the shared list data immediately. The viral loop was broken at its final step.

**Fix:** Primary CTA is now **"Save as my preset"**. Clicking it reconstructs the shared list as a full reusable preset in the recipient's localStorage, switches to it, and makes them an active user immediately. "Build your own list" is demoted to a secondary action.

**Viral loop:** Sender taps items → shares link → recipient opens link → sees list → saves as preset → becomes active user → shares their own lists → repeat.

**Files:** `app/page.tsx` — `sharedToPreset()`, `saveSharedAsPreset()`, shared list modal JSX

---

### ✅ OG / Twitter meta tags

**Problem:** Shared links showed no preview title or description in WhatsApp, Telegram, Twitter/X, iMessage, Slack.

**Fix:** Added `openGraph` and `twitter` metadata blocks to `layout.tsx` with title, description, URL, and card type.

**Files:** `app/layout.tsx`

---

## Technical Debt Audit — Fix Before Any Launch

These are not polish items. These are correctness, reliability, and trust issues that will hurt conversion and retention if left unfixed.

### TD-1. URL compression with lz-string (CRITICAL — correctness risk)

**Problem:** `btoa(encodeURIComponent(JSON.stringify(...)))` expands to ~3× raw JSON before base64. A 20-item list with long names hits WhatsApp's ~4096 char URL limit. Failure is silent: link truncates, recipient gets a parse error or empty modal with zero indication anything went wrong.

**Fix:** Add [lz-string](https://github.com/pieroxy/lz-string) before `btoa`. Drop-in.

```ts
// encode
const encoded = LZString.compressToEncodedURIComponent(JSON.stringify({ n: preset.name, i: items }))

// decode — detect version prefix for backward compat
function decodeList(search: string, hash: string): ShareData | null {
  const raw = new URLSearchParams(search).get("list") ?? (hash.startsWith("#list=") ? hash.slice(6) : null)
  if (!raw) return null
  try {
    const json = raw.startsWith("v2:")
      ? LZString.decompressFromEncodedURIComponent(raw.slice(3))
      : decodeURIComponent(atob(raw))
    const parsed = ShareDataSchema.safeParse(JSON.parse(json ?? ""))
    return parsed.success ? parsed.data : null
  } catch { return null }
}
```

Add a `v2:` prefix to new URLs so old links continue to decode correctly. **Typical size reduction: 55–65% on JSON payloads.**

---

### TD-2. Replace `as ShareData` type assertion with Zod validation

**Problem:** `decodeList` does `JSON.parse(...) as ShareData` — if a malformed or malicious URL is opened, the app gets unvalidated data. One bad property name and the whole app crashes silently.

**Fix:** Define `SharedItemSchema` and `ShareDataSchema` in Zod alongside the existing schemas. Use `safeParse` in `decodeList` — mirrors how localStorage is already handled. This also enables better error feedback (TD-3).

---

### TD-3. Malformed link error feedback — distinguish broken from absent

**Problem:** `decodeList` returns `null` for both "no list in URL" and "list in URL but failed to parse". Silent failure. User sees the app load normally with no indication the share link was broken.

**Fix:** Return a discriminated result:
```ts
type DecodeResult = { ok: true; data: ShareData } | { ok: false; broken: boolean }
```
Show a toast error when `broken === true`: _"This share link appears to be broken."_

---

### TD-4. Category color in share encoding

**Problem:** The encoded share payload stores `c` (category name), `e` (emoji), `l` (label), `q` (quantity) — but not the category color. When the recipient opens a shared list, every category renders in randomly-assigned colors. The visual identity of the sender's preset is completely lost.

**Fix:** Add `k` field (hex color) to `SharedItem`. Include `k: cat.color` in `encodeList`. Apply in the shared list modal as a left border or color dot — same treatment as the main UI. Minimal size increase (hex strings are 7 chars).

---

### TD-5. Remove unused dependencies — bundle bloat

**Problem:** `package.json` includes Recharts, React Day Picker, Input OTP, Embla Carousel, cmdk (command palette), and Vaul (drawer). None are used in the app. These add weight to the bundle and are confusing to anyone reading the codebase.

**Fix:**
```bash
pnpm remove recharts react-day-picker input-otp embla-carousel-react @radix-ui/react-... cmdk vaul
```

Audit the full `node_modules` vs actual imports before removing. Expected bundle reduction: 30–40%.

---

### TD-6. Fix "cookie notice" copy

**Problem:** The dismissible notice says "This app saves your lists locally." The dismiss button says "Got it." Fine. But the state key is `tap-tap-share-cookie-accepted` and conceptually it's positioned as a GDPR cookie notice — but localStorage is not a cookie. This is technically wrong and may confuse users in regions with strict privacy regulations.

**Fix:** Rename to "storage notice". No functional change needed. It's accurate: the app uses localStorage, not cookies, no tracking, no third parties.

---

### TD-7. Split the Share button: "Share List" + "Copy Link"

**Problem:** The share button sends formatted text including the full item list AND the URL. On Slack, Notion, email subject lines, or Twitter/X, this is noise. Clean URL sharing is needed.

**Fix:** Two buttons in the bottom bar:
- **Share List** — current behavior (formatted text + URL via Web Share API / clipboard fallback)
- **Copy Link** — copies only the `?list=...` URL, no text. Useful for clean embed, Twitter/X (character limit), email.

---

### TD-8. Add "delete preset" functionality

**Problem:** Users can create presets but cannot delete them. Test presets, typo presets, and shared presets accumulate with no escape hatch. This will frustrate power users.

**Fix:** Add a trash icon to the settings dialog (or as a swipe action on mobile). Confirm before deleting. Prevent deleting the last preset.

---

### TD-9. Replace native `<select>` with a styled dropdown

**Problem:** The preset switcher is a raw HTML `<select>` — the only inconsistent element in an otherwise polished glassmorphism UI. On mobile, it opens the OS picker which breaks the visual flow.

**Fix:** Use a shadcn `Select` component (already in the component library). One component swap, no logic change.

---

## Viral Marketing Audit — What's Killing Growth

### VG-1. No viral attribution in shared text (HIGHEST IMPACT)

**Problem:** Every shared list looks like this:
```
🛒 Grocery Shopping:

Dairy & Eggs:
  🥛 Milk ×2
  🧀 Cheese ×1

📱 Open list: https://7nolikov.github.io/tap-tap/?list=...
```

That URL is 55+ characters of noise. The recipient has no idea what `tap-tap` is or why they should click it. There is zero brand reinforcement.

**Fix:** Append a one-line attribution at the bottom of every shared list:
```
Built with Tap-Tap-Share — tap items, share a link, no sign-up
https://7nolikov.github.io/tap-tap/
```

Every outbound share becomes a referral. Every WhatsApp/Telegram message is an ad. This is how Calendly grew.

---

### VG-2. No OG image (CRITICAL for social click-through)

**Problem:** Twitter card type is `summary` — no image. A plain-text preview of a grocery app competes poorly against visual content in any feed. WhatsApp/Telegram previews are text-only. Click-through rate on text-only link previews is ~3× lower than image previews.

**Fix:** Create a static OG image (`/public/og-image.png`, 1200×630px). Design it with:
- App name + tagline in large type: **"Tap-Tap-Share"** / "The grocery list that lives in the URL"
- Visual showing the tap → share flow (colored item tiles → share arrow → phone receiving link)
- Clean dark/warm gradient matching app palette

Update `layout.tsx`:
```ts
twitter: { card: "summary_large_image", images: ["https://7nolikov.github.io/tap-tap/og-image.png"] },
openGraph: { images: [{ url: "...", width: 1200, height: 630 }] }
```

---

### VG-3. README is dead (CRITICAL for GitHub discoverability)

**Problem:** The README contains two words: `# Tap Tap`. No demo link, no screenshot, no feature list, no explanation of the URL-encoding mechanic. Anyone finding this repo on GitHub has no reason to click through or star it. Without stars and description, GitHub search won't surface it.

**Fix:** Write a full README covering:
- Hero image or GIF of the tap → share flow
- One-sentence positioning: "Build a grocery list by tapping, share it as a link. No sign-up. No server. No tracking."
- Live demo link: `https://7nolikov.github.io/tap-tap/`
- How sharing works (URL-encoded, no backend, works offline)
- How to create custom presets
- How to self-host / fork
- Tech stack badge row (Next.js, TypeScript, localStorage, GitHub Pages)
- Star button prompt

The README is the landing page for GitHub traffic. GitHub is a distribution channel. Fix it before any HN/Reddit/PH launch.

---

### VG-4. Add PWA manifest + service worker (RETENTION multiplier)

**Problem:** Mobile users who find value cannot add the app to their homescreen. No homescreen icon = no return visits. No service worker = the app fails completely offline despite being local-first (ironic). Return rate for homescreen-installed PWAs is 2–3× browser-only.

**Fix:**
- `/public/manifest.json` — name, short_name: "TapTap", icons (192/512px), theme_color: `#d97706`, display: `standalone`
- Basic service worker caching static assets (or use `next-pwa`)
- `<link rel="manifest">` and `<meta name="theme-color">` in `layout.tsx`
- App install banner on first visit (optional but high-impact on Android)

---

### VG-5. The app name is working against you

**Problem:** "Tap-Tap-Share" is three words hyphenated. Hard to say out loud. Hard to remember. The hyphen in the domain path (`/tap-tap/`) looks like a dev slug. "TapList", "ListDrop", "TapShare", or simply "TapTap" would be cleaner and more memorable.

**Recommendation:** Rename branding to **"TapTap"** (two words, no hyphen). URL can stay `/tap-tap/` for now — change domain only when launching seriously. Update:
- `app/layout.tsx` metadata title: "TapTap — Grocery Lists That Live in a Link"
- Header h1 in `page.tsx`
- README
- OG tags

---

### VG-6. The value proposition is buried

**Problem:** A new user lands on the app and sees a grid of grocery items. There is no headline, no tagline, no "here's what you do" copy. The only text is "Tap-Tap-Share" in the header. Users who aren't immediately self-explanatory (most of them) will bounce.

**Fix:** Add a one-time welcome banner (dismissible, stored in localStorage) shown to first-time visitors:
```
Tap items to add them to your list. Hit Share when done — your list travels as a link.
No sign-up. No account. Nothing stored on our servers.
```

Alternatively: sub-headline below the header: _"Tap items → Share the link. No sign-up. No server."_

---

### VG-7. Launch Sequence (do not skip steps)

**Gate 1 — Must be done before any social launch:**
- [ ] TD-1: URL compression (correctness — can't launch with a broken sharing mechanism)
- [ ] TD-2+3: Zod validation + error feedback (trust — broken links must fail loudly)
- [ ] TD-4: Category colors in share encoding (visual identity — first impression for recipients)
- [ ] VG-1: Viral attribution in shared text (distribution — every share must pull new users)
- [ ] VG-2: OG image (click-through — text-only previews don't convert)
- [ ] VG-3: README (GitHub distribution)
- [ ] VG-4: PWA (retention — mobile users must be able to install)
- [ ] VG-5: Rename branding to TapTap

**Gate 2 — Launch:**

1. **Show HN** — "Show HN: I built a grocery list where the entire list lives in the URL"
   - Lead with the technical hook: URL encoding, no server, backward compat
   - Include a live demo link with a pre-loaded example list
   - Respond to every comment in the first 2 hours (HN ranking is velocity-sensitive)

2. **Reddit r/selfhosted** — Privacy and local-first angle
   - Title: "Self-hostable grocery list app — the list lives in the URL, no backend, no tracking"
   - Show the URL encoding mechanism, mention fork-and-deploy in 2 clicks

3. **Reddit r/webdev** — Architecture angle
   - Title: "How I built viral sharing without a backend: the entire state lives in the URL"
   - Show the encode/decode code, lz-string compression, backward compat strategy
   - This is genuinely interesting technically and will get engagement

4. **Twitter/X thread** format:
   ```
   I built a grocery list app with a weird architectural constraint:
   No backend. No database. No auth.

   The entire list lives in the URL.

   Here's how it works 🧵
   ```
   - Show URL before/after compression
   - Show the viral loop mechanic (share → save as preset → share again)
   - End with: "Try it: [link with demo list pre-loaded]"

5. **Product Hunt** — Polish launch after HN/Reddit validates messaging
   - Tagline: "The grocery list that lives in the URL"
   - Gallery: GIF of tap → share → receive flow
   - First comment: explain the tech (URL encoding, offline, zero-backend)
   - Target: Tools & Productivity category

**Distribution after launch:**
- r/privacy (privacy angle — no tracking, no server)
- r/frugal, r/personalfinance (grocery planning angle)
- r/mealplanning (use case — preset meal-based lists)
- ProductHunt Ship (pre-launch page for email collection)

---

## Architecture Constraints (do not violate)

- **No backend.** All state is localStorage. All sharing is URL-encoded. This is the product's core identity and main differentiator.
- **No authentication.** Zero friction is a feature, not a gap.
- **Static export only.** Deployed to GitHub Pages. Any feature that requires a server (analytics, link shortening, cloud sync) belongs in a separate optional layer, not the core app.
- **Backward compatibility on shared links.** New encoding versions must fall back gracefully to old links. Never break existing shared URLs.

---

## Priority Order — Revised

| # | Item | Type | Impact | Effort |
|---|------|------|--------|--------|
| 1 | URL compression (lz-string) + Zod validation | TD-1, TD-2 | CRITICAL | Low |
| 2 | Malformed link error feedback | TD-3 | High | Low |
| 3 | Category colors in share encoding | TD-4 | High | Low |
| 4 | Viral attribution in shared text | VG-1 | CRITICAL | Trivial |
| 5 | OG image 1200×630 | VG-2 | High | Medium |
| 6 | README with demo + screenshots | VG-3 | High | Medium |
| 7 | PWA manifest + service worker | VG-4 | High | Medium |
| 8 | Rename branding to TapTap | VG-5 | Medium | Low |
| 9 | Value prop copy / welcome banner | VG-6 | Medium | Low |
| 10 | Split Share/Copy Link buttons | TD-7 | Medium | Low |
| 11 | Replace native select with shadcn Select | TD-9 | Low | Trivial |
| 12 | Delete preset functionality | TD-8 | Medium | Low |
| 13 | Remove unused dependencies | TD-5 | Medium | Low |
| 14 | Fix "cookie notice" copy | TD-6 | Low | Trivial |
| 15 | Launch: Show HN | VG-7 | CRITICAL | Medium |
| 16 | Launch: Reddit r/webdev + r/selfhosted | VG-7 | High | Low |
| 17 | Launch: Twitter/X thread | VG-7 | High | Low |
| 18 | Launch: Product Hunt | VG-7 | High | High |
