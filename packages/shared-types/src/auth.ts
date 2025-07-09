import { z } from 'zod'

// Auth User Schema (extends base user with auth fields)
export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  passwordHash: z.string(),
  name: z.string().optional(),
  avatar: z.string().url().optional(),
  role: z.enum(['user', 'admin']).default('user'),
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional(),
})

export type AuthUser = z.infer<typeof AuthUserSchema>

// Registration Schema
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100).optional(),
})

export type RegisterInput = z.infer<typeof RegisterSchema>

// Login Schema
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export type LoginInput = z.infer<typeof LoginSchema>

// JWT Payload
export const JWTPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  iat: z.number().optional(),
  exp: z.number().optional(),
})

export type JWTPayload = z.infer<typeof JWTPayloadSchema>

// Refresh Token Schema
export const RefreshTokenSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
  revokedAt: z.date().optional(),
})

export type RefreshToken = z.infer<typeof RefreshTokenSchema>

// Session Schema
export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  createdAt: z.date(),
  expiresAt: z.date(),
})

export type Session = z.infer<typeof SessionSchema>

// Auth Response Schema
export const AuthResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().optional(),
    role: z.enum(['user', 'admin']),
  }),
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
})

export type AuthResponse = z.infer<typeof AuthResponseSchema>

// Token Refresh Schema
export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string(),
})

export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>