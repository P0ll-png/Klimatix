import { getSupabaseClient } from '@/lib/supabase/client'
import { mockReports, type Report, type Severity } from '@/lib/types'

const REPORT_COLUMNS = 'id,lat,lng,severity,description,photo_url,confidence_score,status,upvote_count,origin,handle,created_at'
const severityToDb: Record<Severity, string> = { PASSABLE: 'ankle', MINOR: 'knee', MODERATE: 'waist', SEVERE: 'chest' }
const severityFromDb: Record<string, Severity> = { ankle: 'PASSABLE', knee: 'MINOR', waist: 'MODERATE', chest: 'SEVERE', above_head: 'SEVERE' }

function areaFor(lat: number, lng: number) {
  if (lat > 14.68 && lng < 121.02) return 'Valenzuela Road'
  if (lat > 14.62 && lng > 121.08) return 'Marikina River'
  if (lat > 14.61 && lng < 121.08) return 'Aurora Boulevard'
  if (lat > 14.59 && lng < 121.02) return 'España Boulevard'
  if (lng > 121.06) return 'Pasig River Road'
  if (lat < 14.55 && lng > 121.02) return 'Taguig Creek'
  return 'Metro Manila'
}

export function mapReport(row: Record<string, unknown>): Report {
  return {
    id: String(row.id), lat: Number(row.lat), lng: Number(row.lng),
    severity: severityFromDb[String(row.severity)] ?? 'MINOR',
    description: String(row.description ?? ''), status: row.status as Report['status'],
    confidence: Math.max(0, Math.min(1, Number(row.confidence_score ?? 0) / 100)),
    upvoteCount: Number(row.upvote_count ?? 0), createdAt: String(row.created_at),
    handle: String(row.handle ?? 'Resident'), origin: 'COMMUNITY',
    area: areaFor(Number(row.lat), Number(row.lng)),
    ...(row.photo_url ? { photoUrl: String(row.photo_url) } : {}),
  }
}

export async function fetchReports() {
  const supabase = getSupabaseClient()
  if (!supabase) return { reports: mockReports, fallback: true }
  const { data, error } = await supabase.from('flood_reports').select(REPORT_COLUMNS).order('created_at', { ascending: false })
  if (error || !data?.length) return { reports: mockReports, fallback: true }
  return { reports: data.map((row) => mapReport(row as Record<string, unknown>)), fallback: false }
}

function browserToken(key: string) {
  try {
    const existing = window.localStorage.getItem(key)
    if (existing) return existing
    const token = crypto.randomUUID()
    window.localStorage.setItem(key, token)
    return token
  } catch { return crypto.randomUUID() }
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createReport(input: { lat: number; lng: number; severity: Severity; description: string; photoUrl?: string | null }) {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error('Report service unavailable')
  const reporterHash = await sha256(browserToken('klimatix-browser-id'))
  const { data, error } = await supabase.from('flood_reports').insert({ lat: input.lat, lng: input.lng, severity: severityToDb[input.severity], description: input.description, photo_url: input.photoUrl ?? null, source: 'WEB', reporter_hash: reporterHash }).select(REPORT_COLUMNS).single()
  if (error || !data) throw new Error('Unable to submit report')
  return mapReport(data as Record<string, unknown>)
}

export async function upvoteReport(reportId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) return null
  const { error } = await supabase.from('flood_report_upvotes').insert({ report_id: reportId, voter_token: browserToken('klimatix-voter-token') })
  if (error && !['23505', '409'].includes(error.code ?? '')) throw new Error('Unable to record upvote')
  const { data, error: fetchError } = await supabase.from('flood_reports').select(REPORT_COLUMNS).eq('id', reportId).single()
  if (fetchError || !data) throw new Error('Unable to refresh report')
  return mapReport(data as Record<string, unknown>)
}
