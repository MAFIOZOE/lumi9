import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteAgent, getAgent, updateAgent } from '@/lib/agent'

async function getAuthedUserWithTenant() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) return { authUser: null, userRow: null, admin }

  const { data: userRow } = await admin
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_id', authUser.id)
    .single()

  return { authUser, userRow, admin }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authUser, userRow } = await getAuthedUserWithTenant()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!userRow) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const { id } = await params
    const tenantId = (userRow as { tenant_id: string }).tenant_id

    const agent = await getAgent(id, tenantId)
    if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Agent GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authUser, userRow } = await getAuthedUserWithTenant()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!userRow) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const role = (userRow as { role?: string }).role
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const tenantId = (userRow as { tenant_id: string }).tenant_id
    const body = await request.json()

    const updated = await updateAgent(id, tenantId, {
      name: body.name,
      description: body.description,
      system_prompt: body.system_prompt,
      model: body.model,
      tools: body.tools,
      settings: body.settings,
      is_default: body.is_default,
    })

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ agent: updated })
  } catch (error) {
    console.error('Agent PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authUser, userRow } = await getAuthedUserWithTenant()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!userRow) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const role = (userRow as { role?: string }).role
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const tenantId = (userRow as { tenant_id: string }).tenant_id

    const ok = await deleteAgent(id, tenantId)
    if (!ok) return NextResponse.json({ error: 'Delete failed' }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Agent DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
