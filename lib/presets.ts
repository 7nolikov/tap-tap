import type { Item, Preset, ShareData } from "@/lib/types"

/**
 * Eight evenly-spaced hues, all distinguishable at 12px swatch size, and all scoring
 * ≥4.5:1 against the foreground `readableOn()` picks for them — verified per colour,
 * because a selected tile fills with the raw colour and carries text.
 *
 * `#d97706` was dropped: visually identical to `#f59e0b` in the picker.
 * `#8b5cf6` was dropped: at luminance 0.198 it sits in the dead zone where neither
 * white (4.23:1) nor near-black (4.11:1) reaches AA.
 */
export const PRESET_COLORS = [
  "#3b82f6", // blue     4.73:1
  "#10b981", // emerald  6.86:1
  "#ef4444", // red      4.62:1
  "#f59e0b", // amber    8.10:1
  "#a78bfa", // violet   6.40:1
  "#ec4899", // pink     4.93:1
  "#06b6d4", // cyan     7.17:1
  "#84cc16", // lime     8.81:1
]

/**
 * Bumped whenever `defaultPresets` changes in a way existing users should receive.
 * `lib/storage.ts` uses it to replace untouched defaults without destroying anyone's
 * own presets.
 */
export const DEFAULTS_VERSION = 2

// ─── The dataset ──────────────────────────────────────────────────────────────
//
// Ten shoppers, not sixteen occasions.
//
// An occasion ("BBQ Party") tells you nothing you cannot already see from the item
// names, and sixteen of them are sixteen samples of the same middle. These ten are
// picked to sit at the *edges* of how households actually buy food, so the differences
// between them are large enough to see in a bar chart:
//
//   • spend per person per week runs €22.50 → €110, a 4.9× spread;
//   • household size runs 1 → 5, which is where economies of scale show up;
//   • the split between food and non-food, and between ingredients and convenience,
//     inverts completely from one end of the rail to the other.
//
// The rail is ordered by weekly spend per person, ascending, so scrolling it is itself
// the distribution. The cheapest basket is a four-person houseshare, not a frugal
// single — pooling beats thrift, and the ordering makes that visible without a word of
// explanation.
//
// Density is deliberately uniform: 4 categories, 5–6 items each, 19–23 items total.
// The old data ranged from 12 to 46 items with one category holding 15, which made the
// grid look broken on a phone and made presets impossible to compare.

/**
 * Positional so the data below reads as a table and prices can be scanned down a column.
 * `it(id, name, emoji, unit, cents, trend?)` — cents are baseline euro cents, see
 * `PRICE_BASELINE` in `lib/economics.ts`.
 */
const it = (
  id: string,
  name: string,
  emoji: string,
  unit: string,
  cents: number,
  trend?: "spike",
): Item => ({ id, name, emoji, unit, cents, ...(trend ? { trend } : {}) })

export const defaultPresets: Preset[] = [
  // ── €22.50 / person ────────────────────────────────────────────────────────
  {
    id: "sharehouse",
    name: "🏠 Sharehouse Split",
    persona: {
      who: "Four housemates, one kitty. Buys big, splits four ways.",
      household: 4,
      weeklyBudgetCents: 9000,
    },
    categories: [
      {
        id: "share-staples",
        name: "Bulk Staples",
        color: "#f59e0b",
        items: [
          it("pasta", "Pasta", "🍝", "1 kg", 149),
          it("rice", "White Rice", "🍚", "2 kg", 329),
          it("bread", "Own-Brand Bread", "🍞", "750 g", 129),
          it("oats", "Porridge Oats", "🥣", "1 kg", 179),
          it("oil", "Sunflower Oil", "🫗", "1 L", 219),
          it("salt", "Table Salt", "🧂", "500 g", 49),
        ],
      },
      {
        id: "share-protein",
        name: "Cheap Protein",
        color: "#ef4444",
        items: [
          it("eggs", "Eggs", "🥚", "15-pack", 349, "spike"),
          it("chicken-legs", "Chicken Legs", "🍗", "1 kg", 549),
          it("beans", "Tinned Beans", "🥫", "400 g", 79),
          it("lentils", "Red Lentils", "🫘", "1 kg", 249),
          it("mince", "Frozen Mince", "🥩", "500 g", 399),
          it("fish-fingers", "Fish Fingers", "🐟", "400 g", 279),
        ],
      },
      {
        id: "share-veg",
        name: "Veg That Keeps",
        color: "#10b981",
        items: [
          it("potatoes", "Potatoes", "🥔", "5 kg", 449),
          it("onions", "Onions", "🧅", "1 kg", 129),
          it("carrots", "Carrots", "🥕", "1 kg", 99),
          it("frozen-veg", "Frozen Veg Mix", "🧊", "1 kg", 229),
          it("cabbage", "Cabbage", "🥬", "1 head", 119),
          it("tinned-tom", "Tinned Tomatoes", "🍅", "400 g", 89),
        ],
      },
      {
        id: "share-house",
        name: "House Supplies",
        color: "#3b82f6",
        items: [
          it("toilet-roll", "Toilet Roll", "🧻", "9-pack", 379),
          it("washing-up", "Washing-Up Liquid", "🧴", "500 ml", 129),
          it("bin-bags", "Bin Bags", "🗑️", "30-pack", 219),
          it("sponges", "Dish Sponges", "🧽", "5-pack", 149),
          it("laundry", "Laundry Powder", "🧺", "2 kg", 599),
          it("hand-soap", "Hand Soap", "🧼", "500 ml", 189),
        ],
      },
    ],
  },

  // ── €35.00 / person ────────────────────────────────────────────────────────
  {
    id: "student",
    name: "🎓 Skint Student",
    persona: {
      who: "Last week of the month. Optimising for calories per euro.",
      household: 1,
      weeklyBudgetCents: 3500,
    },
    categories: [
      {
        id: "student-carbs",
        name: "Cheapest Calories",
        color: "#f59e0b",
        items: [
          it("value-pasta", "Value Pasta", "🍝", "500 g", 55),
          it("noodles", "Instant Noodles", "🍜", "5-pack", 149),
          it("rice", "White Rice", "🍚", "1 kg", 169),
          it("bread", "Sliced Bread", "🍞", "800 g", 99),
          it("oats", "Porridge Oats", "🥣", "750 g", 129),
          it("crisps", "Value Crisps", "🥔", "6-pack", 119),
        ],
      },
      {
        id: "student-protein",
        name: "Protein On A Budget",
        color: "#ef4444",
        items: [
          it("eggs", "Eggs", "🥚", "10-pack", 249, "spike"),
          it("beans", "Tinned Beans", "🥫", "400 g", 69),
          it("peanut-butter", "Peanut Butter", "🥜", "350 g", 199),
          it("tuna", "Tinned Tuna", "🐟", "145 g", 129),
          it("frozen-chicken", "Frozen Chicken", "🍗", "1 kg", 599),
          it("value-cheese", "Value Cheese", "🧀", "400 g", 279),
        ],
      },
      {
        id: "student-green",
        name: "Something Green",
        color: "#10b981",
        items: [
          it("frozen-veg", "Frozen Veg Mix", "🧊", "1 kg", 209),
          it("bananas", "Bananas", "🍌", "1 kg", 139),
          it("carrots", "Carrots", "🥕", "1 kg", 99),
          it("onions", "Onions", "🧅", "1 kg", 129),
          it("sweetcorn", "Tinned Sweetcorn", "🌽", "300 g", 79),
          it("peaches", "Tinned Peaches", "🍑", "400 g", 89),
        ],
      },
      {
        id: "student-fuel",
        name: "Fuel",
        color: "#06b6d4",
        items: [
          it("coffee", "Instant Coffee", "☕", "200 g", 429, "spike"),
          it("cola", "Own-Brand Cola", "🥤", "2 L", 89),
          it("tea", "Tea Bags", "🫖", "80-pack", 149),
          it("energy", "Energy Drink", "⚡", "500 ml", 99),
          it("milk", "Milk", "🥛", "1 L", 109),
          it("squash", "Squash Cordial", "🍋", "1 L", 99),
        ],
      },
    ],
  },

  // ── €36.00 / person ────────────────────────────────────────────────────────
  {
    id: "family-batch",
    name: "👨‍👩‍👧‍👦 Family Batch-Cook",
    persona: {
      who: "Five to feed. Cooks Sunday, freezes Monday, repeats.",
      household: 5,
      weeklyBudgetCents: 18000,
    },
    categories: [
      {
        id: "family-meat",
        name: "Bulk Meat",
        color: "#ef4444",
        items: [
          it("mince", "Minced Beef", "🥩", "1 kg", 899),
          it("thighs", "Chicken Thighs", "🍗", "1.5 kg", 749),
          it("pork", "Pork Shoulder", "🥓", "1.5 kg", 999),
          it("sausages", "Sausages", "🌭", "12-pack", 429),
          it("fish", "Frozen Fish Fillets", "🐟", "800 g", 649),
          it("whole-chicken", "Whole Chicken", "🐔", "1.6 kg", 699),
        ],
      },
      {
        id: "family-base",
        name: "Batch Base",
        color: "#f59e0b",
        items: [
          it("passata", "Passata", "🥫", "3 × 500 g", 249),
          it("pasta", "Pasta", "🍝", "3 kg", 379),
          it("rice", "Long-Grain Rice", "🍚", "5 kg", 749),
          it("stock", "Stock Cubes", "🧂", "24-pack", 199),
          it("chickpeas", "Tinned Chickpeas", "🫘", "4 × 400 g", 279),
          it("oil", "Cooking Oil", "🫗", "3 L", 649),
        ],
      },
      {
        id: "family-produce",
        name: "Fresh Produce",
        color: "#10b981",
        items: [
          it("potatoes", "Potatoes", "🥔", "10 kg", 799),
          it("onions", "Onions", "🧅", "3 kg", 249),
          it("carrots", "Carrots", "🥕", "2 kg", 179),
          it("broccoli", "Broccoli", "🥦", "2 heads", 219),
          it("bananas", "Bananas", "🍌", "2 kg", 259),
          it("apples", "Apples", "🍎", "2 kg", 379),
        ],
      },
      {
        id: "family-lunch",
        name: "Lunchboxes",
        color: "#a78bfa",
        items: [
          it("bread", "Sliced Bread", "🍞", "2 × 800 g", 219),
          it("cheese", "Cheese Block", "🧀", "800 g", 649),
          it("yoghurt", "Yoghurt Pots", "🥛", "12-pack", 349),
          it("ham", "Ham Slices", "🍖", "400 g", 399),
          it("fruit-bars", "Fruit Bars", "🍫", "18-pack", 299),
          it("apple-juice", "Apple Juice", "🧃", "2 L", 219),
        ],
      },
    ],
  },

  // ── €45.00 / person ────────────────────────────────────────────────────────
  {
    id: "pensioner",
    name: "👵 Fixed Income",
    persona: {
      who: "State pension, unchanged. Food prices, not unchanged.",
      household: 1,
      weeklyBudgetCents: 4500,
    },
    categories: [
      {
        id: "pension-small",
        name: "Small Portions",
        color: "#f59e0b",
        items: [
          it("loaf", "Small Loaf", "🍞", "400 g", 119),
          it("butter", "Butter", "🧈", "250 g", 269, "spike"),
          it("eggs", "Eggs", "🥚", "6-pack", 179, "spike"),
          it("milk", "Milk", "🥛", "500 ml", 79),
          it("cheese", "Cheese", "🧀", "200 g", 239),
          it("ham", "Sliced Ham", "🍖", "100 g", 149),
        ],
      },
      {
        id: "pension-cupboard",
        name: "Cupboard Standby",
        color: "#3b82f6",
        items: [
          it("soup", "Tinned Soup", "🥫", "400 g", 119),
          it("beans", "Baked Beans", "🫘", "400 g", 89),
          it("salmon", "Tinned Salmon", "🐟", "105 g", 219),
          it("oats", "Porridge Oats", "🥣", "500 g", 99),
          it("marmalade", "Marmalade", "🍯", "340 g", 199),
          it("rice-pudding", "Rice Pudding", "🍚", "400 g", 99),
        ],
      },
      {
        id: "pension-fresh",
        name: "Fresh, But Little",
        color: "#10b981",
        items: [
          it("potatoes", "Potatoes", "🥔", "1 kg", 129),
          it("carrots", "Carrots", "🥕", "500 g", 69),
          it("tomatoes", "Tomatoes", "🍅", "3-pack", 129),
          it("bananas", "Bananas", "🍌", "4-pack", 89),
          it("onion", "Onion", "🧅", "1 pc", 39),
          it("cabbage", "Small Cabbage", "🥬", "1 pc", 99),
        ],
      },
      {
        id: "pension-comfort",
        name: "Small Comforts",
        color: "#ec4899",
        items: [
          it("tea", "Tea Bags", "🫖", "160-pack", 279),
          it("biscuits", "Biscuits", "🍪", "300 g", 149),
          it("sherry", "Sherry", "🍷", "750 ml", 699),
          it("chocolate", "Chocolate Bar", "🍫", "100 g", 179, "spike"),
          it("newspaper", "Newspaper", "📰", "1 pc", 260),
          it("crossword", "Crossword Book", "📖", "1 pc", 349),
        ],
      },
    ],
  },

  // ── €55.00 / person ────────────────────────────────────────────────────────
  {
    id: "minimalist",
    name: "🧘 Solo Minimalist",
    persona: {
      who: "Cooks for one, buys for one. Nothing goes off in this fridge.",
      household: 1,
      weeklyBudgetCents: 5500,
    },
    categories: [
      {
        id: "min-produce",
        name: "Produce, Loose",
        color: "#10b981",
        items: [
          it("spinach", "Spinach", "🥬", "200 g", 149),
          it("courgette", "Courgette", "🥒", "1 pc", 89),
          it("lemon", "Lemon", "🍋", "1 pc", 45),
          it("garlic", "Garlic", "🧄", "1 bulb", 55),
          it("tomatoes", "Tomatoes", "🍅", "400 g", 149),
          it("avocado", "Avocado", "🥑", "1 pc", 129),
        ],
      },
      {
        id: "min-protein",
        name: "Protein",
        color: "#ef4444",
        items: [
          it("eggs", "Eggs", "🥚", "6-pack", 189, "spike"),
          it("tofu", "Tofu", "🧆", "400 g", 239),
          it("yoghurt", "Greek Yoghurt", "🥛", "500 g", 199),
          it("salmon", "Salmon Fillet", "🐟", "200 g", 449),
          it("sardines", "Tinned Sardines", "🐠", "120 g", 179),
          it("white-beans", "White Beans", "🫘", "400 g", 119),
        ],
      },
      {
        id: "min-grains",
        name: "Grains & Oil",
        color: "#f59e0b",
        items: [
          it("rice", "Wholegrain Rice", "🍚", "500 g", 179),
          it("bread", "Rye Bread", "🍞", "500 g", 249),
          it("olive-oil", "Olive Oil", "🫒", "500 ml", 649, "spike"),
          it("oats", "Oats", "🥣", "500 g", 109),
          it("barley", "Pearl Barley", "🌾", "500 g", 129),
          it("salt", "Sea Salt Flakes", "🧂", "250 g", 219),
        ],
      },
      {
        id: "min-weekly",
        name: "Once A Week",
        color: "#a78bfa",
        items: [
          it("coffee", "Ground Coffee", "☕", "250 g", 429, "spike"),
          it("chocolate", "Dark Chocolate", "🍫", "100 g", 219, "spike"),
          it("cheese", "Hard Cheese", "🧀", "150 g", 279),
          it("wine", "Red Wine", "🍷", "750 ml", 799),
          it("flowers", "Flowers", "💐", "1 bunch", 450),
          it("butter", "Salted Butter", "🧈", "250 g", 279, "spike"),
        ],
      },
    ],
  },

  // ── €60.00 / person ────────────────────────────────────────────────────────
  {
    id: "new-parent",
    name: "👶 First-Year Parent",
    persona: {
      who: "Two adults, one baby. Most of this bill is not food.",
      household: 2,
      weeklyBudgetCents: 12000,
    },
    categories: [
      {
        id: "parent-nonfood",
        name: "Baby, Non-Food",
        color: "#a78bfa",
        items: [
          it("nappies", "Nappies", "🧷", "60-pack", 1399),
          it("wipes", "Baby Wipes", "🧻", "12-pack", 899),
          it("cream", "Nappy Cream", "🧴", "125 g", 549),
          it("bath", "Baby Bath Wash", "🛁", "400 ml", 429),
          it("sacks", "Nappy Sacks", "🛍️", "300-pack", 299),
          it("muslins", "Muslin Cloths", "🧣", "6-pack", 799),
        ],
      },
      {
        id: "parent-feeding",
        name: "Feeding",
        color: "#10b981",
        items: [
          it("formula", "Formula", "🍼", "800 g", 1899),
          it("porridge", "Baby Porridge", "🥣", "500 g", 349),
          it("pouches", "Fruit Pouches", "🥭", "6-pack", 449),
          it("rice-cakes", "Baby Rice Cakes", "🍘", "40 g", 179),
          it("bibs", "Bibs", "👕", "3-pack", 599),
          it("sippy-cup", "Sippy Cup", "🥤", "1 pc", 449),
        ],
      },
      {
        id: "parent-adults",
        name: "Adults, One-Handed",
        color: "#f59e0b",
        items: [
          it("bread", "Sliced Bread", "🍞", "800 g", 149),
          it("ready-meals", "Ready Meals", "🍱", "2-pack", 599),
          it("bananas", "Bananas", "🍌", "1 kg", 139),
          it("coffee", "Instant Coffee", "☕", "200 g", 429, "spike"),
          it("cereal-bars", "Cereal Bars", "🍫", "6-pack", 249),
          it("frozen-pizza", "Frozen Pizza", "🍕", "350 g", 299),
        ],
      },
      {
        id: "parent-basics",
        name: "Basics",
        color: "#3b82f6",
        items: [
          it("milk", "Milk", "🥛", "2 L", 199),
          it("eggs", "Eggs", "🥚", "10-pack", 279, "spike"),
          it("pasta", "Pasta", "🍝", "500 g", 89),
          it("passata", "Passata", "🥫", "500 g", 99),
          it("frozen-veg", "Frozen Veg Mix", "🧊", "1 kg", 219),
          it("laundry", "Laundry Liquid", "🧺", "1.5 L", 649),
        ],
      },
    ],
  },

  // ── €65.00 / person ────────────────────────────────────────────────────────
  {
    id: "zero-waste",
    name: "🌱 Zero-Waste Vegan",
    persona: {
      who: "Refill jars and loose produce. Pays more per kilo, throws nothing out.",
      household: 1,
      weeklyBudgetCents: 6500,
    },
    categories: [
      {
        id: "zw-refill",
        name: "Refill Jar",
        color: "#f59e0b",
        items: [
          it("oats", "Rolled Oats", "🥣", "1 kg", 199),
          it("rice", "Brown Rice", "🍚", "1 kg", 289),
          it("pasta", "Wholewheat Pasta", "🍝", "500 g", 139),
          it("seeds", "Sunflower Seeds", "🌻", "250 g", 179),
          it("walnuts", "Walnuts", "🌰", "200 g", 399),
          it("salt", "Sea Salt", "🧂", "500 g", 119),
        ],
      },
      {
        id: "zw-produce",
        name: "Loose Produce",
        color: "#10b981",
        items: [
          it("kale", "Kale", "🥬", "200 g", 179),
          it("sweet-potato", "Sweet Potato", "🍠", "1 kg", 249),
          it("leeks", "Leeks", "🧅", "2 pcs", 159),
          it("apples", "Apples", "🍎", "1 kg", 249),
          it("mushrooms", "Mushrooms", "🍄", "250 g", 199),
          it("lemons", "Lemons", "🍋", "3 pcs", 129),
        ],
      },
      {
        id: "zw-protein",
        name: "Plant Protein",
        color: "#ef4444",
        items: [
          it("tofu", "Firm Tofu", "🧆", "400 g", 259),
          it("lentils", "Red Lentils", "🫘", "500 g", 149),
          it("peanut-butter", "Peanut Butter", "🥜", "350 g", 289),
          it("soy-milk", "Soy Milk", "🥛", "1 L", 149),
          it("hummus", "Hummus", "🥙", "200 g", 189),
          it("chickpeas", "Chickpeas", "🥫", "500 g", 189),
        ],
      },
      {
        id: "zw-flavour",
        name: "Flavour",
        color: "#a78bfa",
        items: [
          it("olive-oil", "Olive Oil", "🫒", "500 ml", 649, "spike"),
          it("yeast-flakes", "Yeast Flakes", "🌾", "125 g", 349),
          it("paprika", "Smoked Paprika", "🌶️", "50 g", 189),
          it("soy-sauce", "Soy Sauce", "🍶", "250 ml", 229),
          it("tahini", "Tahini", "🫙", "300 g", 399),
          it("coriander", "Fresh Coriander", "🌿", "1 bunch", 99),
        ],
      },
    ],
  },

  // ── €75.00 / person ────────────────────────────────────────────────────────
  {
    id: "foodie",
    name: "🍽️ Weekend Foodie",
    persona: {
      who: "Cooks one ambitious meal a week and buys like it.",
      household: 2,
      weeklyBudgetCents: 15000,
    },
    categories: [
      {
        id: "foodie-centre",
        name: "The Centrepiece",
        color: "#ef4444",
        items: [
          it("ribeye", "Dry-Aged Ribeye", "🥩", "500 g", 2299),
          it("duck", "Duck Breast", "🦆", "350 g", 1299),
          it("scallops", "Scallops", "🦪", "200 g", 1499),
          it("turbot", "Turbot Fillet", "🐟", "300 g", 1899),
          it("veal", "Veal Shank", "🍖", "800 g", 1399),
          it("lobster", "Lobster Tail", "🦞", "250 g", 2199),
        ],
      },
      {
        id: "foodie-cheese",
        name: "Cheese Board",
        color: "#f59e0b",
        items: [
          it("comte", "Comté 24-Month", "🧀", "200 g", 899),
          it("washed-rind", "Washed-Rind", "🫕", "250 g", 749),
          it("quince", "Quince Paste", "🍐", "200 g", 449),
          it("walnut-bread", "Walnut Bread", "🥖", "400 g", 379),
          it("fig-jam", "Fig Jam", "🍯", "220 g", 499),
          it("cured-ham", "Cured Ham", "🥓", "100 g", 899),
        ],
      },
      {
        id: "foodie-market",
        name: "Market Produce",
        color: "#10b981",
        items: [
          it("tomatoes", "Heritage Tomatoes", "🍅", "500 g", 549),
          it("asparagus", "White Asparagus", "🌱", "500 g", 799),
          it("girolles", "Girolle Mushrooms", "🍄", "150 g", 899),
          it("grapes", "Black Grapes", "🍇", "500 g", 429),
          it("basil", "Fresh Basil", "🌿", "1 pot", 199),
          it("shallots", "Shallots", "🧅", "500 g", 249),
        ],
      },
      {
        id: "foodie-cellar",
        name: "Cellar",
        color: "#a78bfa",
        items: [
          it("rhone", "Côtes du Rhône", "🍷", "750 ml", 1499),
          it("champagne", "Champagne", "🥂", "750 ml", 3499),
          it("craft-lager", "Craft Lager", "🍺", "4-pack", 799),
          it("coffee", "Single-Estate Beans", "☕", "250 g", 1099, "spike"),
          it("chocolate", "Dark Chocolate 85%", "🍫", "100 g", 449, "spike"),
          it("armagnac", "Armagnac", "🥃", "500 ml", 2899),
        ],
      },
    ],
  },

  // ── €95.00 / person ────────────────────────────────────────────────────────
  {
    id: "athlete",
    name: "🏋️ Macro Athlete",
    persona: {
      who: "Weighs everything. Protein is the budget; the rest is rounding.",
      household: 1,
      weeklyBudgetCents: 9500,
    },
    categories: [
      {
        id: "ath-protein",
        name: "Protein",
        color: "#ef4444",
        items: [
          it("chicken", "Chicken Breast", "🍗", "1 kg", 999),
          it("beef", "Lean Beef Mince", "🥩", "500 g", 649),
          it("egg-whites", "Egg Whites", "🥚", "1 kg", 599),
          it("skyr", "Skyr", "🥛", "1 kg", 449),
          it("cod", "Cod Fillet", "🐟", "400 g", 599),
          it("whey", "Whey Isolate", "🥤", "1 kg", 3299),
        ],
      },
      {
        id: "ath-carbs",
        name: "Carbs, Weighed",
        color: "#f59e0b",
        items: [
          it("basmati", "Basmati Rice", "🍚", "2 kg", 449),
          it("oats", "Rolled Oats", "🥣", "1 kg", 189),
          it("sweet-potato", "Sweet Potato", "🍠", "1 kg", 239),
          it("rice-cakes", "Rice Cakes", "🍘", "130 g", 129),
          it("bananas", "Bananas", "🍌", "1 kg", 139),
          it("bagels", "Wholegrain Bagels", "🥯", "5-pack", 219),
        ],
      },
      {
        id: "ath-micros",
        name: "Micros",
        color: "#10b981",
        items: [
          it("broccoli", "Broccoli", "🥦", "500 g", 179),
          it("spinach", "Baby Spinach", "🥬", "300 g", 249),
          it("peppers", "Bell Peppers", "🫑", "3-pack", 279),
          it("blueberries", "Blueberries", "🫐", "300 g", 349),
          it("asparagus", "Asparagus", "🌱", "250 g", 349),
          it("cherry-tom", "Cherry Tomatoes", "🍅", "250 g", 199),
        ],
      },
      {
        id: "ath-supps",
        name: "Supplements",
        color: "#a78bfa",
        items: [
          it("creatine", "Creatine", "💊", "500 g", 1899),
          it("electrolytes", "Electrolyte Tabs", "⚡", "20-pack", 899),
          it("omega-3", "Omega-3", "🐠", "120 caps", 1699),
          it("vitamin-d", "Vitamin D3", "☀️", "90 caps", 699),
          it("magnesium", "Magnesium", "🫙", "120 caps", 1099),
          it("caffeine", "Caffeine Tabs", "☕", "100-pack", 599),
        ],
      },
    ],
  },

  // ── €110.00 / person ───────────────────────────────────────────────────────
  {
    id: "time-poor",
    name: "⏱️ Time-Poor Pro",
    persona: {
      who: "Buys back an hour a day. Every item here is pre-assembled.",
      household: 1,
      weeklyBudgetCents: 11000,
    },
    categories: [
      {
        id: "tp-dinner",
        name: "Dinner, Solved",
        color: "#ef4444",
        items: [
          it("ready-meal", "Chilled Ready Meal", "🍱", "400 g", 549),
          it("meal-kit", "Meal Kit Box", "📦", "2 servings", 1699),
          it("filled-pasta", "Fresh Filled Pasta", "🥟", "250 g", 399),
          it("stir-fry", "Stir-Fry Kit", "🍜", "350 g", 349),
          it("pizza", "Wood-Fired Pizza", "🍕", "450 g", 599),
          it("rotisserie", "Rotisserie Chicken", "🐔", "1 pc", 749),
        ],
      },
      {
        id: "tp-lunch",
        name: "Desk Lunch",
        color: "#f59e0b",
        items: [
          it("sandwich", "Pre-Made Sandwich", "🥪", "1 pc", 429),
          it("sushi", "Sushi Box", "🍣", "250 g", 799),
          it("protein-pot", "Protein Pot", "🥗", "200 g", 349),
          it("soup", "Soup Cup", "🍲", "400 ml", 329),
          it("fruit-pot", "Fruit Pot", "🍓", "200 g", 299),
          it("wrap", "Chicken Wrap", "🌯", "1 pc", 399),
        ],
      },
      {
        id: "tp-assembled",
        name: "Assembled, Not Cooked",
        color: "#10b981",
        items: [
          it("salad-bag", "Washed Salad Bag", "🥬", "150 g", 199),
          it("pre-cut-veg", "Pre-Cut Veg", "🥕", "400 g", 299),
          it("cherry-tom", "Cherry Tomatoes", "🍅", "250 g", 219),
          it("grated-cheese", "Grated Cheese", "🧀", "200 g", 279),
          it("cooked-chicken", "Cooked Chicken", "🍗", "160 g", 399),
          it("hummus", "Hummus Pot", "🥙", "200 g", 189),
        ],
      },
      {
        id: "tp-caffeine",
        name: "Caffeine & Recovery",
        color: "#06b6d4",
        items: [
          it("pods", "Coffee Pods", "☕", "30-pack", 899, "spike"),
          it("oat-milk", "Oat Milk", "🥛", "1 L", 189),
          it("water", "Sparkling Water", "💧", "6 × 1 L", 349),
          it("beer", "Craft Beer", "🍺", "4-pack", 749),
          it("chocolate", "Dark Chocolate", "🍫", "90 g", 249, "spike"),
          it("kombucha", "Kombucha", "🧋", "750 ml", 399),
        ],
      },
    ],
  },
]

/**
 * Shown to first-time visitors so they experience a *received* list before building one.
 *
 * A partial family shop: enough items to fill the panel, and lopsided enough that the
 * cost view immediately disagrees with the count view — two packs of mince are 15 % of
 * the items and 30 % of the money, which is the whole argument for the cost toggle.
 */
export const DEMO_LIST: ShareData = {
  n: "👨‍👩‍👧‍👦 Family Batch-Cook",
  i: [
    { c: "Bulk Meat", e: "🥩", l: "Minced Beef", q: 2, k: "#ef4444", p: 899, u: "1 kg" },
    { c: "Bulk Meat", e: "🍗", l: "Chicken Thighs", q: 1, k: "#ef4444", p: 749, u: "1.5 kg" },
    { c: "Batch Base", e: "🥫", l: "Passata", q: 2, k: "#f59e0b", p: 249, u: "3 × 500 g" },
    { c: "Batch Base", e: "🍝", l: "Pasta", q: 1, k: "#f59e0b", p: 379, u: "3 kg" },
    { c: "Fresh Produce", e: "🥔", l: "Potatoes", q: 1, k: "#10b981", p: 799, u: "10 kg" },
    { c: "Fresh Produce", e: "🧅", l: "Onions", q: 1, k: "#10b981", p: 249, u: "3 kg" },
    { c: "Fresh Produce", e: "🥕", l: "Carrots", q: 1, k: "#10b981", p: 179, u: "2 kg" },
    { c: "Lunchboxes", e: "🍞", l: "Sliced Bread", q: 2, k: "#a78bfa", p: 219, u: "2 × 800 g" },
    { c: "Lunchboxes", e: "🧀", l: "Cheese Block", q: 1, k: "#a78bfa", p: 649, u: "800 g" },
    { c: "Lunchboxes", e: "🥛", l: "Yoghurt Pots", q: 1, k: "#a78bfa", p: 349, u: "12-pack" },
  ],
}
