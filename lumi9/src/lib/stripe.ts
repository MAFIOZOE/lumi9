import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set - Stripe features disabled')
}

export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  : null

// Price IDs for plans (set in .env or Stripe Dashboard)
export const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  distributor: process.env.STRIPE_PRICE_DISTRIBUTOR || '',
} as const

// Credit pack prices
export const CREDIT_PACKS = [
  { id: 'credits_500', credits: 500, priceCents: 999, name: '500 Credits' },
  { id: 'credits_2000', credits: 2000, priceCents: 2999, name: '2,000 Credits' },
  { id: 'credits_5000', credits: 5000, priceCents: 5999, name: '5,000 Credits' },
] as const

export function isStripeEnabled(): boolean {
  return stripe !== null
}
