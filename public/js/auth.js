// Supabase client for frontend OAuth
// This will be initialized with the Supabase URL and anon key from the server

let supabaseClient = null;

// Initialize Supabase client
async function initSupabase() {
  try {
    const response = await fetch('/api/auth/config');
    const config = await response.json();
    
    if (config.supabaseUrl && config.supabaseAnonKey) {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return false;
  }
}

// Google OAuth sign in
async function signInWithGoogle() {
  try {
    if (!supabaseClient) {
      await initSupabase();
    }
    
    if (!supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      throw error;
    }

    // Redirect will happen automatically
  } catch (err) {
    console.error('Google sign-in error:', err);
    alert('Failed to sign in with Google. Please try again.');
  }
}

// Initialize on page load if on auth pages
if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
  initSupabase().then(() => {
    console.log('Supabase client initialized for OAuth');
  });
}

