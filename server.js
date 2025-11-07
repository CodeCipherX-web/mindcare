require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mariadb = require('mariadb');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Environment Validation ----------------
const requiredEnvVars = [
  'GEMINI_API_KEY',
  'DB_HOST', 
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

console.log('🔍 Loaded Gemini API key prefix:', process.env.GEMINI_API_KEY?.slice(0, 10));
console.log('🔍 Using DB:', process.env.DB_NAME);

// ---------------- Middleware ----------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------- Database Connection ----------------
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

// Test DB connection
(async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('✅ Connected to MariaDB successfully!');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1); // Exit if DB connection fails
  } finally {
    if (conn) conn.release();
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
const getDbConnection = () => pool.getConnection();

const handleDbOperation = async (res, operation) => {
  let conn;
  try {
    conn = await getDbConnection();
    const result = await operation(conn);
    res.json(result);
  } catch (err) {
    console.error('❌ Database error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (conn) conn.release();
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

  let conn;
  try {
    conn = await getDbConnection();
    
    // Check if user already exists
    const existingUser = await conn.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username or email already exists' 
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await conn.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertId, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      success: true, 
      token,
      userId: result.insertId,
      username,
      message: 'Account created successfully'
    });
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create account',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (conn) conn.release();
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

  let conn;
  try {
    conn = await getDbConnection();
    
    // Find user
    const users = await conn.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    const user = users[0];

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
  } finally {
    if (conn) conn.release();
  }
});

// ---------------- Mood Tracker APIs ----------------
app.get('/api/moods', async (req, res) => {
  await handleDbOperation(res, async (conn) => {
    const rows = await conn.query('SELECT * FROM moods ORDER BY logged_at DESC');
    return { success: true, data: rows };
  });
});

app.post('/api/moods', async (req, res) => {
  const { mood, mood_value } = req.body;
  
  if (!mood || mood_value === undefined) {
    return res.status(400).json({ 
      success: false, 
      error: 'Mood and mood_value are required' 
    });
  }

  await handleDbOperation(res, async (conn) => {
    const result = await conn.query(
      'INSERT INTO moods (mood, mood_value, logged_at) VALUES (?, ?, NOW())',
      [mood, parseInt(mood_value)]
    );
    return { 
      success: true, 
      id: result.insertId,
      message: 'Mood logged successfully'
    };
  });
});

app.delete('/api/moods/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Valid mood ID is required' 
    });
  }

  let conn;
  try {
    conn = await getDbConnection();
    const result = await conn.query('DELETE FROM moods WHERE id = ?', [parseInt(id)]);
    
    if (result.affectedRows === 0) {
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
  } finally {
    if (conn) conn.release();
  }
});

// ---------------- Journal APIs (Require Authentication) ----------------
app.get('/api/journal', authenticateToken, async (req, res) => {
  await handleDbOperation(res, async (conn) => {
    const rows = await conn.query(
      'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    return { success: true, data: rows };
  });
});

app.post('/api/journal', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Journal content is required' 
    });
  }

  await handleDbOperation(res, async (conn) => {
    const result = await conn.query(
      'INSERT INTO journal_entries (user_id, title, content, created_at) VALUES (?, ?, ?, NOW())',
      [req.userId, title?.trim() || 'Untitled', content.trim()]
    );
    return { 
      success: true, 
      id: result.insertId,
      message: 'Journal entry saved successfully'
    };
  });
});

app.delete('/api/journal/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Valid journal entry ID is required' 
    });
  }

  let conn;
  try {
    conn = await getDbConnection();
    // Verify the entry belongs to the user
    const entry = await conn.query(
      'SELECT id FROM journal_entries WHERE id = ? AND user_id = ?',
      [parseInt(id), req.userId]
    );
    
    if (entry.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Journal entry not found' 
      });
    }
    
    const result = await conn.query('DELETE FROM journal_entries WHERE id = ? AND user_id = ?', [parseInt(id), req.userId]);
    
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
  } finally {
    if (conn) conn.release();
  }
});

// ---------------- Chatbot API ----------------
app.post('/api/chat', async (req, res) => {
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
      throw new Error('Gemini API key is not configured');
    }

    // Create the prompt with system instructions and user message
    const systemPrompt = `You are MindCare, a friendly and empathetic mental health assistant. 
Provide supportive, non-judgmental responses. 
If someone is in crisis, encourage them to seek professional help. 
Keep responses concise and helpful.`;

    const fullPrompt = `${systemPrompt}\n\nUser: ${message.trim()}\n\nMindCare:`;

    // Generate content using Gemini
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const reply = response.text();

    if (!reply) {
      throw new Error('Invalid response from Gemini API: No text returned');
    }

    console.log('🤖 Chatbot replied:', reply);
    
    res.json({ 
      success: true, 
      reply 
    });
  } catch (err) {
    console.error('❌ Chatbot error:', err);
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
    
    res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
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
app.get('/login', (req, res) => res.sendFile(path.join(viewsPath, 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(viewsPath, 'signup.html')));
app.get('/journal', (req, res) => res.sendFile(path.join(viewsPath, 'journal.html')));
app.get('/journal-folder', (req, res) => res.sendFile(path.join(viewsPath, 'journal-folder.html')));

// ---------------- Health Check ----------------
app.get('/health', async (req, res) => {
  let conn;
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    gemini: 'unknown'
  };

  // Check database
  try {
    conn = await pool.getConnection();
    await conn.query('SELECT 1');
    health.database = 'connected';
  } catch (err) {
    health.status = 'unhealthy';
    health.database = 'disconnected';
    health.database_error = err.message;
  } finally {
    if (conn) conn.release();
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
});