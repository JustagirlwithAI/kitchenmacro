import { useMemo, useState } from 'react'
import { Check, ClipboardList, Minus, Package, Plus, Printer, RotateCcw, Users } from 'lucide-react'
import { EventPlanner } from './Scaler.jsx'
import { Btn, Card, EmptyState, Field, NumInput, Select, StepTitle } from './ui.jsx'
import { boxColor } from './data.js'
import { ZERO, dishPer100, f1, fg, fk, fkg, num } from './lib.js'
import { tierLines } from './MealTab.jsx'

function Counter({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={`One less ${label}`} onClick={() => onChange(Math.max(0, num(value) - 1))}
        className="grid h-14 w-14 place-items-center rounded-xl bg-ink/5 hover:bg-ink/10 active:scale-95"><Minus size={24} /></button>
      <NumInput value={value} onChange={v => onChange(v === '' ? '' : Math.round(v))} className="h-14 w-20 text-center font-display text-2xl font-extrabold" aria-label={`${label} boxes`} />
      <button type="button" aria-label={`One more ${label}`} onClick={() => onChange(num(value) + 1)}
        className="grid h-14 w-14 place-items-center rounded-xl bg-ink text-gold hover:bg-ink/90 active:scale-95"><Plus size={24} /></button>
    </div>
  )
}

const Grams = ({ g, big = false }) => (
  <span className="tabular text-right">
    <b className={big ? 'font-display text-2xl font-extrabold' : 'text-lg'}>{fg(g)} g</b>
    {fkg(g) && <span className="block text-xs text-ink/50">{fkg(g)}</span>}
  </span>
)

function BoxedPrep({ db, update, ingMap, goTab, onPrintPage }) {
  const prep = db.prep
  const setPrep = patch => update(d => ({ ...d, prep: { ...d.prep, ...patch } }))
  const dishMap = useMemo(() => Object.fromEntries(db.dishes.map(d => [d.id, d])), [db.dishes])
  const per100 = useMemo(() => Object.fromEntries(db.dishes.map(d => [d.id, dishPer100(d, ingMap) || ZERO])), [db.dishes, ingMap])
  const [checked, setChecked] = useState({})
  const [rawView, setRawView] = useState('dish')

  const meal = db.meals.find(m => m.id === prep.mealId) || null
  const comps = meal ? meal.components.filter(c => dishMap[c.dishId]) : []
  const mult = prep.buffer ? 1 + num(prep.bufferPct) / 100 : 1
  const count = t => num(prep.counts?.[t.id])
  const setCount = (t, v) => setPrep({ counts: { ...prep.counts, [t.id]: v } })
  const totalBoxes = meal ? meal.tiers.reduce((s, t) => s + count(t), 0) : 0

  const compTotals = comps.map(c => {
    const base = meal.tiers.reduce((s, t) => s + count(t) * num(t.portions?.[c.key]), 0)
    return { ...c, dish: dishMap[c.dishId], base, need: base * mult }
  })
  const byDish = {}
  for (const ct of compTotals) byDish[ct.dishId] = (byDish[ct.dishId] || 0) + ct.need
  const dishPlans = Object.entries(byDish).filter(([, need]) => need > 0).map(([id, need]) => {
    const dish = dishMap[id]
    const factor = num(dish.cookedWeight) > 0 ? need / num(dish.cookedWeight) : 0
    return {
      dish, need, factor,
      items: dish.items.map(it => ({ ingId: it.ingId, name: ingMap[it.ingId]?.name ?? '(deleted ingredient)', grams: num(it.grams) * factor })),
    }
  })
  const combined = Object.values(dishPlans.flatMap(p => p.items).reduce((acc, it) => {
    acc[it.ingId] = acc[it.ingId] ? { ...acc[it.ingId], grams: acc[it.ingId].grams + it.grams } : { ...it }
    return acc
  }, {})).sort((a, b) => b.grams - a.grams)
  const toggle = k => setChecked(s => ({ ...s, [k]: !s[k] }))

  if (!db.meals.length) {
    return (
      <EmptyState icon={ClipboardList} title="Save a meal first"
        text="The prep sheet works from a Saved Meal (dishes + portions per plan). Build one in Tab 2."
        action={<Btn variant="gold" size="lg" onClick={() => goTab(2)}>Go to Meal Builder</Btn>} />
    )
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="hidden print:block">
        <h1 className="font-display text-2xl font-extrabold">Kitchen Prep Sheet — {meal?.name}</h1>
        <p>{today} · {totalBoxes} boxes{prep.buffer ? ` · +${num(prep.bufferPct)}% buffer included` : ''}</p>
      </div>

      {/* Orders */}
      <Card className="no-print border-gold/50 bg-pale">
        <StepTitle title="Today's Orders" sub={today} />
        <Field label="Which meal are you cooking?" className="mb-4">
          <Select value={prep.mealId} onChange={e => { setPrep({ mealId: e.target.value }); setChecked({}) }}>
            <option value="">Choose a saved meal…</option>
            {db.meals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
        {meal && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {meal.tiers.map(t => {
                const col = boxColor(t.color)
                return (
                  <div key={t.id} className="rounded-xl bg-white p-3 ring-1 ring-ink/10">
                    <div className="mb-2 flex items-center gap-2 font-bold">
                      <span className="h-5 w-5 rounded-full ring-1 ring-ink/20" style={{ background: col.bg }} />{t.name}
                    </div>
                    <Counter value={prep.counts?.[t.id] ?? ''} onChange={v => setCount(t, v)} label={t.name} />
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-ink/10">
                <input type="checkbox" className="h-6 w-6 accent-[#C8102E]" checked={!!prep.buffer} onChange={e => setPrep({ buffer: e.target.checked })} />
                <span className="font-semibold">Add buffer for pot scraping / spills</span>
                <span className="flex items-center gap-1">
                  +<NumInput value={prep.bufferPct} onChange={v => setPrep({ bufferPct: v })} className="h-10 w-16 text-center" disabled={!prep.buffer} aria-label="Buffer percent" />%
                </span>
              </label>
              <span className="text-lg"><b className="font-display text-2xl font-extrabold">{totalBoxes}</b> boxes total</span>
              <div className="ml-auto flex gap-2">
                <Btn variant="ghost" onClick={() => { setPrep({ counts: {} }); setChecked({}) }}><RotateCcw size={18} /> Reset</Btn>
                <Btn onClick={onPrintPage} disabled={!totalBoxes}><Printer size={18} /> Print Sheet</Btn>
              </div>
            </div>
          </>
        )}
      </Card>

      {meal && totalBoxes === 0 && (
        <p className="no-print rounded-xl bg-white p-6 text-center text-lg text-ink/60 ring-1 ring-ink/10">Enter today's box counts above to build the checklist.</p>
      )}

      {meal && totalBoxes > 0 && (
        <>
          {/* 1. Cooked totals */}
          <Card className="print-break-avoid">
            <StepTitle step="1" title="Total Cooked Food Needed" sub={prep.buffer ? `Includes +${num(prep.bufferPct)}% buffer` : 'No buffer added'} />
            <ul className="divide-y divide-ink/10">
              {compTotals.map(ct => (
                <li key={ct.key} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="text-lg font-semibold leading-tight">{ct.dish.name}</div>
                    <div className="text-sm text-ink/50">{ct.dish.category}{prep.buffer && ` · ${fg(ct.base)} g + buffer`}</div>
                  </div>
                  <Grams g={ct.need} big />
                </li>
              ))}
            </ul>
          </Card>

          {/* 2. Raw ingredients */}
          <Card>
            <StepTitle step="2" title="Total Raw Ingredients to Prep" sub="Weigh these out BEFORE cooking. Tick each one as you go."
              right={
                <div className="no-print grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-ink/5 p-1">
                  {[['dish', 'By dish'], ['all', 'Combined']].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setRawView(k)}
                      className={`h-9 rounded-lg px-3 text-sm font-bold ${rawView === k ? 'bg-ink text-gold' : 'text-ink/60'}`}>{l}</button>
                  ))}
                </div>
              } />
            {rawView === 'dish' ? (
              <div className="grid gap-4 md:grid-cols-2">
                {dishPlans.map(p => (
                  <div key={p.dish.id} className="print-break-avoid rounded-xl border border-ink/10 p-3">
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <h3 className="font-display text-lg font-extrabold">{p.dish.name}</h3>
                      <span className="shrink-0 rounded-full bg-gold/30 px-2 py-0.5 text-sm font-bold">{f1(p.factor)}× recipe</span>
                    </div>
                    <p className="mb-2 text-sm text-ink/55">Makes ≈ {fg(p.need)} g cooked</p>
                    <ChecklistRows items={p.items} prefix={p.dish.id} checked={checked} toggle={toggle} />
                  </div>
                ))}
              </div>
            ) : (
              <ChecklistRows items={combined} prefix="all" checked={checked} toggle={toggle} />
            )}
          </Card>

          {/* 3. Packing cheat sheet */}
          <Card className="print-break-avoid">
            <StepTitle step="3" title="Packing Cheat Sheet" sub="What goes into each box." />
            <div className="grid gap-3 lg:grid-cols-2">
              {meal.tiers.filter(t => count(t) > 0).map(t => {
                const col = boxColor(t.color)
                const calc = tierLines(t, comps, dishMap, per100)
                return (
                  <div key={t.id} className="print-break-avoid overflow-hidden rounded-2xl ring-2" style={{ '--tw-ring-color': col.id === 'white' ? '#1B1716' : col.bg }}>
                    <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ background: col.bg, color: col.fg }}>
                      <span className="font-display text-xl font-extrabold uppercase tracking-tight">{col.label} Box · {t.name}</span>
                      <span className="font-display text-2xl font-extrabold">× {count(t)}</span>
                    </div>
                    <ul className="divide-y divide-ink/10 bg-white px-4">
                      {calc.lines.map(l => (
                        <li key={l.key} className="flex items-baseline justify-between gap-3 py-2.5">
                          <span className="text-xl font-semibold">{l.name}</span>
                          <span className="tabular font-display text-3xl font-extrabold">{fk(l.g)}<span className="text-lg"> g</span></span>
                        </li>
                      ))}
                    </ul>
                    <div className="tabular bg-pale px-4 py-2 text-sm text-ink/70">
                      {fk(calc.total.kcal)} kcal · P {f1(calc.total.p)}g · C {f1(calc.total.c)}g · F {f1(calc.total.f)}g · {fk(calc.grams)} g per box
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function ChecklistRows({ items, prefix, checked, toggle }) {
  return (
    <ul className="divide-y divide-ink/10">
      {items.map(it => {
        const k = `${prefix}:${it.ingId}`
        const on = !!checked[k]
        return (
          <li key={k}>
            <button type="button" onClick={() => toggle(k)} className="flex w-full items-center gap-3 py-2.5 text-left">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 ${on ? 'border-leaf bg-leaf text-white' : 'border-ink/25'}`}>
                {on && <Check size={20} strokeWidth={3} />}
              </span>
              <span className={`flex-1 text-lg ${on ? 'text-ink/40 line-through' : 'font-medium'}`}>{it.name}</span>
              <Grams g={it.grams} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// Tab 3 has two modes: boxed customer orders (from a Saved Meal) or a catering event (any dishes × guests)
export default function PrepTab(props) {
  const { db, update } = props
  const mode = db.prep.mode === 'event' ? 'event' : 'boxes'
  const setMode = m => update(d => ({ ...d, prep: { ...d.prep, mode: m } }))
  return (
    <div className="space-y-4">
      <div className="no-print grid grid-cols-2 gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-ink/10">
        {[['boxes', 'Boxed Orders', Package], ['event', 'Catering / Event', Users]].map(([k, l, Icon]) => (
          <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k}
            className={`flex h-12 items-center justify-center gap-2 rounded-xl font-bold transition ${mode === k ? 'bg-ink text-gold shadow' : 'text-ink/60 hover:text-ink'}`}>
            <Icon size={20} /> {l}
          </button>
        ))}
      </div>
      {mode === 'event' ? <EventPlanner {...props} /> : <BoxedPrep {...props} />}
    </div>
  )
}
