import { createAdminClient } from './supabase/admin'

export interface CreditTransaction {
  tenant_id: string
  user_id?: string
  amount: number
  type: 'subscription' | 'purchase' | 'usage' | 'refund' | 'bonus'
  description?: string
  metadata?: Record<string, unknown>
}

// Get current credit balance for a tenant
export async function getBalance(tenantId: string): Promise<number> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('balance_after')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error || !data) return 0
  return data.balance_after
}

// Check if tenant has enough credits
export async function hasCredits(tenantId: string, amount: number): Promise<boolean> {
  const balance = await getBalance(tenantId)
  return balance >= amount
}

// Add credits (subscription renewal, purchase, bonus)
export async function addCredits(tx: CreditTransaction): Promise<{ success: boolean; balance: number }> {
  const supabase = createAdminClient()
  const currentBalance = await getBalance(tx.tenant_id)
  const newBalance = currentBalance + Math.abs(tx.amount)
  
  const { error } = await supabase
    .from('credit_transactions')
    .insert({
      tenant_id: tx.tenant_id,
      user_id: tx.user_id,
      amount: Math.abs(tx.amount),
      balance_after: newBalance,
      type: tx.type,
      description: tx.description,
      metadata: tx.metadata || {}
    })
  
  if (error) {
    console.error('Failed to add credits:', error)
    return { success: false, balance: currentBalance }
  }
  
  return { success: true, balance: newBalance }
}

// Deduct credits (usage) - returns false if insufficient
export async function deductCredits(tx: CreditTransaction): Promise<{ success: boolean; balance: number }> {
  const supabase = createAdminClient()
  const currentBalance = await getBalance(tx.tenant_id)
  const deductAmount = Math.abs(tx.amount)
  
  // HARD STOP: No credits = no service
  if (currentBalance < deductAmount) {
    return { success: false, balance: currentBalance }
  }
  
  const newBalance = currentBalance - deductAmount
  
  const { error } = await supabase
    .from('credit_transactions')
    .insert({
      tenant_id: tx.tenant_id,
      user_id: tx.user_id,
      amount: -deductAmount, // Negative for debit
      balance_after: newBalance,
      type: tx.type,
      description: tx.description,
      metadata: tx.metadata || {}
    })
  
  if (error) {
    console.error('Failed to deduct credits:', error)
    return { success: false, balance: currentBalance }
  }
  
  return { success: true, balance: newBalance }
}

// Credit enforcement middleware for API routes
export async function enforceCredits(
  tenantId: string, 
  requiredCredits: number = 1
): Promise<{ allowed: boolean; balance: number; error?: string }> {
  const balance = await getBalance(tenantId)
  
  if (balance < requiredCredits) {
    return {
      allowed: false,
      balance,
      error: `Insufficient credits. Required: ${requiredCredits}, Available: ${balance}`
    }
  }
  
  return { allowed: true, balance }
}
