import type { User } from '@supabase/supabase-js'

export function isVerifiedUser(user: User | null | undefined) {
  return Boolean(user)
}
