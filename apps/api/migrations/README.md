# Authentication System Setup

## Database Migrations

The authentication system requires the following database tables:
- `users` - User accounts with authentication data
- `refresh_tokens` - JWT refresh tokens for token rotation
- `sessions` - User sessions for tracking active logins
- `user_preferences` - User preferences and settings
- `search_history` - User search history
- `user_interactions` - User interaction tracking

## Running Migrations

1. **Connect to your Supabase project**:
   - Go to your Supabase dashboard
   - Navigate to the SQL Editor

2. **Run the migrations in order**:
   - First run `001_create_auth_tables.sql`
   - Then run `002_create_user_data_tables.sql`

3. **Verify the tables were created**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('users', 'refresh_tokens', 'sessions', 'user_preferences');
   ```

## Testing the Authentication System

### 1. Register a new user

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'
```

Expected response:
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "name": "Test User",
    "role": "user"
  },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "expiresIn": 900
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

### 3. Access protected route

```bash
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Refresh token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 5. Test user preferences

```bash
# Get preferences
curl -X GET http://localhost:3000/api/v1/users/preferences \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Update preferences
curl -X PUT http://localhost:3000/api/v1/users/preferences \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "categories": ["electronics", "computers"],
    "priceRange": { "min": 100, "max": 1000 },
    "dealThreshold": 80
  }'
```

### 6. Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## Security Features

1. **Password Security**:
   - Passwords are hashed with bcrypt (10 salt rounds)
   - Minimum 8 characters required
   - Never stored in plain text

2. **JWT Tokens**:
   - Access tokens expire in 15 minutes
   - Refresh tokens expire in 7 days
   - Refresh token rotation on use

3. **Rate Limiting**:
   - 5 authentication attempts per 15 minutes per IP
   - Prevents brute force attacks

4. **Session Management**:
   - Track active sessions
   - Logout from all devices option
   - Session expiry after 24 hours

5. **Row Level Security**:
   - Users can only access their own data
   - Enforced at database level

## Environment Variables

Ensure these are set in your `.env` file:
```env
JWT_SECRET=your-32-character-secret-key-here-change-this
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Troubleshooting

1. **"JWT_SECRET is required" error**:
   - Ensure JWT_SECRET is set in your environment variables

2. **"User already exists" error**:
   - The email is already registered
   - Use a different email or login instead

3. **"Token expired" error**:
   - Use the refresh token endpoint to get a new access token

4. **Database connection errors**:
   - Verify Supabase credentials are correct
   - Check if tables were created successfully