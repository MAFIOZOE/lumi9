import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllMemory, setMemory, MemoryType } from '@/lib/memory'

// GET /api/memory - Get all user memory
export async function GET() {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const memories = await getAllMemory(user.id)
    
    return NextResponse.json({ memories })
  } catch (error) {
    console.error('Memory GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/memory - Update user memory
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await admin
      .from('users')
      .select('id, tenant_id')
      .eq('auth_id', authUser.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { type, content } = await request.json()
    
    if (!type || !['profile', 'preferences', 'facts', 'long_term'].includes(type)) {
      return NextResponse.json({ error: 'Invalid memory type' }, { status: 400 })
    }

    const success = await setMemory(user.tenant_id, user.id, type as MemoryType, content || {})
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Memory POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/memory - Clear specific memory type
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: user } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', authUser.id)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const type = request.nextUrl.searchParams.get('type')
    
    if (type) {
      // Delete specific type
      await admin
        .from('user_memory')
        .delete()
        .eq('user_id', user.id)
        .eq('memory_type', type)
    } else {
      // Delete all memory for user
      await admin
        .from('user_memory')
        .delete()
        .eq('user_id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Memory DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
