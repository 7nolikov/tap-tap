import type { Preset, ShareData } from "@/lib/types"

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

/** Shown to first-time visitors so they experience a received list before building one. */
export const DEMO_LIST: ShareData = {
  n: "Christmas Dinner",
  i: [
    { c: "The Main Event", e: "🦃", l: "Whole Turkey", q: 1, k: "#ef4444" },
    { c: "The Main Event", e: "🥓", l: "Streaky Bacon", q: 2, k: "#ef4444" },
    { c: "The Main Event", e: "🍗", l: "Pigs in Blankets", q: 1, k: "#ef4444" },
    { c: "Vegetables", e: "🥕", l: "Carrots", q: 1, k: "#10b981" },
    { c: "Vegetables", e: "🥦", l: "Brussels Sprouts", q: 1, k: "#10b981" },
    { c: "Vegetables", e: "🥔", l: "Roasting Potatoes", q: 2, k: "#10b981" },
    { c: "Stuffing & Gravy", e: "🌿", l: "Sage & Onion Stuffing", q: 1, k: "#f59e0b" },
    { c: "Stuffing & Gravy", e: "🫙", l: "Gravy Granules", q: 1, k: "#f59e0b" },
    { c: "Dessert", e: "🎂", l: "Christmas Pudding", q: 1, k: "#a78bfa" },
    { c: "Dessert", e: "🍦", l: "Brandy Butter", q: 1, k: "#a78bfa" },
  ],
}

export const defaultPresets: Preset[] = [
  {
    id: "grocery-shopping",
    name: "🛒 Grocery Shopping",
    categories: [
      {
        id: "dairy",
        name: "Dairy & Eggs",
        color: "#3b82f6",
        items: [
          { id: "milk", name: "Milk", emoji: "🥛" },
          { id: "cheese", name: "Cheddar Cheese", emoji: "🧀" },
          { id: "eggs", name: "Eggs", emoji: "🥚" },
          { id: "butter", name: "Butter", emoji: "🧈" },
          { id: "creme-fraiche", name: "Crème Fraîche", emoji: "🥛" },
          { id: "quark", name: "Quark", emoji: "🫙" },
          { id: "yogurt", name: "Natural Yogurt", emoji: "🍶" },
          { id: "double-cream", name: "Double Cream", emoji: "🥛" },
        ],
      },
      {
        id: "produce",
        name: "Fruits & Vegetables",
        color: "#10b981",
        items: [
          { id: "apples", name: "Apples", emoji: "🍎" },
          { id: "carrots", name: "Carrots", emoji: "🥕" },
          { id: "courgette", name: "Courgette", emoji: "🥒" },
          { id: "potatoes", name: "Potatoes", emoji: "🥔" },
          { id: "tomatoes", name: "Tomatoes", emoji: "🍅" },
          { id: "leeks", name: "Leeks", emoji: "🌿" },
          { id: "onions", name: "Onions", emoji: "🧅" },
          { id: "mushrooms", name: "Mushrooms", emoji: "🍄" },
          { id: "broccoli", name: "Broccoli", emoji: "🥦" },
          { id: "garlic", name: "Garlic", emoji: "🧄" },
          { id: "oranges", name: "Oranges", emoji: "🍊" },
          { id: "lemons", name: "Lemons", emoji: "🍋" },
          { id: "bell-peppers", name: "Bell Peppers", emoji: "🫑" },
          { id: "spinach", name: "Spinach", emoji: "🥬" },
          { id: "avocado", name: "Avocado", emoji: "🥑" },
        ],
      },
      {
        id: "meat",
        name: "Meat & Seafood",
        color: "#ef4444",
        items: [
          { id: "chicken", name: "Chicken Thighs", emoji: "🍗" },
          { id: "pork-sausages", name: "Pork Sausages", emoji: "🌭" },
          { id: "bacon", name: "Bacon Rashers", emoji: "🥓" },
          { id: "minced-beef", name: "Minced Beef", emoji: "🥩" },
          { id: "cod", name: "Cod Fillet", emoji: "🐟" },
          { id: "smoked-salmon", name: "Smoked Salmon", emoji: "🐠" },
        ],
      },
      {
        id: "bakery",
        name: "Bakery & Bread",
        color: "#f59e0b",
        items: [
          { id: "baguette", name: "Baguette", emoji: "🥖" },
          { id: "sourdough", name: "Sourdough Loaf", emoji: "🍞" },
          { id: "croissants", name: "Croissants", emoji: "🥐" },
          { id: "wholemeal-bread", name: "Wholemeal Bread", emoji: "🍞" },
        ],
      },
      {
        id: "cupboard",
        name: "Cupboard Essentials",
        color: "#a78bfa",
        items: [
          { id: "passata", name: "Passata", emoji: "🫙" },
          { id: "tinned-tomatoes", name: "Tinned Tomatoes", emoji: "🥫" },
          { id: "olive-oil", name: "Extra Virgin Olive Oil", emoji: "🫒" },
          { id: "pasta", name: "Pasta", emoji: "🍝" },
          { id: "rice", name: "Rice", emoji: "🍚" },
          { id: "dijon-mustard", name: "Dijon Mustard", emoji: "🫙" },
          { id: "balsamic", name: "Balsamic Vinegar", emoji: "🍶" },
          { id: "sugar", name: "Sugar", emoji: "🫙" },
          { id: "plain-flour", name: "Plain Flour", emoji: "🌾" },
        ],
      },
      {
        id: "drinks",
        name: "Drinks",
        color: "#06b6d4",
        items: [
          { id: "oj", name: "Orange Juice", emoji: "🍊" },
          { id: "sparkling-water", name: "Sparkling Water", emoji: "💧" },
          { id: "tea-bags", name: "Tea Bags", emoji: "🫖" },
          { id: "coffee", name: "Ground Coffee", emoji: "☕" },
        ],
      },
    ],
  },
  {
    id: "bbq-party",
    name: "🔥 BBQ Party",
    categories: [
      {
        id: "bbq-meat",
        name: "Meats & Grills",
        color: "#ef4444",
        items: [
          { id: "merguez", name: "Merguez Sausages", emoji: "🌭" },
          { id: "lamb-koftas", name: "Lamb Koftas", emoji: "🥙" },
          { id: "chicken-thighs", name: "Chicken Thighs", emoji: "🍗" },
          { id: "halloumi", name: "Halloumi", emoji: "🧀" },
          { id: "pork-ribs", name: "Pork Ribs", emoji: "🥩" },
          { id: "burger-patties", name: "Burger Patties", emoji: "🍔" },
        ],
      },
      {
        id: "bbq-sides",
        name: "Sides & Salads",
        color: "#10b981",
        items: [
          { id: "pitta", name: "Pitta Bread", emoji: "🫓" },
          { id: "couscous", name: "Couscous", emoji: "🍚" },
          { id: "roasted-peppers", name: "Roasted Peppers", emoji: "🫑" },
          { id: "corn", name: "Corn on the Cob", emoji: "🌽" },
          { id: "coleslaw", name: "Coleslaw", emoji: "🥗" },
          { id: "potato-salad", name: "Potato Salad", emoji: "🥔" },
        ],
      },
      {
        id: "bbq-sauces",
        name: "Dips & Sauces",
        color: "#f59e0b",
        items: [
          { id: "harissa", name: "Harissa Paste", emoji: "🌶️" },
          { id: "tzatziki", name: "Tzatziki", emoji: "🥒" },
          { id: "hummus", name: "Hummus", emoji: "🫘" },
          { id: "chimichurri", name: "Chimichurri", emoji: "🌿" },
          { id: "bbq-sauce", name: "BBQ Sauce", emoji: "🫙" },
        ],
      },
      {
        id: "bbq-drinks",
        name: "Drinks",
        color: "#a78bfa",
        items: [
          { id: "rose-wine", name: "Rosé Wine", emoji: "🍷" },
          { id: "cider", name: "Cider", emoji: "🍺" },
          { id: "lager", name: "Lager", emoji: "🍻" },
          { id: "sparkling-water", name: "Sparkling Water", emoji: "💧" },
        ],
      },
    ],
  },
  {
    id: "camping-trip",
    name: "⛺ Camping Trip",
    categories: [
      {
        id: "camp-food",
        name: "Camp Food",
        color: "#f59e0b",
        items: [
          { id: "porridge-oats", name: "Porridge Oats", emoji: "🥣" },
          { id: "instant-noodles", name: "Instant Noodles", emoji: "🍜" },
          { id: "tinned-beans", name: "Tinned Beans", emoji: "🥫" },
          { id: "crackers", name: "Crackers", emoji: "🍘" },
          { id: "trail-mix", name: "Trail Mix", emoji: "🥜" },
          { id: "dried-fruit", name: "Dried Fruit", emoji: "🍇" },
          { id: "peanut-butter", name: "Peanut Butter", emoji: "🥜" },
          { id: "tinned-fish", name: "Tinned Fish", emoji: "🐟" },
        ],
      },
      {
        id: "camp-drinks",
        name: "Drinks",
        color: "#06b6d4",
        items: [
          { id: "instant-coffee", name: "Instant Coffee", emoji: "☕" },
          { id: "herbal-tea", name: "Herbal Tea", emoji: "🫖" },
          { id: "squash", name: "Squash Concentrate", emoji: "🍋" },
          { id: "water", name: "Water Bottles", emoji: "💧" },
        ],
      },
      {
        id: "camp-supplies",
        name: "Camp Supplies",
        color: "#10b981",
        items: [
          { id: "firelighters", name: "Firelighters", emoji: "🔥" },
          { id: "foil", name: "Cooking Foil", emoji: "🫙" },
          { id: "matches", name: "Matches", emoji: "🔥" },
          { id: "zip-bags", name: "Zip-Lock Bags", emoji: "🛍️" },
          { id: "gas-canisters", name: "Gas Canisters", emoji: "⛽" },
          { id: "bin-bags", name: "Bin Bags", emoji: "🗑️" },
        ],
      },
    ],
  },
  {
    id: "weekly-meal-prep",
    name: "🥗 Weekly Meal Prep",
    categories: [
      {
        id: "meal-prep-proteins",
        name: "Proteins",
        color: "#ef4444",
        items: [
          { id: "chicken-breast", name: "Chicken Breast", emoji: "🍗" },
          { id: "eggs", name: "Eggs", emoji: "🥚" },
          { id: "tuna", name: "Tinned Tuna", emoji: "🐟" },
          { id: "tofu", name: "Firm Tofu", emoji: "🫘" },
          { id: "quark", name: "Quark", emoji: "🫙" },
          { id: "skyr", name: "Skyr", emoji: "🍶" },
        ],
      },
      {
        id: "meal-prep-carbs",
        name: "Grains & Carbs",
        color: "#f59e0b",
        items: [
          { id: "brown-rice", name: "Brown Rice", emoji: "🍚" },
          { id: "quinoa", name: "Quinoa", emoji: "🌾" },
          { id: "bulgur", name: "Bulgur Wheat", emoji: "🌾" },
          { id: "wholemeal-pasta", name: "Wholemeal Pasta", emoji: "🍝" },
          { id: "oats", name: "Rolled Oats", emoji: "🥣" },
        ],
      },
      {
        id: "meal-prep-veggies",
        name: "Vegetables",
        color: "#10b981",
        items: [
          { id: "broccoli", name: "Broccoli", emoji: "🥦" },
          { id: "sweet-potatoes", name: "Sweet Potatoes", emoji: "🍠" },
          { id: "courgette", name: "Courgette", emoji: "🥒" },
          { id: "spinach", name: "Baby Spinach", emoji: "🥬" },
          { id: "cherry-tomatoes", name: "Cherry Tomatoes", emoji: "🍅" },
          { id: "celeriac", name: "Celeriac", emoji: "🥔" },
        ],
      },
      {
        id: "meal-prep-extras",
        name: "Healthy Extras",
        color: "#a78bfa",
        items: [
          { id: "olive-oil", name: "Olive Oil", emoji: "🫒" },
          { id: "mixed-herbs", name: "Mixed Herbs", emoji: "🌿" },
          { id: "lemons", name: "Lemons", emoji: "🍋" },
          { id: "avocado", name: "Avocados", emoji: "🥑" },
        ],
      },
    ],
  },
  {
    id: "pizza-night",
    name: "🍕 Pizza Night",
    categories: [
      {
        id: "pizza-dough",
        name: "Dough & Base",
        color: "#f59e0b",
        items: [
          { id: "strong-flour", name: "Strong Bread Flour", emoji: "🌾" },
          { id: "yeast", name: "Dried Yeast", emoji: "🫙" },
          { id: "olive-oil", name: "Olive Oil", emoji: "🫒" },
          { id: "semolina", name: "Semolina", emoji: "🌾" },
          { id: "passata", name: "Passata", emoji: "🫙" },
        ],
      },
      {
        id: "pizza-toppings",
        name: "Toppings",
        color: "#ef4444",
        items: [
          { id: "mozzarella", name: "Mozzarella", emoji: "🧀" },
          { id: "burrata", name: "Burrata", emoji: "🧀" },
          { id: "gorgonzola", name: "Gorgonzola", emoji: "🧀" },
          { id: "italian-ham", name: "Prosciutto", emoji: "🥩" },
          { id: "artichokes", name: "Artichoke Hearts", emoji: "🥗" },
          { id: "capers", name: "Capers", emoji: "🫙" },
          { id: "fresh-basil", name: "Fresh Basil", emoji: "🌿" },
          { id: "nduja", name: "Nduja", emoji: "🌶️" },
        ],
      },
      {
        id: "pizza-drinks",
        name: "Drinks",
        color: "#a78bfa",
        items: [
          { id: "chianti", name: "Chianti", emoji: "🍷" },
          { id: "italian-lager", name: "Italian Lager", emoji: "🍺" },
          { id: "sparkling-water", name: "Sparkling Water", emoji: "💧" },
        ],
      },
    ],
  },
  {
    id: "office-supplies",
    name: "📎 Office Supplies",
    categories: [
      {
        id: "stationery",
        name: "Stationery",
        color: "#3b82f6",
        items: [
          { id: "a4-paper", name: "A4 Paper", emoji: "📄" },
          { id: "biros", name: "Biros", emoji: "✏️" },
          { id: "sticky-notes", name: "Sticky Notes", emoji: "📝" },
          { id: "sellotape", name: "Sellotape", emoji: "📦" },
          { id: "stapler", name: "Stapler & Staples", emoji: "📎" },
          { id: "folders", name: "Ring Binders", emoji: "📁" },
          { id: "envelopes", name: "Envelopes", emoji: "✉️" },
          { id: "highlighters", name: "Highlighters", emoji: "🖊️" },
        ],
      },
      {
        id: "printer",
        name: "Printer & Tech",
        color: "#a78bfa",
        items: [
          { id: "ink-cartridges", name: "Ink Cartridges", emoji: "🖨️" },
          { id: "usb-sticks", name: "USB Sticks", emoji: "💾" },
        ],
      },
      {
        id: "office-kitchen",
        name: "Kitchen & Canteen",
        color: "#10b981",
        items: [
          { id: "washing-up-liquid", name: "Washing-Up Liquid", emoji: "🧴" },
          { id: "tea-bags", name: "Tea Bags", emoji: "🫖" },
          { id: "coffee", name: "Instant Coffee", emoji: "☕" },
          { id: "milk", name: "Milk", emoji: "🥛" },
          { id: "biscuits", name: "Biscuits", emoji: "🍪" },
        ],
      },
    ],
  },
  {
    id: "date-night",
    name: "🍷 Date Night Dinner",
    categories: [
      {
        id: "date-starter",
        name: "Starter",
        color: "#ec4899",
        items: [
          { id: "smoked-salmon", name: "Smoked Salmon", emoji: "🐠" },
          { id: "creme-fraiche", name: "Crème Fraîche", emoji: "🥛" },
          { id: "blinis", name: "Blinis", emoji: "🥞" },
          { id: "capers", name: "Capers", emoji: "🫙" },
          { id: "dill", name: "Fresh Dill", emoji: "🌿" },
        ],
      },
      {
        id: "date-main",
        name: "Main Course",
        color: "#ef4444",
        items: [
          { id: "duck-breast", name: "Duck Breast", emoji: "🦆" },
          { id: "sea-bass", name: "Sea Bass Fillet", emoji: "🐟" },
          { id: "asparagus", name: "Asparagus", emoji: "🌿" },
          { id: "new-potatoes", name: "New Potatoes", emoji: "🥔" },
          { id: "shallots", name: "Shallots", emoji: "🧅" },
          { id: "butter", name: "Unsalted Butter", emoji: "🧈" },
        ],
      },
      {
        id: "date-dessert",
        name: "Dessert & Drinks",
        color: "#a78bfa",
        items: [
          { id: "dark-chocolate", name: "Dark Chocolate 70%", emoji: "🍫" },
          { id: "raspberries", name: "Raspberries", emoji: "🍓" },
          { id: "double-cream", name: "Double Cream", emoji: "🥛" },
          { id: "prosecco", name: "Prosecco", emoji: "🥂" },
          { id: "red-wine", name: "Red Wine", emoji: "🍷" },
          { id: "candles", name: "Dinner Candles", emoji: "🕯️" },
        ],
      },
    ],
  },
  {
    id: "baby-essentials",
    name: "👶 Baby Essentials",
    categories: [
      {
        id: "baby-nappies",
        name: "Nappies & Hygiene",
        color: "#f59e0b",
        items: [
          { id: "nappies", name: "Nappies", emoji: "🍼" },
          { id: "baby-wipes", name: "Baby Wipes", emoji: "🧻" },
          { id: "sudocrem", name: "Sudocrem", emoji: "🫙" },
          { id: "cotton-wool", name: "Cotton Wool Balls", emoji: "☁️" },
          { id: "baby-shampoo", name: "Baby Shampoo", emoji: "🧴" },
          { id: "nappy-bags", name: "Nappy Bags", emoji: "🛍️" },
        ],
      },
      {
        id: "baby-feeding",
        name: "Feeding",
        color: "#10b981",
        items: [
          { id: "formula", name: "Baby Formula", emoji: "🍼" },
          { id: "sterilising-tabs", name: "Sterilising Tablets", emoji: "💊" },
          { id: "food-pouches", name: "Food Pouches", emoji: "🥣" },
          { id: "weaning-spoons", name: "Weaning Spoons", emoji: "🥄" },
          { id: "bibs", name: "Bibs", emoji: "👕" },
        ],
      },
      {
        id: "baby-extras",
        name: "Extras",
        color: "#ec4899",
        items: [
          { id: "muslin-squares", name: "Muslin Squares", emoji: "🧣" },
          { id: "baby-detergent", name: "Baby Laundry Gel", emoji: "🧴" },
          { id: "nappy-rash-cream", name: "Nappy Rash Cream", emoji: "🫙" },
        ],
      },
    ],
  },
  {
    id: "christmas-dinner",
    name: "🎄 Christmas Dinner",
    categories: [
      {
        id: "xmas-main",
        name: "The Main Event",
        color: "#ef4444",
        items: [
          { id: "whole-turkey", name: "Whole Turkey", emoji: "🦃" },
          { id: "chipolatas", name: "Chipolata Sausages", emoji: "🌭" },
          { id: "streaky-bacon", name: "Streaky Bacon", emoji: "🥓" },
          { id: "stuffing-mix", name: "Stuffing Mix", emoji: "🫙" },
          { id: "goose-fat", name: "Goose Fat", emoji: "🫙" },
        ],
      },
      {
        id: "xmas-veg",
        name: "Vegetables",
        color: "#10b981",
        items: [
          { id: "brussels-sprouts", name: "Brussels Sprouts", emoji: "🥦" },
          { id: "parsnips", name: "Parsnips", emoji: "🥕" },
          { id: "carrots", name: "Carrots", emoji: "🥕" },
          { id: "roast-potatoes", name: "Roasting Potatoes", emoji: "🥔" },
          { id: "red-cabbage", name: "Red Cabbage", emoji: "🥬" },
        ],
      },
      {
        id: "xmas-condiments",
        name: "Sauces & Extras",
        color: "#f59e0b",
        items: [
          { id: "cranberry-sauce", name: "Cranberry Sauce", emoji: "🫙" },
          { id: "bread-sauce", name: "Bread Sauce Mix", emoji: "🫙" },
          { id: "gravy-granules", name: "Gravy Granules", emoji: "🫙" },
          { id: "xmas-crackers", name: "Christmas Crackers", emoji: "🎉" },
        ],
      },
      {
        id: "xmas-dessert",
        name: "Pudding & Drinks",
        color: "#a78bfa",
        items: [
          { id: "xmas-pudding", name: "Christmas Pudding", emoji: "🍮" },
          { id: "brandy-butter", name: "Brandy Butter", emoji: "🧈" },
          { id: "mince-pies", name: "Mince Pies", emoji: "🥧" },
          { id: "port", name: "Port Wine", emoji: "🍷" },
          { id: "mulled-wine", name: "Mulled Wine Spices", emoji: "🍵" },
        ],
      },
    ],
  },
  {
    id: "football-night",
    name: "⚽ Football Match Night",
    categories: [
      {
        id: "football-snacks",
        name: "Snacks",
        color: "#f59e0b",
        items: [
          { id: "crisps", name: "Crisps", emoji: "🥔" },
          { id: "sausage-rolls", name: "Sausage Rolls", emoji: "🥐" },
          { id: "pork-pies", name: "Pork Pies", emoji: "🥧" },
          { id: "tortilla-chips", name: "Tortilla Chips", emoji: "🌮" },
          { id: "salted-peanuts", name: "Salted Peanuts", emoji: "🥜" },
          { id: "dips", name: "Salsa & Guacamole", emoji: "🥑" },
        ],
      },
      {
        id: "football-food",
        name: "Hot Food",
        color: "#ef4444",
        items: [
          { id: "hot-dogs", name: "Hot Dogs", emoji: "🌭" },
          { id: "baguettes", name: "Baguettes", emoji: "🥖" },
          { id: "pizza", name: "Frozen Pizza", emoji: "🍕" },
          { id: "chicken-wings", name: "Chicken Wings", emoji: "🍗" },
        ],
      },
      {
        id: "football-drinks",
        name: "Drinks",
        color: "#3b82f6",
        items: [
          { id: "lager", name: "Lager", emoji: "🍺" },
          { id: "cider", name: "Cider", emoji: "🍺" },
          { id: "non-alc-beer", name: "Alcohol-Free Beer", emoji: "🍺" },
          { id: "cola", name: "Cola", emoji: "🥤" },
          { id: "energy-drink", name: "Energy Drink", emoji: "⚡" },
        ],
      },
    ],
  },
  {
    id: "moving-house",
    name: "📦 Moving House",
    categories: [
      {
        id: "moving-packing",
        name: "Packing Supplies",
        color: "#f59e0b",
        items: [
          { id: "boxes", name: "Cardboard Boxes", emoji: "📦" },
          { id: "packing-tape", name: "Packing Tape", emoji: "🖊️" },
          { id: "bubble-wrap", name: "Bubble Wrap", emoji: "📦" },
          { id: "marker-pens", name: "Marker Pens", emoji: "✏️" },
          { id: "sellotape", name: "Sellotape", emoji: "📎" },
          { id: "labels", name: "Labels / Sticky Notes", emoji: "📝" },
        ],
      },
      {
        id: "moving-cleaning",
        name: "Cleaning Products",
        color: "#10b981",
        items: [
          { id: "bleach", name: "Bleach", emoji: "🧴" },
          { id: "washing-up-liquid", name: "Washing-Up Liquid", emoji: "🧼" },
          { id: "hoover-bags", name: "Hoover Bags", emoji: "🧹" },
          { id: "limescale", name: "Limescale Remover", emoji: "🫧" },
          { id: "bin-bags", name: "Bin Bags", emoji: "🗑️" },
          { id: "cloths", name: "Microfibre Cloths", emoji: "🧽" },
        ],
      },
      {
        id: "moving-essentials",
        name: "First-Night Kit",
        color: "#3b82f6",
        items: [
          { id: "tea-bags", name: "Tea Bags", emoji: "🫖" },
          { id: "biscuits", name: "Biscuits", emoji: "🍪" },
          { id: "toilet-roll", name: "Toilet Roll", emoji: "🧻" },
          { id: "kettle-descaler", name: "Kettle Descaler", emoji: "🫧" },
          { id: "light-bulbs", name: "Light Bulbs", emoji: "💡" },
        ],
      },
    ],
  },
  {
    id: "cocktail-party",
    name: "🍸 Cocktail Party",
    categories: [
      {
        id: "cocktail-spirits",
        name: "Spirits",
        color: "#a78bfa",
        items: [
          { id: "gin", name: "Gin", emoji: "🍸" },
          { id: "vodka", name: "Vodka", emoji: "🍶" },
          { id: "aperol", name: "Aperol", emoji: "🍊" },
          { id: "campari", name: "Campari", emoji: "🍷" },
          { id: "rum", name: "White Rum", emoji: "🍸" },
          { id: "prosecco", name: "Prosecco", emoji: "🥂" },
        ],
      },
      {
        id: "cocktail-mixers",
        name: "Mixers",
        color: "#06b6d4",
        items: [
          { id: "elderflower-tonic", name: "Elderflower Tonic", emoji: "🌸" },
          { id: "ginger-beer", name: "Ginger Beer", emoji: "🫚" },
          { id: "cranberry-juice", name: "Cranberry Juice", emoji: "🍹" },
          { id: "soda-water", name: "Soda Water", emoji: "💧" },
          { id: "orange-juice", name: "Orange Juice", emoji: "🍊" },
        ],
      },
      {
        id: "cocktail-garnish",
        name: "Garnishes & Supplies",
        color: "#10b981",
        items: [
          { id: "lemons", name: "Lemons", emoji: "🍋" },
          { id: "limes", name: "Limes", emoji: "🍋" },
          { id: "fresh-mint", name: "Fresh Mint", emoji: "🌿" },
          { id: "cucumber", name: "Cucumber", emoji: "🥒" },
          { id: "olives", name: "Olives", emoji: "🫒" },
          { id: "ice", name: "Ice Bag", emoji: "🧊" },
          { id: "cocktail-sticks", name: "Cocktail Sticks", emoji: "🍡" },
          { id: "napkins", name: "Paper Napkins", emoji: "🧻" },
        ],
      },
    ],
  },
  {
    id: "road-trip",
    name: "🚗 Road Trip Snacks",
    categories: [
      {
        id: "road-snacks",
        name: "Snacks",
        color: "#f59e0b",
        items: [
          { id: "biltong", name: "Biltong", emoji: "🥩" },
          { id: "mixed-nuts", name: "Mixed Nuts", emoji: "🥜" },
          { id: "flapjacks", name: "Flapjacks", emoji: "🍫" },
          { id: "rice-cakes", name: "Rice Cakes", emoji: "🍘" },
          { id: "haribo", name: "Haribo Gummies", emoji: "🍬" },
          { id: "crisps", name: "Crisps", emoji: "🥔" },
          { id: "dark-chocolate", name: "Dark Chocolate", emoji: "🍫" },
        ],
      },
      {
        id: "road-drinks",
        name: "Drinks",
        color: "#06b6d4",
        items: [
          { id: "water-bottles", name: "Water Bottles", emoji: "💧" },
          { id: "squash", name: "Squash Concentrate", emoji: "🍋" },
          { id: "travel-mug-coffee", name: "Thermos Coffee", emoji: "☕" },
        ],
      },
      {
        id: "road-fresh",
        name: "Fresh Snacks",
        color: "#10b981",
        items: [
          { id: "apples", name: "Apples", emoji: "🍎" },
          { id: "grapes", name: "Grapes", emoji: "🍇" },
          { id: "carrot-sticks", name: "Carrot Sticks", emoji: "🥕" },
          { id: "hummus-pots", name: "Hummus Pots", emoji: "🫘" },
        ],
      },
      {
        id: "road-extras",
        name: "Essentials",
        color: "#a78bfa",
        items: [
          { id: "wet-wipes", name: "Wet Wipes", emoji: "🧻" },
          { id: "sick-bags", name: "Sick Bags", emoji: "🛍️" },
          { id: "hand-gel", name: "Hand Sanitiser Gel", emoji: "🧴" },
        ],
      },
    ],
  },
  {
    id: "gym-fitness",
    name: "💪 Gym & Fitness",
    categories: [
      {
        id: "gym-protein",
        name: "Protein Sources",
        color: "#ef4444",
        items: [
          { id: "chicken-breast", name: "Chicken Breast", emoji: "🍗" },
          { id: "eggs", name: "Eggs", emoji: "🥚" },
          { id: "quark", name: "Quark", emoji: "🫙" },
          { id: "skyr", name: "Skyr Yogurt", emoji: "🍶" },
          { id: "tuna", name: "Tinned Tuna", emoji: "🐟" },
          { id: "protein-powder", name: "Protein Powder", emoji: "🥤" },
        ],
      },
      {
        id: "gym-carbs",
        name: "Energy & Carbs",
        color: "#f59e0b",
        items: [
          { id: "sweet-potatoes", name: "Sweet Potatoes", emoji: "🍠" },
          { id: "oats", name: "Rolled Oats", emoji: "🥣" },
          { id: "rice-cakes", name: "Rice Cakes", emoji: "🍘" },
          { id: "wholegrain-bread", name: "Wholegrain Bread", emoji: "🍞" },
          { id: "bananas", name: "Bananas", emoji: "🍌" },
        ],
      },
      {
        id: "gym-supplements",
        name: "Supplements",
        color: "#a78bfa",
        items: [
          { id: "creatine", name: "Creatine", emoji: "💊" },
          { id: "vitamin-d", name: "Vitamin D3+K2", emoji: "☀️" },
          { id: "magnesium", name: "Magnesium", emoji: "💊" },
          { id: "omega-3", name: "Omega-3 Fish Oil", emoji: "🐟" },
        ],
      },
      {
        id: "gym-hydration",
        name: "Hydration",
        color: "#06b6d4",
        items: [
          { id: "water", name: "Water", emoji: "💧" },
          { id: "electrolytes", name: "Electrolyte Tablets", emoji: "⚡" },
          { id: "coconut-water", name: "Coconut Water", emoji: "🥥" },
        ],
      },
    ],
  },
  {
    id: "dog-essentials",
    name: "🐕 Dog Essentials",
    categories: [
      {
        id: "dog-food",
        name: "Food & Treats",
        color: "#f59e0b",
        items: [
          { id: "dry-kibble", name: "Dry Kibble", emoji: "🍖" },
          { id: "wet-food", name: "Wet Food Pouches", emoji: "🥩" },
          { id: "dental-chews", name: "Dental Chews", emoji: "🦷" },
          { id: "training-treats", name: "Training Treats", emoji: "🦴" },
        ],
      },
      {
        id: "dog-health",
        name: "Health & Hygiene",
        color: "#10b981",
        items: [
          { id: "flea-treatment", name: "Flea Treatment", emoji: "🩺" },
          { id: "worming-tabs", name: "Worming Tablets", emoji: "💊" },
          { id: "paw-balm", name: "Paw Balm", emoji: "🐾" },
          { id: "dog-shampoo", name: "Dog Shampoo", emoji: "🧴" },
          { id: "dog-towel", name: "Waterproof Dog Towel", emoji: "🧣" },
        ],
      },
      {
        id: "dog-accessories",
        name: "Accessories",
        color: "#a78bfa",
        items: [
          { id: "poo-bags", name: "Poo Bags", emoji: "🛍️" },
          { id: "dog-lead", name: "Dog Lead", emoji: "🦮" },
          { id: "grooming-brush", name: "Grooming Brush", emoji: "🪮" },
        ],
      },
    ],
  },
  {
    id: "holiday-baking",
    name: "🍪 Holiday Cookie Baking",
    categories: [
      {
        id: "baking-basics",
        name: "Baking Basics",
        color: "#f59e0b",
        items: [
          { id: "plain-flour", name: "Plain Flour", emoji: "🌾" },
          { id: "caster-sugar", name: "Caster Sugar", emoji: "🫙" },
          { id: "icing-sugar", name: "Icing Sugar", emoji: "🫙" },
          { id: "butter", name: "Unsalted Butter", emoji: "🧈" },
          { id: "eggs", name: "Eggs", emoji: "🥚" },
          { id: "vanilla-extract", name: "Vanilla Extract", emoji: "🫙" },
          { id: "golden-syrup", name: "Golden Syrup", emoji: "🍯" },
        ],
      },
      {
        id: "baking-spices",
        name: "Spices & Flavourings",
        color: "#ef4444",
        items: [
          { id: "mixed-spice", name: "Mixed Spice", emoji: "🌶️" },
          { id: "cinnamon", name: "Ground Cinnamon", emoji: "🫙" },
          { id: "ground-ginger", name: "Ground Ginger", emoji: "🫚" },
          { id: "orange-zest", name: "Oranges (for zest)", emoji: "🍊" },
        ],
      },
      {
        id: "baking-decoration",
        name: "Decoration",
        color: "#ec4899",
        items: [
          { id: "glace-cherries", name: "Glacé Cherries", emoji: "🍒" },
          { id: "hundreds-thousands", name: "Hundreds & Thousands", emoji: "🌈" },
          { id: "marzipan", name: "Marzipan", emoji: "🍡" },
          { id: "royal-icing", name: "Royal Icing Sugar", emoji: "🫙" },
          { id: "edible-glitter", name: "Edible Glitter", emoji: "✨" },
        ],
      },
      {
        id: "baking-equipment",
        name: "Equipment",
        color: "#10b981",
        items: [
          { id: "baking-paper", name: "Baking Paper", emoji: "📄" },
          { id: "cookie-cutters", name: "Cookie Cutters", emoji: "⭐" },
          { id: "piping-bags", name: "Piping Bags", emoji: "🎂" },
          { id: "cooling-rack", name: "Cooling Rack", emoji: "🍪" },
        ],
      },
    ],
  },
]
