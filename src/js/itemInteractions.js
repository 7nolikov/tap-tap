import { dom } from "./domCache.js";
import {
  selectedItems,
  setSelectedItems,
  currentActivePreset,
} from "./state.js";
import { telegramWebApp } from "./telegram.js";
import { showModal } from "./modal.js";

/**
 * Handles the rendering of categories and items, and all user interactions with items.
 */

/**
 * Renders a preset's categories and items from local data into the categories container.
 * This is used for both default and fetched user presets.
 * @param {Object} presetData - The preset object containing categories and items.
 */
export function renderPresetFromLocalData(presetData) {
  // containerId removed as dom.categoriesContainer is always used
  const container = dom.categoriesContainer;
  if (!container) {
    console.error(`Categories container not found for rendering local data.`);
    return;
  }

  container.innerHTML = "";
  resetSelectedItemsAndUI();

  if (
    !presetData ||
    !presetData.categories ||
    presetData.categories.length === 0
  ) {
    container.innerHTML =
      '<p class="text-center text-gray-500 py-10 non-selectable">No categories or items in this preset.</p>';
    dom.categoriesPlaceholder?.classList.add("hidden");
    return;
  }

  presetData.categories.forEach((category) => {
    const section = document.createElement("section");
    // Use color_coding for border color
    section.className =
      `bg-container-bg p-4 rounded-lg shadow-lg mb-4 border-l-4` +
      (category.color_coding
        ? ` border-[${category.color_coding}]`
        : " border-gray-600");
    section.style.borderColor = category.color_coding || "#CCCCCC"; // Fallback for direct style if Tailwind doesn't compile dynamic class

    const title = document.createElement("h2");
    title.className = `text-xl font-semibold mb-4 non-selectable text-text-primary`;
    title.textContent = category.name;
    section.appendChild(title);

    const itemsContainer = document.createElement("div");
    itemsContainer.className = "space-y-3";

    if (category.items && category.items.length > 0) {
      category.items.forEach((item) => {
        const itemElementId =
          `item-${presetData.id}-${category.id}-${item.id}`.replace(
            /[^a-zA-Z0-9-_]/g,
            "-"
          );
        const itemDiv = document.createElement("div");
        itemDiv.id = itemElementId;
        itemDiv.dataset.incrementStep = item.increment_step_value || "1.0";
        itemDiv.dataset.unitOfMeasure = item.unit_of_measure || "";
        itemDiv.dataset.itemName = item.name;

        // Initial display update
        updateItemUIDisplay(
          item.id,
          item.name,
          item.unit_of_measure,
          itemElementId
        );

        // Attach main click listener
        itemDiv.onclick = () =>
          incrementOrSelectItem(
            item.id,
            item.name,
            item.unit_of_measure,
            itemElementId,
            parseFloat(item.increment_step_value || "1.0")
          );
        itemsContainer.appendChild(itemDiv);
      });
    } else {
      const noItemsP = document.createElement("p");
      noItemsP.className =
        "text-sm text-gray-500 non-selectable text-center py-4";
      noItemsP.textContent =
        'No items in this category yet. Click "Edit Preset" to add some.';
      itemsContainer.appendChild(noItemsP);
    }
    section.appendChild(itemsContainer);
    container.appendChild(section);
  });
  dom.categoriesPlaceholder?.classList.add("hidden");
  console.log("Local preset data rendered.");
}

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
 * Increments an item's quantity or selects it if not already selected.
 * @param {string} itemId - The unique ID of the item.
 * @param {string} itemName - The full name of the item (e.g., "🍎 Apple").
 * @param {string} unit - The unit of measure (e.g., "pcs", "kg").
 * @param {string} itemElementId - The DOM ID of the item's container.
 * @param {number} [itemIncrementStep=1] - The value by which to increment the quantity.
 */
export function incrementOrSelectItem(
  itemId,
  itemName,
  unit,
  itemElementId,
  itemIncrementStep = 1
) {
  const step = Number(itemIncrementStep) || 1;

  // Use a temporary object, then update global state via setter
  let currentSelectedItems = { ...selectedItems }; // Create a shallow copy
  if (!currentSelectedItems[itemId]) {
    currentSelectedItems[itemId] = {
      name: itemName,
      quantity: 0,
      unit: unit,
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

  setSelectedItems(currentSelectedItems); // Update global state

  updateItemUIDisplay(itemId, itemName, unit, itemElementId);
  updateSendButtonVisibilityAndPreview();
  triggerItemAnimation(itemElementId, "flash");
}

/**
 * Decrements an item's quantity. Removes item if quantity drops to 0 or less.
 * @param {string} itemId - The unique ID of the item.
 * @param {string} itemName - The full name of the item.
 * @param {string} unit - The unit of measure.
 * @param {string} itemElementId - The DOM ID of the item's container.
 * @param {Event} event - The click event to stop propagation.
 */
export function decrementItem(itemId, itemName, unit, itemElementId, event) {
  event?.stopPropagation(); // Stop propagation to prevent parent item's onclick (increment)

  let currentSelectedItems = { ...selectedItems }; // Create a shallow copy

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
      delete currentSelectedItems[itemId];
      triggerItemAnimation(itemElementId, "remove");
      setTimeout(() => {
        setSelectedItems(currentSelectedItems); // Update global state after animation
        updateItemUIDisplay(itemId, itemName, unit, itemElementId);
        updateSendButtonVisibilityAndPreview();
      }, 300); // Match animation duration
    } else {
      setSelectedItems(currentSelectedItems); // Update global state
      updateItemUIDisplay(itemId, itemName, unit, itemElementId);
      updateSendButtonVisibilityAndPreview();
    }
  }
}

/**
 * Updates the visual display of a single item based on its selected quantity.
 * @param {string} itemId - The unique ID of the item.
 * @param {string} itemName - The full name of the item (e.g., "🍎 Apple").
 * @param {string} unit - The unit of measure.
 * @param {string} itemElementId - The DOM ID of the item's container.
 */
export function updateItemUIDisplay(itemId, itemName, unit, itemElementId) {
  const itemElement = document.getElementById(itemElementId);
  if (!itemElement) return;

  itemElement.classList.remove("animate-flash", "animate-remove");

  const itemData = selectedItems[itemId];
  const [itemIcon, ...nameParts] = itemName.split(" ");
  const actualItemName = nameParts.join(" ");
  const displayUnit = unit || "";

  // Retrieve original increment step from dataset for re-attaching onclick handler
  const originalIncrementStep = parseFloat(
    itemElement.dataset.incrementStep || "1"
  );

  if (itemData && itemData.quantity > 0) {
    itemElement.className =
      "flex items-center justify-between p-3 bg-accent/20 border border-accent rounded-md transition-all duration-150 ease-in-out";
    // Re-assign onclick to ensure it uses the latest data and context
    itemElement.onclick = () =>
      incrementOrSelectItem(
        itemId,
        itemName,
        unit,
        itemElementId,
        originalIncrementStep
      );
    itemElement.innerHTML = `
            <div class="flex items-center flex-grow min-w-0">
                <span class="text-xl mr-3 non-selectable">${itemIcon}</span>
                <span class="text-text-primary truncate non-selectable">${actualItemName}</span>
            </div>
            <div class="flex items-center flex-shrink-0 ml-2 space-x-2">
                <button onclick="window.decrementItem('${itemId}', '${itemName}', '${unit}', '${itemElementId}', event)"
                        class="w-8 h-8 flex items-center justify-center text-lg bg-accent text-white rounded-full transition-colors hover:bg-accent-darker focus:outline-none focus:ring-2 focus:ring-accent-darker focus:ring-opacity-50">
                    -
                </button>
                <span class="text-text-primary w-16 text-center text-lg font-semibold non-selectable">${itemData.quantity} ${displayUnit}</span>
            </div>`;
  } else {
    itemElement.className =
      "flex items-center justify-between p-3 bg-item-bg rounded-md hover:bg-gray-700/50 cursor-pointer transition-all duration-150 ease-in-out";
    // Re-assign onclick to ensure it uses the latest data and context
    itemElement.onclick = () =>
      incrementOrSelectItem(
        itemId,
        itemName,
        unit,
        itemElementId,
        originalIncrementStep
      );
    itemElement.innerHTML = `
            <div class="flex items-center flex-grow min-w-0">
                <span class="text-xl mr-3 non-selectable">${itemIcon}</span>
                <span class="text-text-primary truncate non-selectable">${actualItemName}</span>
            </div>
            <div class="flex items-center flex-shrink-0 ml-2">
                <span class="text-text-secondary whitespace-nowrap non-selectable">0 ${displayUnit}</span>
            </div>`;
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
        return `${nameParts.join(" ")}: ${item.quantity} ${item.unit}`;
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
 */
export function resetSelectedItemsAndUI() {
  setSelectedItems({}); // Reset to an empty object via setter
  updateSendButtonVisibilityAndPreview();
}

/**
 * Formats the selected items into a string suitable for Telegram message.
 * @param {Object} items - The selectedItems object.
 * @returns {string} Formatted string.
 */
export function formatListForTelegram(items) {
  let message = `*QuickShare List: ${currentActivePreset.name}*\n\n`; // Use currentActivePreset from state

  Object.values(items).forEach((item) => {
    const [, ...nameParts] = item.name.split(" "); // Remove icon
    const itemNameWithoutIcon = nameParts.join(" ");
    message += `- ${itemNameWithoutIcon}: ${item.quantity} ${item.unit}\n`;
  });

  message += `\n_Sent from QuickShare List Mini App_`;
  return message;
}

/**
 * Sends the formatted list via Telegram WebApp.
 */
export function sendList() {
  if (!selectedItems || Object.keys(selectedItems).length === 0) {
    telegramWebApp?.showAlert("Please select at least one item to send.");
    return;
  }

  const message = formatListForTelegram(selectedItems);

  if (telegramWebApp) {
    telegramWebApp.sendData(
      JSON.stringify({
        type: "list",
        content: message,
      })
    );
  } else {
    console.error("Telegram WebApp is not available to send data.");
    showModal(
      "Send Failed",
      "Telegram WebApp not found. Cannot send list. (Simulating data sent to console for dev mode)"
    );
    console.log("Simulated Telegram WebApp sendData content:", {
      type: "list",
      content: message,
    });
  }
}
