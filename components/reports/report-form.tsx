'use client'

import dynamic from 'next/dynamic'
import { Camera, LocateFixed, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { severityMeta, type Report, type Severity } from '@/lib/types'
import { createReport } from '@/lib/reports'

const ReportLocationMap = dynamic(() => import('./report-location-map'), { ssr: false })
const PHILIPPINES = { minLat: 4.5, maxLat: 21.5, minLng: 116, maxLng: 127 }

type FormReport = Report & { photoUrl?: string }

function validLocation(location: [number, number] | null) {
  return Boolean(location && location[0] >= PHILIPPINES.minLat && location[0] <= PHILIPPINES.maxLat && location[1] >= PHILIPPINES.minLng && location[1] <= PHILIPPINES.maxLng)
}

async function stripPhoto(file: File) {
  const image = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  canvas.getContext('2d')?.drawImage(image, 0, 0)
  return new Promise<string>((resolve) => canvas.toBlob((blob) => resolve(URL.createObjectURL(blob ?? file)), 'image/webp', 0.9))
}

export default function ReportForm({ onClose, onAdd }: { onClose: () => void; onAdd: (report: Report) => void }) {
  const [severity, setSeverity] = useState<Severity | null>(null)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<[number, number] | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInput = useRef<HTMLInputElement>(null)
  const locationError = location && !validLocation(location) ? 'Please pick a location within the Philippines.' : errors.location

  function useLocation() {
    if (!navigator.geolocation) return setErrors((current) => ({ ...current, location: 'Location is not available on this device.' }))
    navigator.geolocation.getCurrentPosition(({ coords }) => setLocation([coords.latitude, coords.longitude]), () => setErrors((current) => ({ ...current, location: 'We could not access your location. Please tap the map instead.' })))
  }

  async function handlePhoto(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setPhotoError('Please choose a JPG, PNG, or WebP image.')
    if (file.size > 5 * 1024 * 1024) return setPhotoError('That image is larger than 5MB. Please choose a smaller photo.')
    setPhotoError('')
    setPhotoUrl(await stripPhoto(file))
  }

  async function submit() {
    const nextErrors: Record<string, string> = {}
    if (!validLocation(location)) nextErrors.location = 'Please pick a location within the Philippines.'
    if (!severity) nextErrors.severity = 'Choose a flood severity.'
    if (!description.trim()) nextErrors.description = 'Tell us what you are seeing.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const [lat, lng] = location!
    try {
      const report = await createReport({ lat, lng, severity: severity!, description: description.trim(), photoUrl: null })
      onAdd(report)
      toast.success('Flood report submitted', { description: 'Your community observation is now on the map.' })
      onClose()
    } catch {
      toast.error('We could not submit your report', { description: 'Please try again in a moment.' })
    }
  }

  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 md:items-center md:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section role="dialog" aria-modal="true" aria-labelledby="report-title" className="flex max-h-[94vh] w-full max-w-xl flex-col rounded-t-3xl border border-[#315182] bg-[#10285b] shadow-2xl md:rounded-3xl"><div className="flex items-center justify-between border-b border-[#315182] p-6"><div><p className="text-xs font-bold tracking-[.18em] text-cyan">COMMUNITY OBSERVATION</p><h2 id="report-title" className="mt-1 font-display text-2xl font-bold">Report a flood</h2></div><button onClick={onClose} className="text-[#A9B4CC]" aria-label="Close"><X /></button></div><div className="flex-1 overflow-y-auto p-6"><fieldset><legend className="mb-3 text-sm font-semibold">Flood severity <span className="text-[#ff8f91]">*</span></legend><div className="grid grid-cols-2 gap-2">{(Object.keys(severityMeta) as Severity[]).map((value) => <button type="button" key={value} onClick={() => setSeverity(value)} aria-pressed={severity === value} className={`rounded-xl border p-3 text-left ${severity === value ? 'border-cyan bg-[#183568]' : 'border-[#315182] bg-[#0B1354]'}`}><span className="block text-sm font-bold" style={{ color: severityMeta[value].color }}>{severityMeta[value].label}</span><span className="text-xs text-[#A9B4CC]">{severityMeta[value].depth}</span></button>)}</div>{errors.severity && <p className="mt-2 text-sm text-[#ff8f91]">{errors.severity}</p>}</fieldset><section className="mt-5"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Where is it? <span className="text-[#ff8f91]">*</span></h3><button type="button" onClick={useLocation} className="flex items-center gap-1 text-xs font-semibold text-cyan"><LocateFixed /> Use my location</button></div><ReportLocationMap value={location} onChange={(value) => { setLocation(value); setErrors((current) => ({ ...current, location: '' })) }} /><p className="mt-2 text-xs text-[#A9B4CC]">{location ? `${location[0].toFixed(5)}, ${location[1].toFixed(5)}` : 'Tap the map to drop a pin. You can drag it to adjust.'}</p>{locationError && <p className="mt-1 text-sm text-[#ff8f91]" id="location-error">{locationError}</p>}</section><div className="mt-5"><label className="text-sm font-semibold" htmlFor="description">What are you seeing? <span className="text-[#ff8f91]">*</span></label><textarea id="description" value={description} onChange={(event) => setDescription(event.target.value.slice(0, 500))} aria-describedby={errors.description ? 'description-error' : 'description-help'} aria-invalid={Boolean(errors.description)} className="mt-2 min-h-28 w-full p-3" placeholder="Describe the water depth, landmarks, and road conditions..."/><div id="description-help" className="mt-1 text-right text-xs text-[#A9B4CC]">{description.length}/500</div>{errors.description && <p id="description-error" className="mt-1 text-sm text-[#ff8f91]">{errors.description}</p>}</div><div className="mt-5"><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => handlePhoto(event.target.files?.[0])} /><button type="button" onClick={() => fileInput.current?.click()} className="flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#87CEEB]/50 bg-[#0B1354] text-sm text-cyan"><Camera />{photoUrl ? 'Photo added' : 'Tap to add photo'}</button>{photoUrl && <div className="mt-2 flex items-center gap-3"><img src={photoUrl} alt="Selected flood report" className="size-16 rounded-lg object-cover" /><button type="button" onClick={() => { URL.revokeObjectURL(photoUrl); setPhotoUrl(null) }} className="text-sm text-[#ff8f91]">Remove</button></div>}{photoError && <p className="mt-2 text-sm text-[#ff8f91]">{photoError}</p>}<p className="mt-2 text-xs text-[#A9B4CC]">Location metadata is stripped from photos for your privacy.</p></div></div><div className="border-t border-[#315182] p-6"><button type="button" onClick={submit} disabled={!location || !severity || !description.trim()} className="cta-orange w-full rounded-xl px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50">Submit report</button></div></section></div>
}
