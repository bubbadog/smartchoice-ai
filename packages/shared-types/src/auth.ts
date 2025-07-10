import { z } from 'zod'

// User authentication schemas
export const SignUpRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
})

export const SignInRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export const AuthResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
    createdAt: z.string().datetime(),
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
  }),
})

export const UserUpdateRequestSchema = z.object({
  name: z.string().min(2).optional(),
  preferences: z.record(z.unknown()).optional(),
})

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

// Type exports
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>
export type SignInRequest = z.infer<typeof SignInRequestSchema>
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>
export type AuthResponse = z.infer<typeof AuthResponseSchema>
export type UserUpdateRequest = z.infer<typeof UserUpdateRequestSchema>
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>

// JWT Token payload types
export interface JWTPayload {
  userId: string
  email: string
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
}

// Express request extension
export interface AuthenticatedRequest {
  user?: {
    id: string
    email: string
  }
}