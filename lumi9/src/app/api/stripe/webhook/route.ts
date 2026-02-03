import { NextRequest, NextResponse } from 'next/server'
import { stripe, isStripeEnabled } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { addCredits } from '@/lib/credits'
import { processCommissions } from '@/lib/mlm'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  if (!isStripeEnabled() || !stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      // Subscription created or updated
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const tenantId = subscription.metadata.tenant_id
        const planId = subscription.metadata.plan_id

        if (!tenantId || !planId) {
          console.error('Missing metadata in subscription:', subscription.id)
          break
        }

        // Get plan details
        const { data: plan } = await admin
          .from('plans')
          .select('credits_per_month')
          .eq('id', planId)
          .single()

        // Upsert subscription
        await admin
          .from('subscriptions')
          .upsert({
            tenant_id: tenantId,
            plan_id: planId,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            // Stripe API versions may expose period boundaries on the subscription items
            current_period_start: subscription.items?.data?.[0]?.current_period_start
              ? new Date(subscription.items.data[0].current_period_start * 1000).toISOString()
              : null,
            current_period_end: subscription.items?.data?.[0]?.current_period_end
              ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
              : null
          }, {
            onConflict: 'tenant_id'
          })

        // Add monthly credits if new or renewed
        if (event.type === 'customer.subscription.created' && plan) {
          await addCredits({
            tenant_id: tenantId,
            amount: plan.credits_per_month,
            type: 'subscription',
            description: `${planId} plan - monthly credits`
          })
        }

        console.log(`Subscription ${event.type}:`, subscription.id, 'for tenant:', tenantId)
        break
      }

      // Subscription canceled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const tenantId = subscription.metadata.tenant_id

        if (tenantId) {
          await admin
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('tenant_id', tenantId)
        }

        console.log('Subscription canceled:', subscription.id)
        break
      }

      // One-time payment completed (credit purchase)
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'payment' && session.metadata?.credits) {
          const tenantId = session.metadata.tenant_id
          const userId = session.metadata.user_id
          const credits = parseInt(session.metadata.credits, 10)

          if (tenantId && credits > 0) {
            await addCredits({
              tenant_id: tenantId,
              user_id: userId,
              amount: credits,
              type: 'purchase',
              description: `Purchased ${credits} credits`,
              metadata: { 
                stripe_session_id: session.id,
                credit_pack_id: session.metadata.credit_pack_id
              }
            })

            console.log(`Added ${credits} credits for tenant:`, tenantId)
          }
        }

        // Handle subscription checkout completion
        if (session.mode === 'subscription') {
          console.log('Subscription checkout completed:', session.id)
          // Subscription webhook events will handle the rest
        }
        break
      }

      // Invoice paid (subscription renewal)
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        
        const invoiceSubscription = invoice.parent?.subscription_details?.subscription

        if (invoiceSubscription && invoice.billing_reason === 'subscription_cycle') {
          const subscriptionId =
            typeof invoiceSubscription === 'string'
              ? invoiceSubscription
              : invoiceSubscription.id

          // Get subscription to find tenant
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const tenantId = subscription.metadata.tenant_id
          const planId = subscription.metadata.plan_id
          const userId = subscription.metadata.user_id

          if (tenantId && planId) {
            const { data: plan } = await admin
              .from('plans')
              .select('credits_per_month')
              .eq('id', planId)
              .single()

            if (plan) {
              await addCredits({
                tenant_id: tenantId,
                amount: plan.credits_per_month,
                type: 'subscription',
                description: `${planId} plan - monthly renewal`,
                metadata: { invoice_id: invoice.id }
              })

              console.log(`Renewal: Added ${plan.credits_per_month} credits for tenant:`, tenantId)
            }
          }

          // Process MLM commissions
          if (userId && invoice.amount_paid > 0) {
            const totalCommissions = await processCommissions(
              userId,
              invoice.amount_paid,
              invoice.id
            )
            if (totalCommissions > 0) {
              console.log(`MLM: Processed $${(totalCommissions / 100).toFixed(2)} in commissions for invoice:`, invoice.id)
            }
          }
        }
        break
      }

      default:
        console.log('Unhandled webhook event:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
