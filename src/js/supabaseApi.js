import { showModal } from "./modal.js";
import { telegramWebApp, isGuestMode } from "./telegram.js";
import { DEFAULT_PRESET_ID } from "./constants.js";
import { setUserPresetsCache } from "./state.js";
import { defaultGroceryData } from "./default-grocery-data.js"; 

/**
 * Manages Supabase client initialization and API interactions with Edge Functions.
 * This module is responsible for authenticating the user and sending authorized
 * requests to the `db-operations` Edge Function.
 */

// Global Supabase Client instance (from window.supabaseClient or window.supabase)
// Assumes this is loaded via a <script> tag in index.html before app.js module.
export const supabaseClient = window.supabaseClient || window.supabase;
if (!supabaseClient) {
  console.warn(
    "Supabase client (window.supabaseClient or window.supabase) not found. Backend features will be limited or disabled."
  );
}

// Module-level variables to store the authenticated JWT and Supabase user ID
let currentAuthToken = null;
let currentSupabaseUserId = null;

// --- Helper Functions ---

/**
 * Handles errors from Edge Functions or Supabase operations, displaying a modal.
 * This function provides a consistent way to display user-friendly error messages.
 * @param {Error | Object} error - The error object.
 * @param {string} operation - A description of the operation that failed (e.g., 'fetching presets').
 */
export function handleSupabaseError(error, operation) {
  console.error(`Frontend Error during ${operation}:`, error);
  const errorMessage = error.error || error.message || 'An unexpected error occurred'; // Check for `error` field from Edge Function response
  const errorDetails =
    typeof error.details === "string"
      ? error.details
      : JSON.stringify(error.details, null, 2);

  showModal(
    "Operation Failed",
    `<div class="text-red-500">
                <p class="font-semibold">${errorMessage}</p>
                ${
                  errorDetails && errorDetails !== '{}' // Avoid displaying empty object string
                    ? `<pre class="mt-2 text-sm bg-red-50 p-2 rounded">${errorDetails}</pre>`
                    : ""
                }
            </div>`
  );
}

/**
 * Authenticates the user by calling the `tg-update` Edge Function.
 * This function determines if the user is a Telegram user or a dev guest,
 * and retrieves a valid Supabase JWT for subsequent API calls.
 * This should be called once on app startup or when authentication state needs refreshing.
 * @returns {Promise<boolean>} True if authentication was successful and JWT is set, false otherwise.
 */
export async function authenticateUser() {
  console.log("Authenticating user...");
  if (!supabaseClient?.functions?.invoke) {
    console.warn("Supabase functions client is not available for authentication.");
    return false;
  }

  try {
    let headers = {};
    if (!isGuestMode && telegramWebApp?.initData) {
      // If Telegram WebApp is ready and not in guest mode, send initData for validation.
      headers['Authorization'] = `TMA ${telegramWebApp.initData}`;
      console.log("Attempting Telegram WebApp authentication via tg-update...");
    } else {
      // If in guest mode or Telegram WebApp not available, proceed without Authorization header.
      // The `tg-update` function on the backend will handle 'dev' profile guest access.
      headers["Authorization"] = ""; // No TMA header for guest mode
      console.log("Attempting guest mode authentication via tg-update (no TMA header).");
    }

    // Call the `tg-update` Edge Function to get the JWT
    const { data, error } = await supabaseClient.functions.invoke("tg-update", {
      method: "POST", // tg-update always expects POST
      headers: headers,
      body: {}, // No specific body needed for tg-update authentication
    });

    if (error) {
      // If there's a Supabase client-level error or Edge Function error response
      console.error("Authentication failed during tg-update invocation:", error);
      throw error; // Re-throw to be caught by the outer try-catch
    }
    if (!data?.jwt || !data?.userId) {
      // If the Edge Function responded successfully but data is malformed
      console.error("tg-update response missing JWT or User ID:", data);
      throw new Error("Authentication response missing JWT or User ID.");
    }

    // Store the received JWT and user ID
    currentAuthToken = data.jwt;
    currentSupabaseUserId = data.userId;
    console.log("User authenticated successfully. JWT and User ID set.", { userId: currentSupabaseUserId });
    return true;

  } catch (error) {
    console.error("Frontend: User authentication failed.", error);
    handleSupabaseError(error, "user authentication");
    currentAuthToken = null;
    currentSupabaseUserId = null;
    // Optionally force `isGuestMode` true if primary authentication fails
    // isGuestMode = true; // This might already be set by telegram.js
    return false;
  }
}

/**
 * Generic function to invoke the `db-operations` Edge Function with the authenticated JWT.
 * This is the central point for all data CRUD calls.
 * @param {string} operationType - The type of database entity ('preset', 'category', 'item').
 * @param {string} action - The CRUD action ('read', 'create', 'update', 'delete').
 * @param {Object} [data={}] - The data payload for create/update operations.
 * @param {string | null} [id=null] - The ID of the record for update/delete operations.
 * @returns {Promise<any>} The response data from the `db-operations` Edge Function.
 * @throws {Error} If authentication fails or the `db-operations` invocation fails.
 */
async function invokeDbOperation(operationType, action, data = {}, id = null) {
  // Disallow non-read operations in guest mode (unless explicitly designed)
  if (isGuestMode && (action !== 'read' || operationType !== 'preset')) { // Allow only reading default preset in guest mode
    showModal("Feature Unavailable", "This action requires an authenticated user. Please open in Telegram to link your account or access full features.");
    throw new Error("Action not allowed in guest mode.");
  }

  if (!supabaseClient?.functions?.invoke) {
    throw new Error("Supabase functions client is not available.");
  }
  if (!currentAuthToken) {
    // If JWT is missing, attempt to re-authenticate.
    const authenticated = await authenticateUser();
    if (!authenticated) {
      throw new Error("Not authenticated to perform this operation. Authentication failed.");
    }
  }

  try {
    const payload = {
      operation: operationType,
      action: action,
      data: data,
      id: id,
    };
    console.log(`Invoking db-operations for ${operationType} ${action}.`, payload);

    const { data: responseData, error: invokeError } = await supabaseClient.functions.invoke(
      "db-operations",
      {
        method: "POST", // db-operations always expects POST
        headers: {
          Authorization: `Bearer ${currentAuthToken}`, // Pass the authenticated JWT
        },
        body: payload, // Send the operation details in the body
      }
    );

    if (invokeError) {
        console.error("Error during db-operations invocation:", invokeError);
        throw invokeError; // Re-throw the error received from Supabase client
    }
    return responseData;

  } catch (error) {
    // This catch block handles errors thrown by `supabaseClient.functions.invoke`
    // or by `authenticateUser()` if called within this function.
    handleSupabaseError(error, `${operationType} ${action}`);
    throw error; // Re-throw to allow calling code (e.g., `handleSavePreset`) to handle if needed
  }
}

// --- Public API Functions for CRUD Operations ---

/**
 * Fetches user presets (including nested categories and items) from the database.
 * @returns {Promise<Array<Object>>} An array of preset objects.
 */
export async function fetchUserPresets() {
  console.log("Fetching user presets...");
  try {
    const data = await invokeDbOperation("preset", "read");
    console.log("Successfully fetched user presets:", data);

    // --- NEW/UPDATED LOGIC HERE: Return default if DB returns empty array ---
    if (!data || data.length === 0) {
      console.log(
        "No user presets found in DB. Returning default grocery data."
      );
      // Map the defaultGroceryData structure to match the database schema's expected format
      const defaultPresets = [
        {
          id: defaultGroceryData.id,
          name: defaultGroceryData.name,
          // user_id and created_at won't be present for default, which is fine for client-side display
          categories: defaultGroceryData.categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            color_coding: cat.color_hex, // Map color_hex to color_coding
            // preset_id, user_id, created_at for default category won't be present
            items: cat.items.map((item) => ({
              id: item.id,
              name: item.name,
              increment_step_value: item.incrementStep, // Map incrementStep to increment_step_value
              unit_of_measure: item.unit, // Map unit to unit_of_measure
              // category_id, user_id, created_at for default item won't be present
            })),
          })),
        },
      ];
      setUserPresetsCache(defaultPresets); // Update global cache with default
      return defaultPresets;
    }
    // --- END NEW/UPDATED LOGIC ---

    setUserPresetsCache(data); // Update global cache with fetched data
    return data;
  } catch (error) {
    // This catch block handles actual network or server errors from invokeDbOperation.
    console.error(
      "Error fetching user presets from DB. Falling back to default data.",
      error
    );
    // If an error occurs, still return the default presets
    const defaultPresets = [
      {
        id: defaultGroceryData.id,
        name: defaultGroceryData.name,
        categories: defaultGroceryData.categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          color_coding: cat.color_hex,
          items: cat.items.map((item) => ({
            id: item.id,
            name: item.name,
            increment_step_value: item.incrementStep,
            unit_of_measure: item.unit,
          })),
        })),
      },
    ];
    setUserPresetsCache(defaultPresets);
    return defaultPresets;
  }
}

/**
 * Creates a new preset for the current user.
 * @param {string} newName - The name for the new preset.
 * @returns {Promise<Object | null>} The created preset object, or null on failure.
 */
export async function handleSavePreset(newName) {
  try {
    const newPreset = await invokeDbOperation("preset", "create", { name: newName });
    console.log("Successfully created new preset:", newPreset);
    return newPreset;
  } catch (error) {
    return null; // Error handled by invokeDbOperation
  }
}

/**
 * Updates an existing preset's name for the current user.
 * @param {string} presetId - The ID of the preset to update.
 * @param {string} updatedName - The new name for the preset.
 * @returns {Promise<Object | null>} The updated preset object, or null on failure.
 */
export async function handleEditPreset(presetId, updatedName) {
  try {
    const updatedPreset = await invokeDbOperation("preset", "update", { name: updatedName }, presetId);
    console.log("Successfully updated preset:", updatedPreset);
    return updatedPreset;
  } catch (error) {
    return null; // Error handled by invokeDbOperation
  }
}

/**
 * Deletes a preset for the current user.
 * @param {string} presetId - The ID of the preset to delete.
 * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
 */
export async function handleDeletePreset(presetId) {
  try {
    await invokeDbOperation("preset", "delete", {}, presetId);
    console.log(`Preset ${presetId} deleted successfully.`);
    return true;
  } catch (error) {
    return false; // Error handled by invokeDbOperation
  }
}

export async function handleCreateCategory(presetId, categoryName, colorCoding) {
  try {
    return await invokeDbOperation("category", "create", { preset_id: presetId, name: categoryName, color_coding: colorCoding });
  } catch (error) { return null; }
}

export async function handleUpdateCategory(categoryId, categoryName, colorCoding) {
  try {
    return await invokeDbOperation("category", "update", { name: categoryName, color_coding: colorCoding }, categoryId);
  } catch (error) { return null; }
}

export async function handleDeleteCategory(categoryId) {
  try {
    return await invokeDbOperation("category", "delete", {}, categoryId);
  } catch (error) { return false; }
}

export async function handleCreateItem(categoryId, itemName, description, incrementStep, unit) {
  try {
    const data = { category_id: categoryId, name: itemName, description: description, increment_step_value: incrementStep, unit_of_measure: unit };
    return await invokeDbOperation("item", "create", data);
  } catch (error) { return null; }
}

export async function handleUpdateItem(itemId, updateData) { // updateData can be { name?, description?, increment_step_value?, unit_of_measure? }
  try {
    return await invokeDbOperation("item", "update", updateData, itemId);
  } catch (error) { return null; }
}

export async function handleDeleteItem(itemId) {
  try {
    return await invokeDbOperation("item", "delete", {}, itemId);
  } catch (error) { return false; }
}