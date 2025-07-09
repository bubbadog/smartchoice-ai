import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().positive().default(3000),
  FRONTEND_URL: z.string().url().optional(),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  PINECONE_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  JINA_API_KEY: z.string().optional(),
  // Amazon Product Advertising API
  AMAZON_ACCESS_KEY: z.string().optional(),
  AMAZON_SECRET_KEY: z.string().optional(),
  AMAZON_PARTNER_TAG: z.string().optional(),
  // Best Buy API
  BESTBUY_API_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    result.error.errors.forEach((error) => {
      console.error(`  ${error.path.join('.')}: ${error.message}`)
    })
    process.exit(1)
  }
  
  return result.data
}