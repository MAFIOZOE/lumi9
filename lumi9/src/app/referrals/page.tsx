'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

interface ReferralData {
  referralCode: string
  shareLink: string
  directReferrals: number
  totalNetwork: number
  pendingCommissions: number
  paidCommissions: number
  commissionRates: {
    level1: string
    level2: string
    level3: string
    level4: string
  }
}

export default function ReferralsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<ReferralData | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadReferrals()
    }
  }, [user])

  const loadReferrals = async () => {
    try {
      const res = await fetch('/api/referrals')
      if (res.ok) {
        const referralData = await res.json()
        setData(referralData)
      } else {
        setError('Failed to load referral data')
      }
    } catch {
      setError('Failed to load referral data')
    }
  }

  const copyLink = async () => {
    if (data?.shareLink) {
      await navigator.clipboard.writeText(data.shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
            <span className="text-[var(--text-muted)] font-normal">Referrals</span>
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Dashboard
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
          <div className="space-y-6">
            {/* Share Card */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold mb-4">Your Referral Link</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={data.shareLink}
                  className="flex-1 bg-black/20 rounded-lg px-4 py-3 font-mono text-sm"
                />
                <button
                  onClick={copyLink}
                  className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg px-6 py-3 font-medium transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-[var(--text-muted)] text-sm mt-2">
                Share this link to earn commissions when people sign up and subscribe!
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[var(--surface)] rounded-xl p-5 border border-white/10">
                <p className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Direct Referrals</p>
                <p className="text-3xl font-bold mt-1">{data.directReferrals}</p>
              </div>
              <div className="bg-[var(--surface)] rounded-xl p-5 border border-white/10">
                <p className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Total Network</p>
                <p className="text-3xl font-bold mt-1">{data.totalNetwork}</p>
              </div>
              <div className="bg-[var(--surface)] rounded-xl p-5 border border-white/10">
                <p className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Pending Earnings</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">
                  ${(data.pendingCommissions / 100).toFixed(2)}
                </p>
                {data.pendingCommissions >= 1000 && (
                  <Link href="/payouts" className="text-[var(--accent)] text-sm hover:underline mt-2 block">
                    Request payout →
                  </Link>
                )}
              </div>
              <div className="bg-[var(--surface)] rounded-xl p-5 border border-white/10">
                <p className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Total Earned</p>
                <p className="text-3xl font-bold text-green-400 mt-1">
                  ${(data.paidCommissions / 100).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Commission Rates */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold mb-4">Commission Structure</h2>
              <p className="text-[var(--text-muted)] text-sm mb-4">
                Earn commissions up to 4 levels deep when your referrals make payments:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <p className="text-2xl font-bold text-[var(--accent)]">{data.commissionRates.level1}</p>
                  <p className="text-[var(--text-muted)] text-sm">Level 1 (Direct)</p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <p className="text-2xl font-bold text-[var(--accent)]">{data.commissionRates.level2}</p>
                  <p className="text-[var(--text-muted)] text-sm">Level 2</p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <p className="text-2xl font-bold text-[var(--accent)]">{data.commissionRates.level3}</p>
                  <p className="text-[var(--text-muted)] text-sm">Level 3</p>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <p className="text-2xl font-bold text-[var(--accent)]">{data.commissionRates.level4}</p>
                  <p className="text-[var(--text-muted)] text-sm">Level 4</p>
                </div>
              </div>
            </div>

            {/* Your Code */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold mb-2">Your Referral Code</h2>
              <p className="text-4xl font-mono font-bold text-[var(--accent)]">{data.referralCode}</p>
              <p className="text-[var(--text-muted)] text-sm mt-2">
                People can also enter this code manually during signup.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-[var(--text-muted)]">Loading referral data...</div>
          </div>
        )}
      </main>
    </div>
  )
}
