// Supabase Client Initialization
let supabase = null;
if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
} else {
    console.warn("Supabase URL or Anon Key not configured. Backend features for presets will be limited to mocks.");
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
    } else {
        const userPresetData = userPresetsCache.find(p => p.id === currentActivePresetId);
        if (userPresetData) {
            console.log(`Activating user preset '${currentActivePresetName}'.`);
            if (userPresetData.categories && userPresetData.categories.length > 0) {
                renderPresetFromLocalData(userPresetData, 'categories-container');
                if (dom.categoriesPlaceholder) htmx.addClass(dom.categoriesPlaceholder, 'hidden');
            } else {
                if (dom.categoriesContainer) {
                    dom.categoriesContainer.innerHTML = `<p class="text-center text-gray-500 py-10 non-selectable">Items for preset "${currentActivePresetName}" would be loaded from the server. <br>(Currently empty or not cached locally)</p>`;
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
    }
});

async function fetchUserPresets() {
    console.log("Fetching user presets...");
    if (!supabase) {
        console.warn("Supabase not initialized. Using mock user presets.");
        return Promise.resolve([
            { id: 'user_preset_123', name: 'My Weekly Shop' },
            { id: 'user_preset_456', name: 'Weekend BBQ Plan' }
        ]);
    }
    try {
        // const { data, error } = await supabase.from('presets').select('id, name').eq('telegram_user_id', 'YOUR_TELEGRAM_USER_ID');
        // if (error) throw error; return data;
        return [
            { id: 'user_preset_123', name: 'My Weekly Shop' },
            { id: 'user_preset_456', name: 'Weekend BBQ Plan' }
        ]; // Mock
    } catch (error) {
        console.error("Error fetching user presets:", error);
        return [];
    }
}

async function populatePresetSelector() {
    if (!dom.presetSelector) {
        console.error("Preset selector DOM element not found!");
        return;
    }
    userPresetsCache = await fetchUserPresets();
    dom.presetSelector.innerHTML = ''; // Clear existing options

    // 1. Add Default Grocery List
    if (window.defaultGroceryData) {
        const defaultOption = document.createElement('option');
        defaultOption.value = DEFAULT_PRESET_ID;
        defaultOption.textContent = window.defaultGroceryData.name;
        dom.presetSelector.appendChild(defaultOption);
    } else {
        const errOption = document.createElement('option');
        errOption.value = ""; errOption.textContent = "Error: Default Missing"; errOption.disabled = true;
        dom.presetSelector.appendChild(errOption);
    }

    // 2. Add User-Specific Presets
    userPresetsCache.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        dom.presetSelector.appendChild(option);
    });

    // 3. Add Separator and CRUD Actions
    const separator = document.createElement('option');
    separator.value = ACTION_SEPARATOR_ID;
    separator.textContent = '───── MANAGE ─────';
    separator.disabled = true; 
    dom.presetSelector.appendChild(separator);

    const createOption = document.createElement('option');
    createOption.value = ACTION_CREATE_NEW_ID;
    createOption.textContent = '➕ Create New Preset...';
    dom.presetSelector.appendChild(createOption);

    const editOption = document.createElement('option');
    editOption.value = ACTION_EDIT_SELECTED_ID;
    editOption.textContent = '✏️ Edit Selected Preset...';
    dom.presetSelector.appendChild(editOption);
    
    const deleteOption = document.createElement('option');
    deleteOption.value = ACTION_DELETE_SELECTED_ID;
    deleteOption.textContent = '🗑️ Delete Selected Preset...';
    dom.presetSelector.appendChild(deleteOption);

    // Set initial selection and trigger content load
    let initialPresetId = DEFAULT_PRESET_ID;
    let initialPresetName = window.defaultGroceryData ? window.defaultGroceryData.name : "Grocery List";
    
    // If there's a previously selected preset ID that still exists, try to reselect it.
    // This is useful after CRUD ops that repopulate the selector.
    const lastSelectedId = dom.presetSelector.dataset.lastValidPresetId;
    if (lastSelectedId && dom.presetSelector.querySelector(`option[value="${lastSelectedId}"]`)) {
        initialPresetId = lastSelectedId;
        initialPresetName = dom.presetSelector.querySelector(`option[value="${lastSelectedId}"]`).textContent;
    }

    dom.presetSelector.value = initialPresetId;
    dom.presetSelector.dataset.lastValidPresetId = initialPresetId; // Store the active preset ID

    htmx.trigger(document.body, 'loadPresetContent', { 
        presetId: initialPresetId, 
        presetName: initialPresetName 
    });
    console.log("Preset selector populated. Initial preset loaded.");
}

// --- Preset Action Modals --- (Called by handlePresetSelectorChange)
function openCreatePresetModal() {
    const contentHTML = `
        <div>
            <label for="new-preset-name-input" class="block text-sm font-medium text-text-primary mb-1">Preset Name</label>
            <input type="text" id="new-preset-name-input" placeholder="Enter preset name" 
                   class="w-full px-3 py-2 bg-primary-bg border border-gray-600 rounded-md text-text-primary focus:ring-accent focus:border-accent">
            <p id="create-preset-error" class="text-red-500 text-sm mt-1 hidden"></p>
        </div>
    `;
    const footerButtons = [
        { text: 'Cancel', class: 'bg-gray-700 hover:bg-gray-600 text-text-primary', onClick: hideModal },
        {
            text: 'Save Preset', class: 'bg-accent hover:bg-accent-darker text-white', hideOnClick: false,
            onClick: async () => {
                const inputEl = document.getElementById('new-preset-name-input');
                const errorEl = document.getElementById('create-preset-error');
                const newName = inputEl ? inputEl.value.trim() : '';
                if (errorEl) errorEl.classList.add('hidden');
                if (!newName) {
                    if(inputEl) inputEl.focus();
                    if(errorEl) { errorEl.textContent = 'Preset name cannot be empty.'; errorEl.classList.remove('hidden'); }
                    return;
                }
                if (userPresetsCache.find(p => p.name.toLowerCase() === newName.toLowerCase()) || (window.defaultGroceryData && window.defaultGroceryData.name.toLowerCase() === newName.toLowerCase())) {
                    if(inputEl) inputEl.focus();
                    if(errorEl) { errorEl.textContent = 'A preset with this name already exists.'; errorEl.classList.remove('hidden'); }
                    return;
                }
                const newPresetId = `user_mock_${Date.now()}`;
                const newPreset = { id: newPresetId, name: newName, categories: [] };
                userPresetsCache.push(newPreset);
                console.log(`Mock created preset: ${newName}`);
                dom.presetSelector.dataset.lastValidPresetId = newPresetId; // Set this to be selected after repopulate
                await populatePresetSelector(); // Repopulate, which will also select it and load
                hideModal();
            }
        }
    ];
    showModal("Create New Preset", contentHTML, footerButtons);
    const inputField = document.getElementById('new-preset-name-input');
    if(inputField) inputField.focus();
}

function openEditPresetModal(presetIdToEdit, currentName) {
    if (presetIdToEdit === DEFAULT_PRESET_ID) {
        alert("The default preset cannot be edited."); // Should not happen if UI logic is correct
        if(dom.presetSelector) dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId; // Reset dropdown
        return;
    }
    const contentHTML = `
        <div>
            <label for="edit-preset-name-input" class="block text-sm font-medium text-text-primary mb-1">New Preset Name</label>
            <input type="text" id="edit-preset-name-input" value="${currentName}" 
                   class="w-full px-3 py-2 bg-primary-bg border border-gray-600 rounded-md text-text-primary focus:ring-accent focus:border-accent">
            <p id="edit-preset-error" class="text-red-500 text-sm mt-1 hidden"></p>
        </div>
    `;
    const footerButtons = [
        { text: 'Cancel', class: 'bg-gray-700 hover:bg-gray-600 text-text-primary', onClick: hideModal },
        {
            text: 'Save Changes', class: 'bg-accent hover:bg-accent-darker text-white', hideOnClick: false,
            onClick: async () => {
                const inputEl = document.getElementById('edit-preset-name-input');
                const errorEl = document.getElementById('edit-preset-error');
                const newName = inputEl ? inputEl.value.trim() : '';
                if(errorEl) errorEl.classList.add('hidden');
                if (!newName) {
                    if(inputEl) inputEl.focus();
                    if(errorEl) { errorEl.textContent = 'Preset name cannot be empty.'; errorEl.classList.remove('hidden'); }
                    return;
                }
                if (newName.toLowerCase() !== currentName.toLowerCase() && 
                    (userPresetsCache.find(p => p.id !== presetIdToEdit && p.name.toLowerCase() === newName.toLowerCase()) || 
                     (DEFAULT_PRESET_ID !== '' && window.defaultGroceryData && window.defaultGroceryData.name.toLowerCase() === newName.toLowerCase()))) {
                    if(inputEl) inputEl.focus();
                    if(errorEl) { errorEl.textContent = 'Another preset with this name already exists.'; errorEl.classList.remove('hidden'); }
                    return;
                }
                const presetInCache = userPresetsCache.find(p => p.id === presetIdToEdit);
                if (presetInCache && presetInCache.name !== newName) {
                    presetInCache.name = newName;
                    console.log(`Mock renamed preset ID '${presetIdToEdit}' to '${newName}'.`);
                    dom.presetSelector.dataset.lastValidPresetId = presetIdToEdit; // Ensure it remains selected
                    await populatePresetSelector(); // Repopulate to reflect name change and re-select
                } else if (!presetInCache) {
                    console.error("Preset to edit not found in cache, cannot update.");
                }
                hideModal();
            }
        }
    ];
    showModal(`Edit Preset: ${currentName}`, contentHTML, footerButtons);
    const inputField = document.getElementById('edit-preset-name-input');
    if(inputField) { inputField.focus(); inputField.select(); }
}

function openDeletePresetModal(presetIdToDelete, presetNameToDelete) {
    if (presetIdToDelete === DEFAULT_PRESET_ID) {
        alert("The default preset cannot be deleted."); // Should not happen
        if(dom.presetSelector) dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId; // Reset dropdown
        return;
    }
    const contentHTML = `<p>Are you sure you want to delete the preset "<strong>${presetNameToDelete}</strong>"? <br>This action cannot be undone.</p>`;
    const footerButtons = [
        { text: 'Cancel', class: 'bg-gray-700 hover:bg-gray-600 text-text-primary', onClick: hideModal },
        {
            text: 'Delete Preset', class: 'bg-red-600 hover:bg-red-700 text-white',
            onClick: async () => {
                userPresetsCache = userPresetsCache.filter(p => p.id !== presetIdToDelete);
                console.log(`Mock deleted preset: ${presetNameToDelete}`);
                dom.presetSelector.dataset.lastValidPresetId = DEFAULT_PRESET_ID; // Fallback to default
                await populatePresetSelector(); // Repopulate, will load default
                hideModal();
            }
        }
    ];
    showModal("Confirm Deletion", contentHTML, footerButtons);
}

// Central handler for preset selector changes (replaces standalone button handlers)
function handlePresetSelectorChange(selectElement) {
    const selectedValue = selectElement.value;
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const selectedText = selectedOption ? selectedOption.textContent : '';
    
    const lastValidPresetId = selectElement.dataset.lastValidPresetId || DEFAULT_PRESET_ID;
    const lastValidPresetOption = selectElement.querySelector(`option[value="${lastValidPresetId}"]`);
    const lastValidPresetName = lastValidPresetOption ? lastValidPresetOption.textContent : (window.defaultGroceryData ? window.defaultGroceryData.name : 'Grocery List');

    const resetToLastValid = () => {
        selectElement.value = lastValidPresetId;
    };

    switch (selectedValue) {
        case ACTION_CREATE_NEW_ID:
            openCreatePresetModal();
            resetToLastValid(); 
            break;
        case ACTION_EDIT_SELECTED_ID:
            if (lastValidPresetId === DEFAULT_PRESET_ID) {
                alert("Cannot edit the default preset. Please select a user preset to edit.");
                resetToLastValid();
            } else {
                openEditPresetModal(lastValidPresetId, lastValidPresetName);
            }
            // Modal handles its own closing and subsequent UI updates via populatePresetSelector
            // We still need to reset the selector if the modal is cancelled.
            // For now, let's assume modal takes care of it or we rely on prompt user flow
            // Best to reset after modal interaction is fully complete (success/cancel)
            // For now, this resetToLastValid might be too soon if modal is async
            // Let modal completion call populate which resets selector value.
            // If modal is cancelled, we need to reset. The current modal logic hides on cancel.
            // Let's add a specific reset in the modal cancel button perhaps, or handle it here.
            selectElement.value = lastValidPresetId; // Ensure selector resets if modal is simply cancelled
            break;
        case ACTION_DELETE_SELECTED_ID:
            if (lastValidPresetId === DEFAULT_PRESET_ID) {
                alert("Cannot delete the default preset.");
                resetToLastValid();
            } else {
                openDeletePresetModal(lastValidPresetId, lastValidPresetName);
            }
            selectElement.value = lastValidPresetId; // Ensure selector resets if modal is simply cancelled
            break;
        case ACTION_SEPARATOR_ID: // Should not be selectable if disabled
            resetToLastValid();
            break;
        default:
            // It's a regular preset ID
            selectElement.dataset.lastValidPresetId = selectedValue;
            htmx.trigger(document.body, 'loadPresetContent', { presetId: selectedValue, presetName: selectedText });
            break;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
    }
    
    populatePresetSelector(); // Initial population and load

    if (dom.genericModalCloseBtn) {
        dom.genericModalCloseBtn.onclick = () => {
            hideModal();
            // When modal is closed via X, reset selector to last valid preset
            if(dom.presetSelector && dom.presetSelector.dataset.lastValidPresetId) {
                dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId;
            }
        };
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !dom.genericModal.classList.contains('hidden')) {
            hideModal();
            if(dom.presetSelector && dom.presetSelector.dataset.lastValidPresetId) {
                dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId;
            }
        }
    });
    if (dom.genericModal) {
        dom.genericModal.addEventListener('click', (event) => {
            if (event.target === dom.genericModal) {
                hideModal();
                if(dom.presetSelector && dom.presetSelector.dataset.lastValidPresetId) {
                    dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId;
                }
            }
        });
    }
    // Removed old separate button handlers
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