'use client'

import { useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { X } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { isVerifiedUser } from '@/lib/auth'

type AuthMode = 'sign-in' | 'sign-up'

export default function AuthDialog({ open, user, onClose, onAuthenticated, onSignOut }: {
  open: boolean
  user: User | null
  onClose: () => void
  onAuthenticated: (user: User) => void
  onSignOut: () => Promise<void>
}) {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error('Authentication is not configured. Add the Supabase public URL and publishable key.')
      const normalizedUsername = username.trim().toLowerCase()
      if (!/^[a-z0-9._-]{3,32}$/.test(normalizedUsername)) {
        throw new Error('Username must be 3–32 characters and use only letters, numbers, dots, underscores, or hyphens.')
      }
      const email = `${normalizedUsername}@klimatix.local`

      if (mode === 'sign-up') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: normalizedUsername } },
        })
        if (signUpError) throw signUpError
        if (!data.user) throw new Error('Supabase did not return the newly created account.')
        if (!data.session) {
          throw new Error('Account created, but Supabase is still requiring email confirmation. Disable “Confirm email” in Supabase Auth settings to allow immediate access.')
        }
        onAuthenticated(data.user)
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        if (!data.user) throw new Error('Supabase did not return an authenticated account.')
        onAuthenticated(data.user)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not authenticate this account.')
    } finally {
      setBusy(false)
    }
  }

  async function signInWithGoogle() {
    setBusy(true)
    setError('')
    try {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error('Authentication is not configured. Add the Supabase public URL and publishable key.')
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href },
      })
      if (oauthError) throw oauthError
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in with Google.')
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

  const authenticated = isVerifiedUser(user)
  const configured = Boolean(getSupabaseClient())

  return <div className="fixed inset-0 z-[1200] grid place-items-center overflow-y-auto bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="w-full max-w-md rounded-2xl border border-[#315182] bg-[#10285b] p-6 shadow-2xl">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold tracking-[.18em] text-cyan">KLIMATIX ACCOUNT</p><h2 id="auth-title" className="mt-1 font-display text-2xl font-bold">{authenticated ? 'Account active' : mode === 'sign-up' ? 'Create your account' : 'Sign in'}</h2></div>
        <button type="button" onClick={onClose} aria-label="Close account dialog" className="text-[#A9B4CC]"><X /></button>
      </header>
      {authenticated ? <div>
        <p className="text-sm text-[#C4CEE2]">Signed in as <strong className="break-all text-white">{String(user?.user_metadata.display_name ?? user?.email ?? user?.phone)}</strong>. Your account can submit reports and vote.</p>
        <button type="button" disabled={busy} onClick={handleSignOut} className="mt-5 w-full rounded-xl border border-[#315182] px-4 py-3 font-semibold disabled:opacity-50">{busy ? 'Signing out…' : 'Sign out'}</button>
      </div> : <>
        <p className="mb-4 text-sm text-[#C4CEE2]">Create an account or sign in to submit reports and vote. Viewing the map and announcements remains public.</p>
        {!configured && <p role="alert" className="mb-4 rounded-lg border border-[#E5383B]/50 bg-[#3b2030] p-3 text-sm text-[#ffb2a3]">Supabase authentication is not configured. Add the public Supabase URL and publishable key to the app environment.</p>}
        <button type="button" disabled={busy || !configured} onClick={signInWithGoogle} className="w-full rounded-xl border border-[#315182] px-4 py-3 font-semibold disabled:opacity-50">Continue with Google</button>
        <div className="my-4 flex items-center gap-3 text-xs text-[#A9B4CC]"><span className="h-px flex-1 bg-[#315182]" />or use username and password<span className="h-px flex-1 bg-[#315182]" /></div>
        <div className="mb-4 grid grid-cols-2 gap-2" role="group" aria-label="Account action">
          <button type="button" aria-pressed={mode === 'sign-in'} onClick={() => { setMode('sign-in'); setError('') }} className={`rounded-lg border px-3 py-2 text-sm ${mode === 'sign-in' ? 'border-cyan bg-[#183568]' : 'border-[#315182]'}`}>Sign in</button>
          <button type="button" aria-pressed={mode === 'sign-up'} onClick={() => { setMode('sign-up'); setError('') }} className={`rounded-lg border px-3 py-2 text-sm ${mode === 'sign-up' ? 'border-cyan bg-[#183568]' : 'border-[#315182]'}`}>Create account</button>
        </div>
        <form onSubmit={submitPassword}>
          <label htmlFor="auth-username" className="block text-sm font-semibold">Username</label>
          <input id="auth-username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Choose a username" className="mt-2 w-full rounded-lg border border-[#315182] bg-[#0B1354] px-3 py-3 text-white" />
          <label htmlFor="auth-password" className="mt-4 block text-sm font-semibold">Password</label>
          <input id="auth-password" required minLength={6} type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-[#315182] bg-[#0B1354] px-3 py-3 text-white" />
          {error && <p role="alert" className="mt-3 text-sm text-[#ff8f91]">{error}</p>}
          <button type="submit" disabled={busy || !configured} className="cta-orange mt-5 w-full rounded-xl px-4 py-3 font-bold disabled:opacity-50">{busy ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}</button>
        </form>
      </>}
    </section>
  </div>
}
