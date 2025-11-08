# Supabase Database Setup Guide

This guide will help you set up your MindCare application with Supabase as the database.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on **Project Settings** (gear icon in the left sidebar)
3. Go to **API** section
4. Copy the following:
   - **Project URL** (this will be your `SUPABASE_URL`)
   - **anon/public key** (this will be your `SUPABASE_ANON_KEY` - for OAuth)
   - **service_role key** (this will be your `SUPABASE_SERVICE_ROLE_KEY`)
   - ⚠️ **Important**:
     - Use `service_role` key for server-side operations
     - Use `anon` key for client-side OAuth operations

## Step 2: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor** (in the left sidebar)
2. Click **New Query**
3. Copy the entire contents of `db/supabase-schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see success messages for each table creation

The schema will create:

- `users` table (for authentication)
- `moods` table (for mood tracking)
- `journal_entries` table (for journal entries)
- Necessary indexes and triggers

## Step 3: Update Environment Variables

Update your `.env` file with your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Gemini AI (keep your existing key)
GEMINI_API_KEY=your-gemini-api-key

# JWT Secret (optional, but recommended)
JWT_SECRET=your-secret-key-here
```

**Remove or comment out the old MariaDB variables:**

```env
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=root
# DB_NAME=mindcare
```

## Step 4: Install Dependencies

The Supabase client is already installed. If you need to reinstall:

```bash
npm install @supabase/supabase-js
```

## Step 5: Start Your Server

```bash
npm start
```

You should see:

- ✅ Connected to Supabase successfully!

If you see a warning about tables not being found, make sure you've run the SQL schema in Step 2.

## Step 6: Test Your Application

1. Visit `http://localhost:3000/signup`
2. Create a new account
3. Try logging in
4. Create a journal entry
5. Log a mood

## Troubleshooting

### Error: "Database table not found"

- Make sure you've run the SQL schema in the Supabase SQL Editor
- Check that all tables were created successfully

### Error: "Invalid API key"

- Verify your `SUPABASE_URL` is correct (should start with `https://`)
- Verify your `SUPABASE_SERVICE_ROLE_KEY` is the service_role key, not the anon key

### Error: "Row Level Security policy violation"

- The schema includes RLS policies. If you encounter issues, you can temporarily disable RLS in Supabase:
  - Go to **Authentication** > **Policies**
  - Or adjust the policies in the SQL schema to match your needs

### Connection Issues

- Make sure your Supabase project is active (not paused)
- Check that your network allows connections to Supabase
- Verify your credentials are correct in the `.env` file

## Row Level Security (RLS)

The schema includes basic RLS policies. For production, you should:

1. Review and adjust the RLS policies based on your security requirements
2. Consider using Supabase Auth for user authentication instead of custom JWT
3. Implement proper user-based access control

## Migration from MariaDB

If you were previously using MariaDB:

1. Export your data from MariaDB (if needed)
2. Run the Supabase schema
3. Import your data into Supabase (you may need to adjust the data format)
4. Update your `.env` file
5. Restart your server

## Support

For Supabase-specific issues, check:

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
