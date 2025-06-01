const defaultGroceryData = {
    id: 'default_grocery_list_001', // Unique ID for this default preset
    name: 'Grocery List', // Display name
    isDefault: true,
    categories: [
        {
            id: 'cat_bakery_001',
            name: 'Bakery',
            color_hex: '#F1E05A', // Yellow
            textColorClass: 'text-yellow-400', // Tailwind class for the title
            borderColorClass: 'border-yellow-500', // Tailwind class for the border
            items: [
                { id: 'item_bread_001', name: '🍞 Bread', unit: 'loaf', incrementStep: 1 },
                { id: 'item_bagels_002', name: '🥯 Bagels', unit: 'pack', incrementStep: 1 },
                { id: 'item_tortillas_003', name: '🌮 Tortillas', unit: 'pack', incrementStep: 1 }
            ]
        },
        {
            id: 'cat_dairy_002',
            name: 'Dairy & Eggs',
            color_hex: '#60A5FA', // Blue
            textColorClass: 'text-blue-400',
            borderColorClass: 'border-blue-500',
            items: [
                { id: 'item_milk_004', name: '🥛 Milk', unit: 'liter', incrementStep: 1 },
                { id: 'item_cheese_005', name: '🧀 Cheese', unit: 'g', incrementStep: 50 },
                { id: 'item_eggs_006', name: '🥚 Eggs', unit: 'pcs', incrementStep: 6 }, // e.g. half-dozen
                { id: 'item_yogurt_007', name: '🍦 Yogurt', unit: 'pot', incrementStep: 1 },
                { id: 'item_butter_008', name: '🧈 Butter', unit: 'pack', incrementStep: 1 }
            ]
        },
        {
            id: 'cat_fruits_003',
            name: 'Fruits',
            color_hex: '#F97316', // Orange
            textColorClass: 'text-orange-400',
            borderColorClass: 'border-orange-500',
            items: [
                { id: 'item_apples_009', name: '🍎 Apples', unit: 'pcs', incrementStep: 1 },
                { id: 'item_bananas_010', name: '🍌 Bananas', unit: 'pcs', incrementStep: 1 },
                { id: 'item_berries_011', name: '🍓 Berries', unit: 'box', incrementStep: 1 },
                { id: 'item_oranges_012', name: '🍊 Oranges', unit: 'pcs', incrementStep: 1 }
            ]
        },
        {
            id: 'cat_veg_004',
            name: 'Vegetables',
            color_hex: '#22C55E', // Green
            textColorClass: 'text-green-400',
            borderColorClass: 'border-green-500',
            items: [
                { id: 'item_lettuce_013', name: '🥬 Lettuce', unit: 'head', incrementStep: 1 },
                { id: 'item_tomatoes_014', name: '🍅 Tomatoes', unit: 'kg', incrementStep: 0.5 }, // Example: 0.5 kg steps
                { id: 'item_onions_015', name: '🧅 Onions', unit: 'kg', incrementStep: 0.5 },
                { id: 'item_potatoes_016', name: '🥔 Potatoes', unit: 'kg', incrementStep: 1 },
                { id: 'item_carrots_017', name: '🥕 Carrots', unit: 'kg', incrementStep: 0.5 },
                { id: 'item_broccoli_018', name: '🥦 Broccoli', unit: 'head', incrementStep: 1 }
            ]
        },
        {
            id: 'cat_meat_005',
            name: 'Meat & Poultry',
            color_hex: '#EF4444', // Red
            textColorClass: 'text-red-400',
            borderColorClass: 'border-red-500',
            items: [
                { id: 'item_chicken_019', name: '🍗 Chicken Breast', unit: 'kg', incrementStep: 0.5 },
                { id: 'item_beef_020', name: '🥩 Beef Mince', unit: 'g', incrementStep: 100 },
                { id: 'item_sausages_021', name: '🌭 Sausages', unit: 'pack', incrementStep: 1 },
                { id: 'item_fish_022', name: '🐟 Fish Fillet', unit: 'g', incrementStep: 100 }
            ]
        },
        {
            id: 'cat_pantry_006',
            name: 'Pantry Staples',
            color_hex: '#A1A1AA', // Gray (Zinc)
            textColorClass: 'text-zinc-400',
            borderColorClass: 'border-zinc-500',
            items: [
                { id: 'item_pasta_023', name: '🍝 Pasta', unit: 'g', incrementStep: 500 },
                { id: 'item_rice_024', name: '🍚 Rice', unit: 'kg', incrementStep: 1 },
                { id: 'item_cereal_025', name: '🥣 Cereal', unit: 'box', incrementStep: 1 },
                { id: 'item_oil_026', name: '🍾 Cooking Oil', unit: 'bottle', incrementStep: 1 },
                { id: 'item_flour_027', name: '🌾 Flour', unit: 'kg', incrementStep: 1 },
                { id: 'item_sugar_028', name: '🧂 Sugar', unit: 'kg', incrementStep: 1 },
                { id: 'item_coffee_029', name: '☕ Coffee', unit: 'pack', incrementStep: 1 }
            ]
        },
        {
            id: 'cat_frozen_007',
            name: 'Frozen Foods',
            color_hex: '#22D3EE', // Cyan
            textColorClass: 'text-cyan-400',
            borderColorClass: 'border-cyan-500',
            items: [
                { id: 'item_frozveg_030', name: '🥕 Frozen Vegetables', unit: 'bag', incrementStep: 1 },
                { id: 'item_icecream_031', name: '🍨 Ice Cream', unit: 'tub', incrementStep: 1 },
                { id: 'item_pizza_032', name: '🍕 Frozen Pizza', unit: 'pcs', incrementStep: 1 }
            ]
        },
        {
            id: 'cat_beverages_008',
            name: 'Beverages',
            color_hex: '#818CF8', // Indigo
            textColorClass: 'text-indigo-400',
            borderColorClass: 'border-indigo-500',
            items: [
                { id: 'item_water_033', name: '💧 Water Bottles', unit: 'pack', incrementStep: 1 },
                { id: 'item_juice_034', name: '🧃 Juice', unit: 'carton', incrementStep: 1 },
                { id: 'item_soda_035', name: '🥤 Soda', unit: 'can', incrementStep: 6 }
            ]
        }
    ]
};

// Make it available globally if not using modules
if (typeof window !== 'undefined') {
    window.defaultGroceryData = defaultGroceryData;
} 