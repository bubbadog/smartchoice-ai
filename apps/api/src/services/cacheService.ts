import crypto from 'crypto'

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of cache entries
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly defaultTTL: number
  private readonly maxSize: number

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000 // 5 minutes default
    this.maxSize = options.maxSize || 1000 // 1000 entries max
  }

  // Generate a cache key from object or string
  private generateKey(input: string | object): string {
    const str = typeof input === 'string' ? input : JSON.stringify(input)
    return crypto.createHash('md5').update(str).digest('hex')
  }

  // Check if cache entry is expired
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Evict oldest entries if cache is full
  private evictIfNeeded(): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest 10% of entries
      const entriesToRemove = Math.floor(this.maxSize * 0.1)
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      
      for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
        this.cache.delete(sortedEntries[i][0])
      }
    }
  }

  // Get data from cache
  get<T>(key: string | object): T | null {
    const cacheKey = this.generateKey(key)
    const entry = this.cache.get(cacheKey)

    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey)
      return null
    }

    return entry.data as T
  }

  // Set data in cache
  set<T>(key: string | object, data: T, ttl?: number): void {
    const cacheKey = this.generateKey(key)
    const entryTTL = ttl || this.defaultTTL

    this.evictIfNeeded()

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: entryTTL,
    }

    this.cache.set(cacheKey, entry)
  }

  // Check if key exists in cache (and is not expired)
  has(key: string | object): boolean {
    return this.get(key) !== null
  }

  // Delete specific key from cache
  delete(key: string | object): boolean {
    const cacheKey = this.generateKey(key)
    return this.cache.delete(cacheKey)
  }

  // Clear all cache entries
  clear(): void {
    this.cache.clear()
  }

  // Get cache statistics
  getStats(): {
    size: number
    maxSize: number
    hitRate?: number
    memoryUsage: string
  } {
    // Clean up expired entries first
    this.cleanup()

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: `${Math.round(this.cache.size * 0.001)}KB (estimated)`,
    }
  }

  // Get cache key for debugging
  getCacheKey(input: string | object): string {
    return this.generateKey(input)
  }
}

// Create singleton instances for different cache types
export const searchCache = new CacheService({
  ttl: 10 * 60 * 1000, // 10 minutes for search results
  maxSize: 500,
})

export const productCache = new CacheService({
  ttl: 30 * 60 * 1000, // 30 minutes for individual products
  maxSize: 1000,
})

export const similarProductsCache = new CacheService({
  ttl: 20 * 60 * 1000, // 20 minutes for similar products
  maxSize: 300,
})