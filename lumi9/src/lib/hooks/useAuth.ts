'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null

    const initAuth = async () => {
      try {
        if (!mounted) return

        // Create Supabase client
        const client = createClient()
        setSupabase(client)

        // Get initial session
        const { data: { user }, error: userError } = await client.auth.getUser()
        
        if (!mounted) return

        if (userError) {
          console.error('Auth error:', userError)
          setError(userError.message)
          setUser(null)
        } else {
          setUser(user)
          setError(null)
        }

        // Listen for auth changes with proper typing
        const { data } = client.auth.onAuthStateChange(
          (event: AuthChangeEvent, session: Session | null) => {
            if (!mounted) return
            
            console.log('Auth state changed:', event, session?.user?.id)
            setUser(session?.user ?? null)
            setError(null)
          }
        )
        
        subscription = data.subscription

      } catch (err) {
        if (!mounted) return
        
        console.error('Supabase initialization failed:', err)
        setError(err instanceof Error ? err.message : 'Authentication service unavailable')
        setUser(null)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      if (!supabase) {
        console.warn('No Supabase client available for sign out')
        return
      }
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        setError(error.message)
      } else {
        setUser(null)
        setError(null)
      }
    } catch (err) {
      console.error('Sign out failed:', err)
      setError(err instanceof Error ? err.message : 'Sign out failed')
    }
  }, [supabase])

  return { 
    user, 
    loading, 
    signOut, 
    error,
    isAuthenticated: !!user,
    supabase 
  }
}