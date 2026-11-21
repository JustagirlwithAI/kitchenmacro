import { DEFAULT_INGREDIENTS, DEFAULT_PORTIONS } from './data.js'

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

export const num = v => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// ---------- nutrition math ----------
export const ZERO = { kcal: 0, p: 0, c: 0, f: 0 }
export const rowNut = (ing, grams) => {
  const k = num(grams) / 100
  return { kcal: ing.kcal * k, p: ing.p * k, c: ing.c * k, f: ing.f * k }
}
export const addNut = (a, b) => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f })
export const sumNut = list => list.reduce(addNut, ZERO)
export const scaleNut = (n, k) => ({ kcal: n.kcal * k, p: n.p * k, c: n.c * k, f: n.f * k })

export function dishRaw(dish, ingMap) {
  let n = ZERO
  let weight = 0
  for (const it of dish.items) {
    weight += num(it.grams)
    const ing = ingMap[it.ingId]
    if (ing) n = addNut(n, rowNut(ing, it.grams))
  }
  return { n, weight }
}
export function dishPer100(dish, ingMap) {
  const cw = num(dish.cookedWeight)
  if (cw <= 0) return null
  return scaleNut(dishRaw(dish, ingMap).n, 100 / cw)
}
export const defaultPortion = (preset, category) =>
  (DEFAULT_PORTIONS[preset] || DEFAULT_PORTIONS.custom)[category] ?? 100

// ---------- formatting ----------
export const fk = n => Math.round(num(n)).toLocaleString('en-GB')
export const f1 = n => (Math.round(num(n) * 10) / 10).toLocaleString('en-GB', { maximumFractionDigits: 1 })
export const fg = g => (num(g) < 10 ? f1(g) : Math.round(num(g)).toLocaleString('en-GB'))
export const fkg = g => (num(g) >= 1000 ? `${(num(g) / 1000).toFixed(2)} kg` : '')

// ---------- default state ----------
export const newDraft = () => ({ id: null, name: '', category: 'Starch', items: [], cookedWeight: '' })

export const defaultTiers = () => [
  { id: uid(), name: 'Lean Plan', preset: 'lean', color: 'green', target: 450, portions: {} },
  { id: uid(), name: 'Balance Plan', preset: 'balance', color: 'yellow', target: 600, portions: {} },
  { id: uid(), name: 'Build Plan', preset: 'build', color: 'red', target: 800, portions: {} },
]

// New meals reuse the tier setup (names, colours, targets) from your most recent saved meal
export const newMealDraft = (prevTiers) => ({
  id: null,
  name: '',
  components: [
    { key: uid(), dishId: '', hint: 'Starch' },
    { key: uid(), dishId: '', hint: 'Protein' },
    { key: uid(), dishId: '', hint: 'Stew/Sauce' },
  ],
  tiers: prevTiers?.length ? prevTiers.map(t => ({ ...t, id: uid(), portions: {} })) : defaultTiers(),
})

export const initialDB = () => ({
  version: 1,
  ingredients: DEFAULT_INGREDIENTS.map(i => ({ ...i })),
  dishes: [],
  meals: [],
  draft: newDraft(),
  mealDraft: newMealDraft(),
  prep: { mealId: '', counts: {}, buffer: true, bufferPct: 5 },
})

const KEY = 'kitchenmacro:v1'

export function normalizeDB(data) {
  const base = initialDB()
  if (!data || typeof data !== 'object' || !Array.isArray(data.ingredients)) throw new Error('Not a KitchenMacro backup file')
  return {
    ...base,
    ...data,
    // One-time fix: early versions guessed unripe plantain at 130 kcal; USDA says 152
    ingredients: data.ingredients.map(i => (i.id === 'plantain-unripe' && i.builtin && i.kcal === 130 && i.c === 34
      ? { ...i, kcal: 152, p: 1.3, c: 36.7, f: 0.1 } : i)),
    dishes: Array.isArray(data.dishes) ? data.dishes : [],
    meals: Array.isArray(data.meals) ? data.meals : [],
    draft: data.draft?.items ? data.draft : base.draft,
    mealDraft: data.mealDraft?.components ? data.mealDraft : base.mealDraft,
    prep: { ...base.prep, ...(data.prep || {}) },
  }
}

export function loadDB() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalizeDB(JSON.parse(raw))
  } catch (e) {
    console.warn('Could not read saved data, starting fresh', e)
  }
  return initialDB()
}

export function saveDB(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
    return true
  } catch (e) {
    console.error('Save failed', e)
    return false
  }
}

// ---------- helpers ----------
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through */ }
  // Fallback for http:// over local Wi-Fi (clipboard API needs https)
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  ta.setSelectionRange(0, text.length)
  let ok = false
  try { ok = document.execCommand('copy') } catch { ok = false }
  document.body.removeChild(ta)
  return ok
}

export function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
