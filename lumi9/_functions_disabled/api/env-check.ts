// Cloudflare Pages Function for /api/env-check
export async function onRequest(context: any) {
  const envStatus = {
    NODE_ENV: context.env.NODE_ENV || 'production',
    NEXT_PUBLIC_SUPABASE_URL: !!context.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!context.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!context.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: !!context.env.ANTHROPIC_API_KEY,
    
    // Show values (safe for debugging)
    SUPABASE_URL_PREVIEW: context.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    
    // Build info
    buildTime: new Date().toISOString(),
    commit: '32d774d'
  }

  return new Response(JSON.stringify({
    status: 'Environment Check - Cloudflare Functions',
    environment: envStatus,
    message: envStatus.NEXT_PUBLIC_SUPABASE_URL ? 'Environment variables loaded' : 'Missing critical env vars'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}