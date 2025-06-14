// DOM Utilities
export const dom = {
    // Cache DOM elements
    elements: {
        categoriesContainer: null,
        sendButtonContainer: null,
        sendButton: null,
        selectedItemsPreview: null,
        categoriesLoadingIndicator: null,
        categoriesPlaceholder: null,
        presetSelector: null,
        addPresetBtn: null,
        editPresetBtn: null,
        deletePresetBtn: null,
        genericModal: null,
        genericModalPanel: null,
        genericModalTitle: null,
        genericModalCloseBtn: null,
        genericModalContent: null,
        genericModalFooter: null
    },

    // Initialize DOM elements
    initialize() {
        this.elements = {
            categoriesContainer: document.getElementById('categories-container'),
            sendButtonContainer: document.getElementById('send-button-container'),
            sendButton: document.getElementById('send-button'),
            selectedItemsPreview: document.getElementById('selected-items-preview'),
            categoriesLoadingIndicator: document.getElementById('categories-loading-indicator'),
            categoriesPlaceholder: document.getElementById('categories-placeholder'),
            presetSelector: document.getElementById('preset-selector'),
            addPresetBtn: document.getElementById('add-preset-btn'),
            editPresetBtn: document.getElementById('edit-preset-btn'),
            deletePresetBtn: document.getElementById('delete-preset-btn'),
            genericModal: document.getElementById('generic-modal'),
            genericModalPanel: document.getElementById('generic-modal-panel'),
            genericModalTitle: document.getElementById('generic-modal-title'),
            genericModalCloseBtn: document.getElementById('generic-modal-close-btn'),
            genericModalContent: document.getElementById('generic-modal-content'),
            genericModalFooter: document.getElementById('generic-modal-footer')
        };

        // Validate critical elements
        const criticalElements = ['categoriesContainer', 'sendButton', 'presetSelector'];
        const missingElements = criticalElements.filter(id => !this.elements[id]);
        
        if (missingElements.length > 0) {
            console.error('Critical DOM elements missing:', missingElements);
            return false;
        }

        return true;
    },

    // Modal operations
    showModal(title, contentHTML, footerButtonsConfig = []) {
        const { genericModal, genericModalPanel, genericModalTitle, genericModalContent, genericModalFooter } = this.elements;
        
        if (!genericModal || !genericModalPanel) {
            console.error('Modal elements not found');
            return;
        }

        genericModalTitle.textContent = title;
        genericModalContent.innerHTML = contentHTML;
        genericModalFooter.innerHTML = '';

        footerButtonsConfig.forEach(btnConfig => {
            const button = document.createElement('button');
            button.textContent = btnConfig.text;
            button.className = `px-4 py-2 text-sm rounded-md transition-colors ${btnConfig.class || 'bg-gray-600 hover:bg-gray-500 text-text-primary'}`;
            button.onclick = () => {
                if (btnConfig.onClick) btnConfig.onClick();
                if (btnConfig.hideOnClick !== false) {
                    this.hideModal();
                }
            };
            genericModalFooter.appendChild(button);
        });

        genericModal.classList.remove('hidden');
        setTimeout(() => {
            genericModal.classList.remove('opacity-0');
            genericModalPanel.classList.remove('opacity-0', 'scale-95');
            genericModalPanel.classList.add('opacity-100', 'scale-100');
        }, 10);
    },

    hideModal() {
        const { genericModal, genericModalPanel, genericModalContent, genericModalFooter } = this.elements;
        
        if (!genericModal || !genericModalPanel) return;

        genericModal.classList.add('opacity-0');
        genericModalPanel.classList.remove('opacity-100', 'scale-100');
        genericModalPanel.classList.add('opacity-0', 'scale-95');

        setTimeout(() => {
            genericModal.classList.add('hidden');
            genericModalContent.innerHTML = '';
            genericModalFooter.innerHTML = '';
        }, 300);
    },

    // Animation utilities
    triggerItemAnimation(itemElementId, animationType = 'flash') {
        const element = document.getElementById(itemElementId);
        if (!element) return;

        element.classList.add(animationType);
        setTimeout(() => element.classList.remove(animationType), 500);
    }
};

export default dom; 