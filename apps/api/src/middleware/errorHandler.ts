import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    
    Error.captureStackTrace(this, this.constructor)
  }
}

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  let statusCode = 500
  let message = 'Internal Server Error'
  let details: Record<string, unknown> | undefined

  // Handle known error types
  if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
  } else if (error instanceof z.ZodError) {
    statusCode = 400
    message = 'Validation Error'
    details = {
      issues: error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    }
  } else if (error.name === 'ValidationError') {
    statusCode = 400
    message = error.message
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401
    message = 'Unauthorized'
  }

  // Log error for debugging
  if (statusCode >= 500) {
    console.error('💥 Server Error:', error)
  } else {
    console.warn('⚠️ Client Error:', message, details)
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && {
      stack: error.stack,
    }),
  })
}