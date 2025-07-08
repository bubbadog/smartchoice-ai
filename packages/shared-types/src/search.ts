import { z } from 'zod'

// Search Intent Classification
export const SearchIntentSchema = z.object({
  type: z.enum(['product_search', 'comparison', 'research', 'deal_hunting']),
  confidence: z.number().min(0).max(1),
  extractedEntities: z.object({
    productType: z.string().optional(),
    brand: z.string().optional(),
    priceRange: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    features: z.array(z.string()).default([]),
    urgency: z.enum(['low', 'medium', 'high']).optional(),
  }),
})

export type SearchIntent = z.infer<typeof SearchIntentSchema>

// AI Query Processing
export const ProcessedQuerySchema = z.object({
  originalQuery: z.string(),
  normalizedQuery: z.string(),
  intent: SearchIntentSchema,
  suggestedFilters: z.record(z.unknown()).optional(),
  keywords: z.array(z.string()),
  synonyms: z.array(z.string()).default([]),
})

export type ProcessedQuery = z.infer<typeof ProcessedQuerySchema>

// Search Suggestions
export const SearchSuggestionSchema = z.object({
  text: z.string(),
  type: z.enum(['query', 'product', 'brand', 'category']),
  popularity: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).optional(),
})

export type SearchSuggestion = z.infer<typeof SearchSuggestionSchema>

// Recommendation Types
export const RecommendationReasonSchema = z.object({
  type: z.enum(['price', 'rating', 'features', 'brand', 'popularity', 'ai_analysis']),
  description: z.string(),
  weight: z.number().min(0).max(1),
})

export type RecommendationReason = z.infer<typeof RecommendationReasonSchema>

export const ProductRecommendationSchema = z.object({
  productId: z.string(),
  score: z.number().min(0).max(1),
  reasons: z.array(RecommendationReasonSchema),
  confidence: z.number().min(0).max(1),
  personalizedFactors: z.array(z.string()).default([]),
})

export type ProductRecommendation = z.infer<typeof ProductRecommendationSchema>

// Search Analytics
export const SearchAnalyticsSchema = z.object({
  searchId: z.string(),
  query: z.string(),
  resultsCount: z.number().min(0),
  clickThroughRate: z.number().min(0).max(1).optional(),
  averageRelevanceScore: z.number().min(0).max(1).optional(),
  executionTime: z.number().positive(),
  timestamp: z.date(),
})

export type SearchAnalytics = z.infer<typeof SearchAnalyticsSchema>