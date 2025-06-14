// State Management Store
class Store {
    constructor() {
        this.state = {
            selectedItems: {},
            currentActivePresetId: null,
            currentActivePresetName: 'Loading...',
            userPresetsCache: [],
            isSupabaseConnected: false,
            isTelegramReady: false,
            isGuestMode: false
        };
        this.listeners = new Set();
    }

    // Get current state
    getState() {
        return { ...this.state };
    }

    // Update state
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    // Subscribe to state changes
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // Notify all listeners
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // Action creators
    setSelectedItems(items) {
        this.setState({ selectedItems: items });
    }

    setActivePreset(id, name) {
        this.setState({
            currentActivePresetId: id,
            currentActivePresetName: name
        });
    }

    setUserPresets(presets) {
        this.setState({ userPresetsCache: presets });
    }

    setSupabaseConnectionStatus(isConnected) {
        this.setState({ isSupabaseConnected: isConnected });
    }

    setTelegramStatus(isReady, isGuest) {
        this.setState({
            isTelegramReady: isReady,
            isGuestMode: isGuest
        });
    }
}

// Create and export a singleton instance
const store = new Store();
export default store; 