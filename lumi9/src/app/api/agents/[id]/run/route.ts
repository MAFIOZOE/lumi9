import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeAgentTask } from '@/lib/agent'

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

// POST /api/agents/:id/run
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { authUser, userRow } = await getAuthedUserWithTenant()

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!userRow) return NextResponse.json({ error: 'User not provisioned' }, { status: 403 })

    const { id: agentId } = await params
    const body = await request.json()

    const task = (body?.task || '').toString().trim()
    if (!task) return NextResponse.json({ error: 'Task is required' }, { status: 400 })

    const tenantId = (userRow as { tenant_id: string }).tenant_id
    const userId = (userRow as { id: string }).id

    try {
      const result = await executeAgentTask(agentId, userId, tenantId, task)
      return NextResponse.json({
        runId: result.runId,
        status: result.status,
        result: result.result,
        error: result.error,
        creditsUsed: result.creditsUsed,
        toolsUsed: result.toolsUsed,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute agent'

      // Credit enforcement error (mirrors chat route pattern)
      if (message.toLowerCase().includes('insufficient credits')) {
        return NextResponse.json({ error: message }, { status: 402 })
      }

      return NextResponse.json({ error: message }, { status: 400 })
    }
  } catch (error) {
    console.error('Agent run POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
