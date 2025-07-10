// src/js/supabaseApi.js

// REMOVED: import { createClient } from '@supabase/supabase-js'; // This caused the TypeError

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

// Supabase configuration from config.js
const supabaseUrl = window.SUPABASE_URL;
const supabaseAnonKey = window.SUPABASE_ANON_KEY;

// Use the client initialized in config.js, or create one if it doesn't exist
export const supabaseClient = window.supabaseClient || 
  (supabaseUrl && supabaseAnonKey && window.supabase?.createClient
    ? window.supabase.createClient(supabaseUrl, supabaseAnonKey)
    : null);

if (!supabaseClient) {
  console.warn(
    "Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY in config.js or if Supabase CDN loaded correctly."
  );
}

// Module-level variables to store the authenticated JWT and Supabase user ID
let currentAuthToken = null;
let currentSupabaseUserId = null;

// --- Helper Functions ---

/**
 * Handles and displays Supabase-related errors in a modal.
 * @param {Error} error - The error object.
 * @param {string} operation - A descriptive string of the operation that failed.
 */
export function handleSupabaseError(error, operation) {
  console.error(`Frontend Error during ${operation}:`, error);
  const errorMessage =
    error.error || error.message || "An unexpected error occurred";
  const errorDetails =
    typeof error.details === "string"
      ? error.details
      : JSON.stringify(error.details, null, 2);

  showModal(
    "Operation Failed",
    `<div class="text-red-500">
                <p class="font-semibold">${errorMessage}</p>
                ${
                  errorDetails && errorDetails !== "{}"
                    ? `<pre class="mt-2 text-sm bg-red-50 p-2 rounded">${errorDetails}</pre>`
                    : ""
                }
            </div>`
  );
}

/**
 * Attempts to authenticate the user with the `tg-update` Edge Function.
 * Handles both Telegram WebApp authenticated users and guest mode.
 * @returns {Promise<boolean>} True if authentication was successful (JWT obtained), false otherwise.
 */
export async function authenticateUser() {
  console.log("Authenticating user...");
  if (!supabaseClient?.functions?.invoke) {
    console.warn(
      "Supabase functions client is not available for authentication."
    );
    return false;
  }

  try {
    let headers = {};
    // If not in guest mode and Telegram WebApp initData is available, use it for auth
    if (!isGuestMode && telegramWebApp?.initData) {
      headers["Authorization"] = `TMA ${telegramWebApp.initData}`;
      console.log("Attempting Telegram WebApp authentication via tg-update...");
    } else {
      // For guest mode or if initData is not available, send an empty Authorization header
      headers["Authorization"] = "";
      console.log(
        "Attempting guest mode authentication via tg-update (no TMA header)."
      );
    }

    const { data, error } = await supabaseClient.functions.invoke("tg-update", {
      method: "POST",
      headers: headers,
      body: {},
    });

    if (error) {
      console.error(
        "Authentication failed during tg-update invocation:",
        error
      );
      // If in guest mode, we expect authentication to fail (no JWT), but don't throw.
      // This allows 'read' operations for presets to proceed without a token.
      if (isGuestMode) {
        console.warn(
          "Authentication failed in guest mode, but proceeding without JWT."
        );
        currentAuthToken = null; // Explicitly ensure token is null
        currentSupabaseUserId = null;
        return false; // Indicate auth wasn't successful for full features
      }
      throw error; // Re-throw for non-guest mode failures (e.g., actual auth errors for logged-in users)
    }

    // Check if the response contains the expected JWT and userId
    if (!data?.jwt || !data?.userId) {
      console.error("tg-update response missing JWT or User ID:", data);
      throw new Error("Authentication response missing JWT or User ID.");
    }

    currentAuthToken = data.jwt;
    currentSupabaseUserId = data.userId;
    console.log("User authenticated successfully. JWT and User ID set.", {
      userId: currentSupabaseUserId,
    });
    return true;
  } catch (error) {
    console.error("Frontend: User authentication failed.", error);
    handleSupabaseError(error, "user authentication");
    currentAuthToken = null;
    currentSupabaseUserId = null;
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
 * @throws {Error} If `db-operations` invocation fails or is disallowed in guest mode.
 */
async function invokeDbOperation(operationType, action, data = {}, id = null) {
  // Disallow non-read operations in guest mode (e.g., create, update, delete)
  // Also disallow any operations on 'category' or 'item' in guest mode for simplicity.
  if (isGuestMode && (action !== "read" || operationType !== "preset")) {
    showModal(
      "Feature Unavailable",
      "This action requires an authenticated user. Please open in Telegram to link your account or access full features."
    );
    throw new Error("Action not allowed in guest mode.");
  }

  if (!supabaseClient?.functions?.invoke) {
    throw new Error("Supabase functions client is not available.");
  }

  // Attempt to authenticate if no token exists.
  // However, allow 'read' operations on 'preset' to proceed in guest mode
  // even if authentication fails (as currentAuthToken will be null).
  if (!currentAuthToken) {
    const authenticated = await authenticateUser();
    // If authentication failed AND it's NOT a guest trying to read presets, then throw.
    // This ensures only the specific guest-read-preset case proceeds without a token.
    if (
      !authenticated &&
      !(isGuestMode && operationType === "preset" && action === "read")
    ) {
      throw new Error(
        "Not authenticated to perform this operation. Authentication failed."
      );
    }
  }

  try {
    const payload = {
      operation: operationType,
      action: action,
      data: data,
      id: id,
    };
    console.log(
      `Invoking db-operations for ${operationType} ${action}.`,
      payload
    );

    const { data: responseData, error: invokeError } =
      await supabaseClient.functions.invoke("db-operations", {
        method: "POST",
        headers: {
          // Send Bearer token if available, otherwise an empty string for guest mode reads
          Authorization: currentAuthToken ? `Bearer ${currentAuthToken}` : "",
        },
        body: payload,
      });

    if (invokeError) {
      console.error("Error during db-operations invocation:", invokeError);
      throw invokeError; // Propagate the error for specific handling (e.g., fallback to default data)
    }
    return responseData;
  } catch (error) {
    // Catch and handle any errors thrown by the invoke operation or the authentication check
    handleSupabaseError(error, `${operationType} ${action}`);
    throw error; // Re-throw to allow calling functions to handle (e.g., return null/false)
  }
}

/**
 * Fetches user presets from Supabase. If no user presets are found or an error occurs (including auth errors in guest mode),
 * it falls back to providing the default grocery data.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of preset objects.
 */
export async function fetchUserPresets() {
  console.log("Fetching user presets...");
  try {
    // This will attempt to fetch from DB. If authentication is not successful (e.g. guest mode)
    // and the backend allows it (or returns empty), the logic will flow to default.
    const data = await invokeDbOperation("preset", "read");
    console.log("Successfully fetched user presets:", data);

    if (!data || data.length === 0) {
      console.log(
        "No user presets found in DB. Returning default grocery data."
      );
      const defaultPresets = [
        {
          id: defaultGroceryData.id,
          name: defaultGroceryData.name,
          categories: defaultGroceryData.categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            color_coding: cat.color_hex,
            textColorClass: cat.textColorClass,
            borderColorClass: cat.borderColorClass,
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

    // If data is fetched, ensure it has necessary styling classes for categories
    const processedData = data.map((preset) => ({
      ...preset,
      categories: preset.categories.map((cat) => ({
        ...cat,
        // Ensure these classes are present, fall back to default if not from DB
        textColorClass: cat.textColorClass || `text-text-primary`,
        borderColorClass: cat.borderColorClass || `border-gray-600`,
      })),
    }));

    setUserPresetsCache(processedData);
    return processedData;
  } catch (error) {
    console.error(
      "Error fetching user presets from DB. Falling back to default data.",
      error
    );
    // If ANY error occurs (even authentication failure from invokeDbOperation),
    // we still fall back to the default data to ensure the app loads something.
    const defaultPresets = [
      {
        id: defaultGroceryData.id,
        name: defaultGroceryData.name,
        categories: defaultGroceryData.categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          color_coding: cat.color_hex,
          textColorClass: cat.textColorClass,
          borderColorClass: cat.borderColorClass,
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
 * Handles saving a new preset to Supabase.
 * @param {string} newName - The name of the new preset.
 * @returns {Object|null} The created preset object if successful, otherwise null.
 */
export async function handleSavePreset(newName) {
  try {
    // This will be caught by invokeDbOperation's guest mode check if applicable
    const newPreset = await invokeDbOperation("preset", "create", {
      name: newName,
    });
    console.log("Successfully created new preset:", newPreset);
    return newPreset;
  } catch (error) {
    // Error already handled by handleSupabaseError in invokeDbOperation, just return null
    return null;
  }
}

/**
 * Handles editing an existing preset in Supabase.
 * @param {string} presetId - The ID of the preset to edit.
 * @param {string} updatedName - The new name for the preset.
 * @returns {Object|null} The updated preset object if successful, otherwise null.
 */
export async function handleEditPreset(presetId, updatedName) {
  try {
    // This will be caught by invokeDbOperation's guest mode check if applicable
    const updatedPreset = await invokeDbOperation(
      "preset",
      "update",
      { name: updatedName },
      presetId
    );
    console.log("Successfully updated preset:", updatedPreset);
    return updatedPreset;
  } catch (error) {
    // Error already handled by handleSupabaseError in invokeDbOperation, just return null
    return null;
  }
}

/**
 * Handles deleting a preset from Supabase.
 * @param {string} presetId - The ID of the preset to delete.
 * @returns {boolean} True if deletion was successful, otherwise false.
 */
export async function handleDeletePreset(presetId) {
  try {
    // This will be caught by invokeDbOperation's guest mode check if applicable
    await invokeDbOperation("preset", "delete", {}, presetId);
    console.log(`Preset ${presetId} deleted successfully.`);
    return true;
  } catch (error) {
    // Error already handled by handleSupabaseError in invokeDbOperation, just return false
    return false;
  }
}

// --- Category and Item CRUD operations (assuming these are also handled by db-operations Edge Function) ---

export async function handleCreateCategory(
  presetId,
  categoryName,
  colorCoding
) {
  try {
    const data = {
      preset_id: presetId,
      name: categoryName,
      color_coding: colorCoding,
    };
    return await invokeDbOperation("category", "create", data);
  } catch (error) {
    return null;
  }
}

export async function handleUpdateCategory(
  categoryId,
  categoryName,
  colorCoding
) {
  try {
    const data = { name: categoryName, color_coding: colorCoding };
    return await invokeDbOperation("category", "update", data, categoryId);
  } catch (error) {
    return null;
  }
}

export async function handleDeleteCategory(categoryId) {
  try {
    return await invokeDbOperation("category", "delete", {}, categoryId);
  } catch (error) {
    return false;
  }
}

export async function handleCreateItem(
  categoryId,
  itemName,
  description,
  incrementStep,
  unit
) {
  try {
    const data = {
      category_id: categoryId,
      name: itemName,
      description: description,
      increment_step_value: incrementStep,
      unit_of_measure: unit,
    };
    return await invokeDbOperation("item", "create", data);
  } catch (error) {
    return null;
  }
}

export async function handleUpdateItem(itemId, updateData) {
  try {
    return await invokeDbOperation("item", "update", updateData, itemId);
  } catch (error) {
    return null;
  }
}

export async function handleDeleteItem(itemId) {
  try {
    return await invokeDbOperation("item", "delete", {}, itemId);
  } catch (error) {
    return false;
  }
}
