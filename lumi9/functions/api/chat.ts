// Cloudflare Pages Function for /api/chat
export async function onRequestPost(context: any) {
  try {
    // Import the original route handler logic
    // For now, return a simplified response to test the function setup
    const body = await context.request.json()
    
    // Basic validation
    if (!body.message) {
      return new Response(JSON.stringify({
        error: 'Message is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Mock response while we set up full integration
    return new Response(JSON.stringify({
      message: 'Chat function working! (Mock response)',
      timestamp: new Date().toISOString(),
      received: body.message.substring(0, 100)
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Chat function error: ' + error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

export async function onRequestOptions(context: any) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}