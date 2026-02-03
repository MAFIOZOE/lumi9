'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function JoinPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  useEffect(() => {
    if (code) {
      // Store referral code in localStorage for signup
      localStorage.setItem('referral_code', code.toUpperCase())
      // Redirect to signup
      router.push('/signup?ref=' + code)
    }
  }, [code, router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p>Redirecting to signup...</p>
      </div>
    </div>
  )
}
