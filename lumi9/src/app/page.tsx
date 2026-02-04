'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-white mb-4">
          Lumi<span className="text-cyan-400">9</span>
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-md mx-auto">
          Your AI workforce, ready when you are.
        </p>
        
        <div className="space-x-4">
          <Link
            href="/chat"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-3 rounded-xl transition-colors"
          >
            Start Chatting
          </Link>
          <Link
            href="/login"
            className="inline-block bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-3 rounded-xl transition-colors"
          >
            Sign In
          </Link>
        </div>
        
        <p className="text-gray-500 text-sm mt-12">
          Multi-tenant AI platform • Built for scale
        </p>

        <div className="mt-8 space-x-4">
          <Link
            href="/status" 
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            System Status
          </Link>
          <span className="text-gray-700">•</span>
          <a
            href="https://lumi9.pages.dev"
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            Fallback URL
          </a>
        </div>
      </div>
    </div>
  )
}