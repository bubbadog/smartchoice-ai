import { createClient } from '@supabase/supabase-js'

import { validateEnv } from '../utils/env'

let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    const env = validateEnv()

    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      throw new Error(
        'Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY',
      )
    }

    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  }

  return supabaseClient
}

export function getSupabaseServiceClient() {
  // Check process.env directly since env schema marks these as optional
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase service configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
