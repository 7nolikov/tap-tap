# Gemini Code Assistant Project Guide: Tap Tap

This guide provides essential information for interacting with the "Tap Tap" project, a Telegram Mini App. Adhering to these guidelines will ensure that new features and bug fixes are implemented consistently and efficiently.

## 1. Project Overview

**Tap Tap** is a Telegram Mini App designed for creating, managing, and sharing lists (called "presets"). It operates as a single-page application with a frontend-centric architecture, using Supabase for its backend data storage.

- **Core Functionality:** Users can create different lists (e.g., groceries, to-do items), add items to them, select items from a list, and send the selected items to a Telegram chat.
- **Architecture:** Frontend-driven SPA. The `index.html` is the main entry point. JavaScript is heavily modularized.
- **Tech Stack:**
    - **UI:** HTML, Tailwind CSS
    - **Dynamic UI / AJAX:** HTMX is used for dynamically loading preset content without full page reloads.
    - **Client-Side Logic:** Vanilla JavaScript (ES Modules), with Alpine.js for minor UI state management.
    - **Backend:** Supabase (for database and potentially authentication).
    - **Platform:** Telegram Mini App.

## 2. File Structure

The project follows a clear, modular structure within the `src/js` directory.

- `index.html`: The single HTML file for the application.
- `style.css`: The compiled Tailwind CSS output. **Do not edit directly.**
- `src/input.css`: The source file for Tailwind CSS. All new CSS classes should be added here or via HTML class attributes.
- `package.json`: Defines dependencies (`tailwindcss`) and build scripts.
- `config.js`: Holds public configuration, like Supabase URL and anon key. **This file is in `.gitignore` and should not be committed.**
- `src/js/`: Contains all application logic.
    - `app.js`: The main entry point for JavaScript. It initializes all modules and sets up event listeners.
    - `domCache.js`: Caches frequently accessed DOM elements to avoid repeated queries.
    - `state.js`: Manages the application's global state (e.g., current user, selected items).
    - `supabaseApi.js`: Contains all functions for interacting with the Supabase backend (CRUD operations).
    - `presetManager.js`: Handles logic related to managing presets (create, read, update, delete).
    - `itemInteractions.js`: Manages user interactions with list items (selecting, incrementing, decrementing).
    - `modal.js`: Controls the behavior of the generic modal dialog.
    - `telegram.js`: Handles all interactions with the Telegram Web App API.

## 3. Development Workflow

### Running the Application

1.  **Build CSS:** To apply any new Tailwind CSS classes from the HTML or `src/input.css`, you must run the build command.
    - For one-time build: `npm run build:css`
    - For continuous development: `npm run dev:css` (watches for changes)
2.  **Serve the Project:** Use a simple local web server (like `python -m http.server` or VS Code's Live Server extension) to serve `index.html`. The app must be accessed via `http://` or `https://`.

### Common Tasks

#### Adding a New Feature

1.  **Identify the Module:** Determine which JavaScript module is responsible for the feature's domain (e.g., for a new preset-related feature, start with `presetManager.js`).
2.  **Update HTML:** If new UI elements are needed, add them to `index.html`. Use Tailwind CSS classes for styling.
3.  **Write Logic:** Add the core logic to the appropriate module. If the feature requires backend interaction, add a new function to `supabaseApi.js` first.
4.  **Connect to UI:** In `app.js`, add any new event listeners to connect the UI elements to the new logic.
5.  **Manage State:** If the feature introduces new state, update `state.js`.

#### Fixing a Bug

1.  **Reproduce the Bug:** Understand the steps to trigger the bug.
2.  **Check the Console:** Open the browser's developer tools and look for errors in the console. This often points to the exact file and line number.
3.  **Isolate the Logic:** Based on the bug's context (e.g., it happens when deleting a preset), locate the relevant code (e.g., `handleDeletePreset` in `presetManager.js`).
4.  **Debug:** Use `console.log` statements or browser breakpoints to inspect variables and trace the execution flow.
5.  **Apply the Fix:** Modify the code, ensuring you follow existing conventions.

## 4. Code Conventions

- **JavaScript:**
    - Write modular, single-responsibility functions.
    - Import/export using ES Modules.
    - Access the DOM via the `dom` object from `domCache.js` where possible.
    - Functions that are called directly from HTML attributes (e.g., `onclick`) **must** be attached to the `window` object in `app.js`.
- **Styling:**
    - Use Tailwind CSS utility classes directly in the HTML whenever possible.
    - For custom styles, use the `@apply` directive in `src/input.css`.
- **HTMX:**
    - Use `hx-*` attributes in `index.html` for declarative AJAX requests.
    - The primary use is to load the items of a preset into the `#categories-container`.
- **Supabase:**
    - All database queries must be placed in `supabaseApi.js`.
    - Do not directly call Supabase functions from other modules. This keeps the data access layer separate from the business logic.
