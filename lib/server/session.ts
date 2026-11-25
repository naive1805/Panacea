import type { SupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export class ActionError extends Error {}

export async function requireUser(): Promise<{
  supabase: SupabaseClient<Database, 'public'>
  userId: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new ActionError('You need to sign in to do that.')
  }

  return { supabase, userId: user.id }
}

/**
 * Same as `requireUser`, for pages: an unauthenticated reader is sent to the
 * sign-in screen instead of tripping an error boundary.
 */
export async function requireUserOrRedirect(): Promise<{
  supabase: SupabaseClient<Database, 'public'>
  userId: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in?next=/dashboard')
  }

  return { supabase, userId: user.id }
}

export function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof ActionError) {
    return { ok: false, error: error.message }
  }
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return { ok: false, error: message }
}
