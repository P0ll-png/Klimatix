'use client'

import { useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { Mail, Phone, X } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { isVerifiedUser } from '@/lib/auth'

type Method = 'phone' | 'email'

export default function AuthDialog({ open, user, onClose, onAuthenticated, onSignOut }: {
  open: boolean
  user: User | null
  onClose: () => void
  onAuthenticated: (user: User) => void
  onSignOut: () => Promise<void>
}) {
  const [method, setMethod] = useState<Method>('phone')
  const [contact, setContact] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error('Authentication is not configured. Add the Supabase public URL and publishable key.')
      const value = contact.trim()
      const result = method === 'phone'
        ? await supabase.auth.signInWithOtp({ phone: value, options: { shouldCreateUser: true } })
        : await supabase.auth.signInWithOtp({ email: value, options: { shouldCreateUser: true } })
      if (result.error) throw result.error
      setSent(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send a verification code.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error('Authentication is not configured.')
      const result = method === 'phone'
        ? await supabase.auth.verifyOtp({ phone: contact.trim(), token: code.trim(), type: 'sms' })
        : await supabase.auth.verifyOtp({ email: contact.trim(), token: code.trim(), type: 'email' })
      if (result.error) throw result.error
      if (!result.data.user || !isVerifiedUser(result.data.user)) {
        throw new Error('Verification was not confirmed. Please check the code and try again.')
      }
      onAuthenticated(result.data.user)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not verify the code.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSignOut() {
    setBusy(true)
    setError('')
    try {
      await onSignOut()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign out.')
    } finally {
      setBusy(false)
    }
  }

  const verified = isVerifiedUser(user)
  const configured = Boolean(getSupabaseClient())

  return <div className="fixed inset-0 z-[1200] grid place-items-center overflow-y-auto bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="w-full max-w-md rounded-2xl border border-[#315182] bg-[#10285b] p-6 shadow-2xl">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold tracking-[.18em] text-cyan">KLIMATIX ACCOUNT</p><h2 id="auth-title" className="mt-1 font-display text-2xl font-bold">{verified ? 'Account verified' : 'Verify to participate'}</h2></div>
        <button type="button" onClick={onClose} aria-label="Close account dialog" className="text-[#A9B4CC]"><X /></button>
      </header>
      {verified ? <div>
        <p className="text-sm text-[#C4CEE2]">Signed in and verified as <strong className="break-all text-white">{user?.email ?? user?.phone}</strong>. You can submit reports and vote.</p>
        <button type="button" disabled={busy} onClick={handleSignOut} className="mt-5 w-full rounded-xl border border-[#315182] px-4 py-3 font-semibold disabled:opacity-50">{busy ? 'Signing out…' : 'Sign out'}</button>
      </div> : <>
        <p className="mb-4 text-sm text-[#C4CEE2]">Use a phone number or email to receive a one-time verification code. Viewing the map and announcements does not require an account.</p>
        {!configured && <p role="alert" className="mb-4 rounded-lg border border-[#E5383B]/50 bg-[#3b2030] p-3 text-sm text-[#ffb2a3]">Supabase authentication is not configured. Add the public Supabase URL and publishable key to the app environment.</p>}
        {!sent ? <form onSubmit={sendCode}>
          <div className="mb-4 grid grid-cols-2 gap-2" role="group" aria-label="Verification method">
            <button type="button" aria-pressed={method === 'phone'} onClick={() => { setMethod('phone'); setContact(''); setError('') }} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${method === 'phone' ? 'border-cyan bg-[#183568]' : 'border-[#315182]'}`}><Phone size={16} />Phone OTP</button>
            <button type="button" aria-pressed={method === 'email'} onClick={() => { setMethod('email'); setContact(''); setError('') }} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${method === 'email' ? 'border-cyan bg-[#183568]' : 'border-[#315182]'}`}><Mail size={16} />Email OTP</button>
          </div>
          <label htmlFor="auth-contact" className="block text-sm font-semibold">{method === 'phone' ? 'Phone number' : 'Email address'}</label>
          <input id="auth-contact" required type={method === 'phone' ? 'tel' : 'email'} autoComplete={method === 'phone' ? 'tel' : 'email'} value={contact} onChange={(event) => setContact(event.target.value)} placeholder={method === 'phone' ? '+639XXXXXXXXX' : 'you@example.com'} className="mt-2 w-full rounded-lg border border-[#315182] bg-[#0B1354] px-3 py-3 text-white" />
          {method === 'phone' && <p className="mt-1 text-xs text-[#A9B4CC]">Use international format, for example +639XXXXXXXXX.</p>}
          {error && <p role="alert" className="mt-3 text-sm text-[#ff8f91]">{error}</p>}
          <button type="submit" disabled={busy || !configured} className="cta-orange mt-5 w-full rounded-xl px-4 py-3 font-bold disabled:opacity-50">{busy ? 'Sending code…' : 'Send verification code'}</button>
        </form> : <form onSubmit={verifyCode}>
          <p className="mb-3 text-sm text-[#C4CEE2]">Enter the one-time code sent to <strong className="break-all text-white">{contact}</strong>.</p>
          <label htmlFor="auth-code" className="block text-sm font-semibold">Verification code</label>
          <input id="auth-code" required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} className="mt-2 w-full rounded-lg border border-[#315182] bg-[#0B1354] px-3 py-3 text-white" />
          {error && <p role="alert" className="mt-3 text-sm text-[#ff8f91]">{error}</p>}
          <button type="submit" disabled={busy} className="cta-orange mt-5 w-full rounded-xl px-4 py-3 font-bold disabled:opacity-50">{busy ? 'Verifying…' : 'Verify and continue'}</button>
          <button type="button" disabled={busy} onClick={() => { setSent(false); setCode(''); setError('') }} className="mt-3 w-full text-sm text-cyan underline">Use a different phone or email</button>
        </form>}
      </>}
    </section>
  </div>
}
