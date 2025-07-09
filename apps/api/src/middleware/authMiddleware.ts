import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/authService'
import { userService } from '../services/userService'

/**
 * Middleware to authenticate requests using JWT
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const token = authService.extractTokenFromHeader(req.headers.authorization)

    if (!token) {
      res.status(401).json({ error: 'No authentication token provided' })
      return
    }

    // Verify the token
    const payload = authService.verifyAccessToken(token)

    // Check if user still exists and is active
    const user = await userService.findUserById(payload.userId)
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User account is not active' })
      return
    }

    // Attach user payload to request
    req.user = payload
    next()
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        res.status(401).json({ error: 'Token expired' })
        return
      }
      if (error.message === 'Invalid token') {
        res.status(401).json({ error: 'Invalid token' })
        return
      }
    }
    res.status(401).json({ error: 'Authentication failed' })
  }
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }

    next()
  }
}

/**
 * Middleware to optionally authenticate requests
 * Continues even if authentication fails, but attaches user if valid
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = authService.extractTokenFromHeader(req.headers.authorization)

    if (token) {
      const payload = authService.verifyAccessToken(token)
      const user = await userService.findUserById(payload.userId)
      
      if (user && user.isActive) {
        req.user = payload
      }
    }
  } catch (error) {
    // Ignore authentication errors for optional auth
  }

  next()
}

/**
 * Middleware to rate limit authentication attempts
 */
const authAttempts = new Map<string, { count: number; resetTime: number }>()

export function rateLimitAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const identifier = req.ip || 'unknown'
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  const attempts = authAttempts.get(identifier)

  if (attempts && attempts.resetTime > now) {
    if (attempts.count >= maxAttempts) {
      const retryAfter = Math.ceil((attempts.resetTime - now) / 1000)
      res.status(429).json({ 
        error: 'Too many authentication attempts',
        retryAfter 
      })
      return
    }
    attempts.count++
  } else {
    authAttempts.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
  }

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    for (const [key, value] of authAttempts.entries()) {
      if (value.resetTime < now) {
        authAttempts.delete(key)
      }
    }
  }

  next()
}