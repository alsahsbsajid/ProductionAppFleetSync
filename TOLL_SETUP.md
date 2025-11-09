# Toll Setup Instructions

## Database Setup Required

The toll notices table hasn't been created yet. Follow these steps to set up the database:

## Option 1: Automated Setup (If Docker is available)
```bash
node scripts/apply-toll-notices-migration.mjs
```

## Option 2: Manual Setup (Recommended for hosted Supabase)

### Step 1: Check Current Status
```bash
node scripts/apply-toll-notices-migration-direct.mjs
```

### Step 2: Manual Database Setup

1. **Open your Supabase Dashboard**: https://pfuudulfnlykoardgtxk.supabase.co

2. **Navigate to the SQL Editor**:
   - Click on "SQL Editor" in the left sidebar
   - Click "New query" to create a new SQL script

3. **Copy the SQL migration**:
   The script above will display the complete SQL migration. Copy all of it.

4. **Execute the SQL**:
   - Paste the SQL into the SQL Editor
   - Click "Run" to execute the migration

5. **Verify the setup**:
   ```bash
   node scripts/apply-toll-notices-migration-direct.mjs
   ```

### What the migration creates:

- **toll_notices table**: Stores all toll notices with user isolation
- **Indexes**: For fast queries on licence plates, motorways, dates, etc.
- **Row Level Security (RLS)**: Users can only see their own toll notices
- **Triggers**: Automatic updated_at timestamp
- **Functions**: `get_user_toll_statistics()` for reporting

## After Setup

Once the database is set up:

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Test the functionality**:
   - Go to the Tolls page in your application
   - Use the "Check Toll Notices" button to search for toll notices
   - Toll data will now be saved permanently to the database
   - Use sorting and filtering features

## Features Available After Setup

- **Persistent toll notices**: Data saved to Supabase database
- **User isolation**: Each user only sees their own toll notices
- **Search and filter**: By licence plate, status, motorway, etc.
- **Statistics**: Total amounts, paid/unpaid counts, etc.
- **Real-time updates**: Changes sync across all tabs

## Current Status

The toll search functionality will work immediately and scrape real toll notices from the official websites. The database is only needed for permanent storage and advanced features.

## Troubleshooting

If you see "Database table not found" messages:
1. The toll search will still work
2. Results will be shown but not saved
3. Follow one of the setup options above to enable full functionality

## Migration File Location

The SQL migration is located at: `supabase/migrations/012_create_toll_notices_table.sql` 