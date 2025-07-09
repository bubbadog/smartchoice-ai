import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { AuthUser, JWTPayload, AuthResponse } from '@smartchoice-ai/shared-types'
import { validateEnv } from '../utils/env'

const env = validateEnv()
const SALT_ROUNDS = 10
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

export class AuthService {
  private jwtSecret: string

  constructor() {
    if (!env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required for authentication')
    }
    this.jwtSecret = env.JWT_SECRET
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Generate a JWT access token
   */
  generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    })
  }

  /**
   * Generate a secure refresh token
   */
  generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex')
  }

  /**
   * Verify and decode a JWT token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload
      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      throw error
    }
  }

  /**
   * Generate auth response with tokens
   */
  generateAuthResponse(user: AuthUser, refreshToken: string): AuthResponse {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = this.generateAccessToken(payload)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    }
  }

  /**
   * Calculate token expiry dates
   */
  getTokenExpiry(type: 'access' | 'refresh'): Date {
    const now = new Date()
    if (type === 'access') {
      now.setMinutes(now.getMinutes() + 15)
    } else {
      now.setDate(now.getDate() + 7)
    }
    return now
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    return authHeader.substring(7)
  }
}

// Export singleton instance
export const authService = new AuthService()