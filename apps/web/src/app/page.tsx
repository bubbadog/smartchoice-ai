'use client'

import { useState } from 'react'

import type { SearchResponse } from '@smartchoice-ai/shared-types'

import { SearchForm } from '../components/SearchForm'
import { SearchResults } from '../components/SearchResults'
import { api, ApiError } from '../lib/api'

export default function Home() {
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (query: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const results = await api.searchSimple(query)
      setSearchResults(results)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Search failed: ${err.message}`)
      } else {
        setError('Unable to connect to search service. Please make sure the API server is running.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleProductClick = (productId: string) => {
    // TODO: Navigate to product detail page
    alert(`Product ${productId} clicked - TODO: Add product detail page`)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              SmartChoice AI
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              AI-powered shopping assistant that eliminates decision fatigue
            </p>
            
            <SearchForm onSearch={handleSearch} loading={loading} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-800">
                <h3 className="font-medium">Error</h3>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="flex justify-center">
          <SearchResults
            results={searchResults}
            loading={loading}
            onProductClick={handleProductClick}
          />
        </div>

        {/* Welcome Message - shown when no search has been performed */}
        {!searchResults && !loading && !error && (
          <div className="text-center py-16">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Find Your Perfect Product
              </h2>
              <p className="text-gray-600 mb-8">
                Use natural language to describe what you&apos;re looking for. Our AI will find the best products, 
                analyze reviews, and help you make the smartest choice.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="p-6 bg-white rounded-lg shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-2">Smart Search</h3>
                  <p className="text-gray-600 text-sm">
                    Describe what you need in plain English and get relevant results.
                  </p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-2">AI Analysis</h3>
                  <p className="text-gray-600 text-sm">
                    Get insights on pricing, reviews, and deal quality powered by AI.
                  </p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-2">Best Deals</h3>
                  <p className="text-gray-600 text-sm">
                    Find the best prices and know when you&apos;re getting a great deal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
