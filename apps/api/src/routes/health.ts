import type { HealthCheckResponse } from '@smartchoice-ai/shared-types'
import { Router } from 'express'

import { searchCache, productCache, similarProductsCache } from '../services/cacheService'

export const healthRouter = Router()

const startTime = Date.now()

healthRouter.get('/', (_req, res) => {
  const uptime = Date.now() - startTime
  
  // Get cache statistics for health monitoring
  const _cacheStats = {
    search: searchCache.getStats(),
    products: productCache.getStats(),
    similarProducts: similarProductsCache.getStats(),
  }
  
  const healthData: HealthCheckResponse = {
    success: true,
    data: {
      status: 'healthy',
      version: '1.0.0',
      uptime,
      services: {
        api: {
          status: 'up',
          responseTime: 0,
        },
        database: {
          status: 'up', // TODO: Add real database health check
          responseTime: 0,
        },
        cache: {
          status: 'up',
          responseTime: 0,
        },
      },
    },
    timestamp: new Date().toISOString(),
  }
  
  res.json(healthData)
})

healthRouter.get('/ready', (_req, res) => {
  // Readiness probe - check if app can handle requests
  res.json({
    success: true,
    data: { ready: true },
    timestamp: new Date().toISOString(),
  })
})

healthRouter.get('/live', (_req, res) => {
  // Liveness probe - check if app is alive
  res.json({
    success: true,
    data: { alive: true },
    timestamp: new Date().toISOString(),
  })
})