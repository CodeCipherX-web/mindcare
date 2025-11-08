# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your MindCare application.

## Prerequisites

1. A Supabase project (already set up)
2. A Google Cloud Platform account

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**:
   - Go to **APIs & Services** > **Library**
   - Search for "Google+ API"
   - Click on it and click **Enable**
4. Create OAuth 2.0 Credentials:
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **OAuth client ID**
   - If prompted, configure the OAuth consent screen first:
     - Choose **External** (unless you have a Google Workspace account)
     - Fill in the required information (App name, User support email, etc.)
     - Add your email to test users if needed
     - Save and continue
   - For **Application type**, select **Web application**
   - Give it a name (e.g., "MindCare Auth")
   - Add **Authorized redirect URIs**:
     - `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
     - Replace `YOUR_PROJECT_ID` with your Supabase project ID
   - Click **Create**
5. Copy the **Client ID** and **Client Secret**

## Step 2: Configure Google OAuth in Supabase

1. Go to your Supabase dashboard
2. Navigate to **Authentication** > **Providers**
3. Find **Google** in the list and click on it
4. Toggle **Enable Google provider** to ON
5. Paste your **Client ID** and **Client Secret** from Step 1
6. Click **Save**

## Step 3: Update Environment Variables

Add the Supabase anon key to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here  # Get this from Supabase > Settings > API
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Other environment variables...
GEMINI_API_KEY=your-key
JWT_SECRET=your-secret
```

**To get your anon key:**
1. Go to Supabase Dashboard > **Settings** > **API**
2. Copy the **anon/public** key (not the service_role key)

## Step 4: Update Database Schema

If you haven't already, run the updated schema in your Supabase SQL Editor:

1. Go to **SQL Editor** in Supabase
2. Run this migration to add the `auth_provider` column:

```sql
-- Add auth_provider column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';

-- Update existing users to have email as provider
UPDATE users 
SET auth_provider = 'email' 
WHERE auth_provider IS NULL;

-- Make password_hash nullable (already done in schema, but ensure it's correct)
ALTER TABLE users 
ALTER COLUMN password_hash DROP NOT NULL;
```

Or simply re-run the entire `db/supabase-schema.sql` file if your tables are empty.

## Step 5: Test Google OAuth

1. Start your server:
   ```bash
   npm start
   ```

2. Visit `http://localhost:3000/login`
3. Click the **"Continue with Google"** button
4. You should be redirected to Google's login page
5. After signing in, you'll be redirected back and logged in

## Troubleshooting

### Error: "Google provider is not enabled"
- Make sure you've enabled Google in Supabase > Authentication > Providers
- Verify your Client ID and Client Secret are correct

### Error: "Redirect URI mismatch"
- Make sure the redirect URI in Google Cloud Console matches exactly:
  - `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
- Check that there are no trailing slashes or typos

### Error: "OAuth callback failed"
- Check your server logs for specific error messages
- Verify `SUPABASE_ANON_KEY` is set in your `.env` file
- Make sure your Supabase project is active (not paused)

### Google button doesn't appear
- Check browser console for JavaScript errors
- Verify the `/api/auth/config` endpoint returns the correct values
- Make sure `SUPABASE_ANON_KEY` is set

### Users can't sign in after OAuth
- Check that the database schema has been updated with `auth_provider` column
- Verify users are being created in the `users` table after OAuth

## Security Notes

1. **Never commit your `.env` file** to version control
2. The `SUPABASE_ANON_KEY` is safe to expose to the frontend (it's designed for client-side use)
3. The `SUPABASE_SERVICE_ROLE_KEY` should **never** be exposed to the frontend
4. OAuth users have empty `password_hash` fields - this is expected and secure

## How It Works

1. User clicks "Continue with Google" button
2. Frontend redirects to Google OAuth consent screen
3. User authorizes the application
4. Google redirects back to Supabase with an authorization code
5. Supabase exchanges the code for a session
6. Our server callback (`/auth/callback`) receives the session
7. Server creates/updates user in our `users` table
8. Server generates a JWT token (same as email/password login)
9. User is redirected to the journal page with the token stored

## Support

For issues:
- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Google OAuth Docs: https://developers.google.com/identity/protocols/oauth2

