// Main Application Entry Point
import store from './src/js/state/store';
import supabaseService from './src/js/services/supabase';
import dom from './src/js/utils/dom';
import presetManager from './src/js/components/PresetManager';

// Initialize application
async function initializeApp() {
    // Initialize DOM elements
    if (!dom.initialize()) {
        console.error('Failed to initialize DOM elements');
        return;
    }

    // Initialize Supabase
    if (!supabaseService.initialize()) {
        console.warn('Supabase initialization failed. Running in limited mode.');
    }

    // Initialize Telegram WebApp
    initializeTelegramWebApp();

    // Load initial preset
    await presetManager.loadPresetContent(store.getState().app.defaultPresetId);
}

// Initialize Telegram WebApp
function initializeTelegramWebApp() {
    if (window.Telegram?.WebApp) {
        try {
            const telegramWebApp = window.Telegram.WebApp;
            telegramWebApp.expand();
            store.setTelegramStatus(true, false);
            console.log('Telegram WebApp initialized successfully');
        } catch (error) {
            console.warn('Error initializing Telegram WebApp:', error);
            store.setTelegramStatus(false, true);
        }
    } else {
        console.log('Running in guest mode (no Telegram WebApp)');
        store.setTelegramStatus(false, true);
    }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for global access if needed
window.app = {
    store,
    supabaseService,
    dom,
    presetManager
}; 