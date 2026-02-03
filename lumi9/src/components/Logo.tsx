'use client'

import { useBranding } from '@/components/BrandProvider'

type LogoSize = 'sm' | 'md' | 'lg'

const sizeMap: Record<LogoSize, { img: number; text: string }> = {
  sm: { img: 20, text: 'text-lg' },
  md: { img: 28, text: 'text-2xl' },
  lg: { img: 40, text: 'text-4xl' },
}

export default function Logo({ size = 'md' }: { size?: LogoSize }) {
  const branding = useBranding()
  const s = sizeMap[size]

  if (branding.logoUrl) {
    // Using <img> to avoid Next/Image remote domain configuration.
    return (
      <img
        src={branding.logoUrl}
        alt={branding.brandName}
        width={s.img}
        height={s.img}
        style={{ width: s.img, height: s.img }}
      />
    )
  }

  return (
    <span className={`font-bold leading-none ${s.text}`}>
      <span>{branding.brandName}</span>
    </span>
  )
}
