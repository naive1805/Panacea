export type MedicineForm =
  | 'tablet'
  | 'capsule'
  | 'liquid'
  | 'cream'
  | 'drops'
  | 'inhaler'
  | 'injection'
  | 'patch'
  | 'other'

export type MedicineSource = 'manual' | 'barcode' | 'provider'

export type Medicine = {
  id: string
  user_id: string
  name: string
  strength: string | null
  form: MedicineForm
  color: string
  instructions: string | null
  notes: string | null
  expiry_date: string | null
  barcode: string | null
  source: MedicineSource
  provider_ref: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type Schedule = {
  id: string
  user_id: string
  medicine_id: string
  time: string
  weekdays: number[]
  dose_label: string | null
  active: boolean
  start_date: string
  created_at: string
  updated_at: string
}

export type DoseStatus = 'taken' | 'skipped' | 'snoozed' | 'missed'

export type DoseLog = {
  id: string
  user_id: string
  medicine_id: string
  schedule_id: string | null
  scheduled_for: string
  status: DoseStatus
  taken_at: string | null
  snoozed_until: string | null
  note: string | null
  created_at: string
}

export type Profile = {
  id: string
  full_name: string | null
  email: string | null
}

export type Allergy = {
  id: string
  user_id: string
  name: string
  note: string | null
  created_at: string
}

export type NotificationPrefs = {
  user_id: string
  dose_reminders: boolean
  expiry_warnings: boolean
  expiry_lead_days: number
  updated_at: string
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type MedicineDraft = {
  name: string
  strength: string
  form: MedicineForm
  color: string
  instructions: string
  notes: string
  expiry_date: string
  barcode: string
}

export type ScheduleDraft = {
  id?: string
  time: string
  dose_label: string
  weekdays: number[]
}
