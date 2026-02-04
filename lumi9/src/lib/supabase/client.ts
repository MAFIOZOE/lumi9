import { createBrowserClient } from '@supabase/ssr'

// Fallback Supabase client that prevents crashes
const createMockClient = () => ({
  auth: {
    getUser: async () => ({ data: { user: null }, error: { message: 'Service unavailable' } }),
    signInWithPassword: async () => ({ error: { message: 'Service unavailable' } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  }
})

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables - using mock client:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV,
      location: typeof window !== 'undefined' ? window.location.hostname : 'server'
    })
    
    // Return mock client instead of throwing
    return createMockClient() as any
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return createMockClient() as any
  }
}
