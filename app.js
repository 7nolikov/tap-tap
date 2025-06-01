// Supabase Client Initialization
let supabase = null;
if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabase = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
} else {
    console.error("Supabase URL or Anon Key not configured in config.js or using placeholder values. Backend features will be limited.");
    const presetSelector = document.getElementById('preset-selector');
    if(presetSelector && presetSelector.firstChild && presetSelector.firstChild.nodeType === Node.TEXT_NODE) {
         presetSelector.firstChild.textContent += ' (Config Needed)';
    } else if (presetSelector) {
        console.warn("Consider adding a visual warning near the preset selector for missing config for Supabase.");
    }
}

// Global state for selected items
let selectedItems = {}; // Stores item_id: { name: "Item Name", count: 1, unit: "pcs", originalElementId: "...", incrementStep: 1 }

// DOM Elements Cache
const dom = {
    categoriesContainer: document.getElementById('categories-container'),
    presetSelector: document.getElementById('preset-selector'),
    sendButtonContainer: document.getElementById('send-button-container'),
    sendButton: document.getElementById('send-button'),
    selectedItemsPreview: document.getElementById('selected-items-preview'),
    headerLoadingIndicator: document.getElementById('header-loading-indicator'), // Added for preset options load
    categoriesLoadingIndicator: document.getElementById('categories-loading-indicator'), // For items load
    categoriesPlaceholder: document.getElementById('categories-placeholder'),
    addPresetBtn: document.getElementById('add-preset-btn'),
    editPresetBtn: document.getElementById('edit-preset-btn'),
    deletePresetBtn: document.getElementById('delete-preset-btn')
    // mainTitle: document.getElementById('main-title') // Removed, as select is the title
};

let currentPresetName = "Grocery List"; // Default to the prebuilt one
const DEFAULT_PRESET_ID = 'default_grocery_list_001';

// Action IDs for dropdown options
const ACTION_SEPARATOR_ID = 'action_separator';
const ACTION_CREATE_NEW_ID = 'action_create_new_preset';
const ACTION_EDIT_CURRENT_ID = 'action_edit_current_preset';
const ACTION_DELETE_CURRENT_ID = 'action_delete_current_preset';

// Central handler for preset selector changes
function handlePresetChange(selectElement) {
    const selectedValue = selectElement.value;
    const selectedText = selectElement.options[selectElement.selectedIndex].text;

    console.log('Preset selection changed to:', selectedValue, selectedText);

    // Reset to last valid preset if an action is selected, after performing the action
    const resetToLastValid = () => {
        if (dom.presetSelector.dataset.lastValidPresetId) {
            dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId;
        } else {
            dom.presetSelector.value = DEFAULT_PRESET_ID; // Fallback to default
        }
    };

    switch (selectedValue) {
        case ACTION_CREATE_NEW_ID:
            handleAddPreset();
            resetToLastValid();
            break;
        case ACTION_EDIT_CURRENT_ID:
            // Pass the ID of the preset that was selected *before* choosing "Edit"
            handleEditPreset(dom.presetSelector.dataset.lastValidPresetId);
            resetToLastValid();
            break;
        case ACTION_DELETE_CURRENT_ID:
            // Pass the ID of the preset that was selected *before* choosing "Delete"
            handleDeletePreset(dom.presetSelector.dataset.lastValidPresetId);
            // handleDeletePreset will handle loading default if current is deleted.
            // If not deleted, resetToLastValid will correctly re-select it.
            // If deletion occurs and default is loaded, lastValidPresetId will be updated there.
            // So, a conditional reset might be better or ensure handleDeletePreset updates lastValidPresetId.
            // For now, let's rely on handleDeletePreset's logic for resetting selection on successful delete.
            // If deletion is cancelled, then reset.
            // This logic is a bit tricky; will refine in handleDeletePreset.
            break;
        case ACTION_SEPARATOR_ID:
            resetToLastValid(); // Do nothing, just reset
            break;
        default:
            // It's a regular preset ID
            htmx.trigger(document.body, 'loadPresetContent', { presetId: selectedValue, presetName: selectedText });
            break;
    }
}

// Listen for the custom event to load preset content (triggered by handlePresetChange or initial load)
document.body.addEventListener('loadPresetContent', function(event) {
    if (!event.detail || !event.detail.presetId) {
        console.error('loadPresetContent event triggered without presetId in detail.');
        return;
    }
    const presetIdToLoad = event.detail.presetId;
    currentPresetName = event.detail.presetName || 'Selected List';

    console.log(`Handling loadPresetContent for presetId: ${presetIdToLoad}, name: ${currentPresetName}`);
    if(dom.presetSelector) dom.presetSelector.dataset.lastValidPresetId = presetIdToLoad; 

    resetSelectedItemsAndUI(); 
    if (dom.categoriesPlaceholder) {
        htmx.removeClass(dom.categoriesPlaceholder, 'hidden'); 
        dom.categoriesPlaceholder.textContent = 'Loading items...';
    }
    if (dom.categoriesContainer) dom.categoriesContainer.innerHTML = ''; 

    if (presetIdToLoad === DEFAULT_PRESET_ID) {
        console.log("Rendering default grocery list from local data.");
        if (window.defaultGroceryData) {
            renderPresetFromLocalData(window.defaultGroceryData, 'categories-container');
            if (dom.categoriesPlaceholder) htmx.addClass(dom.categoriesPlaceholder, 'hidden');
        } else {
            console.error("Default grocery data not found!");
            if (dom.categoriesPlaceholder) dom.categoriesPlaceholder.textContent = 'Error: Default data missing.';
        }
    } else {
        console.log(`Triggering HTMX GET for server-side preset: ${presetIdToLoad}`);
        if (dom.categoriesContainer) {
            // Pass preset_id directly in the event detail for htmx:loadContentManually
            htmx.trigger(dom.categoriesContainer, "htmx:loadContentManually", {params: {preset_id: presetIdToLoad}}); 
        } else {
            console.error("categoriesContainer not found for HTMX trigger");
        }
    }
});

async function populatePresetSelector() {
    if (!dom.presetSelector) return;
    dom.presetSelector.innerHTML = ''; // Clear "Loading..."

    // 1. Add Default Grocery List
    if (window.defaultGroceryData) {
        const defaultOption = document.createElement('option');
        defaultOption.value = DEFAULT_PRESET_ID;
        defaultOption.textContent = window.defaultGroceryData.name;
        dom.presetSelector.appendChild(defaultOption);
    } else if (dom.presetSelector.options.length === 0) { // If default data fails AND no options yet
        const errOption = document.createElement('option');
        errOption.value = "";
        errOption.textContent = "Error loading default";
        errOption.disabled = true;
        dom.presetSelector.appendChild(errOption);
    }
     if (!window.SUPABASE_URL || window.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        const configNeededOpt = document.createElement('option');
        configNeededOpt.value = "";
        configNeededOpt.textContent = "(Supabase Config Needed)";
        configNeededOpt.disabled = true;
        dom.presetSelector.appendChild(configNeededOpt);
    }

    // 2. Fetch and Add User-Specific Presets
    const userPresets = await fetchUserPresets(); 
    userPresets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        dom.presetSelector.appendChild(option);
    });

    // 3. Add Action Options (Separator, Create, Edit, Delete)
    const separator = document.createElement('option');
    separator.value = ACTION_SEPARATOR_ID;
    separator.textContent = '───── ACTIONS ─────';
    separator.disabled = true; 
    dom.presetSelector.appendChild(separator);

    const createOption = document.createElement('option');
    createOption.value = ACTION_CREATE_NEW_ID;
    createOption.textContent = '➕ Create New Preset...';
    dom.presetSelector.appendChild(createOption);

    const editOption = document.createElement('option');
    editOption.value = ACTION_EDIT_CURRENT_ID;
    editOption.textContent = '✏️ Edit Selected Preset...';
    dom.presetSelector.appendChild(editOption);
    
    const deleteOption = document.createElement('option');
    deleteOption.value = ACTION_DELETE_CURRENT_ID;
    deleteOption.textContent = '🗑️ Delete Selected Preset...';
    dom.presetSelector.appendChild(deleteOption);

    // Set initial selection and trigger content load
    dom.presetSelector.value = DEFAULT_PRESET_ID; 
    currentPresetName = window.defaultGroceryData ? window.defaultGroceryData.name : "My List";
    dom.presetSelector.dataset.lastValidPresetId = DEFAULT_PRESET_ID;

    // Trigger initial load for the default preset
    setTimeout(() => {
         console.log("PopulatePresetSelector: Triggering initial load for default preset.");
         // Check if presetSelector is still valid and has a selected option
         if (dom.presetSelector && dom.presetSelector.options.length > 0 && dom.presetSelector.selectedIndex !== -1) {
             htmx.trigger(document.body, 'loadPresetContent', { 
                presetId: dom.presetSelector.value, 
                presetName: dom.presetSelector.options[dom.presetSelector.selectedIndex].text 
            });
         } else {
             console.error("Preset selector not populated correctly for initial load trigger.");
             if(dom.categoriesPlaceholder) dom.categoriesPlaceholder.textContent = "Error initializing presets.";
         }
    }, 50);
}

async function fetchUserPresets() {
    console.log("Fetching user presets (mock)... ");
    if (!supabase) {
        console.warn("Supabase client not initialized. Returning empty user presets.");
        return [];
    }
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200)); 
    // Example: const { data, error } = await supabase.from('presets').select('id, name').eq('user_id', 'current_user_id');
    // For now, mock data:
    return [
        { id: 'user_preset_123', name: 'My Weekly Shop' },
        { id: 'user_preset_456', name: 'Weekend BBQ Plan' }
    ];
}

function handleAddPreset() {
    console.log("Action: Create New Preset selected");
    const newPresetName = prompt("Enter name for the new preset:");
    if (newPresetName) {
        alert(`Placeholder: Create preset named "${newPresetName}" (UI/API call needed).`);
        // Mock: Add to selector and select it (will require more robust logic for actual data persistence)
        const newId = `user_preset_${Date.now()}`;
        const option = document.createElement('option');
        option.value = newId;
        option.textContent = newPresetName;
        
        // Insert before the separator
        const separator = dom.presetSelector.querySelector(`option[value="${ACTION_SEPARATOR_ID}"]`);
        if (separator) {
            dom.presetSelector.insertBefore(option, separator);
        } else {
            dom.presetSelector.appendChild(option); // Fallback
        }
        dom.presetSelector.value = newId;
        // Trigger load for this new (mock) preset
        htmx.trigger(document.body, 'loadPresetContent', { presetId: newId, presetName: newPresetName });
        // Note: This new preset will be client-side only until backend is implemented.
    } else {
        console.log("Preset creation cancelled.");
    }
}

function handleEditPreset(presetIdToEdit) {
    if (!presetIdToEdit || presetIdToEdit === DEFAULT_PRESET_ID) {
        alert("The default preset cannot be edited. Please select a user-defined preset first if you intended to edit one.");
        return;
    }
    const presetOption = dom.presetSelector.querySelector(`option[value="${presetIdToEdit}"]`);
    const currentName = presetOption ? presetOption.textContent : "Selected Preset";

    console.log(`Action: Edit Preset selected for ID: ${presetIdToEdit}, Name: ${currentName}`);
    const newName = prompt(`Enter new name for preset "${currentName}":`, currentName);
    if (newName && newName !== currentName) {
        alert(`Placeholder: Rename preset ID '${presetIdToEdit}' to "${newName}" (UI/API call needed).`);
        // Mock: Update in selector
        if (presetOption) {
            presetOption.textContent = newName;
        }
        // If this was the currently loaded preset, update the title/name potentially
        if (dom.presetSelector.dataset.lastValidPresetId === presetIdToEdit) {
            currentPresetName = newName; 
            // If main title element existed, would update it here. Selector text is already updated.
        }
    } else if (newName === currentName) {
        console.log("Preset name unchanged.");
    } else {
        console.log("Preset editing cancelled.");
    }
}

async function handleDeletePreset(presetIdToDelete) {
     if (!presetIdToDelete || presetIdToDelete === DEFAULT_PRESET_ID) {
        alert("The default preset cannot be deleted. Please select a user-defined preset first if you intended to delete one.");
        if (dom.presetSelector.dataset.lastValidPresetId) { // Reset dropdown to last valid if "Delete" was chosen on default
            dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId;
        }
        return;
    }

    const presetOption = dom.presetSelector.querySelector(`option[value="${presetIdToDelete}"]`);
    const presetName = presetOption ? presetOption.textContent : "Selected Preset";

    if (confirm(`Are you sure you want to delete the preset: "${presetName}"?`)) {
        console.log(`Action: Delete Preset for ID: ${presetIdToDelete}, Name: ${presetName}`);
        alert(`Placeholder: Delete preset "${presetName}" (API call needed).`);
        
        if (presetOption) {
            presetOption.remove();
        }

        // Load default preset as a fallback
        dom.presetSelector.value = DEFAULT_PRESET_ID; 
        const defaultOption = dom.presetSelector.options[0]; // Assuming default is always first after potential removals
        htmx.trigger(document.body, 'loadPresetContent', { 
            presetId: DEFAULT_PRESET_ID, 
            presetName: defaultOption ? defaultOption.text : "Grocery List"
        });
        // dom.presetSelector.dataset.lastValidPresetId is updated by loadPresetContent
    } else {
        console.log("Preset deletion cancelled.");
        // If deletion is cancelled, ensure the dropdown is reset to the preset that was active
        if (dom.presetSelector.dataset.lastValidPresetId) {
            dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        // Telegram.WebApp.expand(); // Consider expanding the Mini App view
    }
    
    populatePresetSelector(); 
    // Event listeners for old dedicated buttons are removed.
    // The 'change' event on the presetSelector is handled by `handlePresetChange` via hx-on.
});

function renderPresetFromLocalData(presetData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID ${containerId} not found for rendering local data.`);
        return;
    }
    container.innerHTML = ''; 
    resetSelectedItemsAndUI();

    if (!presetData || !presetData.categories || presetData.categories.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-10 non-selectable">No categories or items in this preset.</p>';
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
                // Ensure transition class is present for animations
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
    console.log("Local preset data rendered.");
}

function triggerItemAnimation(itemElementId, animationType = 'flash') {
    const itemDiv = document.getElementById(itemElementId);
    if (!itemDiv) return;

    // Ensure transition classes are on the itemDiv (usually set in renderPresetFromLocalData)
    // itemDiv.classList.add('transition-all', 'duration-150', 'ease-in-out'); // If not already set

    if (animationType === 'flash') {
        itemDiv.classList.remove('bg-accent/20'); 
        itemDiv.classList.add('bg-accent/30'); 
        setTimeout(() => {
            itemDiv.classList.remove('bg-accent/30');
            const item = selectedItems[Object.keys(selectedItems).find(key => selectedItems[key].originalElementId === itemElementId)];
            if (item && item.count > 0) { 
                 itemDiv.classList.add('bg-accent/20', 'border', 'border-accent');
            }
        }, 150); // Flash duration
    } else if (animationType === 'fadeOut') {
        itemDiv.classList.add('opacity-0'); // Tailwind for opacity: 0
        // itemDiv.classList.add('scale-90'); // Optional: slightly shrink
        // The actual removal from DOM is delayed in decrementItem
    }
}

function incrementOrSelectItem(itemId, itemName, unit, itemElementId, itemIncrementStep = 1) {
    const isNewItem = !selectedItems[itemId];
    const step = parseFloat(itemIncrementStep) || 1;

    if (!selectedItems[itemId]) {
        selectedItems[itemId] = { name: itemName, count: step, unit: unit, originalElementId: itemElementId, incrementStep: step };
    } else {
        selectedItems[itemId].count = (parseFloat(selectedItems[itemId].count) || 0) + step;
        if (step % 1 !== 0 || (selectedItems[itemId].count % 1 !== 0 && String(selectedItems[itemId].count).includes('.'))) {
            const stepDecimals = (String(step).split('.')[1] || '').length;
            const countDecimals = (String(selectedItems[itemId].count).split('.')[1] || '').length;
            const precision = Math.max(stepDecimals, countDecimals, 1); // Ensure at least 1 for safety with whole numbers if needed
            selectedItems[itemId].count = parseFloat(selectedItems[itemId].count.toFixed(precision));
        } else {
             selectedItems[itemId].count = parseFloat(selectedItems[itemId].count.toFixed(0)); // Ensure whole number if steps are whole
        }
    }
    updateItemUIDisplay(itemId, itemName, unit, itemElementId, isNewItem);
    updateSendButtonVisibilityAndPreview();
    triggerItemAnimation(itemElementId, 'flash');
}

function decrementItem(itemId, itemName, unit, itemElementId, itemIncrementStep = 1) {
    event.stopPropagation(); 
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
                    // Reset item to its initial state (unselected appearance)
                    const itemIcon = itemName.split(' ')[0]; 
                    const actualItemName = itemName.substring(itemIcon.length).trim();
                    // Clear any dynamic styles from animation/selection
                    itemDiv.className = 'flex items-center justify-between p-3 bg-item-bg rounded-md hover:bg-gray-700/50 cursor-pointer transition-all duration-150 ease-in-out';
                    itemDiv.style.opacity = ''; 
                    // itemDiv.style.transform = ''; // If scale was used

                    itemDiv.innerHTML = `
                        <div class="flex items-center flex-grow min-w-0">
                            <span class="text-xl mr-3 non-selectable">${itemIcon}</span> 
                            <span class="text-text-primary truncate non-selectable">${actualItemName}</span>
                        </div>
                        <div class="flex items-center flex-shrink-0 ml-2">
                            <span class="text-text-secondary mr-2 whitespace-nowrap non-selectable">0 ${unit}</span>
                        </div>
                    `;
                    // Re-attach click handler with original increment step
                    const originalIncrementStep = parseFloat(itemIncrementStep) || 1; // Recapture from parameter
                    itemDiv.onclick = () => incrementOrSelectItem(itemId, itemName, unit, itemElementId, originalIncrementStep);
                }, 150); // Reduced timeout for faster removal animation (matches CSS transition)
            }
        } else {
            updateItemUIDisplay(itemId, itemName, unit, itemElementId, false);
        }
    }
    updateSendButtonVisibilityAndPreview();
}

function updateItemUIDisplay(itemId, itemName, unit, itemElementId, isNewlyAdded = false) {
    const itemDiv = document.getElementById(itemElementId);
    if (!itemDiv) {
        console.error(`Item element with ID ${itemElementId} not found for UI update.`);
        return;
    }

    const itemData = selectedItems[itemId];
    const itemIcon = itemName.split(' ')[0]; 
    const actualItemName = itemName.substring(itemIcon.length).trim();
    
    // Determine increment step for re-attaching handlers or passing to decrement.
    // Prioritize from selectedItems, then try to find in defaultGroceryData, fallback to 1.
    let incrementStep = 1;
    if (itemData && itemData.incrementStep) {
        incrementStep = itemData.incrementStep;
    } else if (window.defaultGroceryData) {
        // Find item in default data to get its original incrementStep
        const flatItems = window.defaultGroceryData.categories.flatMap(c => c.items);
        const defaultItem = flatItems.find(i => i.id === itemId); // Assuming itemId is consistent
        if (defaultItem && defaultItem.incrementStep) {
            incrementStep = defaultItem.incrementStep;
        }
    }
    incrementStep = parseFloat(incrementStep) || 1;

    // Reset animation helper classes explicitly if any were stuck and ensure base classes are correct
    itemDiv.className = 'flex items-center justify-between p-3 rounded-md cursor-pointer transition-all duration-150 ease-in-out'; 
    itemDiv.style.opacity = ''; // itemDiv.style.transform = '';

    if (itemData && itemData.count > 0) {
        itemDiv.classList.add('bg-accent/20', 'border', 'border-accent');
        itemDiv.classList.remove('bg-item-bg', 'hover:bg-gray-700/50');
        itemDiv.onclick = null; // Disable main click when +/- buttons are present
        
        let displayCount = itemData.count;
        // Handle precision for display based on increment step's nature
        if (incrementStep % 1 !== 0 || (typeof displayCount === 'number' && displayCount % 1 !== 0)) {
             const stepDecimals = (String(incrementStep).split('.')[1] || '').length;
             const countDecimals = (String(displayCount).split('.')[1] || '').length;
             displayCount = displayCount.toFixed(Math.max(stepDecimals, countDecimals,1));
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
        itemDiv.onclick = () => incrementOrSelectItem(itemId, itemName, unit, itemElementId, incrementStep);
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
    // If newly added, ensure selected styles are applied (might be redundant if flash handles it, but safe)
    if (isNewlyAdded && itemData && itemData.count > 0) {
        itemDiv.classList.add('bg-accent/20', 'border', 'border-accent');
        itemDiv.classList.remove('bg-item-bg', 'hover:bg-gray-700/50');
    }
}

function updateSendButtonVisibilityAndPreview() {
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

function resetSelectedItemsAndUI() {
    selectedItems = {};
    updateSendButtonVisibilityAndPreview();
    console.log("Selected items reset. UI will be re-rendered by local function or HTMX.");
}

function sendList() {
    if (Object.keys(selectedItems).length === 0) {
        console.log("No items selected to send.");
        return;
    }
    
    let listTitle = "My List"; // Default title
    if(dom.presetSelector && dom.presetSelector.dataset.lastValidPresetId){
        const lastValidOption = dom.presetSelector.querySelector(`option[value="${dom.presetSelector.dataset.lastValidPresetId}"]`);
        if(lastValidOption) listTitle = lastValidOption.textContent;
    } else if (currentPresetName) { // Fallback to currentPresetName if lastValidPresetId is somehow not set
        listTitle = currentPresetName;
    }

    let formattedList = `${listTitle}:\n`;
    for (const itemId in selectedItems) {
        const item = selectedItems[itemId];
        let displayCount = item.count;
        const step = item.incrementStep || 1;
        if (step % 1 !== 0 || (typeof displayCount === 'number' && displayCount % 1 !== 0)) {
            const stepDecimals = (String(step).split('.')[1] || '').length;
            const countDecimals = (String(displayCount).split('.')[1] || '').length;
            displayCount = Number(displayCount).toFixed(Math.max(stepDecimals, countDecimals,1));
        }
        formattedList += `- ${item.name} x${displayCount} ${item.unit}\n`; 
    }
    formattedList = formattedList.trim();
    console.log("Formatted List to send:", formattedList);

    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.switchInlineQuery) {
        try {
            window.Telegram.WebApp.switchInlineQuery(formattedList);
        } catch (e) {
            console.error("Error using switchInlineQuery:", e);
            alert("Could not share list via Telegram. Error: " + e.message);
        }
    } else {
        alert("Telegram sharing not available. List to share (copy manually):\n\n" + formattedList);
        console.warn("Telegram WebApp API not available for sharing.");
    }
}

document.body.addEventListener('htmx:beforeRequest', function(evt) {
    const requestPath = evt.detail.pathInfo ? evt.detail.pathInfo.requestPath : "Unknown path";
    console.log("HTMX request starting...", requestPath, evt.detail.elt.id);
    // Show general loading state if needed, though hx-indicator is preferred for specific elements
});

document.body.addEventListener('htmx:afterSettle', function(evt) {
    const requestPath = evt.detail.pathInfo ? evt.detail.pathInfo.requestPath : "Unknown path";
    console.log("HTMX request settled.", requestPath, evt.detail.elt.id);
    // This is a good place for any global UI updates needed after any HTMX swap.
});

// Make functions globally accessible for inline HTML onclick handlers and hx-on
window.incrementOrSelectItem = incrementOrSelectItem;
window.decrementItem = decrementItem;
window.sendList = sendList;
window.resetSelectedItemsAndUI = resetSelectedItemsAndUI; 
window.handlePresetChange = handlePresetChange; // Make central handler global

console.log("app.js loaded. Default grocery data and action handling initialized."); 