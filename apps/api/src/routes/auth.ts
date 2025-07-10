import {
  SignUpRequestSchema,
  SignInRequestSchema,
  RefreshTokenRequestSchema,
  UserUpdateRequestSchema,
  ChangePasswordRequestSchema,
} from '@smartchoice-ai/shared-types'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'

import { authenticateToken } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { authService } from '../services/authService'

const router = Router()

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

// Sign up
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const data = SignUpRequestSchema.parse(req.body)
    const result = await authService.signUp(data)

    res.status(201).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// Sign in
router.post('/signin', authLimiter, async (req, res, next) => {
  try {
    const data = SignInRequestSchema.parse(req.body)
    const result = await authService.signIn(data)

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const data = RefreshTokenRequestSchema.parse(req.body)
    const result = await authService.refreshToken(data.refreshToken)

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// Sign out
router.post('/signout', authenticateToken, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401)
    }

    const refreshToken = req.body.refreshToken
    await authService.signOut(req.user.id, refreshToken)

    res.json({
      success: true,
      data: { message: 'Signed out successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// Get current user
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401)
    }

    res.json({
      success: true,
      data: {
        user: req.user,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// Update user profile
router.patch('/me', authenticateToken, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401)
    }

    const data = UserUpdateRequestSchema.parse(req.body)
    await authService.updateUser(req.user.id, data)

    res.json({
      success: true,
      data: { message: 'Profile updated successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// Change password
router.post('/change-password', authenticateToken, authLimiter, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401)
    }

    const data = ChangePasswordRequestSchema.parse(req.body)
    await authService.changePassword(req.user.id, data.currentPassword, data.newPassword)

    res.json({
      success: true,
      data: { message: 'Password changed successfully' },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

export const authRouter = router
