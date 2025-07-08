import { type Tool } from '@modelcontextprotocol/sdk/types.js'

import { ScrapingService, type ScrapedProduct } from '../../services/scrapingService'
import { VectorSearchService } from '../../services/vectorSearchService'
import { MCPServer } from '../base/MCPServer'

interface ScrapeProductArgs {
  url: string
  autoIndex?: boolean
}

interface ScrapeMultipleArgs {
  urls: string[]
  autoIndex?: boolean
}

interface SearchSimilarProductsArgs {
  productUrl: string
  limit?: number
}

export class WebScraperMCPServer extends MCPServer {
  private scrapingService: ScrapingService
  private vectorSearchService: VectorSearchService
  
  constructor() {
    super({
      name: 'smartchoice-web-scraper',
      version: '1.0.0',
      description: 'AI-powered web scraping for product data with automatic indexing',
    })
    
    this.scrapingService = new ScrapingService()
    this.vectorSearchService = new VectorSearchService()
  }
  
  protected getTools(): Tool[] {
    return [
      {
        name: 'scrape_product',
        description: 'Scrape product data from an e-commerce URL using Jina.ai Reader API',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              description: 'The product page URL to scrape',
            },
            autoIndex: {
              type: 'boolean',
              description: 'Automatically index the scraped product for search',
              default: true,
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'scrape_multiple_products',
        description: 'Scrape multiple product pages in parallel',
        inputSchema: {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri',
              },
              description: 'Array of product URLs to scrape',
            },
            autoIndex: {
              type: 'boolean',
              description: 'Automatically index scraped products for search',
              default: true,
            },
          },
          required: ['urls'],
        },
      },
      {
        name: 'search_similar_products',
        description: 'Find similar products to a given product URL using vector search',
        inputSchema: {
          type: 'object',
          properties: {
            productUrl: {
              type: 'string',
              format: 'uri',
              description: 'Reference product URL to find similar products',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of similar products to return',
              default: 10,
            },
          },
          required: ['productUrl'],
        },
      },
    ]
  }
  
  protected async handleToolCall(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    try {
      switch (toolName) {
        case 'scrape_product':
          return await this.handleScrapeProduct(args as unknown as ScrapeProductArgs)
        
        case 'scrape_multiple_products':
          return await this.handleScrapeMultiple(args as unknown as ScrapeMultipleArgs)
        
        case 'search_similar_products':
          return await this.handleSearchSimilar(args as unknown as SearchSimilarProductsArgs)
        
        default:
          throw new Error(`Unknown tool: ${toolName}`)
      }
    } catch (error) {
      return {
        content: [this.createErrorContent(error as Error)],
      }
    }
  }
  
  private async handleScrapeProduct(args: ScrapeProductArgs) {
    this.validateArgs(args as unknown as Record<string, unknown>, ['url'])
    
    const scrapedProduct = await this.scrapingService.scrapeProductPage(args.url)
    
    // Auto-index if requested
    if (args.autoIndex !== false) {
      try {
        await this.indexScrapedProduct(scrapedProduct)
      } catch (error) {
        console.warn('Failed to auto-index product:', error)
      }
    }
    
    return {
      content: [
        this.createTextContent(JSON.stringify({
          success: true,
          product: scrapedProduct,
          indexed: args.autoIndex !== false,
          message: `Successfully scraped product: ${scrapedProduct.title}`,
        }, null, 2)),
      ],
    }
  }
  
  private async handleScrapeMultiple(args: ScrapeMultipleArgs) {
    this.validateArgs(args as unknown as Record<string, unknown>, ['urls'])
    
    if (args.urls.length === 0) {
      throw new Error('URLs array cannot be empty')
    }
    
    if (args.urls.length > 50) {
      throw new Error('Maximum 50 URLs allowed per request')
    }
    
    const scrapedProducts = await this.scrapingService.scrapeMultipleProducts(args.urls)
    
    // Auto-index if requested
    if (args.autoIndex !== false && scrapedProducts.length > 0) {
      try {
        await this.indexScrapedProducts(scrapedProducts)
      } catch (error) {
        console.warn('Failed to auto-index products:', error)
      }
    }
    
    return {
      content: [
        this.createTextContent(JSON.stringify({
          success: true,
          count: scrapedProducts.length,
          total: args.urls.length,
          products: scrapedProducts,
          indexed: args.autoIndex !== false,
          message: `Successfully scraped ${scrapedProducts.length} out of ${args.urls.length} products`,
        }, null, 2)),
      ],
    }
  }
  
  private async handleSearchSimilar(args: SearchSimilarProductsArgs) {
    this.validateArgs(args as unknown as Record<string, unknown>, ['productUrl'])
    
    // First, scrape the reference product if we don't have it
    const referenceProduct = await this.scrapingService.scrapeProductPage(args.productUrl)
    
    // Create a search query from the product
    const searchQuery = `${referenceProduct.title} ${referenceProduct.brand || ''} ${referenceProduct.category || ''}`.trim()
    
    // Search for similar products
    const similarProducts = await this.vectorSearchService.searchProducts(
      searchQuery,
      args.limit || 10
    )
    
    return {
      content: [
        this.createTextContent(JSON.stringify({
          success: true,
          referenceProduct: {
            title: referenceProduct.title,
            brand: referenceProduct.brand,
            url: referenceProduct.url,
          },
          similarProducts: similarProducts.map(result => ({
            productId: result.productId,
            score: result.score,
            metadata: result.metadata,
          })),
          count: similarProducts.length,
        }, null, 2)),
      ],
    }
  }
  
  private async indexScrapedProduct(product: ScrapedProduct): Promise<void> {
    // Convert scraped product to our Product format
    const indexableProduct = {
      id: this.generateProductId(product.url),
      title: product.title,
      description: product.description,
      price: product.price || 0,
      currency: product.currency || 'USD',
      brand: product.brand,
      category: product.category,
      rating: product.rating,
      retailer: product.retailer,
      retailerUrl: product.url,
      availability: product.availability as any || 'in_stock',
      imageUrl: product.imageUrl,
    }
    
    await this.vectorSearchService.indexProducts([indexableProduct])
  }
  
  private async indexScrapedProducts(products: ScrapedProduct[]): Promise<void> {
    const indexableProducts = products.map(product => ({
      id: this.generateProductId(product.url),
      title: product.title,
      description: product.description,
      price: product.price || 0,
      currency: product.currency || 'USD',
      brand: product.brand,
      category: product.category,
      rating: product.rating,
      retailer: product.retailer,
      retailerUrl: product.url,
      availability: product.availability as any || 'in_stock',
      imageUrl: product.imageUrl,
    }))
    
    await this.vectorSearchService.indexProducts(indexableProducts)
  }
  
  private generateProductId(url: string): string {
    // Create a deterministic ID from URL
    return Buffer.from(url).toString('base64').replace(/[/+=]/g, '').substring(0, 16)
  }
}