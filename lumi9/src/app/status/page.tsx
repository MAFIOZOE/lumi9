'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface StatusInfo {
  client: {
    hasSupabaseUrl: boolean
    hasSupabaseKey: boolean
    location: string
    userAgent: string
  }
  server?: any
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusInfo | null>(null)
  const [serverStatus, setServerStatus] = useState<any>(null)

  useEffect(() => {
    // Client-side checks
    const clientStatus = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      location: window.location.hostname,
      userAgent: navigator.userAgent
    }

    setStatus({ client: clientStatus })

    // Try to fetch server status
    fetch('/api/debug')
      .then(res => res.json())
      .then(data => setServerStatus(data))
      .catch(err => setServerStatus({ error: err.message }))
  }, [])

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Loading status...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Lumi9 System Status</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Status */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Client-Side</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="font-mono">{status.client.location}</span>
              </div>
              <div className="flex justify-between">
                <span>Supabase URL:</span>
                <span className={status.client.hasSupabaseUrl ? 'text-green-400' : 'text-red-400'}>
                  {status.client.hasSupabaseUrl ? '✅' : '❌'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Supabase Key:</span>
                <span className={status.client.hasSupabaseKey ? 'text-green-400' : 'text-red-400'}>
                  {status.client.hasSupabaseKey ? '✅' : '❌'}
                </span>
              </div>
            </div>
          </div>

          {/* Server Status */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Server-Side</h2>
            {serverStatus ? (
              <pre className="text-xs bg-gray-900 p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(serverStatus, null, 2)}
              </pre>
            ) : (
              <div className="text-gray-400">Loading...</div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            ← Back to App
          </Link>
        </div>
      </div>
    </div>
  )
}