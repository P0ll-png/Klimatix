import type { Report, Severity, ReportStatus } from '@/lib/types'

export type ReportCluster = {
  lat: number
  lng: number
  reportCount: number
  aggregateSeverity: Severity
  aggregateConfidence: number
  highestStatus: ReportStatus
  memberIds: string[]
  weight: number
}

export function clusterReports(reports: Report[], zoom: number): ReportCluster[] {
  const cellSize = zoom <= 10 ? 0.04 : zoom <= 12 ? 0.02 : zoom <= 14 ? 0.01 : 0.005
  const cells = new Map<string, Report[]>()

  for (const report of reports) {
    const key = `${Math.floor(report.lat / cellSize)}:${Math.floor(report.lng / cellSize)}`
    const cell = cells.get(key) ?? []
    cell.push(report)
    cells.set(key, cell)
  }

  const severityRank: Record<Severity, number> = { PASSABLE: 0, MINOR: 1, MODERATE: 2, SEVERE: 3 }
  const statusRank: Record<ReportStatus, number> = { UNVERIFIED: 0, UNDER_REVIEW: 1, CONFIRMED: 2 }

  return [...cells.values()].map((members) => {
    const severity = members.reduce((highest, report) => severityRank[report.severity] > severityRank[highest] ? report.severity : highest, 'PASSABLE' as Severity)
    const status = members.reduce((highest, report) => statusRank[report.status] > statusRank[highest] ? report.status : highest, 'UNVERIFIED' as ReportStatus)
    const weight = members.reduce((sum, report) => sum + (report.upvoteCount + 1) * (report.confidence + 0.2), 0)

    return {
      lat: members.reduce((sum, report) => sum + report.lat, 0) / members.length,
      lng: members.reduce((sum, report) => sum + report.lng, 0) / members.length,
      reportCount: members.length,
      aggregateSeverity: severity,
      aggregateConfidence: members.reduce((sum, report) => sum + report.confidence, 0) / members.length,
      highestStatus: status,
      memberIds: members.map((report) => report.id),
      weight,
    }
  })
}
