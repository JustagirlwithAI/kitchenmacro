# KitchenMacro

Batch-cooking macro calculator for Ghanaian meal prep. Raw pot → cooked macros per 100 g → portions per plan → daily prep sheet.

**Live app:** https://justagirlwithai.github.io/kitchenmacro/

To publish changes: commit and push to `main`, then run `npm run deploy`. It builds the app and pushes it to the `gh-pages` branch, and the site updates within about a minute.

## Run it locally

```powershell
cd lako-prep\kitchenmacro
npm install      # first time only
npm run dev
```

Vite prints two addresses:

- **Local:** `http://localhost:5173` — open on this computer
- **Network:** `http://192.168.x.x:5173` — type this into your phone/tablet browser (same Wi-Fi)

If the phone can't connect, allow Node.js through Windows Firewall on **Private networks** (Windows asks the first time).

## Your data

- Everything saves automatically in the browser you're using (`localStorage`). No account, no server.
- **Each device keeps its own copy.** Use **Backup → Export** on one device and **Import** on another to move recipes across.
- Export a backup now and then so you never lose your dishes.

## How it works

1. **Recipe & Yield** — load a template or start blank, type raw grams from the scale, enter the cooked weight (pot weight subtracted). You get calories/protein/carbs/fat per 100 g cooked. Save the dish to your menu.
2. **Meal Builder & Tiers** — combine saved dishes, set cooked grams per plan (Lean / Balance / Build / custom), or type a calorie target and tap **Auto-fit**. Copy or print the nutrition label.
3. **Daily Prep Sheet** — choose a saved meal, enter today's box counts. Get total cooked grams, scaled raw ingredients to weigh out, and a packing cheat sheet. Print it for the kitchen wall.

## Food lookup (free)

- **Built-in list:** about 7,300 USDA foods (`public/usda-sr-legacy.json`, public domain). It works offline and needs no key. Type any food in the search bar and tap a USDA result to add it. New ingredients also fill in their numbers automatically as you type the name.
- **Online search (incl. brands):** in the Add New Ingredient box. It uses the shared `DEMO_KEY` (about 10 searches an hour) until you paste a free personal key from https://fdc.nal.usda.gov/api-key-signup (about 1,000 an hour).
- To rebuild the list from a newer USDA download, run `node scripts/build-usda.mjs <unzipped SR Legacy CSV folder>`.

Ingredient values are per 100 g raw (USDA FoodData Central / West African Food Composition Table). Corn dough, cassava dough and waakye leaves are typical averages: edit them under **Ingredients** if your supplier differs.
