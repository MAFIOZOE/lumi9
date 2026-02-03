import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeBranding } from '@/lib/branding'

async function getAuthedUserWithTenant() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { authUser: null, userRow: null, admin }

  const { data: userRow } = await admin
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_id', authUser.id)
    .single()

  return { authUser, userRow, admin }
}

// GET /api/branding - fetch current tenant branding
export async function GET() {
  try {
    const { authUser, userRow, admin } = await getAuthedUserWithTenant()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!userRow) {
      return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })
    }

    const { data: tenant, error } = await admin
      .from('tenants')
      .select('id, branding')
      .eq('id', userRow.tenant_id)
      .single()

    if (error || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({ branding: normalizeBranding((tenant as { branding?: unknown }).branding) })
  } catch (error) {
    console.error('Branding GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/branding - update branding (admin only)
export async function PUT(request: NextRequest) {
  try {
    const { authUser, userRow, admin } = await getAuthedUserWithTenant()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!userRow) {
      return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })
    }

    const role = (userRow as { role?: string }).role
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const branding = normalizeBranding(body?.branding ?? body)

    const { error } = await admin
      .from('tenants')
      .update({ branding })
      .eq('id', userRow.tenant_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ branding })
  } catch (error) {
    console.error('Branding PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
