import { useEffect, useMemo, useRef, useState } from 'react'
import { Calculator, CookingPot, FilePlus, Info, Pencil, Plus, Save, Scale, Trash2, Users, X } from 'lucide-react'
import { Btn, Card, Field, GramInput, MacroLine, MacroTiles, Modal, Select, StepTitle, inputCls } from './ui.jsx'
import { DEFAULT_SCALE, ScaleCard } from './Scaler.jsx'
import { IngredientForm, IngredientPicker } from './Ingredients.jsx'
import { CATEGORIES, TEMPLATES } from './data.js'
import { ZERO, dishPer100, f1, fg, fk, fkg, newDraft, num, rowNut, scaleNut, sumNut, uid } from './lib.js'

export default function RecipeTab({ db, update, ingMap, notify, saveIngredient, onPrint }) {
  const scalePrefs = { ...DEFAULT_SCALE, ...(db.prep.scale || {}) }
  const setScalePrefs = patch => update(d => ({ ...d, prep: { ...d.prep, scale: { ...DEFAULT_SCALE, ...(d.prep.scale || {}), ...patch } } }))
  const [scaling, setScaling] = useState(null)
  const draft = db.draft
  const setDraft = fn => update(d => ({ ...d, draft: { ...d.draft, ...(typeof fn === 'function' ? fn(d.draft) : fn) } }))
  const [focusKey, setFocusKey] = useState(null)
  const inputRefs = useRef({})
  const [customInit, setCustomInit] = useState(null)
  const [pot, setPot] = useState({ full: '', empty: '' })

  useEffect(() => {
    if (focusKey && inputRefs.current[focusKey]) {
      inputRefs.current[focusKey].focus()
      inputRefs.current[focusKey].scrollIntoView({ block: 'center', behavior: 'smooth' })
      setFocusKey(null)
    }
  }, [focusKey, draft.items])

  const rows = draft.items.map(it => {
    const ing = ingMap[it.ingId]
    return { ...it, ing, n: ing ? rowNut(ing, it.grams) : ZERO }
  })
  const totals = sumNut(rows.map(r => r.n))
  const rawWeight = rows.reduce((s, r) => s + num(r.grams), 0)
  const cooked = num(draft.cookedWeight)
  const p100 = cooked > 0 && rows.length ? scaleNut(totals, 100 / cooked) : null
  const saved = draft.id ? db.dishes.find(d => d.id === draft.id) : null
  const hasWork = draft.items.length > 0

  const replaceDraft = next => {
    if (hasWork && !window.confirm('Replace the dish on screen? (Saved dishes are safe.)')) return false
    update(d => ({ ...d, draft: next }))
    setPot({ full: '', empty: '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return true
  }
  const loadTemplate = id => {
    const t = TEMPLATES.find(x => x.id === id)
    if (!t) return
    const ok = replaceDraft({
      id: null, name: t.name, category: t.category, cookedWeight: '',
      items: t.items.filter(i => ingMap[i.ingId]).map(i => ({ key: uid(), ingId: i.ingId, grams: i.grams })),
    })
    if (ok) notify(`Loaded ${t.name} — change the weights to match your scale`)
  }
  const openDish = id => {
    const dish = db.dishes.find(d => d.id === id)
    if (!dish) return
    replaceDraft({
      id: dish.id, name: dish.name, category: dish.category, cookedWeight: dish.cookedWeight,
      items: dish.items.map(i => ({ key: uid(), ingId: i.ingId, grams: i.grams })),
    })
  }

  const addIngredient = ingId => {
    const key = uid()
    setDraft(d => ({ items: [...d.items, { key, ingId, grams: '' }] }))
    setFocusKey(key)
  }
  // One tap on a USDA result: save it to your ingredient list, then drop it in the pot
  const addFood = food => {
    const existing = db.ingredients.find(i => i.fdcId === food.fdcId)
    const id = existing ? existing.id : saveIngredient({
      id: `usda-${food.fdcId}`, name: food.name, group: food.group, fdcId: food.fdcId, source: food.source,
      kcal: food.kcal, p: food.p, c: food.c, f: food.f,
    })
    addIngredient(id)
    if (!existing) notify(`Added “${food.name}” from USDA — rename it any time in Ingredients`)
  }
  const setGrams = (key, grams) => setDraft(d => ({ items: d.items.map(i => (i.key === key ? { ...i, grams } : i)) }))
  const removeRow = key => setDraft(d => ({ items: d.items.filter(i => i.key !== key) }))

  const saveDish = asNew => {
    const name = draft.name.trim()
    if (!name) return notify('Give the dish a name first', 'error')
    if (!draft.items.length) return notify('Add at least one ingredient', 'error')
    if (cooked <= 0) return notify('Enter the cooked weight in Step B', 'error')
    const id = !asNew && saved ? saved.id : uid()
    const dish = {
      id, name, category: draft.category, cookedWeight: cooked, updatedAt: Date.now(),
      items: draft.items.filter(i => ingMap[i.ingId]).map(i => ({ ingId: i.ingId, grams: num(i.grams) })),
    }
    update(d => ({
      ...d,
      dishes: d.dishes.some(x => x.id === id) ? d.dishes.map(x => (x.id === id ? dish : x)) : [...d.dishes, dish],
      draft: { ...d.draft, id },
    }))
    notify(saved && !asNew ? `Updated “${name}”` : `“${name}” saved to your menu`)
  }

  const deleteDish = dish => {
    const usedIn = db.meals.filter(m => m.components.some(c => c.dishId === dish.id))
    if (usedIn.length) return window.alert(`“${dish.name}” is used in: ${usedIn.map(m => m.name).join(', ')}.\nRemove it from those meals first (Tab 2).`)
    if (!window.confirm(`Delete “${dish.name}” from your menu?`)) return
    update(d => ({ ...d, dishes: d.dishes.filter(x => x.id !== dish.id), draft: d.draft.id === dish.id ? { ...d.draft, id: null } : d.draft }))
    notify(`Deleted “${dish.name}”`)
  }

  const potCooked = num(pot.full) - num(pot.empty)

  return (
    <div className="space-y-4">
      {/* Quick start */}
      <Card className="border-gold/50 bg-pale">
        <div className="grid items-end gap-3 md:grid-cols-[auto_1fr_1fr]">
          <Btn size="lg" onClick={() => replaceDraft(newDraft())}><FilePlus size={22} /> Start Blank Dish</Btn>
          <Field label="Load Ghanaian Dish Template">
            <Select value="" onChange={e => loadTemplate(e.target.value)}>
              <option value="">Choose a dish to auto-fill…</option>
              {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Open a Saved Dish">
            <Select value="" onChange={e => openDish(e.target.value)} disabled={!db.dishes.length}>
              <option value="">{db.dishes.length ? `Your menu (${db.dishes.length})…` : 'No saved dishes yet'}</option>
              {CATEGORIES.map(cat => {
                const list = db.dishes.filter(d => d.category === cat)
                return list.length ? (
                  <optgroup key={cat} label={cat}>{list.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup>
                ) : null
              })}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          {/* Dish details */}
          <Card>
            {saved && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gold/25 px-3 py-1 text-sm font-semibold">
                <Pencil size={14} /> Editing saved dish
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-[1fr_auto] lg:grid-cols-1 xl:grid-cols-[1fr_auto]">
              <Field label="Dish name">
                <input className={`${inputCls} text-xl font-semibold`} value={draft.name} placeholder="e.g. House Jollof Rice"
                  onChange={e => setDraft({ name: e.target.value })} />
              </Field>
              <Field label="Category">
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink/5 p-1">
                  {CATEGORIES.map(c => (
                    <button key={c} type="button" onClick={() => setDraft({ category: c })}
                      className={`h-10 rounded-lg px-3 text-sm font-bold transition ${draft.category === c ? 'bg-ink text-gold shadow' : 'text-ink/60 hover:text-ink'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Card>

          {/* Step A */}
          <Card>
            <StepTitle step="A" title="Raw Ingredients in the Pot" sub="Type what your kitchen scale says for each raw ingredient." />
            {rows.length === 0 ? (
              <div className="mb-4 rounded-xl border-2 border-dashed border-ink/15 p-6 text-center text-ink/55">
                <CookingPot className="mx-auto mb-2 text-ink/30" size={36} />
                Your pot is empty. Load a template above, or add ingredients below.
              </div>
            ) : (
              <ul className="mb-4 space-y-2">
                {rows.map(r => (
                  <li key={r.key} className={`rounded-xl border p-3 ${r.ing ? 'border-ink/10' : 'border-cherry/40 bg-cherry/5'}`}>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-semibold leading-tight">{r.ing?.name ?? 'Missing ingredient (deleted)'}</div>
                        {r.ing && <div className="text-xs text-ink/50">{fk(r.ing.kcal)} kcal per 100g raw</div>}
                      </div>
                      <button type="button" onClick={() => removeRow(r.key)} aria-label={`Remove ${r.ing?.name ?? 'ingredient'}`}
                        className="-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-cherry hover:bg-cherry/10">
                        <X size={22} />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <GramInput wrapClass="w-36" className="h-12 text-xl" value={r.grams} onChange={v => setGrams(r.key, v)}
                        inputRef={el => { inputRefs.current[r.key] = el }} aria-label={`${r.ing?.name ?? 'Ingredient'} raw grams`} />
                      <MacroLine n={r.n} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <IngredientPicker ingredients={db.ingredients} usedIds={draft.items.map(i => i.ingId)}
                  onPick={addIngredient} onPickFood={addFood} onCreate={name => setCustomInit({ name })} />
              </div>
              <Btn variant="soft" onClick={() => setCustomInit({ name: '' })}><Plus size={20} /> Custom Ingredient</Btn>
            </div>

            {/* Running total */}
            <div className="mt-4 rounded-2xl bg-ink p-4 text-white">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-display text-lg font-extrabold">Total Raw Pot</span>
                <span className="tabular text-sm text-white/70">Raw weight: <b className="text-white">{fg(rawWeight)} g</b> {fkg(rawWeight) && `(${fkg(rawWeight)})`}</span>
              </div>
              <MacroTiles n={totals} dark />
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-36">
          {/* Step B */}
          <Card>
            <StepTitle step="B" title="Final Cooked Weight" />
            <Field label="Total Weight of Cooked Food (g) — (Subtract Pot Weight)">
              <div className="relative">
                <Scale className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={24} />
                <GramInput className="h-16 pl-12 text-3xl" value={draft.cookedWeight} placeholder="0" onChange={v => setDraft({ cookedWeight: v })} />
              </div>
            </Field>
            <p className="mt-2 flex gap-2 text-sm text-ink/60">
              <Info size={18} className="mt-0.5 shrink-0 text-gold" />
              <span><b>Tip:</b> Weigh your empty pot first, then subtract it from the full cooked pot weight.</span>
            </p>
            <details className="mt-3 rounded-xl bg-pale p-3">
              <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Calculator size={18} /> Do the subtraction for me</summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Field label="Full pot"><GramInput value={pot.full} onChange={v => setPot(p => ({ ...p, full: v }))} /></Field>
                <Field label="Empty pot"><GramInput value={pot.empty} onChange={v => setPot(p => ({ ...p, empty: v }))} /></Field>
              </div>
              <Btn variant="gold" className="mt-3 w-full" disabled={potCooked <= 0} onClick={() => setDraft({ cookedWeight: Math.round(potCooked) })}>
                Use {potCooked > 0 ? `${fg(potCooked)} g` : '—'} as cooked weight
              </Btn>
            </details>
            {cooked > 0 && rawWeight > 0 && (
              <p className="mt-3 text-sm text-ink/60">
                Raw {fg(rawWeight)} g → cooked {fg(cooked)} g ({f1(cooked / rawWeight)}× — {cooked >= rawWeight ? 'absorbed water' : 'lost water'})
              </p>
            )}
          </Card>

          {/* Step C */}
          <section className="rounded-2xl border-2 border-gold bg-gold p-4 shadow-md sm:p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-ink px-2 font-display text-sm font-extrabold text-gold">C</span>
              <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">Nutrition Per 100g Cooked</h2>
            </div>
            {p100 ? (
              <>
                <MacroTiles n={p100} big twoCol />
                <div className="mt-3 rounded-xl bg-white/60 p-3 text-sm">
                  <div className="mb-1 font-bold">Quick scoops</div>
                  {[100, 150, 200, 250].map(g => (
                    <div key={g} className="tabular flex justify-between border-t border-ink/10 py-1 first:border-0">
                      <span className="font-semibold">{g} g</span>
                      <span>{fk(p100.kcal * g / 100)} kcal · P {f1(p100.p * g / 100)} · C {f1(p100.c * g / 100)} · F {f1(p100.f * g / 100)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="rounded-xl bg-white/60 p-4 text-ink/70">
                {rows.length ? 'Enter the cooked weight in Step B to see results.' : 'Add raw ingredients in Step A, then the cooked weight in Step B.'}
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <Btn size="lg" className="w-full" onClick={() => saveDish(false)}>
                <Save size={22} /> {saved ? 'Update Saved Dish' : 'Save Dish to Menu'}
              </Btn>
              {saved && <Btn variant="ghost" className="w-full" onClick={() => saveDish(true)}>Save as a New Dish</Btn>}
            </div>
          </section>
        </div>
      </div>

      {draft.items.length > 0 && (
        <Card id="scale-dish">
          <StepTitle step="D" title="Scale This Dish" sub="Feed more people with the same recipe — see how much of each raw ingredient you'll need." />
          <ScaleCard dish={draft} ingMap={ingMap} prefs={scalePrefs} setPrefs={setScalePrefs} onPrint={onPrint} />
        </Card>
      )}

      <SavedDishes db={db} ingMap={ingMap} activeId={draft.id} onOpen={openDish} onDelete={deleteDish} onScale={setScaling} />

      <Modal open={!!scaling} onClose={() => setScaling(null)} title={scaling ? `Scale: ${scaling.name}` : ''} wide>
        {scaling && <ScaleCard dish={scaling} ingMap={ingMap} prefs={scalePrefs} setPrefs={setScalePrefs} onPrint={onPrint} />}
      </Modal>

      <IngredientForm open={!!customInit} initial={customInit} onClose={() => setCustomInit(null)}
        onSave={ing => {
          const id = saveIngredient(ing)
          setCustomInit(null)
          addIngredient(id)
          notify(`Created “${ing.name}” and added it to the pot`)
        }} />
    </div>
  )
}

function SavedDishes({ db, ingMap, activeId, onOpen, onDelete, onScale }) {
  const per = useMemo(() => Object.fromEntries(db.dishes.map(d => [d.id, dishPer100(d, ingMap)])), [db.dishes, ingMap])
  if (!db.dishes.length) return null
  return (
    <Card>
      <StepTitle title="Your Menu — Saved Dishes" sub="Tap Edit to reload a dish and change it any time." />
      <div className="grid gap-4 md:grid-cols-3">
        {['Starch', 'Protein', 'Stew/Sauce'].map(cat => {
          const list = db.dishes.filter(d => d.category === cat)
          return (
            <div key={cat}>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink/55">{cat} ({list.length})</h3>
              {list.length === 0 && <p className="text-sm text-ink/40">None yet</p>}
              <ul className="space-y-2">
                {list.map(d => (
                  <li key={d.id} className={`rounded-xl border p-3 ${d.id === activeId ? 'border-gold bg-pale' : 'border-ink/10'}`}>
                    <div className="font-semibold leading-tight">{d.name}</div>
                    <div className="mb-2 text-xs text-ink/50">per 100g cooked · {fg(d.cookedWeight)} g pot</div>
                    {per[d.id] && <MacroLine n={per[d.id]} />}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn size="sm" variant="ghost" onClick={() => onOpen(d.id)}><Pencil size={16} /> Edit</Btn>
                      <Btn size="sm" variant="soft" onClick={() => onScale(d)}><Users size={16} /> Scale</Btn>
                      <Btn size="sm" variant="plain" className="text-cherry" onClick={() => onDelete(d)}><Trash2 size={16} /> Delete</Btn>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
