import { createAdminClient } from './supabase/admin'

// Commission rates by level (percentage of payment)
const COMMISSION_RATES = {
  1: 0.10, // 10% for direct referrer
  2: 0.05, // 5% for level 2
  3: 0.03, // 3% for level 3
  4: 0.02, // 2% for level 4
} as const

// Generate a unique referral code for a user
export function generateReferralCode(userId: string): string {
  // Use first 8 chars of user ID + random suffix
  const base = userId.replace(/-/g, '').slice(0, 6).toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${base}${suffix}`
}

// Get or create referral code for a user
export async function getReferralCode(userId: string): Promise<string> {
  const admin = createAdminClient()
  
  // Check if user already has a code
  const { data: user } = await admin
    .from('users')
    .select('referral_code')
    .eq('id', userId)
    .single()
  
  if (user?.referral_code) {
    return user.referral_code
  }
  
  // Generate and save new code
  const code = generateReferralCode(userId)
  
  await admin
    .from('users')
    .update({ referral_code: code })
    .eq('id', userId)
  
  return code
}

// Look up user by referral code
export async function getUserByReferralCode(code: string): Promise<string | null> {
  const admin = createAdminClient()
  
  const { data } = await admin
    .from('users')
    .select('id')
    .eq('referral_code', code.toUpperCase())
    .single()
  
  return data?.id || null
}

// Record a referral when new user signs up
export async function recordReferral(
  newUserId: string,
  referrerUserId: string
): Promise<boolean> {
  const admin = createAdminClient()
  
  // Get referrer's upline (their referral tree)
  const { data: referrerTree } = await admin
    .from('referral_tree')
    .select('referrer_id, level_1, level_2, level_3')
    .eq('user_id', referrerUserId)
    .single()
  
  // Build the new user's referral tree
  const tree = {
    user_id: newUserId,
    referrer_id: referrerUserId,
    level_1: referrerUserId,
    level_2: referrerTree?.level_1 || null,
    level_3: referrerTree?.level_2 || null,
    level_4: referrerTree?.level_3 || null,
  }
  
  const { error } = await admin
    .from('referral_tree')
    .insert(tree)
  
  if (error) {
    console.error('Failed to record referral:', error)
    return false
  }
  
  return true
}

// Get referral stats for a user
export async function getReferralStats(userId: string): Promise<{
  referralCode: string
  directReferrals: number
  totalNetwork: number
  pendingCommissions: number
  paidCommissions: number
}> {
  const admin = createAdminClient()
  
  // Get referral code
  const referralCode = await getReferralCode(userId)
  
  // Count direct referrals
  const { count: directReferrals } = await admin
    .from('referral_tree')
    .select('user_id', { count: 'exact', head: true })
    .eq('referrer_id', userId)
  
  // Count total network (all levels)
  const { count: totalNetwork } = await admin
    .from('referral_tree')
    .select('user_id', { count: 'exact', head: true })
    .or(`level_1.eq.${userId},level_2.eq.${userId},level_3.eq.${userId},level_4.eq.${userId}`)
  
  // Get commission totals
  const { data: commissions } = await admin
    .from('commissions')
    .select('amount_cents, status')
    .eq('beneficiary_id', userId)
  
  const pendingCommissions = (commissions || [])
    .filter(c => c.status === 'pending' || c.status === 'approved')
    .reduce((sum, c) => sum + c.amount_cents, 0)
  
  const paidCommissions = (commissions || [])
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount_cents, 0)
  
  return {
    referralCode,
    directReferrals: directReferrals || 0,
    totalNetwork: totalNetwork || 0,
    pendingCommissions,
    paidCommissions,
  }
}

// Calculate and record commissions when a payment is made
export async function processCommissions(
  payingUserId: string,
  paymentAmountCents: number,
  stripePaymentId: string
): Promise<number> {
  const admin = createAdminClient()
  
  // Get the paying user's referral tree
  const { data: tree } = await admin
    .from('referral_tree')
    .select('level_1, level_2, level_3, level_4')
    .eq('user_id', payingUserId)
    .single()
  
  if (!tree) {
    // User has no referrers
    return 0
  }
  
  const levels = [
    { level: 1, userId: tree.level_1 },
    { level: 2, userId: tree.level_2 },
    { level: 3, userId: tree.level_3 },
    { level: 4, userId: tree.level_4 },
  ].filter(l => l.userId)
  
  let totalCommissions = 0
  
  for (const { level, userId } of levels) {
    const rate = COMMISSION_RATES[level as keyof typeof COMMISSION_RATES]
    const commissionCents = Math.floor(paymentAmountCents * rate)
    
    if (commissionCents > 0) {
      await admin
        .from('commissions')
        .insert({
          beneficiary_id: userId,
          source_user_id: payingUserId,
          source_payment_id: stripePaymentId,
          level,
          amount_cents: commissionCents,
          status: 'pending'
        })
      
      totalCommissions += commissionCents
    }
  }
  
  return totalCommissions
}

// Get pending commissions ready for payout
export async function getPendingPayouts(minAmountCents: number = 1000): Promise<Array<{
  userId: string
  email: string
  totalCents: number
  commissionIds: string[]
}>> {
  const admin = createAdminClient()
  
  // Get all pending/approved commissions grouped by beneficiary
  const { data: commissions } = await admin
    .from('commissions')
    .select('id, beneficiary_id, amount_cents')
    .in('status', ['pending', 'approved'])
  
  if (!commissions || commissions.length === 0) {
    return []
  }
  
  // Group by beneficiary
  const byUser = new Map<string, { total: number; ids: string[] }>()
  
  for (const c of commissions) {
    const existing = byUser.get(c.beneficiary_id) || { total: 0, ids: [] }
    existing.total += c.amount_cents
    existing.ids.push(c.id)
    byUser.set(c.beneficiary_id, existing)
  }
  
  // Filter by minimum amount and get user details
  const results: Array<{ userId: string; email: string; totalCents: number; commissionIds: string[] }> = []
  
  for (const [userId, data] of byUser) {
    if (data.total >= minAmountCents) {
      const { data: user } = await admin
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()
      
      results.push({
        userId,
        email: user?.email || '',
        totalCents: data.total,
        commissionIds: data.ids
      })
    }
  }
  
  return results
}

// Mark commissions as paid
export async function markCommissionsPaid(commissionIds: string[]): Promise<boolean> {
  const admin = createAdminClient()
  
  const { error } = await admin
    .from('commissions')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .in('id', commissionIds)
  
  return !error
}
