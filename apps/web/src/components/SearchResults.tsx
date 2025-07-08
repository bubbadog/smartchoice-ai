import type { SearchResponse } from '@smartchoice-ai/shared-types'

import { ProductCard } from './ProductCard'

interface SearchResultsProps {
  results: SearchResponse | null
  loading: boolean
  onProductClick?: (productId: string) => void
}

export function SearchResults({ results, loading, onProductClick }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-gray-200 rounded-md mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-6 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!results) {
    return null
  }

  if (!results.success || !results.data) {
    return (
      <div className="w-full max-w-6xl text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-2">
          Oops! Something went wrong
        </div>
        <p className="text-gray-600">
          {results.error || 'Unable to fetch search results. Please try again.'}
        </p>
      </div>
    )
  }

  const { items, pagination } = results.data

  if (items.length === 0) {
    return (
      <div className="w-full max-w-6xl text-center py-12">
        <div className="text-gray-600 text-lg font-medium mb-2">
          No products found
        </div>
        <p className="text-gray-500">
          Try adjusting your search terms or browse our suggestions above.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl">
      {/* Results Summary */}
      <div className="mb-6 flex items-center justify-between">
        <div className="text-gray-600">
          Showing {items.length} of {pagination.total} results
          {pagination.page > 1 && ` (page ${pagination.page} of ${pagination.totalPages})`}
        </div>
        
        {/* Sort Options - TODO: Implement sorting */}
        <div className="text-sm text-gray-500">
          Sorted by relevance
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {items.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => onProductClick?.(product.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4">
          <button
            disabled={!pagination.hasPrev}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          
          <button
            disabled={!pagination.hasNext}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}