/**
 * Handles Telegram WebApp specific initialization and state.
 */

export let telegramWebApp = null;
export let isGuestMode = false; // True if Telegram WebApp fails or isn't present

/**
 * Initializes the Telegram WebApp.
 * Sets `telegramWebApp` and `isGuestMode` accordingly.
 */
export function initializeTelegramWebApp() {
  console.log("Initializing Telegram WebApp...");
  console.log("window.Telegram:", window.Telegram);
  console.log("window.Telegram?.WebApp:", window.Telegram?.WebApp);
  
  if (window.Telegram?.WebApp) {
    // Use optional chaining for safer access
    try {
      telegramWebApp = window.Telegram.WebApp;
      console.log("Telegram WebApp initialized successfully");
      console.log("WebApp platform:", telegramWebApp.platform);
      console.log("WebApp version:", telegramWebApp.version);
      console.log("WebApp initData:", telegramWebApp.initData);
      console.log("WebApp colorScheme:", telegramWebApp.colorScheme);
      console.log("WebApp themeParams:", telegramWebApp.themeParams);
      
      // Set up WebApp
      telegramWebApp.expand(); // Always expand
      telegramWebApp.ready(); // Tell Telegram we're ready
      
      // Check if we're actually in a Telegram environment
      // The platform should be one of: 'android', 'ios', 'macos', 'tdesktop', 'weba', 'webk', 'unigram', 'unknown'
      if (telegramWebApp.platform === 'unknown') {
        console.warn("Telegram WebApp platform is 'unknown'. This might indicate we're not in a real Telegram environment.");
        // Still treat as Telegram WebApp if we have the object, but log the warning
      }
      
      isGuestMode = false;
      return true; // Indicate successful initialization
    } catch (error) {
      console.warn("Error initializing Telegram WebApp:", error);
      isGuestMode = true;
      return false;
    }
  } else {
    console.log("Running in guest mode (no Telegram WebApp detected).");
    console.log("Available window objects:", Object.keys(window).filter(key => key.toLowerCase().includes('telegram')));
    isGuestMode = true;
    return false;
  }
}
