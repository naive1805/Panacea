/**
 * Hand-written Supabase database types for Panacea.
 *
 * Keep in sync with `supabase/migrations/`. Regenerating with `supabase gen
 * types typescript` produces the same shape, but the file is checked in so
 * the app stays typed without the CLI.
 */

type Timestamp = string
type Date = string

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: '2.117.2'
  }
  public: {
    Tables: {
      allergies: {
        Row: {
          id: string
          user_id: string
          name: string
          note: string | null
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          note?: string | null
          created_at?: Timestamp
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          note?: string | null
          created_at?: Timestamp
        }
        Relationships: []
      }
      medicine_details: {
        Row: {
          provider: string
          provider_ref: string
          setid: string | null
          name: string
          generic_name: string | null
          brand_name: string | null
          manufacturer: string | null
          license_status: string | null
          form: string | null
          strength: string | null
          route: string | null
          ingredients: Json
          ingredients_confidence: string
          uses: Json | null
          administration: Json | null
          side_effects: Json | null
          warnings: Json | null
          interactions: Json | null
          food_guidance: Json | null
          sources: Json
          retrieved_at: Timestamp
          expires_at: Timestamp
        }
        Insert: {
          provider: string
          provider_ref: string
          setid?: string | null
          name: string
          generic_name?: string | null
          brand_name?: string | null
          manufacturer?: string | null
          license_status?: string | null
          form?: string | null
          strength?: string | null
          route?: string | null
          ingredients?: Json
          ingredients_confidence?: string
          uses?: Json | null
          administration?: Json | null
          side_effects?: Json | null
          warnings?: Json | null
          interactions?: Json | null
          food_guidance?: Json | null
          sources?: Json
          retrieved_at: Timestamp
          expires_at?: Timestamp
        }
        Update: {
          provider?: string
          provider_ref?: string
          setid?: string | null
          name?: string
          generic_name?: string | null
          brand_name?: string | null
          manufacturer?: string | null
          license_status?: string | null
          form?: string | null
          strength?: string | null
          route?: string | null
          ingredients?: Json
          ingredients_confidence?: string
          uses?: Json | null
          administration?: Json | null
          side_effects?: Json | null
          warnings?: Json | null
          interactions?: Json | null
          food_guidance?: Json | null
          sources?: Json
          retrieved_at?: Timestamp
          expires_at?: Timestamp
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Relationships: []
      }
      medicines: {
        Row: {
          id: string
          user_id: string
          name: string
          strength: string | null
          form: string
          color: string
          instructions: string | null
          notes: string | null
          expiry_date: Date | null
          barcode: string | null
          source: string
          provider_ref: string | null
          created_at: Timestamp
          updated_at: Timestamp
          archived_at: Timestamp | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          strength?: string | null
          form?: string
          color?: string
          instructions?: string | null
          notes?: string | null
          expiry_date?: Date | null
          barcode?: string | null
          source?: string
          provider_ref?: string | null
          created_at?: Timestamp
          updated_at?: Timestamp
          archived_at?: Timestamp | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          strength?: string | null
          form?: string
          color?: string
          instructions?: string | null
          notes?: string | null
          expiry_date?: Date | null
          barcode?: string | null
          source?: string
          provider_ref?: string | null
          created_at?: Timestamp
          updated_at?: Timestamp
          archived_at?: Timestamp | null
        }
        Relationships: []
      }
      medicine_barcodes: {
        Row: {
          id: string
          user_id: string
          barcode: string
          format: string | null
          medicine_id: string | null
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          barcode: string
          format?: string | null
          medicine_id?: string | null
          created_at?: Timestamp
        }
        Update: {
          id?: string
          user_id?: string
          barcode?: string
          format?: string | null
          medicine_id?: string | null
          created_at?: Timestamp
        }
        Relationships: [
          {
            foreignKeyName: 'medicine_barcodes_medicine_id_fkey'
            columns: ['medicine_id']
            referencedRelation: 'medicines'
            referencedColumns: ['id']
            isOneToOne: false
          },
        ]
      }
      schedules: {
        Row: {
          id: string
          user_id: string
          medicine_id: string
          time: string
          weekdays: number[]
          dose_label: string | null
          active: boolean
          start_date: Date
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          medicine_id: string
          time: string
          weekdays?: number[]
          dose_label?: string | null
          active?: boolean
          start_date?: Date
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: {
          id?: string
          user_id?: string
          medicine_id?: string
          time?: string
          weekdays?: number[]
          dose_label?: string | null
          active?: boolean
          start_date?: Date
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Relationships: [
          {
            foreignKeyName: 'schedules_medicine_id_fkey'
            columns: ['medicine_id']
            referencedRelation: 'medicines'
            referencedColumns: ['id']
            isOneToOne: false
          },
        ]
      }
      dose_logs: {
        Row: {
          id: string
          user_id: string
          medicine_id: string
          schedule_id: string | null
          scheduled_for: Timestamp
          status: string
          taken_at: Timestamp | null
          snoozed_until: Timestamp | null
          note: string | null
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          medicine_id: string
          schedule_id?: string | null
          scheduled_for: Timestamp
          status: string
          taken_at?: Timestamp | null
          snoozed_until?: Timestamp | null
          note?: string | null
          created_at?: Timestamp
        }
        Update: {
          id?: string
          user_id?: string
          medicine_id?: string
          schedule_id?: string | null
          scheduled_for?: Timestamp
          status?: string
          taken_at?: Timestamp | null
          snoozed_until?: Timestamp | null
          note?: string | null
          created_at?: Timestamp
        }
        Relationships: [
          {
            foreignKeyName: 'dose_logs_medicine_id_fkey'
            columns: ['medicine_id']
            referencedRelation: 'medicines'
            referencedColumns: ['id']
            isOneToOne: false
          },
          {
            foreignKeyName: 'dose_logs_schedule_id_fkey'
            columns: ['schedule_id']
            referencedRelation: 'schedules'
            referencedColumns: ['id']
            isOneToOne: false
          },
        ]
      }
      notification_prefs: {
        Row: {
          user_id: string
          dose_reminders: boolean
          expiry_warnings: boolean
          expiry_lead_days: number
          updated_at: Timestamp
        }
        Insert: {
          user_id: string
          dose_reminders?: boolean
          expiry_warnings?: boolean
          expiry_lead_days?: number
          updated_at?: Timestamp
        }
        Update: {
          user_id?: string
          dose_reminders?: boolean
          expiry_warnings?: boolean
          expiry_lead_days?: number
          updated_at?: Timestamp
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: Timestamp
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: Timestamp
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      update_medicine_with_schedules: {
        Args: { p_medicine_id: string; p_medicine: Json; p_schedules: Json }
        Returns: Database['public']['Tables']['medicines']['Row'][]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
