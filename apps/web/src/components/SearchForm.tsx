'use client'

import { useState } from 'react'

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface SearchFormProps {
  onSearch: (query: string) => void
  loading?: boolean
}

export function SearchForm({ onSearch, loading = false }: SearchFormProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you looking for? (e.g., 'laptop for programming')"
          className="input pl-10 pr-4 py-3 text-lg w-full"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute inset-y-0 right-0 px-6 py-3 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Searching...
            </div>
          ) : (
            'Search'
          )}
        </button>
      </div>
      
      {/* Quick suggestions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-sm text-gray-600">Try:</span>
        {['laptop', 'headphones', 'smartphone', 'tablet'].map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuery(suggestion)
              onSearch(suggestion)
            }}
            className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            disabled={loading}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </form>
  )
}