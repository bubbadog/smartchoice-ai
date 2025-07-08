import { z } from 'zod'

// Base Product Schema
export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  price: z.number().positive(),
  originalPrice: z.number().positive().optional(),
  currency: z.string().default('USD'),
  imageUrl: z.string().url().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().min(0).optional(),
  availability: z.enum(['in_stock', 'out_of_stock', 'limited', 'preorder']).default('in_stock'),
  retailer: z.string(),
  retailerUrl: z.string().url(),
  affiliateUrl: z.string().url().optional(),
})

export type Product = z.infer<typeof ProductSchema>

// Product Search Filters
export const ProductFiltersSchema = z.object({
  query: z.string(),
  category: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  brand: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  availability: z.array(z.enum(['in_stock', 'out_of_stock', 'limited', 'preorder'])).optional(),
  sortBy: z.enum(['relevance', 'price_low', 'price_high', 'rating', 'newest']).default('relevance'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

export type ProductFilters = z.infer<typeof ProductFiltersSchema>

// Deal Score Calculation
export const DealScoreSchema = z.object({
  score: z.number().min(0).max(100),
  factors: z.object({
    priceHistory: z.number().min(0).max(100),
    competitorComparison: z.number().min(0).max(100),
    reviewSentiment: z.number().min(0).max(100),
    availability: z.number().min(0).max(100),
  }),
  recommendation: z.enum(['excellent', 'good', 'fair', 'poor']),
})

export type DealScore = z.infer<typeof DealScoreSchema>

// Enhanced Product with AI Analysis
export const EnhancedProductSchema = ProductSchema.extend({
  dealScore: DealScoreSchema.optional(),
  confidence: z.number().min(0).max(1),
  aiSummary: z.string().optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  similarProducts: z.array(z.string()).optional(), // Array of product IDs
})

export type EnhancedProduct = z.infer<typeof EnhancedProductSchema>