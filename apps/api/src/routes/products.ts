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
const compareRequestSchema = z.object({
  productIds: z.array(z.string()).min(2, 'At least 2 products are required for comparison').max(10, 'Maximum 10 products can be compared'),
})

productsRouter.post('/compare', async (req, res, next) => {
  try {
    const validationResult = compareRequestSchema.safeParse(req.body)
    if (!validationResult.success) {
      throw new AppError('Invalid compare request: ' + validationResult.error.errors[0].message, 400)
    }
    
    const { productIds } = validationResult.data
    
    const products = await searchService.getProductsByIds(productIds)
    
    if (products.length === 0) {
      throw new AppError('No products found for the provided IDs', 404)
    }
    
    if (products.length < 2) {
      throw new AppError('At least 2 valid products are required for comparison', 400)
    }
    
    // Create detailed comparison data structure
    const comparison = {
      products: products.map(product => ({
        id: product.id,
        title: product.title,
        brand: product.brand,
        price: product.price,
        rating: product.rating,
        retailer: product.retailer,
        category: product.category,
        image: product.image,
        confidence: product.confidence,
        dealScore: product.dealScore,
        pros: product.pros,
        cons: product.cons,
        url: product.url,
      })),
      summary: {
        priceRange: {
          min: Math.min(...products.map(p => p.price)),
          max: Math.max(...products.map(p => p.price)),
          average: products.reduce((sum, p) => sum + p.price, 0) / products.length,
        },
        ratingRange: {
          min: Math.min(...products.map(p => p.rating || 0)),
          max: Math.max(...products.map(p => p.rating || 0)),
          average: products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length,
        },
        categories: [...new Set(products.map(p => p.category))],
        brands: [...new Set(products.map(p => p.brand))],
        retailers: [...new Set(products.map(p => p.retailer))],
        bestValue: products.reduce((best, current) => 
          (current.dealScore || 0) > (best.dealScore || 0) ? current : best
        ),
        highestRated: products.reduce((best, current) => 
          (current.rating || 0) > (best.rating || 0) ? current : best
        ),
        cheapest: products.reduce((cheapest, current) => 
          current.price < cheapest.price ? current : cheapest
        ),
      },
    }
    
    res.json({
      success: true,
      data: comparison,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

export { productsRouter }