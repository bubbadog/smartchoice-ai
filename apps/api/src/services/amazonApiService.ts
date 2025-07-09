import crypto from 'crypto'
import type { EnhancedProduct } from '@smartchoice-ai/shared-types'

import { validateEnv } from '../utils/env'

export interface AmazonProductSearchRequest {
  keywords: string
  searchIndex?: string
  itemCount?: number
  itemPage?: number
  brand?: string
  browseNode?: string
  minPrice?: number
  maxPrice?: number
}

export interface AmazonProduct {
  asin: string
  title: string
  url: string
  price?: {
    amount: number
    currency: string
    displayAmount: string
  }
  images?: {
    primary: {
      small: string
      medium: string
      large: string
    }
  }
  brand?: string
  rating?: number
  reviewCount?: number
  availability?: string
  features?: string[]
  description?: string
}

export class AmazonApiService {
  private readonly accessKey: string
  private readonly secretKey: string
  private readonly partnerTag: string
  private readonly host = 'webservices.amazon.com'
  private readonly region = 'us-east-1'
  private readonly service = 'ProductAdvertisingAPI'

  constructor() {
    const env = validateEnv()
    
    // For now, we'll use mock data if credentials aren't available
    this.accessKey = env.AMAZON_ACCESS_KEY || 'mock-access-key'
    this.secretKey = env.AMAZON_SECRET_KEY || 'mock-secret-key'  
    this.partnerTag = env.AMAZON_PARTNER_TAG || 'mock-partner-tag'
  }

  // Check if real Amazon API is configured
  private isRealApiConfigured(): boolean {
    return this.accessKey !== 'mock-access-key' && 
           this.secretKey !== 'mock-secret-key' && 
           this.partnerTag !== 'mock-partner-tag'
  }

  // Generate Amazon API signature
  private generateSignature(stringToSign: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('base64')
  }

  // Create canonical request for Amazon API
  private createCanonicalRequest(method: string, path: string, queryString: string, headers: Record<string, string>, payload: string): string {
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}\n`)
      .join('')
    
    const signedHeaders = Object.keys(headers)
      .sort()
      .map(key => key.toLowerCase())
      .join(';')

    const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex')

    return [
      method,
      path,
      queryString,
      canonicalHeaders,
      signedHeaders,
      hashedPayload
    ].join('\n')
  }

  // Search for products on Amazon
  async searchProducts(request: AmazonProductSearchRequest): Promise<EnhancedProduct[]> {
    if (!this.isRealApiConfigured()) {
      console.log('Amazon API not configured, returning mock data')
      return this.getMockAmazonProducts(request.keywords)
    }

    try {
      // In a real implementation, this would make the actual Amazon API call
      // For now, return mock data that simulates Amazon product structure
      console.log(`Searching Amazon for: ${request.keywords}`)
      return this.getMockAmazonProducts(request.keywords)
    } catch (error) {
      console.error('Amazon API search failed:', error)
      return []
    }
  }

  // Get product details by ASIN
  async getProductByAsin(asin: string): Promise<EnhancedProduct | null> {
    if (!this.isRealApiConfigured()) {
      console.log('Amazon API not configured, returning mock data')
      return this.getMockProductByAsin(asin)
    }

    try {
      // In a real implementation, this would fetch from Amazon API
      console.log(`Fetching Amazon product: ${asin}`)
      return this.getMockProductByAsin(asin)
    } catch (error) {
      console.error('Amazon API product fetch failed:', error)
      return null
    }
  }

  // Convert Amazon product to our internal format
  private convertToEnhancedProduct(amazonProduct: AmazonProduct): EnhancedProduct {
    return {
      id: `amazon-${amazonProduct.asin}`,
      title: amazonProduct.title,
      description: amazonProduct.description || '',
      price: amazonProduct.price?.amount || 0,
      currency: amazonProduct.price?.currency || 'USD',
      availability: this.mapAvailability(amazonProduct.availability),
      retailer: 'Amazon',
      retailerUrl: amazonProduct.url,
      confidence: 0.9, // High confidence for Amazon API data
      dealScore: this.calculateDealScore(amazonProduct),
      category: this.inferCategory(amazonProduct.title, amazonProduct.features),
      brand: amazonProduct.brand || 'Unknown',
      rating: amazonProduct.rating,
      reviewCount: amazonProduct.reviewCount,
      imageUrl: amazonProduct.images?.primary?.large || '',
      pros: this.extractPros(amazonProduct.features),
      cons: [], // Would need review analysis for cons
      features: amazonProduct.features || [],
      lastUpdated: new Date().toISOString(),
    }
  }

  // Mock Amazon products for testing/development
  private getMockAmazonProducts(keywords: string): EnhancedProduct[] {
    const mockProducts: EnhancedProduct[] = [
      {
        id: 'amazon-B08N5WRWNW',
        title: `Echo Dot (4th Gen) Smart Speaker with Alexa - ${keywords.includes('speaker') ? 'Perfect Match' : 'Related Item'}`,
        description: 'Smart speaker with Alexa and improved sound',
        price: 49.99,
        currency: 'USD',
        availability: 'in_stock',
        retailer: 'Amazon',
        retailerUrl: 'https://amazon.com/dp/B08N5WRWNW',
        confidence: 0.95,
        dealScore: 85,
        category: 'Electronics',
        brand: 'Amazon',
        rating: 4.7,
        reviewCount: 234567,
        imageUrl: 'https://m.media-amazon.com/images/I/714Rdc+96aL._AC_SL1500_.jpg',
        pros: ['Great sound quality', 'Easy setup', 'Alexa integration'],
        cons: ['No battery', 'Basic features'],
        features: ['Voice control', 'Smart home hub', 'Music streaming'],
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'amazon-B09B8V8KNW',
        title: `Fire TV Stick 4K Max - ${keywords.includes('tv') || keywords.includes('streaming') ? 'Exact Match' : 'Suggested'}`,
        description: 'Streaming device with 4K Ultra HD and Alexa Voice Remote',
        price: 54.99,
        currency: 'USD',
        availability: 'in_stock',
        retailer: 'Amazon',
        retailerUrl: 'https://amazon.com/dp/B09B8V8KNW',
        confidence: 0.92,
        dealScore: 78,
        category: 'Electronics',
        brand: 'Amazon',
        rating: 4.5,
        reviewCount: 89234,
        imageUrl: 'https://m.media-amazon.com/images/I/51TjJOTfslL._AC_SL1000_.jpg',
        pros: ['4K streaming', 'Fast performance', 'Alexa remote'],
        cons: ['Requires good WiFi', 'Learning curve'],
        features: ['4K Ultra HD', 'Dolby Vision', 'Alexa Voice Remote'],
        lastUpdated: new Date().toISOString(),
      }
    ]

    // Filter based on keywords
    return mockProducts.filter(product => 
      product.title.toLowerCase().includes(keywords.toLowerCase()) ||
      product.description.toLowerCase().includes(keywords.toLowerCase()) ||
      product.features?.some(feature => 
        feature.toLowerCase().includes(keywords.toLowerCase())
      )
    )
  }

  private getMockProductByAsin(asin: string): EnhancedProduct | null {
    const mockProducts = this.getMockAmazonProducts('')
    return mockProducts.find(p => p.id.includes(asin)) || null
  }

  private mapAvailability(amazonAvailability?: string): 'in_stock' | 'out_of_stock' | 'limited' | 'preorder' {
    if (!amazonAvailability) return 'in_stock'
    
    const availability = amazonAvailability.toLowerCase()
    if (availability.includes('in stock')) return 'in_stock'
    if (availability.includes('out of stock')) return 'out_of_stock'
    if (availability.includes('limited')) return 'limited'
    if (availability.includes('preorder')) return 'preorder'
    
    return 'in_stock'
  }

  private calculateDealScore(product: AmazonProduct): number {
    // Simple deal score calculation based on rating and availability
    let score = 50 // Base score
    
    if (product.rating) {
      score += (product.rating - 3) * 20 // Boost for high ratings
    }
    
    if (product.reviewCount && product.reviewCount > 1000) {
      score += 10 // Boost for popular items
    }
    
    return Math.min(Math.max(score, 0), 100)
  }

  private inferCategory(title: string, features?: string[]): string {
    const text = `${title} ${features?.join(' ') || ''}`.toLowerCase()
    
    if (text.includes('laptop') || text.includes('computer')) return 'Computers'
    if (text.includes('phone') || text.includes('smartphone')) return 'Electronics'
    if (text.includes('headphone') || text.includes('speaker') || text.includes('audio')) return 'Audio'
    if (text.includes('tv') || text.includes('television') || text.includes('streaming')) return 'Electronics'
    if (text.includes('book')) return 'Books'
    if (text.includes('clothing') || text.includes('shirt') || text.includes('pants')) return 'Clothing'
    
    return 'General'
  }

  private extractPros(features?: string[]): string[] {
    if (!features) return []
    
    // Extract positive-sounding features as pros
    return features
      .filter(feature => 
        feature.toLowerCase().includes('easy') ||
        feature.toLowerCase().includes('fast') ||
        feature.toLowerCase().includes('high quality') ||
        feature.toLowerCase().includes('durable')
      )
      .slice(0, 3) // Limit to 3 pros
  }
}