import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAgentRuns } from '@/lib/agent'

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

// GET /api/agents/:id/runs
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authUser, userRow } = await getAuthedUserWithTenant()

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!userRow) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const { id: agentId } = await params
    const tenantId = (userRow as { tenant_id: string }).tenant_id

    const url = new URL(req.url)
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 20)))

    const runs = await getAgentRuns(agentId, tenantId, limit)
    return NextResponse.json({ runs })
  } catch (error) {
    console.error('Agent runs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
