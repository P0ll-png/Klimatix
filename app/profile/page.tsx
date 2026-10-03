import Link from 'next/link'
import { Bell, Info, ShieldCheck } from 'lucide-react'

export default function ProfilePage() {
  return <main className="p-5 md:p-7">
    <p className="text-xs font-bold tracking-[.2em] text-cyan">ACCOUNT &amp; SETTINGS</p>
    <h1 className="mt-2 font-display text-3xl font-black">Profile</h1>
    <section className="mt-5 rounded-2xl border border-[#315182] bg-[#10285b] p-5"><div className="grid size-14 place-items-center rounded-full bg-[#183568] text-cyan"><ShieldCheck /></div><h2 className="mt-3 font-bold">Community member</h2><p className="mt-1 text-sm text-[#A9B4CC]">Your reports and activity are shared with the Klimatix community.</p></section>
    <nav className="mt-4 space-y-2" aria-label="More sections">
      <Link className="flex items-center gap-3 rounded-xl border border-[#315182] bg-[#10285b] p-4" href="/dashboard"><Info className="text-cyan" />Flood intelligence dashboard</Link>
      <Link className="flex items-center gap-3 rounded-xl border border-[#315182] bg-[#10285b] p-4" href="/alerto"><Bell className="text-cyan" />LGU Alerto and evacuation centers</Link>
      <Link className="flex items-center gap-3 rounded-xl border border-[#315182] bg-[#10285b] p-4" href="/info"><Info className="text-cyan" />Disaster information and hotlines</Link>
      <Link className="flex items-center gap-3 rounded-xl border border-[#315182] bg-[#10285b] p-4" href="/alerto/announcement"><Bell className="text-cyan" />LGU announcement drafting</Link>
    </nav>
  </main>
}
