import { getSupabaseClient } from '../config/supabase'
import { AuthUser, RegisterInput, RefreshToken } from '@smartchoice-ai/shared-types'
import { authService } from './authService'

export class UserService {
  private supabase = getSupabaseClient()

  /**
   * Create a new user
   */
  async createUser(input: RegisterInput): Promise<AuthUser> {
    // Check if user already exists
    const { data: existingUser } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', input.email)
      .single()

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Hash the password
    const passwordHash = await authService.hashPassword(input.password)

    // Create the user
    const { data: newUser, error } = await this.supabase
      .from('users')
      .insert({
        email: input.email,
        password_hash: passwordHash,
        name: input.name,
        role: 'user',
        is_active: true,
        email_verified: false,
      })
      .select()
      .single()

    if (error) {
      throw new Error('Failed to create user: ' + error.message)
    }

    return this.mapToAuthUser(newUser)
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapToAuthUser(data)
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<AuthUser | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return this.mapToAuthUser(data)
  }

  /**
   * Update user last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId)
  }

  /**
   * Create refresh token
   */
  async createRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = authService.getTokenExpiry('refresh')

    const { error } = await this.supabase
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
      })

    if (error) {
      throw new Error('Failed to create refresh token: ' + error.message)
    }
  }

  /**
   * Find valid refresh token
   */
  async findValidRefreshToken(token: string): Promise<RefreshToken | null> {
    const { data, error } = await this.supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token', token)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      userId: data.user_id,
      token: data.token,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at),
      revokedAt: data.revoked_at ? new Date(data.revoked_at) : undefined,
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await this.supabase
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token', token)
  }

  /**
   * Revoke all user refresh tokens
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.supabase
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null)
  }

  /**
   * Create user session
   */
  async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<void> {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour session

    await this.supabase
      .from('sessions')
      .insert({
        user_id: userId,
        user_agent: userAgent,
        ip_address: ipAddress,
        expires_at: expiresAt.toISOString(),
      })
  }

  /**
   * Clean up expired tokens and sessions
   */
  async cleanupExpiredData(): Promise<void> {
    const now = new Date().toISOString()

    // Clean up expired refresh tokens
    await this.supabase
      .from('refresh_tokens')
      .delete()
      .lt('expires_at', now)

    // Clean up expired sessions
    await this.supabase
      .from('sessions')
      .delete()
      .lt('expires_at', now)
  }

  /**
   * Map database user to AuthUser type
   */
  private mapToAuthUser(dbUser: any): AuthUser {
    return {
      id: dbUser.id,
      email: dbUser.email,
      passwordHash: dbUser.password_hash,
      name: dbUser.name,
      avatar: dbUser.avatar,
      role: dbUser.role,
      isActive: dbUser.is_active,
      emailVerified: dbUser.email_verified,
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at),
      lastLoginAt: dbUser.last_login_at ? new Date(dbUser.last_login_at) : undefined,
    }
  }
}

// Export singleton instance
export const userService = new UserService()