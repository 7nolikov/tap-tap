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
const { defaultPresets, DEMO_LIST } = await jiti.import(ROOT + '/lib/presets.ts')
const { readableOn, bestContrast } = await jiti.import(ROOT + '/lib/color.ts')
const { firstGrapheme, fold } = await jiti.import(ROOT + '/lib/text.ts')

let pass = 0, fail = 0
const t = (name, cond, extra='') => { cond ? (pass++, console.log(`  ok   ${name}`)) : (fail++, console.log(`  FAIL ${name} ${extra}`)) }

console.log('\n[v2 round-trip]')
const preset = defaultPresets[0]
const cat = preset.categories[0], cat2 = preset.categories[1]
const sel = {
  [`${cat.id}:${cat.items[0].id}`]: 2,
  [`${cat.id}:${cat.items[2].id}`]: 1,
  [`${cat2.id}:${cat2.items[0].id}`]: 3,
}
const encoded = share.encodeList(preset, sel)
t('encodes with v2 prefix', encoded.startsWith('v2:'))
const back = share.decodeList(`?list=${encoded}`, '')
t('decodes ok', back.ok === true)
t('preserves preset name', back.data?.n === preset.name)
t('preserves item count', back.data?.i.length === 3)
t('preserves quantities', JSON.stringify(back.data.i.map(i=>i.q)) === '[2,1,3]')
t('preserves category colour', back.data.i[0].k === cat.color)

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

console.log('\n[text helpers]')
t('grapheme keeps ZWJ emoji', firstGrapheme('👨‍🍳x') === '👨‍🍳', JSON.stringify(firstGrapheme('👨‍🍳x')))
t('grapheme keeps variation selector', firstGrapheme('✏️abc') === '✏️')
t('grapheme truncates to one', firstGrapheme('🍎🍌') === '🍎')
t('fold strips diacritics', fold('Crème Fraîche').includes('creme'))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
