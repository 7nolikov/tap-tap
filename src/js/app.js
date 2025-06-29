// --- Core Imports for Initialization ---
import { cacheAndSetupModalElements, dom } from "./domCache.js";
import { initializeTelegramWebApp } from "./telegram.js";
import {
  populatePresetSelector,
  handleAddPreset,
  handleEditPreset,
  handleDeletePreset,
  handlePresetSelectorChange,
  updatePresetCrudButtons // Import for direct access if needed, or if event listener doesn't cover it
} from "./presetManager.js";
import {
  sendList,
  incrementOrSelectItem,
  decrementItem,
  resetSelectedItemsAndUI // Ensure this is accessible if needed globally or by other modules
} from "./itemInteractions.js";
import { hideModal } from "./modal.js"; // Import hideModal directly for initial setup

/**
 * Main application initialization logic.
 * This file orchestrates the loading and setup of all other modules.
 */

console.log("App.js loaded. Starting initialization.");

// --- Initial setup when DOM is ready ---
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM fully loaded and parsed. Initializing app.");

  // Initialize core components
  cacheAndSetupModalElements(hideModal); // Pass hideModal from modal.js
  initializeTelegramWebApp(); // Sets telegramWebApp and isGuestMode

  // Assign event listeners for CRUD buttons
  dom.addPresetBtn?.addEventListener("click", handleAddPreset);
  dom.editPresetBtn?.addEventListener("click", handleEditPreset);
  dom.deletePresetBtn?.addEventListener("click", handleDeletePreset);

  // Assign event listener for the preset selector
  dom.presetSelector?.addEventListener("change", (event) =>
    handlePresetSelectorChange(event.target)
  );

  await populatePresetSelector(); // Populate and load initial preset

  // Assign send button listener
  dom.sendButton?.addEventListener("click", sendList);

  // General modal close listeners for escape key and backdrop click
  if (dom.genericModal) {
    dom.genericModal.addEventListener('click', (event) => {
        if (event.target === dom.genericModal) { // Only close if clicking the backdrop
            hideModal();
            // Reset selector to last valid preset on modal close if needed
            if (dom.presetSelector && dom.presetSelector.dataset.lastValidPresetId) {
                dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId;
            }
        }
    });
  }
  document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && dom.genericModal && !dom.genericModal.classList.contains('hidden')) {
          hideModal();
          // Reset selector to last valid preset on modal close if needed
          if (dom.presetSelector && dom.presetSelector.dataset.lastValidPresetId) {
              dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId;
          }
      }
  });


  console.log("App.js initialized.");
});

// --- Expose necessary functions globally if HTML uses onclick directly ---
// These are needed because HTML attributes (`onclick`, `onchange`) do not understand ES Module imports.
window.handlePresetSelectorChange = handlePresetSelectorChange;
window.sendList = sendList;
window.incrementOrSelectItem = incrementOrSelectItem;
window.decrementItem = decrementItem;
// Expose resetSelectedItemsAndUI for HTMX after-settle if it needs to be called globally
window.resetSelectedItemsAndUI = resetSelectedItemsAndUI;


// --- Alpine.js Integrations ---
// Assuming Alpine.js is loaded via a <script defer src="...cdn.min.js"> tag
document.addEventListener("alpine:init", () => {
  Alpine.data("appData", () => ({
    init() {
      console.log("Alpine.js initialized with appData.");
      if (window.Telegram?.WebApp) {
        console.log("Telegram WebApp is available within Alpine context.");
      }
    },
    showTelegramUserInfo() {
      if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
        const user = Telegram.WebApp.initDataUnsafe.user;
        Telegram.WebApp.showAlert(
          `Hello, ${user.first_name}! Your user ID is ${user.id}.`
        );
      } else {
        Telegram.WebApp.showAlert("Telegram user data not available.");
      }
    },
  }));
});