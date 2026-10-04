'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { fetchReports } from '@/lib/reports'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { ArrowLeft, Crosshair, Layers, MapPin } from 'lucide-react'
import Link from 'next/link'
import { clusterReports, type ReportCluster } from '@/lib/clustering'
import { mockReports, severityMeta, statusMeta, type Report, type ReportStatus, type Severity } from '@/lib/types'
import { MAP_TILE_ATTRIBUTION, MAP_TILE_URL } from '@/lib/map-tiles'

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

export default function MapClient() {
  const [severity, setSeverity] = useState<Severity | 'ALL'>('ALL')
  const [status, setStatus] = useState<ReportStatus | 'ALL'>('ALL')
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [reports, setReports] = useState<Report[]>(mockReports)
  useEffect(() => { fetchReports().then(({ reports: loaded, fallback }) => { setReports(loaded); if (fallback) toast('Showing sample data.') }).catch(() => toast('Showing sample data.')) }, [])
  const now = Date.parse('2026-10-03T16:40:00.000Z')
  const filteredReports = reports.filter((report) => (severity === 'ALL' || report.severity === severity) && (status === 'ALL' || report.status === status) && now - Date.parse(report.createdAt) <= ({ '1h': 3600000, '6h': 21600000, '24h': 86400000 }[timeRange]))
  function openReport(report: Report) {
    window.dispatchEvent(new CustomEvent('klimatix:map-marker-selected', {
      detail: { kind: 'flood_report', id: report.id },
    }))
  }

  return <main className="map-shell"><header className="map-header"><Link href="/" className="map-brand"><ArrowLeft /> <span>KLIMATIX MAP</span></Link><div className="map-disclaimer">Community observation · Not official</div></header><section className="map-stage"><MapContainer center={center} zoom={11} minZoom={9} maxZoom={18} scrollWheelZoom zoomControl={false} className="leaflet-map"><TileLayer url={MAP_TILE_URL} attribution={MAP_TILE_ATTRIBUTION} /><MapContent reports={filteredReports} onSelect={openReport} onCluster={() => undefined} /></MapContainer><FilterBar {...{ severity, status, timeRange, setSeverity, setStatus, setTimeRange }} /><div className="map-legend"><div className="legend-title"><Layers /> Severity</div>{Object.entries(severityMeta).map(([key, value]) => <div className="legend-row" key={key}><span style={{ background: value.color }} />{value.label}<small>{value.depth}</small></div>)}</div><div className="map-disclaimer-banner"><MapPin />{reports.length} field signals · Always verify conditions locally. This map is community-reported and not an official emergency service.</div></section></main>
}
