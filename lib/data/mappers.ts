import type { Database } from '@/lib/supabase/database.types'
import type {
  DoseLog,
  DoseStatus,
  Medicine,
  MedicineForm,
  MedicineSource,
  NotificationPrefs,
  Schedule,
} from '@/lib/types'

export type MedicineRow = Database['public']['Tables']['medicines']['Row']
export type ScheduleRow = Database['public']['Tables']['schedules']['Row']
export type DoseLogRow = Database['public']['Tables']['dose_logs']['Row']
export type NotificationPrefsRow =
  Database['public']['Tables']['notification_prefs']['Row']

// `form` / `source` / `status` are constrained text columns in Postgres; narrow
// them to the domain unions without widening the rest of the row.
export function toMedicine(row: MedicineRow): Medicine {
  return {
    ...row,
    form: row.form as MedicineForm,
    source: row.source as MedicineSource,
  }
}

export function toSchedule(row: ScheduleRow): Schedule {
  return { ...row, weekdays: (row.weekdays ?? []) as number[] }
}

export function toDoseLog(row: DoseLogRow): DoseLog {
  return { ...row, status: row.status as DoseStatus }
}

export function toNotificationPrefs(row: NotificationPrefsRow): NotificationPrefs {
  return row
}
