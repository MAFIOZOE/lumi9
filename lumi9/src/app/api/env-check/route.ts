import { NextResponse } from 'next/server'

export async function GET() {
  const envStatus = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    
    // Show values (safe for debugging)
    SUPABASE_URL_PREVIEW: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    
    // Build info
    buildTime: new Date().toISOString(),
    commit: '46e95aa'
  }

  return NextResponse.json({
    status: 'Environment Check',
    environment: envStatus,
    message: envStatus.NEXT_PUBLIC_SUPABASE_URL ? 'Environment variables loaded' : 'Missing critical env vars'
  })
}