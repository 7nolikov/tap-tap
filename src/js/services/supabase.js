// Supabase Service
import store from '../state/store';

class SupabaseService {
    constructor() {
        this.client = null;
    }

    initialize() {
        if (window.supabaseClient) {
            this.client = window.supabaseClient;
            store.setSupabaseConnectionStatus(true);
            return true;
        }
        store.setSupabaseConnectionStatus(false);
        return false;
    }

    isGuestMode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('mode') === 'guest';
    }

    async fetchUserPresets() {
        if (!this.client) {
            throw new Error('Supabase client not initialized');
        }

        console.log("Fetching user presets...");
        const guestMode = this.isGuestMode();

        if (guestMode) {
            console.log("Running in Guest Mode.");
        } else if (!window.Telegram?.WebApp?.initData) {
            console.error("Telegram Web App data not available.");
            return []; // Prevent error in non-guest, non-Telegram environments
        }

        try {
            const { data, error } = await this.client
                .from('user_presets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            store.setUserPresets(data);
            return data;
        } catch (error) {
            console.error('Error fetching user presets:', error);
            throw error;
        }
    }

    async savePreset(presetData) {
        if (!this.client) {
            throw new Error('Supabase client not initialized');
        }

        const guestMode = this.isGuestMode();

        if (guestMode) {
            console.log("Running in Guest Mode.");
        } else if (!window.Telegram?.WebApp?.initData) {
            console.error("Telegram Web App data not available.");
            return []; // Prevent error in non-guest, non-Telegram environments
        }

        try {
            const { data, error } = await this.client
                .from('user_presets')
                .upsert(presetData)
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving preset:', error);
            throw error;
        }
    }

    async deletePreset(presetId) {
        if (!this.client) {
            throw new Error('Supabase client not initialized');
        }

        const guestMode = this.isGuestMode();

        if (guestMode) {
            console.log("Running in Guest Mode.");
        } else if (!window.Telegram?.WebApp?.initData) {
            console.error("Telegram Web App data not available.");
            return []; // Prevent error in non-guest, non-Telegram environments
        }

        try {
            const { error } = await this.client
                .from('user_presets')
                .delete()
                .eq('id', presetId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting preset:', error);
            throw error;
        }
    }
}

// Create and export a singleton instance
const supabaseService = new SupabaseService();
export default supabaseService; 