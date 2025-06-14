// Configuration Management
const config = {
    supabase: {
        url: process.env.SUPABASE_URL || 'https://bpkjidbjdngrcwbxdpbl.supabase.co',
        anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwa2ppZGJqZG5ncmN3YnhkcGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNjY3NzYsImV4cCI6MjA2Mzk0Mjc3Nn0.rVdNnxvnj6uVR2uCmryH2qq1D74ETE0jHft7QrKvjX8'
    },
    app: {
        defaultPresetId: 'default_grocery_list_001',
        mockTelegramUserId: '123456789'
    }
};

// Supabase Client Initialization
let supabaseClient = null;

function initializeSupabaseClient() {
    try {
        if (typeof supabase === 'undefined' || !supabase?.createClient) {
            throw new Error('Supabase CDN object not available');
        }

        const { createClient } = supabase;
        supabaseClient = createClient(config.supabase.url, config.supabase.anonKey);
        window.supabaseClient = supabaseClient;
        console.log('Supabase client initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        window.supabaseClient = null;
        return false;
    }
}

// Export configuration and initialization function
window.appConfig = config;
window.initializeSupabaseClient = initializeSupabaseClient;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeSupabaseClient();
}); 