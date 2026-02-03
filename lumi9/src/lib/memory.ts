import { createAdminClient } from './supabase/admin'

export type MemoryType = 'profile' | 'preferences' | 'long_term' | 'facts'

interface MemoryEntry {
  type: MemoryType
  content: Record<string, unknown>
}

// Get user memory by type
export async function getMemory(
  userId: string, 
  type: MemoryType
): Promise<Record<string, unknown> | null> {
  const admin = createAdminClient()
  
  const { data } = await admin
    .from('user_memory')
    .select('content')
    .eq('user_id', userId)
    .eq('memory_type', type)
    .single()
  
  return data?.content || null
}

// Get all memory for a user
export async function getAllMemory(userId: string): Promise<MemoryEntry[]> {
  const admin = createAdminClient()
  
  const { data } = await admin
    .from('user_memory')
    .select('memory_type, content')
    .eq('user_id', userId)
  
  return (data || []).map(m => ({
    type: m.memory_type as MemoryType,
    content: m.content
  }))
}

// Update or create memory
export async function setMemory(
  tenantId: string,
  userId: string,
  type: MemoryType,
  content: Record<string, unknown>
): Promise<boolean> {
  const admin = createAdminClient()
  
  const { error } = await admin
    .from('user_memory')
    .upsert({
      tenant_id: tenantId,
      user_id: userId,
      memory_type: type,
      content,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,memory_type'
    })
  
  if (error) {
    console.error('Failed to set memory:', error)
    return false
  }
  return true
}

// Add to a memory list (e.g., facts about user)
export async function addToMemory(
  tenantId: string,
  userId: string,
  type: MemoryType,
  key: string,
  value: unknown
): Promise<boolean> {
  const existing = await getMemory(userId, type) || {}
  
  // For 'facts' key, always maintain as array
  if (key === 'facts') {
    const currentFacts = Array.isArray(existing[key]) ? existing[key] as unknown[] : []
    currentFacts.push(value)
    existing[key] = currentFacts
  } else if (Array.isArray(existing[key])) {
    // Handle other array values (append)
    (existing[key] as unknown[]).push(value)
  } else if (Array.isArray(value)) {
    existing[key] = value
  } else {
    existing[key] = value
  }
  
  return setMemory(tenantId, userId, type, existing)
}

// Build system prompt context from user memory
export function buildMemoryContext(memories: MemoryEntry[]): string {
  if (memories.length === 0) return ''
  
  const sections: string[] = []
  
  for (const memory of memories) {
    switch (memory.type) {
      case 'profile':
        if (Object.keys(memory.content).length > 0) {
          sections.push(`User profile: ${formatMemory(memory.content)}`)
        }
        break
      case 'preferences':
        if (Object.keys(memory.content).length > 0) {
          sections.push(`User preferences: ${formatMemory(memory.content)}`)
        }
        break
      case 'facts': {
        const factsValue = memory.content['facts']
        let facts: string[] = []

        // Handle various formats: array, single string, or other
        if (typeof factsValue === 'string') {
          facts = [factsValue]
        } else if (Array.isArray(factsValue)) {
          facts = factsValue.filter((f): f is string => typeof f === 'string')
        }

        if (facts.length > 0) {
          sections.push(`Known facts about user:\n${facts.map((f) => `- ${f}`).join('\n')}`)
        }
        break
      }
      case 'long_term':
        if (Object.keys(memory.content).length > 0) {
          sections.push(`Important context: ${formatMemory(memory.content)}`)
        }
        break
    }
  }
  
  if (sections.length === 0) return ''
  
  return `\n\n[User Memory]\n${sections.join('\n\n')}\n[End User Memory]`
}

function formatMemory(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .filter(([_, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
}

// Extract facts from AI response (AI can call this pattern)
export function parseMemoryUpdates(text: string): Array<{type: MemoryType, key: string, value: unknown}> {
  const updates: Array<{type: MemoryType, key: string, value: unknown}> = []
  
  // Look for [REMEMBER: ...] patterns in AI responses
  const rememberPattern = /\[REMEMBER:\s*(.+?)\]/gi
  let match
  
  while ((match = rememberPattern.exec(text)) !== null) {
    const fact = match[1].trim()
    updates.push({ type: 'facts', key: 'facts', value: fact })
  }
  
  return updates
}
