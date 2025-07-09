import { Router, Request, Response } from 'express'
import { RegisterSchema, LoginSchema, RefreshTokenInputSchema } from '@smartchoice-ai/shared-types'
import { authService } from '../services/authService'
import { userService } from '../services/userService'
import { authenticate, rateLimitAuth } from '../middleware/authMiddleware'

const router = Router()

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', rateLimitAuth, async (req: Request, res: Response) => {
  try {
    // Validate input
    const input = RegisterSchema.parse(req.body)

    // Create user
    const user = await userService.createUser(input)

    // Generate tokens
    const refreshToken = authService.generateRefreshToken()
    await userService.createRefreshToken(user.id, refreshToken)

    // Update last login
    await userService.updateLastLogin(user.id)

    // Create session
    await userService.createSession(user.id, req.headers['user-agent'], req.ip)

    // Generate response
    const authResponse = authService.generateAuthResponse(user, refreshToken)

    res.status(201).json(authResponse)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({ error: 'User already exists' })
        return
      }
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error })
        return
      }
    }
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', rateLimitAuth, async (req: Request, res: Response) => {
  try {
    // Validate input
    const input = LoginSchema.parse(req.body)

    // Find user
    const user = await userService.findUserByEmail(input.email)
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({ error: 'Account is not active' })
      return
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(input.password, user.passwordHash)
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    // Generate tokens
    const refreshToken = authService.generateRefreshToken()
    await userService.createRefreshToken(user.id, refreshToken)

    // Update last login
    await userService.updateLastLogin(user.id)

    // Create session
    await userService.createSession(user.id, req.headers['user-agent'], req.ip)

    // Generate response
    const authResponse = authService.generateAuthResponse(user, refreshToken)

    res.json(authResponse)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid input', details: error })
      return
    }
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

/**
 * POST /api/auth/logout
 * Logout and revoke refresh token
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken

    if (refreshToken) {
      await userService.revokeRefreshToken(refreshToken)
    }

    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Logout failed' })
  }
})

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Validate input
    const input = RefreshTokenInputSchema.parse(req.body)

    // Find valid refresh token
    const tokenData = await userService.findValidRefreshToken(input.refreshToken)
    if (!tokenData) {
      res.status(401).json({ error: 'Invalid refresh token' })
      return
    }

    // Find user
    const user = await userService.findUserById(tokenData.userId)
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User not found or inactive' })
      return
    }

    // Revoke old refresh token
    await userService.revokeRefreshToken(input.refreshToken)

    // Generate new tokens
    const newRefreshToken = authService.generateRefreshToken()
    await userService.createRefreshToken(user.id, newRefreshToken)

    // Generate response
    const authResponse = authService.generateAuthResponse(user, newRefreshToken)

    res.json(authResponse)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid input', details: error })
      return
    }
    console.error('Token refresh error:', error)
    res.status(500).json({ error: 'Token refresh failed' })
  }
})

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const user = await userService.findUserById(req.user.userId)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Return user profile without sensitive data
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    })
  } catch (error) {
    console.error('Profile error:', error)
    res.status(500).json({ error: 'Failed to get profile' })
  }
})

/**
 * POST /api/auth/logout-all
 * Logout from all devices by revoking all refresh tokens
 */
router.post('/logout-all', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    await userService.revokeAllUserRefreshTokens(req.user.userId)

    res.json({ message: 'Logged out from all devices successfully' })
  } catch (error) {
    console.error('Logout all error:', error)
    res.status(500).json({ error: 'Logout from all devices failed' })
  }
})

export default router