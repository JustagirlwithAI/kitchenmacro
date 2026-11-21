// Food lookup: (1) bundled USDA SR Legacy list — offline, free, no key
//              (2) live USDA FoodData Central API — online, adds branded foods, free key
import { GROUPS } from './data.js'

let cache = null
export function loadUsda() {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}usda-sr-legacy.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => d.foods.map(([fdcId, name, g, kcal, p, c, f]) => ({
        fdcId, name, group: d.groups[g] || 'Other', kcal, p, c, f, lc: name.toLowerCase(), source: 'USDA SR Legacy',
      })))
      .catch(e => { cache = null; throw e })
  }
  return cache
}

// Ghanaian / British kitchen words -> USDA wording
const PHRASES = [
  [/garden ?eggs?|aubergines?|garden ?egg/g, 'eggplant'],
  [/scotch ?bonnet|chill?i(es)?( peppers?)?|kpakpo ?shito/g, 'peppers hot chili'],
  [/groundnut ?paste/g, 'peanut butter'],
  [/groundnuts?/g, 'peanuts'],
  [/okro/g, 'okra'],
  [/kontomire|cocoyam leaves/g, 'taro leaves'],
  [/cocoyam/g, 'taro'],
  [/agushie|egusi|melon seeds?/g, 'watermelon seed'],
  [/titus/g, 'mackerel'],
  [/frytol|cooking oil/g, 'vegetable oil'],
  [/prawns?/g, 'shrimp'],
  [/mince(d)?( meat)?/g, 'ground'],
  [/courgettes?/g, 'zucchini'],
  [/spring onions?/g, 'scallions'],
  [/irish potato(es)?/g, 'potatoes'],
  [/perfumed rice|jasmine rice/g, 'rice white long-grain'],
  [/black[- ]?eyed (peas|beans)/g, 'cowpeas'],
]
const STOP = new Set(['and', 'or', 'the', 'of', 'with', 'fresh'])
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function tokens(q) {
  let s = q.toLowerCase().trim()
  for (const [re, rep] of PHRASES) s = s.replace(re, rep)
  return s.split(/[\s,()/]+/).filter(t => t.length > 1 && !STOP.has(t))
    // plural -> stem; we match word *prefixes*, so the stem finds both forms
    .map(t => (t.length > 3 ? t.replace(/ies$/, '').replace(/oes$/, 'o').replace(/(?<!s)s$/, '') : t))
}

export function searchFoods(list, q, limit = 8) {
  const toks = tokens(q)
  if (!toks.length || !list) return []
  const res = toks.map(t => new RegExp(`(^|[^a-z])${esc(t)}`))
  const whole = toks.map(t => new RegExp(`(^|[^a-z])${esc(t)}(e?s)?($|[^a-z-])`))
  const out = []
  for (const f of list) {
    if (!res.every(re => re.test(f.lc))) continue
    const parts = f.lc.split(',')
    // USDA prefixes like "Fish, salmon…" — the real food name is the second part
    const first = (/^(fish|crustaceans|mollusks|spices|beverages|cereals)$/.test(parts[0]) && parts[1] ? parts[1] : parts[0]).trim()
    let s = 0
    res.forEach(re => { if (re.test(first)) s += 10 })
    whole.forEach(re => { if (re.test(first)) s += 10 })
    if (first.startsWith(toks[0])) s += 5
    // KitchenMacro weighs RAW ingredients, so plain raw foods first
    if (/\braw\b/.test(f.lc)) s += 8
    if (/year round average|all commercial varieties|all varieties|mature seeds, raw/.test(f.lc)) s += 4
    if (/cooked|heated|fried|roasted|roll\b|sliced|breaded|nuggets|shakes|bar\b|snack|mix\b|prepared/.test(f.lc)) s -= 20
    if (/babyfood|fast food|restaurant|school lunch|^chicken, skin|separable fat/.test(f.lc)) s -= 10
    s -= first.split("(")[0].length / 8 + f.lc.length / 40 + f.lc.split(',').length * 0.3
    out.push([s, f])
  }
  return out.sort((a, b) => b[0] - a[0]).slice(0, limit).map(x => x[1])
}

// ---------- online (USDA FoodData Central API) ----------
const KEY_STORE = 'kitchenmacro:fdcKey'
export const getApiKey = () => { try { return localStorage.getItem(KEY_STORE) || '' } catch { return '' } }
export const setApiKey = k => { try { k ? localStorage.setItem(KEY_STORE, k.trim()) : localStorage.removeItem(KEY_STORE) } catch { /* ignore */ } }
export const API_SIGNUP = 'https://fdc.nal.usda.gov/api-key-signup'

const CAT_GROUP = [
  [/oil|fat|butter|nut|seed/i, 'Fat & Oil'],
  [/poultry|beef|pork|lamb|fish|shellfish|egg|sausage|meat|dairy|cheese|milk/i, 'Protein'],
  [/grain|pasta|cereal|legume|bread|baked|rice|flour/i, 'Starch'],
  [/vegetable|spice|herb/i, 'Vegetable'],
]
const catToGroup = c => (CAT_GROUP.find(([re]) => re.test(c || '')) || [null, 'Other'])[1]

export async function searchOnline(q) {
  const key = getApiKey() || 'DEMO_KEY'
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}&pageSize=15`
    + `&dataType=${encodeURIComponent('Foundation,SR Legacy,Branded')}&query=${encodeURIComponent(q)}`
  let r
  try { r = await fetch(url) } catch { throw new Error('No internet connection — the built-in list still works offline.') }
  if (r.status === 429) throw new Error(key === 'DEMO_KEY'
    ? 'The shared demo key is used up for this hour. Add your own free key below (takes 1 minute).'
    : 'Hourly search limit reached — try again later.')
  if (r.status === 403 || r.status === 401) throw new Error('That API key was rejected. Check it, or clear it to use the demo key.')
  if (!r.ok) throw new Error(`USDA search failed (HTTP ${r.status})`)
  const data = await r.json()
  return (data.foods || []).map(food => {
    const get = (...ids) => {
      for (const id of ids) {
        const n = food.foodNutrients?.find(x => x.nutrientId === id && (x.unitName || '').toUpperCase() !== 'KJ')
        if (n && n.value != null) return n.value
      }
      return null
    }
    const p = get(1003) ?? 0
    const c = get(1005) ?? 0
    const f = get(1004) ?? 0
    const kcal = get(1008, 2047, 2048) ?? p * 4 + c * 4 + f * 9
    const brand = [food.brandOwner, food.brandName].filter(Boolean)[0]
    const nice = food.dataType === 'Branded' ? titleCase(food.description) : food.description
    return {
      fdcId: food.fdcId, name: nice, brand, group: catToGroup(food.foodCategory),
      kcal: Math.round(kcal), p: round1(p), c: round1(c), f: round1(f),
      source: food.dataType === 'Branded' ? `USDA Branded${brand ? ` – ${brand}` : ''}` : `USDA ${food.dataType}`,
    }
  }).filter(x => x.kcal > 0 || x.p || x.c || x.f)
}
const round1 = n => Math.round((n || 0) * 10) / 10
const titleCase = s => (s || '').toLowerCase().replace(/\b[a-z]/g, m => m.toUpperCase())

export const isGroup = g => GROUPS.includes(g)
