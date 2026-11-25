import type { NotificationPrefs } from '@/lib/types'
import { toNotificationPrefs } from './mappers'
import type { TypedClient } from './medicines'

const DEFAULT_PREFS = {
  dose_reminders: true,
  expiry_warnings: true,
  expiry_lead_days: 5,
} as const

export async function fetchNotificationPrefs(
  supabase: TypedClient,
  userId: string,
): Promise<NotificationPrefs> {
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (data) return toNotificationPrefs(data)

  // First visit: create the default row (RLS scopes it to the signed-in user).
  const { data: created, error: insertError } = await supabase
    .from('notification_prefs')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select('*')
    .maybeSingle()

  if (insertError) throw insertError
  return created
    ? toNotificationPrefs(created)
    : { ...DEFAULT_PREFS, user_id: userId, updated_at: '' }
}
