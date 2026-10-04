'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { advisoryBarangays } from '@/lib/advisory'

type PipelineScorecard = {
  lguId: number
  name: string
  period_start: string
  period_end: string
  flood_reports_count: number
  advisories_issued: number
  advisories_followed: number
  advisories_not_followed: number
  avg_response_minutes: number | null
  score: number
}

export default function ScorecardsPage() {
  const [selected, setSelected] = useState(advisoryBarangays[0].id)
  const [search, setSearch] = useState('')
  const [following, setFollowing] = useState(false)
  const [liveScorecards, setLiveScorecards] = useState<PipelineScorecard[] | null>(null)
  const [liveAnnouncements, setLiveAnnouncements] = useState<Array<{ lguId: number; rainfallMm: number | null; rainfallWarning: string | null }>>([])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/announcements/pipeline', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Scorecard service unavailable.')
        const result = await response.json() as {
          scorecards: PipelineScorecard[]
          announcements: Array<{ lguId: number; rainfallMm: number | null; rainfallWarning: string | null }>
        }
        setLiveScorecards(result.scorecards)
        setLiveAnnouncements(result.announcements)
        if (result.scorecards[0]) {
          setSelected(String(result.scorecards[0].lguId))
          setSearch(result.scorecards[0].name)
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        toast.error(error instanceof Error ? error.message : 'Could not load live scorecards.')
      })
    return () => controller.abort()
  }, [])
  const municipality = advisoryBarangays.find((item) => item.id === selected) ?? advisoryBarangays[0]
  const scorecard = liveScorecards?.find((item) => String(item.lguId) === selected)
  const liveAnnouncement = liveAnnouncements.find((item) => item.lguId === scorecard?.lguId)
  const municipalityName = scorecard?.name ?? (liveScorecards === null ? municipality.name : 'No scorecard data yet')
  const score = scorecard?.score ?? (liveScorecards === null ? municipality.score : '—')
  // TODO: replace placeholder scorecard metrics with verified municipal datasets.
  const conditionCounts = { Good: 0, Fair: 0, Poor: 0, Missing: 0 }
  const infrastructureTotal = Object.values(conditionCounts).reduce((total, count) => total + count, 0)

  async function shareScorecard() {
    const title = `${municipalityName} community scorecard`
    const text = `Community scorecard for ${municipalityName}: ${score}/100.`
    try {
      if (navigator.share) {
        await navigator.share({ title, text })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${title}\n${text}`)
        toast.success('Scorecard copied to clipboard.')
      } else {
        toast.error('Sharing is not available in this browser.')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error('Could not share this scorecard.')
    }
  }

  return <main className="p-5 md:p-7">
    <p className="text-xs font-bold tracking-[.2em] text-cyan">MUNICIPALITY ACCOUNTABILITY</p>
    <h1 className="mt-2 font-display text-3xl font-black">Scorecards</h1>
    <label className="mt-5 block text-sm font-semibold">Search/select municipality<input className="mt-2 w-full p-3" list="scorecard-municipalities" value={search || municipalityName} onChange={(event) => { setSearch(event.target.value); const liveMatch = liveScorecards?.find((item) => item.name.toLowerCase() === event.target.value.toLowerCase()); const mockMatch = advisoryBarangays.find((item) => item.name.toLowerCase() === event.target.value.toLowerCase()); if (liveMatch) setSelected(String(liveMatch.lguId)); else if (mockMatch) setSelected(mockMatch.id) }} placeholder="Type a municipality" /><datalist id="scorecard-municipalities">{(liveScorecards ?? []).map((item) => <option value={item.name} key={item.lguId} />)}{!liveScorecards && advisoryBarangays.map((item) => <option value={item.name} key={item.id} />)}</datalist></label>
    <section className="mt-4 rounded-2xl border border-[#315182] bg-[#10285b] p-4"><div className="text-xs font-bold tracking-wider text-cyan">PROVINCE: METRO MANILA · POPULATION: — · AREA: —</div><div className="mt-3 flex items-end justify-between"><div><h2 className="font-display text-2xl font-black">{municipalityName}</h2><p className="mt-1 text-sm text-[#A9B4CC]">{scorecard ? 'Monthly operational scorecard' : `Community risk indicator: ${municipality.level}`}</p></div><div className="text-right"><strong className="text-4xl">{score}</strong><p className="text-xs text-[#A9B4CC]">Overall score · monthly followed-advisory rate</p></div></div>{scorecard && <p className="mt-2 text-xs text-[#A9B4CC]">Period: {scorecard.period_start} to {scorecard.period_end} · Score is followed / resolved advisories, as a percentage.</p>}</section>
    <section className="mt-4 space-y-3">
      <article className="rounded-2xl border border-[#315182] bg-[#10285b] p-4"><h2 className="font-bold">Flooding &amp; Rainfall History</h2><p className="mt-2 text-sm text-[#A9B4CC]">{scorecard ? `${scorecard.flood_reports_count} community reports this month (${scorecard.period_start} to ${scorecard.period_end}).` : liveScorecards === null ? `${municipality.reports.length} available community reports. Monthly pipeline data is not available yet.` : 'No monthly operational scorecard is available for this municipality yet.'}</p>{liveAnnouncement && <p className="mt-2 text-sm text-[#A9B4CC]">Latest rainfall: {liveAnnouncement.rainfallMm?.toFixed(1) ?? '0.0'} mm/hour{liveAnnouncement.rainfallWarning ? ` · ${liveAnnouncement.rainfallWarning} warning` : ''}.</p>}{!scorecard && liveScorecards === null && <ul className="mt-2 space-y-2 text-sm">{municipality.reports.slice(0, 3).map((report) => <li key={report.id} className="border-t border-[#315182] pt-2">{new Date(report.createdAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })} · {report.area} · {report.description}</li>)}</ul>}</article>
      <article className="rounded-2xl border border-[#315182] bg-[#10285b] p-4"><h2 className="font-bold">Announcement Timeliness</h2><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><Stat label="LGU advisories issued" value={scorecard ? String(scorecard.advisories_issued) : '—'} /><Stat label="Advisories followed" value={scorecard ? String(scorecard.advisories_followed) : '—'} /><Stat label="Not followed" value={scorecard ? String(scorecard.advisories_not_followed) : '—'} /><Stat label="Avg response (minutes)" value={scorecard?.avg_response_minutes === null || !scorecard ? '—' : String(scorecard.avg_response_minutes)} /></div><p className="mt-2 text-xs text-[#A9B4CC]">Monthly totals from recorded LGU advisories. The score is followed advisories divided by resolved (followed or not followed) advisories.</p></article>
      <article className="rounded-2xl border border-[#315182] bg-[#10285b] p-4"><h2 className="font-bold">Infrastructure Effectiveness</h2><p className="mt-2 text-sm text-[#A9B4CC]">{infrastructureTotal} audited infrastructure items</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm">{Object.entries(conditionCounts).map(([label, count]) => <div key={label} className="flex justify-between rounded-lg bg-[#0B1354] p-2"><span>{label}</span><strong>{count}</strong></div>)}</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0B1354]"><div className="h-full w-0 bg-[var(--severity-warning)]" /></div><p className="mt-2 text-sm text-[#A9B4CC]">Ghost project flags: 0 · Community rating: — · Trend: ► Stagnant</p><Link href="/map" className="mt-2 inline-flex text-sm text-cyan underline">View ghost project evidence</Link></article>
      <article className="rounded-2xl border border-[#315182] bg-[#10285b] p-4"><h2 className="font-bold">Transparency Score</h2><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><Stat label="Visible project signage" value="—" /><Stat label="Matches specifications" value="—" /><Stat label="Audit participation" value="—" /><Stat label="Open issues" value="0" /></div></article>
    </section>
    <footer className="mt-4 grid gap-2"><button type="button" disabled className="rounded-xl border border-[#315182] px-4 py-3 text-sm opacity-60">Download Report (PDF) · unavailable</button><button type="button" onClick={shareScorecard} className="rounded-xl border border-[#315182] px-4 py-3 text-sm">Share Scorecard</button><button type="button" aria-pressed={following} title="Following is stored locally in this prototype." onClick={() => setFollowing((value) => !value)} className="rounded-xl bg-[#2255CC] px-4 py-3 text-sm font-bold">{following ? 'Following Municipality' : 'Follow Municipality'}</button></footer>
  </main>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#0B1354] p-3"><div className="text-[10px] uppercase tracking-wider text-[#A9B4CC]">{label}</div><div className="mt-1 font-bold">{value}</div></div>
}
