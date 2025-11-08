require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Environment Validation ----------------
const requiredEnvVars = [
  'GEMINI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

// Optional but recommended for OAuth
if (!process.env.SUPABASE_ANON_KEY) {
  console.log('⚠️  SUPABASE_ANON_KEY not set. Google OAuth will not work.');
  console.log('💡 Add SUPABASE_ANON_KEY to your .env file to enable Google sign-in.');
}

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('💡 For Supabase, you need:');
  console.error('   - SUPABASE_URL: Your Supabase project URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (from Project Settings > API)');
  process.exit(1);
}

console.log('🔍 Loaded Gemini API key prefix:', process.env.GEMINI_API_KEY?.slice(0, 10));
console.log('🔍 Using Supabase:', process.env.SUPABASE_URL);

// ---------------- Middleware ----------------
// Configure CORS to allow requests from any origin (including Live Server)
app.use(cors({
  origin: '*', // Allow all origins (for development)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------- Supabase Connection ----------------
// Server-side Supabase client (with service role for admin operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Client-side Supabase client (with anon key for OAuth)
// We'll expose the URL and anon key to the frontend
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test Supabase connection
(async () => {
  try {
    // Simple connection test - try to query a table
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.log('⚠️  Database tables not found. Please run the SQL schema in your Supabase SQL Editor.');
        console.log('💡 Run the SQL from db/supabase-schema.sql in your Supabase dashboard.');
        console.log('💡 The server will continue to run, but database operations will fail until tables are created.');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Connected to Supabase successfully!');
    }
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    console.error('❌ Error code:', err.code);
    console.error('💡 Make sure your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct.');
    console.error('💡 Check that your Supabase project is active and not paused.');
    // Don't exit - let the server start so user can fix the issue
  }
})();

// ---------------- Gemini AI Configuration ----------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Using gemini-2.0-flash for faster responses (you can change to gemini-2.5-pro for better quality)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Validate Gemini API key on startup
(async () => {
  try {
    // Test the API key with a minimal request
    const result = await model.generateContent('test');
    const response = await result.response;
    const text = response.text();
    if (text) {
      console.log('✅ Gemini API key validated successfully!');
    }
  } catch (err) {
    console.error('❌ Gemini API key validation failed:', err.message);
    console.error('⚠️  The chatbot will not work until a valid API key is provided.');
    if (err.status === 401 || err.status === 403) {
      console.error('💡 Hint: Check that your GEMINI_API_KEY in .env is correct.');
    }
    // Don't exit - let the server start, but log the warning
  }
})();

// ---------------- Helper Functions ----------------
// Supabase helper - wraps operations with error handling
const handleSupabaseOperation = async (res, operation) => {
  try {
    const result = await operation();
    res.json(result);
  } catch (err) {
    console.error('❌ Database error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// JWT Secret (use environment variable or default for development)
const JWT_SECRET = process.env.JWT_SECRET || 'mindcare-secret-key-change-in-production';

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1] || req.body.token || req.query.token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required. Please login.' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired token. Please login again.' 
    });
  }
};

// ---------------- API Routes (Must be before static files) ----------------
// Register API routes immediately after middleware to ensure they're not blocked

// ---------------- Google OAuth API ----------------
// Provide Supabase config to frontend (anon key only)
// This route MUST be registered before static files middleware
app.get('/api/auth/config', function(req, res) {
  console.log('🔍 [GET /api/auth/config] Request received');
  console.log('🔍 Request URL:', req.url);
  console.log('🔍 Request method:', req.method);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Use anon key if available, otherwise fallback to service_role (not recommended for production)
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!anonKey || !process.env.SUPABASE_URL) {
    console.error('❌ Missing Supabase configuration for OAuth');
    return res.status(500).json({
      error: 'Supabase configuration is incomplete.',
      message: 'Please add SUPABASE_ANON_KEY to your .env file. Get it from Supabase Dashboard > Settings > API > anon/public key',
      supabaseUrl: process.env.SUPABASE_URL || null,
      hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  }
  
  // Warn if using service role key (should only use anon key in production)
  if (!process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  Using SERVICE_ROLE_KEY for OAuth (not recommended). Please add SUPABASE_ANON_KEY to .env');
  }
  
  console.log('✅ Sending Supabase config to client');
  return res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: anonKey,
    usingFallback: !process.env.SUPABASE_ANON_KEY && !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
});

// Handle OPTIONS requests for CORS (auth config)
app.options('/api/auth/config', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// OAuth callback handler
app.get('/auth/callback', async (req, res) => {
  console.log('🔄 [GET /auth/callback] OAuth callback received');
  console.log('🔍 Query params:', req.query);
  
  try {
    const { code } = req.query;
    
    if (!code) {
      console.error('❌ No authorization code in callback');
      return res.redirect('/login?error=oauth_failed');
    }

    console.log('🔄 Exchanging code for session...');
    // Exchange code for session using service role
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError || !sessionData.session) {
      console.error('❌ OAuth callback error:', sessionError);
      return res.redirect('/login?error=oauth_failed');
    }
    
    console.log('✅ Session obtained for user:', sessionData.session.user?.email);

    const { user } = sessionData.session;
    
    // Check if user exists in our custom users table
    let { data: existingUser } = await supabase
      .from('users')
      .select('id, username, email')
      .eq('email', user.email)
      .single();

    let userId;
    let username;

    if (!existingUser) {
      // Create user in our custom users table
      username = user.user_metadata?.full_name?.replace(/\s+/g, '_').toLowerCase() || 
                 user.email.split('@')[0] || 
                 `user_${user.id.substring(0, 8)}`;
      
      // Ensure username is unique
      let uniqueUsername = username;
      let counter = 1;
      let usernameCheck = await supabase
        .from('users')
        .select('id')
        .eq('username', uniqueUsername)
        .single();
      
      while (usernameCheck.data) {
        uniqueUsername = `${username}${counter}`;
        counter++;
        usernameCheck = await supabase
          .from('users')
          .select('id')
          .eq('username', uniqueUsername)
          .single();
      }
      username = uniqueUsername;

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            username,
            email: user.email,
            password_hash: '', // Empty string for OAuth users (NULL might cause issues)
            auth_provider: 'google'
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return res.redirect('/login?error=user_creation_failed');
      }

      userId = newUser.id;
    } else {
      userId = existingUser.id;
      username = existingUser.username;
      
      // Update auth_provider if it was email-based before
      await supabase
        .from('users')
        .update({ auth_provider: 'google' })
        .eq('id', userId);
    }

    // Generate JWT token (same as regular login)
    const token = jwt.sign(
      { userId, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`/auth/success?token=${token}&userId=${userId}&username=${encodeURIComponent(username)}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect('/login?error=oauth_failed');
  }
});

// OAuth success page
app.get('/auth/success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Success</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .message {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="message">
        <h2>✅ Authentication Successful!</h2>
        <p>Redirecting you to your journal...</p>
      </div>
      <script>
        // Store token and redirect
        if (window.location.search) {
          const params = new URLSearchParams(window.location.search);
          const token = params.get('token');
          const userId = params.get('userId');
          const username = params.get('username');
          
          if (token) {
            localStorage.setItem('token', token);
            localStorage.setItem('userId', userId);
            localStorage.setItem('username', username);
            setTimeout(() => {
              window.location.href = '/journal';
            }, 1000);
          } else {
            window.location.href = '/login?error=token_missing';
          }
        } else {
          window.location.href = '/login';
        }
      </script>
    </body>
    </html>
  `);
});

// ---------------- Authentication APIs ----------------
app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username, email, and password are required' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      error: 'Password must be at least 6 characters long' 
    });
  }

  try {
    // Check if user already exists (check username and email separately for better compatibility)
    const { data: existingUserByUsername, error: usernameError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .limit(1);

    if (usernameError && usernameError.code === 'PGRST116') {
      return res.status(500).json({ 
        success: false, 
        error: 'Database table "users" not found. Please run the SQL schema (db/supabase-schema.sql) in your Supabase SQL Editor.'
      });
    }

    const { data: existingUserByEmail, error: emailError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (emailError && emailError.code === 'PGRST116') {
      return res.status(500).json({ 
        success: false, 
        error: 'Database table "users" not found. Please run the SQL schema (db/supabase-schema.sql) in your Supabase SQL Editor.'
      });
    }

    if ((existingUserByUsername && existingUserByUsername.length > 0) || 
        (existingUserByEmail && existingUserByEmail.length > 0)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username or email already exists' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        { 
          username, 
          email, 
          password_hash: passwordHash,
          auth_provider: 'email'
        }
      ])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation in PostgreSQL
        return res.status(400).json({ 
          success: false, 
          error: 'Username or email already exists' 
        });
      }
      throw insertError;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      token,
      userId: newUser.id,
      username,
      message: 'Account created successfully'
    });
  } catch (err) {
    console.error('❌ Signup error:', err);
    console.error('❌ Error code:', err.code);
    console.error('❌ Error message:', err.message);
    
    let errorMessage = 'Failed to create account';
    let statusCode = 500;
    
    if (err.code === '23505') { // PostgreSQL unique violation
      errorMessage = 'Username or email already exists';
      statusCode = 400;
    } else if (err.code === 'PGRST116') {
      errorMessage = 'Database table not found. Please run the SQL schema in your Supabase SQL Editor.';
      statusCode = 500;
    } else if (err.message) {
      errorMessage = process.env.NODE_ENV === 'development' 
        ? `Error: ${err.message}` 
        : 'Failed to create account. Please try again.';
    }
    
    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        code: err.code
      } : undefined
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username and password are required' 
    });
  }

  try {
    // Find user (can login with username or email)
    // Try username first
    let { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, password_hash, auth_provider')
      .eq('username', username)
      .limit(1);

    // If not found by username, try email
    if ((!users || users.length === 0) && !error) {
      const emailResult = await supabase
        .from('users')
        .select('id, username, email, password_hash, auth_provider')
        .eq('email', username)
        .limit(1);
      users = emailResult.data;
      error = emailResult.error;
    }

    if (error) {
      throw error;
    }

    if (!users || users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    const user = users[0];

    // Check if user is OAuth-only (no password)
    if (!user.password_hash || user.password_hash.trim() === '' || user.auth_provider === 'google') {
      return res.status(401).json({ 
        success: false, 
        error: 'This account uses Google sign-in. Please sign in with Google.' 
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      token,
      userId: user.id,
      username: user.username,
      message: 'Login successful'
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to login',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ---------------- Mood Tracker APIs ----------------
// GET all moods
app.get('/api/moods', async (req, res) => {
  console.log('📥 [GET /api/moods] Request received');
  console.log('📥 Request method:', req.method);
  console.log('📥 Request path:', req.path);
  console.log('📥 Request URL:', req.url);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  try {
    const { data, error } = await supabase
      .from('moods')
      .select('*')
      .order('logged_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Fetched', data?.length || 0, 'mood entries');
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('❌ Database error in GET /api/moods:', err);
    
    // Handle specific database errors
    let errorMessage = 'Database operation failed';
    if (err.code === 'PGRST116' || err.message?.includes('relation') || err.message?.includes('does not exist')) {
      errorMessage = 'Database table not found. Please ensure the moods table exists.';
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Handle OPTIONS requests for CORS
app.options('/api/moods', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

app.post('/api/moods', async (req, res) => {
  console.log('📥 [POST /api/moods] Request received');
  console.log('📥 Request method:', req.method);
  console.log('📥 Request path:', req.path);
  console.log('📥 Request URL:', req.url);
  console.log('📥 Request body:', req.body);
  console.log('📥 Request headers:', req.headers);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  try {
    const { mood, mood_value, user_id } = req.body;
    
    // Validate input
    if (!mood || mood_value === undefined) {
      console.log('❌ Validation failed: mood or mood_value missing');
      return res.status(400).json({ 
        success: false, 
        error: 'Mood and mood_value are required' 
      });
    }

    // Validate mood value
    const moodValueInt = parseInt(mood_value);
    if (isNaN(moodValueInt) || moodValueInt < 1 || moodValueInt > 5) {
      console.log('❌ Validation failed: invalid mood_value:', mood_value);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid mood_value. Must be between 1 and 5.' 
      });
    }

    console.log('✅ Validation passed. Inserting mood:', {
      mood: String(mood).trim(),
      mood_value: moodValueInt,
      user_id: user_id || null
    });

    // Insert mood into database
    const insertData = { 
      mood: String(mood).trim(), 
      mood_value: moodValueInt,
      user_id: user_id || null,
      logged_at: new Date().toISOString()
    };
    
    console.log('📤 Inserting into database:', insertData);
    
    const { data, error } = await supabase
      .from('moods')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.details);
      throw error;
    }

    console.log('✅ Database insert successful. Data:', data);

    // Ensure we have data before responding
    if (!data || !data.id) {
      console.error('❌ No data returned from database');
      throw new Error('Failed to create mood entry - no ID returned');
    }

    console.log('✅ Sending success response with ID:', data.id);

    // Send success response
    return res.status(200).json({ 
      success: true, 
      id: data.id,
      message: 'Mood logged successfully'
    });
  } catch (err) {
    console.error('❌ Error in /api/moods POST:', err);
    console.error('❌ Error stack:', err.stack);
    
    // Handle specific database errors
    let errorMessage = err.message || 'Database operation failed';
    if (err.code === 'PGRST116' || err.message?.includes('relation') || err.message?.includes('does not exist')) {
      errorMessage = 'Database table not found. Please ensure the moods table exists in your database.';
    } else if (err.code === '23505') {
      errorMessage = 'Duplicate entry. This mood has already been logged.';
    }
    
    // Ensure we always send a JSON response, even on error
    const errorDetails = process.env.NODE_ENV === 'development' ? err.message : undefined;
    
    return res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: errorDetails
    });
  }
});

app.delete('/api/moods/:id', async (req, res) => {
  console.log('📥 [DELETE /api/moods/:id] Request received');
  console.log('📥 Mood ID:', req.params.id);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  const { id } = req.params;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Valid mood ID is required' 
    });
  }

  try {
    const { data, error } = await supabase
      .from('moods')
      .delete()
      .eq('id', parseInt(id))
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Mood entry not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Mood deleted successfully' 
    });
  } catch (err) {
    console.error('❌ Database error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ---------------- Journal APIs (Require Authentication) ----------------
app.get('/api/journal', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('❌ Database error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.post('/api/journal', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Journal content is required' 
    });
  }

  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([
        {
          user_id: req.userId,
          title: title?.trim() || 'Untitled',
          content: content.trim(),
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      success: true, 
      id: data.id,
      message: 'Journal entry saved successfully'
    });
  } catch (err) {
    console.error('❌ Database error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.delete('/api/journal/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Valid journal entry ID is required' 
    });
  }

  try {
    // Verify the entry belongs to the user
    const { data: entry, error: checkError } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('id', parseInt(id))
      .eq('user_id', req.userId)
      .single();
    
    if (checkError || !entry) {
      return res.status(404).json({ 
        success: false, 
        error: 'Journal entry not found' 
      });
    }
    
    const { error: deleteError } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', parseInt(id))
      .eq('user_id', req.userId);
    
    if (deleteError) throw deleteError;
    
    res.json({ 
      success: true, 
      message: 'Journal entry deleted successfully' 
    });
  } catch (err) {
    console.error('❌ Database error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ---------------- Chatbot API ----------------
app.post('/api/chat', async (req, res) => {
  console.log('📥 [POST /api/chat] Request received');
  console.log('📥 Request body:', req.body);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  const { message } = req.body;
  
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Message is required' 
    });
  }

  console.log('🗨️ User said:', message);

  try {
    // Check if Gemini API key is properly configured
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ Gemini API key not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.' 
      });
    }

    // Create the prompt with system instructions and user message
    const systemPrompt = `You are MindCare, a friendly and empathetic mental health assistant. 
Provide supportive, non-judgmental responses. 
If someone is in crisis, encourage them to seek professional help. 
Keep responses concise and helpful (2-3 sentences max).`;

    const fullPrompt = `${systemPrompt}\n\nUser: ${message.trim()}\n\nMindCare:`;

    console.log('🤖 Sending to Gemini API...');

    // Generate content using Gemini
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const reply = response.text();

    if (!reply || reply.trim().length === 0) {
      throw new Error('Invalid response from Gemini API: No text returned');
    }

    console.log('✅ Chatbot replied:', reply.substring(0, 100) + '...');
    
    return res.json({ 
      success: true, 
      reply: reply.trim()
    });
  } catch (err) {
    console.error('❌ Chatbot error:', err);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ Error details:', {
      message: err.message,
      code: err.code,
      status: err.status,
      type: err.name
    });
    
    let errorMessage = 'Failed to get response from AI assistant';
    let statusCode = 500;
    
    // Handle specific Gemini API errors
    if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('Quota')) {
      errorMessage = 'API quota exceeded. Please check your Gemini API account billing.';
      statusCode = 429;
    } else if (err.message?.includes('rate limit') || err.message?.includes('Rate limit')) {
      errorMessage = 'Too many requests, please try again in a moment.';
      statusCode = 429;
    } else if (err.status === 401 || err.status === 403 || err.message?.includes('API key') || err.message?.includes('API_KEY')) {
      errorMessage = 'Invalid API key. Please check your Gemini API key configuration.';
      statusCode = 401;
    } else if (err.message && err.message.includes('network') || err.message && err.message.includes('fetch') || err.message && err.message.includes('Network')) {
      errorMessage = 'Network error connecting to Gemini API. Please check your internet connection.';
      statusCode = 503;
    } else if (err.message) {
      // Include more specific error message in development
      errorMessage = process.env.NODE_ENV === 'development' 
        ? `API Error: ${err.message}` 
        : 'Unable to connect to AI service. Please try again.';
    }
    
    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Handle OPTIONS requests for CORS (chatbot)
app.options('/api/chat', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ---------------- Static Files (After API routes) ----------------
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- HTML Routes ----------------
const viewsPath = path.join(__dirname, 'views');
app.get('/', (req, res) => res.sendFile(path.join(viewsPath, 'index.html')));
app.get('/resources', (req, res) => res.sendFile(path.join(viewsPath, 'resources.html')));
app.get('/chatbot', (req, res) => res.sendFile(path.join(viewsPath, 'chatbot.html')));
app.get('/mood-tracker', (req, res) => res.sendFile(path.join(viewsPath, 'mood-tracker.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(viewsPath, 'contact.html')));
app.get('/therapists', (req, res) => res.sendFile(path.join(viewsPath, 'therapists.html')));
app.get('/login', (req, res) => res.sendFile(path.join(viewsPath, 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(viewsPath, 'signup.html')));
app.get('/journal', (req, res) => res.sendFile(path.join(viewsPath, 'journal.html')));
app.get('/journal-folder', (req, res) => res.sendFile(path.join(viewsPath, 'journal-folder.html')));

// ---------------- Health Check ----------------
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    gemini: 'unknown'
  };

  // Check database
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        health.database = 'tables_not_created';
        health.status = 'unhealthy';
        health.database_error = 'Database tables not found. Run the SQL schema in Supabase SQL Editor.';
      } else {
        throw error;
      }
    } else {
      health.database = 'connected';
    }
  } catch (err) {
    health.status = 'unhealthy';
    health.database = 'disconnected';
    health.database_error = err.message;
  }

  // Check Gemini AI
  try {
    if (!process.env.GEMINI_API_KEY) {
      health.gemini = 'not_configured';
      health.status = 'unhealthy';
    } else {
      // Quick validation - don't make actual API call for health check
      health.gemini = 'configured';
    }
  } catch (err) {
    health.gemini = 'error';
    health.gemini_error = err.message;
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// ---------------- 404 Handler ----------------
// Must be after all other routes - catch-all for unmatched routes
app.use((req, res, next) => {
  // If it's an API request, return JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      success: false, 
      error: 'API route not found' 
    });
  }
  // Otherwise, return a simple 404 page
  res.status(404).send('Page not found');
});

// ---------------- Error Handler ----------------
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// ---------------- Start Server ----------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔍 Google OAuth config endpoint: http://localhost:${PORT}/api/auth/config`);
});