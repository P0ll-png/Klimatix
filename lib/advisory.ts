import { mockAdvisories, mockReports, type Report } from '@/lib/types'

export type AdvisoryLevel = 'MONITORED' | 'PREPARE' | 'ACT'
export type BarangayRisk = { id: string; name: string; lat: number; lng: number; score: number; level: AdvisoryLevel; warning: string; reports: Report[] }

const barangays = [
  { id: 'marikina', name: 'Marikina', lat: 14.633, lng: 121.101, areas: ['Marikina River'] },
  { id: 'quezon-city', name: 'Quezon City', lat: 14.676, lng: 121.043, areas: ['Commonwealth Avenue', 'Aurora Boulevard'] },
  { id: 'manila', name: 'Manila', lat: 14.609, lng: 120.994, areas: ['España Boulevard'] },
  { id: 'pasig-taguig', name: 'Pasig–Taguig', lat: 14.547, lng: 121.068, areas: ['Pasig River Road', 'Taguig Creek'] },
]

function getScore(reports: Report[]) {
  if (!reports.length) return 18
  const weight = { PASSABLE: 12, MINOR: 34, MODERATE: 62, SEVERE: 88 } as const
  return Math.min(100, Math.round(Math.max(...reports.map((r) => weight[r.severity])) * 0.72 + reports.length * 4))
}
function riskFor(item: (typeof barangays)[number]): BarangayRisk {
  const reports = mockReports.filter((report) => item.areas.includes(report.area))
  const score = getScore(reports)
  return { ...item, score, reports, level: score >= 80 ? 'ACT' : score >= 40 ? 'PREPARE' : 'MONITORED', warning: mockAdvisories[0]?.title.replace('Heavy Rainfall Warning · ', '') || 'No active warning' }
}
export function getAdvisory(barangayId: string): BarangayRisk {
  return riskFor(barangays.find((item) => item.id === barangayId) || barangays[0])
}
export function getCityAdvisory() {
  const risks = barangays.map(riskFor)
  const critical = risks.filter((risk) => risk.level === 'ACT').length
  const elevated = risks.filter((risk) => risk.level !== 'MONITORED').length
  return critical >= 2 || elevated >= 3 ? { count: Math.max(critical, elevated), risks } : null
}
export const advisoryBarangays = barangays.map((item) => riskFor(item))
export function advisoryMessage(risk: BarangayRisk) {
  if (risk.level === 'MONITORED') return 'No action needed. Continue monitoring.'
  if (risk.level === 'PREPARE') return `Barangay ${risk.name} has reached a WATCH level of flood risk (${risk.score}/100), based on the ${risk.warning} rainfall warning and ${risk.reports.length} community reports. KLIMATIX suggests the LGU consider: (1) alerting the barangay disaster response team and putting it on standby, (2) inspecting and preparing evacuation centers, (3) reviewing class suspension for the next school day, and (4) issuing an advisory to residents in low-lying areas.`
  return `Barangay ${risk.name} has reached a CRITICAL level of flood risk (${risk.score}/100), based on the ${risk.warning} rainfall warning, ${risk.reports.length} community reports, and local infrastructure conditions. KLIMATIX recommends the LGU urgently consider: (1) preemptive evacuation of households in low-lying and riverside areas, (2) suspension of classes in affected areas, (3) opening evacuation centers and activating the barangay response team, and (4) issuing a public warning. Please verify conditions on the ground and follow official PAGASA and NDRRMC guidance before deciding.`
}
export function getBarangayCenter(id: string) { return getAdvisory(id) }
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) { const rad = Math.PI / 180; const dLat = (b.lat - a.lat) * rad; const dLng = (b.lng - a.lng) * rad; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) }
export { barangays }
export type { Report }
