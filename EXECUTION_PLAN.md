# TapTap — Execution Plan

_Last updated: 2026-04-06 — fifth audit (brutal)_

---

## Audit Verdict

| Dimension | Grade | Notes |
|-----------|-------|-------|
| Architecture | A | Clean types, Zod validation, PWA, service worker. Solid bones. |
| Code Quality | C+ | 1,938-line monolithic page.tsx. APP_URL duplicated AND inconsistent. Dead code (use-toast.ts, isShorteningUrl). |
| Performance | B | All preset data in bundle, hexToRgba not memoised, no lazy loading. |
| Deployment | C | GitHub subdirectory URL kills virality. CACHE_VERSION manually bumped (will be forgotten). No analytics. |
| Viral Readiness | D → B | Share text was too long + attribution buried. Desktop share copied a text blob. is.gd friction. Fixed this session. |

---

## Bugs Fixed This Session ✅

| Bug | Description | Status |
|-----|-------------|--------|
| BUG-H | APP_URL trailing slash mismatch — layout.tsx had no slash, page.tsx had trailing slash | ✅ Fixed |
| BUG-I | Desktop share copied full text blob (not URL) — useless clipboard content | ✅ Fixed |
| BUG-J | Missing `<link rel="icon">` favicon tag | ✅ Fixed |
| BUG-K | `isShorteningUrl` state + `shortenUrl()` function were is.gd coupling — 3-tap friction to share | ✅ Removed |
| BUG-L | "Grocery Shopping" preset had no emoji while all 15 others did | ✅ Fixed (🛒) |
| BUG-M | Share text attribution buried at END — WhatsApp preview only shows first 2 lines | ✅ Fixed |
| BUG-N | No JSON-LD structured data — zero SEO benefit from landing page | ✅ Fixed |

---

## Previous Bug Status

| Bug | Description | Status |
|-----|-------------|--------|
| BUG-A | `@import 'tw-animate-css'` in globals.css (build-breaking — pkg not installed) | ✅ Fixed (session 4) |
| BUG-B | Missing `apple-touch-icon` meta tag | ✅ Fixed (session 3) |
| BUG-C | Demo modal showed double emoji in title | ✅ Fixed (session 3) |
| BUG-D | Welcome banner fired alongside demo modal (two simultaneous interruptions) | ✅ Fixed (session 4) |
| BUG-E | "Share (N items)" button copy was meaningless | ✅ Fixed (session 3) |
| BUG-F | Dead `--sidebar*` CSS variables in globals.css | ✅ Fixed (session 4) |

---

## What Is Actually Shipped (live on GitHub Pages) ✅

- ✅ URL uses `?list=` query param (survives WhatsApp/Telegram)
- ✅ lz-string v2 compression
- ✅ Zod validation on all shared URLs
- ✅ OG image (1200×630), Twitter card `summary_large_image`
- ✅ PWA manifest + service worker
- ✅ 16 presets (all with emojis now)
- ✅ "Save as my preset" CTA in shared list modal
- ✅ Dark mode
- ✅ Export / Import presets

## What Was Just Fixed (local, needs push) ❌

- ❌ Reformed share text (shorter, attribution first, URL-only desktop copy)
- ❌ Removed is.gd / isShorteningUrl complexity
- ❌ Added Twitter/X share for desktop (no Web Share API)
- ❌ Added `<link rel="icon">` favicon
- ❌ Added JSON-LD structured data
- ❌ 🛒 emoji on "Grocery Shopping" preset
- ❌ PWA install prompt (beforeinstallprompt capture)
- ❌ Demo modal improved CTAs

---

## Viral Items Status

| Item | Description | Status |
|------|-------------|--------|
| V-1 | Custom domain (taptap.app / taptap.link) | ❌ Requires owner action |
| V-2 | Demo list is Christmas Dinner (10 items, 4 categories) | ✅ Done |
| V-3 | Share text: short, attribution first, URL-only desktop copy | ✅ Fixed this session |
| V-4 | Branded PWA icon | ✅ Done |
| V-5 | Launch checklist | ❌ Requires live app |
| V-6 | Twitter/X share for desktop | ✅ Fixed this session |
| V-7 | JSON-LD structured data | ✅ Fixed this session |
| V-8 | PWA install prompt | ✅ Fixed this session |

---

## Remaining Critical Items

### V-1. Domain — the single biggest remaining viral blocker

**Status: Requires owner action**

`7nolikov.github.io/tap-tap` appears in every WhatsApp attribution message. For European families sharing lists — the primary audience — this URL looks like a phishing link or a GitHub project page. Register `taptap.app` or `taptap.link`. Cost: ~$12/year.

**Steps once domain is acquired:**
1. Add `CNAME` file to `public/` with domain name
2. Update `APP_URL` in `app/layout.tsx` and `app/page.tsx` (single constant in each)
3. Update `metadataBase` in layout.tsx
4. Update `start_url` and `scope` in `public/manifest.json`
5. Update service worker cache paths in `public/sw.js`
6. Enable HTTPS in GitHub Pages settings
7. Remove `basePath` and `assetPrefix` from `next.config.mjs` (no longer needed at root domain)

### V-5. Launch checklist

1. **Commit everything + push** — triggers CI, deploys to GitHub Pages
2. **Verify live site** — open on phone, test share flow end-to-end, test demo list, test PWA install
3. **Generate 3 demo share URLs** — Christmas Dinner, BBQ Party, Date Night
4. **Show HN** — "Show HN: I built a grocery list where the entire list lives in the URL"
5. **Reddit r/selfhosted** — "No server. No account. The list is the URL."
6. **Reddit r/mealplanning** — "Share your shopping list with one link, no app install"
7. **Twitter/X** — share a demo URL and a screenshot
8. **Product Hunt** — after HN validates

---

## Remaining Technical Debt (non-blocking)

| Issue | Impact | Fix |
|-------|--------|-----|
| 1,938-line monolithic page.tsx | Maintenance debt | Split into components (never the right time until it breaks) |
| `use-toast.ts` hook is dead code | Bundle bloat | Delete the file |
| `CACHE_VERSION` in sw.js manually bumped | Deploy risk | Auto-increment via build script |
| `hexToRgba` not memoised | Minor perf | Wrap in useMemo |
| No analytics | Flying blind | Add Plausible or SimpleAnalytics (privacy-safe) |
| Preset selector is a dropdown | UX friction on mobile | Horizontal scroll tabs |
| No item search/filter | UX for power users | Search input above grid |
| Reset button has no confirmation | Accidental data loss | Confirm dialog or long-press |

---

## Architecture Constraints (never violate)

- **No backend.** All state is localStorage. All sharing is URL-encoded.
- **No authentication.** Zero friction is a feature.
- **Static export only.** GitHub Pages. No server-side features.
- **Backward compatibility.** v2 lz-string links, v1 base64 links, and legacy `#list=` hash links all decode correctly. Never break existing shared URLs.
- **Use pnpm, not npm.** CI uses `pnpm-lock.yaml`.

---

## Priority Table

| # | Item | Severity | Status |
|---|------|----------|--------|
| 0 | **Commit and push all pending changes** | CRITICAL | ❌ |
| 1 | Custom domain | CRITICAL for viral | ⏸ owner action |
| 2 | Launch: Show HN | CRITICAL | ❌ (after deploy) |
| 3 | Launch: Reddit r/selfhosted, r/mealplanning | HIGH | ❌ (after HN) |
| 4 | Launch: Product Hunt | HIGH | ❌ (after HN) |
| 5 | Delete dead use-toast.ts | LOW | ❌ |
| 6 | Analytics (Plausible) | MEDIUM | ❌ |
| 7 | Custom domain infra changes | CRITICAL (once domain bought) | ⏸ |
