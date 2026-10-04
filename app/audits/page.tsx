'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase/client'

type AuditRow = Record<string, unknown> & { id?: string | number }
const sampleAudits: AuditRow[] = [
  { id: '1', infrastructure_type: 'floodwall', condition: 'good', description: 'Marikina River floodwall - East bank, well maintained', location: 'Brgy. Tumana, Marikina', transparency_rating: 4, date: '2026-10-01' },
  { id: '2', infrastructure_type: 'drainage', condition: 'poor', description: 'Clogged drainage canal along Aurora Blvd, trash buildup', location: 'Brgy. Doña Imelda, Quezon City', transparency_rating: 2, date: '2026-10-02' },
  { id: '3', infrastructure_type: 'pump_station', condition: 'fair', description: 'Paco Pump Station operational but showing rust damage', location: 'Brgy. Paco, Manila', transparency_rating: 3, date: '2026-10-03' },
  { id: '4', infrastructure_type: 'drainage', condition: 'missing', description: 'No drainage system despite being listed in 2024 infra project', location: 'Brgy. Bagong Silang, Caloocan', transparency_rating: 1, date: '2026-09-28' },
  { id: '5', infrastructure_type: 'floodwall', condition: 'poor', description: 'Cracked floodwall section near Tullahan River bridge', location: 'Brgy. Potrero, Malabon', transparency_rating: 2, date: '2026-09-30' },
  { id: '6', infrastructure_type: 'bridge', condition: 'good', description: 'C5-Bagong Ilog bridge flood barriers intact', location: 'Brgy. Bagong Ilog, Pasig', transparency_rating: 5, date: '2026-10-01' },
]
const severityColors: Record<string, { badge: string; icon: string }> = {
  good: { badge: 'text-[#86efac]', icon: '🟢' },
  fair: { badge: 'text-[#fde047]', icon: '🟡' },
  poor: { badge: 'text-[#fca5a5]', icon: '🔴' },
  missing: { badge: 'text-[#cbd5e1]', icon: '⚫' },
}

function text(row: AuditRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' || typeof value === 'number') return String(value)
  }
  return ''
}

function AuditList() {
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('selected')
  const [audits, setAudits] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const selectedCard = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      toast.error('Audit service is not configured.')
      setLoading(false)
      return
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      toast.error('Audit service is not configured.')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    fetch(`${url.replace(/\/$/, '')}/rest/v1/infrastructure_audits?select=*&order=created_at.desc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load infrastructure audits.')
        const loaded = await response.json() as AuditRow[]
        setAudits(loaded.length ? loaded : sampleAudits)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        toast.error(error instanceof Error ? error.message : 'Could not load infrastructure audits.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (selectedId) selectedCard.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [audits, selectedId])

  return <main className="p-5 md:p-7">
    <p className="text-xs font-bold tracking-[.2em] text-cyan">COMMUNITY INFRASTRUCTURE AUDITS</p>
    <h1 className="mt-2 font-display text-3xl font-black">Audits</h1>
    {loading ? <p className="mt-5 text-sm text-[#A9B4CC]">Loading audits…</p> : audits.length ? <div className="mt-5 space-y-3">
      {audits.map((audit, index) => {
        const id = String(audit.id ?? index)
        const condition = text(audit, 'condition', 'current_condition', 'status')
        const lowerCondition = condition.toLowerCase()
        const badge = lowerCondition.includes('good') ? severityColors.good
          : lowerCondition.includes('fair') ? severityColors.fair
            : lowerCondition.includes('poor') ? severityColors.poor
              : severityColors.missing
        const location = text(audit, 'location', 'address', 'barangay_name')
          || [text(audit, 'lat', 'latitude'), text(audit, 'lng', 'longitude')].filter(Boolean).join(', ')
          || 'Location not provided'
        const createdAt = text(audit, 'created_at', 'createdAt', 'audited_at', 'date')
        return <article
          key={id}
          ref={id === selectedId ? selectedCard : undefined}
          tabIndex={id === selectedId ? -1 : undefined}
          className={`rounded-2xl border bg-[#10285b] p-4 ${id === selectedId ? 'border-cyan ring-2 ring-cyan/50' : 'border-[#315182]'}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold">{text(audit, 'type', 'infrastructure_type', 'asset_type') || 'Infrastructure audit'}</h2><p className="mt-1 text-sm text-[#A9B4CC]">{location}</p></div>
            <span className={`rounded-full border border-[#315182] px-2 py-1 text-xs ${badge.badge}`}>{badge.icon} {condition || 'Condition unknown'}</span>
          </div>
          {text(audit, 'description') && <p className="mt-3 text-sm text-[#C4CEE2]">{text(audit, 'description')}</p>}
          <p className="mt-3 text-xs text-[#A9B4CC]">{createdAt ? new Date(createdAt).toLocaleString() : 'Date not provided'}</p>
        </article>
      })}
    </div> : <p className="mt-5 rounded-xl border border-[#315182] p-4 text-sm text-[#A9B4CC]">No infrastructure audits are available yet.</p>}
  </main>
}

export default function AuditsPage() {
  return <Suspense fallback={<main className="p-5 text-sm text-[#A9B4CC]">Loading audits…</main>}><AuditList /></Suspense>
}
