import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

import BrandProvider from '@/components/BrandProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import SafeApp from '@/components/SafeApp'
import { getDefaultBranding, normalizeBranding } from '@/lib/branding'
import { getTenant } from '@/lib/tenant'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant()
  const branding = tenant ? normalizeBranding(tenant.branding) : getDefaultBranding()

  return {
    title: branding.brandName,
    description: branding.tagline || undefined,
    icons: {
      icon: branding.faviconUrl ?? '/favicon.ico',
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let branding
  try {
    const tenant = await getTenant()
    branding = tenant ? normalizeBranding(tenant.branding) : getDefaultBranding()
  } catch (error) {
    console.error('Failed to load tenant branding:', error)
    branding = getDefaultBranding()
  }

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <BrandProvider branding={branding}>
          <ErrorBoundary>
            <SafeApp>
              {children}
            </SafeApp>
          </ErrorBoundary>
        </BrandProvider>
      </body>
    </html>
  )
}
