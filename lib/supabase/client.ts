import { createClient } from '@supabase/supabase-js'

type Database = {
  public: {
    Tables: {
      flood_reports: {
        Row: {
          id: string
          lat: number
          lng: number
          severity: string
          description: string
          photo_url: string | null
          confidence_score: number | null
          status: string
          upvote_count: number | null
          origin: string | null
          handle: string | null
          created_at: string
          source: string | null
          reporter_hash: string | null
        }
        Insert: {
          id?: string
          lat: number
          lng: number
          severity: string
          description: string
          photo_url?: string | null
          confidence_score?: number | null
          status?: string
          upvote_count?: number | null
          origin?: string | null
          handle?: string | null
          created_at?: string
          source: string
          reporter_hash: string
        }
        Update: Partial<Database['public']['Tables']['flood_reports']['Insert']>
        Relationships: []
      }
      flood_report_upvotes: {
        Row: { id: string; report_id: string; voter_token: string; created_at: string }
        Insert: { id?: string; report_id: string; voter_token: string; created_at?: string }
        Update: Partial<Database['public']['Tables']['flood_report_upvotes']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

let browserClient: ReturnType<typeof createClient<Database>> | undefined

export function getSupabaseClient() {
  if (browserClient) return browserClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  browserClient = createClient<Database>(url, key)
  return browserClient
}
