type Lgu = { id: number; name: string; center_lat: number; center_lng: number }
type FloodReport = { lgu_id: number | null; lat: number | null; lng: number | null; severity: string | number | null; created_at: string }
type WeatherResponse = {
  current?: { time?: string; precipitation?: number | null }
  hourly?: { time?: string[]; precipitation?: Array<number | null> }
}
type WeatherObservation = {
  lgu_id: number
  source: 'openmeteo'
  observed_at: string
  rainfall_mm: number
  rainfall_intensity: string
  tcws_signal: null
  raw_payload: WeatherResponse
}
type AdvisoryValues = {
  flood_reports_count: number
  avg_severity: number
  peak_severity: string | null
  tier: 'MONITORED' | 'PREPARE' | 'ACT'
  rainfall_warning: string | null
  pipeline_updated_at: string
}
type AnnouncementRecord = AdvisoryValues & {
  lgu_id: number
  id?: string
  tcws_signal?: number | null
  lgu_announced_at?: string | null
  response_minutes?: number | null
  followed?: boolean | null
}
type AnnouncementView = {
  lguId: number
  area: string
  reportCount: number
  avgSeverity: number | null
  peakSeverity: number | null
  tier: 'MONITORED' | 'PREPARE' | 'ACT'
  rainfallWarning: string | null
  rainfallMm: number | null
  updatedAt: string | null
}
type LguAction = {
  lgu_id: number
  lgu_announced_at: string
  response_minutes: number | null
  followed: boolean | null
}
type ScorecardRow = {
  id: string
  lgu_id: number
  period_start: string
  period_end: string
  flood_reports_count: number
  advisories_issued: number
  advisories_followed: number
  advisories_not_followed: number
  avg_response_minutes: number | null
  score: number
}
type ScorecardView = Omit<ScorecardRow, 'id'> & { name: string }

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Pipeline requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  return { url: url.replace(/\/$/, ''), key }
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = getConfig()
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!response.ok) throw new Error(`Supabase pipeline request failed (${response.status}).`)
  if (response.status === 204) return undefined as T
  return await response.json() as T
}

function normalizeSeverity(value: string | number | null) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.min(4, value))
  const severity = String(value ?? '').toLowerCase()
  if (['severe', 'chest', 'above_head', 'critical', '4'].includes(severity)) return 4
  if (['moderate', 'waist', '3'].includes(severity)) return 3
  if (['minor', 'knee', '2'].includes(severity)) return 2
  if (['passable', 'ankle', '1'].includes(severity)) return 1
  return 0
}

function rainfallIntensity(rainfallMm: number) {
  if (rainfallMm >= 30) return 'HEAVY'
  if (rainfallMm >= 15) return 'MODERATE'
  if (rainfallMm >= 7.5) return 'LIGHT'
  return 'NONE'
}

function rainfallWarning(rainfallMm: number) {
  if (rainfallMm >= 30) return 'RED'
  if (rainfallMm >= 15) return 'ORANGE'
  if (rainfallMm >= 7.5) return 'YELLOW'
  return null
}

function parseWeatherTime(value: string) {
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`)
}

async function fetchWeather(lgus: Lgu[]) {
  const observations: WeatherObservation[] = []
  for (let index = 0; index < lgus.length; index += 25) {
    const batch = lgus.slice(index, index + 25)
    const params = new URLSearchParams({
      latitude: batch.map((lgu) => String(lgu.center_lat)).join(','),
      longitude: batch.map((lgu) => String(lgu.center_lng)).join(','),
      current: 'precipitation',
      hourly: 'precipitation',
      past_days: '1',
      forecast_days: '1',
      timezone: 'UTC',
    })
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Open-Meteo request failed (${response.status}).`)
    const data: unknown = await response.json()
    const results = Array.isArray(data) ? data as WeatherResponse[] : [data as WeatherResponse]
    if (results.length !== batch.length) throw new Error('Open-Meteo returned an unexpected number of locations.')

    results.forEach((result, offset) => {
      const currentTime = result.current?.time
      const currentDate = currentTime ? parseWeatherTime(currentTime) : new Date()
      const currentHour = currentDate.toISOString().slice(0, 13)
      const hourIndex = result.hourly?.time?.findIndex((time) => time.startsWith(currentHour)) ?? -1
      const hourlyPrecipitation = hourIndex >= 0 ? result.hourly?.precipitation?.[hourIndex] : null
      const precipitation = Number(hourlyPrecipitation ?? result.current?.precipitation ?? 0)
      const rainfallMm = Number.isFinite(precipitation) ? Math.max(0, precipitation) : 0
      observations.push({
        lgu_id: batch[offset].id,
        source: 'openmeteo',
        observed_at: currentDate.toISOString(),
        rainfall_mm: rainfallMm,
        rainfall_intensity: rainfallIntensity(rainfallMm),
        tcws_signal: null,
        raw_payload: result,
      })
    })
  }
  return observations
}

async function fetchRecentReports(since: string) {
  const reports: FloodReport[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const path = `flood_reports?select=lgu_id,lat,lng,severity,created_at&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc&limit=${pageSize}&offset=${offset}`
    const page = await supabaseRequest<FloodReport[]>(path)
    reports.push(...page)
    if (page.length < pageSize) return reports
  }
}

function nearestLgu(report: FloodReport, lgus: Lgu[]) {
  if (report.lgu_id !== null && lgus.some((lgu) => lgu.id === report.lgu_id)) return report.lgu_id
  if (report.lat === null || report.lng === null) return null
  let nearest: Lgu | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const lgu of lgus) {
    const distance = (lgu.center_lat - report.lat) ** 2 + (lgu.center_lng - report.lng) ** 2
    if (distance < bestDistance) {
      nearest = lgu
      bestDistance = distance
    }
  }
  return nearest?.id ?? null
}

function makeAdvisoryValues(reports: FloodReport[], rainfallMm: number, now: string): AdvisoryValues {
  const severities = reports.map((report) => normalizeSeverity(report.severity)).filter((value) => value > 0)
  const average = severities.length ? severities.reduce((sum, value) => sum + value, 0) / severities.length : 0
  const peak = severities.length ? Math.max(...severities) : 0
  const peakSeverity = (['', 'ankle', 'knee', 'waist', 'chest'] as const)[peak] || null
  const warning = rainfallWarning(rainfallMm)
  const tier: AdvisoryValues['tier'] = warning === 'RED' || peak === 4 || reports.length >= 5
    ? 'ACT'
    : warning === 'ORANGE' || average >= 3 || reports.length >= 3
      ? 'PREPARE'
      : 'MONITORED'
  return {
    flood_reports_count: reports.length,
    avg_severity: Number(average.toFixed(2)),
    peak_severity: peakSeverity,
    tier,
    rainfall_warning: warning,
    pipeline_updated_at: now,
  }
}

async function saveObservation(observations: WeatherObservation[]) {
  if (!observations.length) return
  await supabaseRequest<undefined>(
    'weather_observations',
    {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(observations),
    },
  )
}

async function saveAdvisory(lgu: Lgu, values: AdvisoryValues, existingId?: string) {
  if (existingId) {
    await supabaseRequest<undefined>(`alerto_advisories?id=eq.${encodeURIComponent(existingId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(values),
    })
    return
  }

  const record: AnnouncementRecord = {
    lgu_id: lgu.id,
    ...values,
    tcws_signal: null,
    lgu_announced_at: null,
    response_minutes: null,
    followed: false,
  }
  await supabaseRequest<undefined>('alerto_advisories', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(record),
  })
}

function periodFor(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

async function saveScorecard(lgu: Lgu, values: Omit<ScorecardRow, 'id' | 'lgu_id'>, existingId?: string) {
  if (existingId) {
    await supabaseRequest<undefined>(`lgu_scorecards?id=eq.${encodeURIComponent(existingId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(values),
    })
    return
  }
  await supabaseRequest<undefined>('lgu_scorecards', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ lgu_id: lgu.id, ...values }),
  })
}

async function forEachConcurrent<T>(items: T[], concurrency: number, action: (item: T) => Promise<void>) {
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      await action(items[index])
    }
  }))
}

export async function runAnnouncementPipeline() {
  const lgus = await supabaseRequest<Lgu[]>('lgus?select=id,name,center_lat,center_lng&order=id.asc')
  if (!lgus.length) throw new Error('No LGUs are available for the announcement pipeline.')

  const now = new Date()
  const observedAt = now.toISOString()
  const period = periodFor(now)
  const periodStart = new Date(`${period.start}T00:00:00.000Z`)
  const since = periodStart.toISOString()
  const periodEnd = `${period.end}T00:00:00.000Z`
  const [observations, periodReports, existingRecords, monthlyActions, existingScorecards] = await Promise.all([
    fetchWeather(lgus),
    fetchRecentReports(since),
    supabaseRequest<Array<{ id: string; lgu_id: number; pipeline_updated_at: string | null }>>(
      'alerto_advisories?select=id,lgu_id,pipeline_updated_at&order=pipeline_updated_at.desc.nullslast',
    ),
    supabaseRequest<LguAction[]>(
      `alerto_advisories?select=lgu_id,lgu_announced_at,response_minutes,followed&lgu_announced_at=gte.${encodeURIComponent(periodStart.toISOString())}&lgu_announced_at=lt.${encodeURIComponent(periodEnd)}`,
    ),
    supabaseRequest<Array<{ id: string; lgu_id: number }>>(
      `lgu_scorecards?select=id,lgu_id&period_start=eq.${period.start}&period_end=eq.${period.end}`,
    ),
  ])
  await saveObservation(observations)

  const reportsByLgu = new Map<number, FloodReport[]>()
  const recentReports = periodReports.filter((report) => Date.parse(report.created_at) >= now.getTime() - 24 * 60 * 60 * 1000)
  for (const report of recentReports) {
    const lguId = nearestLgu(report, lgus)
    if (lguId === null) continue
    reportsByLgu.set(lguId, [...(reportsByLgu.get(lguId) ?? []), report])
  }
  const reportsThisPeriodByLgu = new Map<number, number>()
  for (const report of periodReports) {
    const lguId = nearestLgu(report, lgus)
    if (lguId !== null) reportsThisPeriodByLgu.set(lguId, (reportsThisPeriodByLgu.get(lguId) ?? 0) + 1)
  }
  const rainfallByLgu = new Map(observations.map((observation) => [observation.lgu_id, observation.rainfall_mm]))
  const advisoryByLgu = new Map<number, string>()
  for (const advisory of existingRecords) if (!advisoryByLgu.has(advisory.lgu_id)) advisoryByLgu.set(advisory.lgu_id, advisory.id)
  const scorecardByLgu = new Map<number, string>()
  for (const scorecard of existingScorecards) if (!scorecardByLgu.has(scorecard.lgu_id)) scorecardByLgu.set(scorecard.lgu_id, scorecard.id)
  const actionsByLgu = new Map<number, LguAction[]>()
  for (const action of monthlyActions) actionsByLgu.set(action.lgu_id, [...(actionsByLgu.get(action.lgu_id) ?? []), action])

  await forEachConcurrent(lgus, 12, async (lgu) => saveAdvisory(
    lgu,
    makeAdvisoryValues(
      reportsByLgu.get(lgu.id) ?? [],
      rainfallByLgu.get(lgu.id) ?? 0,
      observedAt,
    ),
    advisoryByLgu.get(lgu.id),
  ))
  await forEachConcurrent(lgus, 12, async (lgu) => {
    const actions = actionsByLgu.get(lgu.id) ?? []
    const followed = actions.filter((action) => action.followed === true).length
    const notFollowed = actions.filter((action) => action.followed === false).length
    const responseTimes = actions.map((action) => action.response_minutes).filter((value): value is number => value !== null)
    const decided = followed + notFollowed
    await saveScorecard(lgu, {
      period_start: period.start,
      period_end: period.end,
      flood_reports_count: reportsThisPeriodByLgu.get(lgu.id) ?? 0,
      advisories_issued: actions.length,
      advisories_followed: followed,
      advisories_not_followed: notFollowed,
      avg_response_minutes: responseTimes.length
        ? Number((responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length).toFixed(2))
        : null,
      score: decided ? Math.round((followed / decided) * 100) : 0,
    }, scorecardByLgu.get(lgu.id))
  })
  return { lguCount: lgus.length, observationCount: observations.length, reportCount: recentReports.length, scorecardReportCount: periodReports.length, updatedAt: observedAt }
}

export async function fetchAnnouncements(): Promise<AnnouncementView[]> {
  const [lgus, advisories, observations] = await Promise.all([
    supabaseRequest<Lgu[]>('lgus?select=id,name&order=name.asc'),
    supabaseRequest<AnnouncementRecord[]>('alerto_advisories?select=lgu_id,flood_reports_count,avg_severity,peak_severity,tier,rainfall_warning,pipeline_updated_at&order=pipeline_updated_at.desc.nullslast'),
    supabaseRequest<Array<{ lgu_id: number; rainfall_mm: number | null; observed_at: string }>>('weather_observations?select=lgu_id,rainfall_mm,observed_at&order=observed_at.desc'),
  ])
  const lguById = new Map(lgus.map((lgu) => [lgu.id, lgu.name]))
  const advisoryByLgu = new Map<number, AnnouncementRecord>()
  for (const advisory of advisories) if (!advisoryByLgu.has(advisory.lgu_id)) advisoryByLgu.set(advisory.lgu_id, advisory)
  const weatherByLgu = new Map<number, { rainfallMm: number | null; observedAt: string }>()
  for (const observation of observations) if (!weatherByLgu.has(observation.lgu_id)) {
    weatherByLgu.set(observation.lgu_id, { rainfallMm: observation.rainfall_mm, observedAt: observation.observed_at })
  }

  return [...advisoryByLgu].map(([lguId, advisory]) => ({
    lguId,
    area: lguById.get(lguId) ?? `LGU ${lguId}`,
    reportCount: advisory.flood_reports_count ?? 0,
    avgSeverity: advisory.avg_severity ?? null,
    peakSeverity: normalizeSeverity(advisory.peak_severity) || null,
    tier: advisory.tier,
    rainfallWarning: advisory.rainfall_warning,
    rainfallMm: weatherByLgu.get(lguId)?.rainfallMm ?? null,
    updatedAt: advisory.pipeline_updated_at ?? weatherByLgu.get(lguId)?.observedAt ?? null,
  })).filter((announcement) => announcement.reportCount > 0 || announcement.rainfallWarning !== null)
}

export async function fetchScorecards(): Promise<ScorecardView[]> {
  const [lgus, scorecards] = await Promise.all([
    supabaseRequest<Lgu[]>('lgus?select=id,name&order=name.asc'),
    supabaseRequest<ScorecardRow[]>('lgu_scorecards?select=id,lgu_id,period_start,period_end,flood_reports_count,advisories_issued,advisories_followed,advisories_not_followed,avg_response_minutes,score&order=period_start.desc,lgu_id.asc'),
  ])
  const lguById = new Map(lgus.map((lgu) => [lgu.id, lgu.name]))
  const latestByLgu = new Map<number, ScorecardView>()
  for (const scorecard of scorecards) if (!latestByLgu.has(scorecard.lgu_id)) {
    const { id: _id, ...values } = scorecard
    latestByLgu.set(scorecard.lgu_id, { ...values, name: lguById.get(scorecard.lgu_id) ?? `LGU ${scorecard.lgu_id}` })
  }
  return [...latestByLgu.values()]
}
