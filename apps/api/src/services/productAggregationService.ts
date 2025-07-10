import type { EnhancedProduct, SearchRequest } from '@smartchoice-ai/shared-types'

import { searchMockProducts } from '../data/mockProducts'

import { AmazonApiService } from './amazonApiService'
import { BestBuyApiService } from './bestBuyApiService'

export interface AggregationOptions {
  sources?: ('amazon' | 'bestbuy' | 'mock')[]
  maxResultsPerSource?: number
  enableDeduplication?: boolean
  sortBy?: 'relevance' | 'price' | 'rating' | 'deal_score'
}

export class ProductAggregationService {
  private amazonService: AmazonApiService
  private bestBuyService: BestBuyApiService

  constructor() {
    this.amazonService = new AmazonApiService()
    this.bestBuyService = new BestBuyApiService()
  }

  async aggregateSearchResults(
    searchRequest: SearchRequest,
    options: AggregationOptions = {},
  ): Promise<EnhancedProduct[]> {
    const {
      sources = ['amazon', 'bestbuy', 'mock'],
      maxResultsPerSource = 10,
      enableDeduplication = true,
      sortBy = 'relevance',
    } = options

    console.log(`🔍 Aggregating search results for: "${searchRequest.query}"`)
    console.log(`Sources: ${sources.join(', ')}`)

    const allResults: EnhancedProduct[] = []
    const searchPromises: Promise<EnhancedProduct[]>[] = []

    // Amazon search
    if (sources.includes('amazon')) {
      console.log('🔍 Starting Amazon search...')
      const amazonPromise = this.amazonService
        .searchProducts({
          keywords: searchRequest.query,
          itemCount: maxResultsPerSource,
          brand: searchRequest.filters?.brand,
          minPrice: searchRequest.filters?.minPrice,
          maxPrice: searchRequest.filters?.maxPrice,
        })
        .then((results) => {
          console.log(`📦 Amazon returned ${results.length} results`)
          return results
        })
        .catch((error) => {
          console.error('❌ Amazon search failed:', error)
          return []
        })
      searchPromises.push(amazonPromise)
    }

    // Best Buy search
    if (sources.includes('bestbuy')) {
      console.log('🔍 Starting Best Buy search...')
      const bestBuyPromise = this.bestBuyService
        .searchProducts({
          query: searchRequest.query,
          pageSize: maxResultsPerSource,
          minPrice: searchRequest.filters?.minPrice,
          maxPrice: searchRequest.filters?.maxPrice,
        })
        .then((results) => {
          console.log(`📦 Best Buy returned ${results.length} results`)
          return results
        })
        .catch((error) => {
          console.error('❌ Best Buy search failed:', error)
          return []
        })
      searchPromises.push(bestBuyPromise)
    }

    // Mock data search
    if (sources.includes('mock')) {
      console.log('🔍 Starting Mock data search...')
      const mockResults = searchMockProducts(searchRequest.query, maxResultsPerSource)
      console.log(`📦 Mock data returned ${mockResults.length} results`)
      const mockPromise = Promise.resolve(mockResults)
      searchPromises.push(mockPromise)
    }

    // Execute all searches in parallel
    const results = await Promise.all(searchPromises)

    // Flatten results
    results.forEach((sourceResults) => {
      allResults.push(...sourceResults)
    })

    console.log(`📊 Raw results: ${allResults.length} products from ${sources.length} sources`)

    // Apply filters
    let filteredResults = this.applyFilters(allResults, searchRequest.filters)
    console.log(`🔍 After filtering: ${filteredResults.length} products`)

    // Deduplicate results
    if (enableDeduplication) {
      filteredResults = this.deduplicateProducts(filteredResults)
      console.log(`🔄 After deduplication: ${filteredResults.length} products`)
    }

    // Sort results
    filteredResults = this.sortProducts(filteredResults, sortBy, searchRequest.query)
    console.log(`📈 Sorted by: ${sortBy}`)

    return filteredResults
  }

  async getProductFromMultipleSources(productId: string): Promise<EnhancedProduct | null> {
    // Determine source from product ID
    if (productId.startsWith('amazon-')) {
      const asin = productId.replace('amazon-', '')
      return this.amazonService.getProductByAsin(asin)
    }

    if (productId.startsWith('bestbuy-')) {
      const sku = productId.replace('bestbuy-', '')
      return this.bestBuyService.getProductBySku(sku)
    }

    // Fallback to mock data
    const mockProducts = searchMockProducts('', 1000)
    return mockProducts.find((p) => p.id === productId) || null
  }

  private applyFilters(
    products: EnhancedProduct[],
    filters?: SearchRequest['filters'],
  ): EnhancedProduct[] {
    if (!filters) return products

    return products.filter((product) => {
      // Category filter
      if (
        filters.category &&
        !product.category?.toLowerCase().includes(filters.category.toLowerCase())
      ) {
        return false
      }

      // Brand filter
      if (filters.brand && !product.brand?.toLowerCase().includes(filters.brand.toLowerCase())) {
        return false
      }

      // Price range filter
      if (filters.minPrice && product.price < filters.minPrice) {
        return false
      }
      if (filters.maxPrice && product.price > filters.maxPrice) {
        return false
      }

      // Rating filter
      if (filters.rating && (!product.rating || product.rating < filters.rating)) {
        return false
      }

      return true
    })
  }

  private deduplicateProducts(products: EnhancedProduct[]): EnhancedProduct[] {
    const seen = new Map<string, EnhancedProduct>()

    for (const product of products) {
      // Create a normalized key for comparison
      const normalizedTitle = this.normalizeTitle(product.title)
      const key = `${normalizedTitle}:${product.brand?.toLowerCase()}`

      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, product)
      } else {
        // Keep the product with higher confidence or better deal score
        if (
          product.confidence > existing.confidence ||
          (product.confidence === existing.confidence &&
            (product.dealScore || 0) > (existing.dealScore || 0))
        ) {
          seen.set(key, product)
        }
      }
    }

    return Array.from(seen.values())
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  private sortProducts(
    products: EnhancedProduct[],
    sortBy: string,
    query: string,
  ): EnhancedProduct[] {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price

        case 'rating':
          return (b.rating || 0) - (a.rating || 0)

        case 'deal_score':
          return (b.dealScore || 0) - (a.dealScore || 0)

        case 'relevance':
        default: {
          // Calculate relevance score based on multiple factors
          const scoreA = this.calculateRelevanceScore(a, query)
          const scoreB = this.calculateRelevanceScore(b, query)
          return scoreB - scoreA
        }
      }
    })
  }

  private calculateRelevanceScore(product: EnhancedProduct, query: string): number {
    let score = 0
    const queryLower = query.toLowerCase()
    const titleLower = product.title.toLowerCase()
    const descLower = product.description.toLowerCase()

    // Title match (highest weight)
    if (titleLower.includes(queryLower)) {
      score += 100
    }

    // Exact title match
    if (titleLower === queryLower) {
      score += 200
    }

    // Description match
    if (descLower.includes(queryLower)) {
      score += 50
    }

    // Brand match
    if (product.brand?.toLowerCase().includes(queryLower)) {
      score += 75
    }

    // Features match
    if (product.features?.some((f) => f.toLowerCase().includes(queryLower))) {
      score += 25
    }

    // Boost for confidence
    score += (product.confidence || 0) * 10

    // Boost for deal score
    score += (product.dealScore || 0) * 0.5

    // Boost for high ratings
    if (product.rating) {
      score += product.rating * 10
    }

    // Boost for availability
    if (product.availability === 'in_stock') {
      score += 20
    }

    return score
  }

  // Get aggregation statistics
  getAggregationStats(): {
    sources: string[]
    mockDataEnabled: boolean
    apiServicesConfigured: {
      amazon: boolean
      bestBuy: boolean
    }
  } {
    return {
      sources: ['amazon', 'bestbuy', 'mock'],
      mockDataEnabled: true,
      apiServicesConfigured: {
        amazon: false, // Will be true when real API is configured
        bestBuy: false, // Will be true when real API is configured
      },
    }
  }
}
