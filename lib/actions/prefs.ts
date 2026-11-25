'use server'

import { revalidatePath } from 'next/cache'

import { toNotificationPrefs } from '@/lib/data/mappers'
import type { NotificationPrefs } from '@/lib/types'
import { failure, requireUser } from '@/lib/server/session'

export type NotificationPrefsInput = {
  dose_reminders?: boolean
  expiry_warnings?: boolean
  expiry_lead_days?: number
}

export async function updateNotificationPrefs(
  input: NotificationPrefsInput,
): Promise<{ ok: true; data: NotificationPrefs } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser()

    const patch: {
      user_id: string
      dose_reminders?: boolean
      expiry_warnings?: boolean
      expiry_lead_days?: number
    } = { user_id: userId }

    if (typeof input.dose_reminders === 'boolean') {
      patch.dose_reminders = input.dose_reminders
    }
    if (typeof input.expiry_warnings === 'boolean') {
      patch.expiry_warnings = input.expiry_warnings
    }
    if (typeof input.expiry_lead_days === 'number') {
      const days = Math.round(input.expiry_lead_days)
      if (days < 1 || days > 365) {
        return { ok: false, error: 'Choose a lead time between 1 and 365 days.' }
      }
      patch.expiry_lead_days = days
    }

    const { data, error } = await supabase
      .from('notification_prefs')
      .upsert(patch, { onConflict: 'user_id' })
      .select('*')
      .single()
    if (error) throw error

    revalidatePath('/dashboard', 'layout')
    return { ok: true, data: toNotificationPrefs(data) }
  } catch (error) {
    return failure(error)
  }
}
