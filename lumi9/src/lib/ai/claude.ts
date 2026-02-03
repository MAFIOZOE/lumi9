import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for Lumi9. 
You are friendly, professional, and concise.
Keep responses helpful but brief unless the user asks for more detail.`

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const {
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    maxTokens = 1024,
    temperature = 0.7,
  } = options

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  })

  const textContent = response.content.find(c => c.type === 'text')
  const content = textContent?.type === 'text' ? textContent.text : ''

  return {
    content,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}

// Estimate cost for monitoring (Haiku pricing)
export function estimateCost(inputTokens: number, outputTokens: number): number {
  const INPUT_COST_PER_M = 0.25  // $0.25 per million input tokens
  const OUTPUT_COST_PER_M = 1.25 // $1.25 per million output tokens
  
  return (inputTokens * INPUT_COST_PER_M / 1_000_000) + 
         (outputTokens * OUTPUT_COST_PER_M / 1_000_000)
}
