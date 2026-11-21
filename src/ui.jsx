import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { f1, fk } from './lib.js'

export const inputCls =
  'h-12 w-full rounded-xl border-2 border-ink/15 bg-white px-3 text-lg text-ink placeholder:text-ink/35 focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/25'

export function Card({ className = "", children, flush = false, ...rest }) {
  return (
    <section className={`rounded-2xl border border-ink/10 bg-white shadow-sm ${flush ? "" : "p-4 sm:p-5"} ${className}`} {...rest}>
      {children}
    </section>
  )
}

export function StepTitle({ step, title, sub, right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          {step && (
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-ink px-2 font-display text-sm font-extrabold text-gold">
              {step}
            </span>
          )}
          <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
        </div>
        {sub && <p className="mt-1 text-base text-ink/60">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

const VARIANTS = {
  primary: 'bg-ink text-white hover:bg-ink/90',
  gold: 'bg-gold text-ink hover:brightness-95',
  ghost: 'border-2 border-ink/15 bg-white text-ink hover:bg-ink/5',
  danger: 'bg-cherry text-white hover:bg-cherry/90',
  soft: 'bg-butter text-ink hover:bg-honey',
  plain: 'bg-transparent text-ink hover:bg-ink/5',
}
const SIZES = { sm: 'h-10 px-3 text-sm', md: 'h-12 px-4 text-base', lg: 'h-14 px-6 text-lg' }

export function Btn({ variant = 'primary', size = 'md', className = '', ...p }) {
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...p}
    />
  )
}

const parse = t => (t === '' || t === '.' ? '' : Number(t))

// Number box that lets people type freely ("12.", "") on phone keypads
export function NumInput({ value, onChange, className = '', placeholder = '0', inputRef, ...rest }) {
  const show = v => (v === '' || v == null ? '' : String(v))
  const [text, setText] = useState(show(value))
  useEffect(() => {
    if (parse(text) !== (value === null || value === undefined ? '' : value)) setText(show(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      placeholder={placeholder}
      onFocus={e => e.target.select()}
      onChange={e => {
        const t = e.target.value.replace(',', '.').replace(/\s/g, '')
        if (!/^\d*\.?\d*$/.test(t)) return
        setText(t)
        onChange(parse(t))
      }}
      className={`${inputCls} tabular ${className}`}
      {...rest}
    />
  )
}

export function GramInput({ className = '', wrapClass = '', ...p }) {
  return (
    <div className={`relative ${wrapClass}`}>
      <NumInput className={`pr-9 text-right font-semibold ${className}`} {...p} />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base font-semibold text-ink/40">g</span>
    </div>
  )
}

export function Select({ className = '', children, ...p }) {
  return (
    <select className={`${inputCls} cursor-pointer appearance-none bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10 ${className}`}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231B1716' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...p}>
      {children}
    </select>
  )
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-ink/60">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-ink/50">{hint}</span>}
    </label>
  )
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return
    const h = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h3 className="font-display text-xl font-extrabold tracking-tight">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full hover:bg-ink/5">
            <X />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

// Four-up calorie / macro tiles
export function MacroTiles({ n, dark = false, big = false, twoCol = false }) {
  const tiles = [
    { label: 'Calories', value: fk(n.kcal), unit: 'kcal' },
    { label: 'Protein', value: f1(n.p), unit: 'g' },
    { label: 'Carbs', value: f1(n.c), unit: 'g' },
    { label: 'Fat', value: f1(n.f), unit: 'g' },
  ]
  return (
    <div className={`grid grid-cols-2 gap-2 ${twoCol ? "" : "sm:grid-cols-4"}`}>
      {tiles.map(t => (
        <div key={t.label} className={`rounded-xl px-3 py-2.5 ${dark ? 'bg-white/10' : 'bg-white/70 ring-1 ring-ink/10'}`}>
          <div className={`text-xs font-bold uppercase tracking-wide ${dark ? 'text-white/60' : 'text-ink/55'}`}>{t.label}</div>
          <div className={`tabular font-display font-extrabold leading-tight ${big ? 'text-3xl' : 'text-2xl'} ${dark ? 'text-gold' : 'text-ink'}`}>
            {t.value}<span className={`ml-1 text-sm font-semibold ${dark ? 'text-white/60' : 'text-ink/50'}`}>{t.unit}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Inline "320 kcal · P 12 · C 40 · F 9"
export function MacroLine({ n, className = '' }) {
  return (
    <div className={`tabular flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm text-ink/70 ${className}`}>
      <span><b className="text-base text-ink">{fk(n.kcal)}</b> kcal</span>
      <span>P <b className="text-ink">{f1(n.p)}</b>g</span>
      <span>C <b className="text-ink">{f1(n.c)}</b>g</span>
      <span>F <b className="text-ink">{f1(n.f)}</b>g</span>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <Card className="py-12 text-center">
      {Icon && <Icon className="mx-auto mb-3 text-gold" size={44} />}
      <h2 className="font-display text-2xl font-extrabold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-ink/60">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  )
}
