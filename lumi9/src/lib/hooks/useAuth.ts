'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    let subscription: any = null

    const initAuth = async () => {
      try {
        // Try to create Supabase client
        const client = createClient()
        setSupabase(client)

        // Get initial session
        const { data: { user }, error: userError } = await client.auth.getUser()
        if (userError) {
          console.error('Auth error:', userError)
          setError(userError.message)
        } else {
          setUser(user)
          setError(null)
        }

        // Listen for auth changes
        const { data } = client.auth.onAuthStateChange(
          (_event, session) => {
            setUser(session?.user ?? null)
            setError(null)
          }
        )
        subscription = data.subscription

      } catch (err) {
        console.error('Supabase initialization failed:', err)
        setError(err instanceof Error ? err.message : 'Authentication service unavailable')
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const signOut = async () => {
    try {
      if (!supabase) return
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  return { user, loading, signOut, error }
}
