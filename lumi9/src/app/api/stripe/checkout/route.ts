import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, isStripeEnabled, PRICE_IDS, CREDIT_PACKS } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  if (!isStripeEnabled() || !stripe) {
    return NextResponse.json(
      { error: 'Payments not configured' },
      { status: 503 }
    )
  }

  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await admin
      .from('users')
      .select('id, tenant_id, email')
      .eq('auth_id', authUser.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get tenant for Stripe customer lookup
    const { data: tenant } = await admin
      .from('tenants')
      .select('id, slug, settings')
      .eq('id', user.tenant_id)
      .single()

    const body = await request.json()
    const { type, planId, creditPackId } = body

    // Get or create Stripe customer
    let customerId = tenant?.settings?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          tenant_id: user.tenant_id,
          user_id: user.id,
          tenant_slug: tenant?.slug || ''
        }
      })
      customerId = customer.id
      
      // Save customer ID to tenant
      await admin
        .from('tenants')
        .update({ 
          settings: { ...tenant?.settings, stripe_customer_id: customerId }
        })
        .eq('id', user.tenant_id)
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'

    if (type === 'subscription') {
      // Subscription checkout
      const priceId = PRICE_IDS[planId as keyof typeof PRICE_IDS]
      if (!priceId) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/dashboard?success=subscription`,
        cancel_url: `${origin}/dashboard?canceled=true`,
        metadata: {
          tenant_id: user.tenant_id,
          user_id: user.id,
          plan_id: planId
        }
      })

      return NextResponse.json({ url: session.url })

    } else if (type === 'credits') {
      // One-time credit purchase
      const pack = CREDIT_PACKS.find(p => p.id === creditPackId)
      if (!pack) {
        return NextResponse.json({ error: 'Invalid credit pack' }, { status: 400 })
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: pack.priceCents,
            product_data: {
              name: pack.name,
              description: `${pack.credits} AI chat credits`
            }
          },
          quantity: 1
        }],
        success_url: `${origin}/dashboard?success=credits`,
        cancel_url: `${origin}/dashboard?canceled=true`,
        metadata: {
          tenant_id: user.tenant_id,
          user_id: user.id,
          credit_pack_id: creditPackId,
          credits: pack.credits.toString()
        }
      })

      return NextResponse.json({ url: session.url })

    } else {
      return NextResponse.json({ error: 'Invalid checkout type' }, { status: 400 })
    }

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
