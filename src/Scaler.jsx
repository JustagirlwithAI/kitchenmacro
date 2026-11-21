import { useMemo } from 'react'
import { Info, Lightbulb, Plus, Printer, Scale, Trash2, Users, X } from 'lucide-react'
import { Btn, Card, Field, GramInput, NumInput, Select, StepTitle } from './ui.jsx'
import { CATEGORIES } from './data.js'
import { ZERO, dishPer100, f1, fg, fk, fkg, num, scaleNut, sumNut, uid } from './lib.js'

// ---------- shared scaling rules ----------
export const SEASON_FACTOR = 0.75
const SEASON_IDS = new Set(['scotch-bonnet', 'ginger', 'garlic'])
const SEASON_RE = /salt|chil+i|scotch|pepper|ginger|garlic|cube|maggi|knorr|seasoning|spice|curry|thyme|bay leaf|nutmeg|clove|anise|prekese|selim|hwentia|dawadawa|stock/i
export const isSeasoning = ing => !!ing && (SEASON_IDS.has(ing.id) || (SEASON_RE.test(ing.name) && !/sweet|bell|pepper(s)?, green, sweet/i.test(ing.name)))

export const DEFAULT_SCALE = { mode: 'people', fed: 4, portion: 250, target: 50, easySeason: true, potKg: '' }

// Big batches (more than 2× the recipe) need less chilli/salt/aromatics than a straight scale-up
export function scaleItems(items, ingMap, factor, easySeason) {
  return items.map(it => {
    const ing = ingMap[it.ingId]
    const season = !!easySeason && factor > 2 && isSeasoning(ing)
    return { ingId: it.ingId, ing, name: ing?.name ?? '(deleted ingredient)', grams: num(it.grams) * factor * (season ? SEASON_FACTOR : 1), season }
  })
}

// How the kitchen actually buys it
export function buyHint(ing, g) {
  if (!ing || g <= 0) return ''
  if (ing.id === 'tomato-paste' || /tomato paste/i.test(ing.name)) {
    if (g < 300) { const n = Math.ceil(g / 70); return `≈ ${n} × 70 g sachet${n > 1 ? 's' : ''}` }
    const n = Math.ceil(g / 400); return `≈ ${n} × 400 g tin${n > 1 ? 's' : ''}`
  }
  if (ing.group === 'Fat & Oil' && /\boil\b/i.test(ing.name)) return `≈ ${(g / 920).toFixed(g < 920 ? 2 : 1)} litres`
  if (ing.id === 'egg-whole' || /^whole egg/i.test(ing.name)) { const n = Math.ceil(g / 50); return `≈ ${n} eggs` }
  return ''
}

export const batchCount = (cookedG, potKg) => (num(potKg) > 0 && cookedG > 0 ? Math.max(1, Math.ceil(cookedG / (num(potKg) * 1000))) : 1)

export function combineRows(rows) {
  return Object.values(rows.reduce((acc, r) => {
    const k = r.ingId
    acc[k] = acc[k] ? { ...acc[k], grams: acc[k].grams + r.grams, season: acc[k].season || r.season } : { ...r }
    return acc
  }, {})).sort((a, b) => b.grams - a.grams)
}

// ---------- shared UI ----------
export function ScaledList({ rows, batches = 1 }) {
  return (
    <ul className="divide-y divide-ink/10">
      {rows.map(r => {
        const hint = buyHint(r.ing, r.grams)
        return (
          <li key={r.ingId} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="text-lg font-medium leading-tight">{r.name}</div>
              <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs">
                {r.season && <span className="rounded bg-cherry/10 px-1.5 py-0.5 font-bold text-cherry">seasoning −25% · taste &amp; add</span>}
                {hint && <span className="rounded bg-gold/25 px-1.5 py-0.5 font-semibold">{hint}</span>}
              </div>
            </div>
            <div className="tabular shrink-0 text-right">
              <b className="text-lg">{fg(r.grams)} g</b>
              {fkg(r.grams) && <span className="block text-xs text-ink/50">{fkg(r.grams)}</span>}
              {batches > 1 && <span className="block text-xs font-semibold text-ink/60">{fg(r.grams / batches)} g per batch</span>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function ScaleOptions({ prefs, setPrefs }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-ink/10">
        <input type="checkbox" className="h-6 w-6 accent-[#C8102E]" checked={!!prefs.easySeason} onChange={e => setPrefs({ easySeason: e.target.checked })} />
        <span className="font-semibold">Easy on seasoning <span className="font-normal text-ink/55">(chilli, salt, ginger, garlic at 75%)</span></span>
      </label>
      <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-ink/10">
        <span className="font-semibold">Biggest pot holds</span>
        <NumInput value={prefs.potKg} onChange={v => setPrefs({ potKg: v })} placeholder="—" className="h-10 w-20 text-center" aria-label="Biggest pot capacity in kg cooked" />
        <span className="text-ink/60">kg cooked</span>
      </label>
    </div>
  )
}

export function BigBatchTips() {
  return (
    <details className="rounded-xl bg-pale p-3 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Lightbulb size={18} className="text-gold" /> Big-batch cooking tips</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/75">
        <li><b>Oil:</b> big pots often need a little less than the straight scale-up. Start with ~85% and add if needed.</li>
        <li><b>Water / stock:</b> big pots lose less to steam. Add liquid gradually, don't pour it all in at once.</li>
        <li><b>Seasoning:</b> taste before adding the last of the chilli, salt and stock cubes.</li>
        <li><b>Keep labels accurate:</b> weigh the first big batch when it's cooked and save it as its own dish in Tab 1. Big pots can come out wetter, which changes the calories per 100 g.</li>
      </ul>
    </details>
  )
}

const Seg = ({ value, options, onChange }) => (
  <div className={`grid gap-1 rounded-xl bg-ink/5 p-1`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
    {options.map(([k, l]) => (
      <button key={k} type="button" onClick={() => onChange(k)}
        className={`min-h-11 rounded-lg px-3 py-1 text-sm font-bold leading-tight transition ${value === k ? 'bg-ink text-gold shadow' : 'text-ink/60 hover:text-ink'}`}>{l}</button>
    ))}
  </div>
)

// ---------- 1. Scale one dish ----------
export function ScaleCard({ dish, ingMap, prefs, setPrefs, onPrint }) {
  const cooked = num(dish.cookedWeight)
  const hasItems = dish.items.some(i => num(i.grams) > 0)
  const mode = prefs.mode === 'portion' ? 'portion' : 'people'
  const target = num(prefs.target)
  let factor = 0
  if (mode === 'people' && num(prefs.fed) > 0) factor = target / num(prefs.fed)
  if (mode === 'portion' && cooked > 0) factor = (target * num(prefs.portion)) / cooked
  const totalCooked = cooked > 0 ? cooked * factor : 0
  const batches = batchCount(totalCooked, prefs.potKg)
  const rows = useMemo(() => scaleItems(dish.items, ingMap, factor, prefs.easySeason), [dish.items, ingMap, factor, prefs.easySeason])
  const rawTotal = rows.reduce((s, r) => s + r.grams, 0)
  const per100 = cooked > 0 ? dishPer100(dish, ingMap) : null
  const perPerson = mode === 'portion' ? num(prefs.portion) : num(prefs.fed) > 0 && cooked > 0 ? cooked / num(prefs.fed) : 0

  const summary = (
    <>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-display text-3xl font-extrabold">×{f1(factor)}</span>
        <span className="text-white/80">your recipe for <b className="text-white">{fk(target)} people</b></span>
      </div>
      <div className="tabular mt-2 grid gap-1 text-sm text-white/80 sm:grid-cols-2">
        <span>Raw ingredients: <b className="text-white">{fkg(rawTotal) || `${fg(rawTotal)} g`}</b></span>
        {totalCooked > 0 && <span>Makes ≈ <b className="text-white">{fkg(totalCooked) || `${fg(totalCooked)} g`}</b> cooked</span>}
        {perPerson > 0 && <span>≈ <b className="text-white">{fg(perPerson)} g</b> per person{per100 ? ` · ${fk(per100.kcal * perPerson / 100)} kcal` : ''}</span>}
        {batches > 1 && <span className="font-bold text-gold">Cook {batches} batches of ≈ {fkg(totalCooked / batches) || `${fg(totalCooked / batches)} g`}</span>}
      </div>
    </>
  )

  return (
    <div className="space-y-4">
      <Seg value={mode} onChange={m => setPrefs({ mode: m })}
        options={[['people', 'This pot fed… people'], ['portion', 'Grams per person']]} />
      {mode === 'people' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="This pot fed"><div className="relative"><NumInput value={prefs.fed} onChange={v => setPrefs({ fed: v })} className="pr-16 text-xl font-semibold" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/45">people</span></div></Field>
          <Field label="I need to feed"><div className="relative"><NumInput value={prefs.target} onChange={v => setPrefs({ target: v })} className="pr-16 text-xl font-semibold" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/45">people</span></div></Field>
        </div>
      ) : cooked > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Each person gets (cooked)"><GramInput value={prefs.portion} onChange={v => setPrefs({ portion: v })} className="text-xl" /></Field>
          <Field label="Number of people"><div className="relative"><NumInput value={prefs.target} onChange={v => setPrefs({ target: v })} className="pr-16 text-xl font-semibold" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/45">people</span></div></Field>
        </div>
      ) : (
        <p className="flex gap-2 rounded-xl bg-pale p-3 text-sm"><Info size={18} className="shrink-0 text-gold" /> Enter the cooked weight (Step B) to scale by grams per person.</p>
      )}
      <ScaleOptions prefs={prefs} setPrefs={setPrefs} />

      {!hasItems ? (
        <p className="text-ink/55">Add raw ingredients with weights first.</p>
      ) : factor > 0 ? (
        <>
          <div className="rounded-2xl bg-ink p-4 text-white">{summary}</div>
          <ScaledList rows={rows} batches={batches} />
          <div className="flex flex-wrap gap-2">
            {onPrint && <Btn variant="ghost" onClick={() => onPrint(
              <div className="text-ink">
                <h1 className="font-display text-2xl font-extrabold">{dish.name || 'Dish'} — for {fk(target)} people</h1>
                <div className="my-2 rounded-xl bg-ink p-3 text-white">{summary}</div>
                <ScaledList rows={rows} batches={batches} />
              </div>,
            )}><Printer size={18} /> Print this list</Btn>}
          </div>
          <BigBatchTips />
        </>
      ) : (
        <p className="text-ink/55">Fill in the numbers above to see the scaled ingredients.</p>
      )}
    </div>
  )
}

// ---------- 2. Catering / event planner (several dishes, one guest count) ----------
const EVENT_PORTION = { Starch: 250, Protein: 150, 'Stew/Sauce': 80 }
export const DEFAULT_EVENT = { name: '', guests: 50, rows: [] }

export function EventPlanner({ db, update, ingMap, onPrintPage }) {
  const prep = db.prep
  const ev = { ...DEFAULT_EVENT, ...(prep.event || {}) }
  const prefs = { ...DEFAULT_SCALE, ...(prep.scale || {}) }
  const setEv = patch => update(d => ({ ...d, prep: { ...d.prep, event: { ...DEFAULT_EVENT, ...(d.prep.event || {}), ...(typeof patch === 'function' ? patch({ ...DEFAULT_EVENT, ...(d.prep.event || {}) }) : patch) } } }))
  const setPrefs = patch => update(d => ({ ...d, prep: { ...d.prep, scale: { ...DEFAULT_SCALE, ...(d.prep.scale || {}), ...patch } } }))
  const setPrep = patch => update(d => ({ ...d, prep: { ...d.prep, ...patch } }))
  const dishMap = useMemo(() => Object.fromEntries(db.dishes.map(d => [d.id, d])), [db.dishes])
  const guests = num(ev.guests)
  const mult = prep.buffer ? 1 + num(prep.bufferPct) / 100 : 1

  const addRow = () => setEv(e => ({ rows: [...e.rows, { key: uid(), dishId: '', grams: '' }] }))
  const setRow = (key, patch) => setEv(e => ({ rows: e.rows.map(r => (r.key === key ? { ...r, ...patch } : r)) }))
  const removeRow = key => setEv(e => ({ rows: e.rows.filter(r => r.key !== key) }))
  const pickDish = (key, dishId) => {
    const dish = dishMap[dishId]
    setEv(e => ({ rows: e.rows.map(r => (r.key === key ? { ...r, dishId, grams: r.grams === '' || r.grams == null ? (EVENT_PORTION[dish?.category] ?? 150) : r.grams } : r)) }))
  }

  const plans = ev.rows.filter(r => dishMap[r.dishId] && num(r.grams) > 0).map(r => {
    const dish = dishMap[r.dishId]
    const need = guests * num(r.grams) * mult
    const factor = num(dish.cookedWeight) > 0 ? need / num(dish.cookedWeight) : 0
    return { key: r.key, dish, need, factor, batches: batchCount(need, prefs.potKg), rows: scaleItems(dish.items, ingMap, factor, prefs.easySeason) }
  })
  const shopping = combineRows(plans.flatMap(p => p.rows))
  const plate = sumNut(ev.rows.filter(r => dishMap[r.dishId]).map(r => scaleNut(dishPer100(dishMap[r.dishId], ingMap) || ZERO, num(r.grams) / 100)))
  const plateG = ev.rows.filter(r => dishMap[r.dishId]).reduce((s, r) => s + num(r.grams), 0)
  const totalCooked = plans.reduce((s, p) => s + p.need, 0)
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (!db.dishes.length) {
    return <Card className="py-10 text-center"><Users className="mx-auto mb-2 text-gold" size={40} /><h2 className="font-display text-2xl font-extrabold">Save a dish first</h2><p className="mt-2 text-ink/60">The event planner uses dishes saved in Tab 1.</p></Card>
  }

  return (
    <div className="space-y-4">
      <div className="hidden print:block">
        <h1 className="font-display text-2xl font-extrabold">Event Prep Sheet{ev.name ? ` — ${ev.name}` : ''}</h1>
        <p>{today} · {fk(guests)} guests{prep.buffer ? ` · +${num(prep.bufferPct)}% buffer included` : ''}</p>
      </div>

      <Card className="no-print border-gold/50 bg-pale">
        <StepTitle title="Catering / Event" sub="Pick the dishes, how much each guest gets, and how many guests." />
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Event name (optional)">
            <input className="h-12 w-full rounded-xl border-2 border-ink/15 bg-white px-3 text-lg focus:border-gold focus:outline-none" value={ev.name} placeholder="e.g. Church harvest, Office lunch" onChange={e => setEv({ name: e.target.value })} />
          </Field>
          <Field label="Number of guests">
            <div className="flex items-center gap-1.5">
              <button type="button" aria-label="Ten fewer guests" onClick={() => setEv({ guests: Math.max(0, guests - 10) })} className="h-12 rounded-xl bg-ink/5 px-3 font-bold hover:bg-ink/10">−10</button>
              <NumInput value={ev.guests} onChange={v => setEv({ guests: v === '' ? '' : Math.round(v) })} className="w-24 text-center font-display text-2xl font-extrabold" aria-label="Guests" />
              <button type="button" aria-label="Ten more guests" onClick={() => setEv({ guests: guests + 10 })} className="h-12 rounded-xl bg-ink px-3 font-bold text-gold hover:bg-ink/90">+10</button>
            </div>
          </Field>
        </div>

        <div className="mb-1 text-sm font-bold uppercase tracking-wide text-ink/60">On each plate (cooked grams per guest)</div>
        <ul className="space-y-2">
          {ev.rows.map(r => (
            <li key={r.key} className="flex items-center gap-2">
              <Select className="flex-1" value={r.dishId} onChange={e => pickDish(r.key, e.target.value)}>
                <option value="">Choose a dish…</option>
                {CATEGORIES.map(cat => {
                  const list = db.dishes.filter(d => d.category === cat)
                  return list.length ? <optgroup key={cat} label={cat}>{list.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup> : null
                })}
              </Select>
              <GramInput wrapClass="w-[5.5rem] shrink-0 sm:w-28" className="px-2 pr-7" value={r.grams} onChange={v => setRow(r.key, { grams: v })} aria-label="Grams per guest" />
              <button type="button" onClick={() => removeRow(r.key)} aria-label="Remove dish" className="grid h-12 w-11 shrink-0 place-items-center rounded-xl text-cherry hover:bg-cherry/10"><X size={22} /></button>
            </li>
          ))}
        </ul>
        <Btn variant="soft" className="mt-3" onClick={addRow}><Plus size={20} /> Add Dish</Btn>
        {plateG > 0 && (
          <p className="tabular mt-3 text-sm text-ink/70">Each plate: <b>{fg(plateG)} g</b> · {fk(plate.kcal)} kcal · P {f1(plate.p)}g · C {f1(plate.c)}g · F {f1(plate.f)}g</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ScaleOptions prefs={prefs} setPrefs={setPrefs} />
          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-ink/10">
            <input type="checkbox" className="h-6 w-6 accent-[#C8102E]" checked={!!prep.buffer} onChange={e => setPrep({ buffer: e.target.checked })} />
            <span className="font-semibold">+{num(prep.bufferPct)}% buffer</span>
          </label>
          <div className="ml-auto flex gap-2">
            <Btn variant="ghost" onClick={() => { if (window.confirm('Clear this event?')) setEv({ ...DEFAULT_EVENT }) }}><Trash2 size={18} /> Clear</Btn>
            <Btn onClick={onPrintPage} disabled={!plans.length}><Printer size={18} /> Print Sheet</Btn>
          </div>
        </div>
      </Card>

      {plans.length === 0 ? (
        <p className="no-print rounded-xl bg-white p-6 text-center text-lg text-ink/60 ring-1 ring-ink/10">Add a dish and grams per guest to see what to cook and buy.</p>
      ) : (
        <>
          <Card className="print-break-avoid">
            <StepTitle step="1" title="Cooked Food Needed" sub={`${fk(guests)} guests · ${fkg(totalCooked) || `${fg(totalCooked)} g`} in total${prep.buffer ? ` · includes +${num(prep.bufferPct)}% buffer` : ''}`} />
            <ul className="divide-y divide-ink/10">
              {plans.map(p => (
                <li key={p.key} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="text-lg font-semibold leading-tight">{p.dish.name}</div>
                    <div className="text-sm text-ink/55">×{f1(p.factor)} your recipe{p.batches > 1 ? ` · ${p.batches} batches of ≈ ${fkg(p.need / p.batches) || `${fg(p.need / p.batches)} g`}` : ''}</div>
                  </div>
                  <span className="tabular text-right"><b className="font-display text-2xl font-extrabold">{fkg(p.need) || `${fg(p.need)} g`}</b></span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <StepTitle step="2" title="Raw Ingredients per Dish" sub="Weigh these out before cooking." />
            <div className="grid gap-4 md:grid-cols-2">
              {plans.map(p => (
                <div key={p.key} className="print-break-avoid rounded-xl border border-ink/10 p-3">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-lg font-extrabold">{p.dish.name}</h3>
                    <span className="shrink-0 rounded-full bg-gold/30 px-2 py-0.5 text-sm font-bold">×{f1(p.factor)}</span>
                  </div>
                  <ScaledList rows={p.rows} batches={p.batches} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="print-break-avoid">
            <StepTitle step="3" title="Shopping List (all dishes combined)" right={<Scale className="text-gold" />} />
            <ScaledList rows={shopping} />
          </Card>
          <div className="no-print"><BigBatchTips /></div>
        </>
      )}
    </div>
  )
}
