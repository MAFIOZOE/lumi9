import { createAdminClient } from './supabase/admin'
import { markCommissionsPaid, getPendingPayouts } from './mlm'

export type PayoutMethod = 'stripe_connect' | 'paypal' | 'bank_transfer'
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'

const MINIMUM_PAYOUT_CENTS = 1000 // $10 minimum

// Request a payout
export async function requestPayout(
  userId: string,
  method: PayoutMethod,
  payoutDetails: Record<string, string>
): Promise<{ success: boolean; payoutId?: string; error?: string }> {
  const admin = createAdminClient()
  
  // Get user's pending commissions
  const pendingPayouts = await getPendingPayouts(0)
  const userPayout = pendingPayouts.find(p => p.userId === userId)
  
  if (!userPayout || userPayout.totalCents < MINIMUM_PAYOUT_CENTS) {
    return { 
      success: false, 
      error: `Minimum payout is $${(MINIMUM_PAYOUT_CENTS / 100).toFixed(2)}. You have $${((userPayout?.totalCents || 0) / 100).toFixed(2)} available.`
    }
  }
  
  // Check for existing pending payout
  const { data: existingPayout } = await admin
    .from('payout_requests')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['pending', 'processing'])
    .single()
  
  if (existingPayout) {
    return { success: false, error: 'You already have a pending payout request.' }
  }
  
  // Create payout request
  const { data: payout, error } = await admin
    .from('payout_requests')
    .insert({
      user_id: userId,
      amount_cents: userPayout.totalCents,
      commission_ids: userPayout.commissionIds,
      method,
      payout_details: payoutDetails,
      status: 'pending'
    })
    .select('id')
    .single()
  
  if (error) {
    console.error('Failed to create payout request:', error)
    return { success: false, error: 'Failed to create payout request.' }
  }
  
  return { success: true, payoutId: payout.id }
}

// Get user's payout history
export async function getPayoutHistory(userId: string): Promise<Array<{
  id: string
  amountCents: number
  method: PayoutMethod
  status: PayoutStatus
  createdAt: string
  completedAt: string | null
}>> {
  const admin = createAdminClient()
  
  const { data } = await admin
    .from('payout_requests')
    .select('id, amount_cents, method, status, created_at, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  
  return (data || []).map(p => ({
    id: p.id,
    amountCents: p.amount_cents,
    method: p.method as PayoutMethod,
    status: p.status as PayoutStatus,
    createdAt: p.created_at,
    completedAt: p.completed_at
  }))
}

// Admin: Get all pending payout requests
export async function getPendingPayoutRequests(): Promise<Array<{
  id: string
  userId: string
  email: string
  amountCents: number
  method: PayoutMethod
  payoutDetails: Record<string, string>
  createdAt: string
}>> {
  const admin = createAdminClient()
  
  const { data } = await admin
    .from('payout_requests')
    .select(`
      id,
      user_id,
      amount_cents,
      method,
      payout_details,
      created_at,
      users (email)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  
  return (data || []).map(p => ({
    id: p.id,
    userId: p.user_id,
    email: (Array.isArray(p.users) ? p.users[0]?.email : (p.users as { email?: string } | null)?.email) || '',
    amountCents: p.amount_cents,
    method: p.method as PayoutMethod,
    payoutDetails: p.payout_details as Record<string, string>,
    createdAt: p.created_at
  }))
}

// Admin: Approve and process a payout
export async function processPayout(
  payoutId: string,
  transactionId?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  
  // Get payout request
  const { data: payout } = await admin
    .from('payout_requests')
    .select('id, user_id, commission_ids, status')
    .eq('id', payoutId)
    .single()
  
  if (!payout) {
    return { success: false, error: 'Payout request not found.' }
  }
  
  if (payout.status !== 'pending') {
    return { success: false, error: 'Payout is not in pending status.' }
  }
  
  // Update payout to processing
  await admin
    .from('payout_requests')
    .update({ status: 'processing' })
    .eq('id', payoutId)
  
  // Mark commissions as paid
  const commissionIds = payout.commission_ids as string[]
  const marked = await markCommissionsPaid(commissionIds)
  
  if (!marked) {
    await admin
      .from('payout_requests')
      .update({ status: 'failed' })
      .eq('id', payoutId)
    return { success: false, error: 'Failed to mark commissions as paid.' }
  }
  
  // Update payout to completed
  await admin
    .from('payout_requests')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString(),
      transaction_id: transactionId
    })
    .eq('id', payoutId)
  
  return { success: true }
}

// Admin: Reject a payout
export async function rejectPayout(
  payoutId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  
  const { error } = await admin
    .from('payout_requests')
    .update({ 
      status: 'failed',
      rejection_reason: reason
    })
    .eq('id', payoutId)
    .eq('status', 'pending')
  
  if (error) {
    return { success: false, error: 'Failed to reject payout.' }
  }
  
  return { success: true }
}

// Get user's payout settings
export async function getPayoutSettings(userId: string): Promise<{
  method: PayoutMethod | null
  details: Record<string, string>
} | null> {
  const admin = createAdminClient()
  
  const { data } = await admin
    .from('users')
    .select('payout_method, payout_details')
    .eq('id', userId)
    .single()
  
  if (!data) return null
  
  return {
    method: data.payout_method as PayoutMethod | null,
    details: (data.payout_details as Record<string, string>) || {}
  }
}

// Update user's payout settings
export async function updatePayoutSettings(
  userId: string,
  method: PayoutMethod,
  details: Record<string, string>
): Promise<boolean> {
  const admin = createAdminClient()
  
  const { error } = await admin
    .from('users')
    .update({
      payout_method: method,
      payout_details: details
    })
    .eq('id', userId)
  
  return !error
}
