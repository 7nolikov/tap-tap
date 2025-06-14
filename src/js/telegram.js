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
  if (window.Telegram?.WebApp) {
    // Use optional chaining for safer access
    try {
      telegramWebApp = window.Telegram.WebApp;
      console.log("Telegram WebApp initialized successfully");
      telegramWebApp.expand(); // Always expand
      return true; // Indicate successful initialization
    } catch (error) {
      console.warn("Error initializing Telegram WebApp:", error);
      isGuestMode = true;
      return false;
    }
  } else {
    console.log("Running in guest mode (no Telegram WebApp detected).");
    isGuestMode = true;
    return false;
  }
}
