'use client'

import Link from 'next/link'

export interface AgentCardData {
  id: string
  name: string
  description?: string | null
  tools?: string[]
}

export default function AgentCard({ agent }: { agent: AgentCardData }) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="block bg-[var(--surface)] rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[var(--text)] text-lg font-bold">{agent.name}</h3>
          {agent.description && (
            <p className="text-[var(--text-muted)] text-sm mt-1 line-clamp-2">{agent.description}</p>
          )}
        </div>
        <span className="text-[var(--accent)] text-sm">Edit →</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(agent.tools || []).map((t) => (
          <span
            key={t}
            className="text-xs px-2 py-1 rounded-full bg-white/10 text-[var(--text-muted)]"
          >
            {t}
          </span>
        ))}
        {(agent.tools || []).length === 0 && (
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-[var(--text-muted)]">
            no tools
          </span>
        )}
      </div>
    </Link>
  )
}
