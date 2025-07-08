import { type RecordMetadata } from '@pinecone-database/pinecone'
import { type Product, type SearchRequest } from '@smartchoice-ai/shared-types'

import { initializePineconeIndex, PINECONE_NAMESPACE } from '../config/pinecone'

import { EmbeddingService } from './embeddingService'

export interface VectorSearchResult {
  productId: string
  score: number
  metadata: RecordMetadata
}

export class VectorSearchService {
  private embeddingService: EmbeddingService
  
  constructor() {
    this.embeddingService = new EmbeddingService()
  }
  
  async indexProducts(products: Product[]): Promise<void> {
    const index = await initializePineconeIndex()
    const embeddings = await this.embeddingService.embedProducts(products)
    
    // Batch upsert to Pinecone
    const batchSize = 100
    for (let i = 0; i < embeddings.length; i += batchSize) {
      const batch = embeddings.slice(i, i + batchSize)
      
      await index.namespace(PINECONE_NAMESPACE).upsert(
        batch.map(item => ({
          id: item.id,
          values: item.embedding,
          metadata: item.metadata,
        }))
      )
    }
  }
  
  async searchProducts(
    query: string,
    topK: number = 20,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    const index = await initializePineconeIndex()
    
    // Embed the search query
    const queryEmbedding = await this.embeddingService.embedText(query)
    
    // Search in Pinecone
    const searchResults = await index.namespace(PINECONE_NAMESPACE).query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: filters,
    })
    
    return searchResults.matches?.map(match => ({
      productId: match.id,
      score: match.score || 0,
      metadata: match.metadata || {},
    })) || []
  }
  
  async hybridSearch(
    searchRequest: SearchRequest
  ): Promise<VectorSearchResult[]> {
    // Perform semantic search
    const semanticResults = await this.searchProducts(
      searchRequest.query,
      searchRequest.pagination?.limit || 20,
      this.buildFilters(searchRequest)
    )
    
    // For now, return semantic results
    // TODO: Implement hybrid search with keyword matching
    return semanticResults
  }
  
  private buildFilters(searchRequest: SearchRequest): Record<string, any> | undefined {
    const filters: Record<string, any> = {}
    
    if (searchRequest.filters?.category) {
      filters.category = searchRequest.filters.category
    }
    
    if (searchRequest.filters?.brand) {
      filters.brand = searchRequest.filters.brand
    }
    
    if (searchRequest.filters?.minPrice !== undefined || searchRequest.filters?.maxPrice !== undefined) {
      filters.price = {}
      if (searchRequest.filters.minPrice !== undefined) {
        filters.price.$gte = searchRequest.filters.minPrice
      }
      if (searchRequest.filters.maxPrice !== undefined) {
        filters.price.$lte = searchRequest.filters.maxPrice
      }
    }
    
    if (searchRequest.filters?.rating !== undefined) {
      filters.rating = { $gte: searchRequest.filters.rating }
    }
    
    return Object.keys(filters).length > 0 ? filters : undefined
  }
  
  async deleteProduct(productId: string): Promise<void> {
    const index = await initializePineconeIndex()
    await index.namespace(PINECONE_NAMESPACE).deleteOne(productId)
  }
  
  async deleteAllProducts(): Promise<void> {
    const index = await initializePineconeIndex()
    await index.namespace(PINECONE_NAMESPACE).deleteAll()
  }
}