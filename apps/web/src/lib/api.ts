import type { SearchRequest, SearchResponse, EnhancedProduct } from '@smartchoice-ai/shared-types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(
      data.error || 'An error occurred',
      response.status,
      data.code
    )
  }

  return data
}

export const api = {
  // Health check
  health: async () => {
    return apiRequest('/health')
  },

  // Search products
  searchProducts: async (searchRequest: SearchRequest): Promise<SearchResponse> => {
    return apiRequest('/api/v1/search', {
      method: 'POST',
      body: JSON.stringify(searchRequest),
    })
  },

  // Simple search with query string
  searchSimple: async (query: string, page = 1, limit = 20): Promise<SearchResponse> => {
    return apiRequest(`/api/v1/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`)
  },

  // Get product details
  getProduct: async (id: string): Promise<{ success: boolean; data: EnhancedProduct }> => {
    return apiRequest(`/api/v1/products/${id}`)
  },

  // Get similar products
  getSimilarProducts: async (id: string, limit = 5): Promise<{ success: boolean; data: { items: EnhancedProduct[] } }> => {
    return apiRequest(`/api/v1/products/${id}/similar?limit=${limit}`)
  },

  // Compare products
  compareProducts: async (productIds: string[]): Promise<{ success: boolean; data: any }> => {
    return apiRequest('/api/v1/products/compare', {
      method: 'POST',
      body: JSON.stringify({ productIds }),
    })
  },
}

export { ApiError }