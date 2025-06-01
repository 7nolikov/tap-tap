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
let selectedItems = {}; // Stores item_id: { name: "Item Name", count: 1, unit: "pcs", originalElementId: "..." }

// DOM Elements Cache
const dom = {
    categoriesContainer: document.getElementById('categories-container'),
    presetSelector: document.getElementById('preset-selector'),
    sendButtonContainer: document.getElementById('send-button-container'),
    sendButton: document.getElementById('send-button'),
    selectedItemsPreview: document.getElementById('selected-items-preview'),
    headerLoadingIndicator: document.getElementById('header-loading-indicator'), // Added for preset options load
    categoriesLoadingIndicator: document.getElementById('categories-loading-indicator'), // For items load
    categoriesPlaceholder: document.getElementById('categories-placeholder')
    // mainTitle: document.getElementById('main-title') // Removed, as select is the title
};

let currentPresetName = "Grocery List"; // Default to the prebuilt one
const DEFAULT_PRESET_ID = 'default_grocery_list_001';
const CREATE_NEW_PRESET_ID = 'action_create_new_preset';
const MANAGE_PRESETS_SEPARATOR_ID = 'action_manage_separator';

// Listen for the custom event to load preset content
document.body.addEventListener('loadPresetContent', function(event) {
    if (!event.detail || !event.detail.presetId) {
        console.error('loadPresetContent event triggered without presetId in detail.');
        return;
    }
    const presetIdToLoad = event.detail.presetId;
    currentPresetName = event.detail.presetName || 'Selected List';

    // Handle Action IDs first
    if (presetIdToLoad === CREATE_NEW_PRESET_ID) {
        console.log("Action: Create New Preset selected");
        alert("Placeholder: Show UI for creating a new preset!"); 
        // Reset selector to previously selected valid preset if possible, or to default
        if (dom.presetSelector.dataset.lastValidPresetId) {
            dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId;
        } else {
            dom.presetSelector.value = DEFAULT_PRESET_ID;
        }
        // Manually trigger a re-render of the last valid/default preset name
        const selectedOption = dom.presetSelector.options[dom.presetSelector.selectedIndex];
        if(selectedOption) currentPresetName = selectedOption.text;
        return; // Stop further processing for action IDs
    }
    if (presetIdToLoad === MANAGE_PRESETS_SEPARATOR_ID) {
        // This is a non-selectable separator, reset to last valid selection.
        if (dom.presetSelector.dataset.lastValidPresetId) {
            dom.presetSelector.value = dom.presetSelector.dataset.lastValidPresetId;
        } else {
            dom.presetSelector.value = DEFAULT_PRESET_ID; 
        }
        return; 
    }

    console.log(`Handling loadPresetContent for presetId: ${presetIdToLoad}, name: ${currentPresetName}`);
    dom.presetSelector.dataset.lastValidPresetId = presetIdToLoad; // Store last validly loaded preset

    resetSelectedItemsAndUI(); // Clear previous selections and UI state
    htmx.removeClass(dom.categoriesPlaceholder, 'hidden'); // Show placeholder initially
    dom.categoriesPlaceholder.textContent = 'Loading items...';
    dom.categoriesContainer.innerHTML = ''; // Clear previous content before loading new or showing placeholder

    if (presetIdToLoad === DEFAULT_PRESET_ID) {
        console.log("Rendering default grocery list from local data.");
        if (window.defaultGroceryData) {
            renderPresetFromLocalData(window.defaultGroceryData, 'categories-container');
            htmx.addClass(dom.categoriesPlaceholder, 'hidden'); // Hide placeholder after rendering
        } else {
            console.error("Default grocery data not found!");
            dom.categoriesPlaceholder.textContent = 'Error: Default data missing.';
        }
    } else {
        // For non-default presets, trigger HTMX to fetch from server
        // Ensure #categories-container has the correct hx-vals or includes presetId for the GET request
        console.log(`Triggering HTMX GET for server-side preset: ${presetIdToLoad}`);
        // The hx-get on #categories-container should pick up the presetId from the event or hx-include
        // We might need to explicitly pass it if hx-include isn't picking it up from the triggering select
        // For now, index.html's #categories-container uses hx-include="#preset-selector"
        // We need to ensure the #preset-selector has the *correct* value when this is triggered not from its own change event.
        // It might be safer to pass presetId via hx-vals in the trigger itself if this becomes an issue.
        // The `hx-trigger="loadPresetContent from:body"` on categories-container will fire.
        // It needs `hx-vals` or similar to get `event.detail.presetId` for its GET request.
        // Let's assume the hx-include="#preset-selector" on categories-container is what we rely on.
        // The select element should have its value updated before this event is fully processed.
         htmx.trigger(dom.categoriesContainer, "htmx:loadContentManually", {preset_id: presetIdToLoad}); 
         // We need to add a handler for this or adjust how categories-container fetches.
    }
});

async function populatePresetSelector() {
    if (!dom.presetSelector) return;
    dom.presetSelector.innerHTML = ''; // Clear existing options (like "Loading Presets...")

    // 1. Add Default Grocery List
    if (window.defaultGroceryData) {
        const defaultOption = document.createElement('option');
        defaultOption.value = DEFAULT_PRESET_ID;
        defaultOption.textContent = window.defaultGroceryData.name;
        dom.presetSelector.appendChild(defaultOption);
    }

    // 2. Add Separator and CRUD Actions
    const separator = document.createElement('option');
    separator.value = MANAGE_PRESETS_SEPARATOR_ID;
    separator.textContent = '───── MANAGE ─────';
    separator.disabled = true; // Make it non-selectable
    dom.presetSelector.appendChild(separator);

    const createOption = document.createElement('option');
    createOption.value = CREATE_NEW_PRESET_ID;
    createOption.textContent = 'Create New Preset...';
    dom.presetSelector.appendChild(createOption);

    // Placeholder for fetching user-specific presets
    // This would be an async call, e.g., to supabase
    // For now, let's simulate adding a couple of user presets
    const userPresets = await fetchUserPresets(); // This will be a mock for now
    userPresets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        dom.presetSelector.appendChild(option);
    });

    // Set initial selection and trigger content load
    dom.presetSelector.value = DEFAULT_PRESET_ID; // Default to Grocery List
    currentPresetName = window.defaultGroceryData ? window.defaultGroceryData.name : "My List";
    dom.presetSelector.dataset.lastValidPresetId = DEFAULT_PRESET_ID;

    setTimeout(() => {
         console.log("PopulatePresetSelector: Triggering initial load for default preset.");
         htmx.trigger(document.body, 'loadPresetContent', { 
            presetId: dom.presetSelector.value, 
            presetName: dom.presetSelector.options[dom.presetSelector.selectedIndex].text 
        });
    }, 50);
}

// Mock function for fetching user presets - replace with actual API call
async function fetchUserPresets() {
    console.log("Fetching user presets (mock)... ");
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500)); 
    // In a real app, this would be: const { data, error } = await supabase.from('presets').select('id, name').eq('user_id', 'current_user_id');
    return [
        { id: 'user_preset_123', name: 'My Weekly Shop' },
        { id: 'user_preset_456', name: 'Weekend BBQ Plan' }
    ];
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
    }

    populatePresetSelector(); // Populate the dropdown with defaults, actions, and user presets

    if (dom.presetSelector) {
        // Add the default "Grocery List" option
        if (window.defaultGroceryData) {
            const defaultOption = document.createElement('option');
            defaultOption.value = DEFAULT_PRESET_ID;
            defaultOption.textContent = window.defaultGroceryData.name;
            defaultOption.selected = true; // Make it selected by default
            dom.presetSelector.appendChild(defaultOption);
            currentPresetName = window.defaultGroceryData.name; // Set initial preset name

            // Trigger initial content load for the default preset
            // Use a slight delay to ensure HTMX has processed the initial select attributes if any
            setTimeout(() => {
                 console.log("DOMContentLoaded: Triggering initial load for default preset.");
                 htmx.trigger(document.body, 'loadPresetContent', { 
                    presetId: DEFAULT_PRESET_ID, 
                    presetName: window.defaultGroceryData.name 
                });
            }, 100); // Small delay for safety

        } else {
            console.error("Default grocery data not found on DOMContentLoaded.");
            if(dom.categoriesPlaceholder) dom.categoriesPlaceholder.textContent = 'Critical error: Default data missing.';
        }
        
        // HTMX will handle fetching user-specific presets for the select if configured to do so.
        // For now, the select only has the default, and hx-get on it is for *options*.
        // We can later add hx-get to fetch more <option> elements and append them.
        // For example, after adding the default: htmx.ajax('GET', '/api/user-preset-options-html', { target: dom.presetSelector, swap: 'beforeend' });

    } else {
        console.error("Preset selector not found in DOM.");
    }
});

function renderPresetFromLocalData(presetData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID ${containerId} not found for rendering local data.`);
        return;
    }
    container.innerHTML = ''; // Clear previous content (e.g., loading indicator)
    resetSelectedItemsAndUI(); // Ensure selections are cleared

    if (!presetData || !presetData.categories || presetData.categories.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-10">No categories or items in this preset.</p>';
        return;
    }

    presetData.categories.forEach(category => {
        const section = document.createElement('section');
        section.className = `bg-container-bg p-4 rounded-lg shadow-lg category-border ${category.borderColorClass || 'border-gray-600'}`;
        // section.style.borderColor = category.color_hex; // Using Tailwind classes now

        const title = document.createElement('h2');
        title.className = `text-xl font-semibold mb-4 ${category.textColorClass || 'text-text-primary'}`;
        title.textContent = category.name;
        section.appendChild(title);

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'space-y-3';

        if (category.items && category.items.length > 0) {
            category.items.forEach(item => {
                // Unique element ID for each item div to manage its state
                const itemElementId = `item-${presetData.id}-${category.id}-${item.id}`.replace(/[^a-zA-Z0-9-_]/g, '-');
                const itemDiv = document.createElement('div');
                itemDiv.id = itemElementId;
                itemDiv.className = 'flex items-center justify-between p-3 bg-item-bg rounded-md hover:bg-gray-700/50 cursor-pointer';
                
                // Store item data for easier access in event handlers if needed, though direct params are used
                // itemDiv.dataset.itemId = item.id;
                // itemDiv.dataset.itemName = item.name;
                // itemDiv.dataset.itemUnit = item.unit;

                const itemIcon = item.name.split(' ')[0];
                const actualItemName = item.name.substring(itemIcon.length).trim();

                itemDiv.innerHTML = `
                    <div class="flex items-center flex-grow min-w-0">
                        <span class="text-xl mr-3">${itemIcon}</span> 
                        <span class="text-text-primary truncate">${actualItemName}</span>
                    </div>
                    <div class="flex items-center flex-shrink-0 ml-2">
                        <span class="text-text-secondary mr-2 whitespace-nowrap">0 ${item.unit}</span>
                        <!-- No plus button here, click on itemDiv handles it -->
                    </div>
                `;
                // The main div click will now behave like the + button for unselected items
                itemDiv.onclick = () => incrementOrSelectItem(item.id, item.name, item.unit, itemElementId);

                itemsContainer.appendChild(itemDiv);
            });
        } else {
            const noItemsP = document.createElement('p');
            noItemsP.className = 'text-sm text-gray-500';
            noItemsP.textContent = 'No items in this category yet.';
            itemsContainer.appendChild(noItemsP);
        }
        section.appendChild(itemsContainer);
        container.appendChild(section);
    });
    console.log("Local preset data rendered.");
}

// Item Interaction Logic (incrementOrSelectItem, incrementItem, decrementItem, updateItemUIDisplay)
// These functions remain largely the same as before.
// Ensure they are correctly creating/updating HTML that matches the `index.html` examples.

function triggerItemAnimation(itemElementId, animationType = 'flash') {
    const itemDiv = document.getElementById(itemElementId);
    if (!itemDiv) return;
    if (animationType === 'flash') {
        itemDiv.classList.remove('bg-accent/20'); // Remove selected color if present, to flash base item bg
        itemDiv.classList.add('bg-accent/30'); 
        setTimeout(() => {
            itemDiv.classList.remove('bg-accent/30');
            // Re-apply selected state if item is still selected
            const itemId = itemElementId.includes(DEFAULT_PRESET_ID) ? itemElementId.split('-').pop() : itemElementId.substring(itemElementId.indexOf(currentPresetName) + currentPresetName.length +1); // Heuristic to get item ID from element ID
            // This item ID extraction is fragile, better to store itemId on the element or pass it around.
            // For now, we assume itemElementId might be complex. A better approach is needed for robustly getting item ID.
            if (selectedItems[itemId] && selectedItems[itemId].count > 0) { 
                 itemDiv.classList.add('bg-accent/20', 'border', 'border-accent');
            }
        }, 150);
    } else if (animationType === 'fadeOut') {
        itemDiv.classList.add('opacity-0', 'scale-90');
        // setTimeout for DOM manipulation is in decrementItem
    }
}

function incrementOrSelectItem(itemId, itemName, unit, itemElementId) {
    const isNewItem = !selectedItems[itemId];
    if (!selectedItems[itemId]) {
        selectedItems[itemId] = { name: itemName, count: 1, unit: unit, originalElementId: itemElementId };
    } else {
        selectedItems[itemId].count++;
    }
    updateItemUIDisplay(itemId, itemName, unit, itemElementId, isNewItem);
    updateSendButtonVisibilityAndPreview();
    triggerItemAnimation(itemElementId, 'flash');
}

function decrementItem(itemId, itemName, unit, itemElementId) {
    event.stopPropagation(); 
    if (selectedItems[itemId]) {
        selectedItems[itemId].count--;
        if (selectedItems[itemId].count <= 0) {
            delete selectedItems[itemId];
            const itemDiv = document.getElementById(itemElementId);
            if (itemDiv) {
                triggerItemAnimation(itemElementId, 'fadeOut');
                // Delay DOM update to allow fadeOut animation
                setTimeout(() => {
                    const itemIcon = itemName.split(' ')[0]; 
                    const actualItemName = itemName.substring(itemIcon.length).trim();
                    itemDiv.classList.remove('bg-accent/20', 'border', 'border-accent', 'opacity-0', 'scale-90');
                    itemDiv.classList.add('bg-item-bg', 'hover:bg-gray-700/50');
                    itemDiv.style.opacity = ''; itemDiv.style.transform = ''; // Reset animation styles explicitly
                    itemDiv.innerHTML = `
                        <div class="flex items-center flex-grow min-w-0">
                            <span class="text-xl mr-3">${itemIcon}</span> 
                            <span class="text-text-primary truncate">${actualItemName}</span>
                        </div>
                        <div class="flex items-center flex-shrink-0 ml-2">
                            <span class="text-text-secondary mr-2 whitespace-nowrap">0 ${unit}</span>
                        </div>
                    `;
                    itemDiv.onclick = () => incrementOrSelectItem(itemId, itemName, unit, itemElementId);
                }, 300); // Duration of fadeOut animation
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

    // Reset animation helper classes if any were stuck
    itemDiv.classList.remove('opacity-0', 'scale-90', 'bg-accent/30');
    itemDiv.style.opacity = ''; itemDiv.style.transform = '';

    if (itemData && itemData.count > 0) {
        itemDiv.classList.add('bg-accent/20', 'border', 'border-accent');
        itemDiv.classList.remove('bg-item-bg', 'hover:bg-gray-700/50');
        itemDiv.onclick = null; // Remove main div click when item is selected and has +/- buttons
        itemDiv.innerHTML = `
            <div class="flex items-center flex-grow min-w-0">
                <span class="text-xl mr-3">${itemIcon}</span> 
                <span class="text-text-primary truncate">${actualItemName}</span>
            </div>
            <div class="flex items-center flex-shrink-0 ml-2">
                <span id="${itemId}-qty" class="text-accent font-semibold mr-2 whitespace-nowrap">${itemData.count} ${unit}</span>
                <button class="p-1 rounded-full bg-accent text-white w-7 h-7 flex items-center justify-center hover:bg-accent-darker flex-shrink-0" 
                        onclick="event.stopPropagation(); decrementItem(\'${itemId}\', \'${itemName}\', \'${unit}\', \'${itemElementId}\')">-</button>
            </div>
        `;
    } else {
        itemDiv.classList.remove('bg-accent/20', 'border', 'border-accent');
        itemDiv.classList.add('bg-item-bg', 'hover:bg-gray-700/50');
        itemDiv.onclick = () => incrementOrSelectItem(itemId, itemName, unit, itemElementId);
        itemDiv.innerHTML = `
            <div class="flex items-center flex-grow min-w-0">
                <span class="text-xl mr-3">${itemIcon}</span> 
                <span class="text-text-primary truncate">${actualItemName}</span>
            </div>
            <div class="flex items-center flex-shrink-0 ml-2">
                <span class="text-text-secondary mr-2 whitespace-nowrap">0 ${unit}</span>
            </div>
        `;
    }
    if (isNewlyAdded) {
        // If it's a new item, it might already have the flash from incrementOrSelectItem
        // but ensure selected styles are applied if flash wasn't persistent.
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
                previewParts.push(`${selectedItems[id].name.split(' ')[0]} ${selectedItems[id].count}${selectedItems[id].unit.charAt(0)}`);
            }
            dom.selectedItemsPreview.textContent = "Selected: " + previewParts.join(', ');
        } else {
            dom.sendButtonContainer.classList.add('hidden');
            dom.sendButton.disabled = true;
            dom.selectedItemsPreview.textContent = "";
        }
    }
}

// This function is called by hx-on:htmx:after-settle on #categories-container
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
    // currentPresetName is updated by the 'loadPresetContent' event listener
    let listTitle = currentPresetName || "My List";
    if (dom.presetSelector && dom.presetSelector.options.length > 0 && dom.presetSelector.selectedIndex !== -1 && dom.presetSelector.options[dom.presetSelector.selectedIndex].text !== "Loading Presets..."){
        listTitle = dom.presetSelector.options[dom.presetSelector.selectedIndex].text;
    }

    let formattedList = `${listTitle}:\n`;
    for (const itemId in selectedItems) {
        const item = selectedItems[itemId];
        formattedList += `- ${item.name} x${item.count} ${item.unit}\n`; 
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
    }
}

// HTMX Global event listeners for loading indicators are now mostly handled by hx-indicator on elements themselves.
// However, we can add logging or more complex logic here if needed.

document.body.addEventListener('htmx:beforeRequest', function(evt) {
    console.log("HTMX request starting...", evt.detail.pathInfo.requestPath);
    // Show general loading state if needed, though hx-indicator is preferred for specific elements
});

document.body.addEventListener('htmx:afterSettle', function(evt) {
    console.log("HTMX request settled.", evt.detail.pathInfo.requestPath);
    // This is a good place for any global UI updates needed after any HTMX swap.
});

// Make functions globally accessible for inline HTML onclick handlers
window.incrementOrSelectItem = incrementOrSelectItem;
window.decrementItem = decrementItem;
window.sendList = sendList;
window.resetSelectedItemsAndUI = resetSelectedItemsAndUI; // Ensure this is global if called from hx-on

console.log("app.js loaded. Default grocery data handling initialized."); 