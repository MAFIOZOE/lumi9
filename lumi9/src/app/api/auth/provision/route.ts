import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addCredits } from '@/lib/credits'
import { getUserByReferralCode, recordReferral } from '@/lib/mlm'

const INITIAL_CREDITS = 50 // Free credits for new tenants

// POST /api/auth/provision
// Called after signup to create tenant + user records
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    
    // Get authenticated user
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already provisioned
    const { data: existingUser } = await admin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_id', authUser.id)
      .single()

    // Get tenant slug and referral code from header/body
    const body = await request.json().catch(() => ({}))
    const tenantSlug = request.headers.get('x-tenant-slug') || body.tenantSlug
    const referralCode = body.referralCode

    if (existingUser) {
      // If user exists but was auto-assigned to wrong tenant (e.g., by DB trigger),
      // and they're signing up on main domain (no slug), give them their own tenant
      if (!tenantSlug && existingUser.role === 'member') {
        // This user might have been auto-assigned - create their own tenant
        const slug = generateSlug(authUser.email || authUser.id)
        const name = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'My Company'

        const { data: newTenant } = await admin
          .from('tenants')
          .insert({
            slug: `${slug}-${randomSuffix()}`,
            name: `${name}'s Workspace`
          })
          .select('id')
          .single()

        if (newTenant) {
          // Move user to their own tenant
          await admin
            .from('users')
            .update({ tenant_id: newTenant.id, role: 'owner' })
            .eq('id', existingUser.id)

          // Add welcome credits
          await addCredits({
            tenant_id: newTenant.id,
            amount: INITIAL_CREDITS,
            type: 'bonus',
            description: 'Welcome bonus credits'
          })

          return NextResponse.json({
            message: 'Migrated to own workspace',
            userId: existingUser.id,
            tenantId: newTenant.id,
            isNewTenant: true
          })
        }
      }

      return NextResponse.json({ 
        message: 'Already provisioned',
        userId: existingUser.id 
      })
    }

    let tenantId: string

    if (tenantSlug) {
      // Signing up on a tenant subdomain - join existing tenant
      const { data: tenant } = await admin
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single()

      if (!tenant) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      }
      tenantId = tenant.id
    } else {
      // Signing up on main domain - create new tenant
      const slug = generateSlug(authUser.email || authUser.id)
      const name = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'My Company'

      const { data: newTenant, error: tenantError } = await admin
        .from('tenants')
        .insert({
          slug,
          name: `${name}'s Workspace`
        })
        .select('id')
        .single()

      if (tenantError) {
        console.error('Failed to create tenant:', tenantError)
        // Try with a random suffix if slug conflict
        const { data: retryTenant } = await admin
          .from('tenants')
          .insert({
            slug: `${slug}-${randomSuffix()}`,
            name: `${name}'s Workspace`
          })
          .select('id')
          .single()
        
        if (!retryTenant) {
          return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
        }
        tenantId = retryTenant.id
      } else {
        tenantId = newTenant.id
      }

      // Add initial free credits for new tenants
      await addCredits({
        tenant_id: tenantId,
        amount: INITIAL_CREDITS,
        type: 'bonus',
        description: 'Welcome bonus credits'
      })
    }

    // Create user record
    const { data: newUser, error: userError } = await admin
      .from('users')
      .insert({
        tenant_id: tenantId,
        auth_id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || null,
        role: tenantSlug ? 'member' : 'owner' // Owner if created tenant, member if joined
      })
      .select('id')
      .single()

    if (userError) {
      console.error('Failed to create user:', userError)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Record referral if code provided
    let referredBy: string | null = null
    if (referralCode) {
      const referrerId = await getUserByReferralCode(referralCode)
      if (referrerId) {
        await recordReferral(newUser.id, referrerId)
        referredBy = referrerId
      }
    }

    return NextResponse.json({
      message: 'Provisioned successfully',
      userId: newUser.id,
      tenantId,
      isNewTenant: !tenantSlug,
      referredBy
    })

  } catch (error) {
    console.error('Provision error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Generate a URL-safe slug from email
function generateSlug(email: string): string {
  const base = email.split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
  
  return base || 'workspace'
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}
