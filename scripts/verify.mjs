/**
 * Behavioural checks for the logic that has no UI to catch it: share encoding,
 * backward compatibility with old link formats, and palette contrast.
 *
 * Run with `pnpm verify`. Uses jiti (already present via Next) to load the TypeScript
 * sources directly, so there is no build step and no test framework to install.
 */
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')
const jiti = createJiti(import.meta.url, { alias: { '@': ROOT } })

const share = await jiti.import(ROOT + '/lib/share.ts')
const { defaultPresets, DEMO_LIST, PRESET_COLORS } = await jiti.import(ROOT + '/lib/presets.ts')
const { readableOn, bestContrast } = await jiti.import(ROOT + '/lib/color.ts')
const { firstGrapheme, fold } = await jiti.import(ROOT + '/lib/text.ts')
const econ = await jiti.import(ROOT + '/lib/economics.ts')

let pass = 0, fail = 0
const t = (name, cond, extra='') => { cond ? (pass++, console.log(`  ok   ${name}`)) : (fail++, console.log(`  FAIL ${name} ${extra}`)) }

console.log('\n[v3 round-trip]')
const preset = defaultPresets[0]
const cat = preset.categories[0], cat2 = preset.categories[1]
const sel = {
  [`${cat.id}:${cat.items[0].id}`]: 2,
  [`${cat.id}:${cat.items[2].id}`]: 1,
  [`${cat2.id}:${cat2.items[0].id}`]: 3,
}
const encoded = share.encodeList(preset, sel)
t('encodes with v3 prefix', encoded.startsWith('v3:'))
const back = share.decodeList(`?list=${encoded}`, '')
t('decodes ok', back.ok === true)
t('preserves preset name', back.data?.n === preset.name)
t('preserves item count', back.data?.i.length === 3)
t('preserves quantities', JSON.stringify(back.data.i.map(i=>i.q)) === '[2,1,3]')
t('preserves category name', back.data.i[0].c === cat.name)
t('preserves category colour', back.data.i[0].k === cat.color)
t('regroups items under their own category', back.data.i[2].c === cat2.name)
t('rejects a malformed v3 tuple', share.decodeList(`?list=v3:${
  (await import('lz-string')).default.compressToEncodedURIComponent(JSON.stringify({ n:'x', c:[], i:[[0,'a']] }))
}`, '').broken === true)

console.log('\n[legacy v2 lz-string ?list=]')
const LZ = (await import('lz-string')).default
const v2raw = 'v2:' + LZ.compressToEncodedURIComponent(JSON.stringify({
  n: 'Old v2 List', i: [{ c: 'Veg', e: '🥕', l: 'Carrots', q: 2, k: '#10b981' }],
}))
const v2out = share.decodeList(`?list=${v2raw}`, '')
t('v2 still decodes', v2out.ok === true)
t('v2 payload intact', v2out.data?.i[0].l === 'Carrots' && v2out.data.i[0].k === '#10b981')

console.log('\n[legacy v1 base64 ?list=]')
const legacyJson = JSON.stringify({ n: 'Old List', i: [{ c:'Veg', e:'🥕', l:'Carrots', q:2 }] })
const v1 = btoa(encodeURIComponent(legacyJson))
const v1out = share.decodeList(`?list=${v1}`, '')
t('v1 base64 decodes', v1out.ok === true, JSON.stringify(v1out))
t('v1 payload intact', v1out.data?.i[0].l === 'Carrots')

console.log('\n[legacy #list= hash]')
const hashOut = share.decodeList('', `#list=${v1}`)
t('hash form decodes', hashOut.ok === true)

console.log('\n[failure modes]')
t('no param -> not broken', share.decodeList('', '').ok === false && share.decodeList('','').broken === false)
t('garbage -> broken', share.decodeList('?list=v2:@@@notvalid@@@', '').broken === true)
t('v3 garbage -> broken', share.decodeList('?list=v3:@@@notvalid@@@', '').broken === true)
t('valid b64 wrong shape -> broken', share.decodeList(`?list=${btoa('{"x":1}')}`, '').broken === true)

console.log('\n[preset templates]')
const pEnc = share.encodePreset(preset)
t('preset prefix', pEnc.startsWith('preset:v1:'))
const pBack = share.decodePreset(`?preset=${pEnc}`)
t('preset decodes', pBack !== null)
t('preset categories intact', pBack?.categories.length === preset.categories.length)
t('rejects list payload as preset', share.decodePreset(`?preset=${encoded}`) === null)

console.log('\n[sharedToPreset]')
const rebuilt = share.sharedToPreset(DEMO_LIST)
t('groups demo into 4 categories', rebuilt.categories.length === 4, `got ${rebuilt.categories.length}`)
t('unique category ids', new Set(rebuilt.categories.map(c=>c.id)).size === 4)
t('unique item ids', new Set(rebuilt.categories.flatMap(c=>c.items.map(i=>i.id))).size === DEMO_LIST.i.length)

console.log('\n[link budget]')
t('short list safe', share.linkBudget(300).status === 'safe')
t('mid list caution', share.linkBudget(1200).status === 'caution')
t('long list warn', share.linkBudget(1900).status === 'warn')
const realUrl = `https://7nolikov.github.io/tap-tap/?list=${encoded}`
console.log(`  (3-item real link = ${realUrl.length} chars, ${share.linkBudget(realUrl.length).status})`)

console.log('\n[share text]')
const txt = share.buildShareText(preset, 6, 'https://x.test/l')
t('strips leading emoji from name', !txt.split('\n')[0].includes('🛒 🛒'))
t('attribution present', txt.includes('TapTap'))
t('singular grammar', share.buildShareText(preset, 1, 'u').includes('1 item ready'))

console.log('\n[colour contrast — every palette colour on a filled tile]')
for (const c of ['#3b82f6','#10b981','#ef4444','#f59e0b','#a78bfa','#ec4899','#06b6d4','#84cc16']) {
  t(`${c} -> ${readableOn(c)} @ ${bestContrast(c).toFixed(2)}:1`, bestContrast(c) >= 4.5)
}

// ─── Dataset ─────────────────────────────────────────────────────────────────
//
// The presets are data, and data rots silently: a duplicated emoji, a price typo two
// orders of magnitude out, one preset that grew to twice the size of the others. None
// of it throws, all of it degrades the thing the app is for. These are the invariants
// the dataset is designed around, asserted so an edit cannot quietly break them.

const allItems = defaultPresets.flatMap(p => p.categories.flatMap(c => c.items))

console.log('\n[dataset shape]')
t('ten personas', defaultPresets.length === 10, `got ${defaultPresets.length}`)
t('every preset has a persona', defaultPresets.every(p => p.persona))
t('unique preset ids', new Set(defaultPresets.map(p => p.id)).size === defaultPresets.length)
t('4 categories each', defaultPresets.every(p => p.categories.length === 4),
  defaultPresets.filter(p => p.categories.length !== 4).map(p => p.id).join(','))
// Exactly six, because the item grid is 2 columns on a phone, 3 on a tablet and 4 on a
// wide desktop. Six fills whole rows at 2 and 3, and a clean half-row at 4. Five leaves
// an orphan tile on every breakpoint, which is what the old data did.
t('exactly 6 items per category', defaultPresets.every(p => p.categories.every(c => c.items.length === 6)),
  defaultPresets.flatMap(p => p.categories.filter(c => c.items.length !== 6).map(c => `${c.id}:${c.items.length}`)).join(','))
const sizes = defaultPresets.map(p => p.categories.reduce((s, c) => s + c.items.length, 0))
t('24 items per preset', sizes.every(n => n === 24), `${Math.min(...sizes)}–${Math.max(...sizes)}`)
t('category colours from the palette', defaultPresets.every(p => p.categories.every(c => PRESET_COLORS.includes(c.color))))
t('4 distinct colours per preset', defaultPresets.every(p => new Set(p.categories.map(c => c.color)).size === 4))

console.log('\n[dataset legibility]')
// The emoji is the tile's primary visual key at 22px. Repeats inside one preset make
// items indistinguishable at a glance; repeats across presets are fine and wanted.
const emojiClashes = defaultPresets.filter(p => {
  const e = p.categories.flatMap(c => c.items.map(i => i.emoji))
  return new Set(e).size !== e.length
})
t('emoji unique within each preset', emojiClashes.length === 0, emojiClashes.map(p => p.id).join(','))
const longNames = allItems.filter(i => i.name.length > 20)
t('item names ≤ 20 chars', longNames.length === 0, longNames.map(i => i.name).join(','))
t('category names ≤ 22 chars', defaultPresets.every(p => p.categories.every(c => c.name.length <= 22)))
t('unique item ids within a category', defaultPresets.every(p => p.categories.every(c =>
  new Set(c.items.map(i => i.id)).size === c.items.length)))

console.log('\n[dataset economics]')
t('every item priced', allItems.every(i => Number.isInteger(i.cents) && i.cents > 0),
  allItems.filter(i => !Number.isInteger(i.cents)).map(i => i.name).join(','))
t('every item has a unit', allItems.every(i => typeof i.unit === 'string' && i.unit.length > 0))
// Catches a decimal slipped by a factor of 100 in either direction.
t('prices within €0.20–€40', allItems.every(i => i.cents >= 20 && i.cents <= 4000),
  allItems.filter(i => i.cents < 20 || i.cents > 4000).map(i => `${i.name} ${i.cents}`).join(','))
t('budgets positive', defaultPresets.every(p => p.persona.weeklyBudgetCents > 0))
t('households 1–5', defaultPresets.every(p => p.persona.household >= 1 && p.persona.household <= 5))
// The rail is ordered by spend per head so that scrolling it is itself the distribution.
const perPerson = defaultPresets.map(p => p.persona.weeklyBudgetCents / p.persona.household)
t('rail ordered by spend per person', perPerson.every((v, i) => i === 0 || perPerson[i - 1] <= v),
  perPerson.map(v => (v / 100).toFixed(2)).join(' '))
const spread = Math.max(...perPerson) / Math.min(...perPerson)
t('spread ≥ 3× between extremes', spread >= 3, `${spread.toFixed(1)}×`)
console.log(`  (€${(Math.min(...perPerson)/100).toFixed(2)}–€${(Math.max(...perPerson)/100).toFixed(2)} per person/week, ${spread.toFixed(1)}× spread)`)

console.log('\n[cost model]')
const tally = [{
  id: 'c1', name: 'Meat', color: '#ef4444',
  count: 3, items: [{ id: 'a', name: 'Mince', emoji: '🥩', qty: 2, key: 'c1:a', cents: 899 },
                    { id: 'b', name: 'Chicken', emoji: '🍗', qty: 1, key: 'c1:b', cents: 749 }],
}]
const AT_BASELINE = { now: econ.PRICE_BASELINE.epoch }
const std = econ.basketCost(tally, { tier: 'standard', ...AT_BASELINE })
t('sums quantity × price', std.totalCents === 899 * 2 + 749, `got ${std.totalCents}`)
t('per-category cost matches total', std.byCategory[0].cents === std.totalCents)
const cheap = econ.basketCost(tally, { tier: 'discount', ...AT_BASELINE })
const dear = econ.basketCost(tally, { tier: 'premium', ...AT_BASELINE })
t('discounter cheaper than standard', cheap.totalCents < std.totalCents)
t('premium dearer than standard', dear.totalCents > std.totalCents)
t('tier spread ≈ 1.7×', (dear.totalCents / cheap.totalCents).toFixed(2) === '1.72', `${(dear.totalCents/cheap.totalCents).toFixed(2)}`)
const unpriced = econ.basketCost([{ ...tally[0], items: [{ ...tally[0].items[0], cents: undefined }] }], { tier: 'standard' })
t('unpriced items counted, not silently free', unpriced.unpricedItems === 1 && unpriced.totalCents === 0)
t('no inflation at baseline', econ.inflationFactor(econ.monthsSinceBaseline(econ.PRICE_BASELINE.epoch)) === 1)
t('inflation compounds forward', econ.inflationFactor(12) > econ.inflationFactor(0))
t('never ages backwards', econ.monthsSinceBaseline(econ.PRICE_BASELINE.epoch - 1e10) === 0)
t('budget under', econ.readBudget(5000, 10000).status === 'under')
t('budget near at 90%', econ.readBudget(9000, 10000).status === 'near')
t('budget over', econ.readBudget(10001, 10000).status === 'over')
t('gauge saturates when over', econ.readBudget(50000, 10000).ratio === 1)
t('no gauge without a budget', econ.readBudget(100, 0) === null)

console.log('\n[prices survive the link]')
const priceP = defaultPresets[0]
const priceCat = priceP.categories[0]
const priceSel = { [`${priceCat.id}:${priceCat.items[0].id}`]: 2 }
const priceBack = share.decodeList(`?list=${share.encodeList(priceP, priceSel)}`, '')
t('price crosses the wire', priceBack.data.i[0].p === priceCat.items[0].cents)
t('unit crosses the wire', priceBack.data.i[0].u === priceCat.items[0].unit)
t('rebuilt preset keeps prices', share.sharedToPreset(priceBack.data).categories[0].items[0].cents === priceCat.items[0].cents)
// Unpriced items must not start emitting null keys — that is pure link budget for nothing.
const bare = { id: 'x', name: 'X', categories: [{ id: 'c', name: 'C', color: '#3b82f6', items: [{ id: 'i', name: 'I', emoji: '🍎' }] }] }
const bareOut = share.decodeList(`?list=${share.encodeList(bare, { 'c:i': 1 })}`, '')
t('no price keys when unpriced', !('p' in bareOut.data.i[0]) && !('u' in bareOut.data.i[0]))

// Two thresholds, because they answer different questions.
//
// A ~12-item list is what people actually send, and it must land in "sends anywhere".
// Selecting an entire preset is the theoretical ceiling — nobody buys all 22 — and it
// only has to stay clear of "warn". Both are checked across every preset, not just one,
// because the longest preset is the one that will break first.
const ORIGIN = 'https://7nolikov.github.io/tap-tap/?list='
const linkFor = (preset, limit) => {
  const s = {}
  let n = 0
  for (const c of preset.categories) for (const i of c.items) if (n++ < limit) s[`${c.id}:${i.id}`] = 1
  return (ORIGIN + share.encodeList(preset, s)).length
}
const realistic = defaultPresets.map(p => linkFor(p, 12))
const ceiling = defaultPresets.map(p => linkFor(p, Infinity))
t('a real 12-item list sends anywhere', realistic.every(n => share.linkBudget(n).status === 'safe'),
  `worst ${Math.max(...realistic)} chars`)
t('even a whole preset never hits warn', ceiling.every(n => share.linkBudget(n).status !== 'warn'),
  `worst ${Math.max(...ceiling)} chars`)
console.log(`  (12-item list ${Math.min(...realistic)}–${Math.max(...realistic)} chars; whole preset ${Math.min(...ceiling)}–${Math.max(...ceiling)})`)
console.log(`  (same 12-item lists under v2 with prices were ~30% longer, and over the safe line)`)

console.log('\n[text helpers]')
t('grapheme keeps ZWJ emoji', firstGrapheme('👨‍🍳x') === '👨‍🍳', JSON.stringify(firstGrapheme('👨‍🍳x')))
t('grapheme keeps variation selector', firstGrapheme('✏️abc') === '✏️')
t('grapheme truncates to one', firstGrapheme('🍎🍌') === '🍎')
t('fold strips diacritics', fold('Crème Fraîche').includes('creme'))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
