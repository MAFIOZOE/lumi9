'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Branding } from '@/lib/branding'
import { getDefaultBranding, normalizeBranding } from '@/lib/branding'
import Logo from '@/components/Logo'

export default function BrandingSettingsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [branding, setBranding] = useState<Branding>(() => getDefaultBranding())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setError(null)
      const res = await fetch('/api/branding')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to load branding')
        return
      }
      const data = await res.json()
      setBranding(normalizeBranding(data.branding))
    }
    load()
  }, [user])

  const preview = useMemo(() => normalizeBranding(branding), [branding])

  const update = <K extends keyof Branding>(key: K, value: Branding[K]) => {
    setBranding((b) => ({ ...b, [key]: value }))
    setSuccess(null)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding: preview }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to save branding')
        return
      }

      setBranding(normalizeBranding(data.branding))
      setSuccess('Saved')
    } catch {
      setError('Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--text)]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Branding</h1>
            <p className="text-[var(--text-muted)] text-sm">Customize how your tenant looks across Lumi9.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Back
          </button>
        </div>

        {(error || success) && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 ${
              error
                ? 'border-red-700 bg-red-900/30 text-red-200'
                : 'border-emerald-700 bg-emerald-900/30 text-emerald-200'
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Brand name</label>
                <input
                  value={branding.brandName}
                  onChange={(e) => update('brandName', e.target.value)}
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Tagline</label>
                <input
                  value={branding.tagline}
                  onChange={(e) => update('tagline', e.target.value)}
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Logo URL</label>
                <input
                  value={branding.logoUrl ?? ''}
                  onChange={(e) => update('logoUrl', e.target.value.trim() ? e.target.value : null)}
                  placeholder="https://..."
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Favicon URL</label>
                <input
                  value={branding.faviconUrl ?? ''}
                  onChange={(e) => update('faviconUrl', e.target.value.trim() ? e.target.value : null)}
                  placeholder="https://..."
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Primary color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => update('primaryColor', e.target.value)}
                      className="h-10 w-14 rounded-lg border border-white/10 bg-transparent"
                    />
                    <input
                      value={branding.primaryColor}
                      onChange={(e) => update('primaryColor', e.target.value)}
                      className="flex-1 rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Accent color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={branding.accentColor}
                      onChange={(e) => update('accentColor', e.target.value)}
                      className="h-10 w-14 rounded-lg border border-white/10 bg-transparent"
                    />
                    <input
                      value={branding.accentColor}
                      onChange={(e) => update('accentColor', e.target.value)}
                      className="flex-1 rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Theme</label>
                <select
                  value={branding.theme}
                  onChange={(e) => update('theme', e.target.value as Branding['theme'])}
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="w-full rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 font-medium transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold mb-4">Preview</h2>

            <div
              className="rounded-2xl border border-white/10 p-6"
              style={{
                background: preview.theme === 'dark' ? '#0A0A0F' : '#FFFFFF',
                color: preview.theme === 'dark' ? '#FAFAFA' : '#0A0A0F',
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  style={{
                    // isolate preview colors without mutating the global provider vars
                    background: preview.primaryColor,
                    width: 8,
                    height: 28,
                    borderRadius: 999,
                  }}
                />
                <Logo size="md" />
              </div>
              <p className="text-sm" style={{ color: preview.theme === 'dark' ? '#A1A1AA' : '#52525B' }}>
                {preview.tagline}
              </p>

              <div className="mt-6 flex gap-3 flex-wrap">
                <button
                  className="rounded-xl px-4 py-2 font-medium"
                  style={{ background: preview.primaryColor, color: '#FFFFFF' }}
                  type="button"
                >
                  Primary
                </button>
                <button
                  className="rounded-xl px-4 py-2 font-medium"
                  style={{ background: preview.accentColor, color: '#0A0A0F' }}
                  type="button"
                >
                  Accent
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
