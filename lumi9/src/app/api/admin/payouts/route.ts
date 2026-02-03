import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPendingPayoutRequests, processPayout, rejectPayout } from '@/lib/payouts'

// GET /api/admin/payouts - List pending payout requests (admin only)
export async function GET() {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (tenant owner)
    const { data: user } = await admin
      .from('users')
      .select('id, role')
      .eq('auth_id', authUser.id)
      .single()

    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const pendingPayouts = await getPendingPayoutRequests()
    
    return NextResponse.json({ payouts: pendingPayouts })
  } catch (error) {
    console.error('Admin payouts GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/payouts - Process or reject a payout
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: user } = await admin
      .from('users')
      .select('id, role')
      .eq('auth_id', authUser.id)
      .single()

    if (!user || user.role !== 'owner') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { action, payoutId, transactionId, reason } = await request.json()

    if (action === 'approve') {
      const result = await processPayout(payoutId, transactionId)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: 'Payout processed' })
      
    } else if (action === 'reject') {
      const result = await rejectPayout(payoutId, reason || 'Rejected by admin')
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: 'Payout rejected' })
      
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Admin payouts POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
