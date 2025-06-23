// src/js/presetManager.js

import { dom } from "./domCache.js";
import { DEFAULT_PRESET_ID } from "./constants.js";
import {
  currentActivePreset,
  setCurrentActivePreset,
  userPresetsCache,
  setUserPresetsCache,
} from "./state.js";
import { showModal, hideModal } from "./modal.js";
import {
  fetchUserPresets,
  handleSavePreset as supabaseSavePreset,
  handleEditPreset as supabaseEditPreset,
  handleDeletePreset as supabaseDeletePreset,
} from "./supabaseApi.js";
// No longer importing renderPresetFromLocalData here, it's handled by event listener in itemInteractions.js
// import { renderPresetFromLocalData } from "./itemInteractions.js";
import { supabaseClient } from "./supabaseApi.js";
// import { telegramWebApp, isGuestMode } from "./telegram.js"; // Not directly used here

/**
 * Manages the logic for populating the preset selector and handling CRUD operations for presets.
 */

/**
 * Populates the preset selector dropdown with fetched or default presets.
 * It also triggers the initial display of content for the first preset.
 */
export async function populatePresetSelector() {
  if (!dom.presetSelector) {
    console.error("Preset selector DOM element not found!");
    return;
  }
  dom.presetSelector.innerHTML =
    '<option value="" disabled selected>Loading Presets...</option>'; // Show loading state

  try {
    // fetchUserPresets now handles returning default data if DB is empty, AND updates userPresetsCache
    const fetchedPresets = await fetchUserPresets();

    if (fetchedPresets.length > 0) {
      dom.presetSelector.innerHTML = ""; // Clear loading message

      // Populate dropdown with all fetched presets (including the default if it was returned)
      fetchedPresets.forEach((preset) => {
        const option = document.createElement("option");
        option.value = preset.id;
        option.textContent = preset.name;
        dom.presetSelector.appendChild(option);
      });

      // Select the first preset (which will be the default if only default exists)
      const initialPresetId = fetchedPresets[0].id;
      dom.presetSelector.value = initialPresetId; // Set the value of the select element

      // Update CRUD buttons based on the initially selected preset
      updatePresetCrudButtons(initialPresetId);

      // Trigger the change handler manually for initial content load
      // This will dispatch the 'loadPresetContent' CustomEvent to itemInteractions.js
      handlePresetSelectorChange(dom.presetSelector);
    } else {
      // This branch should be rare if default data fallback works correctly in supabaseApi.js,
      // but good for robustness if no presets (even default) are ever available.
      dom.presetSelector.innerHTML =
        '<option value="" disabled selected>No Presets Available</option>';
      dom.categoriesContainer.innerHTML =
        '<p id="categories-placeholder" class="text-center text-gray-500 py-10 non-selectable">No presets available to load. Create one to get started!</p>';
      updatePresetCrudButtons(null); // Disable buttons
    }
  } catch (error) {
    console.error("Error populating preset selector:", error);
    dom.presetSelector.innerHTML =
      '<option value="" disabled selected>Error loading presets</option>';
    dom.categoriesContainer.innerHTML =
      '<p id="categories-placeholder" class="text-center text-gray-500 py-10 non-selectable">Failed to load presets. Please check your connection.</p>';
    updatePresetCrudButtons(null); // Disable buttons on error
  }
}

/**
 * Handles adding a new preset (opens modal).
 */
export function handleAddPreset() {
  if (!supabaseClient) {
    showModal(
      "Feature Unavailable",
      "Cannot create new presets while offline. Please check your connection to Supabase."
    );
    return;
  }
  showModal(
    "Create New Preset",
    `<div>
            <label for="new-preset-name-input" class="block text-sm font-medium text-text-primary mb-1">Preset Name:</label>
            <input type="text" id="new-preset-name-input" placeholder="Enter preset name"
                   class="w-full px-3 py-2 bg-primary-bg border border-gray-600 rounded-md text-text-primary focus:ring-accent focus:border-accent">
            <p id="create-preset-error" class="text-red-500 text-sm mt-1 hidden"></p>
        </div>`,
    [
      { text: "Cancel", class: "bg-gray-700 hover:bg-gray-600" },
      {
        text: "Save",
        class: "bg-accent hover:bg-accent-darker text-white",
        onClick: async () => {
          const input = document.getElementById("new-preset-name-input");
          const errorP = document.getElementById("create-preset-error");
          const newName = input?.value.trim() || "";

          if (!newName) {
            if (errorP) {
              errorP.textContent = "Preset name cannot be empty.";
              errorP.classList.remove("hidden");
            }
            return;
          }
          errorP?.classList.add("hidden");

          const createdPreset = await supabaseSavePreset(newName); // Call supabaseApi function
          if (createdPreset) {
            hideModal();
            await populatePresetSelector(); // Refresh and re-select
            dom.presetSelector.value = createdPreset.id;
            handlePresetSelectorChange(dom.presetSelector); // Trigger content load for new preset
          } else {
            console.error("Failed to add new preset.");
            showModal(
              "Error",
              "Failed to create new preset. Please try again.",
              null,
              true
            );
          }
        },
        hideOnClick: false,
      },
    ]
  );
}

/**
 * Handles editing the selected preset (opens modal).
 */
export function handleEditPreset() {
  const presetIdToEdit = dom.presetSelector?.value;
  const currentName =
    dom.presetSelector?.options[dom.presetSelector.selectedIndex]
      ?.textContent || "";

  if (!supabaseClient) {
    showModal("Feature Unavailable", "Cannot edit presets while offline.");
    return;
  }
  if (!presetIdToEdit || presetIdToEdit === DEFAULT_PRESET_ID) {
    showModal(
      "Cannot Edit",
      "The default preset cannot be edited, or no user preset is selected."
    );
    return;
  }

  showModal(
    `Edit Preset: ${currentName}`,
    `<div>
            <label for="edit-preset-name-input" class="block text-sm font-medium text-text-primary mb-1">New Preset Name:</label>
            <input type="text" id="edit-preset-name-input" value="${currentName}"
                   class="w-full px-3 py-2 bg-primary-bg border border-gray-600 rounded-md text-text-primary focus:ring-accent focus:border-accent">
            <p id="edit-preset-error" class="text-red-500 text-sm mt-1 hidden"></p>
        </div>`,
    [
      { text: "Cancel", class: "bg-gray-700 hover:bg-gray-600" },
      {
        text: "Save Changes",
        class: "bg-accent hover:bg-accent-darker text-white",
        hideOnClick: false,
        onClick: async () => {
          const nameInput = document.getElementById("edit-preset-name-input");
          const errorP = document.getElementById("edit-preset-error");
          const updatedName = nameInput?.value.trim() || "";

          if (!updatedName) {
            errorP.textContent = "Preset name cannot be empty.";
            errorP.classList.remove("hidden");
            nameInput?.focus();
            nameInput?.select();
            return;
          }
          if (updatedName === currentName) {
            hideModal();
            return;
          }
          errorP?.classList.add("hidden");

          // Check for duplicate names (case-insensitive) against ALL current presets (including default)
          const allPresetsForDupCheck = userPresetsCache; // userPresetsCache already includes default
          const existingCheck = allPresetsForDupCheck.some(
            (p) =>
              p.id !== presetIdToEdit &&
              p.name.toLowerCase() === updatedName.toLowerCase()
          );

          if (existingCheck) {
            errorP.textContent =
              "Another preset with this name already exists.";
            errorP.classList.remove("hidden");
            nameInput?.focus();
            return;
          }

          const updatedPreset = await supabaseEditPreset(
            presetIdToEdit,
            updatedName
          );
          if (updatedPreset) {
            hideModal();
            // Update the option text in the selector immediately
            const option = dom.presetSelector.querySelector(
              `option[value="${updatedPreset.id}"]`
            );
            if (option) {
              option.textContent = updatedPreset.name;
            }
            // Update the cache as well
            const index = userPresetsCache.findIndex(
              (p) => p.id === updatedPreset.id
            );
            if (index !== -1) {
              userPresetsCache[index].name = updatedPreset.name;
            }
            handlePresetSelectorChange(dom.presetSelector); // Trigger content load to refresh UI if name changes.
          } else {
            errorP.textContent =
              "Failed to update preset. It might no longer exist or you lack permission.";
            errorP.classList.remove("hidden");
          }
        },
      },
    ]
  );
  setTimeout(() => {
    const nameInput = document.getElementById("edit-preset-name-input");
    nameInput?.focus();
    nameInput?.select();
  }, 100);
}

/**
 * Handles deleting the selected preset (opens confirmation modal).
 */
export function handleDeletePreset() {
  const presetIdToDelete = dom.presetSelector?.value;
  const presetNameToDelete =
    dom.presetSelector?.options[dom.presetSelector.selectedIndex]
      ?.textContent || "Unknown Preset";

  if (!supabaseClient) {
    showModal("Feature Unavailable", "Cannot delete presets while offline.");
    return;
  }
  if (!presetIdToDelete || presetIdToDelete === DEFAULT_PRESET_ID) {
    showModal(
      "Cannot Delete",
      "The default preset cannot be deleted, or no user preset is selected."
    );
    return;
  }

  showModal(
    "Confirm Deletion",
    `<p>Are you sure you want to delete the preset "<strong>${presetNameToDelete}</strong>"?</p><p>This action cannot be undone.</p>`,
    [
      { text: "Cancel", class: "bg-gray-700 hover:bg-gray-600" },
      {
        text: "Delete Preset",
        class: "bg-button-remove hover:bg-red-700 text-white",
        onClick: async () => {
          const success = await supabaseDeletePreset(presetIdToDelete);
          if (success) {
            hideModal();
            await populatePresetSelector(); // Re-populate and auto-selects first available (or default)
            // handlePresetSelectorChange is called inside populatePresetSelector for the new selection
          } else {
            // Error handled by supabaseApi.handleSupabaseError
            showModal(
              "Error",
              "Failed to delete preset. Please try again.",
              null,
              true
            );
          }
        },
      },
    ]
  );
}

/**
 * Updates the state of the Add/Edit/Delete preset buttons based on current selection.
 * @param {string | null} selectedPresetId - The ID of the currently selected preset.
 */
export function updatePresetCrudButtons(selectedPresetId) {
  const isDefault = selectedPresetId === DEFAULT_PRESET_ID;
  const canInteractWithSupabase = !!supabaseClient;

  // Add Preset button
  if (dom.addPresetBtn) {
    dom.addPresetBtn.disabled = !canInteractWithSupabase;
    dom.addPresetBtn.style.opacity = canInteractWithSupabase ? "1" : "0.5";
    dom.addPresetBtn.style.cursor = canInteractWithSupabase
      ? "pointer"
      : "not-allowed";
  }

  // Edit/Delete buttons (only visible for user-created presets, not default, and if Supabase is connected)
  [dom.editPresetBtn, dom.deletePresetBtn].forEach((btn) => {
    if (btn) {
      if (canInteractWithSupabase && !isDefault && selectedPresetId) {
        btn.classList.remove("hidden");
        btn.disabled = false;
      } else {
        btn.classList.add("hidden");
        btn.disabled = true;
      }
    }
  });
}

/**
 * Central handler for preset selector changes. Dispatches 'loadPresetContent' event.
 * @param {HTMLSelectElement} selectElement - The select dropdown element.
 */
export function handlePresetSelectorChange(selectElement) {
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const presetId = selectedOption?.value;
  const presetName = selectedOption?.textContent;

  if (!presetId) {
    console.warn(
      "Preset selector change event without a valid selected option."
    );
    return;
  }

  setCurrentActivePreset({ id: presetId, name: presetName }); // Update global active preset state

  // Update CRUD buttons immediately on selection change
  updatePresetCrudButtons(presetId);

  // Dispatch the event that itemInteractions.js listens for to render content
  document.body.dispatchEvent(
    new CustomEvent("loadPresetContent", {
      detail: { presetId: presetId, presetName: presetName }, // Pass full detail for convenience
    })
  );
}
