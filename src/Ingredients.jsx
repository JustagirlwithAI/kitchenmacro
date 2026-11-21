import { Fragment, useEffect, useMemo, useState } from 'react'
import { Check, Globe, KeyRound, Loader2, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { Btn, Field, Modal, NumInput, Select, inputCls } from './ui.jsx'
import { DEFAULT_INGREDIENTS, GROUPS } from './data.js'
import { f1, fk, num } from './lib.js'
import { API_SIGNUP, getApiKey, loadUsda, searchFoods, searchOnline, setApiKey } from './foodDb.js'

const groupIdx = g => { const i = GROUPS.indexOf(g); return i < 0 ? 99 : i }
const sortIngs = list => [...list].sort((a, b) => groupIdx(a.group) - groupIdx(b.group) || a.name.localeCompare(b.name))
const matches = (i, s) => !s || i.name.toLowerCase().includes(s) || (i.group || '').toLowerCase().includes(s)

// Loads the bundled USDA list once (≈140 KB download, then cached)
function useUsda(active) {
  const [list, setList] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!active || list) return
    let live = true
    loadUsda().then(l => live && setList(l)).catch(() => live && setFailed(true))
    return () => { live = false }
  }, [active, list])
  return { list, failed }
}

function FoodRow({ food, onPick, tag }) {
  return (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => onPick(food)}
      className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-butter/60">
      <span className="min-w-0">
        <span className="block font-medium leading-tight">{food.name}{tag}</span>
        {food.brand && <span className="block text-xs text-ink/50">{food.brand}</span>}
      </span>
      <span className="tabular shrink-0 text-right text-xs text-ink/55">
        <b className="text-sm text-ink">{fk(food.kcal)}</b> kcal<br />P {f1(food.p)} · C {f1(food.c)} · F {f1(food.f)}
      </span>
    </button>
  )
}

const Head = ({ children }) => (
  <div className="sticky top-0 z-10 bg-pale px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink/60">{children}</div>
)

// Search-as-you-type ingredient adder: your list first, then the USDA database
export function IngredientPicker({ ingredients, usedIds = [], onPick, onPickFood, onCreate }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const { list: usda, failed } = useUsda(open)
  const s = q.trim().toLowerCase()
  const mine = useMemo(() => sortIngs(ingredients.filter(i => matches(i, s))), [s, ingredients])
  const haveFdc = useMemo(() => new Set(ingredients.map(i => i.fdcId).filter(Boolean)), [ingredients])
  const fromUsda = useMemo(() => (s.length >= 2 ? searchFoods(usda, s, 8).filter(f => !haveFdc.has(f.fdcId)) : []), [usda, s, haveFdc])
  const close = () => { setQ(''); setOpen(false) }
  const pick = id => { onPick(id); close() }
  const pickFood = f => { onPickFood(f); close() }
  const create = () => { onCreate(q.trim()); close() }
  let lastGroup = null
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-6 -translate-y-1/2 text-ink/40" size={20} />
      <input
        value={q}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (mine[0] && s) pick(mine[0].id)
            else if (fromUsda[0]) pickFood(fromUsda[0])
            else if (q.trim()) create()
          }
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="Search any food (olive oil, sardines…)"
        className={`${inputCls} pl-10`}
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-30 mt-2 max-h-[26rem] w-full overflow-y-auto rounded-xl border border-ink/15 bg-white shadow-xl">
          {mine.length > 0 && s && <Head>Your ingredients</Head>}
          {mine.map(i => {
            const head = !s && i.group !== lastGroup ? (lastGroup = i.group) : null
            return (
              <Fragment key={i.id}>
                {head && <Head>{head}</Head>}
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => pick(i.id)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-butter/60">
                  <span className="font-medium">
                    {i.name}
                    {usedIds.includes(i.id) && <span className="ml-2 rounded bg-cherry/10 px-1.5 py-0.5 text-xs font-bold text-cherry">in pot</span>}
                  </span>
                  <span className="tabular shrink-0 text-sm text-ink/50">{fk(i.kcal)} kcal/100g</span>
                </button>
              </Fragment>
            )
          })}
          {s.length >= 2 && (
            <>
              <Head>USDA food database · tap to add</Head>
              {!usda && !failed && <div className="flex items-center gap-2 px-3 py-3 text-ink/55"><Loader2 className="animate-spin" size={18} /> Loading food database…</div>}
              {failed && <div className="px-3 py-3 text-sm text-cherry">Couldn't load the food database. Refresh the page.</div>}
              {usda && fromUsda.length === 0 && <div className="px-3 py-3 text-sm text-ink/55">No USDA match for “{q.trim()}”.</div>}
              {fromUsda.map(f => <FoodRow key={f.fdcId} food={f} onPick={pickFood} />)}
            </>
          )}
          {q.trim() && (
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={create}
              className="flex w-full items-center gap-2 border-t border-ink/10 px-3 py-4 text-left hover:bg-butter/60">
              <Globe size={18} className="shrink-0 text-cherry" />
              <span>Not listed? <b className="text-cherry">Search online (incl. brands) or type “{q.trim()}” in yourself</b></span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Create / edit one ingredient (per 100 g raw). New ingredients auto-fill from the USDA list as you type the name.
export function IngredientForm({ open, initial, onClose, onSave }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState({})
  const [err, setErr] = useState('')
  const [locked, setLocked] = useState(false) // true once the user picks a match or types numbers
  const [filled, setFilled] = useState(null)
  const [online, setOnline] = useState({ loading: false, results: null, error: '' })
  const [keyOpen, setKeyOpen] = useState(false)
  const [apiKey, setKey] = useState('')
  const { list: usda } = useUsda(open && !isEdit)

  useEffect(() => {
    if (!open) return
    setForm({ name: '', group: 'Other', kcal: '', p: '', c: '', f: '', ...initial })
    setErr(''); setLocked(isEdit); setFilled(null); setOnline({ loading: false, results: null, error: '' })
    setKey(getApiKey()); setKeyOpen(false)
  }, [open, initial, isEdit])

  const suggestions = useMemo(() => (!isEdit && usda ? searchFoods(usda, form.name || '', 6) : []), [usda, form.name, isEdit])

  const apply = (food, lock) => {
    setForm(s => ({ ...s, group: food.group, kcal: food.kcal, p: food.p, c: food.c, f: food.f, source: food.source, fdcId: food.fdcId }))
    setFilled(food)
    if (lock) setLocked(true)
  }
  // Auto-fill with the best match while the name is being typed
  useEffect(() => {
    if (!open || locked || isEdit) return
    if (suggestions[0]) apply(suggestions[0], false)
    else if (filled) {
      setForm(s => ({ ...s, kcal: '', p: '', c: '', f: '', source: undefined, fdcId: undefined }))
      setFilled(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions])

  const set = (k, v) => setForm(s => ({ ...s, [k]: v }))
  const setNum = (k, v) => { setLocked(true); setForm(s => ({ ...s, [k]: v, source: 'Typed in' })) }
  const calc = Math.round(num(form.p) * 4 + num(form.c) * 4 + num(form.f) * 9)

  const goOnline = async () => {
    const q = (form.name || '').trim()
    if (!q) return setErr('Type the ingredient name first')
    setOnline({ loading: true, results: null, error: '' })
    try { setOnline({ loading: false, results: await searchOnline(q), error: '' }) }
    catch (e) { setOnline({ loading: false, results: null, error: e.message }) }
  }
  const submit = e => {
    e?.preventDefault()
    const name = (form.name || '').trim()
    if (!name) return setErr('Type the ingredient name')
    if (!isEdit && form.kcal === '' && form.p === '' && form.c === '' && form.f === '') return setErr('Pick a match below, or type the numbers from the pack label')
    const kcal = form.kcal === '' || form.kcal == null ? calc : num(form.kcal)
    onSave({ ...initial, name, group: form.group, kcal, p: num(form.p), c: num(form.c), f: num(form.f), ...(form.source ? { source: form.source } : {}), ...(form.fdcId ? { fdcId: form.fdcId } : {}) })
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Ingredient' : 'Add New Ingredient'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Ingredient name">
          <input autoFocus className={inputCls} value={form.name || ''} onChange={e => { set('name', e.target.value); setErr('') }} placeholder="e.g. Olive Oil, Sardines, Shito" />
        </Field>

        {!isEdit && (
          <div className="rounded-xl border-2 border-gold/60 bg-pale p-3">
            {filled ? (
              <div className="mb-2 flex items-start gap-2 text-sm">
                <Check size={18} className="mt-0.5 shrink-0 text-leaf" />
                <span>Numbers filled from <b>{filled.name}</b>{filled.brand ? ` (${filled.brand})` : ''} — {filled.source}. Not right? Tap another below.</span>
              </div>
            ) : (
              <p className="mb-2 text-sm text-ink/70">
                {!usda ? 'Loading food database…' : (form.name || '').trim().length < 2 ? 'Type a name — matching foods appear here and fill in the numbers.' : 'No match in the built-in list. Try online search, or type the numbers from the pack.'}
              </p>
            )}
            {suggestions.length > 0 && (
              <div className="-mx-3 max-h-56 overflow-y-auto border-y border-ink/10 bg-white">
                {suggestions.map(sg => (
                  <FoodRow key={sg.fdcId} food={sg} onPick={f => apply(f, true)}
                    tag={filled?.fdcId === sg.fdcId ? <span className="ml-2 rounded bg-leaf/15 px-1.5 text-xs font-bold text-leaf">using</span> : null} />
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Btn size="sm" variant="ghost" onClick={goOnline} disabled={online.loading}>
                {online.loading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />} Search online (incl. brands)
              </Btn>
              <button type="button" onClick={() => setKeyOpen(o => !o)} className="flex items-center gap-1 text-sm text-ink/55 underline">
                <KeyRound size={14} /> {getApiKey() ? 'Your API key' : 'Using demo key'}
              </button>
            </div>
            {keyOpen && (
              <div className="mt-2 rounded-lg bg-white p-3 text-sm ring-1 ring-ink/10">
                <p className="mb-2 text-ink/70">The shared demo key allows ~10 online searches an hour. A free personal key allows ~1,000. Get one at <a className="font-semibold text-cherry underline" href={API_SIGNUP} target="_blank" rel="noreferrer">fdc.nal.usda.gov</a> and paste it here.</p>
                <div className="flex gap-2">
                  <input className={`${inputCls} h-10 text-base`} value={apiKey} onChange={e => setKey(e.target.value)} placeholder="Paste API key" autoComplete="off" />
                  <Btn size="sm" onClick={() => { setApiKey(apiKey); setKeyOpen(false) }}>Save</Btn>
                </div>
              </div>
            )}
            {online.error && <p className="mt-2 text-sm font-semibold text-cherry">{online.error}</p>}
            {online.results && (
              <div className="-mx-3 mt-3 max-h-64 overflow-y-auto border-y border-ink/10 bg-white">
                <Head>Online results ({online.results.length})</Head>
                {online.results.length === 0 && <div className="px-3 py-3 text-sm text-ink/55">Nothing found online either — type the numbers from the pack label.</div>}
                {online.results.map(r => (
                  <FoodRow key={r.fdcId} food={r} onPick={f => apply(f, true)}
                    tag={filled?.fdcId === r.fdcId ? <span className="ml-2 rounded bg-leaf/15 px-1.5 text-xs font-bold text-leaf">using</span> : null} />
                ))}
              </div>
            )}
          </div>
        )}

        <Field label="Type">
          <Select value={form.group || 'Other'} onChange={e => set('group', e.target.value)}>
            {GROUPS.map(g => <option key={g}>{g}</option>)}
          </Select>
        </Field>
        <p className="text-sm text-ink/60">Values are <b>per 100 g raw</b>. You can still change any number.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Protein (g)"><NumInput value={form.p} onChange={v => setNum('p', v)} /></Field>
          <Field label="Carbs (g)"><NumInput value={form.c} onChange={v => setNum('c', v)} /></Field>
          <Field label="Fat (g)"><NumInput value={form.f} onChange={v => setNum('f', v)} /></Field>
          <Field label="Calories (kcal)" hint={form.kcal === '' ? `Blank = ${calc} kcal (from macros)` : undefined}>
            <NumInput value={form.kcal} onChange={v => setNum('kcal', v)} placeholder={String(calc)} />
          </Field>
        </div>
        {err && <p className="font-semibold text-cherry">{err}</p>}
        <div className="flex gap-3 pt-1">
          <Btn variant="ghost" className="flex-1" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" variant="gold" className="flex-1">{isEdit ? 'Save Changes' : 'Add Ingredient'}</Btn>
        </div>
      </form>
    </Modal>
  )
}


// Full ingredient database: add / edit / delete
export function IngredientManager({ open, onClose, ingredients, onSave, onDelete, onRestore }) {
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const list = useMemo(() => sortIngs(ingredients.filter(i => matches(i, q.trim().toLowerCase()))), [ingredients, q])
  const missing = DEFAULT_INGREDIENTS.filter(d => !ingredients.some(i => i.id === d.id)).length
  let lastGroup = null
  return (
    <>
      <Modal open={open && !editing} onClose={onClose} title="Ingredients (per 100g raw)" wide>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={20} />
            <input className={`${inputCls} pl-10`} placeholder="Search ingredients" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Btn variant="gold" onClick={() => setEditing({})}><Plus size={20} /> New Ingredient</Btn>
        </div>
        <ul className="divide-y divide-ink/10">
          {list.map(i => {
            const head = i.group !== lastGroup ? (lastGroup = i.group) : null
            return (
              <Fragment key={i.id}>
                {head && <li className="bg-pale px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-ink/60">{head}</li>}
                <li className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold leading-tight">{i.name}{!i.builtin && <span className="ml-2 rounded bg-gold/30 px-1.5 text-xs font-bold">{i.fdcId ? "USDA" : "yours"}</span>}</div>
                    <div className="tabular text-sm text-ink/60">{fk(i.kcal)} kcal · P {f1(i.p)} · C {f1(i.c)} · F {f1(i.f)}</div>
                  </div>
                  <button type="button" aria-label={`Edit ${i.name}`} onClick={() => setEditing(i)} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-ink/5"><Pencil size={19} /></button>
                  <button type="button" aria-label={`Delete ${i.name}`} onClick={() => onDelete(i)} className="grid h-11 w-11 place-items-center rounded-xl text-cherry hover:bg-cherry/10"><Trash2 size={19} /></button>
                </li>
              </Fragment>
            )
          })}
        </ul>
        {missing > 0 && (
          <Btn variant="ghost" size="sm" className="mt-4" onClick={onRestore}><RotateCcw size={16} /> Restore {missing} deleted default ingredient{missing > 1 ? 's' : ''}</Btn>
        )}
      </Modal>
      <IngredientForm open={!!editing} initial={editing} onClose={() => setEditing(null)}
        onSave={ing => { onSave(ing); setEditing(null) }} />
    </>
  )
}
