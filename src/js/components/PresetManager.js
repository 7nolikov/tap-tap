// Preset Manager Component
import store from '../state/store';
import supabaseService from '../services/supabase';
import dom from '../utils/dom';

class PresetManager {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Preset selector change
        dom.elements.presetSelector?.addEventListener('change', (e) => this.handlePresetSelectorChange(e.target));

        // CRUD buttons
        dom.elements.addPresetBtn?.addEventListener('click', () => this.handleAddPreset());
        dom.elements.editPresetBtn?.addEventListener('click', () => this.handleEditPreset());
        dom.elements.deletePresetBtn?.addEventListener('click', () => this.handleDeletePreset());
    }

    async handlePresetSelectorChange(selectElement) {
        const presetId = selectElement.value;
        const presetName = selectElement.options[selectElement.selectedIndex].text;
        
        store.setActivePreset(presetId, presetName);
        this.loadPresetContent(presetId);
    }

    async loadPresetContent(presetId) {
        const { elements } = dom;
        
        if (elements.categoriesPlaceholder) {
            elements.categoriesPlaceholder.textContent = 'Loading items...';
            elements.categoriesPlaceholder.classList.remove('hidden');
        }
        
        if (elements.categoriesContainer) {
            elements.categoriesContainer.innerHTML = '';
        }

        try {
            if (presetId === store.getState().app.defaultPresetId) {
                await this.loadDefaultPreset();
            } else {
                await this.loadUserPreset(presetId);
            }
        } catch (error) {
            console.error('Error loading preset:', error);
            if (elements.categoriesPlaceholder) {
                elements.categoriesPlaceholder.textContent = 'Error loading preset';
            }
        }
    }

    async loadDefaultPreset() {
        const { elements } = dom;
        
        if (window.defaultGroceryData) {
            this.renderPresetFromData(window.defaultGroceryData);
            if (elements.categoriesPlaceholder) {
                elements.categoriesPlaceholder.classList.add('hidden');
            }
        } else {
            throw new Error('Default grocery data not found');
        }
    }

    async loadUserPreset(presetId) {
        const { elements } = dom;
        const userPreset = store.getState().userPresetsCache.find(p => p.id === presetId);

        if (userPreset) {
            this.renderPresetFromData(userPreset);
            if (elements.categoriesPlaceholder) {
                elements.categoriesPlaceholder.classList.add('hidden');
            }
        } else {
            throw new Error(`Preset ${presetId} not found`);
        }
    }

    renderPresetFromData(presetData) {
        const { elements } = dom;
        if (!elements.categoriesContainer) return;

        // Clear existing content
        elements.categoriesContainer.innerHTML = '';

        // Render categories and items
        presetData.categories.forEach(category => {
            const categoryElement = this.createCategoryElement(category);
            elements.categoriesContainer.appendChild(categoryElement);
        });
    }

    createCategoryElement(category) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-section mb-6';
        categoryDiv.innerHTML = `
            <h3 class="text-lg font-semibold mb-3">${category.name}</h3>
            <div class="grid grid-cols-2 gap-2">
                ${category.items.map(item => this.createItemElement(item)).join('')}
            </div>
        `;
        return categoryDiv;
    }

    createItemElement(item) {
        return `
            <div class="item-card p-2 border rounded-lg flex items-center justify-between">
                <span class="item-name">${item.name}</span>
                <div class="item-controls flex items-center gap-2">
                    <button class="decrement-btn px-2 py-1 bg-gray-200 rounded" 
                            onclick="presetManager.decrementItem('${item.id}')">-</button>
                    <span class="item-count">0</span>
                    <button class="increment-btn px-2 py-1 bg-gray-200 rounded"
                            onclick="presetManager.incrementItem('${item.id}')">+</button>
                </div>
            </div>
        `;
    }

    async handleAddPreset() {
        dom.showModal('Create New Preset', `
            <div class="space-y-4">
                <input type="text" id="new-preset-name" 
                       class="w-full p-2 border rounded" 
                       placeholder="Enter preset name">
                <div id="preset-items-container" class="space-y-2">
                    <!-- Items will be added here -->
                </div>
                <button onclick="presetManager.addPresetItem()" 
                        class="w-full p-2 bg-gray-200 rounded">
                    Add Item
                </button>
            </div>
        `, [
            {
                text: 'Save',
                class: 'bg-blue-500 hover:bg-blue-600 text-white',
                onClick: () => this.saveNewPreset()
            }
        ]);
    }

    async handleEditPreset() {
        const currentPreset = store.getState().currentActivePresetId;
        if (!currentPreset) return;

        const preset = store.getState().userPresetsCache.find(p => p.id === currentPreset);
        if (!preset) return;

        dom.showModal('Edit Preset', `
            <div class="space-y-4">
                <input type="text" id="edit-preset-name" 
                       class="w-full p-2 border rounded" 
                       value="${preset.name}">
                <div id="edit-preset-items" class="space-y-2">
                    ${preset.categories.map(category => `
                        <div class="category-section">
                            <h4 class="font-semibold">${category.name}</h4>
                            ${category.items.map(item => `
                                <div class="item-row flex items-center gap-2">
                                    <input type="text" value="${item.name}" 
                                           class="flex-1 p-2 border rounded">
                                    <button onclick="presetManager.removePresetItem(this)"
                                            class="p-2 text-red-500">×</button>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
                <button onclick="presetManager.addPresetItem()" 
                        class="w-full p-2 bg-gray-200 rounded">
                    Add Item
                </button>
            </div>
        `, [
            {
                text: 'Save Changes',
                class: 'bg-blue-500 hover:bg-blue-600 text-white',
                onClick: () => this.savePresetChanges()
            }
        ]);
    }

    async handleDeletePreset() {
        const currentPreset = store.getState().currentActivePresetId;
        if (!currentPreset) return;

        dom.showModal('Delete Preset', `
            <p>Are you sure you want to delete this preset?</p>
        `, [
            {
                text: 'Cancel',
                class: 'bg-gray-500 hover:bg-gray-600 text-white'
            },
            {
                text: 'Delete',
                class: 'bg-red-500 hover:bg-red-600 text-white',
                onClick: () => this.deletePreset(currentPreset)
            }
        ]);
    }

    async deletePreset(presetId) {
        try {
            await supabaseService.deletePreset(presetId);
            await this.refreshPresetList();
            store.setActivePreset(store.getState().app.defaultPresetId, 'Default List');
        } catch (error) {
            console.error('Error deleting preset:', error);
            dom.showModal('Error', 'Failed to delete preset. Please try again.');
        }
    }

    async refreshPresetList() {
        try {
            await supabaseService.fetchUserPresets();
            this.updatePresetSelector();
        } catch (error) {
            console.error('Error refreshing preset list:', error);
        }
    }

    updatePresetSelector() {
        const { elements } = dom;
        if (!elements.presetSelector) return;

        const state = store.getState();
        const currentValue = elements.presetSelector.value;

        elements.presetSelector.innerHTML = `
            <option value="${state.app.defaultPresetId}">Default List</option>
            ${state.userPresetsCache.map(preset => `
                <option value="${preset.id}" ${preset.id === currentValue ? 'selected' : ''}>
                    ${preset.name}
                </option>
            `).join('')}
        `;
    }
}

// Create and export a singleton instance
const presetManager = new PresetManager();
export default presetManager; 