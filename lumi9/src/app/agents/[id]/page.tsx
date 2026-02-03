'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Logo from '@/components/Logo'
import AgentRunner from '@/components/AgentRunner'

interface Agent {
  id: string
  name: string
  description: string | null
  system_prompt: string | null
  model: string | null
  tools: string[]
}

interface Run {
  id: string
  task: string
  status: string
  credits_used: number
  tools_used: string[]
  created_at: string
}

export default function AgentDetailPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const agentId = params.id

  const [agent, setAgent] = useState<Agent | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [allowedTools, setAllowedTools] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  useEffect(() => {
    if (user && agentId) {
      loadAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, agentId])

  const loadAll = async () => {
    setError(null)
    setSuccess(null)

    try {
      const [agentRes, toolsRes, runsRes] = await Promise.all([
        fetch(`/api/agents/${agentId}`),
        fetch('/api/agents'),
        fetch(`/api/agents/${agentId}/runs?limit=20`),
      ])

      const agentJson = await agentRes.json()
      const toolsJson = await toolsRes.json()
      const runsJson = await runsRes.json()

      if (agentRes.ok) setAgent(agentJson?.agent)
      else setError(agentJson?.error || 'Failed to load agent')

      if (toolsRes.ok) setAllowedTools(toolsJson?.allowedTools || [])

      if (runsRes.ok) setRuns(runsJson?.runs || [])
    } catch {
      setError('Failed to load agent')
    }
  }

  const canUseTools = useMemo(() => new Set(allowedTools), [allowedTools])

  const toggleTool = (t: string) => {
    if (!canUseTools.has(t)) return
    setAgent((prev) => (prev ? { ...prev, tools: prev.tools.includes(t) ? prev.tools.filter((x) => x !== t) : [...prev.tools, t] } : prev))
  }

  const save = async () => {
    if (!agent || saving) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agent.name,
          description: agent.description,
          system_prompt: agent.system_prompt,
          model: agent.model,
          tools: agent.tools,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Failed to save')
        return
      }

      setAgent(data.agent)
      setSuccess('Saved')
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!agentId || deleting) return
    if (!confirm('Delete this agent? This cannot be undone.')) return

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Failed to delete')
        return
      }
      router.push('/agents')
    } catch {
      setError('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <div className="text-[var(--text)]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <header className="bg-[var(--surface)] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-[var(--text-muted)] font-normal">Agent</span>
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/agents" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Agents
            </Link>
            <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Dashboard
            </Link>
            <button
              onClick={signOut}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3">
            <p className="text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg px-4 py-3">
            <p className="text-emerald-200">{success}</p>
          </div>
        )}

        {agent ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">Configuration</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={save}
                      disabled={saving}
                      className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-white/10 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={del}
                      disabled={deleting}
                      className="bg-red-600/80 hover:bg-red-600 disabled:bg-white/10 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>

                <label className="block text-sm text-[var(--text-muted)] mb-1">Name</label>
                <input
                  value={agent.name}
                  onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                  className="w-full bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />

                <label className="block text-sm text-[var(--text-muted)] mt-4 mb-1">Description</label>
                <input
                  value={agent.description || ''}
                  onChange={(e) => setAgent({ ...agent, description: e.target.value })}
                  className="w-full bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />

                <label className="block text-sm text-[var(--text-muted)] mt-4 mb-1">System Prompt</label>
                <textarea
                  value={agent.system_prompt || ''}
                  onChange={(e) => setAgent({ ...agent, system_prompt: e.target.value })}
                  className="w-full min-h-32 bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />

                <label className="block text-sm text-[var(--text-muted)] mt-4 mb-1">Model</label>
                <input
                  value={agent.model || ''}
                  onChange={(e) => setAgent({ ...agent, model: e.target.value })}
                  className="w-full bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <AgentRunner agentId={agentId} />
            </div>

            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="font-bold mb-4">Tools (filtered by plan)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allowedTools.map((t) => (
                  <label key={t} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                    <input
                      type="checkbox"
                      checked={agent.tools.includes(t)}
                      onChange={() => toggleTool(t)}
                      className="accent-[var(--primary)]"
                    />
                    <span className="text-sm">{t}</span>
                  </label>
                ))}
                {allowedTools.length === 0 && (
                  <p className="text-[var(--text-muted)] text-sm">Loading tool permissions…</p>
                )}
              </div>
            </div>

            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="font-bold mb-4">Run History</h2>
              {runs.length ? (
                <div className="space-y-3">
                  {runs.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--text)] truncate">{r.task}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {new Date(r.created_at).toLocaleString()} • {r.status} • credits {r.credits_used}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(r.tools_used || []).map((t) => (
                            <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/10 text-[var(--text-muted)]">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-muted)] text-sm">No runs yet.</p>
              )}
            </div>
          </>
        ) : (
          <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
            <p className="text-[var(--text-muted)]">Loading agent…</p>
          </div>
        )}
      </main>
    </div>
  )
}
