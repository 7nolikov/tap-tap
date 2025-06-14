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
import { renderPresetFromLocalData } from "./itemInteractions.js";
import { supabaseClient } from "./supabaseApi.js"; // Import supabaseClient directly for checks
import { telegramWebApp, isGuestMode } from "./telegram.js"; // For user ID and guest mode checks

/**
 * Manages the logic for populating the preset selector and handling CRUD operations for presets.
 */

/**
 * Populates the preset selector dropdown with default and user presets.
 */
export async function populatePresetSelector() {
  if (!dom.presetSelector) {
    console.error("Preset selector DOM element not found!");
    return;
  }
  dom.presetSelector.innerHTML = ""; // Clear existing options

  // Always add Default Grocery List first
  const defaultOption = document.createElement("option");
  defaultOption.value = DEFAULT_PRESET_ID;
  defaultOption.textContent = window.defaultGroceryData?.name || "Grocery List";
  dom.presetSelector.appendChild(defaultOption);

  if (supabaseClient) {
    // Check if supabaseClient is available before trying to fetch
    const fetchedPresets = await fetchUserPresets(); // This function updates userPresetsCache internally
    // userPresetsCache is already updated by fetchUserPresets, so no need for `setUserPresetsCache` here
    fetchedPresets.forEach((preset) => {
      // Ensure we don't duplicate the default preset if it happens to be fetched (unlikely by design)
      if (preset.id === DEFAULT_PRESET_ID) return;

      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.name;
      dom.presetSelector.appendChild(option);
    });
  } else {
    dom.categoriesPlaceholder?.classList.remove("hidden");
    dom.categoriesPlaceholder.innerHTML =
      'Supabase not connected.<br>Only local "Grocery List" is available.<br>Online features (saving, loading other presets) are disabled.';
    console.info(
      "Supabase not connected. Displaying message in categories placeholder."
    );
  }

  // Set initial selection and trigger content load for the first preset
  if (dom.presetSelector.options.length > 0) {
    dom.presetSelector.selectedIndex = 0;
    // Trigger the change handler manually for initial load
    handlePresetSelectorChange(dom.presetSelector);
  } else {
    dom.categoriesPlaceholder.textContent = "No presets available to load.";
    updatePresetCrudButtons(null); // No presets, disable CRUD buttons
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
            handlePresetSelectorChange(dom.presetSelector);
          }
        },
        hideOnClick: false, // Keep modal open to show loading/error
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

          const existingCheck = userPresetsCache.find(
            (p) =>
              p.id !== presetIdToEdit &&
              p.name.toLowerCase() === updatedName.toLowerCase()
          );
          if (
            existingCheck ||
            (DEFAULT_PRESET_ID !== presetIdToEdit &&
              window.defaultGroceryData?.name.toLowerCase() ===
                updatedName.toLowerCase())
          ) {
            errorP.textContent =
              "Another preset with this name already exists.";
            errorP.classList.remove("hidden");
            nameInput?.focus();
            return;
          }

          const updatedPreset = await supabaseEditPreset(
            presetIdToEdit,
            updatedName
          ); // Call supabaseApi function
          if (updatedPreset) {
            hideModal();
            await populatePresetSelector();
            dom.presetSelector.value = updatedPreset.id;
            handlePresetSelectorChange(dom.presetSelector);
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
          const success = await supabaseDeletePreset(presetIdToDelete); // Call supabaseApi function
          if (success) {
            hideModal();
            await populatePresetSelector();
            // After deletion, typically select the default or first available preset
            dom.presetSelector.value = DEFAULT_PRESET_ID;
            handlePresetSelectorChange(dom.presetSelector);
          } else {
            // Error handled by supabaseApi.handleSupabaseError
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
  const isValidUserPresetSelected =
    selectedPresetId &&
    !isDefault &&
    userPresetsCache.some((p) => p.id === selectedPresetId);
  const canInteractWithSupabase = !!supabaseClient;

  if (dom.addPresetBtn) {
    dom.addPresetBtn.disabled = !canInteractWithSupabase;
    dom.addPresetBtn.style.opacity = canInteractWithSupabase ? "1" : "0.5";
    dom.addPresetBtn.style.cursor = canInteractWithSupabase
      ? "pointer"
      : "not-allowed";
  }

  [dom.editPresetBtn, dom.deletePresetBtn].forEach((btn) => {
    if (btn) {
      if (canInteractWithSupabase && isValidUserPresetSelected) {
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

  document.body.dispatchEvent(
    new CustomEvent("loadPresetContent", {
      detail: { presetId, presetName },
    })
  );
}
