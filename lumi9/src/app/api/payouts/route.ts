import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { 
  requestPayout, 
  getPayoutHistory, 
  getPayoutSettings,
  updatePayoutSettings,
  PayoutMethod
} from '@/lib/payouts'
import { getPendingPayouts } from '@/lib/mlm'

// GET /api/payouts - Get payout info for current user
export async function GET() {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get available balance
    const pendingPayouts = await getPendingPayouts(0)
    const userPayout = pendingPayouts.find(p => p.userId === user.id)
    const availableBalance = userPayout?.totalCents || 0
    
    // Get payout history
    const history = await getPayoutHistory(user.id)
    
    // Get payout settings
    const settings = await getPayoutSettings(user.id)
    
    return NextResponse.json({
      availableBalance,
      minimumPayout: 1000, // $10
      settings,
      history
    })
  } catch (error) {
    console.error('Payouts GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/payouts - Request a payout or update settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action, method, details } = body

    if (action === 'update_settings') {
      // Update payout settings
      if (!method || !['stripe_connect', 'paypal', 'bank_transfer'].includes(method)) {
        return NextResponse.json({ error: 'Invalid payout method' }, { status: 400 })
      }
      
      const success = await updatePayoutSettings(user.id, method as PayoutMethod, details || {})
      
      if (!success) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
      }
      
      return NextResponse.json({ success: true })
      
    } else if (action === 'request_payout') {
      // Request a payout
      const settings = await getPayoutSettings(user.id)
      
      if (!settings?.method) {
        return NextResponse.json({ 
          error: 'Please set up your payout method first' 
        }, { status: 400 })
      }
      
      const result = await requestPayout(user.id, settings.method, settings.details)
      
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      
      return NextResponse.json({ 
        success: true, 
        payoutId: result.payoutId,
        message: 'Payout request submitted! We\'ll process it within 3-5 business days.'
      })
      
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Payouts POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
