// Nutrition values are per 100 g RAW (as weighed before cooking).
// Sources: USDA FoodData Central (SR Legacy) and the West African Food Composition Table (FAO/INFOODS 2019).
// Values marked "approx." are typical averages — edit them in "Ingredients" if your supplier's label differs.

export const GROUPS = ['Starch', 'Protein', 'Fat & Oil', 'Vegetable', 'Other']
export const CATEGORIES = ['Starch', 'Protein', 'Stew/Sauce']

const I = (id, name, group, kcal, p, c, f) => ({ id, name, group, kcal, p, c, f, builtin: true })

export const DEFAULT_INGREDIENTS = [
  // Starches
  I('rice-perfumed', 'Jasmine / Perfumed Rice (raw)', 'Starch', 365, 7.1, 80.0, 0.7),
  I('rice-brown', 'Brown Rice (raw)', 'Starch', 370, 7.9, 77.2, 2.9),
  I('yam', 'Yam (raw)', 'Starch', 118, 1.5, 27.9, 0.2),
  I('plantain-ripe', 'Ripe Plantain (raw)', 'Starch', 122, 1.3, 31.9, 0.4),
  I('plantain-unripe', 'Unripe Plantain (raw)', 'Starch', 152, 1.3, 36.7, 0.1),
  I('gari', 'Gari', 'Starch', 357, 1.0, 87.0, 0.5),
  I('corn-dough', 'Banku Mix / Corn Dough (fermented, wet)', 'Starch', 190, 4.5, 39.5, 1.8), // approx.
  I('cassava-dough', 'Cassava Dough (fermented, wet)', 'Starch', 175, 0.8, 42.0, 0.3), // approx.
  I('beans-bep', 'Beans – Black-eyed Peas (dry, raw)', 'Starch', 336, 23.5, 60.0, 1.3),
  I('sweet-potato', 'Sweet Potato (raw)', 'Starch', 86, 1.6, 20.1, 0.1),
  I('millet', 'Millet (raw)', 'Starch', 378, 11.0, 72.8, 4.2),
  I('sorghum', 'Sorghum (raw)', 'Starch', 329, 10.6, 72.1, 3.5),
  I('waakye-leaves', 'Waakye Leaves (dried sorghum leaves)', 'Other', 25, 1.0, 5.0, 0.2), // approx. — used for colour, negligible

  // Proteins
  I('chicken-breast', 'Chicken Breast (raw, skinless)', 'Protein', 120, 22.5, 0, 2.6),
  I('chicken-thigh', 'Chicken Thigh (raw, boneless, skinless)', 'Protein', 121, 19.7, 0, 4.1),
  I('tilapia', 'Tilapia Fillet (raw)', 'Protein', 96, 20.1, 0, 1.7),
  I('mackerel', 'Mackerel / Titus (raw)', 'Protein', 205, 18.6, 0, 13.9),
  I('beef-lean', 'Lean Beef (raw)', 'Protein', 137, 21.4, 0, 5.0),
  I('goat', 'Goat Meat (raw)', 'Protein', 109, 20.6, 0, 2.3),
  I('egg-whole', 'Whole Egg (raw)', 'Protein', 143, 12.6, 0.7, 9.5),
  I('egg-white', 'Egg Whites (raw)', 'Protein', 52, 10.9, 0.7, 0.2),

  // Fats & oils
  I('palm-oil', 'Palm Oil', 'Fat & Oil', 884, 0, 0, 100),
  I('veg-oil', 'Vegetable / Cooking Oil (Frytol)', 'Fat & Oil', 884, 0, 0, 100),
  I('groundnut-paste', 'Groundnut Paste (Peanut Butter)', 'Fat & Oil', 588, 25.1, 19.6, 50.4),
  I('agushie', 'Agushie (Melon seeds, ground)', 'Fat & Oil', 557, 28.3, 15.3, 47.4),
  I('coconut-oil', 'Coconut Oil', 'Fat & Oil', 892, 0, 0, 99.1),

  // Vegetables & aromatics
  I('tomato', 'Fresh Tomatoes', 'Vegetable', 18, 0.9, 3.9, 0.2),
  I('onion-red', 'Red Onions', 'Vegetable', 40, 1.1, 9.3, 0.1),
  I('tomato-paste', 'Tomato Paste (tin)', 'Vegetable', 82, 4.3, 18.9, 0.5),
  I('scotch-bonnet', 'Scotch Bonnet Pepper', 'Vegetable', 40, 1.9, 8.8, 0.4),
  I('kontomire', 'Kontomire (Cocoyam leaves)', 'Vegetable', 42, 5.0, 6.7, 0.7),
  I('garden-egg', 'Garden Eggs', 'Vegetable', 25, 1.0, 5.9, 0.2),
  I('okro', 'Okro', 'Vegetable', 33, 1.9, 7.5, 0.2),
  I('cabbage', 'Cabbage', 'Vegetable', 25, 1.3, 5.8, 0.1),
  I('carrot', 'Carrots', 'Vegetable', 41, 0.9, 9.6, 0.2),
  I('ginger', 'Ginger', 'Vegetable', 80, 1.8, 17.8, 0.8),
  I('garlic', 'Garlic', 'Vegetable', 149, 6.4, 33.1, 0.5),
]

const T = (id, name, category, items) => ({ id, name, category, items: items.map(([ingId, grams]) => ({ ingId, grams })) })

// Starter raw weights for a typical batch pot — edit them to match your scale.
export const TEMPLATES = [
  T('jollof', 'Ghanaian Jollof Rice', 'Starch', [
    ['rice-perfumed', 1000], ['tomato', 600], ['onion-red', 300], ['tomato-paste', 140],
    ['veg-oil', 120], ['ginger', 30], ['garlic', 25], ['scotch-bonnet', 15],
  ]),
  T('waakye', 'Waakye (Rice & Beans)', 'Starch', [['rice-perfumed', 1000], ['beans-bep', 400]]),
  T('red-red', 'Red-Red (Beans Stew)', 'Stew/Sauce', [
    ['beans-bep', 800], ['palm-oil', 150], ['tomato', 500], ['onion-red', 250], ['ginger', 20], ['scotch-bonnet', 10],
  ]),
  T('kontomire', 'Kontomire Stew (Palava Sauce)', 'Stew/Sauce', [
    ['kontomire', 1000], ['agushie', 150], ['palm-oil', 120], ['tomato', 400], ['onion-red', 200], ['mackerel', 300],
  ]),
  T('groundnut', 'Groundnut Soup (Base)', 'Stew/Sauce', [
    ['groundnut-paste', 300], ['tomato', 500], ['onion-red', 200], ['tomato-paste', 70], ['ginger', 20], ['garlic', 15],
  ]),
  T('light-soup', 'Light Soup (Base)', 'Stew/Sauce', [
    ['tomato', 800], ['onion-red', 200], ['garden-egg', 400], ['scotch-bonnet', 15], ['ginger', 25], ['garlic', 15],
  ]),
  T('okro', 'Okro Stew', 'Stew/Sauce', [
    ['okro', 600], ['palm-oil', 100], ['tomato', 400], ['onion-red', 200], ['scotch-bonnet', 10],
  ]),
  T('banku', 'Banku', 'Starch', [['corn-dough', 1500], ['cassava-dough', 500]]),
  T('ampesi', 'Boiled Yam / Ampesi', 'Starch', [['yam', 2000]]),
  T('plantain', 'Baked / Air-Fried Ripe Plantain', 'Starch', [['plantain-ripe', 1500], ['veg-oil', 30]]),
  T('grilled-chicken', 'Grilled Chicken Breast', 'Protein', [
    ['chicken-breast', 2000], ['veg-oil', 30], ['ginger', 30], ['garlic', 30], ['onion-red', 100],
  ]),
]

// Box colours for the packing cheat sheet
export const BOX_COLORS = [
  { id: 'green', label: 'Green', bg: '#15803d', fg: '#ffffff' },
  { id: 'yellow', label: 'Yellow', bg: '#F7B500', fg: '#1B1716' },
  { id: 'red', label: 'Red', bg: '#C8102E', fg: '#ffffff' },
  { id: 'blue', label: 'Blue', bg: '#1d4ed8', fg: '#ffffff' },
  { id: 'purple', label: 'Purple', bg: '#7e22ce', fg: '#ffffff' },
  { id: 'orange', label: 'Orange', bg: '#ea580c', fg: '#ffffff' },
  { id: 'black', label: 'Black', bg: '#1B1716', fg: '#ffffff' },
  { id: 'white', label: 'White', bg: '#ffffff', fg: '#1B1716' },
]
export const boxColor = id => BOX_COLORS.find(c => c.id === id) || BOX_COLORS[0]

// Starting cooked portions (g) per tier when you first pick a dish
export const DEFAULT_PORTIONS = {
  lean: { Starch: 120, Protein: 120, 'Stew/Sauce': 20 },
  balance: { Starch: 170, Protein: 150, 'Stew/Sauce': 25 },
  build: { Starch: 250, Protein: 200, 'Stew/Sauce': 30 },
  custom: { Starch: 150, Protein: 150, 'Stew/Sauce': 25 },
}
