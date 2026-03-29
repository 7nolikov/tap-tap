# Tap-Tap-Share — Execution Plan

## Project Assessment

**What it is:** A local-first, zero-backend web app for building and sharing grocery/shopping lists. No sign-up, no tracking, works offline. Lists are encoded into shareable URLs.

**Honest strengths:**
- Instant value — no friction, no login, no install required
- Privacy story is genuine and marketable ("No data ever leaves your device")
- Viral mechanic is built-in: every shared list is a referral link
- Works on any device, any platform, including offline

**Honest weaknesses:**
- The sharing mechanic was broken at the protocol level (hash fragments stripped by every major platform)
- No README, no screenshots, no social presence — invisible to the world
- No way for recipients to save a received list — viral loop was broken at the last step
- URL grows unbounded with list size — will fail silently on large lists
- No installable PWA — loses users who need homescreen access
- Category colors lost in sharing — visual identity breaks on receipt

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

## Status: Next — Ordered by Impact

### 1. URL compression (high priority — correctness risk)

**Problem:** `encodeURIComponent(JSON.stringify(...))` expands to roughly 3× the raw JSON size before base64. A 50-item list with long names approaches 4096 characters — WhatsApp's soft URL limit. Failure is silent: the link is truncated, the recipient gets a broken URL with no error.

**Fix:** Add [lz-string](https://github.com/pieroxy/lz-string) compression before `btoa`. Drop-in replacement — encode with `LZString.compressToEncodedURIComponent()`, decode with `LZString.decompressFromEncodedURIComponent()`. Typical reduction: 50–65% on JSON payloads.

```ts
// encode
LZString.compressToEncodedURIComponent(JSON.stringify({ n: preset.name, i: items }))

// decode
JSON.parse(LZString.decompressFromEncodedURIComponent(encoded))
```

Add a version prefix (`v2:...`) so old uncompressed links continue to decode correctly.

---

### 2. PWA manifest + service worker (high priority — retention)

**Problem:** Mobile users who find value in the app cannot add it to their homescreen. No homescreen icon = no return visits. No service worker = the app fails completely with no network (despite being local-first).

**Fix:**
- Add `/public/manifest.json` with name, short_name, icons, theme_color, display: standalone
- Add a basic service worker via `next-pwa` or a manual `sw.js` that caches the static assets
- Add `<link rel="manifest">` and `meta name="theme-color"` to `layout.tsx`

Result: "Add to Home Screen" prompt appears on mobile. Return rate typically 2–3× higher than browser-only.

---

### 3. README with live demo, screenshots, how-to-share (high priority — discoverability)

**Problem:** The repo README contains two words: `# Tap Tap`. There is no live demo link, no screenshots, no explanation of the sharing mechanic, and no reason for anyone to star or share the repo.

**Fix:** Write a proper README covering:
- What it is (one sentence)
- Live demo link: `https://7nolikov.github.io/tap-tap/`
- Screenshot or GIF of the tap → share flow
- How sharing works (local-first, no server, URL encodes the list)
- How to create custom presets
- How to self-host / fork

This is required before any social posting (Product Hunt, Reddit, Hacker News).

---

### 4. "Copy link only" button (medium priority — UX)

**Problem:** The current Share button sends formatted text including the full item list AND the URL. On platforms where a clean link is expected (Slack, Notion, email subject lines), this is noisy and looks unprofessional.

**Fix:** Split the bottom action bar into two buttons:
- **Share List** — current behavior (text + URL via Web Share API or clipboard)
- **Copy link** — copies only the `?list=...` URL, no text

The link-only option is also better for Twitter/X where character limits apply.

---

### 5. Category color in share encoding (medium priority — brand)

**Problem:** The encoded share payload stores `c` (category name), `e` (emoji), `l` (label), `q` (quantity) — but not the category color. When the recipient opens a shared list, the modal renders all categories in default grey. The visual identity of the original preset is lost.

**Fix:** Add a `k` field (hex color string) to `SharedItem`. In `encodeList`, include `k: cat.color`. In the shared list modal, apply the color as a left border or dot per category — same as the main UI.

This is a minor encoding change (colors are short hex strings, minimal size increase).

---

### 6. Malformed link error feedback (low priority — polish)

**Problem:** If a shared URL is corrupted or manually edited, `decodeList()` catches the error and returns `null` silently. The user sees the app load normally with no indication that the link was broken.

**Fix:** Distinguish between "no list in URL" and "list in URL but failed to parse". Show a toast error in the second case: "This share link appears to be broken."

---

### 7. Product Hunt / Reddit launch (growth — do after 1–3 above)

**Do not launch until the following are done:**
- ✅ Sharing works reliably (`?list=` query params — done)
- ✅ Viral loop closes ("Save as preset" — done)
- README with screenshots and live demo link
- PWA installable on mobile

**Target communities:**
- Product Hunt (primary launch)
- r/selfhosted (local-first, privacy angle)
- r/webdev (tech / architecture angle — "zero backend viral sharing")
- Hacker News Show HN ("Show HN: Shareable grocery lists with no server, no login, no tracking")
- Twitter/X tech and productivity communities

**Positioning message:** "No sign-up. No server. No tracking. Tap items, share a link. The entire grocery list lives in the URL." — this is the genuine differentiator and will resonate with privacy-conscious audiences.

---

## Architecture Constraints (do not violate)

- **No backend.** All state is localStorage. All sharing is URL-encoded. This is the product's core identity and main differentiator.
- **No authentication.** Zero friction is a feature, not a gap.
- **Static export only.** Deployed to GitHub Pages. Any feature that requires a server (analytics, link shortening service, cloud sync) belongs in a separate optional layer, not the core app.
- **Backward compatibility on shared links.** New encoding versions must fall back gracefully to old links. Never break existing shared URLs.
