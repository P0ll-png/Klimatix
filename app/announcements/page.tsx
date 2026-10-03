'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { mockAdvisories, mockReports, severityMeta, type Severity } from '@/lib/types'
import { useAuth } from '@/components/auth/auth-provider'

const severityOrder: Severity[] = ['PASSABLE', 'MINOR', 'MODERATE', 'SEVERE']
const areas = Array.from(new Set(mockReports.map((report) => report.area)))

function communitySeverity(index: number): Severity {
  return severityOrder[index]
}

export default function AnnouncementsPage() {
  const { requireVerified } = useAuth()
  const [municipality, setMunicipality] = useState('All municipalities')
  const [severity, setSeverity] = useState<Severity | 'ALL'>('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [votes, setVotes] = useState<Record<string, { confirm: number; dispute: number }>>({})
  const cards = useMemo(() => areas.map((area) => {
    const reports = mockReports.filter((report) => report.area === area)
    const average = Math.round(reports.reduce((sum, report) => sum + severityOrder.indexOf(report.severity), 0) / reports.length)
    const level = communitySeverity(average)
    return { area, reports, level, issuedAt: reports[0]?.createdAt ?? new Date().toISOString() }
  }).filter((card) => {
    const date = new Date(card.issuedAt).toISOString().slice(0, 10)
    return (municipality === 'All municipalities' || municipality === 'Metro Manila' || card.area === municipality)
      && (severity === 'ALL' || card.level === severity)
      && (!fromDate || date >= fromDate)
      && (!toDate || date <= toDate)
  }), [areas, fromDate, municipality, severity, toDate])

  function vote(area: string, field: 'confirm' | 'dispute') {
    requireVerified(() => setVotes((current) => ({ ...current, [area]: { confirm: current[area]?.confirm ?? 0, dispute: current[area]?.dispute ?? 0, [field]: (current[area]?.[field] ?? 0) + 1 } })))
  }

  async function shareCard(area: string, reportCount: number, level: Severity) {
    const text = `${reportCount} community reports indicate ${severityMeta[level].label.toLowerCase()} flooding in ${area}.`
    try {
      if (navigator.share) {
        await navigator.share({ title: `Community alert: ${area}`, text })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        toast.success('Announcement copied to clipboard.')
      } else {
        toast.error('Sharing is not available in this browser.')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error('Could not share this announcement.')
    }
  }

  return <main className="p-5 md:p-7">
    <p className="text-xs font-bold tracking-[.2em] text-cyan">COMMUNITY SIGNALS</p>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-3xl font-black">Announcements</h1><Link href="/alerto" className="text-sm text-cyan underline">LGU decision support</Link></div>
    <p className="mt-2 text-sm text-[#C4CEE2]">Community-generated signals are separate from official agency announcements.</p>
    <section className="mt-5 grid gap-2" aria-label="Announcement filters">
      <label className="text-xs font-semibold">Municipality or area<select className="mt-1 w-full p-2" value={municipality} onChange={(event) => setMunicipality(event.target.value)}><option>All municipalities</option><option>Metro Manila</option>{areas.map((area) => <option key={area}>{area}</option>)}</select></label>
      <div className="flex flex-wrap gap-2" aria-label="Filter by severity">{(['ALL', ...severityOrder] as const).map((value) => <button key={value} type="button" aria-pressed={severity === value} onClick={() => setSeverity(value)} className={`rounded-full border px-3 py-1 text-xs ${severity === value ? 'border-cyan bg-[#183568]' : 'border-[#315182]'}`}>{value === 'ALL' ? 'All severity' : severityMeta[value].label}</button>)}</div>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs">From<input type="date" className="mt-1 w-full p-2" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label className="text-xs">To<input type="date" className="mt-1 w-full p-2" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label></div>
    </section>
    <div className="mt-5 space-y-4">
      {cards.map((card) => {
        const official = mockAdvisories.find((advisory) => advisory.region.includes('Marikina') ? card.area === 'Marikina River' : advisory.region.includes('National') && card.area !== 'Marikina River')
        // TODO: compare these community timestamps with official advisory timestamps when available.
        const count = votes[card.area] ?? { confirm: 0, dispute: 0 }
        return <article key={card.area} className="overflow-hidden rounded-2xl border border-[#315182] bg-[#10285b]">
          <div className="h-1.5" style={{ background: severityMeta[card.level].color }} />
          <div className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><span className="inline-flex rounded bg-[#3b2030] px-2 py-1 text-[10px] font-extrabold tracking-wider text-[#ffb2a3]">⚠️ COMMUNITY-GENERATED</span><h2 className="mt-2 font-display text-lg font-bold">{card.area}</h2></div><span className="text-xs text-[#A9B4CC]">{new Date(card.issuedAt).toLocaleString()}</span></div>
            <p className="mt-3 text-sm text-[#C4CEE2]">{card.reports.length} reports triggered this signal · {severityMeta[card.level].label} average severity · Affected area: {card.area}</p>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => vote(card.area, 'confirm')} className="rounded-lg border border-[#315182] px-3 py-2 text-xs">Confirm · {count.confirm}</button><button type="button" onClick={() => vote(card.area, 'dispute')} className="rounded-lg border border-[#315182] px-3 py-2 text-xs">Dispute · {count.dispute}</button><button type="button" onClick={() => shareCard(card.area, card.reports.length, card.level)} className="ml-auto flex items-center gap-1 rounded-lg border border-[#315182] px-3 py-2 text-xs"><Share2 />Share</button></div>
            <details className="mt-3 border-t border-[#315182] pt-3"><summary className="cursor-pointer text-sm font-semibold text-cyan">Compare with Official</summary><div className="mt-2 text-sm text-[#C4CEE2]">{official ? <><p>{official.issuingAgency}: {official.title}</p><p className="mt-1 text-xs text-[#A9B4CC]">Official timing comparison is not available for this report set.</p></> : <p>No advisory issued</p>}</div></details>
          </div>
        </article>
      })}
      {!cards.length && <p className="rounded-xl border border-[#315182] p-5 text-sm text-[#A9B4CC]">No community signals match these filters.</p>}
    </div>
  </main>
}
