import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getReferralStats } from '@/lib/mlm'

// GET /api/referrals - Get referral stats and code
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

    const stats = await getReferralStats(user.id)
    
    // Build shareable link
    const shareLink = `https://lumi9.ai/join/${stats.referralCode}`
    
    return NextResponse.json({
      ...stats,
      shareLink,
      commissionRates: {
        level1: '10%',
        level2: '5%',
        level3: '3%',
        level4: '2%'
      }
    })
  } catch (error) {
    console.error('Referrals GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
