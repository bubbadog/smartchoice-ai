import { SearchRequestSchema, createValidator } from '@smartchoice-ai/shared-types'
import { Router } from 'express'

import { AppError } from '../middleware/errorHandler'
import { SearchService } from '../services/searchService'

const searchRouter = Router()
const searchService = new SearchService()
const searchValidator = createValidator(SearchRequestSchema)

// POST /api/v1/search - Natural language product search
searchRouter.post('/', async (req, res, next) => {
  try {
    // Validate request body
    const validationResult = searchValidator.safeParse(req.body)
    if (!validationResult.success) {
      throw new AppError('Invalid search request', 400)
    }
    
    const searchRequest = validationResult.data
    
    // Perform search
    const results = await searchService.searchProducts(searchRequest)
    
    res.json(results)
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/search?q=query - Alternative GET endpoint for simple searches
searchRouter.get('/', async (req, res, next) => {
  try {
    const { q: query, page = '1', limit = '20', sort = 'relevance' } = req.query
    
    if (!query || typeof query !== 'string') {
      throw new AppError('Query parameter "q" is required', 400)
    }
    
    const searchRequest = {
      query,
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      },
      sortBy: sort as 'relevance' | 'price_low' | 'price_high' | 'rating' | 'newest',
    }
    
    const results = await searchService.searchProducts(searchRequest)
    
    res.json(results)
  } catch (error) {
    next(error)
  }
})

export { searchRouter }