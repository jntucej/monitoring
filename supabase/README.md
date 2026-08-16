# Gate Monitoring System - Supabase Database Setup

This directory contains the migration files for setting up the Gate Monitoring System database in Supabase.

## Initializing a Fresh Supabase POC Database

To initialize a fresh Supabase database for the Gate Monitoring System POC, follow these steps:

### 1. Create a New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Select your organization
4. Enter a project name (e.g., "Gate Monitoring POC")
5. Select a region closest to your users
6. Click "Create new project"

### 2. Set Up Environment Variables

After your project is created, go to the "Project Settings" → "API" section and note:

- **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
- **anon/public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Add these to your application's `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Apply Database Migrations

Apply the migrations in the correct order:

```bash
# Navigate to your project directory
cd /Users/akarsh/Desktop/CLG/GATE MONITOR

# Apply migrations using Supabase CLI
# Make sure you have the Supabase CLI installed: npm install -g supabase

# Link your local project to the Supabase project
supabase link --project-ref your-project-ref

# Apply migrations in order
supabase db push --file supabase/migrations/0001_initial_schema.sql
supabase db push --file supabase/migrations/0002_functions_triggers_rls.sql
supabase db push --file supabase/migrations/0003_complete_schema_fixes.sql
```

Alternatively, you can apply all migrations at once:

```bash
# Apply all migrations in the correct order
supabase db push --file supabase/migrations/0001_initial_schema.sql
supabase db push --file supabase/migrations/0002_functions_triggers_rls.sql
supabase db push --file supabase/migrations/0003_complete_schema_fixes.sql
```

### 4. Verify Database Setup

After applying migrations, verify that everything is set up correctly:

```bash
# Connect to your Supabase database
supabase db remote

# Verify tables exist
\dt

# Verify extensions are enabled
\dx

# Verify RLS is enabled on all tables
SELECT tablename, row_security FROM pg_tables WHERE schemaname = 'public';

# Verify functions exist
\df

# Verify triggers exist
SELECT event_object_table, trigger_name FROM information_schema.triggers;
```

### 5. Set Up Database Webhooks (Optional)

For enhanced functionality, you may want to set up database webhooks:

1. Go to "Database" → "Webhooks" in your Supabase dashboard
2. Create webhooks for important events (e.g., gate scans, pass approvals)

### 6. Test the Database

Run the following SQL queries to test basic functionality:

```sql
-- Test basic table access
SELECT * FROM users LIMIT 1;
SELECT * FROM students LIMIT 1;
SELECT * FROM gates LIMIT 1;

-- Test RLS policies (run as different roles)
SET ROLE authenticated;
SELECT * FROM users LIMIT 1;

-- Test functions
SELECT user_student_mapping('some-user-id');
SELECT is_admin('some-user-id');
```

## Migration Order and Dependencies

The migrations must be applied in the following order:

1. **0001_initial_schema.sql** - Creates the foundational schema with tables
2. **0002_functions_triggers_rls.sql** - Adds functions, triggers, and RLS policies
3. **0003_complete_schema_fixes.sql** - Fixes missing components and ensures schema completeness

## Database Initialization Script

For convenience, here's a complete initialization script you can use:

```bash
#!/bin/bash

# Gate Monitoring System - Database Initialization Script

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI is not installed. Installing..."
    npm install -g supabase
fi

# Check if project ref is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <supabase-project-ref>"
    echo "Please provide your Supabase project reference"
    exit 1
fi

PROJECT_REF=$1

# Link to Supabase project
echo "Linking to Supabase project: $PROJECT_REF"
supabase link --project-ref $PROJECT_REF

# Apply migrations
echo "Applying database migrations..."

echo "1. Applying initial schema..."
supabase db push --file supabase/migrations/0001_initial_schema.sql

echo "2. Applying functions, triggers, and RLS..."
supabase db push --file supabase/migrations/0002_functions_triggers_rls.sql

echo "3. Applying schema fixes and completions..."
supabase db push --file supabase/migrations/0003_complete_schema_fixes.sql

echo "Database initialization complete!"
echo "Your Gate Monitoring System database is now ready for the POC."
```

## Verification Checklist

After initialization, verify the following:

- [ ] All tables exist (users, students, gates, gate_logs, gate_passes, campus_occupancy, alerts, audit_logs, notifications, sessions, user_student_mapping)
- [ ] All extensions are enabled (pgcrypto, pg_trgm, uuid-ossp)
- [ ] All foreign key constraints are properly set up
- [ ] All CHECK constraints are properly set up
- [ ] All indexes are created
- [ ] All functions are created
- [ ] All triggers are created
- [ ] RLS is enabled on all tables
- [ ] RLS policies are properly configured
- [ ] The user_student_mapping table exists and is properly configured
- [ ] The user_student_mapping function works correctly

## Troubleshooting

### Common Issues

1. **Migration conflicts**: If you encounter conflicts, make sure you're starting with a fresh database
2. **RLS policy errors**: Verify that all required functions are created before RLS policies
3. **Foreign key constraint errors**: Ensure tables are created in the correct dependency order
4. **Function errors**: Verify that all referenced tables and columns exist

### Resetting the Database

If you need to start over with a fresh database:

```bash
# Reset the database (WARNING: This will delete all data)
supabase db reset

# Then reapply migrations
supabase db push --file supabase/migrations/0001_initial_schema.sql
supabase db push --file supabase/migrations/0002_functions_triggers_rls.sql
supabase db push --file supabase/migrations/0003_complete_schema_fixes.sql
```

## Final State

After successful initialization, your database should be in this state:

```
EMPTY SUPABASE PROJECT
        ↓
RUN MIGRATIONS (0001, 0002, 0003)
        ↓
COMPLETE APPLICATION DATABASE
        ↓
RLS ENABLED
        ↓
READY FOR POC
```

The database is now ready for the Gate Monitoring System POC deployment.