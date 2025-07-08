import { type Product } from '@smartchoice-ai/shared-types'
import { OpenAI } from 'openai'

import { validateEnv } from '../utils/env'

export class EmbeddingService {
  private openai: OpenAI | null = null
  private readonly model = 'text-embedding-ada-002'
  
  private getOpenAIClient(): OpenAI {
    if (!this.openai) {
      const env = validateEnv()
      if (!env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required')
      }
      this.openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      })
    }
    return this.openai
  }
  
  async embedText(text: string): Promise<number[]> {
    const openai = this.getOpenAIClient()
    
    const response = await openai.embeddings.create({
      model: this.model,
      input: text,
    })
    
    if (!response.data[0]) {
      throw new Error('No embedding data returned from OpenAI')
    }
    
    return response.data[0].embedding
  }
  
  async embedTexts(texts: string[]): Promise<number[][]> {
    const openai = this.getOpenAIClient()
    
    const response = await openai.embeddings.create({
      model: this.model,
      input: texts,
    })
    
    return response.data.map(item => item.embedding)
  }
  
  createProductEmbeddingText(product: Product): string {
    // Combine relevant product fields for embedding
    const parts = [
      product.title,
      product.description,
      product.category,
      product.brand,
    ].filter(Boolean)
    
    return parts.join(' ')
  }
  
  async embedProduct(product: Product): Promise<{
    id: string
    embedding: number[]
    metadata: Record<string, any>
  }> {
    const text = this.createProductEmbeddingText(product)
    const embedding = await this.embedText(text)
    
    return {
      id: product.id,
      embedding,
      metadata: {
        title: product.title,
        category: product.category,
        brand: product.brand,
        price: product.price,
        rating: product.rating,
        retailer: product.retailer,
      },
    }
  }
  
  async embedProducts(products: Product[]): Promise<Array<{
    id: string
    embedding: number[]
    metadata: Record<string, any>
  }>> {
    const texts = products.map(p => this.createProductEmbeddingText(p))
    const embeddings = await this.embedTexts(texts)
    
    return products.map((product, index) => {
      if (!embeddings[index]) {
        throw new Error(`Missing embedding for product ${product.id}`)
      }
      return {
        id: product.id,
        embedding: embeddings[index],
        metadata: {
          title: product.title,
          category: product.category,
          brand: product.brand,
          price: product.price,
          rating: product.rating,
          retailer: product.retailer,
        },
      }
    })
  }
}