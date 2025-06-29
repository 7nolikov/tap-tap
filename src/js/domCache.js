// src/js/domCache.js
/**
 * Caches frequently accessed DOM elements for performance.
 * Also handles initial setup of modal close listener.
 */

export const dom = {
  categoriesContainer: document.getElementById("categories-container"),
  sendButtonContainer: document.getElementById("send-button-container"),
  sendButton: document.getElementById("send-button"),
  selectedItemsPreview: document.getElementById("selected-items-preview"),
  categoriesLoadingIndicator: document.getElementById(
    "categories-loading-indicator"
  ),
  categoriesPlaceholder: document.getElementById("categories-placeholder"),
  presetSelector: document.getElementById("preset-selector"),

  // Header CRUD buttons
  addPresetBtn: document.getElementById("add-preset-btn"),
  editPresetBtn: document.getElementById("edit-preset-btn"),
  deletePresetBtn: document.getElementById("delete-preset-btn"),

  // Modal elements (will be cached dynamically during init, as they might load after initial DOM parse)
  genericModal: null,
  genericModalPanel: null,
  genericModalTitle: null,
  genericModalCloseBtn: null,
  genericModalContent: null,
  genericModalFooter: null,
};

/**
 * Caches and sets up event listener for modal elements.
 * Should be called once DOM is ready and modal elements are guaranteed to be in the DOM.
 * @param {Function} hideModalFunc - The function to call to hide the modal.
 */
export function cacheAndSetupModalElements(hideModalFunc) {
  dom.genericModal = document.getElementById("generic-modal");
  dom.genericModalPanel = document.getElementById("generic-modal-panel");
  dom.genericModalTitle = document.getElementById("generic-modal-title");
  dom.genericModalCloseBtn = document.getElementById("generic-modal-close-btn");
  dom.genericModalContent = document.getElementById("generic-modal-content");
  dom.genericModalFooter = document.getElementById("generic-modal-footer");

  if (!dom.genericModal || !dom.genericModalPanel) {
    console.error("CRITICAL: Modal elements not found!");
    return;
  }
  console.log("Modal elements successfully cached.");

  dom.genericModalCloseBtn?.addEventListener("click", hideModalFunc);
}