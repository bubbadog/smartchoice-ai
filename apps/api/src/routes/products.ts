import { Router } from 'express'
import { z } from 'zod'

import { AppError } from '../middleware/errorHandler'
import { SearchService } from '../services/searchService'

const productsRouter = Router()
const searchService = new SearchService()

// GET /api/v1/products/:id - Get product details
productsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    
    if (!id || typeof id !== 'string') {
      throw new AppError('Product ID is required', 400)
    }
    
    const product = await searchService.getProduct(id)
    
    if (!product) {
      throw new AppError('Product not found', 404)
    }
    
    res.json({
      success: true,
      data: product,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/products/:id/similar - Find similar products
productsRouter.get('/:id/similar', async (req, res, next) => {
  try {
    const { id } = req.params
    const { limit = '5' } = req.query
    
    if (!id || typeof id !== 'string') {
      throw new AppError('Product ID is required', 400)
    }
    
    const limitNum = parseInt(limit as string, 10)
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      throw new AppError('Limit must be between 1 and 50', 400)
    }
    
    const product = await searchService.getProduct(id)
    if (!product) {
      throw new AppError('Product not found', 404)
    }
    
    const similarProducts = await searchService.getSimilarProducts(id, limitNum)
    
    res.json({
      success: true,
      data: {
        productId: id,
        similarProducts,
        count: similarProducts.length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/v1/products/compare - Compare multiple products
productsRouter.post('/compare', async (req, res, next) => {
  try {
    const { productIds } = req.body
    
    if (!Array.isArray(productIds) || productIds.length < 2) {
      throw new AppError('At least 2 product IDs are required for comparison', 400)
    }
    
    if (productIds.length > 5) {
      throw new AppError('Cannot compare more than 5 products at once', 400)
    }
    
    const products = await Promise.all(
      productIds.map(id => searchService.getProduct(id))
    )
    
    const validProducts = products.filter(p => p !== null)
    
    if (validProducts.length < 2) {
      throw new AppError('At least 2 valid products are required for comparison', 400)
    }
    
    res.json({
      success: true,
      data: {
        products: validProducts,
        comparison: {
          // Add basic comparison logic
          priceRange: {
            min: Math.min(...validProducts.map(p => p!.price)),
            max: Math.max(...validProducts.map(p => p!.price)),
          },
          averageRating: validProducts.reduce((sum, p) => sum + (p!.rating || 0), 0) / validProducts.length,
          brands: [...new Set(validProducts.map(p => p!.brand))],
          categories: [...new Set(validProducts.map(p => p!.category))],
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

export { productsRouter }