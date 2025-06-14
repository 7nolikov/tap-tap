// --- Core Imports for Initialization ---
import { cacheAndSetupModalElements, dom } from "./domCache.js";
import { initializeTelegramWebApp } from "./telegram.js";
import {
  populatePresetSelector,
  handleAddPreset,
  handleEditPreset,
  handleDeletePreset,
  handlePresetSelectorChange,
} from "./presetManager.js";
import {
  sendList,
  incrementOrSelectItem,
  decrementItem,
} from "./itemInteractions.js";

/**
 * Main application initialization logic.
 * This file orchestrates the loading and setup of all other modules.
 */

console.log("App.js loaded. Starting initialization.");

// --- Initial setup when DOM is ready ---
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM fully loaded and parsed. Initializing app.");

  // Initialize core components
  // Passed `hideModal` from `modal.js` because `domCache.js` doesn't directly import `modal.js`
  // to avoid circular dependencies if `modal.js` were to import `domCache.js` for `dom`.
  // In this structure, `modal.js` imports `domCache.js`, so passing `hideModal` here is required.
  // If you define `hideModal` directly in `domCache.js` this step changes.
  // Assuming `modal.js`'s `hideModal` function is the canonical one to use.
  // We need to import `hideModal` into `app.js` from `modal.js` first.
  import("./modal.js")
    .then(({ hideModal }) => {
      cacheAndSetupModalElements(hideModal);
    })
    .catch((error) => console.error("Error importing modal functions:", error));

  initializeTelegramWebApp(); // Sets telegramWebApp and isGuestMode

  // Assign event listeners for CRUD buttons
  dom.addPresetBtn?.addEventListener("click", handleAddPreset);
  dom.editPresetBtn?.addEventListener("click", handleEditPreset);
  dom.deletePresetBtn?.addEventListener("click", handleDeletePreset);

  // Assign event listener for the preset selector
  // The handlePresetSelectorChange function takes the select element as an argument
  dom.presetSelector?.addEventListener("change", (event) =>
    handlePresetSelectorChange(event.target)
  );

  await populatePresetSelector(); // Populate and load initial preset

  // Assign send button listener
  dom.sendButton?.addEventListener("click", sendList);

  console.log("App.js initialized.");
});

// --- Expose necessary functions globally if HTML uses onclick directly ---
// This is typically needed if your HTML has `onclick="someFunction()"` attributes.
// For modern HTMX/JS interaction, using `addEventListener` from JavaScript is generally preferred.
window.handlePresetSelectorChange = handlePresetSelectorChange; // Used by presetSelector onchange
window.sendList = sendList; // Used by sendButton onclick
window.incrementOrSelectItem = incrementOrSelectItem; // Used by dynamically created item divs onclick
window.decrementItem = decrementItem; // Used by dynamically created buttons onclick

// You'll also need to ensure that `window.defaultGroceryData` is defined globally
// (e.g., in an inline script in your HTML or another non-module script loaded before `app.js`).
// Similarly, `htmx` and `Alpine` are assumed to be global (loaded via <script> tags before app.js).

// --- HTMX and Alpine.js Integrations ---
// Example of how you might use HTMX events with JavaScript
document.body.addEventListener("htmx:afterSwap", function (event) {
  console.log("HTMX content swapped:", event.detail.target);
  // If HTMX loads new content that contains items, you might need to re-attach
  // click handlers or re-run parts of renderPresetFromLocalData for existing items
  // to ensure their interactive state is correct. This depends on HTMX's behavior.
});

// Alpine.js integration: Keep Alpine's init hook as is
document.addEventListener("alpine:init", () => {
  // You can define Alpine.js reactive data and methods here
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
