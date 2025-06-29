// src/js/supabaseApi.js

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

export function handleSupabaseError(error, operation) {
  console.error(`Frontend Error during ${operation}:`, error);
  const errorMessage = error.error || error.message || 'An unexpected error occurred';
  const errorDetails =
    typeof error.details === "string"
      ? error.details
      : JSON.stringify(error.details, null, 2);

  showModal(
    "Operation Failed",
    `<div class="text-red-500">
                <p class="font-semibold">${errorMessage}</p>
                ${
                  errorDetails && errorDetails !== '{}'
                    ? `<pre class="mt-2 text-sm bg-red-50 p-2 rounded">${errorDetails}</pre>`
                    : ""
                }
            </div>`
  );
}

export async function authenticateUser() {
  console.log("Authenticating user...");
  if (!supabaseClient?.functions?.invoke) {
    console.warn("Supabase functions client is not available for authentication.");
    return false;
  }

  try {
    let headers = {};
    if (!isGuestMode && telegramWebApp?.initData) {
      headers['Authorization'] = `TMA ${telegramWebApp.initData}`;
      console.log("Attempting Telegram WebApp authentication via tg-update...");
    } else {
      headers["Authorization"] = ""; // No TMA header for guest mode
      console.log("Attempting guest mode authentication via tg-update (no TMA header).");
    }

    const { data, error } = await supabaseClient.functions.invoke("tg-update", {
      method: "POST",
      headers: headers,
      body: {},
    });

    if (error) {
      console.error("Authentication failed during tg-update invocation:", error);
      // Do NOT throw here if it's guest mode and we expect auth to fail but still allow partial functionality
      if (isGuestMode) {
          console.warn("Authentication failed in guest mode, but proceeding without JWT.");
          currentAuthToken = null; // Ensure token is null for guest mode
          currentSupabaseUserId = null;
          return false; // Indicate auth wasn't successful for full features
      }
      throw error; // Re-throw for non-guest mode failures
    }
    if (!data?.jwt || !data?.userId) {
      console.error("tg-update response missing JWT or User ID:", data);
      throw new Error("Authentication response missing JWT or User ID.");
    }

    currentAuthToken = data.jwt;
    currentSupabaseUserId = data.userId;
    console.log("User authenticated successfully. JWT and User ID set.", { userId: currentSupabaseUserId });
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
 * @throws {Error} If `db-operations` invocation fails.
 */
async function invokeDbOperation(operationType, action, data = {}, id = null) {
  // Disallow non-read operations in guest mode (unless explicitly designed)
  if (isGuestMode && (action !== 'read' || operationType !== 'preset')) {
    showModal("Feature Unavailable", "This action requires an authenticated user. Please open in Telegram to link your account or access full features.");
    throw new Error("Action not allowed in guest mode.");
  }

  if (!supabaseClient?.functions?.invoke) {
    throw new Error("Supabase functions client is not available.");
  }

  // Attempt to authenticate if no token exists, but allow read operations on presets to proceed
  // even if auth fails (e.g., in guest mode where DB access isn't required for default data).
  if (!currentAuthToken) {
    const authenticated = await authenticateUser();
    if (!authenticated && !(isGuestMode && operationType === 'preset' && action === 'read')) {
        // If authentication failed AND it's not a guest trying to read presets, then throw.
        // Otherwise, for guest mode reading presets, proceed with null token (backend will filter).
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
        method: "POST",
        headers: {
          Authorization: currentAuthToken ? `Bearer ${currentAuthToken}` : "", // Send empty if no token
        },
        body: payload,
      }
    );

    if (invokeError) {
        console.error("Error during db-operations invocation:", invokeError);
        throw invokeError;
    }
    return responseData;

  } catch (error) {
    handleSupabaseError(error, `${operationType} ${action}`);
    throw error;
  }
}

export async function fetchUserPresets() {
  console.log("Fetching user presets...");
  try {
    // This will attempt to fetch from DB. If authentication is not successful (e.g. guest mode)
    // and the backend allows it (or returns empty), the logic will flow to default.
    const data = await invokeDbOperation("preset", "read");
    console.log("Successfully fetched user presets:", data);

    if (!data || data.length === 0) {
      console.log("No user presets found in DB. Returning default grocery data.");
      const defaultPresets = [
        {
          id: defaultGroceryData.id,
          name: defaultGroceryData.name,
          categories: defaultGroceryData.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            color_coding: cat.color_hex,
            textColorClass: cat.textColorClass,
            borderColorClass: cat.borderColorClass,
            items: cat.items.map(item => ({
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

    const processedData = data.map(preset => ({
        ...preset,
        categories: preset.categories.map(cat => ({
            ...cat,
            textColorClass: cat.textColorClass || `text-text-primary`,
            borderColorClass: cat.borderColorClass || `border-gray-600`,
        }))
    }));

    setUserPresetsCache(processedData);
    return processedData;
  } catch (error) {
    console.error("Error fetching user presets from DB. Falling back to default data.", error);
    // If ANY error occurs (even authentication failure from invokeDbOperation),
    // we still fall back to the default data to ensure the app loads something.
    const defaultPresets = [
        {
          id: defaultGroceryData.id,
          name: defaultGroceryData.name,
          categories: defaultGroceryData.categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            color_coding: cat.color_hex,
            textColorClass: cat.textColorClass,
            borderColorClass: cat.borderColorClass,
            items: cat.items.map(item => ({
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

export async function handleSavePreset(newName) {
  try {
    const newPreset = await invokeDbOperation("preset", "create", { name: newName });
    console.log("Successfully created new preset:", newPreset);
    return newPreset;
  } catch (error) {
    return null;
  }
}

export async function handleEditPreset(presetId, updatedName) {
  try {
    const updatedPreset = await invokeDbOperation("preset", "update", { name: updatedName }, presetId);
    console.log("Successfully updated preset:", updatedPreset);
    return updatedPreset;
  } catch (error) {
    return null;
  }
}

export async function handleDeletePreset(presetId) {
  try {
    await invokeDbOperation("preset", "delete", {}, presetId);
    console.log(`Preset ${presetId} deleted successfully.`);
    return true;
  }
  catch (error) {
    return false;
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

export async function handleUpdateItem(itemId, updateData) {
  try {
    return await invokeDbOperation("item", "update", updateData, itemId);
  } catch (error) { return null; }
}

export async function handleDeleteItem(itemId) {
  try {
    return await invokeDbOperation("item", "delete", {}, itemId);
  } catch (error) { return false; }
}