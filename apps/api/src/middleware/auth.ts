import type { JWTPayload } from '@smartchoice-ai/shared-types'
import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'

import { validateEnv } from '../utils/env'

import { AppError } from './errorHandler'

const env = validateEnv()

// Extend Express Request type using module augmentation
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string
      email: string
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    throw new AppError('Access token required', 401)
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET || 'secret') as JWTPayload

    if (payload.type !== 'access') {
      throw new AppError('Invalid token type', 401)
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
    }

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Access token expired', 401)
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid access token', 401)
    }
    throw error
  }
}

// Optional authentication - doesn't throw error if no token
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return next()
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET || 'secret') as JWTPayload

    if (payload.type === 'access') {
      req.user = {
        id: payload.userId,
        email: payload.email,
      }
    }
  } catch (error) {
    // Ignore token errors for optional auth
  }

  next()
}
