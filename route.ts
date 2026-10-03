import { NextResponse } from 'next/server'

const DATASET_URL = 'https://datasets-server.huggingface.co/first-rows?dataset=bettergovph%2Fdpwh-transparency-data&config=default&split=train'

export async function GET() {
  try {
    const response = await fetch(DATASET_URL, { next: { revalidate: 900 } })
    if (!response.ok) return NextResponse.json({ error: 'DPWH dataset unavailable' }, { status: 502 })
    const payload = await response.json()
    const projects = (payload.rows ?? []).map((entry: { row: Record<string, unknown> }) => entry.row).filter((row: Record<string, unknown>) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)))
    return NextResponse.json({ projects, source: DATASET_URL, fetchedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json({ error: 'Unable to load DPWH projects' }, { status: 502 })
  }
}
