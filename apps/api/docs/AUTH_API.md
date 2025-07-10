# Authentication API Documentation

## Overview

The SmartChoice AI authentication system provides secure user registration, login, and session management using JWT tokens with refresh token rotation.

## Base URL

```
http://localhost:3001/api/v1/auth
```

## Authentication Flow

1. **Sign Up/Sign In**: User provides credentials and receives access + refresh tokens
2. **Authenticated Requests**: Include access token in Authorization header
3. **Token Refresh**: Use refresh token to get new access token when expired
4. **Sign Out**: Invalidate refresh tokens

## Endpoints

### 1. Sign Up

Create a new user account.

**Endpoint:** `POST /auth/signup`

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2025-07-09T10:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  },
  "timestamp": "2025-07-09T10:00:00Z"
}
```

### 2. Sign In

Authenticate existing user.

**Endpoint:** `POST /auth/signin`

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** Same as Sign Up

### 3. Refresh Token

Get new access token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** Same as Sign Up

### 4. Sign Out

Invalidate refresh tokens.

**Endpoint:** `POST /auth/signout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body (optional):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..." // Sign out specific session
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Signed out successfully"
  },
  "timestamp": "2025-07-09T10:00:00Z"
}
```

### 5. Get Current User

Get authenticated user information.

**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com"
    }
  },
  "timestamp": "2025-07-09T10:00:00Z"
}
```

### 6. Update Profile

Update user profile information.

**Endpoint:** `PATCH /auth/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Profile updated successfully"
  },
  "timestamp": "2025-07-09T10:00:00Z"
}
```

### 7. Change Password

Change user password.

**Endpoint:** `POST /auth/change-password`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newsecurepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  },
  "timestamp": "2025-07-09T10:00:00Z"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "message": "Password must be at least 8 characters",
  "timestamp": "2025-07-09T10:00:00Z"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid credentials",
  "message": "Invalid email or password",
  "timestamp": "2025-07-09T10:00:00Z"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "User already exists",
  "message": "An account with this email already exists",
  "timestamp": "2025-07-09T10:00:00Z"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too many requests",
  "message": "Too many authentication attempts, please try again later",
  "timestamp": "2025-07-09T10:00:00Z"
}
```

## Security Considerations

1. **Password Requirements**: Minimum 8 characters
2. **Token Expiry**: Access tokens expire in 15 minutes
3. **Refresh Token Rotation**: New refresh token issued on each refresh
4. **Rate Limiting**: Prevents brute force attacks
5. **HTTPS Required**: Always use HTTPS in production
6. **Secure Storage**: Store tokens securely on client side

## Testing with cURL

### Sign Up
```bash
curl -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'
```

### Sign In
```bash
curl -X POST http://localhost:3001/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### Get Profile
```bash
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```