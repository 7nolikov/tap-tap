// Supabase Client Check
let isSupabaseConnected = false;
if (window.supabaseClient) {
    isSupabaseConnected = true;
    console.log("Supabase client is available via window.supabaseClient.");
} else {
    console.warn("Supabase client (window.supabaseClient) not found. Backend features will be limited or disabled.");
}

// Global state
let selectedItems = {}; 
let currentActivePresetId = null; // Will be set by loadPresetContent, initially from default
let currentActivePresetName = "Loading..."; // Will be set by loadPresetContent
let userPresetsCache = []; // To store fetched user presets: [{id: '...', name: '...'}, ...]

const DEFAULT_PRESET_ID = 'default_grocery_list_001';
const MOCK_TELEGRAM_USER_ID = '123456789'; // Placeholder for actual Telegram User ID

// Action IDs for dropdown options
const ACTION_SEPARATOR_ID = 'action_manage_separator';
const ACTION_CREATE_NEW_ID = 'action_create_new_preset';
const ACTION_EDIT_SELECTED_ID = 'action_edit_selected_preset';
const ACTION_DELETE_SELECTED_ID = 'action_delete_selected_preset';

// DOM Elements Cache
const dom = {
    categoriesContainer: document.getElementById('categories-container'),
    sendButtonContainer: document.getElementById('send-button-container'),
    sendButton: document.getElementById('send-button'),
    selectedItemsPreview: document.getElementById('selected-items-preview'),
    categoriesLoadingIndicator: document.getElementById('categories-loading-indicator'), 
    categoriesPlaceholder: document.getElementById('categories-placeholder'),
    presetSelector: document.getElementById('preset-selector'), // Added back

    // Header CRUD buttons
    addPresetBtn: document.getElementById('add-preset-btn'),
    editPresetBtn: document.getElementById('edit-preset-btn'),
    deletePresetBtn: document.getElementById('delete-preset-btn'),

    // Modal elements
    genericModal: document.getElementById('generic-modal'),
    genericModalPanel: document.getElementById('generic-modal-panel'),
    genericModalTitle: document.getElementById('generic-modal-title'),
    genericModalCloseBtn: document.getElementById('generic-modal-close-btn'),
    genericModalContent: document.getElementById('generic-modal-content'),
    genericModalFooter: document.getElementById('generic-modal-footer')
};

// --- Modal Control Functions (showModal, hideModal) - (Assumed to be present and correct from previous state) ---
function showModal(title, contentHTML, footerButtonsConfig = []) {
    if (!dom.genericModal || !dom.genericModalPanel) {
        console.error("Modal elements not found in DOM.");
        return;
    }
    dom.genericModalTitle.textContent = title;
    dom.genericModalContent.innerHTML = contentHTML;
    dom.genericModalFooter.innerHTML = ''; 
    footerButtonsConfig.forEach(btnConfig => {
        const button = document.createElement('button');
        button.textContent = btnConfig.text;
        button.className = `px-4 py-2 text-sm rounded-md transition-colors ${btnConfig.class || 'bg-gray-600 hover:bg-gray-500 text-text-primary'}`;
        button.onclick = () => {
            if (btnConfig.onClick) btnConfig.onClick();
            if (btnConfig.hideOnClick !== false) {
                 hideModal();
            }
        };
        dom.genericModalFooter.appendChild(button);
    });
    dom.genericModal.classList.remove('hidden');
    setTimeout(() => {
        dom.genericModal.classList.remove('opacity-0');
        dom.genericModalPanel.classList.remove('opacity-0', 'scale-95');
        dom.genericModalPanel.classList.add('opacity-100', 'scale-100');
    }, 10);
}

function hideModal() {
    if (!dom.genericModal || !dom.genericModalPanel) return;
    dom.genericModal.classList.add('opacity-0');
    dom.genericModalPanel.classList.remove('opacity-100', 'scale-100');
    dom.genericModalPanel.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        dom.genericModal.classList.add('hidden');
        dom.genericModalContent.innerHTML = ''; 
        dom.genericModalFooter.innerHTML = '';  
    }, 300);
}
// --- End Modal Control --- 

// Listener for loading preset content (items area)
document.body.addEventListener('loadPresetContent', function(event) {
    if (!event.detail || !event.detail.presetId) {
        console.error('loadPresetContent event triggered without presetId.');
        return;
    }
    currentActivePresetId = event.detail.presetId;
    currentActivePresetName = event.detail.presetName || "Selected List"; 

    console.log(`Loading content for preset: ${currentActivePresetName} (ID: ${currentActivePresetId})`);
    // No direct display update here, selector text serves as title

    resetSelectedItemsAndUI(); 
    if (dom.categoriesPlaceholder) {
        htmx.removeClass(dom.categoriesPlaceholder, 'hidden'); 
        dom.categoriesPlaceholder.textContent = 'Loading items...';
    }
    if (dom.categoriesContainer) dom.categoriesContainer.innerHTML = ''; 

    if (currentActivePresetId === DEFAULT_PRESET_ID) {
        console.log("Rendering default grocery list from local data.");
        if (window.defaultGroceryData) {
            renderPresetFromLocalData(window.defaultGroceryData, 'categories-container');
            if (dom.categoriesPlaceholder) htmx.addClass(dom.categoriesPlaceholder, 'hidden');
        } else {
            console.error("Default grocery data not found!");
            if (dom.categoriesPlaceholder) dom.categoriesPlaceholder.textContent = 'Error: Default data missing.';
        }
    } else if (isSupabaseConnected) { // Only try to load user presets if Supabase is connected
        const userPresetData = userPresetsCache.find(p => p.id === currentActivePresetId);
        if (userPresetData) {
            console.log(`Activating user preset '${currentActivePresetName}'.`);
            if (userPresetData.categories && userPresetData.categories.length > 0) {
                renderPresetFromLocalData(userPresetData, 'categories-container');
                if (dom.categoriesPlaceholder) htmx.addClass(dom.categoriesPlaceholder, 'hidden');
            } else {
                if (dom.categoriesContainer) {
                    dom.categoriesContainer.innerHTML = `<p class="text-center text-gray-500 py-10 non-selectable">Items for "${currentActivePresetName}" would be loaded from the server.</p>`;
                }
                if (dom.categoriesPlaceholder) htmx.addClass(dom.categoriesPlaceholder, 'hidden');
            }
        } else {
            console.warn(`User preset with ID '${currentActivePresetId}' not found in local cache.`);
            if (dom.categoriesContainer) {
                dom.categoriesContainer.innerHTML = `<p class="text-center text-red-500 py-10 non-selectable">Error: Preset "${currentActivePresetName}" (ID: ${currentActivePresetId}) not found locally.</p>`;
            }
            if (dom.categoriesPlaceholder) htmx.addClass(dom.categoriesPlaceholder, 'hidden');
        }
    } else {
        // This case should ideally not be hit if selector is correctly populated when Supabase is offline
        console.warn("Attempted to load a non-default preset while Supabase is not connected.");
        if (dom.categoriesPlaceholder) {
            dom.categoriesPlaceholder.textContent = 'Supabase connection is required to load this preset.';
        }
    }
    updateUserPresetEditUI(currentActivePresetId); // Update button states based on new preset
});

async function fetchUserPresets() {
    console.log("Fetching user presets...");
    if (!isSupabaseConnected || !window.supabaseClient) {
        console.warn("Supabase not connected. Cannot fetch user presets.");
        return []; 
    }
    try {
        console.log(`Fetching presets for Telegram User ID: ${MOCK_TELEGRAM_USER_ID}`);
        const { data, error } = await window.supabaseClient
            .from('presets')
            .select('id, name')
            .eq('telegram_user_id', MOCK_TELEGRAM_USER_ID);

        if (error) {
            console.error("Error fetching user presets:", error);
            showModal("Error Fetching Presets", `Could not load your presets: ${error.message}`);
            return [];
        }
        
        console.log("Fetched user presets from Supabase:", data);
        return data || [];
    } catch (error) {
        console.error("Exception during fetchUserPresets:", error);
        showModal("Error", "An unexpected error occurred while fetching your presets.");
        return [];
    }
}

async function populatePresetSelector() {
    if (!dom.presetSelector) {
        console.error("Preset selector DOM element not found!");
        return;
    }
    dom.presetSelector.innerHTML = ''; // Clear existing options

    // 1. Add Default Grocery List
    if (window.defaultGroceryData) {
        const defaultOption = document.createElement('option');
        defaultOption.value = DEFAULT_PRESET_ID;
        defaultOption.textContent = window.defaultGroceryData.name;
        dom.presetSelector.appendChild(defaultOption);
    } else {
        const errOption = document.createElement('option');
        errOption.value = ""; 
        errOption.textContent = "Error: Default Missing"; 
        errOption.disabled = true;
        dom.presetSelector.appendChild(errOption);
        // If default is missing, critical error, might want to halt further preset loading.
    }

    if (isSupabaseConnected) {
        userPresetsCache = await fetchUserPresets();
        userPresetsCache.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.name;
            dom.presetSelector.appendChild(option);
        });
        if (dom.categoriesPlaceholder && dom.presetSelector.options.length <= 1 && !window.defaultGroceryData) {
            // Only if default is also missing and no user presets loaded
             if (dom.categoriesPlaceholder) dom.categoriesPlaceholder.textContent = 'No presets available.';
        } else if (dom.categoriesPlaceholder && dom.presetSelector.options.length === 1 && window.defaultGroceryData && userPresetsCache.length === 0) {
             // Default is there, but no user presets
             // Message handled by updateUserPresetEditUI or initial load.
        }
    } else {
        // Supabase not connected: Only default preset is shown.
        // User presets cache remains empty.
        if (dom.categoriesPlaceholder) {
            htmx.removeClass(dom.categoriesPlaceholder, 'hidden');
            dom.categoriesPlaceholder.innerHTML = 'Supabase not connected. <br>Only local "Grocery List" is available. <br>Online features (saving, loading other presets) are disabled.';
        }
        console.info("Supabase not connected. Displaying message in categories placeholder instead of modal.");
    }

    // Set initial selection and trigger content load for the first preset in the list
    if (dom.presetSelector.options.length > 0) {
        dom.presetSelector.selectedIndex = 0;
        handlePresetSelectorChange(dom.presetSelector); // This will trigger loadPresetContent & updateUserPresetEditUI
    } else {
        if (dom.categoriesPlaceholder) dom.categoriesPlaceholder.textContent = 'No presets available to load.';
        updateUserPresetEditUI(null); // No presets, so no specific preset ID to pass
    }
}

// Placeholder CRUD Handlers
function handleAddPreset() {
    if (!isSupabaseConnected) {
        showModal("Feature Unavailable", "Cannot create new presets while offline. Please check your connection to Supabase.");
        return;
    }

    const modalContentHTML = `
        <div>
            <label for="new-preset-name-input" class="block text-sm font-medium text-text-primary mb-1">Preset Name:</label>
            <input type="text" id="new-preset-name-input" placeholder="Enter preset name" 
                   class="w-full px-3 py-2 bg-primary-bg border border-gray-600 rounded-md text-text-primary focus:ring-accent focus:border-accent">
            <p id="create-preset-error" class="text-red-500 text-sm mt-1 hidden"></p>
        </div>
    `;

    showModal("Create New Preset", modalContentHTML, [
        { text: "Cancel", class: "bg-gray-700 hover:bg-gray-600" },
        {
            text: "Save Preset", 
            class: "bg-accent hover:bg-accent-darker text-white", 
            hideOnClick: false, // Keep modal open for potential error messages
            onClick: async () => {
                const nameInput = document.getElementById('new-preset-name-input');
                const errorP = document.getElementById('create-preset-error');
                const newName = nameInput.value.trim();

                if (!newName) {
                    errorP.textContent = "Preset name cannot be empty.";
                    errorP.classList.remove('hidden');
                    nameInput.focus();
                    return;
                }
                errorP.classList.add('hidden');

                try {
                    // Check if preset with the same name already exists for this user
                    const existingCheck = userPresetsCache.find(p => p.name.toLowerCase() === newName.toLowerCase());
                    if (existingCheck || (window.defaultGroceryData && window.defaultGroceryData.name.toLowerCase() === newName.toLowerCase())) {
                        errorP.textContent = "A preset with this name already exists.";
                        errorP.classList.remove('hidden');
                        nameInput.focus();
                        return;
                    }

                    const { data, error } = await window.supabaseClient
                        .from('presets')
                        .insert([{ name: newName, telegram_user_id: MOCK_TELEGRAM_USER_ID }])
                        .select(); // .select() will return the inserted rows

                    if (error) {
                        console.error("Error creating preset:", error);
                        errorP.textContent = `Failed to save: ${error.message}`;
                        errorP.classList.remove('hidden');
                        return;
                    }

                    if (data && data.length > 0) {
                        console.log("Preset created successfully:", data[0]);
                        userPresetsCache.push(data[0]); // Add to local cache
                        await populatePresetSelector(); // Repopulate and re-render selector
                        // Select the new preset
                        if(dom.presetSelector) dom.presetSelector.value = data[0].id;
                        handlePresetSelectorChange(dom.presetSelector); // Load its content and update UI
                        hideModal();
                    } else {
                        errorP.textContent = "Failed to create preset. No data returned.";
                        errorP.classList.remove('hidden');
                    }
                } catch (e) {
                    console.error("Exception creating preset:", e);
                    errorP.textContent = "An unexpected error occurred.";
                    errorP.classList.remove('hidden');
                }
            }
        }
    ]);
    // Focus the input field when modal opens
    setTimeout(() => {
        const nameInput = document.getElementById('new-preset-name-input');
        if (nameInput) nameInput.focus();
    }, 100); 
}

function handleEditPreset() {
    if (!isSupabaseConnected) {
        showModal("Feature Unavailable", "Cannot edit presets while offline.");
        return;
    }
    const presetIdToEdit = dom.presetSelector.value;
    const selectedOption = dom.presetSelector.options[dom.presetSelector.selectedIndex];
    const currentName = selectedOption ? selectedOption.textContent : "";

    if (!presetIdToEdit || presetIdToEdit === DEFAULT_PRESET_ID) {
        showModal("Cannot Edit", "The default preset cannot be edited, or no user preset is selected.");
        return;
    }

    const modalContentHTML = `
        <div>
            <label for="edit-preset-name-input" class="block text-sm font-medium text-text-primary mb-1">New Preset Name:</label>
            <input type="text" id="edit-preset-name-input" value="${currentName}" 
                   class="w-full px-3 py-2 bg-primary-bg border border-gray-600 rounded-md text-text-primary focus:ring-accent focus:border-accent">
            <p id="edit-preset-error" class="text-red-500 text-sm mt-1 hidden"></p>
        </div>
    `;

    showModal(`Edit Preset: ${currentName}`, modalContentHTML, [
        { text: "Cancel", class: "bg-gray-700 hover:bg-gray-600" },
        {
            text: "Save Changes", 
            class: "bg-accent hover:bg-accent-darker text-white", 
            hideOnClick: false,
            onClick: async () => {
                const nameInput = document.getElementById('edit-preset-name-input');
                const errorP = document.getElementById('edit-preset-error');
                const updatedName = nameInput.value.trim();

                if (!updatedName) {
                    errorP.textContent = "Preset name cannot be empty.";
                    errorP.classList.remove('hidden');
                    nameInput.focus();
                    return;
                }
                if (updatedName === currentName) {
                    hideModal(); // No changes made
                    return;
                }
                errorP.classList.add('hidden');

                try {
                    // Check if another preset with the same name already exists for this user
                    const existingCheck = userPresetsCache.find(p => p.id !== presetIdToEdit && p.name.toLowerCase() === updatedName.toLowerCase());
                    if (existingCheck || (window.defaultGroceryData && window.defaultGroceryData.name.toLowerCase() === updatedName.toLowerCase() && DEFAULT_PRESET_ID !== presetIdToEdit )) {
                        errorP.textContent = "Another preset with this name already exists.";
                        errorP.classList.remove('hidden');
                        nameInput.focus();
                        return;
                    }

                    const { data, error } = await window.supabaseClient
                        .from('presets')
                        .update({ name: updatedName })
                        .eq('id', presetIdToEdit)
                        .eq('telegram_user_id', MOCK_TELEGRAM_USER_ID) // Ensure user owns the preset
                        .select();

                    if (error) {
                        console.error("Error updating preset:", error);
                        errorP.textContent = `Failed to update: ${error.message}`;
                        errorP.classList.remove('hidden');
                        return;
                    }

                    if (data && data.length > 0) {
                        console.log("Preset updated successfully:", data[0]);
                        // Update local cache
                        const cacheIndex = userPresetsCache.findIndex(p => p.id === presetIdToEdit);
                        if (cacheIndex !== -1) {
                            userPresetsCache[cacheIndex] = data[0];
                        }
                        await populatePresetSelector();
                        if(dom.presetSelector) dom.presetSelector.value = data[0].id; // Re-select the edited preset
                        handlePresetSelectorChange(dom.presetSelector);
                        hideModal();
                    } else {
                        // This might happen if the preset was deleted by another session, or RLS prevented update/select
                        errorP.textContent = "Failed to update preset. It might no longer exist or you may not have permission.";
                        errorP.classList.remove('hidden');
                    }
                } catch (e) {
                    console.error("Exception updating preset:", e);
                    errorP.textContent = "An unexpected error occurred during update.";
                    errorP.classList.remove('hidden');
                }
            }
        }
    ]);
    setTimeout(() => {
        const nameInput = document.getElementById('edit-preset-name-input');
        if (nameInput) { nameInput.focus(); nameInput.select(); }
    }, 100);
}

function handleDeletePreset() {
    if (!isSupabaseConnected) {
        showModal("Feature Unavailable", "Cannot delete presets while offline.");
        return;
    }
    const presetIdToDelete = dom.presetSelector.value;
    const selectedOption = dom.presetSelector.options[dom.presetSelector.selectedIndex];
    const presetNameToDelete = selectedOption ? selectedOption.textContent : "Unknown Preset";

    if (!presetIdToDelete || presetIdToDelete === DEFAULT_PRESET_ID) {
        showModal("Cannot Delete", "The default preset cannot be deleted, or no user preset is selected.");
        return;
    }

    showModal("Confirm Deletion", `<p>Are you sure you want to delete the preset "<strong>${presetNameToDelete}</strong>"?</p><p>This action cannot be undone.</p>`, [
        { text: "Cancel", class: "bg-gray-700 hover:bg-gray-600" },
        {
            text: "Delete Preset",
            class: "bg-button-remove hover:bg-red-700 text-white",
            onClick: async () => {
                try {
                    const { error } = await window.supabaseClient
                        .from('presets')
                        .delete()
                        .eq('id', presetIdToDelete)
                        .eq('telegram_user_id', MOCK_TELEGRAM_USER_ID); // Ensure user owns the preset

                    if (error) {
                        console.error("Error deleting preset:", error);
                        showModal("Error Deleting Preset", `Could not delete preset: ${error.message}`);
                        return;
                    }

                    console.log(`Preset '${presetNameToDelete}' (ID: ${presetIdToDelete}) deleted successfully.`);
                    // Remove from local cache
                    userPresetsCache = userPresetsCache.filter(p => p.id !== presetIdToDelete);
                    await populatePresetSelector();
                    // Select the default preset after deletion
                    if(dom.presetSelector) dom.presetSelector.value = DEFAULT_PRESET_ID;
                    handlePresetSelectorChange(dom.presetSelector);
                    hideModal(); // Close the confirmation modal

                } catch (e) {
                    console.error("Exception deleting preset:", e);
                    showModal("Error", "An unexpected error occurred while deleting the preset.");
                }
            }
        }
    ]);
}

function updateUserPresetEditUI(selectedPresetId) {
    const isDefault = selectedPresetId === DEFAULT_PRESET_ID;
    const isValidUserPresetSelected = selectedPresetId && !isDefault && userPresetsCache.some(p => p.id === selectedPresetId);

    if (dom.addPresetBtn) {
        dom.addPresetBtn.disabled = !isSupabaseConnected;
        dom.addPresetBtn.style.opacity = isSupabaseConnected ? '1' : '0.5';
        dom.addPresetBtn.style.cursor = isSupabaseConnected ? 'pointer' : 'not-allowed';
    }

    if (dom.editPresetBtn) {
        if (isSupabaseConnected && isValidUserPresetSelected) {
            htmx.removeClass(dom.editPresetBtn, 'hidden');
            dom.editPresetBtn.disabled = false;
        } else {
            htmx.addClass(dom.editPresetBtn, 'hidden');
            dom.editPresetBtn.disabled = true;
        }
    }

    if (dom.deletePresetBtn) {
        if (isSupabaseConnected && isValidUserPresetSelected) {
            htmx.removeClass(dom.deletePresetBtn, 'hidden');
            dom.deletePresetBtn.disabled = false;
        } else {
            htmx.addClass(dom.deletePresetBtn, 'hidden');
            dom.deletePresetBtn.disabled = true;
        }
    }
}

// Central handler for preset selector changes (replaces standalone button handlers)
function handlePresetSelectorChange(selectElement) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const presetId = selectedOption.value;
    const presetName = selectedOption.textContent;

    console.log(`Preset selector changed to: ${presetName} (ID: ${presetId})`);
    
    currentActivePresetId = presetId; // Keep this updated
    currentActivePresetName = presetName;

    // Dispatch event to load content
    const loadEvent = new CustomEvent('loadPresetContent', { 
        detail: { presetId: presetId, presetName: presetName } 
    });
    document.body.dispatchEvent(loadEvent);
    
    // Update Edit/Delete buttons based on the new selection
    updateUserPresetEditUI(presetId);
}

// --- sendList Function (for Telegram integration) ---
function sendList() {
    // Safety check to prevent errors if selectedItems is not an object
    if (!selectedItems || typeof selectedItems !== 'object') {
        console.error("Cannot send list: selectedItems is not a valid object.", selectedItems);
        // Optionally, show a user-friendly error message
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.showAlert("An error occurred. Could not prepare the list to send.");
        }
        return;
    }

    const itemCount = Object.keys(selectedItems).length;
    if (itemCount === 0) {
        showModal("Empty List", "Please select some items before sending.");
        return;
    }

    let formattedList = `${currentActivePresetName}:
`;
    for (const categoryName in selectedItems) {
        if (Object.keys(selectedItems[categoryName].items).length > 0) {
            formattedList += `
${categoryName}:
`;
            for (const itemName in selectedItems[categoryName].items) {
                const item = selectedItems[categoryName].items[itemName];
                formattedList += `- ${item.name} ${item.quantity}${item.unit || ''}
`;
            }
        }
    }

    console.log("Formatted list for Telegram:", formattedList);

    if (window.Telegram && window.Telegram.WebApp) {
        try {
            window.Telegram.WebApp.switchInlineQuery(formattedList.trim());
        } catch (e) {
            console.error("Error calling Telegram.WebApp.switchInlineQuery:", e);
            showModal("Telegram Error", "Could not switch to Telegram inline query. Error: " + e.message);
        }
    } else {
        console.warn("Telegram WebApp SDK not available. Simulating send with an alert.");
        showModal("Share List (Simulated)", `<p>If this were in Telegram, you'd now be choosing a chat to share this list:</p><pre class="mt-2 p-2 bg-primary-bg rounded text-sm whitespace-pre-wrap">${formattedList.trim()}</pre>`);
    }
}

// Initial setup when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed. Initializing app.");

    // Re-cache modal DOM elements here to be certain they are available
    dom.genericModal = document.getElementById('generic-modal');
    dom.genericModalPanel = document.getElementById('generic-modal-panel');
    dom.genericModalTitle = document.getElementById('generic-modal-title');
    dom.genericModalCloseBtn = document.getElementById('generic-modal-close-btn');
    dom.genericModalContent = document.getElementById('generic-modal-content');
    dom.genericModalFooter = document.getElementById('generic-modal-footer');

    if (!dom.genericModal || !dom.genericModalPanel) {
        console.error("CRITICAL: Modal elements still not found after DOMContentLoaded!");
    } else {
        console.log("Modal elements successfully cached within DOMContentLoaded.");
    }

    // Initialize Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        // Set header color to match theme (example, customize as needed)
        // window.Telegram.WebApp.setHeaderColor('#1f2937'); // Gray 800
        // console.log("Telegram WebApp SDK initialized.");
        // showTelegramUserInfo(); // Optional: Display user info if needed for debugging
    } else {
        console.warn("Telegram WebApp SDK not found. Running in browser mode.");
    }
    
    // Setup Modal Close Button Listener (if not already set up)
    if (dom.genericModalCloseBtn && !dom.genericModalCloseBtn.onclick) {
        dom.genericModalCloseBtn.onclick = hideModal;
    }
    
    // Populate presets (this will also trigger initial load & UI update)
    await populatePresetSelector();
    
    // Add event listeners for new CRUD buttons
    if (dom.addPresetBtn) dom.addPresetBtn.addEventListener('click', handleAddPreset);
    if (dom.editPresetBtn) dom.editPresetBtn.addEventListener('click', handleEditPreset);
    if (dom.deletePresetBtn) dom.deletePresetBtn.addEventListener('click', handleDeletePreset);

    // Initial UI update for preset buttons (safety net, should be handled by populatePresetSelector)
    // If presetSelector has a value, use it, otherwise pass null or default.
    const initialPresetId = dom.presetSelector ? dom.presetSelector.value : DEFAULT_PRESET_ID;
    updateUserPresetEditUI(initialPresetId);

    // If Supabase is not connected, ensure categories placeholder shows the message.
    // This is a bit redundant if populatePresetSelector already does it, but acts as a fallback.
    if (!isSupabaseConnected && dom.categoriesPlaceholder) {
         if (!dom.categoriesPlaceholder.textContent.toLowerCase().includes("supabase not connected")) {
            htmx.removeClass(dom.categoriesPlaceholder, 'hidden');
            dom.categoriesPlaceholder.innerHTML = 'Supabase not connected. <br>Only local "Grocery List" is available. <br>Online features are disabled.';
        }
    } else if (isSupabaseConnected && dom.categoriesPlaceholder && dom.presetSelector.options.length > 0) {
        // If connected and presets loaded, ensure placeholder isn't showing connection error
        // and content loading is triggered by handlePresetSelectorChange.
    }
});

// --- Item rendering and interaction logic --- (Assumed largely unchanged and correct)
// renderPresetFromLocalData, triggerItemAnimation, incrementOrSelectItem, decrementItem, updateItemUIDisplay
// updateSendButtonVisibilityAndPreview, resetSelectedItemsAndUI, sendList 
// (Ensuring all these functions are present and correct from previous versions)

// Ensure necessary functions are globally available if called from HTML attributes
window.handlePresetSelectorChange = handlePresetSelectorChange; // For onchange in HTML
window.sendList = sendList; // For send button in HTML

// ... (The rest of item interaction and utility functions like renderPresetFromLocalData, etc. should be here) ...
// Make sure all required functions are defined or pasted correctly.

// Minimal placeholder for functions if they were missed, ensure to use full versions from prior state
function renderPresetFromLocalData(presetData, containerId) { /* ... full implementation ... */ 
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID ${containerId} not found for rendering local data.`);
        return;
    }
    container.innerHTML = ''; 
    resetSelectedItemsAndUI(); 
    if (!presetData || !presetData.categories || presetData.categories.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-10 non-selectable">No categories or items in this preset.</p>';
        if (dom.categoriesPlaceholder) htmx.addClass(dom.categoriesPlaceholder, 'hidden'); 
        return;
    }
    presetData.categories.forEach(category => {
        const section = document.createElement('section');
        section.className = `bg-container-bg p-4 rounded-lg shadow-lg category-border ${category.borderColorClass || 'border-gray-600'}`;
        const title = document.createElement('h2');
        title.className = `text-xl font-semibold mb-4 non-selectable ${category.textColorClass || 'text-text-primary'}`;
        title.textContent = category.name;
        section.appendChild(title);
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'space-y-3';
        if (category.items && category.items.length > 0) {
            category.items.forEach(item => {
                const itemElementId = `item-${presetData.id}-${category.id}-${item.id}`.replace(/[^a-zA-Z0-9-_]/g, '-');
                const itemDiv = document.createElement('div');
                itemDiv.id = itemElementId;
                itemDiv.className = 'flex items-center justify-between p-3 bg-item-bg rounded-md hover:bg-gray-700/50 cursor-pointer transition-all duration-150 ease-in-out';
                const itemIcon = item.name.split(' ')[0];
                const actualItemName = item.name.substring(itemIcon.length).trim();
                const incrementStep = parseFloat(item.incrementStep) || 1; 
                itemDiv.innerHTML = `
                    <div class="flex items-center flex-grow min-w-0">
                        <span class="text-xl mr-3 non-selectable">${itemIcon}</span> 
                        <span class="text-text-primary truncate non-selectable">${actualItemName}</span>
                    </div>
                    <div class="flex items-center flex-shrink-0 ml-2">
                        <span class="text-text-secondary mr-2 whitespace-nowrap non-selectable">0 ${item.unit}</span>
                    </div>
                `;
                itemDiv.onclick = () => incrementOrSelectItem(item.id, item.name, item.unit, itemElementId, incrementStep);
                itemsContainer.appendChild(itemDiv);
            });
        } else {
            const noItemsP = document.createElement('p');
            noItemsP.className = 'text-sm text-gray-500 non-selectable';
            noItemsP.textContent = 'No items in this category yet.';
            itemsContainer.appendChild(noItemsP);
        }
        section.appendChild(itemsContainer);
        container.appendChild(section);
    });
    if (dom.categoriesPlaceholder) htmx.addClass(dom.categoriesPlaceholder, 'hidden');
    console.log("Local preset data rendered.");
}
function triggerItemAnimation(itemElementId, animationType = 'flash') {
    const itemElement = document.getElementById(itemElementId);
    if (!itemElement) return;

    if (animationType === 'flash') {
        itemElement.classList.add('animate-flash');
        setTimeout(() => itemElement.classList.remove('animate-flash'), 300);
    } else if (animationType === 'remove') {
        itemElement.classList.add('animate-remove');
    }
}
function incrementOrSelectItem(itemId, itemName, unit, itemElementId, itemIncrementStep = 1) {
    const step = Number(itemIncrementStep) || 1;
    if (!selectedItems[itemId]) {
        selectedItems[itemId] = { 
            name: itemName, 
            quantity: 0,
            unit: unit,
            incrementStep: step
        };
    }
    selectedItems[itemId].quantity += step;
    const { quantity } = selectedItems[itemId];
    const precision = Math.max((String(step).split('.')[1] || '').length, (String(quantity).split('.')[1] || '').length);
    selectedItems[itemId].quantity = parseFloat(quantity.toFixed(precision));
    
    updateItemUIDisplay(itemId, itemName, unit, itemElementId);
    updateSendButtonVisibilityAndPreview();
    triggerItemAnimation(itemElementId, 'flash');
}
function decrementItem(itemId, itemName, unit, itemElementId) {
    if (event) event.stopPropagation();
    if (selectedItems[itemId]) {
        const step = Number(selectedItems[itemId].incrementStep) || 1;
        selectedItems[itemId].quantity -= step;
        const { quantity } = selectedItems[itemId];

        if (quantity <= 0) {
            delete selectedItems[itemId];
            triggerItemAnimation(itemElementId, 'remove');
            setTimeout(() => {
                updateItemUIDisplay(itemId, itemName, unit, itemElementId);
                updateSendButtonVisibilityAndPreview();
            }, 300);
        } else {
            const precision = Math.max((String(step).split('.')[1] || '').length, (String(quantity).split('.')[1] || '').length);
            selectedItems[itemId].quantity = parseFloat(quantity.toFixed(precision));
            updateItemUIDisplay(itemId, itemName, unit, itemElementId);
            updateSendButtonVisibilityAndPreview();
        }
    }
}
function updateItemUIDisplay(itemId, itemName, unit, itemElementId) {
    const itemElement = document.getElementById(itemElementId);
    if (!itemElement) return;

    itemElement.classList.remove('animate-flash', 'animate-remove');
    const itemData = selectedItems[itemId];
    const originalIncrementStep = itemElement.dataset.incrementStep || 1;
    const [itemIcon, ...nameParts] = itemName.split(' ');
    const actualItemName = nameParts.join(' ');

    if (itemData && itemData.quantity > 0) {
        itemElement.className = 'flex items-center justify-between p-3 bg-accent/20 border border-accent rounded-md transition-all duration-150 ease-in-out';
        itemElement.onclick = () => incrementOrSelectItem(itemId, itemName, unit, itemElementId, originalIncrementStep);
        itemElement.innerHTML = `
            <div class="flex items-center flex-grow min-w-0">
                <span class="text-xl mr-3 non-selectable">${itemIcon}</span>
                <span class="text-text-primary truncate non-selectable">${actualItemName}</span>
            </div>
            <div class="flex items-center flex-shrink-0 ml-2 space-x-2">
                <button onclick="decrementItem('${itemId}', '${itemName}', '${unit}', '${itemElementId}')" class="w-8 h-8 flex items-center justify-center text-lg bg-accent text-white rounded-full transition-colors hover:bg-accent-darker focus:outline-none">-</button>
                <span class="text-text-primary w-16 text-center text-lg font-semibold non-selectable">${itemData.quantity} ${unit}</span>
            </div>`;
    } else {
        itemElement.className = 'flex items-center justify-between p-3 bg-item-bg rounded-md hover:bg-gray-700/50 cursor-pointer transition-all duration-150 ease-in-out';
        itemElement.onclick = () => incrementOrSelectItem(itemId, itemName, unit, itemElementId, originalIncrementStep);
        itemElement.innerHTML = `
            <div class="flex items-center flex-grow min-w-0">
                <span class="text-xl mr-3 non-selectable">${itemIcon}</span>
                <span class="text-text-primary truncate non-selectable">${actualItemName}</span>
            </div>
            <div class="flex items-center flex-shrink-0 ml-2"></div>`;
    }
}
function updateSendButtonVisibilityAndPreview() {
    const itemCount = Object.keys(selectedItems).length;
    if (!dom.sendButtonContainer || !dom.sendButton || !dom.selectedItemsPreview) return;

    if (itemCount > 0) {
        dom.sendButtonContainer.classList.remove('hidden');
        dom.sendButton.disabled = false;
        const preview = Object.values(selectedItems)
            .map(item => `${item.name.split(' ').slice(1).join(' ')}: ${item.quantity}`)
            .join(', ');
        dom.selectedItemsPreview.textContent = `Selected: ${preview}`;
    } else {
        dom.sendButtonContainer.classList.add('hidden');
        dom.sendButton.disabled = true;
        dom.selectedItemsPreview.textContent = '';
    }
}
function resetSelectedItemsAndUI() {
    selectedItems = {}; // Ensure reset to an empty object
    updateSendButtonVisibilityAndPreview();
    // When a new preset is loaded, the category container is re-rendered,
    // so we don't need to manually clear out the UI state of each item.
}

console.log("app.js loaded. Preset management reverted to dropdown with modal controls.");

document.addEventListener('alpine:init', () => {
    Alpine.data('appData', () => ({
        // Your Alpine.js reactive data can go here
        init() {
            console.log('Alpine.js initialized with appData.');
            // Initialize Telegram WebApp interaction if needed
            if (window.Telegram && window.Telegram.WebApp) {
                console.log('Telegram WebApp is available.');
                // Example: Send data to your bot
                // Telegram.WebApp.sendData('Hello from Mini App!');
            }
        },
        // Example function
        showTelegramUserInfo() {
            if (window.Telegram && window.Telegram.WebApp && Telegram.WebApp.initDataUnsafe.user) {
                const user = Telegram.WebApp.initDataUnsafe.user;
                alert(`Hello, ${user.first_name}! Your user ID is ${user.id}.`);
            } else {
                alert('Telegram user data not available.');
            }
        }
    }));
});

console.log("App.js loaded.");

// Example of how you might use HTMX events with JavaScript
document.body.addEventListener('htmx:afterSwap', function(event) {
    console.log('HTMX content swapped:', event.detail.target);
    // You might want to re-initialize Alpine components or other JS here if needed
    // For example, if new Alpine components are loaded via HTMX
});

// You can also initialize Supabase client here once config.js loads it
// if (window.supabase) {
//     console.log('Supabase client available in app.js');
//     // Example query
//     // async function getUsers() {
//     //     const { data, error } = await supabase.from('users').select();
//     //     if (error) console.error('Error fetching users:', error);
//     //     else console.log('Users:', data);
//     // }
//     // getUsers();
// } 