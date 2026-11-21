// Builds public/usda-sr-legacy.json from the USDA FoodData Central "SR Legacy" CSV download.
// Data: https://fdc.nal.usda.gov/download-datasets (public domain, CC0).
// Usage: node scripts/build-usda.mjs <path-to-unzipped-FoodData_Central_sr_legacy_food_csv folder>
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

const dir = process.argv[2]
if (!dir) { console.error('Pass the unzipped SR Legacy CSV folder'); process.exit(1) }

function parseLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') q = false
      else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}
async function eachRow(file, fn) {
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, file)), crlfDelay: Infinity })
  let header = null
  for await (const line of rl) {
    if (!line) continue
    const cols = parseLine(line)
    if (!header) { header = cols; continue }
    fn(Object.fromEntries(header.map((h, i) => [h, cols[i]])))
  }
}

// USDA food category id -> KitchenMacro group
const GROUP = {
  1: 'Protein', 5: 'Protein', 7: 'Protein', 10: 'Protein', 13: 'Protein', 15: 'Protein', 17: 'Protein',
  4: 'Fat & Oil', 12: 'Fat & Oil',
  8: 'Starch', 16: 'Starch', 18: 'Starch', 20: 'Starch',
  2: 'Vegetable', 11: 'Vegetable',
}
const SKIP = new Set(['3', '24', '26', '27']) // baby food, regional US native foods, branded, QC samples
const GROUPS = ['Starch', 'Protein', 'Fat & Oil', 'Vegetable', 'Other']
const NUT = { 1008: 'kcal', 1003: 'p', 1005: 'c', 1004: 'f' }

const foods = new Map()
await eachRow('food.csv', r => {
  if (SKIP.has(r.food_category_id)) return
  foods.set(r.fdc_id, { id: Number(r.fdc_id), name: r.description, g: GROUPS.indexOf(GROUP[r.food_category_id] || 'Other') })
})
await eachRow('food_nutrient.csv', r => {
  const k = NUT[r.nutrient_id]
  const f = k && foods.get(r.fdc_id)
  if (f) f[k] = Number(r.amount)
})

const r1 = n => Math.round((n || 0) * 10) / 10
const rows = []
for (const f of foods.values()) {
  if (f.p == null && f.c == null && f.f == null) continue
  const kcal = f.kcal ?? (f.p || 0) * 4 + (f.c || 0) * 4 + (f.f || 0) * 9
  rows.push([f.id, f.name, f.g, Math.round(kcal), r1(f.p), r1(f.c), r1(f.f)])
}
rows.sort((a, b) => a[1].localeCompare(b[1]))

const out = {
  source: 'USDA FoodData Central – SR Legacy (April 2018). Public domain. Values per 100 g.',
  groups: GROUPS,
  fields: ['fdcId', 'name', 'group', 'kcal', 'protein', 'carbs', 'fat'],
  foods: rows,
}
const dest = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'public', 'usda-sr-legacy.json')
fs.writeFileSync(dest, JSON.stringify(out))
console.log(`Wrote ${rows.length} foods -> ${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB)`)
