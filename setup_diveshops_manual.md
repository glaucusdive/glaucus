# Manual Setup for Diveshops Table

Since the Supabase CLI has permission issues, here's how to set up the table manually:

## Option 1: Use Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/hyldglninkgngaweejmw
2. Navigate to the SQL Editor
3. Copy and paste the entire content from `supabase/migrations/20241220000000_create_diveshops_table.sql`
4. Execute the SQL

## Option 2: Use Supabase CLI (if permissions are fixed)

```bash
# First, make sure you're logged in
supabase login

# Then link your project
supabase link --project-ref hyldglninkgngaweejmw

# Finally, push the migration
supabase db push
```

## Option 3: Use the REST API

You can also execute the SQL via the REST API using curl:

```bash
# Get your anon key from your .env file
ANON_KEY=$(grep NUXT_PUBLIC_SUPABASE_ANON_KEY .env | cut -d'=' -f2)

# Execute the SQL
curl -X POST "https://hyldglninkgngaweejmw.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "CONTENT_FROM_MIGRATION_FILE"}'
```

## What the migration does:

1. Creates the `diveshops` table with all columns including `google_rating`
2. Sets up Row Level Security (RLS) policies
3. Creates indexes for better performance
4. Imports all 47 dive shops from your CSV data
5. Sets up automatic `updated_at` timestamp updates

## Table Structure:

- `id` (UUID, Primary Key)
- `business_name` (TEXT, Required)
- `street_address` (TEXT)
- `city` (TEXT, Required)
- `state` (TEXT, Required)
- `zip` (TEXT)
- `website_url` (TEXT)
- `phone` (TEXT)
- `email` (TEXT)
- `google_rating` (NUMERIC(3,1)) - NEW COLUMN
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

Once you've executed the migration, your table will be ready with all 47 California dive shops! 