// src/js/state.js
/**
 * Manages global application state.
 * Using `let` for direct export of mutable state, or functions for controlled updates.
 */

export let selectedItems = {}; // Stores items currently selected for the list
export let currentActivePreset = { id: null, name: "Loading..." }; // ID and name of the currently loaded preset
export let userPresetsCache = []; // Cache of user-created presets fetched from Supabase

/**
 * Updates the `selectedItems` state.
 * @param {Object} newItems - The new selected items object.
 */
export function setSelectedItems(newItems) {
  selectedItems = newItems;
}

/**
 * Updates the `currentActivePreset` state.
 * @param {Object} preset - The new active preset object ({ id: string, name: string }).
 */
export function setCurrentActivePreset(preset) {
  currentActivePreset = preset;
}

/**
 * Updates the `userPresetsCache` state.
 * @param {Array<Object>} cache - The new array of user preset objects.
 */
export function setUserPresetsCache(cache) {
  userPresetsCache = cache;
}

/**
 * Returns the current `userPresetsCache`.
 * @returns {Array<Object>} The cached array of user preset objects.
 */
export function getPresetsCache() {
  return userPresetsCache;
}