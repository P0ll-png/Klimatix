'use client'

import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { toast } from 'sonner'

const ReportLocationMap = dynamic(() => import('./report-location-map'), { ssr: false })

const infrastructureTypes = ['Floodwall', 'Drainage', 'Bridge', 'Pump Station', 'Spillway', 'Other']
const conditions = [
  { label: 'Good', color: 'var(--severity-safe)' },
  { label: 'Fair', color: 'var(--severity-advisory)' },
  { label: 'Poor', color: 'var(--severity-warning)' },
  { label: 'Missing / Ghost Project', color: 'var(--severity-missing)' },
]

export default function InfrastructureAuditForm({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [type, setType] = useState('')
  const [condition, setCondition] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [location, setLocation] = useState<[number, number] | null>(null)
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [signage, setSignage] = useState('')
  const [signPhoto, setSignPhoto] = useState<File | null>(null)
  const [rating, setRating] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  function addPhotos(files: FileList | null) {
    if (!files) return
    const accepted = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (accepted.length !== files.length) toast.error('Choose image files for audit evidence.')
    setPhotos((current) => [...current, ...accepted].slice(0, 5))
  }

  function finishDraft() {
    toast.info('Infrastructure audit submission is not connected. This draft will be discarded when closed.')
    onClose()
  }

  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 md:items-center md:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="audit-title" className="flex max-h-[94dvh] w-full max-w-xl flex-col rounded-t-3xl border border-[#315182] bg-[#10285b] shadow-2xl md:rounded-3xl">
      <header className="flex items-center justify-between border-b border-[#315182] p-5">
        <div><p className="text-xs font-bold tracking-[.18em] text-cyan">COMMUNITY INFRASTRUCTURE AUDIT · STEP {step} OF 4</p><h2 id="audit-title" className="mt-1 font-display text-2xl font-bold">Audit infrastructure</h2></div>
        <button type="button" onClick={onClose} aria-label="Close audit" className="text-[#A9B4CC]"><X /></button>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {step === 1 && <fieldset><legend className="mb-3 font-semibold">What infrastructure?</legend><div className="grid grid-cols-2 gap-2">{infrastructureTypes.map((item) => <button type="button" key={item} aria-pressed={type === item} onClick={() => setType(item)} className={`rounded-xl border p-4 text-left ${type === item ? 'border-cyan bg-[#183568]' : 'border-[#315182]'}`}>{item}</button>)}</div></fieldset>}
        {step === 2 && <fieldset><legend className="mb-3 font-semibold">Current condition?</legend><div className="grid gap-2 sm:grid-cols-2">{conditions.map((item) => <button type="button" key={item.label} aria-pressed={condition === item.label} onClick={() => setCondition(item.label)} className={`rounded-xl border p-4 text-left ${condition === item.label ? 'border-cyan bg-[#183568]' : 'border-[#315182]'}`}><span className="mr-2 inline-block size-3 rounded-full" style={{ background: item.color }} />{item.label}</button>)}</div></fieldset>}
        {step === 3 && <div className="space-y-4">
          <section><h3 className="mb-2 font-semibold">Evidence photos <span className="text-[#ff8f91]">*</span></h3><input ref={fileInput} type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(event) => addPhotos(event.target.files)} /><button type="button" onClick={() => fileInput.current?.click()} className="flex min-h-16 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#87CEEB]/50 text-cyan"><Camera />Add photos ({photos.length}/5)</button><div className="mt-2 flex flex-wrap gap-2">{photos.map((photo, index) => <span key={`${photo.name}-${index}`} className="rounded-lg bg-[#183568] px-3 py-2 text-xs">{photo.name}</span>)}</div><p className="mt-1 text-xs text-[#A9B4CC]">At least one photo is required. Maximum 5.</p></section>
          <section><h3 className="mb-2 font-semibold">Confirm location on map</h3><ReportLocationMap value={location} onChange={setLocation} /></section>
          <label className="block text-sm font-semibold">Describe the issue<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 min-h-24 w-full p-3" /></label>
          <label className="block text-sm font-semibold">How long has it been like this?<select value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-2 w-full p-3"><option value="">Select duration</option>{['Days', 'Weeks', 'Months', 'Years'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <fieldset><legend className="mb-2 text-sm font-semibold">Visible project sign/marker?</legend><div className="flex gap-2">{['Yes', 'No'].map((item) => <button type="button" key={item} aria-pressed={signage === item} onClick={() => setSignage(item)} className={`rounded-lg border px-5 py-2 ${signage === item ? 'border-cyan bg-[#183568]' : 'border-[#315182]'}`}>{item}</button>)}</div><label className="mt-2 block text-xs text-cyan">Optional sign photo<input type="file" accept="image/*" capture="environment" onChange={(event) => setSignPhoto(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs" /></label>{signPhoto && <p className="mt-1 text-xs text-[#A9B4CC]">{signPhoto.name}</p>}</fieldset>
          <details className="rounded-xl border border-[#315182] p-3"><summary className="cursor-pointer text-sm font-semibold">Additional Details</summary><p className="mt-2 text-xs text-[#A9B4CC]">No other infrastructure audit fields are currently available.</p></details>
        </div>}
        {step === 4 && <div><h3 className="font-semibold">Does this infrastructure match what was promised or expected?</h3><div className="mt-4 flex gap-2" role="group" aria-label="Transparency rating">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} star${value > 1 ? 's' : ''}`} aria-pressed={rating === value} onClick={() => setRating(value)} className={`rounded-lg border px-4 py-3 text-xl ${rating >= value ? 'border-[#F4C542] text-[#F4C542]' : 'border-[#315182] text-[#A9B4CC]'}`}>★</button>)}</div></div>}
      </div>
      <footer className="flex gap-2 border-t border-[#315182] p-5">
        {step > 1 && <button type="button" onClick={() => setStep((value) => value - 1)} className="flex-1 rounded-xl border border-[#315182] px-4 py-3 font-semibold">Back</button>}
        {step < 4 ? <button type="button" disabled={(step === 1 && !type) || (step === 2 && !condition) || (step === 3 && (!photos.length || !location))} onClick={() => setStep((value) => value + 1)} className="cta-orange flex-1 rounded-xl px-4 py-3 font-bold disabled:opacity-40">Continue</button> : <button type="button" disabled={!rating} onClick={finishDraft} className="cta-orange flex-1 rounded-xl px-4 py-3 font-bold disabled:opacity-40">Complete audit draft</button>}
      </footer>
    </section>
  </div>
}
