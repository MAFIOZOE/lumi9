import { headers } from 'next/headers'
import { createAdminClient } from './supabase/admin'
import { cache } from 'react'

import type { Branding } from './branding'

export interface Tenant {
  id: string
  slug: string
  name: string
  settings: Record<string, unknown>
  branding?: Branding
}

// Get tenant from request headers (set by middleware)
export async function getTenantSlug(): Promise<string | null> {
  const headersList = await headers()
  return headersList.get('x-tenant-slug')
}

// Cached tenant lookup - reuses within a single request
export const getTenant = cache(async (): Promise<Tenant | null> => {
  const slug = await getTenantSlug()
  if (!slug) return null
  
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (error || !data) return null
  
  return data as Tenant
})

// Get tenant or throw (for protected routes)
export async function requireTenant(): Promise<Tenant> {
  const tenant = await getTenant()
  if (!tenant) {
    throw new Error('Tenant not found')
  }
  return tenant
}
