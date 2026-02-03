import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-[var(--text)] mb-4">
          Lumi<span className="text-[var(--accent)]">9</span>
        </h1>
        <p className="text-xl text-[var(--text-muted)] mb-8 max-w-md mx-auto">
          Your AI workforce, ready when you are.
        </p>
        
        <div className="space-x-4">
          <Link
            href="/chat"
            className="inline-block bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium px-8 py-3 rounded-xl transition-colors"
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
        
        <p className="text-[var(--text-muted)] text-sm mt-12">
          Multi-tenant AI platform • Built for scale
        </p>
      </div>
    </div>
  )
}
