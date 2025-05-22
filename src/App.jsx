import React, { useState, useEffect, useCallback } from "react";

// Load Telegram Web App SDK
// This script is loaded globally by Telegram when the Mini App is opened.
// We'll assume it's available as window.Telegram.WebApp

// Define initial grocery data with categories, items, and emojis
const initialGroceryData = [
  {
    id: "1",
    name: "Apples",
    category: "Fruits",
    quantity: 0,
    unit: "pcs",
    emoji: "🍎",
  },
  {
    id: "2",
    name: "Bananas",
    category: "Fruits",
    quantity: 0,
    unit: "pcs",
    emoji: "🍌",
  },
  {
    id: "3",
    name: "Carrots",
    category: "Vegetables",
    quantity: 0,
    unit: "g",
    emoji: "🥕",
  },
  {
    id: "4",
    name: "Spinach",
    category: "Vegetables",
    quantity: 0,
    unit: "pack",
    emoji: "🥬",
  },
  {
    id: "5",
    name: "Milk",
    category: "Dairy",
    quantity: 0,
    unit: "liter",
    emoji: "🥛",
  },
  {
    id: "6",
    name: "Cheese",
    category: "Dairy",
    quantity: 0,
    unit: "g",
    emoji: "🧀",
  },
  {
    id: "7",
    name: "Bread",
    category: "Bakery",
    quantity: 0,
    unit: "loaf",
    emoji: "🍞",
  },
  {
    id: "8",
    name: "Eggs",
    category: "Dairy",
    quantity: 0,
    unit: "pcs",
    emoji: "🥚",
  },
  {
    id: "9",
    name: "Chicken Breast",
    category: "Meat",
    quantity: 0,
    unit: "g",
    emoji: "🍗",
  },
  {
    id: "10",
    name: "Rice",
    category: "Pantry",
    quantity: 0,
    unit: "kg",
    emoji: "🍚",
  },
];

// Define color mapping for categories (base dark background for category container, lighter text/border)
const categoryColors = {
  Fruits: "bg-gray-800 border-orange-300 text-orange-300",
  Vegetables: "bg-gray-800 border-emerald-300 text-emerald-300",
  Dairy: "bg-gray-800 border-sky-300 text-sky-300",
  Bakery: "bg-gray-800 border-amber-300 text-amber-300",
  Meat: "bg-gray-800 border-rose-300 text-rose-300",
  Pantry: "bg-gray-800 border-blue-300 text-blue-300",
  Default: "bg-gray-800 border-gray-600 text-gray-300", // Fallback
};

// Define colors for active item backgrounds and text within items
const itemActiveColors = {
  bg: "bg-gray-700", // Background for active item bar
  text: "text-gray-100", // Text color for item name and quantity
  pulseText: "text-white", // Pulse animation text color
};

// Define colors for disabled item backgrounds and text within items
const itemDisabledColors = {
  bg: "bg-gray-900", // Background for disabled item bar (CHANGED for more contrast)
  border: "border-gray-700", // Border for disabled item bar
  text: "text-gray-400", // Text color for disabled item name and quantity (CHANGED for more contrast)
};

// Helper function to group items by category
const groupItemsByCategory = (items) => {
  return items.reduce((acc, item) => {
    const category = item.category || "Default";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
};

// GroceryItem Component
const GroceryItem = ({ item, updateQuantity }) => {
  // Determine the increment amount based on unit
  const incrementAmount = item.unit === "kg" || item.unit === "g" ? 100 : 1;
  const isZeroQuantity = item.quantity === 0;

  // State for pulse animation on quantity change
  const [pulse, setPulse] = useState(false);

  // Trigger pulse animation when quantity changes and is greater than 0
  useEffect(() => {
    if (item.quantity > 0) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 300); // Reset pulse after animation
      return () => clearTimeout(timer);
    }
  }, [item.quantity]);

  // Determine the active background color for the item
  const itemActiveBgColor = itemActiveColors.bg;

  return (
    <div
      className={`
      flex items-center justify-between p-3 rounded-lg shadow-sm mb-2
      transition-all duration-300 ease-in-out transform
      ${
        isZeroQuantity
          ? `${itemDisabledColors.bg} ${itemDisabledColors.border} opacity-60 scale-98`
          : `${itemActiveBgColor} border border-transparent opacity-100 scale-100`
      }
    `}
    >
      {/* Clickable area for plus, spanning from left to quantity label */}
      <div
        className={`flex-grow flex items-center cursor-pointer select-none pr-2
          ${isZeroQuantity ? itemDisabledColors.text : itemActiveColors.text}
        `}
        onClick={() => updateQuantity(item.id, incrementAmount, item.unit)}
      >
        <span className="font-medium">
          {item.emoji} {item.name}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        {/* Quantity display with pulse animation */}
        <span
          className={`font-semibold text-lg w-16 text-center ${
            isZeroQuantity ? itemDisabledColors.text : itemActiveColors.text
          } ${pulse ? "animate-pulse-once " + itemActiveColors.pulseText : ""}`}
        >
          {item.quantity} {item.unit}
        </span>
        {/* Minus button on the right */}
        <button
          onClick={() => updateQuantity(item.id, -incrementAmount, item.unit)} // Decrease by same increment amount
          className={`p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-300
            ${
              isZeroQuantity
                ? "bg-gray-700 text-gray-500 cursor-not-allowed" // Muted for disabled state
                : "bg-purple-700 text-white hover:bg-purple-800" // Matches Send button, darker shade
            }
          `}
          aria-label={`Decrease quantity of ${item.name}`}
          disabled={isZeroQuantity} // Disable the button when quantity is 0
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 12H4"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Category Component
const Category = ({ categoryName, items, updateQuantity }) => {
  const colorClass = categoryColors[categoryName] || categoryColors["Default"];
  return (
    <div className={`mb-6 p-4 rounded-xl border-2 ${colorClass}`}>
      <h2 className="text-xl font-bold mb-4">{categoryName.split(" ")[0]}</h2>{" "}
      {/* Display only first word of category name */}
      {items.map((item) => (
        // We render all items here to allow for the transition when quantity goes to 0
        <GroceryItem
          key={item.id}
          item={item}
          updateQuantity={updateQuantity}
        />
      ))}
    </div>
  );
};

// Main App Component
const App = () => {
  const [groceryList, setGroceryList] = useState(initialGroceryData);
  const [isWebAppReady, setIsWebAppReady] = useState(false);

  // Initialize Telegram Web App
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand(); // Expand to full height
      setIsWebAppReady(true);
    } else {
      console.warn(
        "Telegram Web App SDK not found. Running in standalone mode."
      );
      setIsWebAppReady(true); // Still allow app to run for development
    }
  }, []);

  // Function to update item quantity
  const updateQuantity = useCallback((id, delta, unit) => {
    setGroceryList((prevList) =>
      prevList.map((item) => {
        if (item.id === id) {
          let newQuantity = item.quantity + delta;
          // Ensure quantity doesn't go below 0
          return { ...item, quantity: Math.max(0, newQuantity) };
        }
        return item;
      })
    );
  }, []);

  // Function to format the grocery list for sharing
  const formatGroceryListForSharing = useCallback(() => {
    const grouped = groupItemsByCategory(
      groceryList.filter((item) => item.quantity > 0)
    ); // Only include items with quantity > 0
    let formattedString = "🛒 *My Grocery List:*\n\n";

    for (const category in grouped) {
      formattedString += `*${category}:*\n`;
      grouped[category].forEach((item) => {
        formattedString += `- ${item.emoji} ${item.name}: ${item.quantity} ${item.unit}\n`; // Include emoji in shared list
      });
      formattedString += "\n";
    }

    formattedString += "Happy shopping! 😊";
    return formattedString;
  }, [groceryList]);

  // Handle share button click
  const handleShareList = useCallback(() => {
    const formattedList = formatGroceryListForSharing();
    if (isWebAppReady && window.Telegram.WebApp) {
      // Send data back to the bot. The bot will then handle forwarding.
      window.Telegram.WebApp.sendData(formattedList);
      window.Telegram.WebApp.close(); // Close the Mini App after sending
    } else {
      // Fallback for development/testing outside Telegram
      console.log("Formatted List (for sharing):");
      console.log(formattedList);
      // In a real scenario, you might prompt the user to copy this text
      // or provide a different sharing mechanism.
      document.execCommand("copy"); // Attempt to copy to clipboard for demonstration
      alert(
        "Grocery list copied to clipboard (for demonstration purposes). In Telegram, this would be sent to the bot."
      );
    }
  }, [formatGroceryListForSharing, isWebAppReady]);

  const groupedGroceries = groupItemsByCategory(groceryList);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black font-inter text-gray-900 p-4 sm:p-6 md:p-8">
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 0;
          overflow-x: hidden; /* Prevent horizontal scrolling */
        }
        /* Ensure the main app container takes full height and width */
        #root {
          min-height: 100vh;
          width: 100vw;
        }

        @keyframes pulse-once {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .animate-pulse-once {
          animation: pulse-once 0.3s ease-out;
        }
        `}
      </style>

      <h1 className="text-4xl font-extrabold text-center mb-8 text-purple-400 drop-shadow-sm">
        Grocery List
      </h1>

      <div className="max-w-3xl mx-auto">
        {Object.keys(groupedGroceries)
          .sort()
          .map((category) => (
            <Category
              key={category}
              categoryName={category}
              items={groupedGroceries[category]}
              updateQuantity={updateQuantity}
            />
          ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 shadow-lg border-t-2 border-gray-800 z-10">
        <button
          onClick={handleShareList}
          className="w-full bg-purple-700 text-white py-3 px-6 rounded-full text-lg font-semibold shadow-lg hover:bg-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all duration-300 transform hover:scale-105"
        >
          Send
        </button>
      </div>

      {/* Spacer for the fixed button at the bottom */}
      <div className="h-24 sm:h-28"></div>
    </div>
  );
};

export default App;
