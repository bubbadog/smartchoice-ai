import { type Tool } from '@modelcontextprotocol/sdk/types.js'
import { type Product, type SearchRequest } from '@smartchoice-ai/shared-types'

import { SearchService } from '../../services/searchService'
import { VectorSearchService } from '../../services/vectorSearchService'
import { MCPServer } from '../base/MCPServer'


interface SearchProductsArgs {
  query: string
  limit?: number
  filters?: {
    categories?: string[]
    brands?: string[]
    minPrice?: number
    maxPrice?: number
    minRating?: number
  }
}

interface IndexProductArgs {
  product: Product
}

interface BatchIndexProductsArgs {
  products: Product[]
}

export class ProductSearchMCPServer extends MCPServer {
  private vectorSearchService: VectorSearchService
  private searchService: SearchService
  
  constructor() {
    super({
      name: 'smartchoice-product-search',
      version: '1.0.0',
      description: 'AI-powered product search with semantic understanding',
    })
    
    this.vectorSearchService = new VectorSearchService()
    this.searchService = new SearchService()
  }
  
  protected getTools(): Tool[] {
    return [
      {
        name: 'search_products',
        description: 'Search for products using natural language queries with semantic understanding',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 20,
            },
            filters: {
              type: 'object',
              properties: {
                categories: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by product categories',
                },
                brands: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by brands',
                },
                minPrice: {
                  type: 'number',
                  description: 'Minimum price filter',
                },
                maxPrice: {
                  type: 'number',
                  description: 'Maximum price filter',
                },
                minRating: {
                  type: 'number',
                  description: 'Minimum rating filter (0-5)',
                },
              },
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'index_product',
        description: 'Index a single product for vector search',
        inputSchema: {
          type: 'object',
          properties: {
            product: {
              type: 'object',
              description: 'Product object to index',
              required: ['id', 'name', 'description', 'category', 'price'],
            },
          },
          required: ['product'],
        },
      },
      {
        name: 'batch_index_products',
        description: 'Index multiple products for vector search',
        inputSchema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'name', 'description', 'category', 'price'],
              },
              description: 'Array of products to index',
            },
          },
          required: ['products'],
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
        case 'search_products':
          return await this.handleSearchProducts(args as unknown as SearchProductsArgs)
        
        case 'index_product':
          return await this.handleIndexProduct(args as unknown as IndexProductArgs)
        
        case 'batch_index_products':
          return await this.handleBatchIndexProducts(args as unknown as BatchIndexProductsArgs)
        
        default:
          throw new Error(`Unknown tool: ${toolName}`)
      }
    } catch (error) {
      return {
        content: [this.createErrorContent(error as Error)],
      }
    }
  }
  
  private async handleSearchProducts(args: SearchProductsArgs) {
    this.validateArgs(args as unknown as Record<string, unknown>, ['query'])
    
    // Build search request
    const searchRequest: SearchRequest = {
      query: args.query,
      pagination: {
        page: 1,
        limit: args.limit || 20,
      },
      filters: args.filters ? {
        category: args.filters.categories?.[0],
        brand: args.filters.brands?.[0],
        minPrice: args.filters.minPrice,
        maxPrice: args.filters.maxPrice,
        rating: args.filters.minRating,
      } : undefined,
      sortBy: 'relevance',
    }
    
    // Perform hybrid search
    const results = await this.vectorSearchService.hybridSearch(searchRequest)
    
    // Get full product details
    const products = await this.searchService.getProductsByIds(
      results.map(r => r.productId)
    )
    
    // Format results
    const formattedResults = products.map((product, index) => ({
      ...product,
      relevanceScore: results[index]?.score || 0,
    }))
    
    return {
      content: [
        this.createTextContent(JSON.stringify({
          success: true,
          count: formattedResults.length,
          products: formattedResults,
        }, null, 2)),
      ],
    }
  }
  
  private async handleIndexProduct(args: IndexProductArgs) {
    this.validateArgs(args as unknown as Record<string, unknown>, ['product'])
    
    await this.vectorSearchService.indexProducts([args.product])
    
    return {
      content: [
        this.createTextContent(JSON.stringify({
          success: true,
          message: `Product ${args.product.id} indexed successfully`,
        })),
      ],
    }
  }
  
  private async handleBatchIndexProducts(args: BatchIndexProductsArgs) {
    this.validateArgs(args as unknown as Record<string, unknown>, ['products'])
    
    await this.vectorSearchService.indexProducts(args.products)
    
    return {
      content: [
        this.createTextContent(JSON.stringify({
          success: true,
          message: `${args.products.length} products indexed successfully`,
        })),
      ],
    }
  }
}