// Quick smoke test for OpenClaw Gateway connectivity.
// Usage: node scripts/openclaw-smoke.js

const WebSocket = require('ws')
const crypto = require('node:crypto')

const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789'
const token = process.env.OPENCLAW_GATEWAY_TOKEN || ''

function toWsUrl(url) {
  if (url.startsWith('ws://') || url.startsWith('wss://')) return url
  if (url.startsWith('http://')) return 'ws://' + url.slice('http://'.length)
  if (url.startsWith('https://')) return 'wss://' + url.slice('https://'.length)
  return url
}

function base64UrlEncode(buf) {
  return Buffer.from(buf).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
function base64UrlDecode(s) {
  const b64 = s.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((s.length + 3) % 4)
  return new Uint8Array(Buffer.from(b64, 'base64'))
}
function sha256Hex(buf) {
  return crypto.createHash('sha256').update(Buffer.from(buf)).digest('hex')
}

function makeSigString({ deviceId, clientId, clientMode, role, scopes, signedAtMs, token, nonce }) {
  const version = nonce ? 'v2' : 'v1'
  const parts = [version, deviceId, clientId, clientMode, role, scopes.join(','), String(signedAtMs), token || '']
  if (version === 'v2') parts.push(nonce || '')
  return parts.join('|')
}

function createDeviceIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const jwk = publicKey.export({ format: 'jwk' })
  const x = String(jwk.x || '')
  const deviceId = sha256Hex(base64UrlDecode(x))
  return { deviceId, publicKey: x, privateKey }
}

function rpc(ws, method, params) {
  const id = `${Date.now()}-${Math.random()}`
  ws.send(JSON.stringify({ type: 'req', id, method, params }))
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 10000)
    const handler = (raw) => {
      let msg
      try {
        msg = JSON.parse(String(raw))
      } catch {
        return
      }
      if (msg.type !== 'res' || msg.id !== id) return
      clearTimeout(t)
      ws.off('message', handler)
      if (msg.ok) resolve(msg.payload)
      else reject(new Error(msg.error?.message || 'request failed'))
    }
    ws.on('message', handler)
  })
}

async function waitForNonce(ws, ms = 800) {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      ws.off('message', handler)
      resolve(null)
    }, ms)

    const handler = (raw) => {
      let msg
      try {
        msg = JSON.parse(String(raw))
      } catch {
        return
      }
      if (msg?.type === 'event' && msg.event === 'connect.challenge') {
        const nonce = typeof msg.payload?.nonce === 'string' ? msg.payload.nonce : null
        clearTimeout(t)
        ws.off('message', handler)
        resolve(nonce)
      }
    }

    ws.on('message', handler)
  })
}

async function main() {
  const wsUrl = toWsUrl(gatewayUrl)
  console.log('[smoke] connecting', { wsUrl })
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.once('open', resolve)
    ws.once('error', reject)
  })

  const device = createDeviceIdentity()
  const clientId = 'gateway-client'
  const clientMode = 'backend'
  const role = 'operator'
  const scopes = ['operator.admin', 'operator.pairing', 'operator.approvals']

  const nonce = await waitForNonce(ws)
  const signedAtMs = Date.now()
  const sigStr = makeSigString({ deviceId: device.deviceId, clientId, clientMode, role, scopes, signedAtMs, token, nonce })
  const signature = base64UrlEncode(crypto.sign(null, Buffer.from(sigStr, 'utf8'), device.privateKey))

  console.log('[smoke] authenticating...')
  await rpc(ws, 'connect', {
    minProtocol: 3,
    maxProtocol: 3,
    client: { id: clientId, version: 'dev', platform: 'node', mode: clientMode, instanceId: 'lumi9-smoke' },
    role,
    scopes,
    caps: [],
    auth: { token },
    device: {
      id: device.deviceId,
      publicKey: device.publicKey,
      signature,
      signedAt: signedAtMs,
      ...(nonce ? { nonce } : {}),
    },
    userAgent: 'lumi9-smoke',
    locale: 'en-US',
  })

  console.log('[smoke] connect ok, calling agent.identity.get...')
  const ident = await rpc(ws, 'agent.identity.get', {})
  console.log('[smoke] identity:', ident)

  ws.close()
}

main().catch((e) => {
  console.error('[smoke] failed:', e && e.message ? e.message : e)
  process.exit(1)
})
