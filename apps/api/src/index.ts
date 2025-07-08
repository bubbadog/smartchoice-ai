import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

import './types/express'

import { healthRouter } from './routes/health'
import { searchRouter } from './routes/search'
import { productsRouter } from './routes/products'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import { validateEnv } from './utils/env'

// Load environment variables
dotenv.config()

// Validate environment
const env = validateEnv()

const app = express()
const port = env.PORT

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
  origin: env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use(requestLogger)

// Health check route
app.use('/health', healthRouter)

// API routes
app.use('/api/v1', (req, _res, next) => {
  // API versioning middleware
  req.apiVersion = 'v1'
  next()
})

// API endpoints
app.use('/api/v1/search', searchRouter)
app.use('/api/v1/products', productsRouter)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  })
})

// Error handling middleware (must be last)
app.use(errorHandler)

// Start server
app.listen(port, () => {
  console.log(`🚀 SmartChoice AI API server running on port ${port}`)
  console.log(`📊 Health check available at http://localhost:${port}/health`)
  console.log(`🌍 Environment: ${env.NODE_ENV}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully')
  process.exit(0)
})

export default app