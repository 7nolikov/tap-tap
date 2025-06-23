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
  }
}

/**
 * Updates the visual display of a single item based on its selected quantity.
 * This function will modify existing elements, not recreate them.
 * @param {string} itemId - The unique ID of the item's DOM element.
 */
export function updateItemUIDisplay(itemId) {
  const itemElement = document.getElementById(itemId);
  if (!itemElement) return;

  // Remove animation classes if they exist from previous interactions
  itemElement.classList.remove("animate-flash", "animate-remove");

  const itemData = selectedItems[itemId];
  const quantityDisplay = itemElement.querySelector(".item-quantity");
  const decrementButton = itemElement.querySelector(".decrement-btn");

  if (!quantityDisplay || !decrementButton) {
    console.warn(
      `Could not find quantity display or decrement button for item ${itemId}.`
    );
    return; // Essential elements missing, cannot update UI
  }

  // Determine current quantity and unit for display
  const quantity = itemData ? itemData.quantity : 0;
  const unit = itemData
    ? itemData.unit || ""
    : itemElement.dataset.unitOfMeasure || ""; // Fallback to dataset

  if (quantity > 0) {
    itemElement.classList.add("selected"); // Add 'selected' class for styling
    quantityDisplay.textContent = `${quantity} ${unit}`;
    decrementButton.classList.remove("opacity-0"); // Show decrement button
    decrementButton.classList.add("opacity-100");
  } else {
    itemElement.classList.remove("selected"); // Remove 'selected' class
    quantityDisplay.textContent = ""; // Clear quantity display
    decrementButton.classList.remove("opacity-100"); // Hide decrement button
    decrementButton.classList.add("opacity-0");
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

  // Update the individual item's UI display by its ID
  updateItemUIDisplay(itemId);
  updateSendButtonVisibilityAndPreview();
  triggerItemAnimation(itemId, "flash");
}

/**
 * Decrements an item's quantity. Removes item if quantity drops to 0 or less.
 * @param {string} itemId - The unique ID of the item.
 */
export function decrementItem(itemId) {
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
        updateItemUIDisplay(itemId); // Clear display for this item
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
  // Get a copy of selectedItems keys BEFORE clearing setSelectedItems,
  // as the loop needs to iterate over the items that *were* selected.
  const previouslySelectedIds = Object.keys(selectedItems);

  setSelectedItems({}); // Reset to an empty object via setter

  // Now, update the UI for each item that was previously selected
  // to remove the 'selected' class and clear its quantity display.
  previouslySelectedIds.forEach((itemId) => {
    updateItemUIDisplay(itemId); // Call with ID to reset its visual state
  });

  updateSendButtonVisibilityAndPreview();
}

/**
 * Formats the selected items into a string suitable for Telegram message.
 * @param {Object} items - The selectedItems object.
 * @returns {string} Formatted string.
 */
export function formatListForTelegram(items) {
  const listName = currentActivePreset.name || "QuickShare List";
  let message = `*QuickShare List: ${listName}*\n\n`;

  const allPresets = getPresetsCache();
  const currentPresetData = allPresets.find(
    (p) => p.id === currentActivePreset.id
  );

  if (currentPresetData && currentPresetData.categories) {
    const categoriesMap = new Map();

    currentPresetData.categories.forEach((category) => {
      const selectedItemsInCategory = category.items
        .filter((item) => items[item.id])
        .map((item) => items[item.id]);

      if (selectedItemsInCategory.length > 0) {
        categoriesMap.set(category.id, {
          name: category.name,
          items: selectedItemsInCategory,
        });
      }
    });

    categoriesMap.forEach((categoryData) => {
      message += `*${categoryData.name}:*\n`;
      categoryData.items.forEach((item) => {
        const [, ...nameParts] = item.name.split(" ");
        const itemNameWithoutIcon = nameParts.join(" ");
        message += `- ${itemNameWithoutIcon}: ${item.quantity} ${
          item.unit || ""
        }\n`;
      });
      message += "\n";
    });
  } else {
    Object.values(items).forEach((item) => {
      const [, ...nameParts] = item.name.split(" ");
      const itemNameWithoutIcon = nameParts.join(" ");
      message += `- ${itemNameWithoutIcon}: ${item.quantity} ${
        item.unit || ""
      }\n`;
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
    telegramWebApp.showAlert(
      "Telegram Web App is closed. Cannot send message."
    );
    return;
  }

  if (telegramWebApp.sendData) {
    console.log("Sending data to Telegram bot:", message);
    telegramWebApp.sendData(message);
    telegramWebApp.close();
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

  resetSelectedItemsAndUI();
}

// --- HTMX Rendering Function (PRIMARY RENDERING MECHANISM) ---
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

  resetSelectedItemsAndUI(); // Always clear selections when a new preset is loaded

  if (
    !selectedPreset ||
    !selectedPreset.categories ||
    selectedPreset.categories.length === 0
  ) {
    categoriesContainer.innerHTML = `<p id="categories-placeholder" class="text-center text-gray-500 py-10 non-selectable">No items defined for this preset.</p>`;
    dom.categoriesPlaceholder?.classList.remove("hidden");
    return;
  }

  dom.categoriesPlaceholder?.classList.add("hidden");

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
            .map((item) => {
              const [itemIcon, ...nameParts] = item.name.split(" ");
              const actualItemName = nameParts.join(" ");
              const displayUnit = item.unit_of_measure || "";

              return `
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
                   ondblclick="decrementItem('${item.id}', event)"
                   title="Click to add, double-click to remove"
              >
                <div class="item-name text-text-primary font-semibold text-sm md:text-base mb-1 truncate w-full">${itemIcon} ${actualItemName}</div>
                <div class="item-details text-gray-400 text-xs truncate w-full">${
                  item.description ||
                  (displayUnit ? `Unit: ${displayUnit}` : "")
                }</div>
                <div class="item-quantity text-accent font-bold text-lg md:text-xl mt-2"></div>
                <!-- Decrement button -->
                <button
                    class="decrement-btn absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onclick="event.stopPropagation(); decrementItem('${
                      item.id
                    }')"
                >
                    -
                </button>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  });
  categoriesContainer.innerHTML = htmlContent;

  // After initial render, call updateItemUIDisplay for any items that might already be selected
  // (e.g., if we kept selections across preset loads, or for debugging)
  // Since we call resetSelectedItemsAndUI at the start, this loop will effectively do nothing
  // unless you modify resetSelectedItemsAndUI's behavior.
  Object.keys(selectedItems).forEach((id) => {
    // Find the actual item data to ensure updateItemUIDisplay has the context if needed.
    // However, updateItemUIDisplay should now only need the ID.
    updateItemUIDisplay(id);
  });

  updateSendButtonVisibilityAndPreview();
});
