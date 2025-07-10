'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../lib/api'
import type { SearchResponse, SearchRequest } from '@smartchoice-ai/shared-types'

interface SearchHistory {
  id: string
  query: string
  timestamp: Date
  resultsCount: number
}

interface UseSearchOptions {
  enabled?: boolean
  staleTime?: number
  cacheTime?: number
}

export function useSearch(options: UseSearchOptions = {}) {
  const queryClient = useQueryClient()
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])

  // Simple search with caching
  const useSimpleSearch = (query: string, page = 1, limit = 20) => {
    return useQuery({
      queryKey: ['search', 'simple', query, page, limit],
      queryFn: () => api.searchSimple(query, page, limit),
      enabled: !!query && query.length > 2 && (options.enabled !== false),
      staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes
      cacheTime: options.cacheTime || 10 * 60 * 1000, // 10 minutes
      retry: 2,
      onSuccess: (data) => {
        // Add to search history
        if (data?.success && data.data?.items?.length > 0) {
          const historyItem: SearchHistory = {
            id: `search_${Date.now()}`,
            query,
            timestamp: new Date(),
            resultsCount: data.data.items.length
          }
          setSearchHistory(prev => [historyItem, ...prev.slice(0, 9)]) // Keep last 10
        }
      }
    })
  }

  // Advanced search with filters
  const useAdvancedSearch = (searchRequest: SearchRequest) => {
    return useQuery({
      queryKey: ['search', 'advanced', searchRequest],
      queryFn: () => api.searchProducts(searchRequest),
      enabled: !!searchRequest.query && searchRequest.query.length > 2 && (options.enabled !== false),
      staleTime: options.staleTime || 5 * 60 * 1000,
      cacheTime: options.cacheTime || 10 * 60 * 1000,
      retry: 2
    })
  }

  // Product details with caching
  const useProduct = (productId: string) => {
    return useQuery({
      queryKey: ['product', productId],
      queryFn: () => api.getProduct(productId),
      enabled: !!productId,
      staleTime: 15 * 60 * 1000, // 15 minutes for product details
      cacheTime: 30 * 60 * 1000, // 30 minutes
      retry: 2
    })
  }

  // Similar products with caching
  const useSimilarProducts = (productId: string, limit = 5) => {
    return useQuery({
      queryKey: ['similar', productId, limit],
      queryFn: () => api.getSimilarProducts(productId, limit),
      enabled: !!productId,
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 20 * 60 * 1000, // 20 minutes
      retry: 2
    })
  }

  // Product comparison
  const useProductComparison = (productIds: string[]) => {
    return useQuery({
      queryKey: ['compare', productIds.sort()], // Sort for consistent cache key
      queryFn: () => api.compareProducts(productIds),
      enabled: productIds.length >= 2,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2
    })
  }

  // Mutation for search with optimistic updates
  const searchMutation = useMutation({
    mutationFn: (query: string) => api.searchSimple(query),
    onMutate: async (query) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['search', 'simple', query] })

      // Snapshot previous value
      const previousSearch = queryClient.getQueryData(['search', 'simple', query])

      // Optimistically update to show loading state
      queryClient.setQueryData(['search', 'simple', query], (old: any) => ({
        ...old,
        isLoading: true
      }))

      return { previousSearch }
    },
    onError: (err, query, context) => {
      // Rollback on error
      if (context?.previousSearch) {
        queryClient.setQueryData(['search', 'simple', query], context.previousSearch)
      }
    },
    onSettled: (data, error, query) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['search', 'simple', query] })
    }
  })

  // Cache management utilities
  const clearSearchCache = () => {
    queryClient.removeQueries({ queryKey: ['search'] })
    setSearchHistory([])
  }

  const invalidateSearch = (query?: string) => {
    if (query) {
      queryClient.invalidateQueries({ queryKey: ['search', 'simple', query] })
    } else {
      queryClient.invalidateQueries({ queryKey: ['search'] })
    }
  }

  const prefetchSearch = async (query: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['search', 'simple', query],
      queryFn: () => api.searchSimple(query),
      staleTime: 5 * 60 * 1000
    })
  }

  const prefetchProduct = async (productId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['product', productId],
      queryFn: () => api.getProduct(productId),
      staleTime: 15 * 60 * 1000
    })
  }

  // Get cached search results
  const getCachedSearch = (query: string): SearchResponse | undefined => {
    return queryClient.getQueryData(['search', 'simple', query])
  }

  // Search suggestions based on history
  const getSearchSuggestions = (input: string, limit = 5): string[] => {
    if (!input || input.length < 2) return []
    
    return searchHistory
      .filter(item => 
        item.query.toLowerCase().includes(input.toLowerCase()) && 
        item.query.toLowerCase() !== input.toLowerCase()
      )
      .slice(0, limit)
      .map(item => item.query)
  }

  return {
    // Query hooks
    useSimpleSearch,
    useAdvancedSearch,
    useProduct,
    useSimilarProducts,
    useProductComparison,
    
    // Mutation
    searchMutation,
    
    // Cache management
    clearSearchCache,
    invalidateSearch,
    prefetchSearch,
    prefetchProduct,
    getCachedSearch,
    
    // Search history and suggestions
    searchHistory,
    getSearchSuggestions,
    
    // Loading states
    isSearching: searchMutation.isPending
  }
}