# How to Enable Google OAuth in Supabase

The error "Unsupported provider: provider is not enabled" means Google OAuth is not enabled in your Supabase project. Follow these steps to enable it:

## Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     ```
     https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     Replace `YOUR_SUPABASE_PROJECT_REF` with your Supabase project reference (found in your Supabase URL)
   - Click "Create"
   - Copy the **Client ID** and **Client Secret**

## Step 2: Enable Google Provider in Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list
5. Click to enable it
6. Enter your Google OAuth credentials:
   - **Client ID (for OAuth)**: Paste your Google Client ID
   - **Client Secret (for OAuth)**: Paste your Google Client Secret
7. Click **Save**

## Step 3: Verify Configuration

1. Make sure your Supabase project URL is correct in your `.env` file:
   ```
   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   ```

2. Make sure you have the anon key in your `.env`:
   ```
   SUPABASE_ANON_KEY=your_anon_key_here
   ```
   (Get this from Supabase Dashboard > Settings > API > anon/public key)

## Step 4: Test

1. Restart your Node.js server:
   ```bash
   node server.js
   ```

2. Go to the login or signup page
3. Click "Continue with Google"
4. You should be redirected to Google for authentication

## Troubleshooting

### Still getting "provider is not enabled"?
- Make sure you clicked **Save** after entering the credentials in Supabase
- Wait a few seconds for the changes to propagate
- Check that the Client ID and Secret are correct (no extra spaces)

### Redirect URI mismatch?
- Make sure the redirect URI in Google Cloud Console matches exactly:
  `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- The project reference is the part between `https://` and `.supabase.co` in your Supabase URL

### Can't find the Google provider?
- Make sure you're on the correct Supabase project
- Some Supabase plans may have different provider options

## Quick Reference

**Supabase Dashboard**: https://app.supabase.com/
- Authentication > Providers > Google

**Google Cloud Console**: https://console.cloud.google.com/
- APIs & Services > Credentials > Create OAuth client ID

**Your Supabase URL**: Found in Supabase Dashboard > Settings > API
- Format: `https://YOUR_PROJECT_REF.supabase.co`

