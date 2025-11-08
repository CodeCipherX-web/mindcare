# Fix: Google Sign-In 404 Error

## Problem
The `/api/auth/config` endpoint is returning a 404 error, which means the route isn't being found.

## Solution
**You need to restart your server** after the code changes.

### Steps:

1. **Stop the current server** (if running):
   - Press `Ctrl+C` in the terminal where the server is running

2. **Start the server again**:
   ```bash
   npm start
   ```

3. **Verify the route is registered**:
   - You should see in the console:
     ```
     🔍 Registered routes:
        - GET /api/auth/config
     ```

4. **Test the endpoint**:
   - Open your browser to: `http://localhost:3000/api/auth/config`
   - You should see JSON with your Supabase configuration
   - OR check the browser console on the login page - you should see logs like:
     - 🔍 Fetching Supabase config...
     - 📋 Config received

5. **Try Google Sign-In again**:
   - Go to `/login` or `/signup`
   - Click "Continue with Google"
   - It should now work!

## Why This Happened

When you make changes to `server.js`, Node.js doesn't automatically reload the changes. You need to restart the server for the new route definitions to take effect.

## Quick Test

After restarting, you can test the endpoint directly:
- Open: `http://localhost:3000/api/auth/config` in your browser
- You should see JSON like:
  ```json
  {
    "supabaseUrl": "https://...",
    "supabaseAnonKey": "eyJ...",
    "usingFallback": true
  }
  ```

If you still see a 404 after restarting, check the server console for any error messages.

