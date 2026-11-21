import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChefHat, ClipboardList, CookingPot, Database, Download, HardDrive, Upload, UtensilsCrossed } from 'lucide-react'
import RecipeTab from './RecipeTab.jsx'
import MealTab from './MealTab.jsx'
import PrepTab from './PrepTab.jsx'
import { IngredientManager } from './Ingredients.jsx'
import { Btn, Modal } from './ui.jsx'
import { DEFAULT_INGREDIENTS } from './data.js'
import { downloadJSON, loadDB, normalizeDB, saveDB, todayISO, uid } from './lib.js'

const TABS = [
  { id: 1, short: 'Recipe', long: 'Recipe & Yield Calculator', icon: CookingPot },
  { id: 2, short: 'Meals', long: 'Meal Builder & Tiers', icon: UtensilsCrossed },
  { id: 3, short: 'Prep', long: 'Daily Kitchen Prep Sheet', icon: ClipboardList },
]

export default function App() {
  const [db, setDb] = useState(loadDB)
  const [tab, setTabState] = useState(() => {
    try { return Number(localStorage.getItem('kitchenmacro:tab')) || 1 } catch { return 1 }
  })
  const [toast, setToast] = useState(null)
  const [ingOpen, setIngOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [printNode, setPrintNode] = useState(null)
  const toastTimer = useRef()

  useEffect(() => {
    if (!saveDB(db)) setToast({ msg: 'Could not save to this browser — export a backup!', type: 'error' })
  }, [db])

  const update = useCallback(fn => setDb(prev => fn(prev)), [])
  const ingMap = useMemo(() => Object.fromEntries(db.ingredients.map(i => [i.id, i])), [db.ingredients])

  const notify = useCallback((msg, type = 'ok') => {
    setToast({ msg, type })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  const goTab = id => {
    setTabState(id)
    try { localStorage.setItem('kitchenmacro:tab', String(id)) } catch { /* ignore */ }
    window.scrollTo({ top: 0 })
  }

  // ---------- ingredients ----------
  const saveIngredient = ing => {
    const id = ing.id || `custom-${uid()}`
    const clean = { ...ing, id, builtin: ing.builtin ?? false }
    update(d => ({
      ...d,
      ingredients: d.ingredients.some(i => i.id === id) ? d.ingredients.map(i => (i.id === id ? clean : i)) : [...d.ingredients, clean],
    }))
    return id
  }
  const deleteIngredient = ing => {
    const usedIn = db.dishes.filter(d => d.items.some(i => i.ingId === ing.id))
    if (usedIn.length) return window.alert(`“${ing.name}” is used in: ${usedIn.map(d => d.name).join(', ')}.\nRemove it from those dishes first.`)
    if (!window.confirm(`Delete “${ing.name}”?`)) return
    update(d => ({ ...d, ingredients: d.ingredients.filter(i => i.id !== ing.id) }))
    notify(`Deleted “${ing.name}”`)
  }
  const restoreDefaults = () => {
    update(d => ({ ...d, ingredients: [...d.ingredients, ...DEFAULT_INGREDIENTS.filter(x => !d.ingredients.some(i => i.id === x.id)).map(x => ({ ...x }))] }))
    notify('Default ingredients restored')
  }

  // ---------- printing ----------
  useEffect(() => {
    if (!printNode) return
    document.body.classList.add('print-portal')
    const done = () => { document.body.classList.remove('print-portal'); setPrintNode(null) }
    window.addEventListener('afterprint', done, { once: true })
    const t = setTimeout(() => window.print(), 60)
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done) }
  }, [printNode])
  const printPage = () => {
    document.body.classList.remove('print-portal')
    setPrintNode(null)
    setTimeout(() => window.print(), 60)
  }

  // ---------- backup ----------
  const exportData = () => {
    const { draft, mealDraft, ...rest } = db
    downloadJSON({ app: 'KitchenMacro', exportedAt: new Date().toISOString(), ...rest, draft, mealDraft }, `kitchenmacro-backup-${todayISO()}.json`)
    notify('Backup downloaded')
  }
  const importData = file => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = normalizeDB(JSON.parse(reader.result))
        if (!window.confirm(`Replace everything on this device with the backup?\n\n${data.ingredients.length} ingredients · ${data.dishes.length} dishes · ${data.meals.length} meals`)) return
        setDb(data)
        setBackupOpen(false)
        notify('Backup restored')
      } catch (e) {
        window.alert(`That file couldn't be read: ${e.message}`)
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <div id="app" className="min-h-dvh pb-16">
        <header className="no-print sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gold"><ChefHat className="text-ink" size={26} /></div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-2xl font-extrabold leading-none tracking-tight">KitchenMacro</div>
              <div className="truncate text-sm text-ink/55">Raw pot → cooked macros → perfect boxes</div>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setIngOpen(true)} aria-label="Ingredients"><Database size={18} /><span className="hidden sm:inline">Ingredients</span></Btn>
            <Btn variant="ghost" size="sm" onClick={() => setBackupOpen(true)} aria-label="Backup"><HardDrive size={18} /><span className="hidden sm:inline">Backup</span></Btn>
          </div>
          <nav className="mx-auto grid max-w-7xl grid-cols-3 gap-1.5 px-4 py-3" aria-label="Steps">
            {TABS.map(t => {
              const on = tab === t.id
              const Icon = t.icon
              return (
                <button key={t.id} type="button" aria-label={`Step ${t.id}: ${t.long}`} onClick={() => goTab(t.id)} aria-current={on ? 'page' : undefined}
                  className={`flex h-14 items-center justify-center gap-2 rounded-xl px-2 text-left font-bold transition ${on ? 'bg-ink text-white shadow-md' : 'bg-white text-ink/65 ring-1 ring-ink/10 hover:text-ink'}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold ${on ? 'bg-gold text-ink' : 'bg-ink/10'}`}>{t.id}</span>
                  <span className="leading-tight sm:hidden">{t.short}</span>
                  <span className="hidden leading-tight sm:inline">{t.long}</span>
                  <Icon size={20} className="hidden shrink-0 lg:block" />
                </button>
              )
            })}
          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-4">
          {tab === 1 && <RecipeTab db={db} update={update} ingMap={ingMap} notify={notify} saveIngredient={saveIngredient} onPrint={setPrintNode} />}
          {tab === 2 && <MealTab db={db} update={update} ingMap={ingMap} notify={notify} onPrint={setPrintNode} goTab={goTab} />}
          {tab === 3 && <PrepTab db={db} update={update} ingMap={ingMap} notify={notify} goTab={goTab} onPrintPage={printPage} />}
        </main>

        {toast && (
          <div role="status" className={`no-print fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md rounded-2xl px-4 py-3 text-center font-semibold shadow-2xl ${toast.type === 'error' ? 'bg-cherry text-white' : 'bg-ink text-white'}`}>
            {toast.msg}
          </div>
        )}

        <IngredientManager open={ingOpen} onClose={() => setIngOpen(false)} ingredients={db.ingredients}
          onSave={ing => { saveIngredient(ing); notify(`Saved “${ing.name}”`) }} onDelete={deleteIngredient} onRestore={restoreDefaults} />

        <Modal open={backupOpen} onClose={() => setBackupOpen(false)} title="Backup & Restore">
          <p className="mb-4 text-ink/70">
            Everything saves automatically on <b>this device's browser</b>. Your phone, tablet and laptop each keep their own copy —
            export a backup here and import it on another device to move your recipes across.
          </p>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            {[['Ingredients', db.ingredients.length], ['Dishes', db.dishes.length], ['Meals', db.meals.length]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-pale py-3"><div className="font-display text-2xl font-extrabold">{v}</div><div className="text-sm text-ink/60">{k}</div></div>
            ))}
          </div>
          <div className="space-y-2">
            <Btn variant="gold" size="lg" className="w-full" onClick={exportData}><Download size={20} /> Export Backup (.json)</Btn>
            <label className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-ink/15 text-lg font-semibold hover:bg-ink/5">
              <Upload size={20} /> Import Backup
              <input type="file" accept="application/json,.json" className="hidden" onChange={e => { importData(e.target.files?.[0]); e.target.value = '' }} />
            </label>
          </div>
        </Modal>
      </div>
      {printNode && <div id="print-root">{printNode}</div>}
    </>
  )
}
