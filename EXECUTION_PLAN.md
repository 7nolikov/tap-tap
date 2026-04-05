# TapTap — Execution Plan

_Last updated: 2026-04-05 — third audit_

---

## Audit Verdict

**Architecture: A. Code: B. Performance: D. Deployment: F. Viral readiness: C−.**

The mechanics are right. The execution is still broken in ways that make the app functionally unlaunchable. Nothing from the last two sessions has been committed. The CSS bundle is 767KB because of one unused package. The PWA icons are blank amber squares. The live site is the old broken version. Fix these in order, then launch.

---

## What Is Actually Shipped (live on GitHub Pages) ✅

These are committed and deployed. Everything else is local only.

- ✅ URL uses `?list=` query param (survives WhatsApp/Telegram)
- ✅ lz-string v2 compression
- ✅ Zod validation on all shared URLs
- ✅ Discriminated `DecodeResult` with error toast
- ✅ Category colors in share encoding
- ✅ OG image (1200×630), Twitter card `summary_large_image`
- ✅ PWA manifest + service worker (old version)
- ✅ 16 European presets
- ✅ "Save as my preset" CTA in shared list modal
- ✅ Viral attribution in every share
- ✅ Dark mode
- ✅ Export / Import presets

## What Is Local Only (NOT live) — Must Commit ❌

Every item below is done in code but not committed. The live site has none of it.

- ❌ PWA icons (192/512 PNGs) — live site still shows broken icon
- ❌ Fixed manifest (proper icon entries, form_factor screenshot)
- ❌ Fixed service worker (cache versioned, precaches JS bundles)
- ❌ robots.txt + sitemap.xml
- ❌ 24 unused Radix packages removed from package.json
- ❌ types/dom-fix.d.ts — @types/node DOM type augmentations
- ❌ Keyboard shortcut Cmd+Enter (useRef pattern)
- ❌ Delete items (edit mode)
- ❌ Item count in preset selector
- ❌ URL shortener (is.gd with consent)
- ❌ Preset template sharing (?preset=v2:...)
- ❌ First-run demo list
- ❌ Updated README

---

## Open Bugs — Fix Before Commit

### BUG-A. CSS bundle is 767KB — `tw-animate-css` is the culprit

**Severity: HIGH**

`tw-animate-css` dumps the entire animate.css library as Tailwind utilities regardless of usage. Under gzip: ~70KB. Still unnecessary. For comparison, Tailwind v4 without `tw-animate-css` produces ~15KB.

The app uses exactly these animation classes: `tailwindcss-animate` handles enter/exit animations for Dialog, Select, Alert. `tw-animate-css` adds nothing that isn't already in `tailwindcss-animate`.

**Fix:**
```bash
pnpm remove tw-animate-css
```
Remove `@import "tw-animate-css"` from `globals.css`. Verify Dialog/Select open/close animations still work (they use `tailwindcss-animate`, not `tw-animate-css`). Expected CSS reduction: ~700KB.

---

### BUG-B. No `apple-touch-icon` — iOS install shows page screenshot

**Severity: HIGH**

Missing from `layout.tsx`. Add to `<head>`:
```html
<link rel="apple-touch-icon" href="/tap-tap/icon-192.png" />
```

---

### BUG-C. Demo modal title shows `🛒 Anna's Weekend Shopping 🛒`

**Severity: MEDIUM**

`DEMO_LIST.n` is `"Anna's Weekend Shopping 🛒"`. The modal prepends `🛒` hardcoded, creating a double emoji.

**Fix 1:** Remove trailing emoji from `DEMO_LIST.n`:
```ts
n: "Anna's Weekend Shopping",
```

**Fix 2 (better):** Replace the demo with something more impressive. "Anna's Weekend Shopping" with 7 items is the least viral possible first impression. Replace with **Christmas Dinner** (seasonal, 10 items, 4 categories — the kind of list families actually share). Change `isDemoList` label to reflect this.

---

### BUG-D. Storage notice + demo modal fire simultaneously

**Severity: MEDIUM**

First-time visitors see: demo modal opens, storage notice banner appears at bottom at the same time. Two interruptions. The storage notice should be deferred until the demo is dismissed.

**Fix:** In the mount effect, only show the storage notice if NOT showing the demo:
```ts
if (!showingDemo && localStorage.getItem("tap-tap-storage-accepted") !== "true") {
  setShowStorageNotice(true)
}
```
OR: in the storage notice render, only show when `!sharedList && !sharedPreset`.

---

### BUG-E. "Share (5 items)" button copy is meaningless

**Severity: MEDIUM**

`Share (5 items)` — the count communicates nothing to the user about what they're sharing. It should read `Share List`.

**Fix:** Change the button label:
```tsx
Share List
```

---

### BUG-F. Sidebar CSS variables in globals.css are dead code

**Severity: LOW**

The sidebar shadcn component was deleted, but `globals.css` still defines `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, etc. These add to the CSS custom properties output for no reason.

**Fix:** Remove the `--sidebar*` variables from both `:root` and `.dark` blocks in `globals.css`.

---

### BUG-G. `docs/` directory is untracked

**Severity: LOW**

`git status` shows `?? docs/`. Either it's a stale artifact (delete it) or a deployment output (commit it or add to `.gitignore`).

---

## Remaining Viral Items

### V-1. Domain — every day without it costs viral reach

**Status: Postponed to launch**

`7nolikov.github.io/tap-tap` appears in every WhatsApp attribution message. For European families sharing lists — the primary audience — this URL looks like a phishing link. Register `taptap.app` or `taptap.link`. GitHub Pages supports custom domains via CNAME. Cost: ~$12/year. Viral impact: immeasurable.

---

### V-2. Demo list is the wrong list

**Status: Must fix**

`DEMO_LIST` currently shows Anna's 7-item grocery list. This is boring. The demo is the first thing new users see — it should be the most impressive, most shareable thing in the app.

**Replace with Christmas Dinner demo** — 10 items, 4 categories, seasonal, recognisable. Users think "oh I could use this for Christmas" and immediately understand the value.

---

### V-3. Share text needs a hook at the top

**Status: Not done**

Current share text:
```
🛒 Christmas Dinner 🎄:

The Main Event:
  🦃 Whole Turkey ×1
  ...
📱 Open list: https://...
— Built with TapTap ...
```

The first thing the recipient reads is the preset name. That's not a hook. The attribution is buried at the bottom.

**Better:**
```
I'm sharing my Christmas Dinner list via TapTap 🎄

The Main Event:
  🦃 Whole Turkey ×1
  ...
👉 Tap to open & save: https://...

Shared with TapTap — no sign-up, list travels in the link.
```

This requires changing `buildShareText` to put a social hook before the item list.

---

### V-4. PWA icon needs visual identity

**Status: Partial — icon exists but is a blank amber square**

Generated a solid amber PNG. That's better than missing but worse than branded. The icon should have a recognisable symbol — a shopping bag, "TT", or shopping cart — that's identifiable at 40×40px on a home screen.

**Fix options:**
- SVG with a white shopping bag on amber background, converted to PNG
- Generate using a canvas-based script with a simple white symbol

---

### V-5. Launch checklist

All of the following require a live working app (V-1 through V-4 done first):

1. **Commit everything + push** — triggers CI, deploys to GitHub Pages
2. **Verify live site** — open on phone, test share flow, test demo list, test PWA install
3. **Generate 3 fresh demo URLs** from the updated presets
4. **Show HN** — "Show HN: I built a grocery list where the entire list lives in the URL"
5. **Reddit r/selfhosted** — privacy + no-backend angle
6. **Reddit r/mealplanning** — European families, non-technical angle
7. **Product Hunt** — after HN validates

---

## Priority Table

| # | Item | Severity | Status |
|---|------|----------|--------|
| 0 | **Commit and push all pending changes** | CRITICAL | ❌ |
| 1 | Remove `tw-animate-css` (767KB → ~15KB CSS) | HIGH | ❌ |
| 2 | Add `apple-touch-icon` to layout.tsx | HIGH | ❌ |
| 3 | Fix demo list: Christmas Dinner, remove double emoji | MEDIUM | ❌ |
| 4 | Suppress storage notice while demo modal is open | MEDIUM | ❌ |
| 5 | Change "Share (N items)" → "Share List" | MEDIUM | ❌ |
| 6 | Remove dead `--sidebar*` CSS variables | LOW | ❌ |
| 7 | Delete or commit `docs/` directory | LOW | ❌ |
| 8 | Share text: add social hook at top of message | MEDIUM | ❌ |
| 9 | PWA icon with visual identity (not blank amber) | HIGH | ❌ |
| 10 | Custom domain | CRITICAL for viral | ⏸ postponed |
| 11 | Launch: Show HN | CRITICAL | ❌ |
| 12 | Launch: Reddit, Product Hunt | HIGH | ❌ |

---

## Architecture Constraints (never violate)

- **No backend.** All state is localStorage. All sharing is URL-encoded.
- **No authentication.** Zero friction is a feature.
- **Static export only.** GitHub Pages. No server-side features.
- **Backward compatibility.** v2 lz-string links, v1 base64 links, and legacy `#list=` hash links all decode correctly. Never break existing shared URLs.
- **Use pnpm, not npm.** CI uses `pnpm-lock.yaml`.
