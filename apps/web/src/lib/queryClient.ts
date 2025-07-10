import { QueryClient } from '@tanstack/react-query'

// Default query options
const defaultQueryOptions = {
  // Stale time - how long until data is considered stale
  staleTime: 5 * 60 * 1000, // 5 minutes
  
  // Cache time - how long unused data stays in cache
  cacheTime: 10 * 60 * 1000, // 10 minutes
  
  // Retry configuration
  retry: (failureCount: number, error: any) => {
    // Don't retry on 4xx errors (client errors)
    if (error?.status >= 400 && error?.status < 500) {
      return false
    }
    
    // Retry up to 3 times for other errors
    return failureCount < 3
  },
  
  // Retry delay with exponential backoff
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  
  // Background refetch configuration
  refetchOnWindowFocus: false, // Don't refetch on window focus (can be annoying)
  refetchOnReconnect: true,     // Refetch when reconnecting to internet
  refetchOnMount: true,         // Refetch when component mounts
}

// Default mutation options
const defaultMutationOptions = {
  retry: (failureCount: number, error: any) => {
    // Don't retry mutations on client errors
    if (error?.status >= 400 && error?.status < 500) {
      return false
    }
    
    // Retry once for server errors
    return failureCount < 1
  },
  
  retryDelay: 1000, // 1 second delay for mutation retries
}

// Create query client with optimized settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: defaultQueryOptions,
    mutations: defaultMutationOptions,
  },
})

// Query keys factory for consistent key management
export const queryKeys = {
  // Search-related queries
  search: {
    all: ['search'] as const,
    simple: (query: string, page?: number, limit?: number) => 
      ['search', 'simple', query, page, limit] as const,
    advanced: (searchRequest: any) => 
      ['search', 'advanced', searchRequest] as const,
  },
  
  // Product-related queries
  product: {
    all: ['product'] as const,
    detail: (id: string) => ['product', id] as const,
    similar: (id: string, limit?: number) => ['similar', id, limit] as const,
    compare: (ids: string[]) => ['compare', ids.sort()] as const,
  },
  
  // User-related queries
  user: {
    all: ['user'] as const,
    profile: () => ['user', 'profile'] as const,
    preferences: () => ['user', 'preferences'] as const,
    history: (page?: number) => ['user', 'history', page] as const,
  },
  
  // Analytics and tracking
  analytics: {
    all: ['analytics'] as const,
    events: (type?: string) => ['analytics', 'events', type] as const,
  }
}

// Cache invalidation helpers
export const cacheInvalidation = {
  // Invalidate all search results
  invalidateAllSearches: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.search.all })
  },
  
  // Invalidate specific search
  invalidateSearch: (query: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.search.simple(query) })
  },
  
  // Invalidate product data
  invalidateProduct: (id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.product.detail(id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.product.similar(id) })
  },
  
  // Invalidate user data
  invalidateUser: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user.all })
  },
  
  // Clear all cache
  clearAll: () => {
    queryClient.clear()
  }
}

// Prefetch helpers
export const prefetchHelpers = {
  // Prefetch popular searches
  prefetchPopularSearches: async (queries: string[]) => {
    const prefetchPromises = queries.map(query =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.search.simple(query),
        queryFn: async () => {
          const { api } = await import('./api')
          return api.searchSimple(query)
        },
        staleTime: 10 * 60 * 1000, // 10 minutes for popular searches
      })
    )
    
    await Promise.allSettled(prefetchPromises)
  },
  
  // Prefetch product details
  prefetchProduct: async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.product.detail(id),
      queryFn: async () => {
        const { api } = await import('./api')
        return api.getProduct(id)
      },
      staleTime: 15 * 60 * 1000, // 15 minutes for product details
    })
  },
  
  // Prefetch similar products
  prefetchSimilarProducts: async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.product.similar(id),
      queryFn: async () => {
        const { api } = await import('./api')
        return api.getSimilarProducts(id)
      },
      staleTime: 10 * 60 * 1000,
    })
  }
}

// Cache optimization utilities
export const cacheOptimization = {
  // Remove old cache entries to free memory
  cleanupOldCache: () => {
    queryClient.getQueryCache().getAll().forEach(query => {
      const { queryKey, state } = query
      const lastUpdated = state.dataUpdatedAt
      const isOld = Date.now() - lastUpdated > 30 * 60 * 1000 // 30 minutes
      
      if (isOld && !state.isFetching) {
        queryClient.removeQueries({ queryKey })
      }
    })
  },
  
  // Get cache statistics
  getCacheStats: () => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.getObserversCount() > 0).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      cacheSize: queries.reduce((acc, q) => {
        const data = q.state.data
        return acc + (data ? JSON.stringify(data).length : 0)
      }, 0),
      oldestQuery: queries.reduce((oldest, q) => {
        return q.state.dataUpdatedAt < oldest ? q.state.dataUpdatedAt : oldest
      }, Date.now())
    }
  }
}

// Error boundary for React Query
export class QueryErrorBoundary extends Error {
  constructor(message: string, public queryKey: any, public originalError: any) {
    super(message)
    this.name = 'QueryErrorBoundary'
  }
}