'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

interface DashboardData {
  user: {
    name: string
    email: string
    role: string
  }
  tenant: {
    name: string
    slug: string
  }
  subscription: {
    status: string
    plan: {
      id: string
      name: string
      credits_per_month: number
      price_cents: number
    }
    currentPeriodEnd: string
  } | null
  credits: {
    balance: number
    monthlyAllowance: number
  }
  stats: {
    conversations: number
    messagesThisMonth: number
    agents: number
  }
  recentAgentRuns: Array<{
    id: string
    agent_id: string
    task: string
    status: string
    credits_used: number
    created_at: string
  }>
  recentTransactions: Array<{
    id: string
    amount: number
    type: string
    description: string
    created_at: string
  }>
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadDashboard()
    }
  }, [user])

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const dashboardData = await res.json()
        setData(dashboardData)
      } else {
        setError('Failed to load dashboard')
      }
    } catch {
      setError('Failed to load dashboard')
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
      {/* Header */}
      <header className="bg-[var(--surface)] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-[var(--text-muted)] font-normal">Dashboard</span>
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/settings/branding" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Branding
            </Link>
            <Link href="/agents" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Agents
            </Link>
            <Link href="/chat" className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
              Chat →
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
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Welcome Card */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="text-[var(--text-muted)] text-sm font-medium mb-1">Welcome back</h2>
              <p className="text-[var(--text)] text-2xl font-bold">{data.user.name || data.user.email}</p>
              <p className="text-[var(--text-muted)] text-sm mt-1">{data.tenant.name}</p>
              <p className="text-[var(--text-muted)] text-xs mt-2">{data.tenant.slug}.lumi9.ai</p>
            </div>

            {/* Credits Card */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="text-[var(--text-muted)] text-sm font-medium mb-1">Credits</h2>
              <p className="text-[var(--text)] text-4xl font-bold">
                <span className={data.credits.balance < 100 ? 'text-yellow-400' : 'text-green-400'}>
                  {data.credits.balance.toLocaleString()}
                </span>
              </p>
              {data.subscription && (
                <p className="text-[var(--text-muted)] text-sm mt-2">
                  {data.credits.monthlyAllowance.toLocaleString()} / month on {data.subscription.plan.name}
                </p>
              )}
              {data.credits.balance < 100 && (
                <button className="mt-4 w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text)] rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                  Buy More Credits
                </button>
              )}
            </div>

            {/* Plan Card */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="text-[var(--text-muted)] text-sm font-medium mb-1">Current Plan</h2>
              {data.subscription ? (
                <>
                  <p className="text-[var(--text)] text-2xl font-bold">{data.subscription.plan.name}</p>
                  <p className="text-[var(--text-muted)] text-sm mt-1">
                    ${(data.subscription.plan.price_cents / 100).toFixed(2)}/month
                  </p>
                  <p className="text-[var(--text-muted)] text-xs mt-2">
                    Renews {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[var(--text)] text-2xl font-bold">Free Trial</p>
                  <button className="mt-4 w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text)] rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                    Upgrade Plan
                  </button>
                </>
              )}
            </div>

            {/* Stats Card */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="text-[var(--text-muted)] text-sm font-medium mb-4">Usage Stats</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-[var(--text-muted)] text-xs">Conversations</p>
                  <p className="text-[var(--text)] text-xl font-bold">{data.stats.conversations}</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-xs">Messages This Month</p>
                  <p className="text-[var(--text)] text-xl font-bold">{data.stats.messagesThisMonth}</p>
                </div>
              </div>
            </div>

            {/* Agents Card */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="text-[var(--text-muted)] text-sm font-medium mb-1">Agents</h2>
              <p className="text-[var(--text)] text-4xl font-bold">{data.stats.agents}</p>
              <Link
                href="/agents"
                className="mt-4 inline-block text-[var(--accent)] hover:text-[var(--accent-hover)] text-sm"
              >
                Manage agents →
              </Link>
            </div>

            {/* Recent Agent Runs */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[var(--text-muted)] text-sm font-medium">Recent Agent Runs</h2>
                <Link href="/agents" className="text-[var(--text-muted)] hover:text-[var(--text)] text-sm">
                  View all
                </Link>
              </div>
              {data.recentAgentRuns.length > 0 ? (
                <div className="space-y-3">
                  {data.recentAgentRuns.map((run) => (
                    <div key={run.id} className="flex justify-between items-center gap-4">
                      <div className="min-w-0">
                        <p className="text-[var(--text)] text-sm truncate">{run.task}</p>
                        <p className="text-[var(--text-muted)] text-xs">
                          {new Date(run.created_at).toLocaleDateString()} • {run.status} • credits {run.credits_used}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-muted)] text-sm">No agent runs yet</p>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10 md:col-span-2">
              <h2 className="text-[var(--text-muted)] text-sm font-medium mb-4">Recent Transactions</h2>
              {data.recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {data.recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center">
                      <div>
                        <p className="text-[var(--text)] text-sm">{tx.description}</p>
                        <p className="text-[var(--text-muted)] text-xs">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`font-mono text-sm ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-muted)] text-sm">No transactions yet</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-[var(--text-muted)]">Loading dashboard...</div>
          </div>
        )}
      </main>
    </div>
  )
}



