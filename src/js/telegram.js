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
      
      // Set up WebApp
      telegramWebApp.expand(); // Always expand
      telegramWebApp.ready(); // Tell Telegram we're ready
      
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
