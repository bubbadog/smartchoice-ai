import type { SearchRequest, SearchResponse, EnhancedProduct } from '@smartchoice-ai/shared-types'

import { searchMockProducts, mockProducts } from '../data/mockProducts'

import { searchCache, productCache, similarProductsCache } from './cacheService'
import { ProductAggregationService } from './productAggregationService'
import { VectorSearchService } from './vectorSearchService'

export class SearchService {
  private vectorSearchService: VectorSearchService
  private aggregationService: ProductAggregationService

  constructor() {
    this.vectorSearchService = new VectorSearchService()
    this.aggregationService = new ProductAggregationService()
  }

  async searchProducts(searchRequest: SearchRequest): Promise<SearchResponse> {
    const {
      query: _query,
      filters: _filters,
      pagination = { page: 1, limit: 20 },
      sortBy = 'relevance',
    } = searchRequest

    // Create cache key from search request (normalize for consistent caching)
    const cacheKey = {
      query: searchRequest.query,
      filters: searchRequest.filters || {},
      sortBy: searchRequest.sortBy || 'relevance',
      page: pagination.page,
      limit: pagination.limit,
    }

    // Check cache first
    const cachedResult = searchCache.get<SearchResponse>(cacheKey)
    if (cachedResult) {
      console.log('📦 Returning cached result')
      // Update timestamp but keep cached data
      return {
        ...cachedResult,
        timestamp: new Date().toISOString(),
      }
    }

    try {
      console.log(`🔍 Starting search for: "${searchRequest.query}"`)

      // First try aggregated search (excluding Amazon until fixed)
      let results = await this.aggregationService.aggregateSearchResults(searchRequest, {
        sources: ['bestbuy', 'mock'], // Excluding Amazon API until fixed
        maxResultsPerSource: 20,
        enableDeduplication: true,
        sortBy: sortBy as any,
      })

      console.log(`📊 Aggregated search returned ${results.length} results`)

      // If aggregated search returns few results, try vector search as backup
      if (results.length < 3) {
        console.log('🔍 Aggregated search returned few results, trying vector search...')
        try {
          const vectorResults = await this.vectorSearchService.hybridSearch(searchRequest)
          console.log(`📦 Vector search returned ${vectorResults.length} results`)
          const productIds = vectorResults.map((r) => r.productId)
          const vectorProducts = await this.getProductsByIds(productIds)

          // Add vector products to results with relevance scores
          const enhancedVectorProducts = vectorProducts.map((product, index) => ({
            ...product,
            confidence: vectorResults[index]?.score || 0,
          }))

          results = [...results, ...enhancedVectorProducts]
        } catch (vectorError) {
          console.error('❌ Vector search also failed:', vectorError)
        }
      }

      // Apply additional sorting if needed
      results = this.sortProducts(results, sortBy)

      // Calculate pagination
      const total = results.length
      const totalPages = Math.ceil(total / pagination.limit)
      const offset = (pagination.page - 1) * pagination.limit
      const paginatedResults = results.slice(offset, offset + pagination.limit)

      const response: SearchResponse = {
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

      // Cache the result
      searchCache.set(cacheKey, response)

      return response
    } catch (error) {
      console.error('All search methods failed, falling back to mock search:', error)

      // Final fallback to mock search
      return this.searchProductsWithMock(searchRequest)
    }
  }

  private async searchProductsWithMock(searchRequest: SearchRequest): Promise<SearchResponse> {
    const {
      query,
      filters,
      pagination = { page: 1, limit: 20 },
      sortBy = 'relevance',
    } = searchRequest

    // Search products with mock data
    let results = searchMockProducts(query, 100) // Get more results for filtering/sorting

    // Apply filters
    if (filters) {
      if (filters.category) {
        results = results.filter((p) =>
          p.category?.toLowerCase().includes(filters.category!.toLowerCase()),
        )
      }

      if (filters.brand) {
        results = results.filter((p) =>
          p.brand?.toLowerCase().includes(filters.brand!.toLowerCase()),
        )
      }

      if (filters.minPrice) {
        results = results.filter((p) => p.price >= filters.minPrice!)
      }

      if (filters.maxPrice) {
        results = results.filter((p) => p.price <= filters.maxPrice!)
      }

      if (filters.rating) {
        results = results.filter((p) => (p.rating || 0) >= filters.rating!)
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
    // Check cache first
    const cachedProduct = productCache.get<EnhancedProduct>(id)
    if (cachedProduct) {
      return cachedProduct
    }

    // Try to get product from multiple sources
    let product = await this.aggregationService.getProductFromMultipleSources(id)

    // Fallback to mock data if not found
    if (!product) {
      product = mockProducts.find((p) => p.id === id) || null
    }

    // Cache the result if found
    if (product) {
      productCache.set(id, product)
    }

    return product
  }

  async getSimilarProducts(id: string, limit = 5): Promise<EnhancedProduct[]> {
    // Create cache key for similar products
    const cacheKey = `similar:${id}:${limit}`

    // Check cache first
    const cachedSimilar = similarProductsCache.get<EnhancedProduct[]>(cacheKey)
    if (cachedSimilar) {
      return cachedSimilar
    }

    const product = await this.getProduct(id)
    if (!product) return []

    let similarProducts: EnhancedProduct[] = []

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
        .filter((r) => r.productId !== id)
        .slice(0, limit)
        .map((r) => r.productId)

      const products = await this.getProductsByIds(similarProductIds)

      // Add relevance scores
      similarProducts = products.map((product, index) => ({
        ...product,
        confidence: vectorResults[index]?.score || 0,
      }))
    } catch (error) {
      console.error('Vector search failed for similar products, falling back to mock:', error)

      // Fallback to mock similar products
      similarProducts = mockProducts
        .filter(
          (p) => p.id !== id && (p.category === product.category || p.brand === product.brand),
        )
        .slice(0, limit)
    }

    // Cache the result
    similarProductsCache.set(cacheKey, similarProducts)

    return similarProducts
  }

  async getProductsByIds(ids: string[]): Promise<EnhancedProduct[]> {
    return mockProducts.filter((p) => ids.includes(p.id))
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
