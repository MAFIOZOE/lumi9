import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

import BrandProvider from '@/components/BrandProvider'
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
  const tenant = await getTenant()
  const branding = tenant ? normalizeBranding(tenant.branding) : getDefaultBranding()

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <BrandProvider branding={branding}>{children}</BrandProvider>
      </body>
    </html>
  )
}
