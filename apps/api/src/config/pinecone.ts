import { Pinecone } from '@pinecone-database/pinecone'

import { validateEnv } from '../utils/env'

export const PINECONE_INDEX_NAME = 'smartchoice-products'
export const PINECONE_NAMESPACE = 'products'

let pineconeClient: Pinecone | null = null

export async function getPineconeClient(): Promise<Pinecone> {
  if (!pineconeClient) {
    const env = validateEnv()
    if (!env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is required')
    }
    pineconeClient = new Pinecone({
      apiKey: env.PINECONE_API_KEY,
    })
  }
  return pineconeClient
}

export async function initializePineconeIndex() {
  const client = await getPineconeClient()
  
  // Check if index exists
  const indexes = await client.listIndexes()
  const indexExists = indexes.indexes?.some((index) => index.name === PINECONE_INDEX_NAME)
  
  if (!indexExists) {
    // Create index for product embeddings
    await client.createIndex({
      name: PINECONE_INDEX_NAME,
      dimension: 1536, // OpenAI ada-002 dimension
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    })
    
    // Wait for index to be ready
    await new Promise(resolve => setTimeout(resolve, 10000))
  }
  
  return client.index(PINECONE_INDEX_NAME)
}