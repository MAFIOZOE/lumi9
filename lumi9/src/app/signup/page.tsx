'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Sign up with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // If email confirmation is disabled, user is immediately logged in
    if (data.user && data.session) {
      // Provision user/tenant records
      try {
        // Check for referral code
        const referralCode = localStorage.getItem('referral_code') || 
          new URLSearchParams(window.location.search).get('ref')
        
        await fetch('/api/auth/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode })
        })
        
        // Clear referral code after use
        localStorage.removeItem('referral_code')
      } catch (provisionError) {
        console.error('Provision error:', provisionError)
        // Continue anyway - provision can retry on next login
      }
      router.push('/chat')
    } else {
      // Email confirmation required
      setSuccess(true)
    }
    
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 text-[var(--text)]">
        <div className="max-w-md w-full text-center">
          <div className="bg-[var(--surface)] rounded-2xl p-8">
            <div className="text-5xl mb-4">✉️</div>
            <h2 className="text-2xl font-bold mb-2">Check your email</h2>
            <p className="text-[var(--text-muted)]">
              We sent a confirmation link to <strong className="text-[var(--text)]">{email}</strong>
            </p>
            <Link
              href="/login"
              className="inline-block mt-6 text-[var(--accent)] hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 text-[var(--text)]">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <p className="text-[var(--text-muted)] mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSignup} className="bg-[var(--surface)] rounded-2xl p-8 space-y-6">
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[var(--text)] mb-2">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text)] mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text)] mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="••••••••"
              minLength={6}
              required
            />
            <p className="text-[var(--text-muted)] text-xs mt-1">Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-white/10 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-[var(--text-muted)] text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
