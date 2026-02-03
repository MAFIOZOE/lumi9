import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceCredits, deductCredits } from '@/lib/credits'
import { chat } from '@/lib/ai/claude'
import { 
  getOrCreateConversation, 
  saveMessage, 
  getConversationHistory,
  updateConversationTitle,
  touchConversation
} from '@/lib/conversations'
import { getAllMemory, buildMemoryContext, parseMemoryUpdates, addToMemory } from '@/lib/memory'

const CREDITS_PER_MESSAGE = 1 // Flat rate for now

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user first
    const admin = createAdminClient()
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get user record (includes tenant_id)
    const { data: user } = await admin
      .from('users')
      .select('id, tenant_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please contact support.' },
        { status: 404 }
      )
    }

    // 3. CREDIT CHECK - Hard enforcement (tenant-level credits)
    const creditCheck = await enforceCredits(user.tenant_id, CREDITS_PER_MESSAGE)
    if (!creditCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Insufficient credits',
          balance: creditCheck.balance,
          required: CREDITS_PER_MESSAGE
        },
        { status: 402 } // Payment Required
      )
    }

    // 4. Get message and optional conversationId from body
    const { message, conversationId: inputConvoId } = await request.json()
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // 5. Get or create conversation
    const conversation = await getOrCreateConversation(
      user.tenant_id,
      user.id,
      inputConvoId
    )
    const conversationId = conversation.id
    const isNewConversation = !inputConvoId || inputConvoId !== conversationId

    // 6. Get conversation history for context
    const history = await getConversationHistory(conversationId, 20)
    const contextMessages = history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))
    
    // Add current message
    contextMessages.push({ role: 'user', content: message })

    // 7. Save user message
    await saveMessage(conversationId, {
      role: 'user',
      content: message
    })

    // 8. Get user memory for personalization
    const memories = await getAllMemory(user.id)
    const memoryContext = buildMemoryContext(memories)
    
    const systemPrompt = `You are a helpful AI assistant for Lumi9.
You are friendly, professional, and concise.
Keep responses helpful but brief unless the user asks for more detail.

If you learn something important about the user that should be remembered for future conversations, include it in your response using this format: [REMEMBER: fact about the user]
Only use this for genuinely useful long-term facts, not trivial things.
${memoryContext}`

    // 9. Call Claude Haiku with conversation context + memory
    let aiResponse: string
    try {
      const result = await chat(contextMessages, { systemPrompt })
      aiResponse = result.content
    } catch (aiError) {
      console.error('Claude API error:', aiError)
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      )
    }

    // 10. Extract and save any memory updates from AI response
    const memoryUpdates = parseMemoryUpdates(aiResponse)
    for (const update of memoryUpdates) {
      await addToMemory(user.tenant_id, user.id, update.type, update.key, update.value)
    }
    
    // Clean the [REMEMBER: ...] tags from visible response
    const cleanResponse = aiResponse.replace(/\[REMEMBER:\s*.+?\]/gi, '').trim()

    // 11. Save assistant message (clean version)
    await saveMessage(conversationId, {
      role: 'assistant',
      content: cleanResponse,
      credits_used: CREDITS_PER_MESSAGE
    })

    // 12. Update conversation title if new (use first message snippet)
    if (isNewConversation) {
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '')
      await updateConversationTitle(conversationId, title)
    } else {
      await touchConversation(conversationId)
    }

    // 13. Deduct credits AFTER successful response
    const deduction = await deductCredits({
      tenant_id: user.tenant_id,
      user_id: user.id,
      amount: CREDITS_PER_MESSAGE,
      type: 'usage',
      description: 'Chat message',
      metadata: { conversationId }
    })

    if (!deduction.success) {
      console.error('Credit deduction failed after check passed')
    }

    // 14. Return response with conversation info
    return NextResponse.json({
      message: cleanResponse,
      conversationId,
      isNewConversation,
      credits: {
        used: CREDITS_PER_MESSAGE,
        remaining: deduction.balance
      }
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - List conversations or get conversation history
export async function GET(request: NextRequest) {
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

    const conversationId = request.nextUrl.searchParams.get('conversationId')
    
    if (conversationId) {
      // Get specific conversation history
      const history = await getConversationHistory(conversationId, 100)
      return NextResponse.json({ messages: history })
    } else {
      // List all conversations
      const { listConversations } = await import('@/lib/conversations')
      const conversations = await listConversations(user.id)
      return NextResponse.json({ conversations })
    }
  } catch (error) {
    console.error('Chat GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
