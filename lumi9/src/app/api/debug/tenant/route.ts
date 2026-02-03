import { NextRequest, NextResponse } from 'next/server'

// Debug endpoint to verify tenant resolution
// GET /api/debug/tenant

export async function GET(request: NextRequest) {
  const tenantSlug = request.headers.get('x-tenant-slug')
  const host = request.headers.get('host')
  const tenant = request.nextUrl.searchParams.get('tenant')
  
  return NextResponse.json({
    success: true,
    debug: {
      host,
      tenantFromHeader: tenantSlug,
      tenantFromParam: tenant,
      timestamp: new Date().toISOString(),
    },
    message: tenantSlug 
      ? `🎉 Tenant resolved: ${tenantSlug}` 
      : '⚠️ No tenant detected (main domain)'
  })
}
