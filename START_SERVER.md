# How to Start the Server

## Important: Use the Node.js Server, NOT Live Server!

The mood tracker requires the Node.js backend server to be running. Live Server (port 5500) won't work because it doesn't have the API endpoints.

## Steps to Start:

1. **Open a terminal/command prompt** in the `mental-health-platform` directory

2. **Make sure you have Node.js installed**
   ```bash
   node --version
   ```

3. **Install dependencies** (if you haven't already)
   ```bash
   npm install
   ```

4. **Start the server**
   ```bash
   node server.js
   ```

5. **Open your browser** and go to:
   ```
   http://localhost:3000/mood-tracker
   ```
   
   **NOT** `http://127.0.0.1:5500` (Live Server)

## Why This Matters:

- Live Server (port 5500) only serves static files
- The mood tracker needs the Node.js backend API (`/api/moods`)
- The Node.js server runs on port 3000 and handles all API requests
- All routes should be accessed through `http://localhost:3000`

## If You See "405 Method Not Allowed" or "Cannot GET /api/moods":

This means you're using Live Server instead of the Node.js server. Make sure to:
1. Stop Live Server
2. Start the Node.js server (`node server.js`)
3. Access the site at `http://localhost:3000`

