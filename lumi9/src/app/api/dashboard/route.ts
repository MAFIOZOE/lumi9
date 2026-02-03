import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBalance } from '@/lib/credits'

export async function GET() {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with tenant
    const { data: user } = await admin
      .from('users')
      .select('id, name, email, role, tenant_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get tenant info
    const { data: tenant } = await admin
      .from('tenants')
      .select('id, name, slug')
      .eq('id', user.tenant_id)
      .single()

    // Get subscription + plan
    const { data: subscription } = await admin
      .from('subscriptions')
      .select(`
        id,
        status,
        current_period_start,
        current_period_end,
        plans (
          id,
          name,
          credits_per_month,
          price_cents,
          features
        )
      `)
      .eq('tenant_id', user.tenant_id)
      .single()

    // Supabase joins may return arrays depending on relationship/cardinality
    const subscriptionPlan = Array.isArray(subscription?.plans)
      ? subscription.plans[0]
      : subscription?.plans

    // Get credit balance
    const balance = await getBalance(user.tenant_id)

    // Get recent credit transactions
    const { data: transactions } = await admin
      .from('credit_transactions')
      .select('id, amount, type, description, created_at')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get conversation count
    const { count: conversationCount } = await admin
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Get agents count (tenant-wide)
    const { count: agentCount } = await admin
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenant_id)

    // Get message count (this month)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Supabase does not support inline subqueries in filters (e.g. `.eq('col', queryBuilder)`)
    // so we fetch the user's conversation ids first, then filter messages with `.in()`.
    const { data: conversations } = await admin
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)

    const conversationIds = (conversations || []).map((c) => c.id)

    const messageCount = conversationIds.length
      ? (
          await admin
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', conversationIds)
        ).count
      : 0

    // Recent agent runs (tenant-wide)
    const { data: recentAgentRuns } = await admin
      .from('agent_runs')
      .select('id, agent_id, task, status, credits_used, created_at')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      tenant: {
        id: tenant?.id,
        name: tenant?.name,
        slug: tenant?.slug
      },
      subscription: subscription ? {
        status: subscription.status,
        plan: subscription.plans,
        currentPeriodEnd: subscription.current_period_end
      } : null,
      credits: {
        balance,
        monthlyAllowance: subscriptionPlan?.credits_per_month || 0
      },
      stats: {
        conversations: conversationCount || 0,
        messagesThisMonth: messageCount || 0,
        agents: agentCount || 0
      },
      recentAgentRuns: recentAgentRuns || [],
      recentTransactions: transactions || []
    })

  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
