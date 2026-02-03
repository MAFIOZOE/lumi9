import { createAdminClient } from '@/lib/supabase/admin'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens_used?: number
  credits_used?: number
  metadata?: Record<string, unknown>
}

// Get or create a conversation for a user
export async function getOrCreateConversation(
  tenantId: string,
  userId: string,
  conversationId?: string
) {
  const admin = createAdminClient()
  
  // If conversationId provided, verify it belongs to this user
  if (conversationId) {
    const { data: existing } = await admin
      .from('conversations')
      .select('id, title')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()
    
    if (existing) {
      return existing
    }
  }
  
  // Create new conversation
  const { data: newConvo, error } = await admin
    .from('conversations')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      channel: 'web'
    })
    .select('id, title')
    .single()
  
  if (error) {
    console.error('Failed to create conversation:', error)
    throw new Error('Failed to create conversation')
  }
  
  return newConvo
}

// Save a message to a conversation
export async function saveMessage(
  conversationId: string,
  message: Message
) {
  const admin = createAdminClient()
  
  const { data, error } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      tokens_used: message.tokens_used || 0,
      credits_used: message.credits_used || 0,
      metadata: message.metadata || {}
    })
    .select('id, created_at')
    .single()
  
  if (error) {
    console.error('Failed to save message:', error)
    throw new Error('Failed to save message')
  }
  
  return data
}

// Get conversation history
export async function getConversationHistory(
  conversationId: string,
  limit: number = 50
) {
  const admin = createAdminClient()
  
  const { data, error } = await admin
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)
  
  if (error) {
    console.error('Failed to get history:', error)
    return []
  }
  
  return data || []
}

// List user's conversations
export async function listConversations(
  userId: string,
  limit: number = 20
) {
  const admin = createAdminClient()
  
  const { data, error } = await admin
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Failed to list conversations:', error)
    return []
  }
  
  return data || []
}

// Update conversation title (auto-generate from first message)
export async function updateConversationTitle(
  conversationId: string,
  title: string
) {
  const admin = createAdminClient()
  
  await admin
    .from('conversations')
    .update({ 
      title: title.slice(0, 100),
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId)
}

// Touch conversation (update timestamp)
export async function touchConversation(conversationId: string) {
  const admin = createAdminClient()
  
  await admin
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}
