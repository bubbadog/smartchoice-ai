# Database Migrations

## Setting up Authentication Tables

### Prerequisites
- Supabase project created
- Database connection configured
- Supabase CLI installed (optional)

### Running Migrations

#### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `001_create_auth_tables.sql`
4. Paste and run the SQL

#### Option 2: Using Supabase CLI
```bash
# Initialize Supabase (if not already done)
supabase init

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

#### Option 3: Direct Database Connection
```bash
# Using psql
psql -h <your-db-host> -U postgres -d postgres -f 001_create_auth_tables.sql
```

### Important Notes

1. **Row Level Security (RLS)**: The migrations enable RLS on all tables. You may need to adjust the policies based on your authentication method:
   - If using Supabase Auth, the policies will work as-is
   - If using custom JWT auth, update `auth.uid()` to match your JWT claims

2. **UUID Extension**: The migration enables the uuid-ossp extension. This is standard in Supabase but may need manual enabling in other PostgreSQL instances.

3. **Indexes**: Performance indexes are created for common query patterns. Monitor and adjust based on your usage.

### Tables Created

1. **users**: Core user information
   - id (UUID, primary key)
   - email (unique)
   - password_hash
   - name
   - timestamps

2. **user_sessions**: Refresh token management
   - id (UUID, primary key)
   - user_id (foreign key)
   - refresh_token
   - is_active
   - timestamps

3. **user_preferences**: User settings and preferences
   - id (UUID, primary key)
   - user_id (foreign key)
   - preferences (JSONB)
   - timestamps

4. **user_interactions**: User behavior tracking
   - id (UUID, primary key)
   - user_id (foreign key)
   - interaction_type
   - product_id
   - metadata (JSONB)
   - timestamp

### Rollback

To rollback the migration:
```sql
-- Drop tables in reverse order due to foreign key constraints
DROP TABLE IF EXISTS user_interactions CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();
```