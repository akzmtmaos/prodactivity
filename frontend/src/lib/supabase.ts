import { createClient } from '@supabase/supabase-js'

// Get these from your Supabase project settings
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://tyuiugbvqmeatyjpenzg.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dWl1Z2J2cW1lYXR5anBlbnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTQ1MjcsImV4cCI6MjA3Mjg3MDUyN30.Kb8tj1jaBIm8XxLQuaVQr-8I-v4JhrPjKAD_jv_yp30'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Database types matching your Supabase schema
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          email: string
          avatar: string | null
          email_verified: boolean
          email_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          email: string
          avatar?: string | null
          email_verified?: boolean
          email_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          avatar?: string | null
          email_verified?: boolean
          email_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: number
          user_id: string
          title: string
          description: string | null
          due_date: string
          priority: 'low' | 'medium' | 'high'
          completed: boolean
          completed_at: string | null
          category: 'work' | 'personal' | 'study' | 'health' | 'other'
          task_category: string | null
          created_at: string
          updated_at: string
          has_activity: boolean
          activity_notes: string | null
          time_spent_minutes: number
          last_activity_at: string | null
          evidence_uploaded: boolean
          evidence_description: string | null
          evidence_file: string | null
          evidence_uploaded_at: string | null
          is_deleted: boolean
          deleted_at: string | null
          was_completed_on_delete: boolean
        }
        Insert: {
          id?: number
          user_id: string
          title: string
          description?: string | null
          due_date: string
          priority?: 'low' | 'medium' | 'high'
          completed?: boolean
          completed_at?: string | null
          category?: 'work' | 'personal' | 'study' | 'health' | 'other'
          task_category?: string | null
          created_at?: string
          updated_at?: string
          has_activity?: boolean
          activity_notes?: string | null
          time_spent_minutes?: number
          last_activity_at?: string | null
          evidence_uploaded?: boolean
          evidence_description?: string | null
          evidence_file?: string | null
          evidence_uploaded_at?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          was_completed_on_delete?: boolean
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          description?: string | null
          due_date?: string
          priority?: 'low' | 'medium' | 'high'
          completed?: boolean
          completed_at?: string | null
          category?: 'work' | 'personal' | 'study' | 'health' | 'other'
          task_category?: string | null
          created_at?: string
          updated_at?: string
          has_activity?: boolean
          activity_notes?: string | null
          time_spent_minutes?: number
          last_activity_at?: string | null
          evidence_uploaded?: boolean
          evidence_description?: string | null
          evidence_file?: string | null
          evidence_uploaded_at?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          was_completed_on_delete?: boolean
        }
      }
      productivity_logs: {
        Row: {
          id: number
          user_id: string
          period_type: 'daily' | 'weekly' | 'monthly'
          period_start: string
          period_end: string
          completion_rate: number
          total_tasks: number
          completed_tasks: number
          status: string
          logged_at: string
        }
        Insert: {
          id?: number
          user_id: string
          period_type: 'daily' | 'weekly' | 'monthly'
          period_start: string
          period_end: string
          completion_rate: number
          total_tasks: number
          completed_tasks: number
          status: string
          logged_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          period_type?: 'daily' | 'weekly' | 'monthly'
          period_start?: string
          period_end?: string
          completion_rate?: number
          total_tasks?: number
          completed_tasks?: number
          status?: string
          logged_at?: string
        }
      }
      notebooks: {
        Row: {
          id: number
          name: string
          user_id: string
          notebook_type: 'study' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other'
          urgency_level: 'normal' | 'important' | 'urgent' | 'critical'
          description: string
          created_at: string
          updated_at: string
          is_archived: boolean
          archived_at: string | null
        }
        Insert: {
          id?: number
          name: string
          user_id: string
          notebook_type?: 'study' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other'
          urgency_level?: 'normal' | 'important' | 'urgent' | 'critical'
          description?: string
          created_at?: string
          updated_at?: string
          is_archived?: boolean
          archived_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          user_id?: string
          notebook_type?: 'study' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other'
          urgency_level?: 'normal' | 'important' | 'urgent' | 'critical'
          description?: string
          created_at?: string
          updated_at?: string
          is_archived?: boolean
          archived_at?: string | null
        }
      }
      notes: {
        Row: {
          id: number
          title: string
          content: string
          notebook_id: number
          user_id: string
          note_type: 'lecture' | 'reading' | 'assignment' | 'exam' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          is_urgent: boolean
          tags: string
          created_at: string
          updated_at: string
          is_deleted: boolean
          deleted_at: string | null
          is_archived: boolean
          archived_at: string | null
          last_visited: string | null
        }
        Insert: {
          id?: number
          title: string
          content: string
          notebook_id: number
          user_id: string
          note_type?: 'lecture' | 'reading' | 'assignment' | 'exam' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          is_urgent?: boolean
          tags?: string
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          is_archived?: boolean
          archived_at?: string | null
          last_visited?: string | null
        }
        Update: {
          id?: number
          title?: string
          content?: string
          notebook_id?: number
          user_id?: string
          note_type?: 'lecture' | 'reading' | 'assignment' | 'exam' | 'meeting' | 'personal' | 'work' | 'project' | 'research' | 'other'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          is_urgent?: boolean
          tags?: string
          created_at?: string
          updated_at?: string
          is_deleted?: boolean
          deleted_at?: string | null
          is_archived?: boolean
          archived_at?: string | null
          last_visited?: string | null
        }
      }
      notifications: {
        Row: {
          id: number
          user_id: number
          title: string
          message: string
          notification_type: 'task_due' | 'task_completed' | 'note_reminder' | 'study_reminder' | 'schedule_reminder' | 'general'
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: number
          user_id: number
          title: string
          message: string
          notification_type?: 'task_due' | 'task_completed' | 'note_reminder' | 'study_reminder' | 'schedule_reminder' | 'general'
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: number
          title?: string
          message?: string
          notification_type?: 'task_due' | 'task_completed' | 'note_reminder' | 'study_reminder' | 'schedule_reminder' | 'general'
          is_read?: boolean
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: number
          name: string
          rating: number
          content: string
          avatar: string
          created_at: string
          is_approved: boolean
        }
        Insert: {
          id?: number
          name: string
          rating: number
          content: string
          avatar?: string
          created_at?: string
          is_approved?: boolean
        }
        Update: {
          id?: number
          name?: string
          rating?: number
          content?: string
          avatar?: string
          created_at?: string
          is_approved?: boolean
        }
      }
      study_timer_sessions: {
        Row: {
          id: number
          user_id: string
          session_type: 'Study' | 'Break' | 'Long Break'
          start_time: string
          end_time: string
          duration: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          session_type: 'Study' | 'Break' | 'Long Break'
          start_time: string
          end_time: string
          duration: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          session_type?: 'Study' | 'Break' | 'Long Break'
          start_time?: string
          end_time?: string
          duration?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      task_priority: 'low' | 'medium' | 'high'
      task_category: 'work' | 'personal' | 'study' | 'health' | 'other'
      period_type: 'daily' | 'weekly' | 'monthly'
    }
  }
}
