'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { fetchReports, upvoteReport } from '@/lib/reports'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { ArrowLeft, Crosshair, Layers, MapPin, X } from 'lucide-react'
import Link from 'next/link'
import { clusterReports, type ReportCluster } from '@/lib/clustering'
import { mockReports, severityMeta, statusMeta, timeAgo, type Report, type ReportStatus, type Severity } from '@/lib/types'
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL } from '@/lib/map-tiles'
import { useAuth } from '@/components/auth/auth-provider'

type TimeRange = '1h' | '6h' | '24h'
const center: [number, number] = [14.5995, 120.9842]

function severityIcon(severity: Severity, count?: number) {
  const color = severityMeta[severity].color
  const label = count ? `<span class="cluster-count">${count}</span>` : ''
  return L.divIcon({ className: 'klimatix-marker', html: `<span style="--marker-color:${color}" class="marker-core">${label}</span>`, iconSize: count ? [48, 48] : [30, 30], iconAnchor: count ? [24, 24] : [15, 15] })
}

function MapEvents({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({ zoomend: (event) => onZoom(event.target.getZoom()) })
  return null
}

function RecenterButton() {
  const map = useMap()
  return <button type="button" aria-label="Recenter map" onClick={() => map.setView(center, 11)} className="map-control"><Crosshair /></button>
}

function MapContent({ reports, onSelect, onCluster }: { reports: Report[]; onSelect: (report: Report) => void; onCluster: (cluster: ReportCluster) => void }) {
  const [zoom, setZoom] = useState(11)
  const clusters = useMemo(() => clusterReports(reports, zoom), [reports, zoom])
  const reportById = new Map(reports.map((report) => [report.id, report]))

  return <>
    <MapEvents onZoom={setZoom} />
    {clusters.map((cluster) => cluster.reportCount === 1 ? (
      <Marker key={cluster.memberIds[0]} position={[cluster.lat, cluster.lng]} icon={severityIcon(cluster.aggregateSeverity)} eventHandlers={{ click: () => onSelect(reportById.get(cluster.memberIds[0])!) }} />
    ) : (
      <Marker key={cluster.memberIds.join('-')} position={[cluster.lat, cluster.lng]} icon={severityIcon(cluster.aggregateSeverity, cluster.reportCount)} eventHandlers={{ click: (event) => { event.target._map.setView([cluster.lat, cluster.lng], Math.min(event.target._map.getZoom() + 2, 17)) } }} />
    ))}
  </>
}

function FilterBar({ severity, status, timeRange, setSeverity, setStatus, setTimeRange }: { severity: Severity | 'ALL'; status: ReportStatus | 'ALL'; timeRange: TimeRange; setSeverity: (value: Severity | 'ALL') => void; setStatus: (value: ReportStatus | 'ALL') => void; setTimeRange: (value: TimeRange) => void }) {
  return <div className="map-filters" aria-label="Map filters">
    <select aria-label="Filter by severity" value={severity} onChange={(event) => setSeverity(event.target.value as Severity | 'ALL')}><option value="ALL">All severity</option>{Object.entries(severityMeta).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select>
    <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as ReportStatus | 'ALL')}><option value="ALL">All status</option>{Object.entries(statusMeta).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select>
    <div className="range-toggle" aria-label="Filter by time range">{(['1h', '6h', '24h'] as TimeRange[]).map((range) => <button type="button" key={range} aria-pressed={timeRange === range} onClick={() => setTimeRange(range)}>{range}</button>)}</div>
  </div>
}

function ReportDrawer({ report, onClose, onUpvote }: { report: Report; onClose: () => void; onUpvote: () => void }) {
  return <aside className="report-drawer" aria-label="Report details">
    <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">FIELD REPORT · {report.area}</p><h2>{severityMeta[report.severity].label} flooding</h2></div><button type="button" className="icon-button" aria-label="Close report details" onClick={onClose}><X /></button></div>
    {(report as Report & { photoUrl?: string }).photoUrl ? <img className="report-photo object-cover" src={(report as Report & { photoUrl?: string }).photoUrl} alt={`Photo from ${report.handle}`} /> : <div className="report-photo" aria-label="Community report photo">{report.severity === 'SEVERE' ? 'Flooded road reported' : 'Field observation photo'}<span>Photo from {report.handle}</span></div>}
    <p className="report-description">{report.description}</p>
    <div className="detail-row"><span>Status</span><strong style={{ color: statusMeta[report.status].color }}>{statusMeta[report.status].label}</strong></div>
    <div className="confidence"><div className="detail-row"><span>Community confidence</span><strong>{Math.round(report.confidence * 100)}%</strong></div><div className="confidence-track"><span style={{ width: `${report.confidence * 100}%` }} /></div></div>
    <div className="detail-row"><span>{report.upvoteCount} community upvotes</span><span>{timeAgo(report.createdAt)}</span></div>
    <button type="button" className="upvote-button" onClick={onUpvote}>I see this too <span>{report.upvoteCount}</span></button>
    <p className="report-handle">Reported by <strong>{report.handle}</strong></p>
  </aside>
}

export default function MapClient() {
  const { requireVerified } = useAuth()
  const [severity, setSeverity] = useState<Severity | 'ALL'>('ALL')
  const [status, setStatus] = useState<ReportStatus | 'ALL'>('ALL')
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [selected, setSelected] = useState<Report | null>(null)
  const [reports, setReports] = useState<Report[]>(mockReports)
  const [upvotes, setUpvotes] = useState<Record<string, number>>({})
  useEffect(() => { fetchReports().then(({ reports: loaded, fallback }) => { setReports(loaded); if (fallback) toast('Showing sample data.') }).catch(() => toast('Showing sample data.')) }, [])
  const now = Date.parse('2026-10-03T16:40:00.000Z')
  const filteredReports = reports.filter((report) => (severity === 'ALL' || report.severity === severity) && (status === 'ALL' || report.status === status) && now - Date.parse(report.createdAt) <= ({ '1h': 3600000, '6h': 21600000, '24h': 86400000 }[timeRange]))
  const selectedWithUpvotes = selected ? { ...selected, upvoteCount: selected.upvoteCount + (upvotes[selected.id] ?? 0) } : null
  const selectedId = selected?.id

  return <main className="map-shell"><header className="map-header"><Link href="/" className="map-brand"><ArrowLeft /> <span>KLIMATIX MAP</span></Link><div className="map-disclaimer">Community observation · Not official</div></header><section className="map-stage"><MapContainer center={center} zoom={11} minZoom={9} maxZoom={18} scrollWheelZoom zoomControl={false} className="leaflet-map"><TileLayer url={MAP_TILE_URL} attribution={MAP_TILE_ATTRIBUTION} /><MapContent reports={filteredReports} onSelect={setSelected} onCluster={() => undefined} /></MapContainer><FilterBar {...{ severity, status, timeRange, setSeverity, setStatus, setTimeRange }} /><div className="map-legend"><div className="legend-title"><Layers /> Severity</div>{Object.entries(severityMeta).map(([key, value]) => <div className="legend-row" key={key}><span style={{ background: value.color }} />{value.label}<small>{value.depth}</small></div>)}</div><div className="map-disclaimer-banner"><MapPin />{reports.length} field signals · Always verify conditions locally. This map is community-reported and not an official emergency service.</div>{selectedWithUpvotes && <ReportDrawer report={selectedWithUpvotes} onClose={() => setSelected(null)} onUpvote={() => requireVerified(() => {
    if (!selectedId || !selected) return
    void upvoteReport(selectedId).then((updated) => {
      setReports((current) => current.map((report) => report.id === selectedId ? updated : report))
      setUpvotes((current) => ({ ...current, [selectedId]: updated.upvoteCount - selected.upvoteCount }))
    }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Unable to record your vote.'))
  })} />}</section></main>
}
