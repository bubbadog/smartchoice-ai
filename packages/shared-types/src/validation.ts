import { type z } from 'zod'

// Generic validation helper
export function createValidator<T extends z.ZodTypeAny>(schema: T) {
  return {
    parse: (data: unknown): z.infer<T> => {
      return schema.parse(data)
    },
    safeParse: (data: unknown): z.SafeParseReturnType<unknown, z.infer<T>> => {
      return schema.safeParse(data)
    },
    isValid: (data: unknown): data is z.infer<T> => {
      return schema.safeParse(data).success
    },
  }
}

// Runtime validation helpers
export class ValidationError extends Error {
  constructor(
    public field: string,
    public message: string,
    public code: string = 'VALIDATION_ERROR',
  ) {
    super(`${field}: ${message}`)
    this.name = 'ValidationError'
  }
}

// Sanitization helpers
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '')
}

export const sanitizeSearchQuery = (query: string): string => {
  return query.trim().replace(/[<>]/g, '').replace(/\s+/g, ' ').slice(0, 200) // Limit length
}

// Common validation patterns
export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const urlRegex = /^https?:\/\/.+/
export const priceRegex = /^\d+(\.\d{2})?$/

// Validation result helper
export type ValidationResult<T> = {
  success: boolean
  data?: T
  errors?: Array<{
    field: string
    message: string
    code: string
  }>
}

export function validateData<T>(
  data: unknown,
  validator: ReturnType<typeof createValidator>,
): ValidationResult<T> {
  const result = validator.safeParse(data)

  if (result.success) {
    return {
      success: true,
      data: result.data,
    }
  }

  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  }
}
