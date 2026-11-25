import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

/**
 * Server-only Supabase client using the service-role / secret key.
 *
 * The key has no `NEXT_PUBLIC_` prefix, so Next.js never inlines it into the
 * browser bundle — it exists only in the Node server process. This client
 * bypasses Row Level Security and is used solely to write/refresh the shared
 * `medicine_details` cache. Import it from `'use server'` code only, never from
 * a client component, and never log the key.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient must only run on the server.')
  }

  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) {
    throw new Error('SUPABASE_SECRET_KEY is not set; shared cache writes are disabled.')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
