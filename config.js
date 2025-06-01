// Store your Supabase URL and Anon Key here
// Replace with your actual Supabase project details
window.SUPABASE_URL = 'YOUR_SUPABASE_URL';
window.SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Example:
// window.SUPABASE_URL = 'https://xyzabcdefghijklmnop.supabase.co';
// window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxODAwMDAwMDAwfQ.abcdefghijklmnopqrstuvwxyz1234567890';

if (window.SUPABASE_URL === 'YOUR_SUPABASE_URL' || window.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('Please update config.js with your Supabase project URL and Anon key.');
    // Optionally, display a more prominent warning in the UI itself if not configured.
} 