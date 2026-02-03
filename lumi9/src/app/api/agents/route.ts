import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAgent, getAgents, getAllowedToolsForTenant } from '@/lib/agent'

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

// GET /api/agents - list tenant agents (+ allowed tools by plan)
export async function GET() {
  try {
    const { authUser, userRow } = await getAuthedUserWithTenant()

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!userRow) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const tenantId = (userRow as { tenant_id: string }).tenant_id

    const [agents, toolInfo] = await Promise.all([
      getAgents(tenantId),
      getAllowedToolsForTenant(tenantId),
    ])

    return NextResponse.json({ agents, ...toolInfo })
  } catch (error) {
    console.error('Agents GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/agents - create new agent (owner/admin)
export async function POST(request: NextRequest) {
  try {
    const { authUser, userRow } = await getAuthedUserWithTenant()

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!userRow) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const role = (userRow as { role?: string }).role
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const tenantId = (userRow as { tenant_id: string }).tenant_id
    const body = await request.json()

    if (!body?.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const agent = await createAgent(tenantId, {
      name: body.name,
      description: body.description,
      system_prompt: body.system_prompt,
      model: body.model,
      tools: body.tools,
      settings: body.settings,
      is_default: body.is_default,
    })

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Agents POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
