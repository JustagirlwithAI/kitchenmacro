import { useMemo, useState } from 'react'
import { ClipboardList, Copy, CookingPot, FilePlus, Pencil, Plus, Printer, Save, Sparkles, Trash2, X } from 'lucide-react'
import { Btn, Card, EmptyState, Field, GramInput, NumInput, Select, StepTitle, inputCls } from './ui.jsx'
import { BOX_COLORS, CATEGORIES, boxColor } from './data.js'
import { ZERO, copyText, defaultPortion, dishPer100, f1, fk, newMealDraft, num, scaleNut, sumNut, uid } from './lib.js'

// Shared by Tab 2 (label preview) and Tab 3 (packing sheet)
export function tierLines(tier, components, dishMap, per100) {
  const lines = components
    .filter(c => dishMap[c.dishId])
    .map(c => {
      const dish = dishMap[c.dishId]
      const g = num(tier.portions?.[c.key])
      return { key: c.key, name: dish.name, category: dish.category, g, n: scaleNut(per100[dish.id] || ZERO, g / 100) }
    })
  return { lines, total: sumNut(lines.map(l => l.n)), grams: lines.reduce((s, l) => s + l.g, 0) }
}

export function labelText(mealName, tier, { lines, total, grams }) {
  return [
    `${mealName.toUpperCase()} — ${tier.name.toUpperCase()}`,
    `Calories: ${fk(total.kcal)} kcal`,
    `Protein: ${f1(total.p)} g | Carbs: ${f1(total.c)} g | Fat: ${f1(total.f)} g`,
    '—',
    ...lines.filter(l => l.g > 0).map(l => `${fk(l.g)} g ${l.name}`),
    `Total box weight: ${fk(grams)} g`,
  ].join('\n')
}

export function NutritionLabel({ mealName, tier, calc, printMode = false }) {
  const c = boxColor(tier.color)
  return (
    <div className={`print-break-avoid rounded-xl border-[3px] border-ink bg-white p-3 text-ink ${printMode ? 'mb-4 w-[80mm]' : ''}`}>
      <div className="flex items-center justify-between gap-2 border-b-[6px] border-ink pb-1">
        <div className="font-display text-xl font-extrabold leading-none tracking-tight">Nutrition Facts</div>
        <span className="rounded px-2 py-0.5 text-xs font-bold" style={{ background: c.bg, color: c.fg, border: c.id === 'white' ? '1px solid #1B1716' : 'none' }}>{tier.name}</span>
      </div>
      <div className="mt-1 text-sm font-semibold leading-tight">{mealName || 'Untitled meal'}</div>
      <div className="tabular flex items-end justify-between border-b-4 border-ink py-1">
        <span className="font-display text-lg font-extrabold">Calories</span>
        <span className="font-display text-3xl font-extrabold leading-none">{fk(calc.total.kcal)}</span>
      </div>
      {[['Protein', calc.total.p], ['Carbohydrates', calc.total.c], ['Fat', calc.total.f]].map(([k, v]) => (
        <div key={k} className="tabular flex justify-between border-b border-ink/30 py-0.5 text-sm">
          <b>{k}</b><span className="font-semibold">{f1(v)} g</span>
        </div>
      ))}
      <div className="mt-1.5 text-xs font-bold uppercase tracking-wide text-ink/60">In this box</div>
      {calc.lines.filter(l => l.g > 0).map(l => (
        <div key={l.key} className="tabular flex justify-between gap-2 text-sm">
          <span>{l.name}</span><span className="font-semibold">{fk(l.g)} g</span>
        </div>
      ))}
      <div className="tabular mt-1 flex justify-between border-t border-ink pt-1 text-sm font-bold">
        <span>Total weight</span><span>{fk(calc.grams)} g</span>
      </div>
    </div>
  )
}

export default function MealTab({ db, update, ingMap, notify, onPrint, goTab }) {
  const md = db.mealDraft
  const setMd = fn => update(d => ({ ...d, mealDraft: { ...d.mealDraft, ...(typeof fn === 'function' ? fn(d.mealDraft) : fn) } }))
  const dishMap = useMemo(() => Object.fromEntries(db.dishes.map(d => [d.id, d])), [db.dishes])
  const per100 = useMemo(() => Object.fromEntries(db.dishes.map(d => [d.id, dishPer100(d, ingMap) || ZERO])), [db.dishes, ingMap])
  const [copied, setCopied] = useState(null)

  if (!db.dishes.length) {
    return (
      <EmptyState icon={CookingPot} title="Save a dish first"
        text="Meals are built from dishes you've saved in Tab 1 (e.g. Jollof Rice + Grilled Chicken + Shito). Lock in at least one dish to start."
        action={<Btn variant="gold" size="lg" onClick={() => goTab(1)}>Go to Recipe & Yield Calculator</Btn>} />
    )
  }

  const active = md.components.filter(c => dishMap[c.dishId])
  const suggested = active.map(c => dishMap[c.dishId].name).join(' + ')
  const mealName = md.name.trim() || suggested
  const saved = md.id ? db.meals.find(m => m.id === md.id) : null
  const hasWork = active.length > 0

  const setComponentDish = (key, dishId) => setMd(m => {
    const dish = dishMap[dishId]
    return {
      components: m.components.map(c => (c.key === key ? { ...c, dishId } : c)),
      tiers: m.tiers.map(t => {
        const cur = t.portions?.[key]
        if (dish && (cur === '' || cur == null || cur === 0)) return { ...t, portions: { ...t.portions, [key]: defaultPortion(t.preset, dish.category) } }
        return t
      }),
    }
  })
  const addComponent = () => setMd(m => ({ components: [...m.components, { key: uid(), dishId: '', hint: '' }] }))
  const removeComponent = key => setMd(m => ({
    components: m.components.filter(c => c.key !== key),
    tiers: m.tiers.map(t => { const p = { ...t.portions }; delete p[key]; return { ...t, portions: p } }),
  }))
  const setTier = (id, patch) => setMd(m => ({ tiers: m.tiers.map(t => (t.id === id ? { ...t, ...patch } : t)) }))
  const setPortion = (id, key, g) => setMd(m => ({ tiers: m.tiers.map(t => (t.id === id ? { ...t, portions: { ...t.portions, [key]: g } } : t)) }))
  const addTier = () => setMd(m => {
    const used = m.tiers.map(t => t.color)
    const color = (BOX_COLORS.find(c => !used.includes(c.id)) || BOX_COLORS[3]).id
    const portions = Object.fromEntries(m.components.filter(c => dishMap[c.dishId]).map(c => [c.key, defaultPortion('custom', dishMap[c.dishId].category)]))
    return { tiers: [...m.tiers, { id: uid(), name: 'Custom Plan', preset: 'custom', color, target: '', portions }] }
  })
  const removeTier = t => {
    if (md.tiers.length <= 1) return
    if (window.confirm(`Remove “${t.name}” from this meal?`)) setMd(m => ({ tiers: m.tiers.filter(x => x.id !== t.id) }))
  }
  // Scale every portion evenly so the box hits the calorie target, rounded to 5 g for easy scooping
  const autoFit = t => {
    const target = num(t.target)
    if (target <= 0) return notify('Type a calorie target for this plan first', 'error')
    if (!active.length) return notify('Pick the dishes in this meal first', 'error')
    const base = active.map(c => ({ key: c.key, id: c.dishId, g: num(t.portions[c.key]) || defaultPortion(t.preset, dishMap[c.dishId].category) }))
    const kcal = base.reduce((s, b) => s + (per100[b.id].kcal * b.g) / 100, 0)
    if (kcal <= 0) return notify('These dishes have no calories yet — check Tab 1', 'error')
    const k = target / kcal
    const out = base.map(b => ({ ...b, g: Math.max(5, Math.round((b.g * k) / 5) * 5) }))
    const kcalOf = list => list.reduce((s, b) => s + (per100[b.id].kcal * b.g) / 100, 0)
    // Rounding to 5 g drifts off target — nudge the starch (or first dish) ±5 g steps to land closest
    const adj = out.find(b => dishMap[b.id].category === 'Starch') || out[0]
    const g0 = adj.g
    let best = { g: g0, err: Math.abs(kcalOf(out) - target) }
    for (let d = -30; d <= 30; d += 5) {
      adj.g = Math.max(5, g0 + d)
      const err = Math.abs(kcalOf(out) - target)
      if (err < best.err) best = { g: adj.g, err }
    }
    adj.g = best.g
    setTier(t.id, { portions: { ...t.portions, ...Object.fromEntries(out.map(b => [b.key, b.g])) } })
    notify(`${t.name}: ${fk(kcalOf(out))} kcal (target ${fk(target)})`)
  }

  const newMeal = () => {
    if (hasWork && !window.confirm('Start a new meal? Unsaved changes on screen will be cleared.')) return
    const last = [...db.meals].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0]
    update(d => ({ ...d, mealDraft: newMealDraft(last?.tiers) }))
  }
  const openMeal = id => {
    const m = db.meals.find(x => x.id === id)
    if (!m) return
    if (hasWork && md.id !== id && !window.confirm(`Open “${m.name}”? Unsaved changes on screen will be cleared.`)) return
    update(d => ({ ...d, mealDraft: JSON.parse(JSON.stringify(m)) }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const saveMeal = asNew => {
    if (!active.length) return notify('Pick at least one dish for this meal', 'error')
    const id = !asNew && saved ? saved.id : uid()
    const meal = {
      id, name: mealName, updatedAt: Date.now(),
      components: active.map(({ key, dishId }) => ({ key, dishId })),
      tiers: md.tiers.map(t => ({ ...t, target: t.target === '' ? '' : num(t.target), portions: Object.fromEntries(active.map(c => [c.key, num(t.portions[c.key])])) })),
    }
    update(d => ({
      ...d,
      meals: d.meals.some(x => x.id === id) ? d.meals.map(x => (x.id === id ? meal : x)) : [...d.meals, meal],
      mealDraft: { ...d.mealDraft, id, name: mealName },
    }))
    notify(saved && !asNew ? `Updated “${mealName}”` : `“${mealName}” added to Saved Meals`)
  }
  const deleteMeal = m => {
    if (!window.confirm(`Delete saved meal “${m.name}”?`)) return
    update(d => ({
      ...d,
      meals: d.meals.filter(x => x.id !== m.id),
      mealDraft: d.mealDraft.id === m.id ? { ...d.mealDraft, id: null } : d.mealDraft,
      prep: d.prep.mealId === m.id ? { ...d.prep, mealId: '' } : d.prep,
    }))
  }
  const copyLabel = async (t, calc) => {
    const ok = await copyText(labelText(mealName, t, calc))
    if (ok) { setCopied(t.id); setTimeout(() => setCopied(null), 1600) } else notify('Copy failed — long-press the label to select it', 'error')
  }

  return (
    <div className="space-y-4">
      {/* Meal picker */}
      <Card className="border-gold/50 bg-pale">
        <div className="grid items-end gap-3 md:grid-cols-[auto_1fr]">
          <Btn size="lg" onClick={newMeal}><FilePlus size={22} /> New Meal</Btn>
          <Field label="Open a Saved Meal">
            <Select value="" onChange={e => openMeal(e.target.value)} disabled={!db.meals.length}>
              <option value="">{db.meals.length ? `Saved meals (${db.meals.length})…` : 'No saved meals yet'}</option>
              {db.meals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {/* Components */}
      <Card>
        {saved && <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gold/25 px-3 py-1 text-sm font-semibold"><Pencil size={14} /> Editing saved meal</div>}
        <StepTitle step="1" title="What's in the box?" sub="Combine your saved dishes into one meal." />
        <Field label="Meal name" className="mb-4">
          <input className={`${inputCls} text-xl font-semibold`} value={md.name} placeholder={suggested || 'e.g. Jollof + Grilled Chicken + Shito'}
            onChange={e => setMd({ name: e.target.value })} />
        </Field>
        <ul className="space-y-2">
          {md.components.map(c => {
            const dish = dishMap[c.dishId]
            const cat = dish?.category || c.hint
            return (
              <li key={c.key} className="flex items-center gap-2">
                <span className="hidden w-28 shrink-0 text-sm font-bold uppercase tracking-wide text-ink/55 sm:block">{cat || 'Dish'}</span>
                <Select className="flex-1" value={c.dishId} onChange={e => setComponentDish(c.key, e.target.value)}>
                  <option value="">{cat ? `Choose a ${cat.toLowerCase()} dish…` : 'Choose a dish…'}</option>
                  {[...CATEGORIES].sort((a, b) => (a === c.hint ? -1 : b === c.hint ? 1 : 0)).map(catg => {
                    const list = db.dishes.filter(d => d.category === catg)
                    return list.length ? <optgroup key={catg} label={catg}>{list.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup> : null
                  })}
                </Select>
                <button type="button" onClick={() => removeComponent(c.key)} aria-label="Remove component"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-cherry hover:bg-cherry/10"><X size={22} /></button>
              </li>
            )
          })}
        </ul>
        <Btn variant="soft" className="mt-3" onClick={addComponent}><Plus size={20} /> Add Component</Btn>
      </Card>

      {/* Tiers */}
      <div>
        <div className="mb-3 px-1">
          <h2 className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight sm:text-2xl">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-ink px-2 text-sm text-gold">2</span>
            Portions per Plan
          </h2>
          <p className="mt-1 text-ink/60">Type cooked grams, or set a calorie target and tap <b>Auto-fit</b>.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {md.tiers.map(t => {
            const calc = tierLines(t, active, dishMap, per100)
            const col = boxColor(t.color)
            const diff = num(t.target) > 0 ? calc.total.kcal - num(t.target) : null
            return (
              <Card key={t.id} flush className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3" style={{ background: col.bg, color: col.fg, borderBottom: col.id === 'white' ? '1px solid rgba(27,23,22,.15)' : 'none' }}>
                  <input value={t.name} onChange={e => setTier(t.id, { name: e.target.value })} aria-label="Plan name"
                    className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 font-display text-xl font-extrabold outline-none focus:bg-black/10" />
                  {md.tiers.length > 1 && (
                    <button type="button" onClick={() => removeTier(t)} aria-label={`Remove ${t.name}`} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-black/10"><Trash2 size={18} /></button>
                  )}
                </div>
                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Box colour">
                    {BOX_COLORS.map(c => (
                      <button key={c.id} type="button" title={`${c.label} box`} aria-label={`${c.label} box`} aria-checked={t.color === c.id} role="radio"
                        onClick={() => setTier(t.id, { color: c.id })}
                        className={`h-8 w-8 rounded-full border-2 transition ${t.color === c.id ? 'scale-110 border-ink ring-2 ring-ink ring-offset-2' : 'border-ink/20'}`}
                        style={{ background: c.bg }} />
                    ))}
                  </div>
                  <div className="flex items-end gap-2">
                    <Field label="Calorie target" className="flex-1">
                      <div className="relative">
                        <NumInput value={t.target} onChange={v => setTier(t.id, { target: v })} placeholder="optional" className="pr-14" />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink/40">kcal</span>
                      </div>
                    </Field>
                    <Btn variant="gold" onClick={() => autoFit(t)}><Sparkles size={18} /> Auto-fit</Btn>
                  </div>
                  {active.length === 0 ? (
                    <p className="text-sm text-ink/50">Pick dishes above to set portions.</p>
                  ) : (
                    <div className="space-y-2">
                      {active.map(c => (
                        <div key={c.key} className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold leading-tight">{dishMap[c.dishId].name}</div>
                            <div className="text-xs text-ink/50">{dishMap[c.dishId].category} · cooked</div>
                          </div>
                          <GramInput wrapClass="w-32" value={t.portions?.[c.key] ?? ''} onChange={v => setPortion(t.id, c.key, v)} aria-label={`${t.name} ${dishMap[c.dishId].name} grams`} />
                        </div>
                      ))}
                    </div>
                  )}
                  {diff !== null && active.length > 0 && (
                    <div className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${Math.abs(diff) <= 25 ? 'bg-leaf/10 text-leaf' : 'bg-cherry/10 text-cherry'}`}>
                      {Math.abs(diff) <= 25 ? '✓ On target' : diff > 0 ? `${fk(diff)} kcal over target` : `${fk(-diff)} kcal under target`}
                    </div>
                  )}
                  <NutritionLabel mealName={mealName} tier={t} calc={calc} />
                  <div className="grid grid-cols-2 gap-2">
                    <Btn variant="ghost" size="sm" onClick={() => copyLabel(t, calc)}><Copy size={16} /> {copied === t.id ? 'Copied!' : 'Copy text'}</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => onPrint(<NutritionLabel mealName={mealName} tier={t} calc={calc} printMode />)}><Printer size={16} /> Print label</Btn>
                  </div>
                </div>
              </Card>
            )
          })}
          <button type="button" onClick={addTier}
            className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/20 text-ink/55 transition hover:border-gold hover:bg-pale hover:text-ink">
            <Plus size={32} /><span className="font-display text-lg font-extrabold">Add Custom Plan</span>
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="sticky bottom-3 z-20 flex flex-col gap-2 rounded-2xl bg-ink p-3 shadow-xl sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 truncate px-1 text-white"><span className="text-white/60">Meal:</span> <b>{mealName || 'Pick dishes above'}</b></div>
        {saved && <Btn variant="ghost" onClick={() => saveMeal(true)}>Save as New</Btn>}
        <Btn variant="gold" size="lg" onClick={() => saveMeal(false)}><Save size={20} /> {saved ? 'Update Meal' : 'Save Meal'}</Btn>
      </div>

      {/* Saved meals */}
      {db.meals.length > 0 && (
        <Card>
          <StepTitle title="Saved Meals" />
          <ul className="grid gap-3 md:grid-cols-2">
            {db.meals.map(m => {
              const comps = m.components.filter(c => dishMap[c.dishId])
              return (
                <li key={m.id} className={`rounded-xl border p-3 ${m.id === md.id ? 'border-gold bg-pale' : 'border-ink/10'}`}>
                  <div className="text-lg font-semibold leading-tight">{m.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {m.tiers.map(t => {
                      const col = boxColor(t.color)
                      return (
                        <span key={t.id} className="tabular rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: col.bg, color: col.fg, border: col.id === 'white' ? '1px solid #1B1716' : 'none' }}>
                          {t.name}: {fk(tierLines(t, comps, dishMap, per100).total.kcal)} kcal
                        </span>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Btn size="sm" variant="ghost" onClick={() => openMeal(m.id)}><Pencil size={16} /> Edit</Btn>
                    <Btn size="sm" variant="gold" onClick={() => { update(d => ({ ...d, prep: { ...d.prep, mealId: m.id } })); goTab(3) }}><ClipboardList size={16} /> Prep this</Btn>
                    <Btn size="sm" variant="plain" className="text-cherry" onClick={() => deleteMeal(m)}><Trash2 size={16} /> Delete</Btn>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
