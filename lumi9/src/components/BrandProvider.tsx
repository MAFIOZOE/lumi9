'use client'

import React, { createContext, useContext, useMemo } from 'react'
import type { Branding } from '@/lib/branding'
import { brandingToCSSVars, normalizeBranding } from '@/lib/branding'

const BrandingContext = createContext<Branding | null>(null)

export function useBranding(): Branding {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding must be used within <BrandProvider />')
  return ctx
}

function varsToCssText(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ')
}

export default function BrandProvider({
  branding,
  children,
}: {
  branding: Branding
  children: React.ReactNode
}) {
  const normalized = useMemo(() => normalizeBranding(branding), [branding])
  const cssVars = useMemo(() => brandingToCSSVars(normalized), [normalized])

  return (
    <BrandingContext.Provider value={normalized}>
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `:root { ${varsToCssText(cssVars)} }`,
        }}
      />
      {children}
    </BrandingContext.Provider>
  )
}
