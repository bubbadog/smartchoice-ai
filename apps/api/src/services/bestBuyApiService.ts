import type { EnhancedProduct } from '@smartchoice-ai/shared-types'

import { validateEnv } from '../utils/env'

export interface BestBuyProductSearchRequest {
  query: string
  categoryId?: string
  pageSize?: number
  page?: number
  sort?: string
  minPrice?: number
  maxPrice?: number
}

export interface BestBuyProduct {
  sku: number
  name: string
  url: string
  salePrice?: number
  regularPrice?: number
  onSale: boolean
  image?: string
  largeFrontImage?: string
  brand?: string
  customerReviewAverage?: number
  customerReviewCount?: number
  inStoreAvailability?: boolean
  onlineAvailability?: boolean
  shortDescription?: string
  longDescription?: string
  features?: Array<{ feature: string }>
  categoryPath?: Array<{ name: string }>
}

export class BestBuyApiService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.bestbuy.com/v1'

  constructor() {
    const env = validateEnv()
    
    // For now, we'll use mock data if API key isn't available
    this.apiKey = env.BESTBUY_API_KEY || 'mock-bestbuy-key'
  }

  // Check if real Best Buy API is configured
  private isRealApiConfigured(): boolean {
    return this.apiKey !== 'mock-bestbuy-key'
  }

  // Search for products on Best Buy
  async searchProducts(request: BestBuyProductSearchRequest): Promise<EnhancedProduct[]> {
    if (!this.isRealApiConfigured()) {
      // console.log('Best Buy API not configured, returning mock data')
      return this.getMockBestBuyProducts(request.query)
    }

    try {
      // Build query parameters
      const params = new URLSearchParams({
        apikey: this.apiKey,
        format: 'json',
        show: 'sku,name,url,salePrice,regularPrice,onSale,image,largeFrontImage,brand,customerReviewAverage,customerReviewCount,inStoreAvailability,onlineAvailability,shortDescription,longDescription,features,categoryPath'
      })

      if (request.pageSize) params.append('pageSize', request.pageSize.toString())
      if (request.page) params.append('page', request.page.toString())
      if (request.sort) params.append('sort', request.sort)

      // Build search query
      let searchQuery = `search=${encodeURIComponent(request.query)}`
      
      if (request.minPrice) {
        searchQuery += `&salePrice>=${request.minPrice}`
      }
      if (request.maxPrice) {
        searchQuery += `&salePrice<=${request.maxPrice}`
      }
      if (request.categoryId) {
        searchQuery += `&categoryPath.id=${request.categoryId}`
      }

      const _url = `${this.baseUrl}/products(${searchQuery})?${params.toString()}`

      // console.log(`Searching Best Buy API: ${_url}`)
      
      // In a real implementation, make the actual API call here
      // const response = await fetch(_url)
      // const data = await response.json()
      // return data.products.map(this.convertToEnhancedProduct.bind(this))

      // For now, return mock data
      return this.getMockBestBuyProducts(request.query)
    } catch (error) {
      console.error('Best Buy API search failed:', error)
      return []
    }
  }

  // Get product details by SKU
  async getProductBySku(sku: string): Promise<EnhancedProduct | null> {
    if (!this.isRealApiConfigured()) {
      // console.log('Best Buy API not configured, returning mock data')
      return this.getMockProductBySku(sku)
    }

    try {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        format: 'json'
      })

      const _url = `${this.baseUrl}/products/${sku}?${params.toString()}`
      
      // console.log(`Fetching Best Buy product: ${sku}`)
      
      // In a real implementation, make the actual API call here
      // const response = await fetch(url)
      // const data = await response.json()
      // return this.convertToEnhancedProduct(data)

      // For now, return mock data
      return this.getMockProductBySku(sku)
    } catch (error) {
      console.error('Best Buy API product fetch failed:', error)
      return null
    }
  }

  // Convert Best Buy product to our internal format
  private convertToEnhancedProduct(bestBuyProduct: BestBuyProduct): EnhancedProduct {
    const price = bestBuyProduct.salePrice || bestBuyProduct.regularPrice || 0
    const isOnSale = bestBuyProduct.onSale && 
                     bestBuyProduct.salePrice && 
                     bestBuyProduct.regularPrice && 
                     bestBuyProduct.salePrice < bestBuyProduct.regularPrice

    return {
      id: `bestbuy-${bestBuyProduct.sku}`,
      title: bestBuyProduct.name,
      description: bestBuyProduct.shortDescription || bestBuyProduct.longDescription || '',
      price,
      currency: 'USD',
      availability: this.mapAvailability(bestBuyProduct),
      retailer: 'Best Buy',
      retailerUrl: bestBuyProduct.url,
      confidence: 0.88, // High confidence for Best Buy API data
      dealScore: this.calculateDealScore(bestBuyProduct),
      category: this.inferCategory(bestBuyProduct),
      brand: bestBuyProduct.brand || 'Unknown',
      rating: bestBuyProduct.customerReviewAverage,
      reviewCount: bestBuyProduct.customerReviewCount,
      imageUrl: bestBuyProduct.largeFrontImage || bestBuyProduct.image || '',
      pros: this.extractPros(bestBuyProduct),
      cons: isOnSale ? [] : ['Not currently on sale'], // Simple con detection
      features: bestBuyProduct.features?.map(f => f.feature) || [],
      lastUpdated: new Date().toISOString(),
    }
  }

  // Mock Best Buy products for testing/development
  private getMockBestBuyProducts(query: string): EnhancedProduct[] {
    const mockProducts: EnhancedProduct[] = [
      {
        id: 'bestbuy-6418599',
        title: `MacBook Air 13.3" Laptop - Apple M1 chip - ${query.includes('laptop') || query.includes('macbook') ? 'Perfect Match' : 'Related'}`,
        description: 'MacBook Air laptop with Apple M1 chip, 13.3" display, 8GB memory, 256GB SSD',
        price: 999.99,
        currency: 'USD',
        availability: 'in_stock',
        retailer: 'Best Buy',
        retailerUrl: 'https://www.bestbuy.com/site/macbook-air/6418599.p',
        confidence: 0.93,
        dealScore: 82,
        category: 'Computers',
        brand: 'Apple',
        rating: 4.8,
        reviewCount: 5678,
        imageUrl: 'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6418/6418599_sd.jpg',
        pros: ['Fast M1 chip', 'Long battery life', 'Lightweight design'],
        cons: ['Limited ports', 'No Touch Bar'],
        features: ['Apple M1 chip', '8GB unified memory', '256GB SSD storage', 'Retina display'],
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'bestbuy-6515398',
        title: `Sony WH-1000XM5 Wireless Noise Canceling Headphones - ${query.includes('headphones') || query.includes('sony') ? 'Exact Match' : 'Suggested'}`,
        description: 'Premium wireless noise canceling headphones with industry-leading technology',
        price: 399.99,
        currency: 'USD',
        availability: 'in_stock',
        retailer: 'Best Buy',
        retailerUrl: 'https://www.bestbuy.com/site/sony-wh-1000xm5/6515398.p',
        confidence: 0.91,
        dealScore: 88,
        category: 'Audio',
        brand: 'Sony',
        rating: 4.6,
        reviewCount: 2345,
        imageUrl: 'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6515/6515398_sd.jpg',
        pros: ['Excellent noise cancellation', 'Premium sound quality', 'Comfortable fit'],
        cons: ['Expensive', 'No wireless charging case'],
        features: ['Active Noise Canceling', '30-hour battery', 'Quick Charge', 'Multipoint connection'],
        lastUpdated: new Date().toISOString(),
      }
    ]

    // Filter based on query
    return mockProducts.filter(product => 
      product.title.toLowerCase().includes(query.toLowerCase()) ||
      product.description.toLowerCase().includes(query.toLowerCase()) ||
      product.brand?.toLowerCase().includes(query.toLowerCase()) ||
      product.features?.some(feature => 
        feature.toLowerCase().includes(query.toLowerCase())
      )
    )
  }

  private getMockProductBySku(sku: string): EnhancedProduct | null {
    const mockProducts = this.getMockBestBuyProducts('')
    return mockProducts.find(p => p.id.includes(sku)) || null
  }

  private mapAvailability(product: BestBuyProduct): 'in_stock' | 'out_of_stock' | 'limited' | 'preorder' {
    if (product.onlineAvailability) return 'in_stock'
    if (product.inStoreAvailability) return 'limited'
    return 'out_of_stock'
  }

  private calculateDealScore(product: BestBuyProduct): number {
    let score = 50 // Base score
    
    // Boost for sales
    if (product.onSale) {
      score += 20
    }
    
    // Boost for high ratings
    if (product.customerReviewAverage) {
      score += (product.customerReviewAverage - 3) * 15
    }
    
    // Boost for popular items
    if (product.customerReviewCount && product.customerReviewCount > 100) {
      score += 10
    }
    
    // Boost for availability
    if (product.onlineAvailability) {
      score += 10
    }
    
    return Math.min(Math.max(score, 0), 100)
  }

  private inferCategory(product: BestBuyProduct): string {
    if (product.categoryPath && product.categoryPath.length > 0) {
      const category = product.categoryPath[0].name
      return category
    }
    
    const name = product.name.toLowerCase()
    if (name.includes('laptop') || name.includes('computer')) return 'Computers'
    if (name.includes('phone') || name.includes('smartphone')) return 'Cell Phones'
    if (name.includes('headphone') || name.includes('speaker')) return 'Audio'
    if (name.includes('tv') || name.includes('television')) return 'TV & Home Theater'
    if (name.includes('gaming') || name.includes('xbox') || name.includes('playstation')) return 'Video Games'
    
    return 'Electronics'
  }

  private extractPros(product: BestBuyProduct): string[] {
    const pros: string[] = []
    
    if (product.onSale) {
      pros.push('Currently on sale')
    }
    
    if (product.customerReviewAverage && product.customerReviewAverage >= 4.5) {
      pros.push('Highly rated by customers')
    }
    
    if (product.features) {
      // Extract first few features as pros
      pros.push(...product.features.slice(0, 2).map(f => f.feature))
    }
    
    return pros.slice(0, 3) // Limit to 3 pros
  }
}