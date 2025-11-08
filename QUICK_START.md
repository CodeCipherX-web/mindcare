# Quick Start Guide - Mood Tracker

## ⚡ Fast Setup (2 Steps)

### Step 1: Start the Node.js Server

**On Windows:**
- Double-click `start-server.bat`
- OR open Command Prompt and run:
  ```bash
  cd mental-health-platform
  node server.js
  ```

**On Mac/Linux:**
- Open Terminal and run:
  ```bash
  cd mental-health-platform
  chmod +x start-server.sh
  ./start-server.sh
  ```
- OR simply:
  ```bash
  cd mental-health-platform
  node server.js
  ```

**You should see:**
```
🚀 Server running at http://localhost:3000
```

### Step 2: Open the Mood Tracker

**Option A: Use Live Server (Recommended for development)**
1. Right-click `views/mood-tracker.html` in VS Code
2. Select "Open with Live Server"
3. The page will open on port 5500, but API calls will go to port 3000

**Option B: Use Node.js Server**
1. Open your browser
2. Go to: `http://localhost:3000/mood-tracker`

## ✅ Verify It's Working

1. The server terminal should show: `🚀 Server running at http://localhost:3000`
2. Open the mood tracker page
3. You should see the mood logging interface (no error messages)
4. Try logging a mood - it should work!

## ❌ Troubleshooting

### "Cannot connect to backend server"
- **Solution:** Make sure the Node.js server is running
- Check the terminal for the "Server running" message
- Make sure it's running on port 3000

### "Port 3000 already in use"
- **Solution:** Another application is using port 3000
- Stop the other application or change the port in `.env`:
  ```
  PORT=3001
  ```

### "Module not found" errors
- **Solution:** Install dependencies
  ```bash
  npm install
  ```

### Database connection errors
- **Solution:** Check your `.env` file
- Make sure you have:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`

## 📝 Notes

- **Keep the server running:** Don't close the terminal while using the mood tracker
- **Two servers:** You can use Live Server (port 5500) for the frontend AND Node.js (port 3000) for the backend at the same time
- **Auto-reload:** Live Server will auto-reload when you change HTML/CSS/JS files
- **API calls:** All API calls automatically go to `http://localhost:3000` when using Live Server

## 🆘 Still Having Issues?

1. Check the server terminal for error messages
2. Check the browser console (F12) for errors
3. Make sure all dependencies are installed: `npm install`
4. Verify your `.env` file has all required variables
5. Try restarting the server

