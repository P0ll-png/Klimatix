'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth/auth-provider'
import { fetchReports, upvoteReport } from '@/lib/reports'
import { severityMeta, statusMeta, timeAgo, type Report } from '@/lib/types'

function ReportsList() {
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('selected')
  const { requireVerified } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const selectedCard = useRef<HTMLElement | null>(null)

  useEffect(() => {
    let active = true
    fetchReports()
      .then(({ reports: loaded, fallback }) => {
        if (!active) return
        setReports(loaded)
        if (fallback) toast('Showing sample reports.')
      })
      .catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : 'Could not load reports.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (selectedId) selectedCard.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [reports, selectedId])

  function upvote(reportId: string) {
    requireVerified(() => {
      void upvoteReport(reportId)
        .then((updated) => setReports((current) => current.map((report) => report.id === reportId ? updated : report)))
        .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Unable to record your vote.'))
    })
  }

  return <main className="p-5 md:p-7">
    <p className="text-xs font-bold tracking-[.2em] text-cyan">COMMUNITY REPORTS</p>
    <h1 className="mt-2 font-display text-3xl font-black">Flood &amp; rainfall reports</h1>
    <p className="mt-2 text-sm text-[#C4CEE2]">{reports.length} reports available.</p>
    {loading ? <p className="mt-5 text-sm text-[#A9B4CC]">Loading reports…</p> : reports.length ? <div className="mt-5 space-y-3">
      {reports.map((report) => <article
        key={report.id}
        ref={report.id === selectedId ? selectedCard : undefined}
        tabIndex={report.id === selectedId ? -1 : undefined}
        className={`rounded-2xl border bg-[#10285b] p-4 ${report.id === selectedId ? 'border-cyan ring-2 ring-cyan/50' : 'border-[#315182]'}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><h2 className="font-semibold">{report.area}</h2><p className="mt-1 text-xs" style={{ color: severityMeta[report.severity].color }}>{severityMeta[report.severity].label} · {severityMeta[report.severity].depth}</p></div>
          <span className="text-xs text-[#A9B4CC]">{timeAgo(report.createdAt)}</span>
        </div>
        <p className="mt-3 text-sm text-[#C4CEE2]">{report.description}</p>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span style={{ color: statusMeta[report.status].color }}>{statusMeta[report.status].label} · Reported by {report.handle}</span>
          <button type="button" onClick={() => upvote(report.id)} className="upvote-button w-auto gap-3 px-3 py-2">I see this too <span>{report.upvoteCount}</span></button>
        </div>
      </article>)}
    </div> : <p className="mt-5 rounded-xl border border-[#315182] p-4 text-sm text-[#A9B4CC]">No flood reports are available.</p>}
  </main>
}

export default function ReportsPage() {
  return <Suspense fallback={<main className="p-5 text-sm text-[#A9B4CC]">Loading reports…</main>}><ReportsList /></Suspense>
}
