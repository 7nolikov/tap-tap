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
        return []; // Return empty if Supabase is not available
    }
    try {
        // Actual Supabase call (still placeholder)
        // const { data, error } = await window.supabaseClient.from('presets').select('id, name').eq('telegram_user_id', 'YOUR_TELEGRAM_USER_ID'); // Use window.supabaseClient
        // if (error) throw error; 
        // return data;
        
        // Using mock data for now if Supabase is connected
        console.log("Using MOCK user presets (Supabase connected).");
        return Promise.resolve([
            { id: 'user_preset_123', name: 'My Weekly Shop' }, // Mock data for development
            { id: 'user_preset_456', name: 'Weekend BBQ Plan' }  // Mock data for development
        ]);
    } catch (error) {
        console.error("Error fetching user presets:", error);
        showModal("Error", "Could not load your presets from the cloud. Please check your connection and try again.");
        return []; // Return empty on error
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
            dom.categoriesPlaceholder.innerHTML = 'Supabase not connected. <br>Only local "Grocery List" is available. <br>Online features are disabled.';
        }
         showModal(
            "Offline Mode", 
            "<p>Could not connect to Supabase. You can still use the default 'Grocery List'.</p><p>Saving new lists or accessing your other cloud-saved lists is currently unavailable.</p>",
            [{ text: "OK", class: "bg-accent hover:bg-accent-darker text-white"}]
        );
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
    // For now, use a simple alert. Later, this will open a modal or navigate.
    showModal("Create Preset", "<p>Preset creation form will be here.</p>", [
        {text: "Cancel"}, 
        {text: "Save (Not Implemented)", class: "bg-accent text-white", onClick: () => alert("Save not implemented")}
    ]);
    // alert("Add New Preset clicked! (Functionality to be implemented)");
}

function handleEditPreset() {
    if (!isSupabaseConnected) {
        showModal("Feature Unavailable", "Cannot edit presets while offline.");
        return;
    }
    const selectedPresetId = dom.presetSelector.value;
    if (selectedPresetId === DEFAULT_PRESET_ID) {
        showModal("Cannot Edit Default", "The default 'Grocery List' cannot be edited directly through this interface.");
        return;
    }
    if (selectedPresetId && selectedPresetId !== DEFAULT_PRESET_ID) {
        const presetName = dom.presetSelector.options[dom.presetSelector.selectedIndex].text;
        showModal("Edit Preset", `<p>Editing preset: ${presetName} (ID: ${selectedPresetId}). Form will be here.</p>`, [
            {text: "Cancel"},
            {text: "Save Changes (Not Implemented)", class: "bg-accent text-white", onClick: () => alert("Save changes not implemented")}
        ]);
        // alert(`Edit Preset clicked for: ${presetName} (ID: ${selectedPresetId}) (Functionality to be implemented)`);
    } else {
        alert("Please select a user-defined preset to edit.");
    }
}

function handleDeletePreset() {
    if (!isSupabaseConnected) {
        showModal("Feature Unavailable", "Cannot delete presets while offline.");
        return;
    }
    const selectedPresetId = dom.presetSelector.value;
    const presetName = dom.presetSelector.options[dom.presetSelector.selectedIndex].text;

    if (selectedPresetId && selectedPresetId !== DEFAULT_PRESET_ID) {
        showModal("Confirm Delete", `<p>Are you sure you want to delete the preset "${presetName}"?</p><p>This action cannot be undone.</p>`, [
            { text: "Cancel" },
            { 
                text: "Delete (Not Implemented)", 
                class: "bg-button-remove hover:bg-red-700 text-white", 
                onClick: () => {
                    alert(`Confirmed delete for: ${presetName} (ID: ${selectedPresetId}). Backend call not implemented.`);
                    // TODO: After actual deletion, remove from selector, load default/next preset.
                }
            }
        ]);
    } else if (selectedPresetId === DEFAULT_PRESET_ID) {
         showModal("Cannot Delete Default", "The default 'Grocery List' cannot be deleted.");
    } else {
        alert("Please select a user-defined preset to delete.");
    }
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

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed. Initializing app.");

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
    const itemDiv = document.getElementById(itemElementId);
    if (!itemDiv) return;
    if (animationType === 'flash') {
        itemDiv.classList.remove('bg-accent/20'); 
        itemDiv.classList.add('bg-accent/30'); 
        setTimeout(() => {
            itemDiv.classList.remove('bg-accent/30');
            const item = selectedItems[Object.keys(selectedItems).find(key => selectedItems[key].originalElementId === itemElementId)];
            if (item && item.count > 0) { 
                 itemDiv.classList.add('bg-accent/20', 'border', 'border-accent');
            }
        }, 150);
    } else if (animationType === 'fadeOut') {
        itemDiv.classList.add('opacity-0', 'scale-95');
    }
}
function incrementOrSelectItem(itemId, itemName, unit, itemElementId, itemIncrementStep = 1) { /* ... */ 
    const isNewItem = !selectedItems[itemId];
    const step = parseFloat(itemIncrementStep) || 1;
    if (!selectedItems[itemId]) {
        selectedItems[itemId] = { name: itemName, count: step, unit: unit, originalElementId: itemElementId, incrementStep: step };
    } else {
        selectedItems[itemId].count = (parseFloat(selectedItems[itemId].count) || 0) + step;
        if (step % 1 !== 0 || (selectedItems[itemId].count % 1 !== 0 && String(selectedItems[itemId].count).includes('.'))) {
            const stepDecimals = (String(step).split('.')[1] || '').length;
            const countDecimals = (String(selectedItems[itemId].count).split('.')[1] || '').length;
            const precision = Math.max(stepDecimals, countDecimals, 1); 
            selectedItems[itemId].count = parseFloat(selectedItems[itemId].count.toFixed(precision));
        } else {
             selectedItems[itemId].count = parseFloat(selectedItems[itemId].count.toFixed(0)); 
        }
    }
    updateItemUIDisplay(itemId, itemName, unit, itemElementId, isNewItem);
    updateSendButtonVisibilityAndPreview();
    triggerItemAnimation(itemElementId, 'flash');
}
function decrementItem(itemId, itemName, unit, itemElementId, itemIncrementStep = 1) { /* ... */ 
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation(); 
    if (selectedItems[itemId]) {
        const step = parseFloat(selectedItems[itemId].incrementStep) || parseFloat(itemIncrementStep) || 1;
        selectedItems[itemId].count = (parseFloat(selectedItems[itemId].count) || 0) - step;
        if (step % 1 !== 0 || (selectedItems[itemId].count % 1 !== 0 && String(selectedItems[itemId].count).includes('.'))) {
            const stepDecimals = (String(step).split('.')[1] || '').length;
            const countDecimals = (String(selectedItems[itemId].count).split('.')[1] || '').length;
            const precision = Math.max(stepDecimals, countDecimals, 1);
            selectedItems[itemId].count = parseFloat(selectedItems[itemId].count.toFixed(precision));
        } else {
            selectedItems[itemId].count = parseFloat(selectedItems[itemId].count.toFixed(0));
        }
        if (selectedItems[itemId].count <= 0) {
            delete selectedItems[itemId];
            const itemDiv = document.getElementById(itemElementId);
            if (itemDiv) {
                triggerItemAnimation(itemElementId, 'fadeOut');
                setTimeout(() => {
                    itemDiv.className = 'flex items-center justify-between p-3 bg-item-bg rounded-md hover:bg-gray-700/50 cursor-pointer transition-all duration-150 ease-in-out';
                    itemDiv.style.opacity = ''; 
                    itemDiv.style.transform = '';
                    const itemIcon = itemName.split(' ')[0]; 
                    const actualItemName = itemName.substring(itemIcon.length).trim();
                    itemDiv.innerHTML = `
                        <div class="flex items-center flex-grow min-w-0">
                            <span class="text-xl mr-3 non-selectable">${itemIcon}</span> 
                            <span class="text-text-primary truncate non-selectable">${actualItemName}</span>
                        </div>
                        <div class="flex items-center flex-shrink-0 ml-2">
                            <span class="text-text-secondary mr-2 whitespace-nowrap non-selectable">0 ${unit}</span>
                        </div>
                    `;
                    const originalIncrementStep = parseFloat(itemIncrementStep) || 1; 
                    itemDiv.onclick = () => incrementOrSelectItem(itemId, itemName, unit, itemElementId, originalIncrementStep);
                }, 150); 
            }
        } else {
            updateItemUIDisplay(itemId, itemName, unit, itemElementId, false);
        }
    }
    updateSendButtonVisibilityAndPreview();
}
function updateItemUIDisplay(itemId, itemName, unit, itemElementId, isNewlyAdded = false) { /* ... */ 
    const itemDiv = document.getElementById(itemElementId);
    if (!itemDiv) {
        console.error(`Item element with ID ${itemElementId} not found for UI update.`);
        return;
    }
    const itemData = selectedItems[itemId];
    const itemIcon = itemName.split(' ')[0]; 
    const actualItemName = itemName.substring(itemIcon.length).trim();
    let incrementStep = 1;
    if (itemData && itemData.incrementStep) {
        incrementStep = itemData.incrementStep;
    } else if (window.defaultGroceryData) {
        const flatItems = window.defaultGroceryData.categories.flatMap(c => c.items);
        const defaultItem = flatItems.find(i => i.id === itemId); 
        if (defaultItem && defaultItem.incrementStep) {
            incrementStep = defaultItem.incrementStep;
        }
    }
    incrementStep = parseFloat(incrementStep) || 1;
    itemDiv.className = 'flex items-center justify-between p-3 rounded-md cursor-pointer transition-all duration-150 ease-in-out'; 
    itemDiv.style.opacity = ''; 
    itemDiv.onclick = () => incrementOrSelectItem(itemId, itemName, unit, itemElementId, incrementStep);
    if (itemData && itemData.count > 0) {
        itemDiv.classList.add('bg-accent/20', 'border', 'border-accent');
        itemDiv.classList.remove('bg-item-bg', 'hover:bg-gray-700/50');
        let displayCount = itemData.count;
        if (incrementStep % 1 !== 0 || (typeof displayCount === 'number' && displayCount % 1 !== 0)) {
             const stepDecimals = (String(incrementStep).split('.')[1] || '').length;
             const countDecimals = (String(displayCount).split('.')[1] || '').length;
             displayCount = Number(displayCount).toFixed(Math.max(stepDecimals, countDecimals,1));
        } else {
            displayCount = Number(displayCount).toFixed(0);
        }
        itemDiv.innerHTML = `
            <div class="flex items-center flex-grow min-w-0">
                <span class="text-xl mr-3 non-selectable">${itemIcon}</span> 
                <span class="text-text-primary truncate non-selectable">${actualItemName}</span>
            </div>
            <div class="flex items-center flex-shrink-0 ml-2">
                <span id="${itemId}-qty" class="text-accent font-semibold mr-2 whitespace-nowrap non-selectable">${displayCount} ${unit}</span>
                <button class="p-1 rounded-full bg-accent text-white w-7 h-7 flex items-center justify-center hover:bg-accent-darker flex-shrink-0" 
                        onclick="event.stopPropagation(); decrementItem('${itemId}', '${itemName}', '${unit}', '${itemElementId}', ${incrementStep})">-</button>
            </div>
        `;
    } else {
        itemDiv.classList.add('bg-item-bg', 'hover:bg-gray-700/50');
        itemDiv.classList.remove('bg-accent/20', 'border', 'border-accent');
        itemDiv.innerHTML = `
            <div class="flex items-center flex-grow min-w-0">
                <span class="text-xl mr-3 non-selectable">${itemIcon}</span> 
                <span class="text-text-primary truncate non-selectable">${actualItemName}</span>
            </div>
            <div class="flex items-center flex-shrink-0 ml-2">
                <span class="text-text-secondary mr-2 whitespace-nowrap non-selectable">0 ${unit}</span>
            </div>
        `;
    }
    if (isNewlyAdded && itemData && itemData.count > 0) {
        itemDiv.classList.add('bg-accent/20', 'border', 'border-accent');
        itemDiv.classList.remove('bg-item-bg', 'hover:bg-gray-700/50');
    }
}
function updateSendButtonVisibilityAndPreview() { /* ... */ 
    const itemCount = Object.keys(selectedItems).length;
    if (dom.sendButtonContainer && dom.sendButton && dom.selectedItemsPreview) {
        if (itemCount > 0) {
            dom.sendButtonContainer.classList.remove('hidden');
            dom.sendButton.disabled = false;
            let previewParts = [];
            for (const id in selectedItems) {
                let displayCount = selectedItems[id].count;
                const step = selectedItems[id].incrementStep || 1;
                 if (step % 1 !== 0 || (typeof displayCount === 'number' && displayCount % 1 !== 0)) {
                    const stepDecimals = (String(step).split('.')[1] || '').length;
                    const countDecimals = (String(displayCount).split('.')[1] || '').length;
                    displayCount = Number(displayCount).toFixed(Math.max(stepDecimals, countDecimals,1));
                } else {
                    displayCount = Number(displayCount).toFixed(0);
                }
                previewParts.push(`${selectedItems[id].name.split(' ')[0]} ${displayCount}${selectedItems[id].unit.charAt(0)}`);
            }
            dom.selectedItemsPreview.textContent = "Selected: " + previewParts.join(', ');
        } else {
            dom.sendButtonContainer.classList.add('hidden');
            dom.sendButton.disabled = true;
            dom.selectedItemsPreview.textContent = "";
        }
    }
}
function resetSelectedItemsAndUI() { /* ... */ 
    selectedItems = {};
    updateSendButtonVisibilityAndPreview();
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