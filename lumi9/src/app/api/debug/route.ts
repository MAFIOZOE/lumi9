import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      CF_PAGES: !!process.env.CF_PAGES,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      OPENCLAW_GATEWAY_URL: process.env.OPENCLAW_GATEWAY_URL,
      OPENCLAW_GATEWAY_TOKEN: !!process.env.OPENCLAW_GATEWAY_TOKEN,
    }

    // Test Supabase connection
    let supabaseTest = 'unknown'
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()
      const { data, error } = await admin.from('tenants').select('count').limit(1)
      supabaseTest = error ? `error: ${error.message}` : 'connected'
    } catch (err) {
      supabaseTest = `failed: ${err instanceof Error ? err.message : String(err)}`
    }

    // Test tenant resolution
    let tenantTest = 'unknown'
    try {
      const { getTenantSlug } = await import('@/lib/tenant')
      const slug = await getTenantSlug()
      tenantTest = slug ? `found: ${slug}` : 'no slug'
    } catch (err) {
      tenantTest = `failed: ${err instanceof Error ? err.message : String(err)}`
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'ok',
      environment: envCheck,
      supabase: supabaseTest,
      tenant: tenantTest,
      headers: {
        host: process.env.VERCEL_URL || 'unknown',
        userAgent: 'server-side'
      }
    })

  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}