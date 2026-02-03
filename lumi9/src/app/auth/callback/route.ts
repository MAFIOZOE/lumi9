import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addCredits } from '@/lib/credits'
import { NextResponse } from 'next/server'

const INITIAL_CREDITS = 50

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/chat'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Provision user if not already done
      await provisionUser(data.user.id, data.user.email, data.user.user_metadata?.name)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}

async function provisionUser(authId: string, email?: string, name?: string) {
  const admin = createAdminClient()
  
  // Check if user exists
  const { data: existingUser } = await admin
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_id', authId)
    .single()

  if (existingUser) {
    // User exists - check if they need migration from auto-assigned tenant
    // If they're a "member" role, they were likely auto-assigned by a DB trigger
    // and need their own workspace for main domain signups
    if (existingUser.role === 'member') {
      const slug = generateSlug(email || authId)
      const workspaceName = `${name || email?.split('@')[0] || 'User'}'s Workspace`
      
      // Create their own tenant
      const { data: newTenant } = await admin
        .from('tenants')
        .insert({
          slug: `${slug}-${randomSuffix()}`,
          name: workspaceName
        })
        .select('id')
        .single()

      if (newTenant) {
        // Migrate user to their own tenant
        await admin
          .from('users')
          .update({ tenant_id: newTenant.id, role: 'owner' })
          .eq('id', existingUser.id)

        // Add welcome credits to new tenant
        await addCredits({
          tenant_id: newTenant.id,
          amount: INITIAL_CREDITS,
          type: 'bonus',
          description: 'Welcome bonus credits'
        })
      }
    }
    return // Done (either already correct or migrated)
  }

  // No existing user - create tenant and user
  const slug = generateSlug(email || authId)
  const workspaceName = `${name || email?.split('@')[0] || 'User'}'s Workspace`
  
  const { data: tenant } = await admin
    .from('tenants')
    .insert({ slug, name: workspaceName })
    .select('id')
    .single()

  if (!tenant) {
    // Retry with random suffix if slug conflict
    const { data: retryTenant } = await admin
      .from('tenants')
      .insert({
        slug: `${slug}-${randomSuffix()}`,
        name: workspaceName
      })
      .select('id')
      .single()
    
    if (!retryTenant) {
      console.error('Failed to create tenant for:', authId)
      return
    }
    
    await createUserRecord(admin, retryTenant.id, authId, email, name)
    return
  }

  await createUserRecord(admin, tenant.id, authId, email, name)
}

async function createUserRecord(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  authId: string,
  email?: string,
  name?: string
) {
  // Create user
  await admin
    .from('users')
    .insert({
      tenant_id: tenantId,
      auth_id: authId,
      email: email || '',
      name: name || null,
      role: 'owner'
    })

  // Add welcome credits
  await addCredits({
    tenant_id: tenantId,
    amount: INITIAL_CREDITS,
    type: 'bonus',
    description: 'Welcome bonus credits'
  })
}

function generateSlug(input: string): string {
  return input.split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30) || 'workspace'
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}
