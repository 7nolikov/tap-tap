// --- Global State & Constants ---
const DEFAULT_PRESET_ID = "default_grocery_list_001";
const MOCK_TELEGRAM_USER_ID = "123456789"; // Placeholder. For production, ensure this is dynamically retrieved.

let selectedItems = {};
let currentActivePreset = { id: null, name: "Loading..." }; // Combine ID and name for clarity
let userPresetsCache = []; // Stores fetched user presets: [{id: '...', name: '...'}, ...]

// Action IDs for dropdown options (good for clarity, keep as const)
const ACTION_SEPARATOR_ID = "action_manage_separator";
const ACTION_CREATE_NEW_ID = "action_create_new_preset";
const ACTION_EDIT_SELECTED_ID = "action_edit_selected_preset";
const ACTION_DELETE_SELECTED_ID = "action_delete_selected_preset";

// --- DOM Elements Cache ---
// Initial caching of all relevant DOM elements for performance
const dom = {
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

  // Modal elements (dynamically cached for robustness if structure changes/loads late)
  genericModal: null,
  genericModalPanel: null,
  genericModalTitle: null,
  genericModalCloseBtn: null,
  genericModalContent: null,
  genericModalFooter: null,
};

// --- Supabase and Telegram WebApp Initialization ---
// Select the Supabase client: prefer window.supabaseClient, fallback to window.supabase
const supabaseClient = window.supabaseClient || window.supabase;
if (!supabaseClient) {
  console.warn(
    "Supabase client not found. Backend features will be limited or disabled."
  );
}

let telegramWebApp = null;
let isGuestMode = false; // True if Telegram WebApp fails or isn't present

/**
 * Initializes the Telegram WebApp.
 * Sets `telegramWebApp` and `isGuestMode` accordingly.
 */
function initializeTelegramWebApp() {
  if (window.Telegram?.WebApp) {
    // Use optional chaining for safer access
    try {
      telegramWebApp = window.Telegram.WebApp;
      console.log("Telegram WebApp initialized successfully");
      telegramWebApp.expand(); // Always expand
      return; // Success, no need for else block
    } catch (error) {
      console.warn("Error initializing Telegram WebApp:", error);
      isGuestMode = true;
    }
  } else {
    console.log("Running in guest mode (no Telegram WebApp detected).");
    isGuestMode = true;
  }
}

/**
 * Caches and sets up event listener for modal elements.
 * Called on DOMContentLoaded.
 */
function cacheAndSetupModalElements() {
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

  dom.genericModalCloseBtn?.addEventListener("click", hideModal); // Use addEventListener
}

// --- Modal Control Functions (showModal, hideModal) ---
function showModal(title, contentHTML, footerButtonsConfig = []) {
  if (!dom.genericModal || !dom.genericModalPanel) {
    console.error("Modal elements not found in DOM for display.");
    return;
  }
  dom.genericModalTitle.textContent = title;
  dom.genericModalContent.innerHTML = contentHTML;
  dom.genericModalFooter.innerHTML = ""; // Clear previous buttons

  footerButtonsConfig.forEach((btnConfig) => {
    const button = document.createElement("button");
    button.textContent = btnConfig.text;
    // Use template literals for cleaner class string
    button.className = `px-4 py-2 text-sm rounded-md transition-colors ${
      btnConfig.class || "bg-gray-600 hover:bg-gray-500 text-text-primary"
    }`;
    button.onclick = () => {
      // Keep onclick for simplicity with dynamic buttons
      btnConfig.onClick?.(); // Call onClick if it exists
      if (btnConfig.hideOnClick !== false) hideModal();
    };
    dom.genericModalFooter.appendChild(button);
  });

  dom.genericModal.classList.remove("hidden", "opacity-0");
  dom.genericModalPanel.classList.remove("opacity-0", "scale-95");
  dom.genericModalPanel.classList.add("opacity-100", "scale-100");
}

function hideModal() {
  if (!dom.genericModal || !dom.genericModalPanel) return;

  dom.genericModal.classList.add("opacity-0");
  dom.genericModalPanel.classList.remove("opacity-100", "scale-100");
  dom.genericModalPanel.classList.add("opacity-0", "scale-95");

  setTimeout(() => {
    dom.genericModal.classList.add("hidden");
    dom.genericModalContent.innerHTML = "";
    dom.genericModalFooter.innerHTML = "";
  }, 300); // Match CSS transition duration
}

// --- Preset Content Loading & UI Management ---
document.body.addEventListener("loadPresetContent", (event) => {
  const { presetId, presetName } = event.detail || {};
  if (!presetId) {
    console.error("loadPresetContent event triggered without presetId.");
    return;
  }

  currentActivePreset = { id: presetId, name: presetName || "Selected List" };
  console.log(
    `Loading content for preset: ${currentActivePreset.name} (ID: ${currentActivePreset.id})`
  );

  resetSelectedItemsAndUI(); // Assumed function to clear selections and update UI
  dom.categoriesPlaceholder?.classList.remove("hidden");
  dom.categoriesPlaceholder.textContent = "Loading items...";
  if (dom.categoriesContainer) dom.categoriesContainer.innerHTML = "";

  if (currentActivePreset.id === DEFAULT_PRESET_ID) {
    console.log("Rendering default grocery list from local data.");
    if (window.defaultGroceryData) {
      renderPresetFromLocalData(
        window.defaultGroceryData,
        "categories-container"
      ); // Assumed function
      dom.categoriesPlaceholder?.classList.add("hidden");
    } else {
      console.error("Default grocery data not found!");
      dom.categoriesPlaceholder.textContent = "Error: Default data missing.";
    }
  } else if (supabaseClient) {
    // Use supabaseClient directly
    const userPresetData = userPresetsCache.find(
      (p) => p.id === currentActivePreset.id
    );
    if (userPresetData) {
      console.log(`Activating user preset '${currentActivePreset.name}'.`);
      if (userPresetData.categories?.length > 0) {
        // Optional chaining for categories
        renderPresetFromLocalData(userPresetData, "categories-container");
        dom.categoriesPlaceholder?.classList.add("hidden");
      } else {
        dom.categoriesContainer.innerHTML = `<p class="text-center text-gray-500 py-10 non-selectable">This preset has no items yet. Add some!</p>`;
        dom.categoriesPlaceholder?.classList.add("hidden");
      }
    } else {
      console.warn(
        `User preset ID '${currentActivePreset.id}' not found in cache.`
      );
      dom.categoriesContainer.innerHTML = `<p class="text-center text-red-500 py-10 non-selectable">Error: Preset "${currentActivePreset.name}" not found.</p>`;
      dom.categoriesPlaceholder?.classList.add("hidden");
    }
  } else {
    console.warn(
      "Attempted to load a non-default preset while Supabase is not connected."
    );
    dom.categoriesPlaceholder.textContent =
      "Supabase connection is required to load this preset.";
  }
  updatePresetCrudButtons(currentActivePreset.id);
});

/**
 * Handles errors from Edge Functions or Supabase operations.
 */
function handleSupabaseError(error, operation) {
  console.error(`Error during ${operation}:`, error);
  const errorMessage = error.message || "An unexpected error occurred";
  const errorDetails =
    typeof error.details === "string"
      ? error.details
      : JSON.stringify(error.details, null, 2);

  showModal(
    "Operation Failed",
    `<div class="text-red-500">
            <p class="font-semibold">${errorMessage}</p>
            ${
              errorDetails
                ? `<pre class="mt-2 text-sm bg-red-50 p-2 rounded">${errorDetails}</pre>`
                : ""
            }
        </div>`
  );
}

/**
 * Fetches user presets from the Supabase Edge Function.
 * Handles guest mode and Supabase client availability.
 */
async function fetchUserPresets() {
  console.log("Fetching user presets...");

  if (isGuestMode || !supabaseClient?.functions?.invoke) {
    // Check both conditions at once
    const reason = isGuestMode
      ? "Guest mode"
      : "Supabase functions unavailable";
    console.log(`${reason}: Returning default preset.`);
    // Consider a small delay if it's the very first call and Telegram is still initializing
    if (!isGuestMode && !telegramWebApp)
      await new Promise((r) => setTimeout(r, 500));
    if (!isGuestMode && !telegramWebApp && !initializeTelegramWebApp()) {
      // If Telegram fails to initialize even after waiting
      console.warn(
        "Telegram WebApp not available after waiting. Using default data."
      );
    }
    return [
      {
        id: DEFAULT_PRESET_ID,
        name: window.defaultGroceryData?.name || "Grocery List",
      },
    ];
  }

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "db-operations",
      {
        method: "POST",
        body: {
          operation: "preset",
          action: "read",
          userId:
            telegramWebApp?.initDataUnsafe?.user?.id || MOCK_TELEGRAM_USER_ID,
        },
      }
    );

    if (error) throw error;
    console.log("Successfully fetched user presets:", data);
    return data || [];
  } catch (error) {
    handleSupabaseError(error, "fetching presets");
    return [
      {
        id: DEFAULT_PRESET_ID,
        name: window.defaultGroceryData?.name || "Grocery List",
      },
    ];
  }
}

/**
 * Handles saving (creating) a new preset.
 */
async function handleSavePreset() {
  if (isGuestMode) {
    showModal(
      "Feature Unavailable",
      "Creating new presets is only available in Telegram."
    );
    return;
  }
  if (!supabaseClient?.functions?.invoke) {
    handleSupabaseError(
      { message: "Supabase functions are not available." },
      "creating preset"
    );
    return;
  }

  const input = document.getElementById("new-preset-name-input");
  const errorP = document.getElementById("create-preset-error");
  const newName = input?.value.trim() || "";

  if (!newName) {
    if (errorP) {
      errorP.textContent = "Preset name cannot be empty.";
      htmx.removeClass(errorP, "hidden");
    }
    return;
  }
  errorP?.classList.add("hidden"); // Use classList for consistency

  try {
    const { data: newPreset, error } = await supabaseClient.functions.invoke(
      "db-operations",
      {
        method: "POST",
        body: {
          operation: "preset",
          action: "create",
          userId:
            telegramWebApp?.initDataUnsafe?.user?.id || MOCK_TELEGRAM_USER_ID,
          data: { name: newName },
        },
      }
    );

    if (error) throw error;
    console.log("Successfully created new preset:", newPreset);
    hideModal();
    await populatePresetSelector(); // Refresh and re-select
    dom.presetSelector.value = newPreset.id;
    handlePresetSelectorChange(dom.presetSelector);
  } catch (error) {
    handleSupabaseError(error, "creating preset");
  }
}

/**
 * Populates the preset selector dropdown with default and user presets.
 */
async function populatePresetSelector() {
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
    userPresetsCache = await fetchUserPresets();
    userPresetsCache.forEach((preset) => {
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
    handlePresetSelectorChange(dom.presetSelector);
  } else {
    dom.categoriesPlaceholder.textContent = "No presets available to load.";
    updatePresetCrudButtons(null);
  }
}

/**
 * Handles adding a new preset (opens modal).
 */
function handleAddPreset() {
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
        onClick: handleSavePreset,
        hideOnClick: false,
      },
    ]
  );
}

/**
 * Handles editing the selected preset (opens modal).
 */
function handleEditPreset() {
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

          try {
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

            // NOTE: Using .eq('telegram_user_id', MOCK_TELEGRAM_USER_ID) here is likely redundant
            // if RLS is correctly set up on 'presets' using `auth.uid() = user_id`.
            // Ensure your Supabase RLS policies are the primary defense.
            const { data, error } = await supabaseClient
              .from("presets")
              .update({ name: updatedName })
              .eq("id", presetIdToEdit)
              .eq("user_id", telegramWebApp?.initDataUnsafe?.user?.id); // Assuming user_id is the actual Supabase user ID

            if (error) throw error;

            if (data?.length > 0) {
              console.log("Preset updated successfully:", data[0]);
              const cacheIndex = userPresetsCache.findIndex(
                (p) => p.id === presetIdToEdit
              );
              if (cacheIndex !== -1) userPresetsCache[cacheIndex] = data[0];
              await populatePresetSelector();
              dom.presetSelector.value = data[0].id;
              handlePresetSelectorChange(dom.presetSelector);
              hideModal();
            } else {
              errorP.textContent =
                "Failed to update preset. It might no longer exist or you lack permission.";
              errorP.classList.remove("hidden");
            }
          } catch (e) {
            handleSupabaseError(e, "updating preset");
          }
        },
      },
    ]
  );
  // Focus and select text in input after modal is displayed
  setTimeout(() => {
    const nameInput = document.getElementById("edit-preset-name-input");
    nameInput?.focus();
    nameInput?.select();
  }, 100);
}

/**
 * Handles deleting the selected preset (opens confirmation modal).
 */
function handleDeletePreset() {
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
          try {
            // NOTE: Same note about user_id vs telegram_user_id applies here.
            const { error } = await supabaseClient
              .from("presets")
              .delete()
              .eq("id", presetIdToDelete)
              .eq("user_id", telegramWebApp?.initDataUnsafe?.user?.id); // Assuming user_id is the actual Supabase user ID

            if (error) throw error;

            console.log(
              `Preset '${presetNameToDelete}' (ID: ${presetIdToDelete}) deleted successfully.`
            );
            userPresetsCache = userPresetsCache.filter(
              (p) => p.id !== presetIdToDelete
            );
            await populatePresetSelector();
            hideModal();
          } catch (e) {
            handleSupabaseError(e, "deleting preset");
          }
        },
      },
    ]
  );
}

/**
 * Updates the state of the Add/Edit/Delete preset buttons based on current selection.
 */
function updatePresetCrudButtons(selectedPresetId) {
  const isDefault = selectedPresetId === DEFAULT_PRESET_ID;
  const isValidUserPresetSelected =
    selectedPresetId &&
    !isDefault &&
    userPresetsCache.some((p) => p.id === selectedPresetId);
  const canInteractWithSupabase = !!supabaseClient; // Check if supabaseClient is defined

  // Add button: Always enabled if Supabase is connected
  dom.addPresetBtn.disabled = !canInteractWithSupabase;
  dom.addPresetBtn.style.opacity = canInteractWithSupabase ? "1" : "0.5";
  dom.addPresetBtn.style.cursor = canInteractWithSupabase
    ? "pointer"
    : "not-allowed";

  // Edit/Delete buttons: Only enabled for user-owned presets when Supabase is connected
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
 * Central handler for preset selector changes.
 */
function handlePresetSelectorChange(selectElement) {
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const presetId = selectedOption?.value;
  const presetName = selectedOption?.textContent;

  if (!presetId) {
    // Handles cases where no option is selected or element not found
    console.warn(
      "Preset selector change event without a valid selected option."
    );
    return;
  }

  // Dispatch event to load content
  document.body.dispatchEvent(
    new CustomEvent("loadPresetContent", {
      detail: { presetId, presetName },
    })
  );
}

// --- sendList Function (for Telegram integration) ---
function sendList() {
  if (!selectedItems || Object.keys(selectedItems).length === 0) {
    telegramWebApp?.showAlert("Please select at least one item to send.");
    return;
  }

  // Assumed function to format the list for Telegram
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
    // Fallback for guest mode or development, maybe copy to clipboard or display
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

// --- Initial setup when DOM is ready ---
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM fully loaded and parsed. Initializing app.");

  initializeTelegramWebApp();
  cacheAndSetupModalElements(); // Renamed and consolidated modal setup

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

  console.log("App.js initialized.");
});

// --- Ensure necessary functions are globally available if called from HTML attributes ---
// These are often needed if your HTML uses 'onclick="functionName()"' directly.
// For modern HTMX/JS, 'addEventListener' is preferred where possible.
window.handlePresetSelectorChange = handlePresetSelectorChange; // For onchange in HTML select
window.sendList = sendList; // For send button in HTML

// IMPORTANT: Assumed functions from previous contexts must be defined elsewhere:
// - `resetSelectedItemsAndUI()`
// - `renderPresetFromLocalData(data, containerId)`
// - `formatListForTelegram(selectedItems)`
// - `htmx` (library, likely global `window.htmx`)
// - `window.defaultGroceryData` (object holding the default grocery list structure)
// - `triggerItemAnimation`, `incrementOrSelectItem`, `decrementItem`, `updateItemUIDisplay`, `updateSendButtonVisibilityAndPreview`

// --- Functions for rendering and item interaction ---

/**
 * Renders a preset's categories and items from local data into the specified container.
 * @param {Object} presetData - The preset object containing categories and items.
 * @param {string} containerId - The ID of the HTML element to render into.
 */
function renderPresetFromLocalData(presetData, containerId) {
  const container = dom.categoriesContainer; // Use cached DOM element
  if (!container) {
      console.error(`Container with ID ${containerId} not found for rendering local data.`);
      return;
  }

  container.innerHTML = '';
  resetSelectedItemsAndUI();

  if (!presetData || !presetData.categories || presetData.categories.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500 py-10 non-selectable">No categories or items in this preset.</p>';
      dom.categoriesPlaceholder?.classList.add('hidden');
      return;
  }

  presetData.categories.forEach(category => {
      const section = document.createElement('section');
      // Use color_coding for border color (assuming Tailwind class format or direct style)
      section.className = `bg-container-bg p-4 rounded-lg shadow-lg mb-4 border-l-4` +
                          ` ${category.color_coding ? `border-[${category.color_coding}]` : 'border-gray-600'}`; // Dynamic Tailwind color
      section.style.borderColor = category.color_coding || '#CCCCCC'; // Fallback for direct style if Tailwind doesn't compile dynamic class

      const title = document.createElement('h2');
      title.className = `text-xl font-semibold mb-4 non-selectable text-text-primary`; // Assuming text-primary is default text color
      title.textContent = category.name;
      section.appendChild(title);

      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'space-y-3';

      if (category.items && category.items.length > 0) {
          category.items.forEach(item => {
              // Ensure unique and valid HTML ID
              const itemElementId = `item-${presetData.id}-${category.id}-${item.id}`.replace(/[^a-zA-Z0-9-_]/g, '-');
              const itemDiv = document.createElement('div');
              itemDiv.id = itemElementId;
              // Store incrementStep and unit in dataset for easy retrieval without re-parsing
              itemDiv.dataset.incrementStep = item.increment_step_value || '1.0';
              itemDiv.dataset.unitOfMeasure = item.unit_of_measure || '';
              itemDiv.dataset.itemName = item.name; // Store full name for display logic

              // Initial display
              updateItemUIDisplay(item.id, item.name, item.unit_of_measure, itemElementId, item.increment_step_value);

              // Attach main click listener for incrementing/selecting
              itemDiv.onclick = () => incrementOrSelectItem(
                  item.id,
                  item.name,
                  item.unit_of_measure,
                  itemElementId,
                  parseFloat(item.increment_step_value || '1.0') // Pass the actual step value
              );
              itemsContainer.appendChild(itemDiv);
          });
      } else {
          const noItemsP = document.createElement('p');
          noItemsP.className = 'text-sm text-gray-500 non-selectable text-center py-4'; // Added text-center
          noItemsP.textContent = 'No items in this category yet. Click "Edit Preset" to add some.';
          itemsContainer.appendChild(noItemsP);
      }
      section.appendChild(itemsContainer);
      container.appendChild(section);
  });
  dom.categoriesPlaceholder?.classList.add('hidden');
  console.log("Local preset data rendered.");
}

/**
* Triggers a visual animation on an item element.
* @param {string} itemElementId - The ID of the item's DOM element.
* @param {'flash' | 'remove'} animationType - Type of animation to apply.
*/
function triggerItemAnimation(itemElementId, animationType = 'flash') {
  const itemElement = document.getElementById(itemElementId);
  if (!itemElement) return;

  if (animationType === 'flash') {
      itemElement.classList.add('animate-flash');
      setTimeout(() => itemElement.classList.remove('animate-flash'), 300);
  } else if (animationType === 'remove') {
      itemElement.classList.add('animate-remove');
      // No setTimeout for removal here, caller should handle update after animation
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
function incrementOrSelectItem(itemId, itemName, unit, itemElementId, itemIncrementStep = 1) {
  const step = Number(itemIncrementStep) || 1; // Ensure step is a number

  if (!selectedItems[itemId]) {
      selectedItems[itemId] = {
          name: itemName,
          quantity: 0,
          unit: unit,
          incrementStep: step
      };
  }
  selectedItems[itemId].quantity += step;

  // Handle floating point precision for quantity
  const { quantity } = selectedItems[itemId];
  const stepDecimals = (String(step).split('.')[1] || '').length;
  const currentDecimals = (String(quantity).split('.')[1] || '').length;
  const precision = Math.max(stepDecimals, currentDecimals);
  selectedItems[itemId].quantity = parseFloat(quantity.toFixed(precision));

  updateItemUIDisplay(itemId, itemName, unit, itemElementId);
  updateSendButtonVisibilityAndPreview();
  triggerItemAnimation(itemElementId, 'flash');
}

/**
* Decrements an item's quantity. Removes item if quantity drops to 0 or less.
* @param {string} itemId - The unique ID of the item.
* @param {string} itemName - The full name of the item.
* @param {string} unit - The unit of measure.
* @param {string} itemElementId - The DOM ID of the item's container.
* @param {Event} event - The click event to stop propagation.
*/
function decrementItem(itemId, itemName, unit, itemElementId, event) {
  // Stop event propagation to prevent triggering parent item's onclick (increment)
  event?.stopPropagation();

  if (selectedItems[itemId]) {
      const step = Number(selectedItems[itemId].incrementStep) || 1;
      selectedItems[itemId].quantity -= step;

      const { quantity } = selectedItems[itemId];
      const stepDecimals = (String(step).split('.')[1] || '').length;
      const currentDecimals = (String(quantity).split('.')[1] || '').length;
      const precision = Math.max(stepDecimals, currentDecimals);
      selectedItems[itemId].quantity = parseFloat(quantity.toFixed(precision));

      if (selectedItems[itemId].quantity <= 0) {
          delete selectedItems[itemId];
          triggerItemAnimation(itemElementId, 'remove');
          // Wait for removal animation to complete before updating display and send button
          setTimeout(() => {
              updateItemUIDisplay(itemId, itemName, unit, itemElementId);
              updateSendButtonVisibilityAndPreview();
          }, 300); // Match animation duration
      } else {
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
function updateItemUIDisplay(itemId, itemName, unit, itemElementId) {
  const itemElement = document.getElementById(itemElementId);
  if (!itemElement) return;

  itemElement.classList.remove('animate-flash', 'animate-remove'); // Clear any lingering animation classes

  const itemData = selectedItems[itemId];
  // Extract icon and actual item name from the full name
  const [itemIcon, ...nameParts] = itemName.split(' ');
  const actualItemName = nameParts.join(' ');
  const displayUnit = unit || ''; // Handle cases where unit might be empty

  if (itemData && itemData.quantity > 0) {
      // Item is selected/has quantity
      itemElement.className = 'flex items-center justify-between p-3 bg-accent/20 border border-accent rounded-md transition-all duration-150 ease-in-out';
      // Note: onclick is already set in renderPresetFromLocalData. If it needs to change behavior (e.g. to just increment),
      // it would be re-assigned here. For now, assume it always increments.
      itemElement.innerHTML = `
          <div class="flex items-center flex-grow min-w-0">
              <span class="text-xl mr-3 non-selectable">${itemIcon}</span>
              <span class="text-text-primary truncate non-selectable">${actualItemName}</span>
          </div>
          <div class="flex items-center flex-shrink-0 ml-2 space-x-2">
              <button onclick="decrementItem('${itemId}', '${itemName}', '${unit}', '${itemElementId}', event)" 
                      class="w-8 h-8 flex items-center justify-center text-lg bg-accent text-white rounded-full transition-colors hover:bg-accent-darker focus:outline-none focus:ring-2 focus:ring-accent-darker focus:ring-opacity-50">
                  -
              </button>
              <span class="text-text-primary w-16 text-center text-lg font-semibold non-selectable">${itemData.quantity} ${displayUnit}</span>
          </div>`;
  } else {
      // Item is not selected/quantity is zero
      itemElement.className = 'flex items-center justify-between p-3 bg-item-bg rounded-md hover:bg-gray-700/50 cursor-pointer transition-all duration-150 ease-in-out';
      // onclick is already correctly set in renderPresetFromLocalData.
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
function updateSendButtonVisibilityAndPreview() {
  const itemCount = Object.keys(selectedItems).length;
  if (!dom.sendButtonContainer || !dom.sendButton || !dom.selectedItemsPreview) return;

  if (itemCount > 0) {
      dom.sendButtonContainer.classList.remove('hidden');
      dom.sendButton.disabled = false;
      // Format for preview: "Item1: Qty1 Unit1, Item2: Qty2 Unit2..."
      const preview = Object.values(selectedItems)
          .map(item => {
              const [, ...nameParts] = item.name.split(' '); // Remove icon for preview
              return `${nameParts.join(' ')}: ${item.quantity} ${item.unit}`;
          })
          .join(', ');
      dom.selectedItemsPreview.textContent = `Selected: ${preview}`;
  } else {
      dom.sendButtonContainer.classList.add('hidden');
      dom.sendButton.disabled = true;
      dom.selectedItemsPreview.textContent = '';
  }
}

/**
* Resets all selected items and clears the send button UI.
*/
function resetSelectedItemsAndUI() {
  selectedItems = {}; // Reset to an empty object
  updateSendButtonVisibilityAndPreview();
  // When a new preset is loaded, the category container is re-rendered,
  // so we don't need to manually clear out the UI state of each item element here.
}

/**
* Formats the selected items into a string suitable for Telegram message.
* @param {Object} items - The selectedItems object.
* @returns {string} Formatted string.
*/
function formatListForTelegram(items) {
  let message = `*QuickShare List: ${currentActivePreset.name}*\n\n`;
  let categoriesMap = new Map(); // Map to store items grouped by their original category for display

  // Assuming you have a way to get the category name from item data or from initial rendering.
  // For this example, we'll just list them simply. For more robust grouping,
  // the `selectedItems` would need to store `categoryId` and `categoryName`.
  Object.values(items).forEach(item => {
      const [, ...nameParts] = item.name.split(' '); // Remove icon
      const itemNameWithoutIcon = nameParts.join(' ');
      message += `- ${itemNameWithoutIcon}: ${item.quantity} ${item.unit}\n`;
  });

  message += `\n_Sent from QuickShare List Mini App_`;
  return message;
}

// --- HTMX and Alpine.js Integrations ---
console.log("App.js loaded. Preset management reverted to dropdown with modal controls.");

// Example of how you might use HTMX events with JavaScript
document.body.addEventListener('htmx:afterSwap', function(event) {
  console.log('HTMX content swapped:', event.detail.target);
  // If HTMX loads new content that contains items, you might need to re-attach
  // click handlers or re-run parts of renderPresetFromLocalData for existing items
  // to ensure their interactive state is correct. This depends on HTMX's behavior.
});

// Alpine.js integration: Keep Alpine's init hook as is
document.addEventListener('alpine:init', () => {
  Alpine.data('appData', () => ({
      init() {
          console.log('Alpine.js initialized with appData.');
          if (window.Telegram?.WebApp) {
              console.log('Telegram WebApp is available within Alpine context.');
              // Telegram.WebApp.sendData('Hello from Mini App!'); // Example
          }
      },
      showTelegramUserInfo() {
          if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
              const user = Telegram.WebApp.initDataUnsafe.user;
              // Using Telegram WebApp.showAlert instead of alert for better UX
              Telegram.WebApp.showAlert(`Hello, ${user.first_name}! Your user ID is ${user.id}.`);
          } else {
              Telegram.WebApp.showAlert('Telegram user data not available.');
          }
      }
  }));
});

// --- Utility functions (ensure all necessary global functions are defined if HTML uses them directly) ---

// Unused function, can be removed or used if needed for dynamic styling
function updatePresetTitleStyle() {
  const presetTitle = document.querySelector('.preset-title');
  if (presetTitle) {
      presetTitle.classList.add(
          'bg-accent',
          'hover:bg-accent-darker',
          'text-white',
          'px-4',
          'py-2',
          'rounded-md',
          'font-medium',
          'transition-colors',
          'duration-200'
      );
  }
}