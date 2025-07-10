import type {
  SignUpRequest,
  SignInRequest,
  AuthResponse,
  JWTPayload,
  UserUpdateRequest,
} from '@smartchoice-ai/shared-types'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { getSupabaseServiceClient } from '../config/supabase'
import { AppError } from '../middleware/errorHandler'
import { validateEnv } from '../utils/env'

const env = validateEnv()

export class AuthService {
  private supabase: any = null
  private supabaseInitialized = false

  constructor() {
    // Don't initialize Supabase in constructor - do it lazily when needed
  }

  private initializeSupabase() {
    if (!this.supabaseInitialized) {
      try {
        this.supabase = getSupabaseServiceClient()
        console.log('✅ Supabase client initialized successfully')
        this.supabaseInitialized = true
      } catch (error) {
        console.warn('⚠️ Supabase configuration error:', error.message)
        this.supabase = null
        this.supabaseInitialized = true // Mark as attempted even if failed
      }
    }
  }

  private getSupabase() {
    this.initializeSupabase()
    if (!this.supabase) {
      throw new AppError('Authentication service unavailable', 503)
    }
    return this.supabase
  }

  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    const supabase = this.getSupabase()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', data.email)
      .single()

    if (existingUser) {
      throw new AppError('User already exists', 409)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10)

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: data.email,
        password_hash: passwordHash,
        name: data.name || null,
      })
      .select('id, email, name, created_at')
      .single()

    if (error || !user) {
      throw new AppError('Failed to create user', 500)
    }

    // Create user preferences
    await supabase.from('user_preferences').insert({
      user_id: user.id,
      preferences: {},
    })

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email)

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      },
      tokens,
    }
  }

  async signIn(data: SignInRequest): Promise<AuthResponse> {
    const supabase = this.getSupabase()

    // Get user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, password_hash, created_at')
      .eq('email', data.email)
      .single()

    if (error || !user) {
      throw new AppError('Invalid credentials', 401)
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password_hash)
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401)
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email)

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.created_at,
      },
      tokens,
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const supabase = this.getSupabase()

    try {
      // Verify refresh token
      const payload = jwt.verify(
        refreshToken,
        env.JWT_REFRESH_SECRET || env.JWT_SECRET || 'refresh-secret',
      ) as JWTPayload

      if (payload.type !== 'refresh') {
        throw new AppError('Invalid token type', 401)
      }

      // Check if refresh token exists in database
      const { data: tokenRecord } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', payload.userId)
        .eq('refresh_token', refreshToken)
        .eq('is_active', true)
        .single()

      if (!tokenRecord) {
        throw new AppError('Invalid refresh token', 401)
      }

      // Get user
      const { data: user } = await supabase
        .from('users')
        .select('id, email, name, created_at')
        .eq('id', payload.userId)
        .single()

      if (!user) {
        throw new AppError('User not found', 404)
      }

      // Generate new tokens
      const tokens = this.generateTokens(user.id, user.email)

      // Update refresh token
      await supabase
        .from('user_sessions')
        .update({ refresh_token: tokens.refreshToken })
        .eq('refresh_token', refreshToken)

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.created_at,
        },
        tokens,
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token expired', 401)
      }
      throw error
    }
  }

  async signOut(userId: string, refreshToken?: string): Promise<void> {
    const supabase = this.getSupabase()

    if (refreshToken) {
      // Invalidate specific session
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('refresh_token', refreshToken)
    } else {
      // Invalidate all sessions
      await supabase.from('user_sessions').update({ is_active: false }).eq('user_id', userId)
    }
  }

  async updateUser(userId: string, data: UserUpdateRequest): Promise<void> {
    const supabase = this.getSupabase()
    const updates: any = {}

    if (data.name !== undefined) {
      updates.name = data.name
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('users').update(updates).eq('id', userId)

      if (error) {
        throw new AppError('Failed to update user', 500)
      }
    }

    if (data.preferences) {
      const { error } = await supabase
        .from('user_preferences')
        .update({ preferences: data.preferences })
        .eq('user_id', userId)

      if (error) {
        throw new AppError('Failed to update preferences', 500)
      }
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const supabase = this.getSupabase()

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single()

    if (!user) {
      throw new AppError('User not found', 404)
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401)
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId)

    if (error) {
      throw new AppError('Failed to update password', 500)
    }

    // Invalidate all sessions
    await this.signOut(userId)
  }

  private generateTokens(userId: string, email: string) {
    const accessToken = jwt.sign(
      { userId, email, type: 'access' } as JWTPayload,
      env.JWT_SECRET || 'secret',
      { expiresIn: env.JWT_EXPIRY || '15m' },
    )

    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' } as JWTPayload,
      env.JWT_REFRESH_SECRET || env.JWT_SECRET || 'refresh-secret',
      { expiresIn: env.JWT_REFRESH_EXPIRY || '7d' },
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    }
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const supabase = this.getSupabase()

    await supabase.from('user_sessions').insert({
      user_id: userId,
      refresh_token: refreshToken,
      is_active: true,
    })
  }
}

// Export singleton instance
export const authService = new AuthService()
