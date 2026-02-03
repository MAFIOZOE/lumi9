import { createAdminClient } from '@/lib/supabase/admin'

export type BrandingTheme = 'dark' | 'light'

export interface Branding {
  brandName: string
  tagline: string
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  accentColor: string
  theme: BrandingTheme
}

export function getDefaultBranding(): Branding {
  return {
    brandName: 'Lumi9',
    tagline: 'Your AI Workforce',
    logoUrl: null,
    faviconUrl: null,
    primaryColor: '#6366F1',
    accentColor: '#22D3EE',
    theme: 'dark',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isHexColor(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return /^#[0-9a-fA-F]{6}$/.test(value.trim())
}

function asTheme(value: unknown): BrandingTheme | null {
  return value === 'dark' || value === 'light' ? value : null
}

/**
 * Normalizes an unknown branding payload into a fully-populated Branding object.
 * Safe to use on database values and request bodies.
 */
export function normalizeBranding(raw: unknown): Branding {
  const defaults = getDefaultBranding()
  const obj = isRecord(raw) ? raw : {}

  const brandName = typeof obj.brandName === 'string' && obj.brandName.trim()
    ? obj.brandName.trim()
    : defaults.brandName

  const tagline = typeof obj.tagline === 'string' && obj.tagline.trim()
    ? obj.tagline.trim()
    : defaults.tagline

  const logoUrl = typeof obj.logoUrl === 'string' && obj.logoUrl.trim() ? obj.logoUrl.trim() : null
  const faviconUrl = typeof obj.faviconUrl === 'string' && obj.faviconUrl.trim() ? obj.faviconUrl.trim() : null

  const primaryColor = isHexColor(obj.primaryColor) ? obj.primaryColor.trim() : defaults.primaryColor
  const accentColor = isHexColor(obj.accentColor) ? obj.accentColor.trim() : defaults.accentColor

  const theme = asTheme(obj.theme) ?? defaults.theme

  return {
    brandName,
    tagline,
    logoUrl,
    faviconUrl,
    primaryColor,
    accentColor,
    theme,
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return { r, g, b }
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const to = (v: number) => v.toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

/**
 * Mixes two colors by t (0..1). t=0 => a, t=1 => b.
 */
function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  const r = clamp(Math.round(A.r + (B.r - A.r) * t), 0, 255)
  const g = clamp(Math.round(A.g + (B.g - A.g) * t), 0, 255)
  const b2 = clamp(Math.round(A.b + (B.b - A.b) * t), 0, 255)
  return rgbToHex({ r, g, b: b2 })
}

export function brandingToCSSVars(branding: Branding): Record<string, string> {
  const b = normalizeBranding(branding)

  const isDark = b.theme === 'dark'
  const background = isDark ? '#0A0A0F' : '#FFFFFF'
  const surface = isDark ? '#18181B' : '#F4F4F5'
  const text = isDark ? '#FAFAFA' : '#0A0A0F'
  const textMuted = isDark ? '#A1A1AA' : '#52525B'

  // Hover: in dark themes, mix toward white slightly. In light themes, mix toward black.
  const hoverMixTo = isDark ? '#FFFFFF' : '#000000'

  return {
    '--primary': b.primaryColor,
    '--primary-hover': mixHex(b.primaryColor, hoverMixTo, 0.14),
    '--accent': b.accentColor,
    '--accent-hover': mixHex(b.accentColor, hoverMixTo, 0.14),
    '--background': background,
    '--surface': surface,
    '--text': text,
    '--text-muted': textMuted,
  }
}

export async function getBranding(tenantId: string): Promise<Branding> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .select('branding')
    .eq('id', tenantId)
    .single()

  if (error || !data) return getDefaultBranding()
  return normalizeBranding((data as { branding?: unknown }).branding)
}
