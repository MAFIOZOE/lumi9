import { createAdminClient } from './supabase/admin'
import { deductCredits, hasCredits } from './credits'
import { getOpenClawClient } from './openclaw'

export type AgentTool =
  | 'web_search'
  | 'web_browse'
  | 'code_exec'
  | 'file_access'
  | 'email_send'
  | 'basic_chat'

export const TOOL_CREDITS: Record<AgentTool, number> = {
  web_search: 2,
  web_browse: 5,
  code_exec: 3,
  file_access: 4,
  email_send: 5,
  basic_chat: 1,
}

export const PLAN_TOOLS: Record<string, AgentTool[]> = {
  starter: ['web_search', 'basic_chat'],
  pro: ['web_search', 'web_browse', 'code_exec', 'basic_chat'],
  distributor: ['web_search', 'web_browse', 'code_exec', 'file_access', 'email_send', 'basic_chat'],
}

export interface AgentRow {
  id: string
  tenant_id: string
  name: string
  description: string | null
  system_prompt: string | null
  model: string | null
  tools: AgentTool[]
  settings: Record<string, unknown>
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface AgentRunRow {
  id: string
  agent_id: string
  user_id: string
  tenant_id: string
  task: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result: string | null
  error: string | null
  credits_used: number
  tools_used: AgentTool[]
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface CreateAgentInput {
  name: string
  description?: string
  system_prompt?: string
  model?: string
  tools?: AgentTool[]
  settings?: Record<string, unknown>
  is_default?: boolean
}

export type UpdateAgentInput = Partial<CreateAgentInput>

export interface AgentRunResult {
  runId: string
  status: AgentRunRow['status']
  result?: string
  error?: string
  creditsUsed: number
  toolsUsed: AgentTool[]
}

async function getTenantPlanId(tenantId: string): Promise<string> {
  const admin = createAdminClient()

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('plan_id, status')
    .eq('tenant_id', tenantId)
    .single()

  const planId = subscription?.plan_id || 'starter'
  return planId
}

function normalizeTools(tools: unknown): AgentTool[] {
  if (!Array.isArray(tools)) return ['web_search']
  return (tools as string[]).filter(Boolean) as AgentTool[]
}

function calculateCreditsFromTools(toolsUsed: string[]): number {
  const unique = Array.from(new Set(toolsUsed.filter(Boolean)))
  if (!unique.length) return TOOL_CREDITS.basic_chat

  return unique.reduce((sum, t) => {
    const key = t as AgentTool
    return sum + (TOOL_CREDITS[key] ?? TOOL_CREDITS.basic_chat)
  }, 0)
}

export async function getAgents(tenantId: string): Promise<AgentRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []).map((a) => ({
    ...(a as AgentRow),
    tools: normalizeTools((a as { tools?: unknown }).tools),
  }))
}

export async function getAgent(agentId: string, tenantId: string): Promise<AgentRow | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) return null
  return {
    ...(data as AgentRow),
    tools: normalizeTools((data as { tools?: unknown }).tools),
  }
}

export async function createAgent(tenantId: string, data: CreateAgentInput): Promise<AgentRow> {
  const supabase = createAdminClient()

  const payload = {
    tenant_id: tenantId,
    name: data.name,
    description: data.description ?? null,
    system_prompt: data.system_prompt ?? null,
    model: data.model ?? 'claude-3-haiku-20240307',
    tools: data.tools ?? ['web_search'],
    settings: data.settings ?? {},
    is_default: data.is_default ?? false,
  }

  const { data: created, error } = await supabase
    .from('agents')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error
  return {
    ...(created as AgentRow),
    tools: normalizeTools((created as { tools?: unknown }).tools),
  }
}

export async function updateAgent(agentId: string, tenantId: string, data: UpdateAgentInput): Promise<AgentRow | null> {
  const supabase = createAdminClient()

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.name !== undefined) patch.name = data.name
  if (data.description !== undefined) patch.description = data.description ?? null
  if (data.system_prompt !== undefined) patch.system_prompt = data.system_prompt ?? null
  if (data.model !== undefined) patch.model = data.model
  if (data.tools !== undefined) patch.tools = data.tools
  if (data.settings !== undefined) patch.settings = data.settings
  if (data.is_default !== undefined) patch.is_default = data.is_default

  const { data: updated, error } = await supabase
    .from('agents')
    .update(patch)
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error || !updated) return null
  return {
    ...(updated as AgentRow),
    tools: normalizeTools((updated as { tools?: unknown }).tools),
  }
}

export async function deleteAgent(agentId: string, tenantId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', agentId)
    .eq('tenant_id', tenantId)

  return !error
}

export async function executeAgentTask(
  agentId: string,
  userId: string,
  tenantId: string,
  task: string
): Promise<AgentRunResult> {
  const admin = createAdminClient()

  // 1) Get agent config
  const agent = await getAgent(agentId, tenantId)
  if (!agent) {
    throw new Error('Agent not found')
  }

  // 2) Check user's plan for allowed tools
  const planId = await getTenantPlanId(tenantId)
  const allowedTools = PLAN_TOOLS[planId] || PLAN_TOOLS.starter

  const requestedTools = (agent.tools || []).filter((t) => allowedTools.includes(t))

  // 3) Check credits (estimate)
  const estimated = Math.max(1, calculateCreditsFromTools(requestedTools))
  const ok = await hasCredits(tenantId, estimated)
  if (!ok) {
    throw new Error(`Insufficient credits (need ~${estimated})`)
  }

  // 4) Create agent_run (status: running)
  const startedAt = new Date().toISOString()
  const { data: run, error: runError } = await admin
    .from('agent_runs')
    .insert({
      agent_id: agentId,
      user_id: userId,
      tenant_id: tenantId,
      task,
      status: 'running',
      started_at: startedAt,
    })
    .select('*')
    .single()

  if (runError || !run) {
    throw runError || new Error('Failed to create agent run')
  }

  const runId = (run as { id: string }).id

  try {
    // 5) Execute via OpenClaw client
    const client = getOpenClawClient()
    const result = await client.executeTask({
      task,
      systemPrompt: agent.system_prompt ?? undefined,
      model: agent.model ?? undefined,
      tools: requestedTools,
      timeout: 60_000,
    })

    if (!result.success) {
      throw new Error(result.error || 'OpenClaw execution failed')
    }

    // 6) Calculate credits used based on tools
    const creditsUsed = calculateCreditsFromTools(result.toolsUsed || requestedTools)

    // 7) Deduct credits
    const debit = await deductCredits({
      tenant_id: tenantId,
      user_id: userId,
      amount: creditsUsed,
      type: 'usage',
      description: `Agent run: ${agent.name}`,
      metadata: { agentId, runId, tools: result.toolsUsed || requestedTools },
    })

    if (!debit.success) {
      throw new Error('Insufficient credits')
    }

    // 8) Update agent_run
    await admin
      .from('agent_runs')
      .update({
        status: 'completed',
        result: result.response,
        credits_used: creditsUsed,
        tools_used: result.toolsUsed || requestedTools,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId)

    // 9) Return
    return {
      runId,
      status: 'completed',
      result: result.response,
      creditsUsed,
      toolsUsed: (result.toolsUsed || requestedTools) as AgentTool[],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    await admin
      .from('agent_runs')
      .update({
        status: 'failed',
        error: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId)

    return {
      runId,
      status: 'failed',
      error: message,
      creditsUsed: 0,
      toolsUsed: requestedTools,
    }
  }
}

export async function getAgentRuns(agentId: string, tenantId: string, limit: number = 20): Promise<AgentRunRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('agent_runs')
    .select('*')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data || []).map((r) => ({
    ...(r as AgentRunRow),
    tools_used: normalizeTools((r as { tools_used?: unknown }).tools_used),
  }))
}

export async function getAllowedToolsForTenant(tenantId: string): Promise<{ planId: string; allowedTools: AgentTool[] }> {
  const planId = await getTenantPlanId(tenantId)
  const allowedTools = PLAN_TOOLS[planId] || PLAN_TOOLS.starter
  return { planId, allowedTools }
}
