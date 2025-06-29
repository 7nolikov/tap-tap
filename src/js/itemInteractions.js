// src/js/itemInteractions.js

import { dom } from "./domCache.js";
import {
  selectedItems,
  setSelectedItems,
  currentActivePreset,
  getPresetsCache,
} from "./state.js";
import { telegramWebApp } from "./telegram.js";
import { showModal } from "./modal.js";

/**
 * Handles the rendering of categories and items, and all user interactions with items.
 */

/**
 * Triggers a visual animation on an item element.
 * @param {string} itemId - The ID of the item's DOM element.
 * @param {'flash' | 'remove'} animationType - Type of animation to apply.
 */
export function triggerItemAnimation(itemId, animationType = "flash") {
  const itemElement = document.getElementById(itemId);
  if (!itemElement) return;

  if (animationType === "flash") {
    itemElement.classList.add("animate-flash");
    setTimeout(() => itemElement.classList.remove("animate-flash"), 300);
  } else if (animationType === "remove") {
    itemElement.classList.add("animate-remove");
    // Ensure the element is completely removed after animation if needed, or hidden.
    // For now, just animate, resetSelectedItemsAndUI will handle cleanup.
  }
}

/**
 * Updates the visual display of a single item based on its selected quantity.
 * This function modifies existing elements within the item card.
 * @param {string} itemId - The unique ID of the item's DOM element.
 */
export function updateItemUIDisplay(itemId) {
  const itemElement = document.getElementById(itemId);
  if (!itemElement) return;

  // Remove any lingering animation classes
  itemElement.classList.remove("animate-flash", "animate-remove");

  const itemData = selectedItems[itemId];
  const quantityDisplay = itemElement.querySelector('.item-quantity');
  const decrementButton = itemElement.querySelector('.decrement-btn');

  if (!quantityDisplay || !decrementButton) {
      console.warn(`Could not find quantity display or decrement button for item ${itemId}.`);
      return;
  }

  // Determine current quantity and unit for display
  const quantity = itemData ? itemData.quantity : 0;
  // Fallback to dataset if itemData isn't available (e.g., during reset for unselected items)
  const unit = itemData ? (itemData.unit || '') : (itemElement.dataset.unitOfMeasure || '');

  if (quantity > 0) {
    itemElement.classList.add('selected'); // Add 'selected' class for styling
    quantityDisplay.textContent = `${quantity} ${unit}`.trim();
    decrementButton.classList.remove('opacity-0'); // Show decrement button
    decrementButton.classList.add('opacity-100');
  } else {
    itemElement.classList.remove('selected'); // Remove 'selected' class
    quantityDisplay.textContent = `${quantity} ${unit}`.trim(); // Show "0 unit" as per screenshot
    decrementButton.classList.remove('opacity-100'); // Hide decrement button
    decrementButton.classList.add('opacity-0');
  }
}


/**
 * Increments an item's quantity or selects it if not already selected.
 * @param {HTMLElement} itemElement - The HTML element of the item card.
 * @param {string} itemId - The unique ID of the item.
 * @param {string} itemName - The full name of the item (e.g., "🍎 Apple").
 * @param {number} [incrementStep=1] - The value by which to increment the quantity.
 * @param {string} [unitOfMeasure=''] - The unit of measure (e.g., "pcs", "kg").
 */
export function incrementOrSelectItem(itemElement, itemId, itemName, incrementStep = 1, unitOfMeasure = '') {
  const step = Number(incrementStep) || 1;

  let currentSelectedItems = { ...selectedItems };
  if (!currentSelectedItems[itemId]) {
    currentSelectedItems[itemId] = {
      name: itemName,
      quantity: 0, // Start from 0, then add step
      unit: unitOfMeasure,
      incrementStep: step,
    };
  }
  currentSelectedItems[itemId].quantity += step;

  const { quantity } = currentSelectedItems[itemId];
  // Handle floating point precision
  const stepDecimals = (String(step).includes('.')) ? String(step).split(".")[1].length : 0;
  const currentDecimals = (String(quantity).includes('.')) ? String(quantity).split(".")[1].length : 0;
  const precision = Math.max(stepDecimals, currentDecimals);
  currentSelectedItems[itemId].quantity = parseFloat(
    quantity.toFixed(precision)
  );

  setSelectedItems(currentSelectedItems);

  updateItemUIDisplay(itemId); // Only needs item ID now
  updateSendButtonVisibilityAndPreview();
  triggerItemAnimation(itemId, "flash");
}

/**
 * Decrements an item's quantity. Removes item if quantity drops to 0 or less.
 * @param {string} itemId - The unique ID of the item.
 * @param {Event} event - The click event to stop propagation.
 */
export function decrementItem(itemId, event) {
  // IMPORTANT: Stop propagation to prevent incrementing the item when decrement button is clicked.
  if (event) {
    event.stopPropagation();
  }

  let currentSelectedItems = { ...selectedItems };

  if (currentSelectedItems[itemId]) {
    const step = Number(currentSelectedItems[itemId].incrementStep) || 1;
    currentSelectedItems[itemId].quantity -= step;

    const { quantity } = currentSelectedItems[itemId];
    // Handle floating point precision
    const stepDecimals = (String(step).includes('.')) ? String(step).split(".")[1].length : 0;
    const currentDecimals = (String(quantity).includes('.')) ? String(quantity).split(".")[1].length : 0;
    const precision = Math.max(stepDecimals, currentDecimals);
    currentSelectedItems[itemId].quantity = parseFloat(
      quantity.toFixed(precision)
    );

    if (currentSelectedItems[itemId].quantity <= 0) {
      triggerItemAnimation(itemId, "remove");
      setTimeout(() => {
        delete currentSelectedItems[itemId];
        setSelectedItems(currentSelectedItems);
        updateItemUIDisplay(itemId); // Update UI to show 0/unselected state
        updateSendButtonVisibilityAndPreview();
      }, 300); // Match animation duration
    } else {
      setSelectedItems(currentSelectedItems);
      updateItemUIDisplay(itemId);
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
        return `${nameParts.join(" ")}: ${item.quantity} ${item.unit || ''}`;
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
  // Get IDs of items that were selected BEFORE clearing the state
  const previouslySelectedIds = Object.keys(selectedItems);

  setSelectedItems({}); // Clear the selectedItems state

  // Update the UI for each item that *was* selected to reset its display
  previouslySelectedIds.forEach(itemId => {
    updateItemUIDisplay(itemId); // This will set it to unselected/0 quantity
  });

  updateSendButtonVisibilityAndPreview();
}


/**
 * Formats the selected items into a string suitable for Telegram message.
 * @param {Object} items - The selectedItems object.
 * @returns {string} Formatted string.
 */
export function formatListForTelegram(items) {
  const listName = currentActivePreset.name || 'QuickShare List';
  let message = `*QuickShare List: ${listName}*\n\n`;

  const allPresets = getPresetsCache();
  const currentPresetData = allPresets.find(p => p.id === currentActivePreset.id);

  if (currentPresetData && currentPresetData.categories) {
    const categoriesMap = new Map();

    currentPresetData.categories.forEach(category => {
      // Filter category.items to get only those that are currently selected
      const selectedItemsInCategory = category.items.filter(item => items[item.id]);

      if (selectedItemsInCategory.length > 0) {
        categoriesMap.set(category.id, {
          name: category.name,
          items: selectedItemsInCategory.map(item => items[item.id]) // Get the selected quantity/unit
        });
      }
    });

    categoriesMap.forEach(categoryData => {
      message += `*${categoryData.name}:*\n`;
      categoryData.items.forEach(item => {
        const [, ...nameParts] = item.name.split(" ");
        const itemNameWithoutIcon = nameParts.join(" ");
        message += `- ${itemNameWithoutIcon}: ${item.quantity} ${item.unit || ''}\n`;
      });
      message += '\n';
    });

  } else {
    // Fallback if preset data or categories are missing/malformed
    Object.values(items).forEach((item) => {
      const [, ...nameParts] = item.name.split(" ");
      const itemNameWithoutIcon = nameParts.join(" ");
      message += `- ${itemNameWithoutIcon}: ${item.quantity} ${item.unit || ''}\n`;
    });
  }

  const totalItemsCount = Object.keys(items).length;
  message += `_Total unique items selected: ${totalItemsCount}_\n`;

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
    telegramWebApp.showAlert('Telegram Web App is closed. Cannot send message.');
    return;
  }

  if (telegramWebApp.sendData) {
    console.log("Sending data to Telegram bot:", message);
    telegramWebApp.sendData(message);
    telegramWebApp.close();
  } else if (telegramWebApp.openTelegramLink) {
    const encodedMessage = encodeURIComponent(message);
    telegramWebApp.openTelegramLink(`https://t.me/share/url?url=&text=${encodedMessage}`);
  } else {
    telegramWebApp.showAlert("Cannot send message. Telegram WebApp features not available.");
  }

  resetSelectedItemsAndUI();
}

// --- HTMX Rendering Function (PRIMARY RENDERING MECHANISM) ---
document.body.addEventListener('loadPresetContent', (event) => {
  const presetId = event.detail.presetId;
  const allPresets = getPresetsCache();
  const selectedPreset = allPresets.find(p => p.id === presetId);

  const categoriesContainer = dom.categoriesContainer;
  if (!categoriesContainer) {
    console.error("Categories container not found for loadPresetContent event.");
    return;
  }

  resetSelectedItemsAndUI(); // Always clear selections when a new preset is loaded

  if (!selectedPreset || !selectedPreset.categories || selectedPreset.categories.length === 0) {
    categoriesContainer.innerHTML = `<p id="categories-placeholder" class="text-center text-gray-500 py-10 non-selectable">No items defined for this preset.</p>`;
    dom.categoriesPlaceholder?.classList.remove("hidden");
    return;
  }

  dom.categoriesPlaceholder?.classList.add("hidden");

  let htmlContent = '';
  selectedPreset.categories.forEach(category => {
    // Determine the border color for the category card
    const categoryBorderColorClass = category.color_coding
      ? `border-[${category.color_coding}]` // Use direct color code for dynamic border
      : 'border-gray-600'; // Fallback
    const categoryTextColorClass = category.textColorClass || 'text-text-primary';

    htmlContent += `
      <div class="category-card p-4 rounded-xl shadow-lg border-l-4 ${categoryBorderColorClass} bg-container-bg flex flex-col mb-4">
        <h2 class="text-xl md:text-2xl font-bold mb-4 ${categoryTextColorClass}">${category.name}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          ${category.items.map(item => {
            const [itemIcon, ...nameParts] = item.name.split(" ");
            const actualItemName = nameParts.join(" ");
            const displayUnit = item.unit_of_measure || '';

            // Initial state: not selected, quantity 0, decrement button hidden
            return `
              <div id="${item.id}"
                   class="item-card bg-card-bg p-3 rounded-lg flex items-center justify-between transition-all duration-200 cursor-pointer relative overflow-hidden group"
                   data-item-id="${item.id}"
                   data-item-name="${item.name.replace(/"/g, '&quot;')}"
                   data-increment-step="${item.increment_step_value || 1}"
                   data-unit-of-measure="${item.unit_of_measure || ''}"
                   onclick="incrementOrSelectItem(this, '${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.increment_step_value || 1}, '${item.unit_of_measure.replace(/'/g, "\\'") || ''}')"
                   ondblclick="decrementItem('${item.id}', event)"
                   title="Click to add, double-click to remove"
              >
                <div class="flex items-center flex-grow min-w-0">
                    <span class="text-xl mr-3 non-selectable flex-shrink-0">${itemIcon}</span>
                    <span class="text-text-primary truncate non-selectable flex-grow">${actualItemName}</span>
                </div>
                <div class="flex items-center flex-shrink-0 ml-2 space-x-2">
                    <span class="item-quantity text-accent font-bold text-lg md:text-xl non-selectable">0 ${displayUnit}</span>
                    <!-- Decrement button starts hidden -->
                    <button
                        class="decrement-btn bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 transition-opacity duration-200"
                        onclick="decrementItem('${item.id}', event)"
                    >
                        -
                    </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });
  categoriesContainer.innerHTML = htmlContent;

  // After rendering all items, ensure their display reflects the initial '0' quantity.
  // This loop explicitly calls updateItemUIDisplay for every item.
  selectedPreset.categories.forEach(category => {
    category.items.forEach(item => {
      // updateItemUIDisplay will check selectedItems for actual quantity
      updateItemUIDisplay(item.id);
    });
  });

  updateSendButtonVisibilityAndPreview();
});