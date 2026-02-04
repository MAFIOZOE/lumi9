'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useBranding } from '@/components/BrandProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  id: string
  title: string | null
  created_at: string
}

export default function ChatPage() {
  const branding = useBranding()
  const { user, loading, signOut, error: authError } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Load conversations list
  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  // Load conversation from URL param
  useEffect(() => {
    const convoId = searchParams.get('c')
    if (convoId && convoId !== conversationId) {
      loadConversation(convoId)
    }
  }, [searchParams])

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/chat')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    }
  }

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/chat?conversationId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages.map((m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content
        })))
        setConversationId(id)
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }

  const startNewConversation = () => {
    setMessages([])
    setConversationId(null)
    setError(null)
    router.push('/chat')
  }

  const selectConversation = (id: string) => {
    router.push(`/chat?c=${id}`)
    setShowSidebar(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage.content,
          conversationId 
        })
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setError(`💳 Out of credits! Current balance: ${data.balance || 0}`)
        } else if (res.status === 401) {
          router.push('/login')
          return
        } else if (res.status === 503) {
          setError('🤖 AI service is temporarily unavailable. Please try again in a moment.')
        } else {
          setError(data.error || '❌ Something went wrong. Please try again.')
        }
        return
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message
      }

      setMessages(prev => [...prev, assistantMessage])
      setCredits(data.credits?.remaining ?? null)

      // Update conversation ID if new
      if (data.conversationId && data.conversationId !== conversationId) {
        setConversationId(data.conversationId)
        router.push(`/chat?c=${data.conversationId}`, { scroll: false })
        loadConversations() // Refresh sidebar
      }

    } catch (err) {
      console.error('Chat error:', err)
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          setError('🌐 Connection failed. Please check your internet and try again.')
        } else {
          setError(`❌ ${err.message}`)
        }
      } else {
        setError('❌ Failed to send message. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Show auth error if present
  if (authError) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)] px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-[var(--surface)] rounded-2xl p-8 border border-white/10">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-[var(--text)] mb-4">Authentication Error</h1>
            <p className="text-[var(--text-muted)] mb-6">
              {authError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium py-3 rounded-xl transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <div className="text-[var(--text)]">Loading...</div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--text)]">
      {/* Sidebar */}
      <aside className={`${showSidebar ? 'block' : 'hidden'} md:block w-64 bg-[var(--surface)] border-r border-white/10 flex flex-col`}>
        <div className="p-4 border-b border-white/10">
          <button
            onClick={startNewConversation}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg px-4 py-2 font-medium transition-colors"
          >
            + New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => selectConversation(convo.id)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 truncate transition-colors ${
                convo.id === conversationId
                  ? 'bg-white/10 text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text)]'
              }`}
            >
              {convo.title || 'New conversation'}
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-[var(--text-muted)] text-sm text-center mt-4">No conversations yet</p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-[var(--surface)] border-b border-white/10 px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="md:hidden text-gray-400 hover:text-white"
              >
                ☰
              </button>
              <h1 className="text-xl font-bold text-[var(--text)]">{branding.brandName}</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text)] hidden sm:block">
                Dashboard
              </Link>
              <Link href="/agents" className="text-[var(--text-muted)] hover:text-[var(--text)] hidden sm:block">
                Agents
              </Link>
              {credits !== null && (
                <div className="text-sm text-[var(--text-muted)]">
                  Credits: <span className="text-emerald-300 font-mono">{credits}</span>
                </div>
              )}
              <div className="text-sm text-[var(--text-muted)] hidden sm:block">
                {user.email}
              </div>
              <button
                onClick={signOut}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-[var(--text-muted)] mt-20">
                <p className="text-2xl mb-2">👋</p>
                <p>Start a conversation</p>
              </div>
            )}
            
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-white/10 text-[var(--text)]'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-[var(--text)] rounded-2xl px-4 py-2">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Error banner */}
        {error && (
          <div className="bg-red-900/50 border-t border-red-700 px-4 py-2">
            <p className="text-red-300 text-center text-sm">{error}</p>
          </div>
        )}

        {/* Input */}
        <footer className="bg-[var(--surface)] border-t border-white/10 p-4">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-black/20 text-[var(--text)] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-white/10 text-white rounded-xl px-6 py-3 font-medium transition-colors"
            >
              Send
            </button>
          </form>
        </footer>
      </div>
    </div>
  )
}
