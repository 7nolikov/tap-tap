# TapTap — Execution Plan

_Last updated: 2026-04-06 — fourth audit_

---

## Audit Verdict

**Architecture: A. Code: B. Performance: A. Deployment: C. Viral readiness: B−.**

All bugs are fixed. Build is unblocked. The CSS bloat is gone. The share text now leads with a social hook. PWA icons are branded. The one remaining critical viral blocker is the custom domain — every day `7nolikov.github.io/tap-tap` appears in WhatsApp messages is a day the conversion funnel is half-broken.

---

## What Is Actually Shipped (live on GitHub Pages) ✅

These are committed and deployed. Everything else is local only.

- ✅ URL uses `?list=` query param (survives WhatsApp/Telegram)
- ✅ lz-string v2 compression
- ✅ Zod validation on all shared URLs
- ✅ Discriminated `DecodeResult` with error toast
- ✅ Category colors in share encoding
- ✅ OG image (1200×630), Twitter card `summary_large_image`
- ✅ PWA manifest + service worker
- ✅ 16 European presets
- ✅ "Save as my preset" CTA in shared list modal
- ✅ Viral attribution in every share
- ✅ Dark mode
- ✅ Export / Import presets

## What Is Local Only (NOT live) — Must Commit ❌

- ❌ All bug fixes and viral improvements from this session
- ❌ Branded PWA icons (shopping cart on amber)
- ❌ Fixed CSS (tw-animate-css removed, sidebar vars removed)
- ❌ Improved share text with social hook
- ❌ Welcome banner suppressed during demo

---

## Bug Status — All Fixed ✅

| Bug | Description | Status |
|-----|-------------|--------|
| BUG-A | `@import 'tw-animate-css'` in globals.css (build-breaking — pkg not installed) | ✅ Fixed |
| BUG-B | Missing `apple-touch-icon` meta tag | ✅ Fixed (prev session) |
| BUG-C | Demo modal showed double emoji in title | ✅ Fixed (prev session) |
| BUG-D | Welcome banner fired alongside demo modal (two simultaneous interruptions) | ✅ Fixed |
| BUG-E | "Share (N items)" button copy was meaningless | ✅ Fixed (prev session) |
| BUG-F | Dead `--sidebar*` CSS variables in globals.css | ✅ Fixed |
| BUG-G | `docs/` directory untracked | ⏸ Low priority — listed in .gitignore |

---

## Viral Items Status

| Item | Description | Status |
|------|-------------|--------|
| V-1 | Custom domain (taptap.app / taptap.link) | ❌ Postponed — requires external action |
| V-2 | Demo list is Christmas Dinner (10 items, 4 categories) | ✅ Done (prev session) |
| V-3 | Share text has social hook ("I'm sharing my X list — N items ready to go") | ✅ Done |
| V-4 | Branded PWA icon (shopping cart on amber, scripts/generate-icons.mjs) | ✅ Done |
| V-5 | Launch checklist | ❌ Requires live working app first |

---

## Remaining Viral Items

### V-1. Domain — the single biggest remaining viral blocker

**Status: Requires owner action**

`7nolikov.github.io/tap-tap` appears in every WhatsApp attribution message. For European families sharing lists — the primary audience — this URL looks like a phishing link. Register `taptap.app` or `taptap.link`. GitHub Pages supports custom domains via CNAME. Cost: ~$12/year.

**Steps once domain is acquired:**
1. Add `CNAME` file to `public/` with domain name
2. Update `APP_URL` in `app/layout.tsx` and `app/page.tsx`
3. Update `metadataBase` in layout.tsx
4. Update `og:url` and Twitter card URLs
5. Enable HTTPS in GitHub Pages settings

---

### V-5. Launch checklist

All of the following require a live working app at a credible URL:

1. **Commit everything + push** — triggers CI, deploys to GitHub Pages
2. **Verify live site** — open on phone, test share flow, test demo list, test PWA install
3. **Generate 3 fresh demo URLs** from the updated presets (Christmas Dinner, BBQ Party, Date Night)
4. **Show HN** — "Show HN: I built a grocery list where the entire list lives in the URL"
5. **Reddit r/selfhosted** — privacy + no-backend angle: "No server. No account. The list is the URL."
6. **Reddit r/mealplanning** — European families, non-technical: "Share your shopping list with one link, no app install"
7. **Product Hunt** — after HN validates

---

## Priority Table

| # | Item | Severity | Status |
|---|------|----------|--------|
| 0 | **Commit and push all pending changes** | CRITICAL | ❌ |
| 1 | Custom domain | CRITICAL for viral | ⏸ owner action |
| 2 | Launch: Show HN | CRITICAL | ❌ (after commit) |
| 3 | Launch: Reddit r/selfhosted, r/mealplanning | HIGH | ❌ (after commit) |
| 4 | Launch: Product Hunt | HIGH | ❌ (after HN) |

---

## Architecture Constraints (never violate)

- **No backend.** All state is localStorage. All sharing is URL-encoded.
- **No authentication.** Zero friction is a feature.
- **Static export only.** GitHub Pages. No server-side features.
- **Backward compatibility.** v2 lz-string links, v1 base64 links, and legacy `#list=` hash links all decode correctly. Never break existing shared URLs.
- **Use pnpm, not npm.** CI uses `pnpm-lock.yaml`.
