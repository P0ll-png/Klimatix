'use client'

import dynamic from 'next/dynamic'
import { Camera, LocateFixed, UserRound, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { severityMeta, type Report, type Severity } from '@/lib/types'
import { createReport } from '@/lib/reports'

const ReportLocationMap = dynamic(() => import('./report-location-map'), { ssr: false })
const PHILIPPINES = { minLat: 4.5, maxLat: 21.5, minLng: 116, maxLng: 127 }

type ReportKind = 'Flooding' | 'Heavy Rain' | 'Light Rain' | 'Storm Surge'

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
  const [step, setStep] = useState(1)
  const [kind, setKind] = useState<ReportKind | null>(null)
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
    if (!kind) nextErrors.kind = 'Choose what is happening.'
    if (!severity) nextErrors.severity = kind === 'Heavy Rain' || kind === 'Light Rain' ? 'Choose a rainfall intensity before submitting.' : 'Choose a flood severity before submitting.'
    if (!description.trim()) nextErrors.description = 'Tell us what you are seeing.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const [lat, lng] = location!
    try {
      const report = await createReport({ lat, lng, severity: severity!, description: `${kind}: ${description.trim()}`, photoUrl: null })
      const reportWithPhoto = photoUrl ? { ...report, photoUrl } : report
      window.dispatchEvent(new CustomEvent('klimatix:report-created', { detail: reportWithPhoto }))
      onAdd(reportWithPhoto)
      toast.success('Flood report submitted', { description: photoUrl ? 'Your community observation is now on the map. Its photo is available in this session only.' : 'Your community observation is now on the map.' })
      onClose()
    } catch {
      toast.error('We could not submit your report', { description: 'Please try again in a moment.' })
    }
  }

  const rainfall = kind === 'Heavy Rain' || kind === 'Light Rain'
  const kindOptions: ReportKind[] = ['Flooding', 'Heavy Rain', 'Light Rain', 'Storm Surge']
  const rainfallOptions: { label: string; severity: Severity }[] = [
    { label: 'Light', severity: 'PASSABLE' },
    { label: 'Moderate', severity: 'MINOR' },
    { label: 'Heavy', severity: 'MODERATE' },
    { label: 'Torrential', severity: 'SEVERE' },
  ]

  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 md:items-center md:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="report-title" className="flex max-h-[94dvh] w-full max-w-xl flex-col rounded-t-3xl border border-[#315182] bg-[#10285b] shadow-2xl md:rounded-3xl">
      <header className="flex items-center justify-between border-b border-[#315182] p-5">
        <div><p className="text-xs font-bold tracking-[.18em] text-cyan">COMMUNITY OBSERVATION · STEP {step} OF 3</p><h2 id="report-title" className="mt-1 font-display text-2xl font-bold">Report a flood or rainfall</h2></div>
        <button type="button" onClick={onClose} className="text-[#A9B4CC]" aria-label="Close"><X /></button>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {step === 1 && <fieldset>
          <legend className="mb-3 text-sm font-semibold">What&apos;s happening?</legend>
          <div className="grid grid-cols-2 gap-2">{kindOptions.map((value) => <button type="button" key={value} onClick={() => { setKind(value); setSeverity(null); setErrors((current) => ({ ...current, kind: '' })) }} aria-pressed={kind === value} className={`min-h-16 rounded-xl border p-3 text-left font-bold ${kind === value ? 'border-cyan bg-[#183568]' : 'border-[#315182] bg-[#0B1354]'}`}>{value === 'Flooding' ? '🌊' : value === 'Storm Surge' ? '🌀' : '🌧️'} {value}</button>)}</div>
          {errors.kind && <p className="mt-2 text-sm text-[#ff8f91]">{errors.kind}</p>}
        </fieldset>}
        {step === 2 && <fieldset>
          <legend className="mb-3 text-sm font-semibold">{rainfall ? 'Rainfall intensity' : 'Flood depth'} <span className="text-[#ff8f91]">*</span></legend>
          {rainfall
            ? <div className="grid grid-cols-2 gap-2">{rainfallOptions.map((option) => <button type="button" key={option.label} onClick={() => setSeverity(option.severity)} aria-pressed={severity === option.severity} className={`rounded-xl border p-4 text-left ${severity === option.severity ? 'border-cyan bg-[#183568]' : 'border-[#315182] bg-[#0B1354]'}`}>{option.label}</button>)}</div>
            : <div className="grid grid-cols-2 gap-2">{(Object.keys(severityMeta) as Severity[]).map((value, index) => {
              const waterLevel = [18, 34, 54, 74][index]
              return <button type="button" key={value} onClick={() => setSeverity(value)} aria-pressed={severity === value} className={`rounded-xl border p-3 text-left ${severity === value ? 'border-cyan bg-[#183568]' : 'border-[#315182] bg-[#0B1354]'}`}>
                <span className="relative mb-2 flex h-20 items-center justify-center overflow-hidden rounded-lg bg-[#F1F5F9]">
                  <span className="absolute inset-x-0 bottom-0 opacity-65" style={{ height: `${waterLevel}%`, background: severityMeta[value].color }} />
                  <UserRound className="relative z-[1] h-12 w-12 text-[#172554]" strokeWidth={1.6} />
                  <span className="absolute right-2 top-2 h-1 w-9 rounded-full" style={{ top: `${100 - waterLevel}%`, background: severityMeta[value].color }} />
                </span>
                <span className="block text-sm font-bold" style={{ color: severityMeta[value].color }}>{severityMeta[value].depth}</span>
              </button>
            })}</div>}
          {errors.severity && <p className="mt-2 text-sm text-[#ff8f91]">{errors.severity}</p>}
        </fieldset>}
        {step === 3 && <>
          {!severity && <fieldset className="mb-4 rounded-xl border border-[#315182] p-3">
            <legend className="px-1 text-sm font-semibold">Estimate {rainfall ? 'rainfall intensity' : 'flood depth'} to submit</legend>
            <p className="mb-2 text-xs text-[#A9B4CC]">The current report service requires a severity value. You can skip Step 2 and choose it here instead.</p>
            {rainfall
              ? <div className="grid grid-cols-2 gap-2">{rainfallOptions.map((option) => <button type="button" key={option.label} onClick={() => setSeverity(option.severity)} aria-pressed={severity === option.severity} className="rounded-xl border border-[#315182] p-3">{option.label}</button>)}</div>
              : <div className="grid grid-cols-2 gap-2">{(Object.keys(severityMeta) as Severity[]).map((value) => <button type="button" key={value} onClick={() => setSeverity(value)} aria-pressed={severity === value} className="rounded-xl border border-[#315182] p-3 text-left"><span className="block text-sm font-bold" style={{ color: severityMeta[value].color }}>{severityMeta[value].label}</span><span className="text-xs text-[#A9B4CC]">{severityMeta[value].depth}</span></button>)}</div>}
          </fieldset>}
          <section><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Confirm location <span className="text-[#ff8f91]">*</span></h3><button type="button" onClick={useLocation} className="flex items-center gap-1 text-xs font-semibold text-cyan"><LocateFixed /> Use my location</button></div><ReportLocationMap value={location} onChange={(value) => { setLocation(value); setErrors((current) => ({ ...current, location: '' })) }} /><p className="mt-2 text-xs text-[#A9B4CC]">{location ? `${location[0].toFixed(5)}, ${location[1].toFixed(5)}` : 'Tap the map to drop a pin. You can drag it to adjust.'}</p>{locationError && <p className="mt-1 text-sm text-[#ff8f91]" id="location-error">{locationError}</p>}</section>
          <div className="mt-4"><label className="text-sm font-semibold" htmlFor="description">Short note <span className="text-[#ff8f91]">*</span></label><textarea id="description" value={description} onChange={(event) => setDescription(event.target.value.slice(0, 280))} aria-describedby={errors.description ? 'description-error' : 'description-help'} aria-invalid={Boolean(errors.description)} className="mt-2 min-h-24 w-full p-3" maxLength={280} placeholder="Describe the water depth, landmarks, and road conditions..." /><div id="description-help" className="mt-1 text-right text-xs text-[#A9B4CC]">{description.length}/280</div>{errors.description && <p id="description-error" className="mt-1 text-sm text-[#ff8f91]">{errors.description}</p>}</div>
          <div className="mt-4"><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(event) => handlePhoto(event.target.files?.[0])} /><button type="button" onClick={() => fileInput.current?.click()} className="flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#87CEEB]/50 bg-[#0B1354] text-sm text-cyan"><Camera />{photoUrl ? 'Photo added' : 'Add photo (optional)'}</button>{photoUrl && <div className="mt-2 flex items-center gap-3"><img src={photoUrl} alt="Selected flood report" className="size-16 rounded-lg object-cover" /><button type="button" onClick={() => { URL.revokeObjectURL(photoUrl); setPhotoUrl(null) }} className="text-sm text-[#ff8f91]">Remove</button></div>}{photoError && <p className="mt-2 text-sm text-[#ff8f91]">{photoError}</p>}<p className="mt-2 text-xs text-[#A9B4CC]">Location metadata is stripped from photos for your privacy.</p></div>
          <details className="mt-4 rounded-xl border border-[#315182] p-3"><summary className="cursor-pointer text-sm font-semibold">Additional Details</summary><p className="mt-2 text-xs text-[#A9B4CC]">No additional flood report fields are available.</p></details>
        </>}
      </div>
      <footer className="flex gap-2 border-t border-[#315182] p-5">
        {step > 1 && <button type="button" onClick={() => setStep((value) => value - 1)} className="flex-1 rounded-xl border border-[#315182] px-4 py-3 font-semibold">Back</button>}
        {step < 3
          ? <>{step === 2 && <button type="button" onClick={() => setStep(3)} className="flex-1 rounded-xl border border-[#315182] px-4 py-3 font-semibold">Skip for now</button>}<button type="button" disabled={(step === 1 && !kind) || (step === 2 && !severity)} onClick={() => setStep((value) => value + 1)} className="cta-orange flex-1 rounded-xl px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50">Continue</button></>
          : <button type="button" onClick={submit} disabled={!location || !severity || !kind || !description.trim()} className="cta-orange flex-1 rounded-xl px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50">Submit report</button>}
      </footer>
    </section>
  </div>
}
