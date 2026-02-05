import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Tenant resolution proxy
// Extracts tenant from subdomain: {tenant}.lumi9.ai

export function proxy(request: NextRequest) {
  try {
    const hostname = request.headers.get('host') || ''
    const url = request.nextUrl.clone()
    
    // Extract subdomain
    // In production: alice.lumi9.ai -> alice
    // In dev: alice.localhost:3000 -> alice
    const subdomain = getSubdomain(hostname)
    
    // No subdomain = main domain, pass through
    if (!subdomain || subdomain === 'www' || subdomain === 'app') {
      return NextResponse.next()
    }
    
    // Skip static files entirely
    if (url.pathname.startsWith('/_next') || url.pathname.includes('.')) {
      return NextResponse.next()
    }
    
    // For API routes: set header but don't rewrite URL
    if (url.pathname.startsWith('/api')) {
      const response = NextResponse.next()
      response.headers.set('x-tenant-slug', subdomain)
      return response
    }
    
    // For pages: set header AND rewrite URL with tenant param
    url.searchParams.set('tenant', subdomain)
    
    return NextResponse.rewrite(url, {
      headers: { 'x-tenant-slug': subdomain }
    })
  } catch (error) {
    // Log error but don't break the request
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

function getSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0]
  
  // Production: alice.lumi9.ai
  if (host.endsWith('.lumi9.ai')) {
    return host.replace('.lumi9.ai', '')
  }
  
  // Development: alice.localhost
  if (host.endsWith('.localhost')) {
    return host.replace('.localhost', '')
  }
  
  // No subdomain
  return null
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
