'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Logo from '@/components/Logo'
import AgentCard from '@/components/AgentCard'

interface Agent {
  id: string
  name: string
  description: string | null
  tools: string[]
}

export default function AgentsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  const [agents, setAgents] = useState<Agent[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  useEffect(() => {
    if (user) loadAgents()
  }, [user])

  const loadAgents = async () => {
    setError(null)
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Failed to load agents')
        return
      }
      setAgents(data?.agents || [])
    } catch {
      setError('Failed to load agents')
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
            <span className="text-[var(--text-muted)] font-normal">Agents</span>
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Dashboard
            </Link>
            <Link href="/chat" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Chat
            </Link>
            <Link href="/settings/branding" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Branding
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

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Your AI Workforce</h2>
            <p className="text-[var(--text-muted)] text-sm mt-1">Create and run specialized agents per tenant.</p>
          </div>
          <Link
            href="/agents/new"
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          >
            + New Agent
          </Link>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}

          {agents.length === 0 && (
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10 md:col-span-2 lg:col-span-3">
              <p className="text-[var(--text-muted)]">No agents yet. Create your first agent to get started.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
