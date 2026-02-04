import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient, User, Session } from '@supabase/supabase-js'

// Properly typed mock client that matches Supabase interface
const createMockClient = (): SupabaseClient => {
  const mockClient = {
    auth: {
      getUser: async () => ({ 
        data: { user: null }, 
        error: { message: 'Service unavailable', status: 503 } 
      }),
      signInWithPassword: async () => ({ 
        data: { user: null, session: null },
        error: { message: 'Service unavailable', status: 503 } 
      }),
      signOut: async () => ({ 
        error: null 
      }),
      onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
        // Call callback once with null session to initialize
        setTimeout(() => callback('SIGNED_OUT', null), 0)
        return { 
          data: { 
            subscription: { 
              unsubscribe: () => {} 
            } 
          } 
        }
      }
    },
    // Add other Supabase methods as no-ops
    from: () => ({
      select: () => ({ error: { message: 'Service unavailable' } }),
      insert: () => ({ error: { message: 'Service unavailable' } }),
      update: () => ({ error: { message: 'Service unavailable' } }),
      delete: () => ({ error: { message: 'Service unavailable' } })
    })
  } as unknown as SupabaseClient

  return mockClient
}

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables - using mock client:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV,
      location: typeof window !== 'undefined' ? window.location.hostname : 'server'
    })
    
    return createMockClient()
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return createMockClient()
  }
}