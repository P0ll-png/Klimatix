export type DpwhProject = {
  contractId: string
  description: string
  category: string
  status: string
  budget: number
  amountPaid: number
  progress: number
  location?: { province?: string; region?: string }
  contractor: string
  startDate?: string
  completionDate?: string
  programName?: string
  isLive?: boolean
  latitude: number
  longitude: number
  reportCount?: number
  hasSatelliteImage?: boolean
}

export async function fetchDpwhProjects(): Promise<DpwhProject[]> {
  const response = await fetch('/api/dpwh-projects')
  if (!response.ok) throw new Error('DPWH data unavailable')
  const payload = await response.json() as { projects?: DpwhProject[] }
  return payload.projects ?? []
}
