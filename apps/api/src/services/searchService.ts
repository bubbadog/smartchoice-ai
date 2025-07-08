import type { SearchRequest, SearchResponse, EnhancedProduct } from '@smartchoice-ai/shared-types'

import { searchMockProducts, mockProducts } from '../data/mockProducts'

import { VectorSearchService } from './vectorSearchService'

export class SearchService {
  private vectorSearchService: VectorSearchService

  constructor() {
    this.vectorSearchService = new VectorSearchService()
  }

  async searchProducts(searchRequest: SearchRequest): Promise<SearchResponse> {
    const { query: _query, filters: _filters, pagination = { page: 1, limit: 20 }, sortBy = 'relevance' } = searchRequest
    
    // TODO: Add proper logging service
    // console.log(`🔍 Searching for: "${query}"`)
    
    try {
      // Use vector search for semantic search
      const vectorResults = await this.vectorSearchService.hybridSearch(searchRequest)
      
      // Get full product details for vector search results
      const productIds = vectorResults.map(r => r.productId)
      let results = await this.getProductsByIds(productIds)
      
      // Add relevance scores from vector search
      results = results.map((product, index) => ({
        ...product,
        confidence: vectorResults[index]?.score || 0,
      }))
      
      // Apply additional sorting if needed
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
    } catch (error) {
      console.error('Vector search failed, falling back to mock search:', error)
      
      // Fallback to mock search if vector search fails
      return this.searchProductsWithMock(searchRequest)
    }
  }

  private async searchProductsWithMock(searchRequest: SearchRequest): Promise<SearchResponse> {
    const { query, filters, pagination = { page: 1, limit: 20 }, sortBy = 'relevance' } = searchRequest
    
    // Search products with mock data
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
    
    try {
      // Use vector search to find similar products based on embeddings
      const searchRequest = {
        query: `${product.title} ${product.description}`,
        pagination: { page: 1, limit: limit + 1 }, // +1 to account for the original product
        filters: product.category ? { category: product.category } : undefined,
        sortBy: 'relevance' as const,
      }
      
      const vectorResults = await this.vectorSearchService.hybridSearch(searchRequest)
      
      // Filter out the original product and get details
      const similarProductIds = vectorResults
        .filter(r => r.productId !== id)
        .slice(0, limit)
        .map(r => r.productId)
      
      const similarProducts = await this.getProductsByIds(similarProductIds)
      
      // Add relevance scores
      return similarProducts.map((product, index) => ({
        ...product,
        confidence: vectorResults[index]?.score || 0,
      }))
    } catch (error) {
      console.error('Vector search failed for similar products, falling back to mock:', error)
      
      // Fallback to mock similar products
      return mockProducts
        .filter(p => 
          p.id !== id && 
          (p.category === product.category || p.brand === product.brand)
        )
        .slice(0, limit)
    }
  }
  
  async getProductsByIds(ids: string[]): Promise<EnhancedProduct[]> {
    return mockProducts.filter(p => ids.includes(p.id))
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