'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase/client'
import { isVerifiedUser } from '@/lib/auth'
import AuthDialog from './auth-dialog'

type AuthContextValue = {
  user: User | null
  verified: boolean
  loading: boolean
  requireVerified: (action?: () => void) => boolean
  openAccount: () => void
  closeAccount: () => void
  acceptUser: (user: User) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [accountOpen, setAccountOpen] = useState(false)
  const pendingAction = useRef<(() => void) | null>(null)

  const acceptUser = useCallback((authenticatedUser: User) => {
    setUser(authenticatedUser)
    setLoading(false)
    if (!isVerifiedUser(authenticatedUser)) return
    setAccountOpen(false)
    const action = pendingAction.current
    pendingAction.current = null
    action?.()
  }, [])

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setLoading(false)
      return
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) acceptUser(session.user)
      else {
        setUser(null)
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [acceptUser])

  const requireVerified = useCallback((action?: () => void) => {
    if (!loading && isVerifiedUser(user)) {
      action?.()
      return true
    }
    pendingAction.current = action ?? null
    setAccountOpen(true)
    return false
  }, [loading, user])

  const openAccount = useCallback(() => setAccountOpen(true), [])
  const closeAccount = useCallback(() => {
    pendingAction.current = null
    setAccountOpen(false)
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase) throw new Error('Authentication is not configured.')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    pendingAction.current = null
    setUser(null)
    setAccountOpen(false)
  }, [])

  return <AuthContext.Provider value={{ user, verified: isVerifiedUser(user), loading, requireVerified, openAccount, closeAccount, acceptUser, signOut }}>
    {children}
    <AuthDialog open={accountOpen} user={user} onClose={closeAccount} onAuthenticated={acceptUser} onSignOut={signOut} />
  </AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
