import { timingSafeEqual } from 'node:crypto'
import { fetchAnnouncements, fetchScorecards, runAnnouncementPipeline } from '@/lib/pipeline/announcements'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization') ?? ''
  const expected = secret ? `Bearer ${secret}` : ''
  const providedBytes = Buffer.from(authorization)
  const expectedBytes = Buffer.from(expected)
  return Boolean(secret) && providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes)
}

export async function GET(request: Request) {
  try {
    if (authorized(request)) {
      const result = await runAnnouncementPipeline()
      return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
    }
    const [announcements, scorecards] = await Promise.all([fetchAnnouncements(), fetchScorecards()])
    return Response.json({ announcements, scorecards }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to fetch pipeline announcements:', error)
    return Response.json({ error: 'Unable to load announcements.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

  try {
    const result = await runAnnouncementPipeline()
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Announcement pipeline failed:', error)
    return Response.json({ error: 'Announcement pipeline update failed.' }, { status: 500 })
  }
}
