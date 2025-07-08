import { validateEnv } from '../utils/env'

export interface ScrapedProduct {
  url: string
  title: string
  price?: number
  currency?: string
  description?: string
  brand?: string
  category?: string
  imageUrl?: string
  rating?: number
  reviewCount?: number
  availability?: string
  retailer: string
  features?: string[]
  specifications?: Record<string, string>
}

export interface JinaReaderResponse {
  code: number
  status: number
  data: {
    title: string
    description: string
    url: string
    content: string
    usage: {
      tokens: number
    }
  }
}

export class ScrapingService {
  private readonly jinaApiUrl = 'https://r.jina.ai'
  
  async scrapeProductPage(url: string): Promise<ScrapedProduct> {
    try {
      // Use Jina Reader API to extract clean content
      const jinaResponse = await this.callJinaReader(url)
      
      // Parse the clean content to extract product data
      const productData = this.parseProductContent(url, jinaResponse.data)
      
      return productData
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error)
      throw new Error(`Scraping failed for ${url}: ${error}`)
    }
  }
  
  async scrapeMultipleProducts(urls: string[]): Promise<ScrapedProduct[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.scrapeProductPage(url))
    )
    
    return results
      .filter((result): result is PromiseFulfilledResult<ScrapedProduct> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
  }
  
  private async callJinaReader(url: string): Promise<JinaReaderResponse> {
    const env = validateEnv()
    
    const response = await fetch(`${this.jinaApiUrl}/${url}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'json',
        ...(env.JINA_API_KEY && { 'Authorization': `Bearer ${env.JINA_API_KEY}` }),
      },
    })
    
    if (!response.ok) {
      throw new Error(`Jina API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data as JinaReaderResponse
  }
  
  private parseProductContent(url: string, jinaData: JinaReaderResponse['data']): ScrapedProduct {
    const content = jinaData.content
    const title = jinaData.title
    
    // Extract retailer from URL
    const retailer = this.extractRetailer(url)
    
    // Use LLM-style parsing for product details
    const productData: ScrapedProduct = {
      url,
      title,
      retailer,
      description: jinaData.description,
    }
    
    // Extract price information
    const priceMatch = content.match(/\$?([\d,]+\.?\d*)/g)
    if (priceMatch) {
      const prices = priceMatch
        .map(p => parseFloat(p.replace(/[$,]/g, '')))
        .filter(p => !isNaN(p) && p > 0)
      
      if (prices.length > 0) {
        productData.price = Math.min(...prices) // Usually the main price is the lowest
        productData.currency = 'USD'
      }
    }
    
    // Extract rating
    const ratingMatch = content.match(/(\d\.?\d*)\s*(?:out of\s*)?5?\s*stars?/i)
    if (ratingMatch && ratingMatch[1]) {
      productData.rating = parseFloat(ratingMatch[1])
    }
    
    // Extract brand (common patterns)
    const brandPatterns = [
      /Brand:\s*([^\n]+)/i,
      /by\s+([A-Z][a-zA-Z\s&]+)(?=\s|$)/,
      /Manufacturer:\s*([^\n]+)/i,
    ]
    
    for (const pattern of brandPatterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        productData.brand = match[1].trim()
        break
      }
    }
    
    // Extract availability
    if (content.toLowerCase().includes('in stock')) {
      productData.availability = 'in_stock'
    } else if (content.toLowerCase().includes('out of stock')) {
      productData.availability = 'out_of_stock'
    }
    
    // Extract category (retailer-specific logic)
    const category = this.extractCategory(content, retailer)
    if (category) {
      productData.category = category
    }
    
    return productData
  }
  
  private extractRetailer(url: string): string {
    const hostname = new URL(url).hostname.toLowerCase()
    
    if (hostname.includes('amazon')) return 'Amazon'
    if (hostname.includes('walmart')) return 'Walmart'
    if (hostname.includes('target')) return 'Target'
    if (hostname.includes('bestbuy')) return 'Best Buy'
    if (hostname.includes('homedepot')) return 'Home Depot'
    if (hostname.includes('lowes')) return 'Lowe\'s'
    if (hostname.includes('ebay')) return 'eBay'
    if (hostname.includes('etsy')) return 'Etsy'
    
    // Fallback to domain name
    const domainParts = hostname.replace('www.', '').split('.')
    return domainParts[0] || 'Unknown'
  }
  
  private extractCategory(content: string, retailer: string): string | undefined {
    // Common category patterns
    const categoryPatterns = [
      /Category:\s*([^\n]+)/i,
      /Department:\s*([^\n]+)/i,
      /Section:\s*([^\n]+)/i,
    ]
    
    for (const pattern of categoryPatterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    
    // Retailer-specific breadcrumb patterns
    if (retailer === 'Amazon') {
      const breadcrumbMatch = content.match(/›\s*([^›\n]+)(?=\s*›|\s*$)/g)
      if (breadcrumbMatch && breadcrumbMatch.length > 0) {
        const lastBreadcrumb = breadcrumbMatch[breadcrumbMatch.length - 1]
        if (lastBreadcrumb) {
          return lastBreadcrumb.replace('›', '').trim()
        }
      }
    }
    
    return undefined
  }
  
  // Enhanced product data extraction using AI
  async enhanceProductWithAI(scrapedProduct: ScrapedProduct): Promise<ScrapedProduct> {
    // This could use OpenAI to extract more structured data
    // from the scraped content using prompts like:
    // "Extract product features, specifications, and category from this text..."
    
    return scrapedProduct // For now, return as-is
  }
}