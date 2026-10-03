'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { advisoryBarangays } from '@/lib/advisory'

export default function ScorecardsPage() {
  const [selected, setSelected] = useState(advisoryBarangays[0].id)
  const [search, setSearch] = useState('')
  const [following, setFollowing] = useState(false)
  const municipality = advisoryBarangays.find((item) => item.id === selected) ?? advisoryBarangays[0]
  // TODO: replace placeholder scorecard metrics with verified municipal datasets.
  const conditionCounts = { Good: 0, Fair: 0, Poor: 0, Missing: 0 }
  const infrastructureTotal = Object.values(conditionCounts).reduce((total, count) => total + count, 0)

  async function shareScorecard() {
    const title = `${municipality.name} community scorecard`
    const text = `Community scorecard for ${municipality.name}: ${municipality.score}/100.`
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
    <label className="mt-5 block text-sm font-semibold">Search/select municipality<input className="mt-2 w-full p-3" list="scorecard-municipalities" value={search || municipality.name} onChange={(event) => { setSearch(event.target.value); const match = advisoryBarangays.find((item) => item.name.toLowerCase() === event.target.value.toLowerCase()); if (match) setSelected(match.id) }} placeholder="Type a municipality" /><datalist id="scorecard-municipalities">{advisoryBarangays.map((item) => <option value={item.name} key={item.id} />)}</datalist></label>
    <section className="mt-4 rounded-2xl border border-[#315182] bg-[#10285b] p-4"><div className="text-xs font-bold tracking-wider text-cyan">PROVINCE: METRO MANILA · POPULATION: — · AREA: —</div><div className="mt-3 flex items-end justify-between"><div><h2 className="font-display text-2xl font-black">{municipality.name}</h2><p className="mt-1 text-sm text-[#A9B4CC]">Community risk indicator: {municipality.level}</p></div><div className="text-right"><strong className="text-4xl">{municipality.score}</strong><p className="text-xs text-[#A9B4CC]">Overall score · ► Stagnant</p></div></div></section>
    <section className="mt-4 space-y-3">
      <article className="rounded-2xl border border-[#315182] bg-[#10285b] p-4"><h2 className="font-bold">Flooding &amp; Rainfall History</h2><p className="mt-2 text-sm text-[#A9B4CC]">{municipality.reports.length} available community reports. Monthly history, rainfall accumulation, and year-over-year data are not available.</p><ul className="mt-2 space-y-2 text-sm">{municipality.reports.slice(0, 3).map((report) => <li key={report.id} className="border-t border-[#315182] pt-2">{new Date(report.createdAt).toLocaleDateString()} · {report.area} · {report.description}</li>)}</ul></article>
      <article className="rounded-2xl border border-[#315182] bg-[#10285b] p-4"><h2 className="font-bold">Announcement Timeliness</h2><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><Stat label="Community detected" value="—" /><Stat label="LGU announced" value="—" /><Stat label="Average gap" value="—" /><Stat label="LGU was first" value="—" /><Stat label="Community was first" value="—" /><Stat label="No official notice" value="—" /></div><p className="mt-2 text-xs text-[#A9B4CC]">Detection and official announcement timestamps are not available.</p></article>
      <article className="rounded-2xl border border-[#315182] bg-[#10285b] p-4"><h2 className="font-bold">Infrastructure Effectiveness</h2><p className="mt-2 text-sm text-[#A9B4CC]">{infrastructureTotal} audited infrastructure items</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm">{Object.entries(conditionCounts).map(([label, count]) => <div key={label} className="flex justify-between rounded-lg bg-[#0B1354] p-2"><span>{label}</span><strong>{count}</strong></div>)}</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0B1354]"><div className="h-full w-0 bg-[var(--severity-warning)]" /></div><p className="mt-2 text-sm text-[#A9B4CC]">Ghost project flags: 0 · Community rating: — · Trend: ► Stagnant</p><Link href="/map" className="mt-2 inline-flex text-sm text-cyan underline">View ghost project evidence</Link></article>
      <article className="rounded-2xl border border-[#315182] bg-[#10285b] p-4"><h2 className="font-bold">Transparency Score</h2><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><Stat label="Visible project signage" value="—" /><Stat label="Matches specifications" value="—" /><Stat label="Audit participation" value="—" /><Stat label="Open issues" value="0" /></div></article>
    </section>
    <footer className="mt-4 grid gap-2"><button type="button" disabled className="rounded-xl border border-[#315182] px-4 py-3 text-sm opacity-60">Download Report (PDF) · unavailable</button><button type="button" onClick={shareScorecard} className="rounded-xl border border-[#315182] px-4 py-3 text-sm">Share Scorecard</button><button type="button" aria-pressed={following} title="Following is stored locally in this prototype." onClick={() => setFollowing((value) => !value)} className="rounded-xl bg-[#2255CC] px-4 py-3 text-sm font-bold">{following ? 'Following Municipality' : 'Follow Municipality'}</button></footer>
  </main>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#0B1354] p-3"><div className="text-[10px] uppercase tracking-wider text-[#A9B4CC]">{label}</div><div className="mt-1 font-bold">{value}</div></div>
}
