'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

type PayoutMethod = 'paypal' | 'bank_transfer'

interface PayoutData {
  availableBalance: number
  minimumPayout: number
  settings: {
    method: PayoutMethod | null
    details: Record<string, string>
  } | null
  history: Array<{
    id: string
    amountCents: number
    method: string
    status: string
    createdAt: string
    completedAt: string | null
  }>
}

export default function PayoutsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<PayoutData | null>(null)
  const [method, setMethod] = useState<PayoutMethod>('paypal')
  const [paypalEmail, setPaypalEmail] = useState('')
  const [bankDetails, setBankDetails] = useState({ name: '', routing: '', account: '' })
  const [saving, setSaving] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadPayouts()
    }
  }, [user])

  const loadPayouts = async () => {
    try {
      const res = await fetch('/api/payouts')
      if (res.ok) {
        const payoutData = await res.json()
        setData(payoutData)
        
        // Populate form with existing settings
        if (payoutData.settings?.method) {
          setMethod(payoutData.settings.method as PayoutMethod)
          if (payoutData.settings.method === 'paypal') {
            setPaypalEmail(payoutData.settings.details?.email || '')
          } else if (payoutData.settings.method === 'bank_transfer') {
            setBankDetails({
              name: payoutData.settings.details?.name || '',
              routing: payoutData.settings.details?.routing || '',
              account: payoutData.settings.details?.account || ''
            })
          }
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load payout data' })
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)
    
    const details = method === 'paypal' 
      ? { email: paypalEmail }
      : bankDetails
    
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_settings', method, details })
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Payout settings saved!' })
        loadPayouts()
      } else {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Failed to save settings' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const requestPayout = async () => {
    setRequesting(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_payout' })
      })
      
      const result = await res.json()
      
      if (res.ok) {
        setMessage({ type: 'success', text: result.message })
        loadPayouts()
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to request payout' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to request payout' })
    } finally {
      setRequesting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <div className="text-[var(--text)]">Loading...</div>
      </div>
    )
  }

  const canRequestPayout = data && 
    data.availableBalance >= data.minimumPayout && 
    data.settings?.method

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      {/* Header */}
      <header className="bg-[var(--surface)] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-[var(--text-muted)] font-normal">Payouts</span>
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/referrals" className="text-[var(--text-muted)] hover:text-[var(--text)]">
              Referrals
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-900/50 border border-green-700 text-green-300'
              : 'bg-red-900/50 border border-red-700 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Balance Card */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[var(--text-muted)] text-sm">Available Balance</p>
                  <p className="text-4xl font-bold text-green-400 mt-1">
                    ${(data.availableBalance / 100).toFixed(2)}
                  </p>
                  <p className="text-[var(--text-muted)] text-sm mt-2">
                    Minimum payout: ${(data.minimumPayout / 100).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={requestPayout}
                  disabled={!canRequestPayout || requesting}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    canRequestPayout && !requesting
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-white/10 text-[var(--text-muted)] cursor-not-allowed'
                  }`}
                >
                  {requesting ? 'Requesting...' : 'Request Payout'}
                </button>
              </div>
              {!data.settings?.method && (
                <p className="text-yellow-400 text-sm mt-4">
                  ⚠️ Set up your payout method below before requesting a payout.
                </p>
              )}
            </div>

            {/* Payout Settings */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold mb-4">Payout Method</h2>
              
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setMethod('paypal')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    method === 'paypal'
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <p className="font-medium">PayPal</p>
                  <p className="text-[var(--text-muted)] text-sm">Receive to your PayPal email</p>
                </button>
                <button
                  onClick={() => setMethod('bank_transfer')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                    method === 'bank_transfer'
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <p className="font-medium">Bank Transfer</p>
                  <p className="text-[var(--text-muted)] text-sm">Direct deposit (US banks)</p>
                </button>
              </div>

              {method === 'paypal' && (
                <div className="mb-6">
                  <label className="block text-sm text-[var(--text-muted)] mb-2">PayPal Email</label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="your@paypal.email"
                    className="w-full bg-black/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              )}

              {method === 'bank_transfer' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm text-[var(--text-muted)] mb-2">Account Holder Name</label>
                    <input
                      type="text"
                      value={bankDetails.name}
                      onChange={(e) => setBankDetails({ ...bankDetails, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full bg-black/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[var(--text-muted)] mb-2">Routing Number</label>
                      <input
                        type="text"
                        value={bankDetails.routing}
                        onChange={(e) => setBankDetails({ ...bankDetails, routing: e.target.value })}
                        placeholder="123456789"
                        className="w-full bg-black/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--text-muted)] mb-2">Account Number</label>
                      <input
                        type="text"
                        value={bankDetails.account}
                        onChange={(e) => setBankDetails({ ...bankDetails, account: e.target.value })}
                        placeholder="1234567890"
                        className="w-full bg-black/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={saveSettings}
                disabled={saving}
                className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-white/10 text-white rounded-lg px-6 py-3 font-medium transition-colors"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            {/* Payout History */}
            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold mb-4">Payout History</h2>
              
              {data.history.length > 0 ? (
                <div className="space-y-3">
                  {data.history.map((payout) => (
                    <div key={payout.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="font-medium">
                          ${(payout.amountCents / 100).toFixed(2)}
                        </p>
                        <p className="text-[var(--text-muted)] text-sm">
                          {new Date(payout.createdAt).toLocaleDateString()} via {payout.method.replace('_', ' ')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        payout.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                        payout.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' :
                        payout.status === 'processing' ? 'bg-blue-900/50 text-blue-400' :
                        'bg-red-900/50 text-red-400'
                      }`}>
                        {payout.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-muted)]">No payouts yet. Start referring users to earn commissions!</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
