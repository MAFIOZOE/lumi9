// Cloudflare Pages Function for /api/dashboard
export async function onRequestGet(context: any) {
  try {
    // Mock dashboard data while testing
    return new Response(JSON.stringify({
      plan: { name: 'Pro', credits: 1000 },
      usage: { messages: 42, agents: 3 },
      stats: { conversationsCount: 8, agentsCount: 3 },
      timestamp: new Date().toISOString(),
      message: 'Dashboard function working!'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Dashboard error: ' + error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function onRequestOptions(context: any) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}