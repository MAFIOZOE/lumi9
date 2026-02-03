'use client'

import { useState } from 'react'

export default function AgentRunner({ agentId }: { agentId: string }) {
  const [task, setTask] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null)

  const run = async () => {
    if (!task.trim() || isRunning) return

    setIsRunning(true)
    setResult(null)
    setError(null)
    setCreditsUsed(null)

    try {
      const res = await fetch(`/api/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: task.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Failed to run agent')
        return
      }

      setResult(data?.result || '')
      setCreditsUsed(data?.creditsUsed ?? null)
    } catch {
      setError('Failed to run agent')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
      <h2 className="text-[var(--text)] font-bold mb-3">Test Run</h2>

      <div className="flex gap-2">
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Give this agent a task…"
          className="flex-1 bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          disabled={isRunning}
        />
        <button
          onClick={run}
          disabled={isRunning || !task.trim()}
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-white/10 text-white rounded-xl px-6 py-3 font-medium transition-colors"
        >
          {isRunning ? 'Running…' : 'Run'}
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-700 rounded-lg px-4 py-3">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[var(--text-muted)] text-sm">Result</p>
            {creditsUsed !== null && (
              <p className="text-[var(--text-muted)] text-sm">
                Credits used: <span className="font-mono text-emerald-300">{creditsUsed}</span>
              </p>
            )}
          </div>
          <pre className="mt-2 whitespace-pre-wrap text-sm bg-black/30 border border-white/10 rounded-xl p-4 text-[var(--text)]">
            {result}
          </pre>
        </div>
      )}
    </div>
  )
}
