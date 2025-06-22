import { showModal } from "./modal.js";
import { telegramWebApp, isGuestMode } from "./telegram.js";
import { MOCK_TELEGRAM_USER_ID, DEFAULT_PRESET_ID } from "./constants.js";
import { userPresetsCache, setUserPresetsCache } from "./state.js";

/**
 * Manages Supabase client initialization and API interactions via Edge Functions.
 */

// Supabase Client: Selects from global window object.
// Ensure your 'config.js' (or similar) initializes `window.supabaseClient` or `window.supabase`.
export const supabaseClient = window.supabaseClient || window.supabase;
if (!supabaseClient) {
  console.warn(
    "Supabase client not found. Backend features will be limited or disabled."
  );
}

/**
 * Handles errors from Edge Functions or Supabase operations, displaying a modal.
 * @param {Error | Object} error - The error object.
 * @param {string} operation - A description of the operation that failed.
 */
export function handleSupabaseError(error, operation) {
  console.error(`Error during ${operation}:`, error);
  const errorMessage = error.message || "An unexpected error occurred";
  const errorDetails =
    typeof error.details === "string"
      ? error.details
      : JSON.stringify(error.details, null, 2);

  showModal(
    "Operation Failed",
    `<div class="text-red-500">
            <p class="font-semibold">${errorMessage}</p>
            ${
              errorDetails
                ? `<pre class="mt-2 text-sm bg-red-50 p-2 rounded">${errorDetails}</pre>`
                : ""
            }
        </div>`
  );
}

/**
 * Fetches user presets from the Supabase Edge Function (`db-operations`).
 * Handles guest mode fallback.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of preset objects.
 */
export async function fetchUserPresets() {
  console.log("Fetching user presets...");

  if (isGuestMode || !supabaseClient?.functions?.invoke) {
    const reason = isGuestMode
      ? "Guest mode"
      : "Supabase functions unavailable";
    console.log(`${reason}: Returning default preset.`);
    return [
      {
        id: DEFAULT_PRESET_ID,
        name: window.defaultGroceryData?.name || "Grocery List",
      },
    ];
  }

  try {
    // Assume Telegram WebApp is ready and its user data is available
    const telegramUserId =
      telegramWebApp?.initDataUnsafe?.user?.id || MOCK_TELEGRAM_USER_ID;

    const { data, error } = await supabaseClient.functions.invoke(
      "db-operations",
      {
        method: "POST",
        // The `tg-update` (db-operations) function handles Telegram initData verification and
        // transforms it into a Supabase user session context.
        // Therefore, we pass `initData` in a custom header/body.
        // Check your `db-operations` (tg-update) function's expected payload for 'read' operation.
        // Example if it expects initData in Authorization header:
        headers: {
          Authorization: `TMA ${telegramWebApp?.initData}`, // Pass the raw initData
        },
        body: {
          // The db-operations function would parse the initData from the header
          operation: "preset",
          action: "read",
          // userId: telegramUserId // db-operations should derive this from initData itself
        },
      }
    );

    if (error) throw error;

    console.log("Successfully fetched user presets:", data);
    setUserPresetsCache(data || []); // Update global state
    return data || [];
  } catch (error) {
    handleSupabaseError(error, "fetching presets");
    return [
      {
        id: DEFAULT_PRESET_ID,
        name: window.defaultGroceryData?.name || "Grocery List",
      },
    ];
  }
}

/**
 * Handles saving (creating) a new preset via Supabase Edge Function.
 * @param {string} newName - The name of the new preset.
 * @returns {Promise<Object | null>} The created preset object or null on failure.
 */
export async function handleSavePreset(newName) {
  if (isGuestMode || !supabaseClient?.functions?.invoke) {
    showModal(
      "Feature Unavailable",
      "Creating new presets is only available in Telegram with Supabase connection."
    );
    return null;
  }

  try {
    const { data: newPreset, error } = await supabaseClient.functions.invoke(
      "db-operations",
      {
        method: "POST",
        headers: {
          Authorization: `TMA ${telegramWebApp?.initData}`,
        },
        body: {
          operation: "preset",
          action: "create",
          data: { name: newName },
        },
      }
    );

    if (error) throw error;
    console.log("Successfully created new preset:", newPreset);
    return newPreset;
  } catch (error) {
    handleSupabaseError(error, "creating preset");
    return null;
  }
}

/**
 * Handles updating an existing preset via Supabase Edge Function.
 * @param {string} presetId - The ID of the preset to update.
 * @param {string} updatedName - The new name for the preset.
 * @returns {Promise<Object | null>} The updated preset object or null on failure.
 */
export async function handleEditPreset(presetId, updatedName) {
  if (isGuestMode || !supabaseClient?.functions?.invoke) {
    showModal(
      "Feature Unavailable",
      "Editing presets is only available in Telegram with Supabase connection."
    );
    return null;
  }

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      "db-operations",
      {
        method: "POST",
        headers: {
          Authorization: `TMA ${telegramWebApp?.initData}`,
        },
        body: {
          operation: "preset",
          action: "update",
          id: presetId,
          data: { name: updatedName },
        },
      }
    );

    if (error) throw error;
    console.log("Successfully updated preset:", data);
    return data;
  } catch (error) {
    handleSupabaseError(error, "updating preset");
    return null;
  }
}

/**
 * Handles deleting a preset via Supabase Edge Function.
 * @param {string} presetId - The ID of the preset to delete.
 * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
 */
export async function handleDeletePreset(presetId) {
  if (isGuestMode || !supabaseClient?.functions?.invoke) {
    showModal(
      "Feature Unavailable",
      "Deleting presets is only available in Telegram with Supabase connection."
    );
    return false;
  }

  try {
    const { error } = await supabaseClient.functions.invoke("db-operations", {
      method: "POST",
      headers: {
        Authorization: `TMA ${telegramWebApp?.initData}`,
      },
      body: {
        operation: "preset",
        action: "delete",
        id: presetId,
      },
    });

    if (error) throw error;
    console.log(`Preset ${presetId} deleted successfully.`);
    return true;
  } catch (error) {
    handleSupabaseError(error, "deleting preset");
    return false;
  }
}
