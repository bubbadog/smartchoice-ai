import { z } from 'zod'

// User Preferences
export const UserPreferencesSchema = z.object({
  categories: z.array(z.string()).default([]),
  priceRange: z.object({
    min: z.number().min(0).optional(),
    max: z.number().min(0).optional(),
  }).optional(),
  brands: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  dealThreshold: z.number().min(0).max(100).default(70), // Minimum deal score to show
  currency: z.string().default('USD'),
  language: z.string().default('en'),
  notifications: z.object({
    priceDrops: z.boolean().default(true),
    newDeals: z.boolean().default(true),
    recommendations: z.boolean().default(true),
  }).default({}),
})

export type UserPreferences = z.infer<typeof UserPreferencesSchema>

// User Schema
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().url().optional(),
  preferences: UserPreferencesSchema.default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional(),
})

export type User = z.infer<typeof UserSchema>

// Search History
export const SearchHistorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  query: z.string(),
  filters: z.record(z.unknown()).optional(),
  resultCount: z.number().min(0),
  timestamp: z.date(),
})

export type SearchHistory = z.infer<typeof SearchHistorySchema>

// User Interaction
export const UserInteractionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['search', 'click', 'save', 'purchase', 'compare', 'share']),
  productId: z.string().optional(),
  searchQuery: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.date(),
})

export type UserInteraction = z.infer<typeof UserInteractionSchema>