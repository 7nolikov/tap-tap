import { dom } from "./domCache.js";
import {
  selectedItems,
  setSelectedItems,
  currentActivePreset, // Still useful for formatListForTelegram
  getPresetsCache, // Import getPresetsCache from state.js
} from "./state.js";
import { telegramWebApp } from "./telegram.js";
import { showModal } from "./modal.js";

/**
 * Triggers a visual animation on an item element.
 * @param {string} itemElementId - The ID of the item's DOM element.
 * @param {'flash' | 'remove'} animationType - Type of animation to apply.
 */
export function triggerItemAnimation(itemElementId, animationType = "flash") {
  const itemElement = document.getElementById(itemElementId);
  if (!itemElement) return;

  if (animationType === "flash") {
    itemElement.classList.add("animate-flash");
    setTimeout(() => itemElement.classList.remove("animate-flash"), 300);
  } else if (animationType === "remove") {
    itemElement.classList.add("animate-remove");
  }
}

/**
 * Updates the visual display of a single item based on its selected quantity.
 * This function will be called AFTER the initial rendering of the item cards
 * to apply the correct visual state.
 * @param {string} itemId - The unique ID of the item.
 * @param {string} itemName - The full name of the item (e.g., "🍞 Bread").
 * @param {string} unit - The unit of measure.
 */
export function updateItemUIDisplay(itemId, itemName, unit) {
  const itemElement = document.getElementById(itemId); // Use direct item.id for element ID
  if (!itemElement) return;

  // IMPORTANT: Remove animation classes if they exist from previous interactions
  itemElement.classList.remove("animate-flash", "animate-remove");

  const itemData = selectedItems[itemId];
  const [itemIcon, ...nameParts] = itemName.split(" ");
  const actualItemName = nameParts.join(" ");
  const displayUnit = unit || "";

  // Get the incrementStep from the data-attribute of the *rendered* element
  const originalIncrementStep = parseFloat(
    itemElement.dataset.incrementStep || "1"
  );

  if (itemData && itemData.quantity > 0) {
    // If item is selected and has quantity
    itemElement.classList.add("selected"); // Add 'selected' class for styling
    itemElement.innerHTML = `
      <div class="item-name text-text-primary font-semibold text-sm md:text-base mb-1 truncate w-full">${itemIcon} ${actualItemName}</div>
      <div class="item-details text-gray-400 text-xs truncate w-full"></div> <!-- Description goes here if available -->
      <div class="item-quantity text-accent font-bold text-lg md:text-xl mt-2">${
        itemData.quantity
      } ${displayUnit}</div>
      <button
          class="decrement-btn absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-100 transition-opacity duration-200"
          onclick="event.stopPropagation(); decrementItem('${itemId}', '${itemName.replace(
      /'/g,
      "\\'"
    )}', '${unit.replace(/'/g, "\\'")}')"
      >
          -
      </button>`;
  } else {
    // If item is not selected or quantity is 0
    itemElement.classList.remove("selected"); // Remove 'selected' class
    itemElement.innerHTML = `
      <div class="item-name text-text-primary font-semibold text-sm md:text-base mb-1 truncate w-full">${itemIcon} ${actualItemName}</div>
      <div class="item-details text-gray-400 text-xs truncate w-full"></div> <!-- Description goes here if available -->
      <div class="item-quantity text-accent font-bold text-lg md:text-xl mt-2"></div>
      <button
          class="decrement-btn absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          onclick="event.stopPropagation(); decrementItem('${itemId}', '${itemName.replace(
      /'/g,
      "\\'"
    )}', '${unit.replace(/'/g, "\\'")}')"
      >
          -
      </button>`;
  }
}

/**
 * Increments an item's quantity or selects it if not already selected.
 * @param {HTMLElement} itemElement - The HTML element of the item.
 * @param {string} itemId - The unique ID of the item.
 * @param {string} itemName - The full name of the item (e.g., "🍎 Apple").
 * @param {number} [incrementStep=1] - The value by which to increment the quantity.
 * @param {string} [unitOfMeasure=''] - The unit of measure (e.g., "pcs", "kg").
 */
export function incrementOrSelectItem(
  itemElement,
  itemId,
  itemName,
  incrementStep = 1,
  unitOfMeasure = ""
) {
  const step = Number(incrementStep) || 1;

  let currentSelectedItems = { ...selectedItems };
  if (!currentSelectedItems[itemId]) {
    currentSelectedItems[itemId] = {
      name: itemName,
      quantity: 0,
      unit: unitOfMeasure,
      incrementStep: step,
    };
  }
  currentSelectedItems[itemId].quantity += step;

  const { quantity } = currentSelectedItems[itemId];
  const stepDecimals = (String(step).split(".")[1] || "").length;
  const currentDecimals = (String(quantity).split(".")[1] || "").length;
  const precision = Math.max(stepDecimals, currentDecimals);
  currentSelectedItems[itemId].quantity = parseFloat(
    quantity.toFixed(precision)
  );

  setSelectedItems(currentSelectedItems);

  // Update the individual item's UI display
  updateItemUIDisplay(itemId, itemName, unitOfMeasure);
  updateSendButtonVisibilityAndPreview();
  triggerItemAnimation(itemId, "flash"); // Use itemId directly for element ID
}

/**
 * Decrements an item's quantity. Removes item if quantity drops to 0 or less.
 * @param {string} itemId - The unique ID of the item.
 * @param {string} itemName - The full name of the item.
 * @param {string} unit - The unit of measure.
 */
export function decrementItem(itemId, itemName, unit) {
  // No need for 'event' parameter here if onclick passes only required data.
  // The event.stopPropagation() should be handled directly in the HTML onclick itself.

  let currentSelectedItems = { ...selectedItems };

  if (currentSelectedItems[itemId]) {
    const step = Number(currentSelectedItems[itemId].incrementStep) || 1;
    currentSelectedItems[itemId].quantity -= step;

    const { quantity } = currentSelectedItems[itemId];
    const stepDecimals = (String(step).split(".")[1] || "").length;
    const currentDecimals = (String(quantity).split(".")[1] || "").length;
    const precision = Math.max(stepDecimals, currentDecimals);
    currentSelectedItems[itemId].quantity = parseFloat(
      quantity.toFixed(precision)
    );

    if (currentSelectedItems[itemId].quantity <= 0) {
      triggerItemAnimation(itemId, "remove");
      setTimeout(() => {
        delete currentSelectedItems[itemId];
        setSelectedItems(currentSelectedItems);
        updateItemUIDisplay(itemId, itemName, unit); // Clear display after delete
        updateSendButtonVisibilityAndPreview();
      }, 300); // Match animation duration
    } else {
      setSelectedItems(currentSelectedItems);
      updateItemUIDisplay(itemId, itemName, unit);
      updateSendButtonVisibilityAndPreview();
    }
  }
}

/**
 * Updates the visibility and preview text of the send button based on selected items.
 */
export function updateSendButtonVisibilityAndPreview() {
  const itemCount = Object.keys(selectedItems).length;
  if (!dom.sendButtonContainer || !dom.sendButton || !dom.selectedItemsPreview)
    return;

  if (itemCount > 0) {
    dom.sendButtonContainer.classList.remove("hidden");
    dom.sendButton.disabled = false;
    const preview = Object.values(selectedItems)
      .map((item) => {
        const [, ...nameParts] = item.name.split(" "); // Remove icon for preview
        return `${nameParts.join(" ")}: ${item.quantity} ${item.unit || ""}`;
      })
      .join(", ");
    dom.selectedItemsPreview.textContent = `Selected: ${preview}`;
  } else {
    dom.sendButtonContainer.classList.add("hidden");
    dom.sendButton.disabled = true;
    dom.selectedItemsPreview.textContent = "";
  }
}

/**
 * Resets all selected items and clears the send button UI.
 * This is called when a new preset is loaded or edited.
 */
export function resetSelectedItemsAndUI() {
  // Iterate over previously selected items to clear their UI state
  for (const itemId in selectedItems) {
    const itemElement = document.getElementById(itemId);
    if (itemElement) {
      itemElement.classList.remove("selected");
      // Re-render the inner HTML to show unselected state
      const itemData = getPresetsCache()
        .flatMap((p) => p.categories || [])
        .flatMap((c) => c.items || [])
        .find((i) => i.id === itemId);
      if (itemData) {
        const [itemIcon, ...nameParts] = itemData.name.split(" ");
        const actualItemName = nameParts.join(" ");
        const displayUnit = itemData.unit_of_measure || "";
        itemElement.innerHTML = `
              <div class="item-name text-text-primary font-semibold text-sm md:text-base mb-1 truncate w-full">${itemIcon} ${actualItemName}</div>
              <div class="item-details text-gray-400 text-xs truncate w-full"></div>
              <div class="item-quantity text-accent font-bold text-lg md:text-xl mt-2"></div>
              <button
                  class="decrement-btn absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onclick="event.stopPropagation(); decrementItem('${
                    itemData.id
                  }', '${itemData.name.replace(
          /'/g,
          "\\'"
        )}', '${itemData.unit_of_measure.replace(/'/g, "\\'")}')"
              >
                  -
              </button>`;
      }
    }
  }
  setSelectedItems({}); // Reset to an empty object via setter
  updateSendButtonVisibilityAndPreview();
}

/**
 * Formats the selected items into a string suitable for Telegram message.
 * @param {Object} items - The selectedItems object.
 * @returns {string} Formatted string.
 */
export function formatListForTelegram(items) {
  // Use currentActivePreset from state for the list name
  const listName = currentActivePreset.name || "QuickShare List";
  let message = `*QuickShare List: ${listName}*\n\n`;

  // Get the full preset data to ensure items are grouped by category for the message
  const allPresets = getPresetsCache();
  const currentPresetData = allPresets.find(
    (p) => p.id === currentActivePreset.id
  );

  if (currentPresetData && currentPresetData.categories) {
    const categoriesMap = new Map(); // category.id -> { name: "Category Name", items: [{item}, ...] }

    // Populate categoriesMap with selected items, preserving category order if possible
    currentPresetData.categories.forEach((category) => {
      const selectedItemsInCategory = category.items
        .filter((item) => items[item.id]) // Only include items that are selected
        .map((item) => items[item.id]); // Get the selected item's data (quantity, unit)

      if (selectedItemsInCategory.length > 0) {
        categoriesMap.set(category.id, {
          name: category.name,
          items: selectedItemsInCategory,
        });
      }
    });

    // Append categories and items to the message in their original category order
    categoriesMap.forEach((categoryData) => {
      message += `*${categoryData.name}:*\n`;
      categoryData.items.forEach((item) => {
        const [, ...nameParts] = item.name.split(" "); // Remove icon for display
        const itemNameWithoutIcon = nameParts.join(" ");
        message += `- ${itemNameWithoutIcon}: ${item.quantity} ${
          item.unit || ""
        }\n`;
      });
      message += "\n"; // Add a newline between categories
    });
  } else {
    // Fallback if preset data or categories are missing/malformed (should not happen with default fallback)
    Object.values(items).forEach((item) => {
      const [, ...nameParts] = item.name.split(" "); // Remove icon
      const itemNameWithoutIcon = nameParts.join(" ");
      message += `- ${itemNameWithoutIcon}: ${item.quantity} ${
        item.unit || ""
      }\n`;
    });
  }

  const totalItemsCount = Object.keys(items).length;
  message += `_Total unique items selected: ${totalItemsCount}_\n`; // Changed to unique items count

  message += `\n_Sent from QuickShare List Mini App_`;
  return message;
}

/**
 * Sends the formatted list via Telegram WebApp.
 */
export function sendList() {
  if (!telegramWebApp) {
    console.error("Telegram WebApp is not available to send data.");
    showModal(
      "Send Failed",
      "Telegram WebApp not found. Cannot send list. (Simulating data sent to console for dev mode)"
    );
    console.log("Simulated Telegram WebApp sendData content:", {
      type: "list",
      content: formatListForTelegram(selectedItems),
    });
    return;
  }

  if (Object.keys(selectedItems).length === 0) {
    telegramWebApp.showAlert("Please select at least one item to send.");
    return;
  }

  const message = formatListForTelegram(selectedItems);

  if (telegramWebApp.isClosed) {
    telegramWebApp.showAlert(
      "Telegram Web App is closed. Cannot send message."
    );
    return;
  }

  if (telegramWebApp.sendData) {
    console.log("Sending data to Telegram bot:", message);
    telegramWebApp.sendData(message);
    telegramWebApp.close(); // Close the web app after sending
  } else if (telegramWebApp.openTelegramLink) {
    const encodedMessage = encodeURIComponent(message);
    telegramWebApp.openTelegramLink(
      `https://t.me/share/url?url=&text=${encodedMessage}`
    );
  } else {
    telegramWebApp.showAlert(
      "Cannot send message. Telegram WebApp features not available."
    );
  }

  // Clear selected items after sending
  resetSelectedItemsAndUI();
}

// --- HTMX Rendering Function (PRIMARY RENDERING MECHANISM) ---
// This listener is triggered by presetManager.js when a preset is selected (including initial load)
document.body.addEventListener("loadPresetContent", (event) => {
  const presetId = event.detail.presetId;
  const allPresets = getPresetsCache();
  const selectedPreset = allPresets.find((p) => p.id === presetId);

  const categoriesContainer = dom.categoriesContainer;
  if (!categoriesContainer) {
    console.error(
      "Categories container not found for loadPresetContent event."
    );
    return;
  }

  // Clear existing items and UI state from previous preset
  resetSelectedItemsAndUI();

  if (
    !selectedPreset ||
    !selectedPreset.categories ||
    selectedPreset.categories.length === 0
  ) {
    categoriesContainer.innerHTML = `<p id="categories-placeholder" class="text-center text-gray-500 py-10 non-selectable">No items defined for this preset.</p>`;
    // Show placeholder if it was hidden
    dom.categoriesPlaceholder?.classList.remove("hidden");
    return;
  }

  dom.categoriesPlaceholder?.classList.add("hidden"); // Hide placeholder if content will be rendered

  let htmlContent = "";
  selectedPreset.categories.forEach((category) => {
    htmlContent += `
      <div class="category-card p-4 rounded-xl shadow-lg border-l-4 ${
        category.borderColorClass || "border-gray-500"
      } bg-container-bg flex flex-col mb-4">
        <h2 class="text-xl md:text-2xl font-bold mb-4 ${
          category.textColorClass || "text-text-primary"
        }">${category.name}</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          ${category.items
            .map(
              (item) => `
            <div id="${item.id}"
                 class="item-card bg-card-bg p-3 rounded-lg text-center flex flex-col justify-between items-center transition-all duration-200 cursor-pointer hover:bg-hover-bg relative overflow-hidden group"
                 data-item-id="${item.id}"
                 data-item-name="${item.name.replace(/"/g, "&quot;")}"
                 data-increment-step="${item.increment_step_value || 1}"
                 data-unit-of-measure="${item.unit_of_measure || ""}"
                 onclick="incrementOrSelectItem(this, '${
                   item.id
                 }', '${item.name.replace(/'/g, "\\'")}', ${
                item.increment_step_value || 1
              }, '${item.unit_of_measure.replace(/'/g, "\\'") || ""}')"
            >
              <div class="item-name text-text-primary font-semibold text-sm md:text-base mb-1 truncate w-full">${
                item.name
              }</div>
              <div class="item-details text-gray-400 text-xs truncate w-full">${
                item.description ||
                (item.unit_of_measure ? `Unit: ${item.unit_of_measure}` : "")
              }</div>
              <div class="item-quantity text-accent font-bold text-lg md:text-xl mt-2"></div>
              <!-- Decrement button -->
              <button
                  class="decrement-btn absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onclick="event.stopPropagation(); decrementItem('${
                    item.id
                  }', '${item.name.replace(/'/g, "\\'")}', '${
                item.unit_of_measure.replace(/'/g, "\\'") || ""
              }')"
              >
                  -
              </button>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  });
  categoriesContainer.innerHTML = htmlContent;

  // After rendering, re-apply initial selected state and quantity displays
  // This is crucial if a user navigates away and comes back, or after an edit.
  // Although resetSelectedItemsAndUI clears it, this loop could be used if you wanted to preserve selections
  // across preset changes (which is probably not desired for a grocery list app).
  // For now, clearSelectedItemsAndUI at the start of this listener handles preservation by clearing.
  // This section can be removed if resetSelectedItemsAndUI always ensures a blank slate on load.
  // Keeping it here for `updateItemUIDisplay` for any future need, but it won't do much after a full reset.
  Object.keys(selectedItems).forEach((id) => {
    // Find the actual item data to pass to updateItemUIDisplay
    const itemDataInPreset = selectedPreset.categories
      .flatMap((c) => c.items)
      .find((i) => i.id === id);
    if (itemDataInPreset) {
      updateItemUIDisplay(
        itemDataInPreset.id,
        itemDataInPreset.name,
        itemDataInPreset.unit_of_measure
      );
    }
  });

  updateSendButtonVisibilityAndPreview(); // Ensure send button state reflects current (empty) selection
});
