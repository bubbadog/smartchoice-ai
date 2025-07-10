import { config } from 'dotenv'
config()
import cors from 'cors'
import express, { json, urlencoded } from 'express'
import helmet from 'helmet'

import './types/express'

import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import { authRouter } from './routes/auth'
import { healthRouter } from './routes/health'
import { productsRouter } from './routes/products'
import { searchRouter } from './routes/search'
import { validateEnv } from './utils/env'

const env = validateEnv()

const app = express()

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}))

// Body parsing middleware
app.use(json())
app.use(urlencoded({ extended: true }))

// Request logging
app.use(requestLogger)

// API routes with versioning
const apiV1 = express.Router()

// Mount route handlers
apiV1.use('/auth', authRouter)
apiV1.use('/health', healthRouter)
apiV1.use('/search', searchRouter)
apiV1.use('/products', productsRouter)

// API versioning
app.use('/api/v1', apiV1)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  })
})

// Global error handler
app.use(errorHandler)

// Server startup
const PORT = env.PORT || 3000

async function startServer() {
  try {
    app.listen(PORT, () => {
      // Using structured logging would be better here
      if (env.NODE_ENV === 'development') {
        console.log(`🚀 Server running on http://localhost:${PORT}`)
        console.log(`📊 Health check: http://localhost:${PORT}/api/v1/health`)
        console.log(`🔍 Search API: http://localhost:${PORT}/api/v1/search`)
      }
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer().catch((error) => {
  console.error('Server startup failed:', error)
  process.exit(1)
})

export default app