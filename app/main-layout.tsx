'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState } from 'react'
import { BarChart3, Bell, Map, Plus, UserRound, Waves, X } from 'lucide-react'
import MapLoader from './map/map-loader'
import ReportForm from '@/components/reports/report-form'
import InfrastructureAuditForm from '@/components/reports/infrastructure-audit-form'
import { AuthProvider, useAuth } from '@/components/auth/auth-provider'

const navigation = [
  { href: '/', label: 'Map', Icon: Map },
  { href: '/announcements', label: 'Announcements', Icon: Bell },
  { href: '/scorecards', label: 'Scorecards', Icon: BarChart3 },
  { href: '/profile', label: 'Profile', Icon: UserRound },
]

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [reportMenuOpen, setReportMenuOpen] = useState(false)
  const [reportType, setReportType] = useState<'flood' | 'infrastructure' | null>(null)
  const [expanded, setExpanded] = useState(false)
  const pointerStart = useRef<number | null>(null)
  const isMap = pathname === '/' || pathname === '/map'
  const { user, verified, requireVerified, openAccount } = useAuth()

  return (
    <div className="app-shell">
      <div className="app-map-background" aria-label="Interactive flood map">
        <MapLoader />
      </div>
      <nav className="app-navigation" aria-label="Main navigation">
        <Link href="/" className="app-nav-brand" aria-label="Klimatix home"><Waves /></Link>
        {navigation.map(({ href, label, Icon }) => {
          const active = href === '/' ? isMap : pathname.startsWith(href)
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined} aria-label={label} title={label} className={`app-nav-link${active ? ' is-active' : ''}`}>
            <Icon /><span>{label}</span>
          </Link>
        })}
        <button type="button" onClick={openAccount} aria-label={verified ? 'Account verified' : 'Sign in'} title={verified ? user?.email ?? user?.phone ?? 'Verified account' : 'Sign in to report or vote'} className="app-nav-link">
          <UserRound /><span>{verified ? 'Account' : 'Sign in'}</span>
        </button>
      </nav>
      {!isMap && <section className={`app-route-panel${expanded ? ' is-expanded' : ''}`}>
        <button type="button" className="app-panel-handle" aria-label={expanded ? 'Collapse panel' : 'Expand panel'} onPointerDown={(event) => { pointerStart.current = event.clientY }} onPointerUp={(event) => {
          const distance = (pointerStart.current ?? event.clientY) - event.clientY
          if (Math.abs(distance) > 24) setExpanded(distance > 0)
          else setExpanded((value) => !value)
          pointerStart.current = null
        }} />
        {children}
      </section>}
      {reportType === null && <div className="app-report-actions">
        {reportMenuOpen && <div className="app-report-menu" role="group" aria-label="Choose report type">
          <button type="button" onClick={() => requireVerified(() => { setReportMenuOpen(false); setReportType('flood') })}>🌊 Flood / Rainfall Report</button>
          <button type="button" onClick={() => requireVerified(() => { setReportMenuOpen(false); setReportType('infrastructure') })}>🧱 Infrastructure Audit</button>
        </div>}
        <button type="button" className="app-report-fab" aria-label="Report" aria-expanded={reportMenuOpen} onClick={() => requireVerified(() => setReportMenuOpen((open) => !open))}>
          {reportMenuOpen ? <X /> : <Plus />}<span>Report</span>
        </button>
      </div>}
      {reportType === 'flood' && <ReportForm onClose={() => setReportType(null)} onAdd={() => undefined} />}
      {reportType === 'infrastructure' && <InfrastructureAuditForm onClose={() => setReportType(null)} />}
    </div>
  )
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><MainLayoutContent>{children}</MainLayoutContent></AuthProvider>
}
