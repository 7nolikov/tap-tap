// Store your Supabase URL and Anon Key here
// Replace with your actual Supabase project details
window.SUPABASE_URL = "https://bpkjidbjdngrcwbxdpbl.supabase.co";
window.SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwa2ppZGJqZG5ncmN3YnhkcGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNjY3NzYsImV4cCI6MjA2Mzk0Mjc3Nn0.rVdNnxvnj6uVR2uCmryH2qq1D74ETE0jHft7QrKvjX8";

// Example:
// window.SUPABASE_URL = 'https://xyzabcdefghijklmnop.supabase.co';
// window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxODAwMDAwMDAwfQ.abcdefghijklmnopqrstuvwxyz1234567890';

let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
    try {
        supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized.');
        // Make supabase globally accessible if needed, or export it via a module system if you adopt one later
        window.supabase = supabase;
    } catch (e) {
        console.error("Error initializing Supabase client:", e);
        alert("Failed to initialize Supabase. Backend features might not work.");
    }
} else {
    console.warn("Supabase URL and/or anon key are not configured or are still placeholders. Supabase client not initialized. Please update config.js.");
    // Optionally, alert the user or display a message in the UI
    // alert("Supabase is not configured. Some features may not be available.");
}

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('Please update config.js with your Supabase project URL and Anon key.');
    // Optionally, display a more prominent warning in the UI itself if not configured.
} 