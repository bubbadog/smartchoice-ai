import { z } from 'zod'

import { EnhancedProductSchema } from './product'

// Pagination
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  total: z.number().min(0),
  totalPages: z.number().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
})

export type Pagination = z.infer<typeof PaginationSchema>

// Generic API Response
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.string().datetime(),
  })

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

// Paginated Response
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z
      .object({
        items: z.array(itemSchema),
        pagination: PaginationSchema,
      })
      .optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.string().datetime(),
  })

export type PaginatedResponse<T> = {
  success: boolean
  data?: {
    items: T[]
    pagination: Pagination
  }
  error?: string
  message?: string
  timestamp: string
}

// Search Request
export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  filters: z
    .object({
      category: z.string().optional(),
      minPrice: z.number().positive().optional(),
      maxPrice: z.number().positive().optional(),
      brand: z.string().optional(),
      rating: z.number().min(0).max(5).optional(),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    })
    .optional(),
  sortBy: z.enum(['relevance', 'price_low', 'price_high', 'rating', 'newest']).default('relevance'),
})

export type SearchRequest = z.infer<typeof SearchRequestSchema>

// Search Response
export const SearchResponseSchema = PaginatedResponseSchema(EnhancedProductSchema)
export type SearchResponse = PaginatedResponse<z.infer<typeof EnhancedProductSchema>>

// Health Check Response
export const HealthCheckResponseSchema = ApiResponseSchema(
  z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    version: z.string(),
    uptime: z.number(),
    services: z.record(
      z.object({
        status: z.enum(['up', 'down']),
        responseTime: z.number().optional(),
      }),
    ),
  }),
)

export type HealthCheckResponse = ApiResponse<z.infer<typeof HealthCheckResponseSchema>['data']>

// Error Types
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  stack: z.string().optional(),
})

export type ApiError = z.infer<typeof ApiErrorSchema>
