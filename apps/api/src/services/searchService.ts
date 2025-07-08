import type { SearchRequest, SearchResponse, EnhancedProduct } from '@smartchoice-ai/shared-types'
import { searchMockProducts, mockProducts } from '../data/mockProducts'

export class SearchService {
  async searchProducts(searchRequest: SearchRequest): Promise<SearchResponse> {
    const { query, filters, pagination = { page: 1, limit: 20 }, sortBy = 'relevance' } = searchRequest
    
    console.log(`🔍 Searching for: "${query}"`)
    
    // Search products
    let results = searchMockProducts(query, 100) // Get more results for filtering/sorting
    
    // Apply filters
    if (filters) {
      if (filters.category) {
        results = results.filter(p => 
          p.category?.toLowerCase().includes(filters.category!.toLowerCase())
        )
      }
      
      if (filters.brand) {
        results = results.filter(p => 
          p.brand?.toLowerCase().includes(filters.brand!.toLowerCase())
        )
      }
      
      if (filters.minPrice) {
        results = results.filter(p => p.price >= filters.minPrice!)
      }
      
      if (filters.maxPrice) {
        results = results.filter(p => p.price <= filters.maxPrice!)
      }
      
      if (filters.rating) {
        results = results.filter(p => (p.rating || 0) >= filters.rating!)
      }
    }
    
    // Sort results
    results = this.sortProducts(results, sortBy)
    
    // Calculate pagination
    const total = results.length
    const totalPages = Math.ceil(total / pagination.limit)
    const offset = (pagination.page - 1) * pagination.limit
    const paginatedResults = results.slice(offset, offset + pagination.limit)
    
    return {
      success: true,
      data: {
        items: paginatedResults,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        },
      },
      timestamp: new Date().toISOString(),
    }
  }
  
  async getProduct(id: string): Promise<EnhancedProduct | null> {
    return mockProducts.find(p => p.id === id) || null
  }
  
  async getSimilarProducts(id: string, limit = 5): Promise<EnhancedProduct[]> {
    const product = await this.getProduct(id)
    if (!product) return []
    
    // Find similar products by category and brand
    return mockProducts
      .filter(p => 
        p.id !== id && 
        (p.category === product.category || p.brand === product.brand)
      )
      .slice(0, limit)
  }
  
  private sortProducts(products: EnhancedProduct[], sortBy: string): EnhancedProduct[] {
    switch (sortBy) {
      case 'price_low':
        return [...products].sort((a, b) => a.price - b.price)
      case 'price_high':
        return [...products].sort((a, b) => b.price - a.price)
      case 'rating':
        return [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0))
      case 'newest':
        return [...products] // Mock: assume current order is newest first
      case 'relevance':
      default:
        return [...products].sort((a, b) => b.confidence - a.confidence)
    }
  }
}