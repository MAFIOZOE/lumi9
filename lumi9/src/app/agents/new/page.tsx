'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Logo from '@/components/Logo'

const MODELS = [
  'claude-3-haiku-20240307',
  'claude-3-5-sonnet-20241022',
  'gpt-4o-mini',
  'gpt-4o',
]

export default function NewAgentPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [model, setModel] = useState(MODELS[0])
  const [tools, setTools] = useState<string[]>(['web_search'])

  const [allowedTools, setAllowedTools] = useState<string[]>([])
  const [planId, setPlanId] = useState<string>('starter')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  useEffect(() => {
    if (user) loadAllowedTools()
  }, [user])

  const loadAllowedTools = async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      if (res.ok) {
        setAllowedTools(data?.allowedTools || [])
        setPlanId(data?.planId || 'starter')
        // Keep tools selection valid
        const allowed = new Set((data?.allowedTools || []) as string[])
        setTools((prev) => prev.filter((t) => allowed.has(t)))
      }
    } catch {
      // non-fatal
    }
  }

  const canUseTools = useMemo(() => new Set(allowedTools), [allowedTools])

  const toggleTool = (t: string) => {
    if (!canUseTools.has(t)) return
    setTools((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || saving) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          system_prompt: systemPrompt.trim() || null,
          model,
          tools,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Failed to create agent')
        return
      }

      router.push(`/agents/${data.agent.id}`)
    } catch {
      setError('Failed to create agent')
    } finally {
      setSaving(false)
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-[var(--text-muted)] font-normal">New Agent</span>
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/agents" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Back
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={save} className="space-y-6">
          <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
            <h2 className="font-bold mb-4">Basics</h2>

            <label className="block text-sm text-[var(--text-muted)] mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="e.g. Research Assistant"
            />

            <label className="block text-sm text-[var(--text-muted)] mt-4 mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="What does this agent do?"
            />

            <label className="block text-sm text-[var(--text-muted)] mt-4 mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full min-h-32 bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Instructions this agent should always follow..."
            />
          </div>

          <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Tools</h2>
              <p className="text-xs text-[var(--text-muted)]">Plan: {planId}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allowedTools.map((t) => (
                <label key={t} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                  <input
                    type="checkbox"
                    checked={tools.includes(t)}
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
            <h2 className="font-bold mb-4">Model</h2>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-white/10 text-white rounded-xl px-4 py-3 font-medium transition-colors"
          >
            {saving ? 'Saving…' : 'Create Agent'}
          </button>
        </form>
      </main>
    </div>
  )
}
